import { parseAttendee, parseWaitlistEntry, type Session } from './sessions';

export interface ClubMember {
    uid: string;
    name: string;
    email: string;
}

type UserDoc = { id: string; data: Record<string, unknown> };

const memberKey = (uid: string, email: string) => (uid && !uid.startsWith('manual_') ? uid : email.toLowerCase());

const upsertMember = (map: Map<string, ClubMember>, uid: string, name: string, email: string) => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName && !trimmedEmail) return;

    const resolvedName = trimmedName || trimmedEmail.split('@')[0];
    const resolvedEmail = trimmedEmail || '';
    const key = memberKey(uid, resolvedEmail || resolvedName);
    const existing = map.get(key);
    const isRealUid = uid && !uid.startsWith('manual_');

    if (!existing || (isRealUid && existing.uid.startsWith('manual_'))) {
        map.set(key, {
            uid: isRealUid ? uid : existing?.uid || `manual_${key}`,
            name: resolvedName,
            email: resolvedEmail,
        });
    }
};

/** Merge Firestore users with anyone seen on session rosters or waitlists. */
export const buildMemberDirectory = (userDocs: UserDoc[], sessions: Session[]): ClubMember[] => {
    const map = new Map<string, ClubMember>();

    for (const { id, data } of userDocs) {
        const email = String(data.email || '');
        const name = String(data.displayName || data.name || '');
        if (email || name) {
            upsertMember(map, id, name || email.split('@')[0], email);
        }
    }

    for (const session of sessions) {
        for (const attendee of session.attendees || []) {
            const player = parseAttendee(attendee);
            upsertMember(map, player.uid, player.name, player.email);
        }
        for (const entry of session.waitlist || []) {
            const person = parseWaitlistEntry(entry);
            upsertMember(map, person.uid, person.name, person.email);
        }
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
};

export const filterMembers = (members: ClubMember[], query: string, limit = 8): ClubMember[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return members
        .filter(
            (member) =>
                member.name.toLowerCase().includes(q) ||
                member.email.toLowerCase().includes(q),
        )
        .slice(0, limit);
};
