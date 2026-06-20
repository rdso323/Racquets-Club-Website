import { deleteDoc, doc } from 'firebase/firestore';
import type { ClubEvent } from './defaultEvents';
import { db } from './firebase';
import { parseSessionDateString } from './sessions';

/** Days after an event ends before its Firestore document is removed. */
export const EVENT_RETENTION_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const PURGE_COOLDOWN_MS = 60_000;
let lastPurgeAt = 0;
let purgeInFlight = false;

/** True after the event date has fully ended (same end-of-day rule as session cards). */
export const isEventPast = (event: Pick<ClubEvent, 'date'>): boolean => {
    const eventDate = parseSessionDateString(event.date);
    if (!eventDate) return false;
    return eventDate.getTime() + MS_PER_DAY < Date.now();
};

/** True when a past event has been archived long enough to delete from Firestore. */
export const isEventReadyForDeletion = (event: Pick<ClubEvent, 'date'>): boolean => {
    const eventDate = parseSessionDateString(event.date);
    if (!eventDate) return false;
    const deleteAfter = eventDate.getTime() + MS_PER_DAY + EVENT_RETENTION_DAYS * MS_PER_DAY;
    return deleteAfter < Date.now();
};

export const filterUpcomingEvents = <T extends Pick<ClubEvent, 'date'>>(events: T[]): T[] =>
    events.filter((event) => !isEventPast(event));

export const partitionEventsByPast = <T extends Pick<ClubEvent, 'date'>>(
    events: T[],
): { upcoming: T[]; past: T[] } => ({
    upcoming: events.filter((event) => !isEventPast(event)),
    past: events.filter((event) => isEventPast(event)),
});

export const purgeExpiredEventsFromFirestore = async (
    events: Array<{ id: string; date: string }>,
): Promise<number> => {
    const expiredIds = events.filter((event) => isEventReadyForDeletion(event)).map((event) => event.id);
    if (expiredIds.length === 0) return 0;

    await Promise.all(expiredIds.map((id) => deleteDoc(doc(db, 'events', id))));
    return expiredIds.length;
};

/** Admin-only housekeeping: remove events past the retention window. */
export const maintainEventsCollection = async (
    events: Array<{ id: string; date: string }>,
    canMaintain: boolean,
): Promise<void> => {
    if (!canMaintain || purgeInFlight) return;
    if (Date.now() - lastPurgeAt < PURGE_COOLDOWN_MS) return;
    if (!events.some((event) => isEventReadyForDeletion(event))) return;

    purgeInFlight = true;
    try {
        await purgeExpiredEventsFromFirestore(events);
        lastPurgeAt = Date.now();
    } catch (err) {
        console.warn('Could not purge expired events:', err);
    } finally {
        purgeInFlight = false;
    }
};
