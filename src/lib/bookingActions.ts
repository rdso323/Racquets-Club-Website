import { doc, runTransaction, setDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';
import type { OpenPlayDayConfig } from './sports';
import {
    type Session,
    filterAttendeesByCourt,
    findUserAttendeeEntry,
    findUserWaitlistEntry,
    formatAttendee,
    formatWaitlistEntry,
    firstOpenCourtSlot,
    getCourtsForSession,
    getDiagramSlotsPerCourt,
    getSlotsPerCourt,
    isAttendeeOnCourt,
    isCourtSlotTaken,
    isSessionEnrollmentFull,
    isWaitlistFull,
    parseAttendee,
    promoteFromWaitlist,
} from './sessions';
import { formatMemberNameFromEmail } from './memberNames';

export interface BookingUserProfile {
    uid: string;
    displayName: string;
    email: string;
}

export interface PromotionResult {
    promoted: boolean;
    promotedUid?: string;
    promotedName?: string;
    promotedCourt?: string;
}

export type JoinSessionResult =
    | { action: 'joined' | 'switched' }
    | { action: 'left'; promotion?: PromotionResult };

export const formatMemberName = (user: User): string => {
    if (user.displayName?.trim()) {
        const parts = user.displayName.trim().split(/\s+/);
        if (parts.length > 1) {
            return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
        }
        return parts[0];
    }

    return formatMemberNameFromEmail(user.email);
};

export const toBookingProfile = (user: User): BookingUserProfile => ({
    uid: user.uid,
    displayName: formatMemberName(user),
    email: user.email || 'Unknown Email',
});

const sessionSeedFields = (session: Session, activeSport?: string): Record<string, unknown> => {
    const dateFromId = session.id.match(/(\d{4}-\d{2}-\d{2})$/)?.[1];
    const weekStartDate = session.weekStartDate ?? dateFromId;

    return {
        title: session.title,
        type: session.type,
        date: session.date,
        time: session.time,
        ...(session.startTime ? { startTime: session.startTime } : {}),
        ...(session.endTime ? { endTime: session.endTime } : {}),
        ...(weekStartDate ? { weekStartDate } : {}),
        maxAttendees: session.maxAttendees,
        sport: activeSport || session.sport,
        ...(session.courts?.length
            ? { courts: session.courts, slotsPerCourt: session.slotsPerCourt ?? getSlotsPerCourt(session) }
            : {}),
        ...(session.maxWaitlistSize != null ? { maxWaitlistSize: session.maxWaitlistSize } : {}),
    };
};

const readSessionData = (session: Session, snapData: Record<string, unknown> | undefined): Session => ({
    ...session,
    ...(snapData as Partial<Session>),
    attendees: (snapData?.attendees as string[]) || session.attendees || [],
    waitlist: (snapData?.waitlist as string[]) || session.waitlist || [],
});

const courtAttendeesFor = (attendees: string[], courtName: string) =>
    filterAttendeesByCourt(attendees, courtName);

export const joinSessionCourt = async (
    session: Session,
    profile: BookingUserProfile,
    courtName: string | undefined,
    activeSport?: string,
    slotIndex?: number,
): Promise<JoinSessionResult> => {
    const sessionRef = doc(db, 'sessions', session.id);

    const snap = await runTransaction(db, async (tx) => {
        const docSnap = await tx.get(sessionRef);
        const data = readSessionData(session, docSnap.data());
        const courts = getCourtsForSession(data);
        const maxPerCourt =
            getDiagramSlotsPerCourt(data, courts) ?? getSlotsPerCourt(data);
        let attendees = [...(data.attendees || [])];
        const waitlist = [...(data.waitlist || [])];

        const existingEntry = findUserAttendeeEntry(attendees, profile.uid);
        const waitlistEntry = findUserWaitlistEntry(waitlist, profile.uid);

        if (existingEntry) {
            if (courtName && !isAttendeeOnCourt(existingEntry, courtName)) {
                const targetCourtAttendees = courtAttendeesFor(attendees, courtName);
                let targetSlot = slotIndex;
                if (targetSlot == null) {
                    targetSlot = firstOpenCourtSlot(targetCourtAttendees, maxPerCourt) ?? undefined;
                }
                if (targetSlot == null || isCourtSlotTaken(targetCourtAttendees, maxPerCourt, targetSlot)) {
                    throw new Error('This spot is not available.');
                }
                const attendeeString = formatAttendee(
                    profile.uid,
                    profile.displayName,
                    profile.email,
                    courtName,
                    targetSlot,
                );
                attendees = attendees.filter((a) => a !== existingEntry);
                attendees.push(attendeeString);
                tx.set(sessionRef, { ...sessionSeedFields(data, activeSport), attendees, waitlist }, { merge: true });
                return { action: 'switched' as const };
            }

            attendees = attendees.filter((a) => a !== existingEntry);
            const freedCourt = parseAttendee(existingEntry).court || courtName;
            let nextAttendees = attendees;
            let nextWaitlist = waitlist;
            let promotion: PromotionResult | undefined;

            if (waitlist.length > 0) {
                const promoted = promoteFromWaitlist(
                    nextAttendees,
                    nextWaitlist,
                    freedCourt || undefined,
                    maxPerCourt,
                );
                nextAttendees = promoted.attendees;
                nextWaitlist = promoted.waitlist;
                if (promoted.promotedEntry) {
                    promotion = {
                        promoted: true,
                        promotedUid: promoted.promotedEntry.uid,
                        promotedName: promoted.promotedEntry.name,
                        promotedCourt: freedCourt || undefined,
                    };
                }
            }

            tx.set(
                sessionRef,
                { ...sessionSeedFields(data, activeSport), attendees: nextAttendees, waitlist: nextWaitlist },
                { merge: true },
            );
            return promotion ? { action: 'left' as const, promotion } : { action: 'left' as const };
        }

        if (waitlistEntry) {
            throw new Error('You are on the waitlist. Leave the waitlist before joining a court.');
        }

        if (courtName && courts.length > 0) {
            const targetCourtAttendees = courtAttendeesFor(attendees, courtName);
            let targetSlot = slotIndex;
            if (targetSlot == null) {
                targetSlot = firstOpenCourtSlot(targetCourtAttendees, maxPerCourt) ?? undefined;
            }
            if (targetSlot == null) {
                throw new Error('This court is full.');
            }
            if (isCourtSlotTaken(targetCourtAttendees, maxPerCourt, targetSlot)) {
                throw new Error('This spot is already taken.');
            }
            const attendeeString = formatAttendee(
                profile.uid,
                profile.displayName,
                profile.email,
                courtName,
                targetSlot,
            );
            attendees.push(attendeeString);
        } else if (isSessionEnrollmentFull(data, courts, maxPerCourt)) {
            throw new Error('This session is full.');
        } else {
            attendees.push(formatAttendee(profile.uid, profile.displayName, profile.email));
        }

        tx.set(sessionRef, { ...sessionSeedFields(data, activeSport), attendees, waitlist }, { merge: true });
        return { action: 'joined' as const };
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
        const maxPerCourt =
            getDiagramSlotsPerCourt(data, courts) ?? getSlotsPerCourt(data);
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
        const maxPerCourt =
            getDiagramSlotsPerCourt(data, courts) ?? getSlotsPerCourt(data);
        let attendees = [...(data.attendees || [])];
        let waitlist = [...(data.waitlist || [])];

        if (!attendees.includes(attendeeStr)) {
            return { promoted: false };
        }

        attendees = attendees.filter((a) => a !== attendeeStr);
        const freedCourt = parseAttendee(attendeeStr).court;
        const freedSlot = parseAttendee(attendeeStr).slotIndex;

        let promoted: PromotionResult = { promoted: false };
        if (waitlist.length > 0) {
            const result = promoteFromWaitlist(
                attendees,
                waitlist,
                courts.length > 0 ? freedCourt || undefined : undefined,
                maxPerCourt,
            );
            attendees = result.attendees;
            waitlist = result.waitlist;
            if (result.promotedEntry && courts.length > 0 && freedCourt) {
                const promotedIdx = attendees.findIndex((a) => a.startsWith(`${result.promotedEntry!.uid}|`));
                if (promotedIdx >= 0 && freedSlot != null) {
                    const p = result.promotedEntry;
                    attendees[promotedIdx] = formatAttendee(
                        p.uid,
                        p.name,
                        p.email,
                        freedCourt,
                        freedSlot,
                    );
                }
            }
            if (result.promotedEntry) {
                promoted = {
                    promoted: true,
                    promotedUid: result.promotedEntry.uid,
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

export type CoachSlotResult = { action: 'claimed' } | { action: 'dropped' };

const coachDisplayName = (profile: BookingUserProfile): string => {
    if (profile.displayName && profile.displayName !== 'Player') {
        return profile.displayName;
    }
    const local = profile.email.split('@')[0] || '';
    const parts = local.split(/[.\-_]+/).filter(Boolean);
    if (parts.length === 0) return 'Coach';
    return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
};

/**
 * Claim or drop the instructor slot on a coaching clinic.
 * Uses a transaction + merge so virtual recurring sessions (no Firestore doc yet) still work.
 * Available to any signed-in member — not admin-only.
 */
export const toggleCoachSlot = async (
    session: Session,
    profile: BookingUserProfile,
    activeSport?: string,
): Promise<CoachSlotResult> => {
    if (session.type !== 'coaching') {
        throw new Error('Only coaching clinics have a coach slot.');
    }

    const sessionRef = doc(db, 'sessions', session.id);

    return runTransaction(db, async (tx) => {
        const docSnap = await tx.get(sessionRef);
        const data = readSessionData(session, docSnap.data());
        const currentCoachId = (docSnap.exists() ? (docSnap.data()?.coachId as string | null | undefined) : data.coachId) ?? null;

        if (currentCoachId && currentCoachId === profile.uid) {
            tx.set(
                sessionRef,
                {
                    ...sessionSeedFields(data, activeSport),
                    attendees: data.attendees || [],
                    waitlist: data.waitlist || [],
                    coachId: null,
                    coach: 'TBD',
                },
                { merge: true },
            );
            return { action: 'dropped' as const };
        }

        if (currentCoachId) {
            throw new Error('This coach slot is already claimed.');
        }

        tx.set(
            sessionRef,
            {
                ...sessionSeedFields(data, activeSport),
                attendees: data.attendees || [],
                waitlist: data.waitlist || [],
                coachId: profile.uid,
                coach: coachDisplayName(profile),
            },
            { merge: true },
        );
        return { action: 'claimed' as const };
    });
};

/** Admin: set a free-text coach name (clears claimed coachId). Safe for virtual sessions. */
export const assignCoachName = async (
    session: Session,
    coachName: string,
    activeSport?: string,
): Promise<void> => {
    const sessionRef = doc(db, 'sessions', session.id);
    const trimmed = coachName.trim();
    await setDoc(
        sessionRef,
        {
            ...sessionSeedFields(session, activeSport),
            coach: trimmed || 'TBD',
            coachId: null,
        },
        { merge: true },
    );
};
