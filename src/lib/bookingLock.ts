import type { DayName } from './sports';

export interface BookingLockRule {
    bookingLockEnabled?: boolean;
    bookingLockDay?: DayName;
    bookingLockTime?: string;
}

const LOCK_WEEKDAY_INDEX: Record<DayName, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
};

const LOCK_TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** Omitted fields mean the later week stays locked until Sunday at 5:00 PM Eastern. */
export const resolveBookingLock = (rule?: BookingLockRule | null): { enabled: boolean; day: DayName; time: string } => {
    const match = rule?.bookingLockTime?.match(LOCK_TIME_PATTERN);
    const time = match ? `${match[1].padStart(2, '0')}:${match[2]}` : '17:00';
    const day = rule?.bookingLockDay && rule.bookingLockDay in LOCK_WEEKDAY_INDEX ? rule.bookingLockDay : 'sunday';
    return {
        enabled: rule?.bookingLockEnabled !== false,
        day,
        time,
    };
};

const easternOffsetMinutes = (instant: Date): number => {
    const zone = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        timeZoneName: 'shortOffset',
        hour: '2-digit',
    })
        .formatToParts(instant)
        .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT-5';
    const match = zone.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!match) return -300;
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3] ?? 0));
};

/** Wall-clock time in America/New_York as an absolute instant. */
export const instantInEastern = (year: number, month: number, day: number, hour: number, minute: number): Date => {
    const wall = Date.UTC(year, month - 1, day, hour, minute, 0);
    const offset = easternOffsetMinutes(new Date(wall));
    let utc = wall - offset * 60_000;
    const offsetAtResult = easternOffsetMinutes(new Date(utc));
    if (offsetAtResult !== offset) utc = wall - offsetAtResult * 60_000;
    return new Date(utc);
};

/** Chosen weekday in the seven days before this week's Monday. Sunday is the day before. */
export const unlockInstantForWeek = (weekMonday: Date, day: DayName, time: string): Date => {
    const monday = new Date(weekMonday);
    monday.setHours(12, 0, 0, 0);
    let back = (1 - LOCK_WEEKDAY_INDEX[day] + 7) % 7;
    if (back === 0) back = 7;
    const unlock = new Date(monday);
    unlock.setDate(monday.getDate() - back);
    const match = time.match(LOCK_TIME_PATTERN);
    const hour = match ? Number(match[1]) : 17;
    const minute = match ? Number(match[2]) : 0;
    return instantInEastern(unlock.getFullYear(), unlock.getMonth() + 1, unlock.getDate(), hour, minute);
};

const formatLockClock = (time: string): string => {
    const match = time.match(LOCK_TIME_PATTERN);
    if (!match) return '5:00 PM';
    const hour24 = Number(match[1]);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    const hour = hour24 % 12 || 12;
    return `${hour}:${match[2]} ${period}`;
};

/** Fields worth writing. Defaults are omitted so an old template stays Sunday 5:00 PM. */
export const storedBookingLockFields = (rule?: BookingLockRule | null): BookingLockRule => {
    const resolved = resolveBookingLock(rule);
    const fields: BookingLockRule = {};
    if (rule?.bookingLockEnabled === false) fields.bookingLockEnabled = false;
    if (resolved.day !== 'sunday') fields.bookingLockDay = resolved.day;
    if (resolved.time !== '17:00') fields.bookingLockTime = resolved.time;
    return fields;
};

export const bookingLockMessage = (rule?: BookingLockRule | null): string => {
    const resolved = resolveBookingLock(rule);
    if (!resolved.enabled) return '';
    const day = resolved.day.charAt(0).toUpperCase() + resolved.day.slice(1);
    return `Opens ${day} ${formatLockClock(resolved.time)} Eastern`;
};

export const isWeekLocked = (
    startOfWeek: Date,
    isNextWeek: boolean,
    rule?: BookingLockRule | null,
    now = new Date(),
): boolean => {
    const resolved = resolveBookingLock(rule);
    if (!resolved.enabled) return false;

    const targetMonday = new Date(startOfWeek);
    if (isNextWeek) targetMonday.setDate(startOfWeek.getDate() + 7);
    return now.getTime() < unlockInstantForWeek(targetMonday, resolved.day, resolved.time).getTime();
};
