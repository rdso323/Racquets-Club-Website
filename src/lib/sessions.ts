import {
    DEFAULT_OPEN_PLAY_CAPACITY,
    DEFAULT_WAITLIST_PER_COURT,
    SLOTS_PER_COURT,
    getSlotsPerCourtForSport,
    type AdminRecurringSchedule,
    type DayName,
    type OpenPlayDayConfig,
    type Sport,
    SPORTS,
    WEEKDAY_OFFSETS,
} from './sports';
import { isSessionArchivable, isSessionPast } from './archive';
import { getMergedScheduleForSport, getRecurringTemplateKey } from './recurringSchedules';

const WEEKDAY_ID_PATTERN =
    'monday|tuesday|wednesday|thursday|friday|saturday|sunday';

export const BOOKING_HORIZON_DAYS = 14;
export const NEXT_WEEK_BOOKING_LOCK_MESSAGE = 'Opens Sunday 5pm Eastern';

export type SessionStatus = 'active' | 'hidden' | 'cancelled';
export type SessionType = 'coaching' | 'court';

export interface Session {
    id: string;
    title: string;
    type: SessionType;
    date: string;
    time: string;
    startTime?: string;
    endTime?: string;
    maxAttendees: number;
    attendees: string[];
    /** FIFO session-level waitlist (common across all courts in a session) */
    waitlist?: string[];
    /** Max waitlist size; 0 disables waitlist */
    maxWaitlistSize?: number;
    coach?: string | null;
    coachId?: string | null;
    sport?: string;
    weekStartDate?: string;
    courts?: string[];
    slotsPerCourt?: number;
    /** True for admin-created weekly recurring court bookings */
    recurring?: boolean;
}

export interface ParsedAttendee {
    uid: string;
    name: string;
    email: string;
    court: string;
    /** Zero-based position on the court diagram, if stored */
    slotIndex?: number;
    raw: string;
}

export interface ParsedWaitlistEntry {
    uid: string;
    name: string;
    email: string;
    joinedAtMs: number;
    raw: string;
}

