import { parseSessionDateString } from './sessions';

export interface DateFields {
    dateISO: string;
    date: string;
}

export interface TimeFields {
    startTime: string;
    endTime?: string;
    time: string;
}

export interface TimeParts {
    hour12: number;
    minute: number;
    period: 'AM' | 'PM';
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** ISO date string (YYYY-MM-DD) → "Saturday, Jul 11" */
export const formatDisplayDate = (iso: string): string => {
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => isNaN(n))) return iso;
    const [year, month, day] = parts;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

/** 24-hour "HH:mm" → "6:30 PM" */
export const formatDisplayTime = (time24: string): string => {
    const parts = parseTime24(time24);
    if (!parts) return time24;
    return `${parts.hour12}:${pad2(parts.minute)} ${parts.period}`;
};

/** 24-hour range → "6:30 PM – 10:00 PM" */
export const formatDisplayTimeRange = (startTime: string, endTime?: string): string => {
    if (endTime) return `${formatDisplayTime(startTime)} – ${formatDisplayTime(endTime)}`;
    return formatDisplayTime(startTime);
};

export const isoFromDate = (date: Date): string => {
    const y = date.getFullYear();
    const m = pad2(date.getMonth() + 1);
    const d = pad2(date.getDate());
    return `${y}-${m}-${d}`;
};

export const buildDateFieldsFromIso = (dateISO: string): DateFields => ({
    dateISO,
    date: formatDisplayDate(dateISO),
});

export const buildTimeFields = (startTime: string, endTime?: string): TimeFields => ({
    startTime,
    ...(endTime ? { endTime } : {}),
    time: formatDisplayTimeRange(startTime, endTime),
});

export const parseTime24 = (time24: string): TimeParts | null => {
    const match = time24.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hour24 = Number(match[1]);
    const minute = Number(match[2]);
    if (hour24 < 0 || hour24 > 23 || minute < 0 || minute > 59) return null;
    const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return { hour12, minute, period };
};

export const toTime24 = (hour12: number, minute: number, period: 'AM' | 'PM'): string => {
    let hour24 = hour12 % 12;
    if (period === 'PM') hour24 += 12;
    if (period === 'AM' && hour12 === 12) hour24 = 0;
    return `${pad2(hour24)}:${pad2(minute)}`;
};

export const timePartsFrom24 = (time24: string): TimeParts => {
    return parseTime24(time24) ?? { hour12: 12, minute: 0, period: 'AM' };
};

/** Best-effort parse of legacy display time strings. */
export const parseLegacyTime = (timeStr: string): { startTime: string; endTime?: string } | null => {
    if (!timeStr?.trim()) return null;
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/gi;
    const matches = [...timeStr.matchAll(timeRegex)];
    if (matches.length === 0) return null;

    const to24 = (match: RegExpMatchArray) => {
        const hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase() as 'AM' | 'PM';
        return toTime24(hours, mins, ampm);
    };

    const startTime = to24(matches[0]);
    const endTime = matches.length > 1 ? to24(matches[matches.length - 1]) : undefined;
    return endTime && endTime !== startTime ? { startTime, endTime } : { startTime };
};

export const resolveDateISO = (fields: {
    dateISO?: string;
    weekStartDate?: string;
    date?: string;
}): string | null => {
    if (fields.dateISO) return fields.dateISO;
    if (fields.weekStartDate) return fields.weekStartDate;
    const parsed = parseSessionDateString(fields.date || '');
    return parsed ? isoFromDate(parsed) : null;
};

export const resolveEventDateISO = (event: { dateISO?: string; date: string }): string | null =>
    resolveDateISO(event);

export const resolveSessionDateISO = (session: { weekStartDate?: string; date: string }): string | null =>
    resolveDateISO(session);

export const resolveTimes = (fields: {
    startTime?: string;
    endTime?: string;
    time?: string;
}): { startTime: string; endTime?: string } | null => {
    if (fields.startTime) {
        return fields.endTime
            ? { startTime: fields.startTime, endTime: fields.endTime }
            : { startTime: fields.startTime };
    }
    return parseLegacyTime(fields.time || '');
};

export const resolveEventTimes = (event: { startTime?: string; endTime?: string; time: string }) =>
    resolveTimes(event);

export const resolveSessionTimes = (session: { startTime?: string; endTime?: string; time: string }) =>
    resolveTimes(session);

export const buildEventDatePayload = (dateISO: string): DateFields => buildDateFieldsFromIso(dateISO);

export const buildEventTimePayload = (
    start: TimeParts,
    end?: TimeParts | null,
): TimeFields => {
    const startTime = toTime24(start.hour12, start.minute, start.period);
    if (end) {
        const endTime = toTime24(end.hour12, end.minute, end.period);
        return buildTimeFields(startTime, endTime);
    }
    return buildTimeFields(startTime);
};

export const timePartsFromLegacy = (timeStr: string): { start: TimeParts; end?: TimeParts } => {
    const resolved = parseLegacyTime(timeStr);
    if (!resolved) return { start: { hour12: 6, minute: 30, period: 'PM' } };
    const start = timePartsFrom24(resolved.startTime);
    const end = resolved.endTime ? timePartsFrom24(resolved.endTime) : undefined;
    return end ? { start, end } : { start };
};
