import {
    DEFAULT_OPEN_PLAY_CAPACITY,
    OPEN_PLAY_SCHEDULE,
    type DayName,
    type OpenPlayDayConfig,
    type Sport,
    SPORTS,
} from './sports';

export const BOOKING_HORIZON_DAYS = 14;

export type SessionStatus = 'active' | 'hidden' | 'cancelled';
export type SessionType = 'coaching' | 'court';

export interface Session {
    id: string;
    title: string;
    type: SessionType;
    date: string;
    time: string;
    maxAttendees: number;
    attendees: string[];
    coach?: string | null;
    coachId?: string | null;
    sport?: string;
    weekStartDate?: string;
}

export interface ParsedAttendee {
    uid: string;
    name: string;
    email: string;
    court: string;
    raw: string;
}

const DAY_NAMES = [
    'Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays',
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];

export const parseAttendee = (attendeeStr: string): ParsedAttendee => {
    const parts = attendeeStr.split('|');
    return {
        uid: parts[0] || '',
        name: parts[1] || 'Unknown Player',
        email: parts[2] || 'No Email',
        court: parts[3] || '',
        raw: attendeeStr,
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

    const dayOffsets: Record<DayName, number> = {
        monday: 0,
        tuesday: 1,
        wednesday: 2,
        thursday: 3,
    };

    date.setDate(startOfWeek.getDate() + dayOffsets[dayName] + offset);
    return date;
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

export const getOpenPlaySessionId = (sport: string, day: DayName, playDate: Date): string => {
    const dateStr = playDate.toISOString().split('T')[0];
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
    const sessionId = getOpenPlaySessionId(sport, config.day, playDate);
    const dbSession = sessions.find((s) => s.id === sessionId);
    const totalMax = config.courts.length * config.maxPerCourt;

    if (dbSession) {
        return {
            ...dbSession,
            title: config.title,
            maxAttendees: totalMax,
            sport,
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
        sport,
    };
};

export const bucketAttendeesByCourt = (
    attendees: string[],
    courts: string[],
    maxPerCourt: number,
): string[] => {
    const courtAttendeeBuckets = courts.map((c) =>
        attendees.filter((a) => a.endsWith(`|${c}`)),
    );
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
    return attendees.filter((a) => courts.some((court) => a.endsWith(`|${court}`)));
};

export const getOpenPlayInstancesWithinHorizon = (
    sessions: Session[],
    sport: Sport,
): Array<{ session: Session; config: OpenPlayDayConfig; playDate: Date; isNextWeek: boolean }> => {
    const configs = OPEN_PLAY_SCHEDULE[sport] || [];
    const baseStartOfWeek = getBaseWeekStart(sport);
    const instances: Array<{ session: Session; config: OpenPlayDayConfig; playDate: Date; isNextWeek: boolean }> = [];

    for (const weekOffset of [0, 7] as const) {
        const isNextWeek = weekOffset === 7;
        if (isNextWeek && isWeekLocked(baseStartOfWeek, true)) continue;

        for (const config of configs) {
            const playDate = getPlayDate(baseStartOfWeek, isNextWeek, config.day);
            if (!isWithinBookingHorizon(playDate)) continue;

            const session = resolveOpenPlaySession(sessions, sport, config, weekOffset);
            instances.push({ session, config, playDate, isNextWeek });
        }
    }

    return instances;
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

export const isOpenPlaySession = (session: Session): boolean => {
    const title = session.title.toLowerCase();
    return session.type === 'court' && (title.includes('open play') || session.id.startsWith('open_play_'));
};

export const getOpenPlayConfigForSession = (session: Session): OpenPlayDayConfig | null => {
    if (!isOpenPlaySession(session)) return null;

    const sport = inferSport(session);
    const configs = OPEN_PLAY_SCHEDULE[sport] || [];

    const byTitle = configs.find((c) => c.title === session.title);
    if (byTitle) return byTitle;

    const idMatch = session.id.match(/open_play_[a-z_]+_(monday|tuesday|wednesday|thursday)_/);
    if (idMatch) {
        const day = idMatch[1] as DayName;
        return configs.find((c) => c.day === day) || null;
    }

    const titleLower = session.title.toLowerCase();
    return configs.find((c) => titleLower.includes(c.day)) || null;
};

export const getCourtsForSession = (session: Session): string[] => {
    if (session.type === 'coaching') return [];

    const config = getOpenPlayConfigForSession(session);
    if (config) return config.courts;

    return [];
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
        const openPlayResolved = getOpenPlayInstancesWithinHorizon(sessionsList, sport).map(
            ({ session }) => session,
        );
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

    return combined;
};
