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
        location: 'Card Gym · Courts 2–5',
        image: 'https://images.unsplash.com/photo-1554068865-524ce3be969a?auto=format&fit=crop&w=800&q=80',
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
