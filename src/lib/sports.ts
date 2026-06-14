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

export interface SportTheme {
    /** Bright accent for dark backgrounds */
    accent: string;
    /** Readable accent on light backgrounds */
    accentLight: string;
    dim: string;
    secondary: string;
    code: string;
}

export const SPORT_THEME: Record<Sport, SportTheme> = {
    Tennis: {
        accent: '#BEF264',
        accentLight: '#3F6212',
        dim: 'rgba(190, 242, 100, 0.14)',
        secondary: '#34D399',
        code: 'TNS',
    },
    Badminton: {
        accent: '#F4EFE2',
        accentLight: '#0F766E',
        dim: 'rgba(244, 239, 226, 0.12)',
        secondary: '#22D3EE',
        code: 'BDM',
    },
    Squash: {
        accent: '#FFBF00',
        accentLight: '#B45309',
        dim: 'rgba(255, 191, 0, 0.16)',
        secondary: '#FACC15',
        code: 'SQH',
    },
    Pickleball: {
        accent: '#CCFF00',
        accentLight: '#4D7C0F',
        dim: 'rgba(204, 255, 0, 0.14)',
        secondary: '#3B82F6',
        code: 'PKL',
    },
    'Table Tennis': {
        accent: '#93C5FD',
        accentLight: '#1E3A8A',
        dim: 'rgba(30, 58, 138, 0.18)',
        secondary: '#F97316',
        code: 'TBL',
    },
};

export const getSportTheme = (sport: string): SportTheme =>
    SPORT_THEME[sport as Sport] ?? SPORT_THEME.Tennis;

/**
 * Deterministic daily rotation across all sports. Returns SPORTS reordered so the
 * "focus" sport advances by one each day — used by the scheduled news/ticker task
 * to cycle coverage evenly across the five club sports.
 */
export const getDailySportRotation = (date = new Date()): Sport[] => {
    const dayOfYear = Math.floor(
        (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86_400_000,
    );
    const offset = dayOfYear % SPORTS.length;
    return [...SPORTS.slice(offset), ...SPORTS.slice(0, offset)];
};
