import { isDemoClubEvent } from './demoClubContent';
import { filterUpcomingEvents } from './events';

export interface ClubEvent {
    id: string;
    title: string;
    date: string;
    dateISO?: string;
    time: string;
    startTime?: string;
    endTime?: string;
    location: string;
    image: string;
    link?: string;
}

/** Fallback carousel cards when Firestore has no upcoming events — intentionally empty. */
export const DEFAULT_CLUB_EVENTS: ClubEvent[] = [];

/** Prefer upcoming Firestore events; hide known demo seeds; no mock code fallbacks. */
export const resolveDisplayEvents = (firestoreEvents: ClubEvent[]): ClubEvent[] => {
    return filterUpcomingEvents(firestoreEvents.filter((event) => !isDemoClubEvent(event)));
};
