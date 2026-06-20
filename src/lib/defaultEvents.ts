import { filterUpcomingEvents } from './events';

export interface ClubEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    image: string;
    link?: string;
}

/** Fallback carousel cards when Firestore has no upcoming events. */
export const DEFAULT_CLUB_EVENTS: ClubEvent[] = [
    {
        id: 'wimbledon-watch-party',
        title: 'Wimbledon Finals Watch Party',
        date: 'Saturday, Jul 11',
        time: '10:00 AM – 4:00 PM ET',
        location: 'Geneen Auditorium · Fuqua',
        image: '/events/wimbledon-watch-party.png',
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
        image: '/events/fall-doubles-mixer.jpg',
        link: 'https://fuquaconnect.duke.edu/events',
    },
];

/** Prefer upcoming Firestore events; otherwise show code defaults. */
export const resolveDisplayEvents = (firestoreEvents: ClubEvent[]): ClubEvent[] => {
    const upcomingFirestore = filterUpcomingEvents(firestoreEvents);
    if (upcomingFirestore.length > 0) return upcomingFirestore;
    return filterUpcomingEvents(DEFAULT_CLUB_EVENTS);
};
