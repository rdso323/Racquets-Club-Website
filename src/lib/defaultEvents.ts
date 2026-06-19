export interface ClubEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    image: string;
    link?: string;
}

/** Fallback carousel cards when Firestore `events` collection is empty. */
export const DEFAULT_CLUB_EVENTS: ClubEvent[] = [
    {
        id: 'wimbledon-watch-party',
        title: 'Wimbledon Finals Watch Party',
        date: 'Saturday, Jul 11',
        time: '10:00 AM – 4:00 PM ET',
        location: 'Geneen Auditorium · Fuqua',
        image: 'https://images.unsplash.com/photo-1595435934249-4437caf461bd?auto=format&fit=crop&w=800&q=80',
        link: 'https://fuquaconnect.duke.edu/events',
    },
    {
        id: 'summer-kickoff',
        title: 'Summer Kickoff Social',
        date: 'Friday, Sep 5',
        time: '6:30 PM',
        location: 'Hi-Wire Brewing · Golden Belt, Durham',
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
        link: 'https://fuquaconnect.duke.edu/events',
    },
    {
        id: 'fall-doubles-mixer',
        title: 'Fall Doubles Mixer',
        date: 'Saturday, Oct 18',
        time: '10:00 AM – 1:00 PM',
        location: 'Center Courts · Card Gym',
        image: 'https://images.unsplash.com/photo-1622160230622-8ee2aaf137b6?auto=format&fit=crop&w=800&q=80',
        link: 'https://fuquaconnect.duke.edu/events',
    },
];

const recommendedTitles = () => new Set(DEFAULT_CLUB_EVENTS.map((event) => event.title));

/** True when Firestore matches the current recommended carousel set. */
export const isRecommendedEventSet = (events: Pick<ClubEvent, 'title'>[]): boolean =>
    events.length === DEFAULT_CLUB_EVENTS.length &&
    events.every((event) => recommendedTitles().has(event.title));

/** Show code defaults until Firestore is empty or synced to the recommended set. */
export const resolveDisplayEvents = (firestoreEvents: ClubEvent[]): ClubEvent[] => {
    if (firestoreEvents.length === 0 || !isRecommendedEventSet(firestoreEvents)) {
        return DEFAULT_CLUB_EVENTS;
    }
    return firestoreEvents;
};
