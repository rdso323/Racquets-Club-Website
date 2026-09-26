import type { DayName } from './sports';

const JS_WEEKDAY: Record<DayName, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

const formatIcsLocal = (date: Date): string =>
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;

const formatIcsStamp = (): string => {
    const date = new Date();
    return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}00Z`;
};

const escapeIcs = (value: string): string =>
    value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');

const icsFilename = (title: string): string =>
    `${title.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'session'}.ics`;

export const downloadIcsFile = (title: string, lines: string[]): void => {
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', icsFilename(title));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(link.href);
};

const applyClock = (date: Date, time24: string): void => {
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    const hours = match ? Number(match[1]) : 18;
    const minutes = match ? Number(match[2]) : 30;
    date.setHours(hours, minutes, 0, 0);
};

/** Next local occurrence of a weekday at the given start time. */
export const nextWeeklyOccurrence = (
    day: DayName,
    startTime: string,
    endTime?: string,
    now = new Date(),
): { start: Date; end: Date } => {
    const start = new Date(now);
    const target = JS_WEEKDAY[day];
    let distance = target - start.getDay();
    if (distance < 0) distance += 7;
    start.setDate(start.getDate() + distance);
    applyClock(start, startTime);
    if (start.getTime() < now.getTime() - 60 * 60 * 1000) {
        start.setDate(start.getDate() + 7);
    }

    const end = new Date(start);
    if (endTime) {
        applyClock(end, endTime);
        if (end <= start) end.setDate(end.getDate() + 1);
    } else {
        end.setTime(start.getTime() + 60 * 60 * 1000);
    }
    return { start, end };
};

const eventLines = (input: {
    title: string;
    description: string;
    start: Date;
    end: Date;
    rrule?: string;
}): string[] => [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Fuqua Racquets Club//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@fuquaracquetsclub`,
    `DTSTAMP:${formatIcsStamp()}`,
    `DTSTART:${formatIcsLocal(input.start)}`,
    `DTEND:${formatIcsLocal(input.end)}`,
    ...(input.rrule ? [`RRULE:${input.rrule}`] : []),
    `SUMMARY:${escapeIcs(input.title)}`,
    `DESCRIPTION:${escapeIcs(input.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
];

export interface SessionCalendarSource {
    title: string;
    date: string;
    time: string;
}

/** One-off invite for a single booked session (existing Join flow). */
export const downloadSessionCalendarInvite = (session: SessionCalendarSource, courtName?: string): void => {
    let startDate = new Date();
    let endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const days = [
        'Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays',
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
    ];

    const targetDate = new Date();
    for (let i = 0; i < days.length; i++) {
        if (session.date.includes(days[i])) {
            const targetDay = i % 7;
            let distance = targetDay - targetDate.getDay();
            if (distance < 0) distance += 7;
            targetDate.setDate(targetDate.getDate() + distance);
            break;
        }
    }

    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const match = session.time?.match(timeRegex);
    if (match) {
        let hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        targetDate.setHours(hours, mins, 0, 0);

        if (targetDate.getTime() < Date.now() - 60 * 60 * 1000) {
            targetDate.setDate(targetDate.getDate() + 7);
        }
        startDate = new Date(targetDate);

        const remainingStr = session.time.substring((match.index ?? 0) + match[0].length);
        const endMatch = remainingStr.match(timeRegex);
        if (endMatch) {
            let endHours = parseInt(endMatch[1], 10);
            const endMins = parseInt(endMatch[2], 10);
            const endAmpm = endMatch[3].toUpperCase();
            if (endAmpm === 'PM' && endHours < 12) endHours += 12;
            if (endAmpm === 'AM' && endHours === 12) endHours = 0;
            endDate = new Date(targetDate);
            endDate.setHours(endHours, endMins, 0, 0);
            if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
        }
    }

    const title = courtName ? `${session.title} - ${courtName}` : session.title;
    const description = `Fuqua Racquets Club\n${session.title}\n${session.date}\n${session.time}${courtName ? `\nCourt: ${courtName}` : ''}`;
    downloadIcsFile(title, eventLines({ title, description, start: startDate, end: endDate }));
};

export interface WeeklySeriesCalendarInput {
    title: string;
    day: DayName;
    startTime: string;
    endTime?: string;
    /** Inclusive last play date, YYYY-MM-DD. Omit for an open-ended weekly repeat. */
    endsOn?: string;
}

/** RRULE for a weekly series. UNTIL is the end of `endsOn` in local floating time when set. */
export const weeklySeriesRrule = (endsOn?: string): string => {
    if (!endsOn || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) return 'FREQ=WEEKLY';
    const [year, month, day] = endsOn.split('-').map(Number);
    const until = new Date(year, month - 1, day, 23, 59, 0, 0);
    return `FREQ=WEEKLY;UNTIL=${formatIcsLocal(until)}`;
};

/** ICS lines for one weekly series. Court is omitted because the spot can change. */
export const buildWeeklySeriesLines = (input: WeeklySeriesCalendarInput, now = new Date()): string[] => {
    const { start, end } = nextWeeklyOccurrence(input.day, input.startTime, input.endTime, now);
    const description = input.endsOn
        ? `Weekly Fuqua Racquets Club session through ${input.endsOn}. Dropping one week on the site does not remove that date from this calendar event.`
        : 'Weekly Fuqua Racquets Club session. Dropping one week on the site does not remove that date from this calendar event.';
    return eventLines({
        title: input.title,
        description,
        start,
        end,
        rrule: weeklySeriesRrule(input.endsOn),
    });
};

/** One weekly repeating invite. UNTIL is the end of `endsOn` in local time when set. */
export const downloadWeeklySeriesCalendar = (input: WeeklySeriesCalendarInput): void => {
    downloadIcsFile(input.title, buildWeeklySeriesLines(input));
};