const DAY_NAMES = [
    'Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays',
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export const parseAttendee = (attendeeStr: string): ParsedAttendee => {
    const parts = attendeeStr.split('|');
    const slotPart = parts[4];
    const slotIndex =
        slotPart !== undefined && /^\d+$/.test(slotPart) ? Number(slotPart) : undefined;
    return {
        uid: parts[0] || '',
        name: parts[1] || 'Unknown Player',
        email: parts[2] || 'No Email',
        court: parts[3] || '',
        slotIndex,
        raw: attendeeStr,
    };
};

export const isAttendeeOnCourt = (entry: string, courtName: string): boolean =>
    parseAttendee(entry).court === courtName;

export const filterAttendeesByCourt = (attendees: string[], courtName: string): string[] =>
    attendees.filter((a) => isAttendeeOnCourt(a, courtName));

export const parseWaitlistEntry = (entryStr: string): ParsedWaitlistEntry => {
    const parts = entryStr.split('|');
    return {
        uid: parts[0] || '',
        name: parts[1] || 'Unknown Player',
        email: parts[2] || 'No Email',
        joinedAtMs: Number(parts[3]) || 0,
        raw: entryStr,
    };
};

export const formatAttendee = (
    uid: string,
    name: string,
    email: string,
    court?: string,
    slotIndex?: number,
): string => {
    const base = court ? `${uid}|${name}|${email}|${court}` : `${uid}|${name}|${email}`;
    if (court && slotIndex != null && slotIndex >= 0) {
        return `${base}|${slotIndex}`;
    }
    return base;
};

export const mapAttendeesToCourtSlots = (
    courtAttendees: string[],
    maxPerCourt: number,
): (string | null)[] => {
    const slots: (string | null)[] = Array(maxPerCourt).fill(null);
    const unassigned: string[] = [];

    for (const entry of courtAttendees) {
        const { slotIndex } = parseAttendee(entry);
        if (
            slotIndex != null &&
            slotIndex >= 0 &&
            slotIndex < maxPerCourt &&
            slots[slotIndex] === null
        ) {
            slots[slotIndex] = entry;
        } else {
            unassigned.push(entry);
        }
    }

    for (const entry of unassigned) {
        const firstEmpty = slots.findIndex((s) => s === null);
        if (firstEmpty >= 0) slots[firstEmpty] = entry;
    }

    return slots;
};

export const firstOpenCourtSlot = (
    courtAttendees: string[],
    maxPerCourt: number,
): number | null => {
    const slots = mapAttendeesToCourtSlots(courtAttendees, maxPerCourt);
    const idx = slots.findIndex((s) => s === null);
    return idx >= 0 ? idx : null;
};

export const isCourtSlotTaken = (
    courtAttendees: string[],
    maxPerCourt: number,
    slotIndex: number,
): boolean => {
    const slots = mapAttendeesToCourtSlots(courtAttendees, maxPerCourt);
    return slotIndex < 0 || slotIndex >= maxPerCourt || slots[slotIndex] !== null;
};

export const formatWaitlistEntry = (uid: string, name: string, email: string, joinedAtMs = Date.now()): string =>
    `${uid}|${name}|${email}|${joinedAtMs}`;

export const findUserAttendeeEntry = (attendees: string[], uid: string): string | undefined =>
    attendees.find((a) => a.startsWith(`${uid}|`) || a === uid);

export const findUserWaitlistEntry = (waitlist: string[] | undefined, uid: string): string | undefined =>
    (waitlist || []).find((a) => a.startsWith(`${uid}|`) || a === uid);

export const getWaitlistPosition = (waitlist: string[] | undefined, uid: string): number => {
    const list = waitlist || [];
    const idx = list.findIndex((a) => a.startsWith(`${uid}|`) || a === uid);
    return idx >= 0 ? idx + 1 : 0;
};

export const promoteFromWaitlist = (
    attendees: string[],
    waitlist: string[],
    courtName?: string,
    maxPerCourt = 4,
): { attendees: string[]; waitlist: string[]; promotedEntry: ParsedWaitlistEntry | null } => {
    if (waitlist.length === 0) {
        return { attendees, waitlist, promotedEntry: null };
    }

    const head = waitlist[0];
    const parsed = parseWaitlistEntry(head);
    let promotedSlot: number | undefined;
    if (courtName) {
        const courtAttendees = filterAttendeesByCourt(attendees, courtName);
        promotedSlot = firstOpenCourtSlot(courtAttendees, maxPerCourt) ?? undefined;
    }
    const promotedAttendee = formatAttendee(
        parsed.uid,
        parsed.name,
        parsed.email,
        courtName || undefined,
        promotedSlot,
    );

    return {
        attendees: [...attendees, promotedAttendee],
        waitlist: waitlist.slice(1),
        promotedEntry: parsed,
    };
};

export const getBaseWeekStart = (sport: string): Date => {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    let weekRolloverTime = new Date(startOfWeek);
    if (sport === 'Tennis') {
        weekRolloverTime.setDate(startOfWeek.getDate() + 3);
        weekRolloverTime.setHours(23, 0, 0, 0);
    } else if (sport === 'Badminton') {
        weekRolloverTime.setDate(startOfWeek.getDate() + 2);
        weekRolloverTime.setHours(16, 0, 0, 0);
    } else {
        weekRolloverTime.setDate(startOfWeek.getDate() + 6);
        weekRolloverTime.setHours(23, 59, 59, 999);
    }

    if (now.getTime() > weekRolloverTime.getTime()) {
        startOfWeek.setDate(startOfWeek.getDate() + 7);
    }

    return startOfWeek;
};

export const getPlayDate = (startOfWeek: Date, isNextWeek: boolean, dayName: DayName): Date => {
    const offset = isNextWeek ? 7 : 0;
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + WEEKDAY_OFFSETS[dayName] + offset);
    return date;
};

export const parseSessionEndDateTime = (playDate: Date, timeStr: string): Date | null => {
    const end = new Date(playDate);
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const matches = [...timeStr.matchAll(timeRegex)];
    if (matches.length === 0) return null;

    const endMatch = matches[matches.length - 1];
    let hours = parseInt(endMatch[1], 10);
    const mins = parseInt(endMatch[2], 10);
    const ampm = endMatch[3].toUpperCase();
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    end.setHours(hours, mins, 0, 0);
    return end;
};

export const isOpenPlaySessionEnded = (playDate: Date, timeStr: string): boolean => {
    const end = parseSessionEndDateTime(playDate, timeStr);
    return end ? Date.now() > end.getTime() : false;
};

