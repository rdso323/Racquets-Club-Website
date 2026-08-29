import type { Sport } from './sports';
import { SPORTS } from './sports';

export const CABINET_YEAR = '2026–2027';

/** Firestore document: `settings/cabinet` */
export const CABINET_SETTINGS_COLLECTION = 'settings';
export const CABINET_SETTINGS_DOC_ID = 'cabinet';

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

export interface CabinetRoster {
    year: string;
    members: CabinetMember[];
}

export type CabinetRolePreset = 'co-president' | 'treasury' | Sport;

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
        role: 'Badminton',
        kind: 'officer',
        sport: 'Badminton',
        photo: '/cabinet/altamash-memon.jpg',
        initials: 'AM',
    },
    {
        id: 'armin-thomas',
        name: 'Armin Thomas',
        role: 'Pickleball',
        kind: 'officer',
        sport: 'Pickleball',
        photo: '/cabinet/armin-thomas.jpg',
        initials: 'AT',
    },
    {
        id: 'joe-chantajunlasin',
        name: 'Joe Chantajunlasin',
        role: 'Table Tennis',
        kind: 'officer',
        sport: 'Table Tennis',
        photo: '/cabinet/joe-chantajunlasin.jpg',
        initials: 'JC',
    },
    {
        id: 'laura-wang',
        name: 'Laura Wang',
        role: 'Tennis',
        kind: 'officer',
        sport: 'Tennis',
        photo: '/cabinet/laura-wang.jpg',
        initials: 'LW',
    },
    {
        id: 'maddie-latimore',
        name: 'Maddie Latimore',
        role: 'Squash',
        kind: 'officer',
        sport: 'Squash',
        photo: '/cabinet/maddie-latimore.jpg',
        initials: 'ML',
    },
];

export const CABINET_CO_PRESIDENTS = CABINET_MEMBERS.filter((m) => m.kind === 'co-president');
export const CABINET_OFFICERS = CABINET_MEMBERS.filter((m) => m.kind === 'officer');

export const slugifyCabinetId = (name: string): string => {
    const slug = name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || `member-${Date.now()}`;
};

export const initialsFromName = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
};

export const isSport = (value: string): value is Sport =>
    (SPORTS as readonly string[]).includes(value);

export const rolePresetFromMember = (member: CabinetMember): CabinetRolePreset => {
    if (member.kind === 'co-president') return 'co-president';
    if (member.sport && isSport(member.sport)) return member.sport;
    if (member.role === 'Treasury') return 'treasury';
    if (isSport(member.role)) return member.role;
    return 'treasury';
};

export const buildMemberFromPreset = (
    name: string,
    preset: CabinetRolePreset,
    photo: string,
    id?: string,
): CabinetMember => {
    const trimmed = name.trim();
    const photoTrimmed = photo.trim();
    if (preset === 'co-president') {
        return {
            id: id || slugifyCabinetId(trimmed),
            name: trimmed,
            role: 'Co-President',
            kind: 'co-president',
            photo: photoTrimmed,
            initials: initialsFromName(trimmed),
        };
    }
    if (preset === 'treasury') {
        return {
            id: id || slugifyCabinetId(trimmed),
            name: trimmed,
            role: 'Treasury',
            kind: 'officer',
            photo: photoTrimmed,
            initials: initialsFromName(trimmed),
        };
    }
    return {
        id: id || slugifyCabinetId(trimmed),
        name: trimmed,
        role: preset,
        kind: 'officer',
        sport: preset,
        photo: photoTrimmed,
        initials: initialsFromName(trimmed),
    };
};

const normalizeKind = (raw: unknown, role: string, sport?: Sport): CabinetMemberKind => {
    if (raw === 'co-president' || raw === 'officer') return raw;
    if (role === 'Co-President') return 'co-president';
    if (sport || role === 'Treasury' || isSport(role)) return 'officer';
    return 'officer';
};

export const normalizeCabinetMember = (raw: unknown, index = 0): CabinetMember | null => {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as Record<string, unknown>;
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) return null;

    const photo = typeof data.photo === 'string' ? data.photo.trim() : '';
    const sportRaw = typeof data.sport === 'string' ? data.sport : undefined;
    const sport = sportRaw && isSport(sportRaw) ? sportRaw : undefined;
    const roleRaw = typeof data.role === 'string' ? data.role.trim() : '';
    const role =
        roleRaw ||
        (sport ? sport : data.kind === 'co-president' ? 'Co-President' : 'Treasury');
    const kind = normalizeKind(data.kind, role, sport);
    const id =
        typeof data.id === 'string' && data.id.trim()
            ? data.id.trim()
            : `${slugifyCabinetId(name)}-${index}`;
    const initials =
        typeof data.initials === 'string' && data.initials.trim()
            ? data.initials.trim()
            : initialsFromName(name);

    const member: CabinetMember = {
        id,
        name,
        role,
        kind,
        photo,
        initials,
    };
    if (sport) member.sport = sport;
    else if (isSport(role)) member.sport = role;
    return member;
};

export const normalizeCabinetRoster = (raw: unknown): CabinetRoster | null => {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as Record<string, unknown>;
    const membersRaw = Array.isArray(data.members) ? data.members : null;
    if (!membersRaw) return null;
    const members = membersRaw
        .map((item, i) => normalizeCabinetMember(item, i))
        .filter((m): m is CabinetMember => m !== null);
    const year =
        typeof data.year === 'string' && data.year.trim() ? data.year.trim() : CABINET_YEAR;
    return { year, members };
};

export interface ResolvedCabinet {
    year: string;
    members: CabinetMember[];
    coPresidents: CabinetMember[];
    officers: CabinetMember[];
    source: 'firestore' | 'defaults';
}

/** Prefer a non-empty Firestore roster; otherwise use the built-in code roster. */
export const resolveCabinetDisplay = (firestore: unknown): ResolvedCabinet => {
    const normalized = normalizeCabinetRoster(firestore);
    if (normalized && normalized.members.length > 0) {
        return {
            year: normalized.year,
            members: normalized.members,
            coPresidents: normalized.members.filter((m) => m.kind === 'co-president'),
            officers: normalized.members.filter((m) => m.kind === 'officer'),
            source: 'firestore',
        };
    }
    return {
        year: CABINET_YEAR,
        members: CABINET_MEMBERS,
        coPresidents: CABINET_CO_PRESIDENTS,
        officers: CABINET_OFFICERS,
        source: 'defaults',
    };
};
