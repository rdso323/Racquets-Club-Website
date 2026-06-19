import type { ClubEvent } from './defaultEvents';
import { parseSessionDateString } from './sessions';

/** True after the event date has fully ended (same end-of-day rule as session cards). */
export const isEventPast = (event: Pick<ClubEvent, 'date'>): boolean => {
    const eventDate = parseSessionDateString(event.date);
    if (!eventDate) return false;
    return eventDate.getTime() + 24 * 60 * 60 * 1000 < Date.now();
};

export const filterUpcomingEvents = <T extends Pick<ClubEvent, 'date'>>(events: T[]): T[] =>
    events.filter((event) => !isEventPast(event));

export const partitionEventsByPast = <T extends Pick<ClubEvent, 'date'>>(
    events: T[],
): { upcoming: T[]; past: T[] } => ({
    upcoming: events.filter((event) => !isEventPast(event)),
    past: events.filter((event) => isEventPast(event)),
});
