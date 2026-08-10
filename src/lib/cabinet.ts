import type { Sport } from './sports';

export const CABINET_YEAR = '2026–2027';

export type CabinetMemberKind = 'co-president' | 'officer';

export interface CabinetMember {
    id: string;
    name: string;
    role: string;
    kind: CabinetMemberKind;
    /** Present for sport leads; omitted for co-presidents and treasury. */
    sport?: Sport;
    photo: string;
    initials: string;
}

export const CABINET_MEMBERS: CabinetMember[] = [
    {
        id: 'rohan-dsouza',
        name: 'Rohan D’Souza',
        role: 'Co-President',
        kind: 'co-president',
        photo: '/cabinet/rohan-dsouza.jpg',
        initials: 'RD',
    },
    {
        id: 'kathryne-piazza',
        name: 'Kathryne Piazza',
        role: 'Co-President',
        kind: 'co-president',
        photo: '/cabinet/kathryne-piazza.jpg',
        initials: 'KP',
    },
    {
        id: 'hirsh-sinai-hede',
        name: 'Hirsh Sinai Hede',
        role: 'Co-President',
        kind: 'co-president',
        photo: '/cabinet/hirsh-sinai-hede.jpg',
        initials: 'HS',
    },
    {
        id: 'naitik-reshamwala',
        name: 'Naitik Reshamwala',
        role: 'Treasury',
        kind: 'officer',
        photo: '/cabinet/naitik-reshamwala.jpg',
        initials: 'NR',
    },
    {
        id: 'altamash-memon',
        name: 'Altamash Memon',
        role: 'Badminton Lead',
        kind: 'officer',
        sport: 'Badminton',
        photo: '/cabinet/altamash-memon.jpg',
        initials: 'AM',
    },
    {
        id: 'armin-thomas',
        name: 'Armin Thomas',
        role: 'Pickleball Lead',
        kind: 'officer',
        sport: 'Pickleball',
        photo: '/cabinet/armin-thomas.jpg',
        initials: 'AT',
    },
    {
        id: 'joe-chantajunlasin',
        name: 'Joe Chantajunlasin',
        role: 'Table Tennis Lead',
        kind: 'officer',
        sport: 'Table Tennis',
        photo: '/cabinet/joe-chantajunlasin.jpg',
        initials: 'JC',
    },
    {
        id: 'laura-wang',
        name: 'Laura Wang',
        role: 'Tennis Lead',
        kind: 'officer',
        sport: 'Tennis',
        photo: '/cabinet/laura-wang.jpg',
        initials: 'LW',
    },
    {
        id: 'maddie-latimore',
        name: 'Maddie Latimore',
        role: 'Squash Lead',
        kind: 'officer',
        sport: 'Squash',
        photo: '/cabinet/maddie-latimore.jpg',
        initials: 'ML',
    },
];

export const CABINET_CO_PRESIDENTS = CABINET_MEMBERS.filter((m) => m.kind === 'co-president');
export const CABINET_OFFICERS = CABINET_MEMBERS.filter((m) => m.kind === 'officer');
