import { deleteDoc, doc } from 'firebase/firestore';
import type { ClubEvent } from './defaultEvents';
import { db } from './firebase';
import { resolveEventDateISO, resolveSessionDateISO, resolveSessionTimes } from './dates';
import {
    isLegacyBundledOpenPlay,
    isOpenPlaySession,
    isOpenPlaySessionEnded,
    parseSessionDateString,
    type Session,
} from './sessions';

/** Days after an item ends before its Firestore document is removed. */
export const ARCHIVE_RETENTION_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PURGE_COOLDOWN_MS = 60_000;
let lastEventPurgeAt = 0;
let lastSessionPurgeAt = 0;
let eventPurgeInFlight = false;
let sessionPurgeInFlight = false;

const endOfDayMs = (date: Date): number => {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
};

const resolveEventDate = (event: Pick<ClubEvent, 'dateISO' | 'date'>): Date | null => {
    const iso = resolveEventDateISO(event);
    if (iso) {
        const parts = iso.split('-').map(Number);
        if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return parseSessionDateString(event.date);
};

const resolveSessionPlayDate = (session: Pick<Session, 'weekStartDate' | 'date'>): Date | null => {
    const iso = resolveSessionDateISO(session);
    if (iso) {
        const parts = iso.split('-').map(Number);
        if (parts.length === 3) return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return parseSessionDateString(session.date);
};

/** True after the event date has fully ended. */
export const isEventPast = (event: Pick<ClubEvent, 'dateISO' | 'date'>): boolean => {
    const eventDate = resolveEventDate(event);
    if (!eventDate) return false;
    return endOfDayMs(eventDate) < Date.now();
};

/** True when a past event has been archived long enough to delete from Firestore. */
export const isEventReadyForDeletion = (event: Pick<ClubEvent, 'dateISO' | 'date'>): boolean => {
    const eventDate = resolveEventDate(event);
    if (!eventDate) return false;
    const deleteAfter = endOfDayMs(eventDate) + ARCHIVE_RETENTION_DAYS * MS_PER_DAY;
    return deleteAfter < Date.now();
};

export const filterUpcomingEvents = <T extends Pick<ClubEvent, 'dateISO' | 'date'>>(events: T[]): T[] =>
    events.filter((event) => !isEventPast(event));

export const partitionEventsByPast = <T extends Pick<ClubEvent, 'dateISO' | 'date'>>(
    events: T[],
): { upcoming: T[]; past: T[] } => ({
    upcoming: events.filter((event) => !isEventPast(event)),
    past: events.filter((event) => isEventPast(event)),
});

/** One-time / custom sessions eligible for archive — not recurring open play. */
export const isSessionArchivable = (session: Session): boolean => {
    if (isOpenPlaySession(session)) return false;
    if (isLegacyBundledOpenPlay(session)) return false;
    if (session.id.startsWith('open_play_')) return false;
    return !!(session.weekStartDate || parseSessionDateString(session.date));
};

const formatTimeForEndCheck = (time24: string): string => {
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return time24;
    const hours = Number(match[1]);
    const mins = Number(match[2]);
    const period = hours >= 12 ? 'PM' : 'AM';
    let hour12 = hours % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${String(mins).padStart(2, '0')} ${period}`;
};

export const isSessionPast = (session: Session): boolean => {
    if (!isSessionArchivable(session)) return false;
    const playDate = resolveSessionPlayDate(session);
    if (!playDate) return false;
    const times = resolveSessionTimes(session);
    const timeStr = times
        ? times.endTime
            ? `${formatTimeForEndCheck(times.startTime)} – ${formatTimeForEndCheck(times.endTime)}`
            : formatTimeForEndCheck(times.startTime)
        : session.time;
    return isOpenPlaySessionEnded(playDate, timeStr);
};

export const isSessionReadyForDeletion = (session: Session): boolean => {
    if (!isSessionArchivable(session)) return false;
    const playDate = resolveSessionPlayDate(session);
    if (!playDate) return false;
    const deleteAfter = endOfDayMs(playDate) + ARCHIVE_RETENTION_DAYS * MS_PER_DAY;
    return deleteAfter < Date.now();
};

export const partitionSessionsByPast = (sessions: Session[]): { upcoming: Session[]; past: Session[] } => ({
    upcoming: sessions.filter((s) => !isSessionArchivable(s) || !isSessionPast(s)),
    past: sessions.filter((s) => isSessionArchivable(s) && isSessionPast(s)),
});

export const purgeExpiredEventsFromFirestore = async (
    events: Array<{ id: string; dateISO?: string; date: string }>,
): Promise<number> => {
    const expiredIds = events.filter((event) => isEventReadyForDeletion(event)).map((event) => event.id);
    if (expiredIds.length === 0) return 0;
    await Promise.all(expiredIds.map((id) => deleteDoc(doc(db, 'events', id))));
    return expiredIds.length;
};

export const purgeExpiredSessionsFromFirestore = async (sessions: Session[]): Promise<number> => {
    const expiredIds = sessions.filter(isSessionReadyForDeletion).map((session) => session.id);
    if (expiredIds.length === 0) return 0;
    await Promise.all(expiredIds.map((id) => deleteDoc(doc(db, 'sessions', id))));
    return expiredIds.length;
};

export const maintainEventsCollection = async (
    events: Array<{ id: string; dateISO?: string; date: string }>,
    canMaintain: boolean,
): Promise<void> => {
    if (!canMaintain || eventPurgeInFlight) return;
    if (Date.now() - lastEventPurgeAt < PURGE_COOLDOWN_MS) return;
    if (!events.some((event) => isEventReadyForDeletion(event))) return;

    eventPurgeInFlight = true;
    try {
        await purgeExpiredEventsFromFirestore(events);
        lastEventPurgeAt = Date.now();
    } catch (err) {
        console.warn('Could not purge expired events:', err);
    } finally {
        eventPurgeInFlight = false;
    }
};

export const maintainSessionsCollection = async (
    sessions: Session[],
    canMaintain: boolean,
): Promise<void> => {
    if (!canMaintain || sessionPurgeInFlight) return;
    if (Date.now() - lastSessionPurgeAt < PURGE_COOLDOWN_MS) return;
    if (!sessions.some(isSessionReadyForDeletion)) return;

    sessionPurgeInFlight = true;
    try {
        await purgeExpiredSessionsFromFirestore(sessions);
        lastSessionPurgeAt = Date.now();
    } catch (err) {
        console.warn('Could not purge expired sessions:', err);
    } finally {
        sessionPurgeInFlight = false;
    }
};

/** Admin-only housekeeping for events and archivable sessions. */
export const maintainArchivedCollections = async (
    events: Array<{ id: string; dateISO?: string; date: string }>,
    sessions: Session[],
    canMaintain: boolean,
): Promise<void> => {
    await maintainEventsCollection(events, canMaintain);
    await maintainSessionsCollection(sessions, canMaintain);
};
