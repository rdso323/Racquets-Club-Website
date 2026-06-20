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

/** Fallback carousel cards when Firestore has no upcoming events. */
export const DEFAULT_CLUB_EVENTS: ClubEvent[] = [
    {
        id: 'wimbledon-watch-party',
        title: 'Wimbledon Finals Watch Party',
        date: 'Saturday, Jul 11',
        dateISO: '2026-07-11',
        time: '10:00 AM – 4:00 PM ET',
        startTime: '10:00',
        endTime: '16:00',
        location: 'Geneen Auditorium · Fuqua',
        image: '/events/wimbledon-watch-party.png',
        link: 'https://fuquaconnect.duke.edu/events',
    },
    {
        id: 'summer-kickoff',
        title: 'Summer Kickoff Social',
        date: 'Friday, Sep 5',
        dateISO: '2026-09-05',
        time: '6:30 PM',
        startTime: '18:30',
        location: 'Hi-Wire Brewing · Golden Belt, Durham',
        image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80',
        link: 'https://fuquaconnect.duke.edu/events',
    },
    {
        id: 'fall-doubles-mixer',
        title: 'Fall Doubles Mixer',
        date: 'Saturday, Oct 18',
        dateISO: '2026-10-18',
        time: '10:00 AM – 1:00 PM',
        startTime: '10:00',
        endTime: '13:00',
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
