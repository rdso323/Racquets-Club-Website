export const SPORTS = ['Tennis', 'Badminton', 'Squash', 'Pickleball', 'Table Tennis'] as const;
export type Sport = (typeof SPORTS)[number];

export const SPORT_FILTER_TABS = ['All', ...SPORTS] as const;

export const DEFAULT_OPEN_PLAY_CAPACITY = 8;
export const SLOTS_PER_COURT = 4;

export type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday';

export interface OpenPlayDayConfig {
    day: DayName;
    title: string;
    courts: string[];
    maxPerCourt: number;
    time: string;
}

export const OPEN_PLAY_SCHEDULE: Record<Sport, OpenPlayDayConfig[]> = {
    Tennis: [
        {
            day: 'tuesday',
            title: 'Open Play Tuesday',
            courts: ['Court 2', 'Court 4'],
            maxPerCourt: SLOTS_PER_COURT,
            time: '9:00 PM - 11:00 PM',
        },
        {
            day: 'thursday',
            title: 'Open Play Thursday',
            courts: ['Court 3', 'Court 5'],
            maxPerCourt: SLOTS_PER_COURT,
            time: '9:00 PM - 11:00 PM',
        },
    ],
    Badminton: [
        {
            day: 'wednesday',
            title: 'Open Play Wednesday',
            courts: ['Court 1', 'Court 2'],
            maxPerCourt: SLOTS_PER_COURT,
            time: '3:00 PM - 4:00 PM',
        },
    ],
    Squash: [
        {
            day: 'monday',
            title: 'Open Play Monday',
            courts: ['Court 1', 'Court 2'],
            maxPerCourt: SLOTS_PER_COURT,
            time: '6:00 PM - 8:00 PM',
        },
    ],
    Pickleball: [
        {
            day: 'tuesday',
            title: 'Open Play Tuesday',
            courts: ['Court 1', 'Court 2'],
            maxPerCourt: SLOTS_PER_COURT,
            time: '5:00 PM - 7:00 PM',
        },
    ],
    'Table Tennis': [
        {
            day: 'thursday',
            title: 'Open Play Thursday',
            courts: ['Court 1', 'Court 2'],
            maxPerCourt: SLOTS_PER_COURT,
            time: '5:00 PM - 7:00 PM',
        },
    ],
};

export const SESSION_STATUS_CATEGORIES = SPORTS.flatMap((sport) => [
    { id: `${sport}_OpenPlay`, label: `${sport} Open Play` },
    { id: `${sport}_Clinic`, label: `${sport} Clinic` },
]);
