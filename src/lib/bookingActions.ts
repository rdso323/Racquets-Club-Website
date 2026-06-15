import { doc, runTransaction, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';
import type { OpenPlayDayConfig } from './sports';
import {
    type Session,
    findUserAttendeeEntry,
    findUserWaitlistEntry,
    formatAttendee,
    formatWaitlistEntry,
    getCourtsForSession,
    getSlotsPerCourt,
    isSessionEnrollmentFull,
    isWaitlistFull,
    parseAttendee,
    promoteFromWaitlist,
} from './sessions';

export interface BookingUserProfile {
    uid: string;
    displayName: string;
    email: string;
}

export interface PromotionResult {
    promoted: boolean;
    promotedName?: string;
    promotedCourt?: string;
}

export const formatMemberName = (user: User): string => {
    if (user.displayName) {
        const parts = user.displayName.split(' ');
        if (parts.length > 1) {
            return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
        }
        return parts[0];
    }

    if (user.email) {
        const emailPart = user.email.split('@')[0];
        const parts = emailPart.split('.');
        if (parts.length > 1) {
            const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            const lastI = parts[1].charAt(0).toUpperCase() + '.';
            return `${first} ${lastI}`;
        }
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }

    return 'Player';
};

export const toBookingProfile = (user: User): BookingUserProfile => ({
    uid: user.uid,
    displayName: formatMemberName(user),
    email: user.email || 'Unknown Email',
});

const sessionSeedFields = (session: Session, activeSport?: string): Record<string, unknown> => ({
    title: session.title,
    type: session.type,
    date: session.date,
    time: session.time,
    maxAttendees: session.maxAttendees,
    sport: activeSport || session.sport,
    ...(session.courts?.length
        ? { courts: session.courts, slotsPerCourt: session.slotsPerCourt ?? getSlotsPerCourt(session) }
        : {}),
    ...(session.maxWaitlistSize != null ? { maxWaitlistSize: session.maxWaitlistSize } : {}),
});

const readSessionData = (session: Session, snapData: Record<string, unknown> | undefined): Session => ({
    ...session,
    ...(snapData as Partial<Session>),
    attendees: (snapData?.attendees as string[]) || session.attendees || [],
    waitlist: (snapData?.waitlist as string[]) || session.waitlist || [],
});

export const joinSessionCourt = async (
    session: Session,
    profile: BookingUserProfile,
    courtName: string | undefined,
    activeSport?: string,
): Promise<'joined' | 'left' | 'switched'> => {
    const sessionRef = doc(db, 'sessions', session.id);
    const attendeeString = formatAttendee(profile.uid, profile.displayName, profile.email, courtName);

    const snap = await runTransaction(db, async (tx) => {
        const docSnap = await tx.get(sessionRef);
        const data = readSessionData(session, docSnap.data());
        const courts = getCourtsForSession(data);
        const maxPerCourt = getSlotsPerCourt(data);
        let attendees = [...(data.attendees || [])];
        const waitlist = [...(data.waitlist || [])];

        const existingEntry = findUserAttendeeEntry(attendees, profile.uid);
        const waitlistEntry = findUserWaitlistEntry(waitlist, profile.uid);

        if (existingEntry) {
            if (courtName && !existingEntry.endsWith(`|${courtName}`)) {
                attendees = attendees.filter((a) => a !== existingEntry);
                attendees.push(attendeeString);
                tx.set(sessionRef, { ...sessionSeedFields(data, activeSport), attendees, waitlist }, { merge: true });
                return 'switched' as const;
            }

            attendees = attendees.filter((a) => a !== existingEntry);
            const freedCourt = parseAttendee(existingEntry).court || courtName;
            let nextAttendees = attendees;
            let nextWaitlist = waitlist;

            if (waitlist.length > 0) {
                const promoted = promoteFromWaitlist(nextAttendees, nextWaitlist, freedCourt || undefined);
                nextAttendees = promoted.attendees;
                nextWaitlist = promoted.waitlist;
            }

            tx.set(
                sessionRef,
                { ...sessionSeedFields(data, activeSport), attendees: nextAttendees, waitlist: nextWaitlist },
                { merge: true },
            );
            return 'left' as const;
        }

        if (waitlistEntry) {
            throw new Error('You are on the waitlist. Leave the waitlist before joining a court.');
        }

        if (courtName && courts.length > 0) {
            const courtAttendees = attendees.filter((a) => a.endsWith(`|${courtName}`));
            if (courtAttendees.length >= maxPerCourt) {
                throw new Error('This court is full.');
            }
        } else if (isSessionEnrollmentFull(data, courts, maxPerCourt)) {
            throw new Error('This session is full.');
        }

        attendees.push(attendeeString);
        tx.set(sessionRef, { ...sessionSeedFields(data, activeSport), attendees, waitlist }, { merge: true });
        return 'joined' as const;
    });

    return snap;
};

export const joinWaitlist = async (
    session: Session,
    profile: BookingUserProfile,
    openPlayConfig?: OpenPlayDayConfig | null,
    activeSport?: string,
): Promise<void> => {
    const sessionRef = doc(db, 'sessions', session.id);

    await runTransaction(db, async (tx) => {
        const docSnap = await tx.get(sessionRef);
        const data = readSessionData(session, docSnap.data());
        const courts = getCourtsForSession(data);
        const maxPerCourt = getSlotsPerCourt(data);
        const attendees = [...(data.attendees || [])];
        const waitlist = [...(data.waitlist || [])];

        if (findUserAttendeeEntry(attendees, profile.uid)) {
            throw new Error('You are already enrolled in this session.');
        }

        if (findUserWaitlistEntry(waitlist, profile.uid)) {
            throw new Error('You are already on the waitlist.');
        }

        if (!isSessionEnrollmentFull(data, courts, maxPerCourt)) {
            throw new Error('Spots are still available — join a court directly.');
        }

        if (isWaitlistFull(data, openPlayConfig)) {
            throw new Error('The waitlist is full.');
        }

        waitlist.push(formatWaitlistEntry(profile.uid, profile.displayName, profile.email));
        tx.set(sessionRef, { ...sessionSeedFields(data, activeSport), attendees, waitlist }, { merge: true });
    });
};

export const leaveWaitlist = async (
    session: Session,
    profile: BookingUserProfile,
    activeSport?: string,
): Promise<void> => {
    const sessionRef = doc(db, 'sessions', session.id);

    await runTransaction(db, async (tx) => {
        const docSnap = await tx.get(sessionRef);
        const data = readSessionData(session, docSnap.data());
        const waitlist = [...(data.waitlist || [])];
        const entry = findUserWaitlistEntry(waitlist, profile.uid);
        if (!entry) return;

        tx.set(
            sessionRef,
            {
                ...sessionSeedFields(data, activeSport),
                attendees: data.attendees || [],
                waitlist: waitlist.filter((w) => w !== entry),
            },
            { merge: true },
        );
    });
};

export const removeAttendeeWithPromotion = async (
    session: Session,
    attendeeStr: string,
): Promise<PromotionResult> => {
    const sessionRef = doc(db, 'sessions', session.id);

    return runTransaction(db, async (tx) => {
        const docSnap = await tx.get(sessionRef);
        const data = readSessionData(session, docSnap.data());
        const courts = getCourtsForSession(data);
        let attendees = [...(data.attendees || [])];
        let waitlist = [...(data.waitlist || [])];

        if (!attendees.includes(attendeeStr)) {
            return { promoted: false };
        }

        attendees = attendees.filter((a) => a !== attendeeStr);
        const freedCourt = parseAttendee(attendeeStr).court;

        let promoted: PromotionResult = { promoted: false };
        if (waitlist.length > 0) {
            const result = promoteFromWaitlist(
                attendees,
                waitlist,
                courts.length > 0 ? freedCourt || undefined : undefined,
            );
            attendees = result.attendees;
            waitlist = result.waitlist;
            if (result.promotedEntry) {
                promoted = {
                    promoted: true,
                    promotedName: result.promotedEntry.name,
                    promotedCourt: freedCourt || undefined,
                };
            }
        }

        tx.set(sessionRef, { attendees, waitlist }, { merge: true });
        return promoted;
    });
};

export const removeWaitlistEntry = async (sessionId: string, waitlistEntry: string): Promise<void> => {
    const sessionRef = doc(db, 'sessions', sessionId);
    await runTransaction(db, async (tx) => {
        const docSnap = await tx.get(sessionRef);
        if (!docSnap.exists()) return;
        const waitlist = [...((docSnap.data().waitlist as string[]) || [])];
        if (!waitlist.includes(waitlistEntry)) return;
        tx.update(sessionRef, { waitlist: waitlist.filter((w) => w !== waitlistEntry) });
    });
};

/** Creates a session doc on first join when the virtual open-play session has no Firestore doc yet. */
export const ensureSessionDoc = async (session: Session, activeSport?: string): Promise<void> => {
    const sessionRef = doc(db, 'sessions', session.id);
    await setDoc(sessionRef, sessionSeedFields(session, activeSport), { merge: true });
};