export const isWeekLocked = (startOfWeek: Date, isNextWeek: boolean): boolean => {
    const targetMonday = new Date(startOfWeek);
    if (isNextWeek) {
        targetMonday.setDate(startOfWeek.getDate() + 7);
    }

    const unlockTime = new Date(targetMonday);
    unlockTime.setDate(targetMonday.getDate() - 1);
    unlockTime.setHours(17, 0, 0, 0);

    return new Date().getTime() < unlockTime.getTime();
};

export const getWeekDateRangeDisplay = (startOfWeek: Date, isNextWeek: boolean): string => {
    const targetMonday = new Date(startOfWeek);
    if (isNextWeek) {
        targetMonday.setDate(startOfWeek.getDate() + 7);
    }
    const formatDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Week of ${formatDay(targetMonday)}`;
};

export const getOpenPlaySessionId = (
    sport: string,
    day: DayName,
    playDate: Date,
    scheduleId?: string,
): string => {
    const dateStr = playDate.toISOString().split('T')[0];
    if (scheduleId) {
        return `open_play_custom_${scheduleId}_${day}_${dateStr}`;
    }
    const sportSlug = sport.toLowerCase().replace(/ /g, '_');
    return `open_play_${sportSlug}_${day}_${dateStr}`;
};

export const isLegacyBundledOpenPlay = (session: Session): boolean => {
    const title = session.title.toLowerCase();
    return (
        session.type === 'court' &&
        title.includes('open play') &&
        (title.includes('tue/thu') ||
            title.includes('tue') && title.includes('thu') ||
            title === 'open play' ||
            !session.id.startsWith('open_play_'))
    );
};

export const inferSport = (session: Session): Sport => {
    if (session.sport && SPORTS.includes(session.sport as Sport)) {
        return session.sport as Sport;
    }
    const idLower = session.id.toLowerCase();
    const titleLower = session.title.toLowerCase();
    if (idLower.includes('badminton') || titleLower.includes('badminton')) return 'Badminton';
    if (idLower.includes('squash') || titleLower.includes('squash')) return 'Squash';
    if (idLower.includes('pickleball') || titleLower.includes('pickleball')) return 'Pickleball';
    if (idLower.includes('table_tennis') || titleLower.includes('table tennis')) return 'Table Tennis';
    return 'Tennis';
};

export const parseSessionDateString = (dateStr: string): Date | null => {
    if (!dateStr) return null;

    for (let i = 0; i < DAY_NAMES.length; i++) {
        if (dateStr.includes(DAY_NAMES[i])) {
            const targetDay = i % 7;
            const targetDate = new Date();
            targetDate.setHours(0, 0, 0, 0);
            const currentDay = targetDate.getDay();
            let distance = targetDay - currentDay;
            if (distance < 0) distance += 7;
            targetDate.setDate(targetDate.getDate() + distance);

            const monthDayMatch = dateStr.match(/([A-Za-z]{3,9})\s+(\d{1,2})/);
            if (monthDayMatch) {
                const parsed = new Date(`${monthDayMatch[1]} ${monthDayMatch[2]}, ${targetDate.getFullYear()}`);
                if (!isNaN(parsed.getTime())) {
                    parsed.setHours(0, 0, 0, 0);
                    return parsed;
                }
            }
            return targetDate;
        }
    }

    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
    }
    return null;
};

export const getBookingHorizonEnd = (): Date => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() + BOOKING_HORIZON_DAYS);
    return end;
};

export const isWithinBookingHorizon = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizonEnd = getBookingHorizonEnd();
    return date.getTime() >= today.getTime() && date.getTime() <= horizonEnd.getTime();
};

export const resolveOpenPlaySession = (
    sessions: Session[],
    sport: Sport,
    config: OpenPlayDayConfig,
    weekOffset: 0 | 7,
): Session => {
    const baseStartOfWeek = getBaseWeekStart(sport);
    const playDate = getPlayDate(baseStartOfWeek, weekOffset === 7, config.day);
    const sessionId = getOpenPlaySessionId(sport, config.day, playDate, config.scheduleId);
    const dbSession = sessions.find((s) => s.id === sessionId);
    const totalMax = config.courts.length * config.maxPerCourt;

        if (dbSession) {
        return {
            ...dbSession,
            title: config.title,
            maxAttendees: totalMax,
            sport,
            maxWaitlistSize: dbSession.maxWaitlistSize ?? config.maxWaitlistSize ?? config.courts.length * DEFAULT_WAITLIST_PER_COURT,
        };
    }

    return {
        id: sessionId,
        title: config.title,
        type: 'court',
        date: playDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        time: config.time,
        maxAttendees: totalMax,
        attendees: [],
        waitlist: [],
        maxWaitlistSize: config.maxWaitlistSize ?? config.courts.length * DEFAULT_WAITLIST_PER_COURT,
        sport,
        courts: config.isCustom ? config.courts : undefined,
        slotsPerCourt: config.isCustom ? config.maxPerCourt : undefined,
    };
};

export const bucketAttendeesByCourt = (
    attendees: string[],
    courts: string[],
    maxPerCourt: number,
): string[] => {
    const courtAttendeeBuckets = courts.map((c) => filterAttendeesByCourt(attendees, c));
    const assignedAttendees = courtAttendeeBuckets.flat();
    const unassignedAttendees = attendees.filter((a) => !assignedAttendees.includes(a));

    for (const attendee of unassignedAttendees) {
        for (let i = 0; i < courts.length; i++) {
            if (courtAttendeeBuckets[i].length < maxPerCourt) {
                courtAttendeeBuckets[i].push(attendee);
                break;
            }
        }
    }

    const orderedAttendees: string[] = [];
    for (const bucket of courtAttendeeBuckets) {
        orderedAttendees.push(...bucket);
        let padCount = maxPerCourt - bucket.length;
        while (padCount > 0) {
            orderedAttendees.push('');
            padCount--;
        }
    }

    return orderedAttendees;
};

/** Attendees with a court assignment, matching front-end enrollment logic */
export const getActiveCourtAttendees = (
    attendees: string[],
    courts: string[],
): string[] => {
    if (courts.length === 0) return attendees;
    return attendees.filter((a) => courts.some((court) => isAttendeeOnCourt(a, court)));
};

export const getOpenPlayInstancesWithinHorizon = (
    sessions: Session[],
    sport: Sport,
    customSchedules: AdminRecurringSchedule[] = [],
    disabledBuiltin: string[] = [],
): Array<{ session: Session; config: OpenPlayDayConfig; playDate: Date; isNextWeek: boolean }> => {
    const configs = getMergedScheduleForSport(sport, customSchedules, disabledBuiltin);
    const baseStartOfWeek = getBaseWeekStart(sport);
    const instances: Array<{ session: Session; config: OpenPlayDayConfig; playDate: Date; isNextWeek: boolean }> = [];

    for (const weekOffset of [0, 7] as const) {
        const isNextWeek = weekOffset === 7;

        for (const config of configs) {
            const playDate = getPlayDate(baseStartOfWeek, isNextWeek, config.day);
            if (!isWithinBookingHorizon(playDate)) continue;

            const session = resolveOpenPlaySession(sessions, sport, config, weekOffset);
            instances.push({ session, config, playDate, isNextWeek });
        }
    }

    return instances;
};

/** One upcoming instance per weekly template — avoids duplicate admin cards per week. */
export const pickAdminOpenPlayInstances = (
    instances: Array<{ session: Session; config: OpenPlayDayConfig; playDate: Date; isNextWeek: boolean }>,
    sport: Sport,
): Array<{ session: Session; config: OpenPlayDayConfig; playDate: Date; isNextWeek: boolean }> => {
    const grouped = new Map<
        string,
        Array<{ session: Session; config: OpenPlayDayConfig; playDate: Date; isNextWeek: boolean }>
    >();

    for (const item of instances) {
        const key = getRecurringTemplateKey(sport, item.config);
        const list = grouped.get(key) ?? [];
        list.push(item);
        grouped.set(key, list);
    }

    const picked: Array<{ session: Session; config: OpenPlayDayConfig; playDate: Date; isNextWeek: boolean }> = [];

    for (const candidates of grouped.values()) {
        const sorted = [...candidates].sort((a, b) => a.playDate.getTime() - b.playDate.getTime());
        const stillOpen = sorted.find(
            (item) => !isOpenPlaySessionEnded(item.playDate, item.session.time),
        );
        picked.push(stillOpen ?? sorted[0]);
    }

    return picked.sort((a, b) => a.playDate.getTime() - b.playDate.getTime());
};

export const filterRegularSessionsForDisplay = (
    sessions: Session[],
    activeSport: Sport,
): Session[] => {
    return sessions.filter((s) => {
        if (s.type === 'court' && s.title.toLowerCase().includes('open play')) {
            return false;
        }
        if (isLegacyBundledOpenPlay(s)) {
            return false;
        }

        const sport = inferSport(s);
        if (sport !== activeSport) return false;

        const sessionDate = parseSessionDateString(s.date);
        if (!sessionDate) return true;
        return isWithinBookingHorizon(sessionDate);
    });
};

export const getDefaultMaxAttendees = (type: SessionType): number => {
    return type === 'court' ? DEFAULT_OPEN_PLAY_CAPACITY : 4;
};

export const buildCourtLabels = (
    count: number,
    startNumber: number,
    customOverride?: string,
): string[] => {
    const trimmed = customOverride?.trim();
    if (trimmed) {
        return trimmed.split(',').map((label) => label.trim()).filter(Boolean);
    }

    const safeCount = Math.max(1, Math.min(5, count));
    const safeStart = Math.max(1, startNumber);
    return Array.from({ length: safeCount }, (_, i) => `Court ${safeStart + i}`);
};

export const getSlotsPerCourt = (session: Session): number => {
    const config = getOpenPlayConfigForSession(session);
    if (config) return config.maxPerCourt;
    if (session.slotsPerCourt != null) return session.slotsPerCourt;
    return getSlotsPerCourtForSport(inferSport(session));
};

export const suggestedCapacityForCourts = (courts: string[], slotsPerCourt = SLOTS_PER_COURT): number => {
    return courts.length * slotsPerCourt;
};

export const courtFieldsFromSession = (courts?: string[]): {
    courtCount: number;
    courtStartNumber: number;
    customCourtLabels: string;
} => {
    if (!courts?.length) {
        return { courtCount: 2, courtStartNumber: 1, customCourtLabels: '' };
    }

    for (let start = 1; start <= 10; start++) {
        const auto = buildCourtLabels(courts.length, start);
        if (courts.join('|') === auto.join('|')) {
            return { courtCount: courts.length, courtStartNumber: start, customCourtLabels: '' };
        }
    }

    return { courtCount: courts.length, courtStartNumber: 1, customCourtLabels: courts.join(', ') };
};

export const isOpenPlaySession = (session: Session): boolean => {
    const title = session.title.toLowerCase();
    return (
        session.type === 'court' &&
        (title.includes('open play') ||
            session.id.startsWith('open_play_') ||
            session.recurring === true)
    );
};

export const isRecurringCourtSession = (session: Session): boolean => isOpenPlaySession(session);

export const isEditableOneTimeSession = (session: Session): boolean =>
    !isRecurringCourtSession(session);

export const applySessionTypeChange = (
    session: Session,
    newType: SessionType,
    editCourtFields: { courtCount: number; courtStartNumber: number; customCourtLabels: string },
): {
    session: Session;
    editCourtFields: { courtCount: number; courtStartNumber: number; customCourtLabels: string };
} => {
    const sport = session.sport ?? inferSport(session);
    const slotsPerCourt = getSlotsPerCourtForSport(sport);
    const fields = session.courts?.length ? courtFieldsFromSession(session.courts) : editCourtFields;
    const courts = buildCourtLabels(fields.courtCount, fields.courtStartNumber, fields.customCourtLabels);

    if (newType === 'coaching') {
        return {
            session: {
                ...session,
                type: newType,
                coach: session.coach || '',
                coachId: null,
                maxAttendees: suggestedCapacityForCourts(courts, slotsPerCourt),
                maxWaitlistSize: courts.length * DEFAULT_WAITLIST_PER_COURT,
            },
            editCourtFields: fields,
        };
    }

    return {
        session: {
            ...session,
            type: newType,
            coach: null,
            coachId: null,
            maxAttendees: suggestedCapacityForCourts(courts, slotsPerCourt),
            maxWaitlistSize: courts.length * DEFAULT_WAITLIST_PER_COURT,
        },
        editCourtFields: fields,
    };
};

export const getOpenPlayConfigForSession = (
    session: Session,
    customSchedules: AdminRecurringSchedule[] = [],
    disabledBuiltin: string[] = [],
): OpenPlayDayConfig | null => {
    if (!isOpenPlaySession(session)) return null;

    const sport = inferSport(session);
    const configs = getMergedScheduleForSport(sport, customSchedules, disabledBuiltin);

    const byTitle = configs.find((c) => c.title === session.title);
    if (byTitle) return byTitle;

    const customMatch = session.id.match(
        new RegExp(`^open_play_custom_([^_]+)_(${WEEKDAY_ID_PATTERN})_`),
    );
    if (customMatch) {
        const scheduleId = customMatch[1];
        return configs.find((c) => c.scheduleId === scheduleId) || null;
    }

    const idMatch = session.id.match(
        new RegExp(`open_play_[a-z_]+_(${WEEKDAY_ID_PATTERN})_`),
    );
    if (idMatch) {
        const day = idMatch[1] as DayName;
        return configs.find((c) => c.day === day && !c.scheduleId) || null;
    }

    const titleLower = session.title.toLowerCase();
    return configs.find((c) => titleLower.includes(c.day)) || null;
};

export const getCourtsForSession = (
    session: Session,
    customSchedules: AdminRecurringSchedule[] = [],
    disabledBuiltin: string[] = [],
): string[] => {
    const config = getOpenPlayConfigForSession(session, customSchedules, disabledBuiltin);
    if (config) return config.courts;

    if (session.courts && session.courts.length > 0) return session.courts;

    return [];
};

export const isSessionEnrollmentFull = (
    session: Session,
    courts: string[],
    maxPerCourt: number,
): boolean => {
    if (courts.length > 0) {
        return getActiveCourtAttendees(session.attendees || [], courts).length >= courts.length * maxPerCourt;
    }
    return (session.attendees || []).length >= session.maxAttendees;
};

export const getMaxWaitlistSize = (session: Session, openPlayConfig?: OpenPlayDayConfig | null): number => {
    if (session.maxWaitlistSize != null) return session.maxWaitlistSize;
    if (openPlayConfig?.maxWaitlistSize != null) return openPlayConfig.maxWaitlistSize;

    const courts = getCourtsForSession(session);
    if (courts.length > 0) return courts.length * DEFAULT_WAITLIST_PER_COURT;
    return DEFAULT_WAITLIST_PER_COURT * 2;
};

export const isWaitlistEnabled = (session: Session, openPlayConfig?: OpenPlayDayConfig | null): boolean =>
    getMaxWaitlistSize(session, openPlayConfig) > 0;

export const isWaitlistFull = (session: Session, openPlayConfig?: OpenPlayDayConfig | null): boolean => {
    const max = getMaxWaitlistSize(session, openPlayConfig);
    if (max <= 0) return true;
    return (session.waitlist || []).length >= max;
};

const sortSessionsWithinSport = (a: Session, b: Session): number => {
    const aOpen = isOpenPlaySession(a);
    const bOpen = isOpenPlaySession(b);
    if (aOpen !== bOpen) return aOpen ? -1 : 1;

    const dateA = parseSessionDateString(a.date)?.getTime() ?? 0;
    const dateB = parseSessionDateString(b.date)?.getTime() ?? 0;
    if (dateA !== dateB) return dateA - dateB;

    return a.title.localeCompare(b.title);
};

export const buildAdminDisplaySessions = (
    sessionsList: Session[],
    sportFilter: string | null,
    customSchedules: AdminRecurringSchedule[] = [],
    disabledBuiltin: string[] = [],
): Session[] => {
    const sportsToShow = sportFilter ? [sportFilter as Sport] : [...SPORTS];
    const combined: Session[] = [];
    const seen = new Set<string>();

    const pushUnique = (session: Session) => {
        if (seen.has(session.id)) return;
        seen.add(session.id);
        combined.push(session);
    };

    for (const sport of sportsToShow) {
        const openPlayResolved = pickAdminOpenPlayInstances(
            getOpenPlayInstancesWithinHorizon(sessionsList, sport, customSchedules, disabledBuiltin),
            sport,
        ).map(({ session }) => session);
        openPlayResolved.sort(sortSessionsWithinSport);
        openPlayResolved.forEach(pushUnique);

        const regularSessions = filterRegularSessionsForDisplay(sessionsList, sport);
        regularSessions.sort(sortSessionsWithinSport);
        regularSessions.forEach(pushUnique);

        const regularIds = new Set(regularSessions.map((s) => s.id));
        const openPlayIds = new Set(openPlayResolved.map((s) => s.id));

        const customSessions = sessionsList.filter((s) => {
            if (isLegacyBundledOpenPlay(s)) return false;
            if (openPlayIds.has(s.id) || regularIds.has(s.id)) return false;
            if (s.type === 'court' && s.title.toLowerCase().includes('open play')) return false;

            const sessionSport = inferSport(s);
            return sessionSport === sport;
        });
        customSessions.sort(sortSessionsWithinSport);
        customSessions.forEach(pushUnique);
    }

    return combined.filter((s) => !(isSessionArchivable(s) && isSessionPast(s)));
};
