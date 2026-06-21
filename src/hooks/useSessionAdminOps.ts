import { useState } from 'react';
import {
    doc,
    deleteDoc,
    updateDoc,
    setDoc,
    getDoc,
    arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { type AdminRecurringSchedule, getSlotsPerCourtForSport } from '../lib/sports';
import {
    type Session,
    buildCourtLabels,
    courtFieldsFromSession,
    findUserAttendeeEntry,
    findUserWaitlistEntry,
    formatWaitlistEntry,
    getCourtsForSession,
    getMaxWaitlistSize,
    getRecurringConfigForSession,
    getSessionEnrollmentCap,
    getSlotsPerCourt,
    inferSport,
    isRecurringSession,
    parseWaitlistEntry,
} from '../lib/sessions';
import { removeAttendeeWithPromotion, removeWaitlistEntry } from '../lib/bookingActions';
import { buildTimeFields, resolveSessionTimes } from '../lib/dates';
import { notifyWaitlistPromotion } from '../lib/waitlistNotifications';
import { useAuth } from '../contexts/AuthContext';
import { useMemberDirectory } from './useMemberDirectory';
import type { MemberDraft } from '../components/admin/MemberLookupInput';
import type { EditCourtFields } from '../components/admin/modals/EditSessionModal';
import {
    disableBuiltinSchedule,
    removeRecurringSchedule,
    replaceBuiltinRecurringSchedule,
    updateRecurringSchedule,
} from '../lib/recurringSchedules';

import type { CapacityReductionPrompt } from '../components/admin/modals/CapacityReductionModal';

const emptyMemberDraft = (): MemberDraft => ({ name: '' });

interface PendingSessionSave {
    editingSession: Session;
    updateData: Record<string, unknown>;
    preservedAttendees: string[];
    preservedWaitlist: string[];
    newCap: number;
}

const resolveMemberIdentity = (draft: MemberDraft) => {
    const name = draft.name.trim();
    const uid = draft.uid && !draft.uid.startsWith('manual_') ? draft.uid : `manual_${Date.now()}`;
    const email =
        draft.email?.trim() ||
        `${name.toLowerCase().replace(/\s+/g, '')}@manual.club`;
    return { name, uid, email };
};

export interface UseSessionAdminOpsOptions {
    sessionsList: Session[];
    recurringSchedules?: AdminRecurringSchedule[];
    disabledBuiltinSchedules?: string[];
}

export function useSessionAdminOps({
    sessionsList,
    recurringSchedules = [],
    disabledBuiltinSchedules = [],
}: UseSessionAdminOpsOptions) {
    const { user } = useAuth();
    const members = useMemberDirectory(sessionsList);

    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [editCourtFields, setEditCourtFields] = useState<EditCourtFields>({
        courtCount: 2,
        courtStartNumber: 1,
        customCourtLabels: '',
    });
    const [memberDrafts, setMemberDrafts] = useState<Record<string, MemberDraft>>({});
    const [newAttendeeCourt, setNewAttendeeCourt] = useState<Record<string, string>>({});
    const [coachDraft, setCoachDraft] = useState<Record<string, string>>({});
    const [savingCoach, setSavingCoach] = useState<Record<string, boolean>>({});
    const [capacityReductionPrompt, setCapacityReductionPrompt] = useState<CapacityReductionPrompt | null>(null);
    const [pendingSessionSave, setPendingSessionSave] = useState<PendingSessionSave | null>(null);

    const getSessionRoster = (session: Session): string[] => session.attendees || [];

    const sessionRequiresCourtForAdd = (session: Session): boolean => {
        const courts = getCourtsForSession(session, recurringSchedules, disabledBuiltinSchedules);
        if (courts.length === 0) return false;
        const maxPerCourt = getSlotsPerCourt(session, recurringSchedules, disabledBuiltinSchedules);
        const cap = getSessionEnrollmentCap(session, courts, maxPerCourt);
        if (session.type === 'coaching' && cap > courts.length * maxPerCourt) {
            return false;
        }
        return true;
    };

    const openEditSession = (session: Session) => {
        const latest = sessionsList.find((item) => item.id === session.id) ?? session;
        const templateCourts = getCourtsForSession(latest, recurringSchedules, disabledBuiltinSchedules);
        const courts = latest.courts?.length ? latest.courts : templateCourts;
        setEditingSession(latest);
        setEditCourtFields(courtFieldsFromSession(courts.length ? courts : latest.courts));
    };

    const applySessionSave = async (
        sessionToSave: Session,
        updateData: Record<string, unknown>,
        finalAttendees: string[],
        finalWaitlist: string[],
    ) => {
        const usesCourts = sessionToSave.type === 'court' || sessionToSave.type === 'coaching';
        const sport = sessionToSave.sport || inferSport(sessionToSave);
        const slotsPerCourt = getSlotsPerCourtForSport(sport);
        const courts = usesCourts && Array.isArray(updateData.courts) ? (updateData.courts as string[]) : sessionToSave.courts;

        if (isRecurringSession(sessionToSave)) {
            const config = getRecurringConfigForSession(
                sessionToSave,
                recurringSchedules,
                disabledBuiltinSchedules,
            );
            if (!config) {
                window.alert('Could not find the weekly schedule for this session.');
                return;
            }

            const scheduleFields: Omit<AdminRecurringSchedule, 'id' | 'sport' | 'day'> = {
                title: sessionToSave.title,
                sessionType: sessionToSave.type,
                time: String(updateData.time ?? sessionToSave.time),
                courts: courts ?? config.courts,
                maxPerCourt: slotsPerCourt,
                maxAttendees: Number(updateData.maxAttendees ?? sessionToSave.maxAttendees),
                maxWaitlistSize: Number(updateData.maxWaitlistSize ?? sessionToSave.maxWaitlistSize ?? 0),
                ...(sessionToSave.type === 'coaching'
                    ? { coach: sessionToSave.coach || 'TBD' }
                    : {}),
            };

            if (config.scheduleId) {
                await updateRecurringSchedule(config.scheduleId, scheduleFields);
            } else {
                await replaceBuiltinRecurringSchedule(
                    sport as AdminRecurringSchedule['sport'],
                    config,
                    scheduleFields,
                );
            }
        }

        await setDoc(
            doc(db, 'sessions', sessionToSave.id),
            {
                ...updateData,
                attendees: finalAttendees,
                waitlist: finalWaitlist,
            },
            { merge: true },
        );
        setEditingSession(null);
        setCapacityReductionPrompt(null);
        setPendingSessionSave(null);
    };

    const handleSaveSessionEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSession) return;
        try {
            const sessionRef = doc(db, 'sessions', editingSession.id);
            const existingSnap = await getDoc(sessionRef);
            const existingData = existingSnap.exists() ? existingSnap.data() : {};
            const preservedAttendees = Array.isArray(existingData.attendees)
                ? (existingData.attendees as string[])
                : (editingSession.attendees ?? []);
            const preservedWaitlist = Array.isArray(existingData.waitlist)
                ? (existingData.waitlist as string[])
                : (editingSession.waitlist ?? []);

            const usesCourts = editingSession.type === 'court' || editingSession.type === 'coaching';
            const courts = usesCourts
                ? buildCourtLabels(
                      editCourtFields.courtCount,
                      editCourtFields.courtStartNumber,
                      editCourtFields.customCourtLabels,
                  )
                : editingSession.courts;

            const resolvedTimes = resolveSessionTimes(editingSession);
            const timeFields = resolvedTimes
                ? buildTimeFields(resolvedTimes.startTime, resolvedTimes.endTime)
                : buildTimeFields(editingSession.startTime || '18:30', editingSession.endTime);
            const sport = editingSession.sport || inferSport(editingSession);
            const slotsPerCourt = getSlotsPerCourtForSport(sport);
            const updateData: Record<string, unknown> = {
                title: editingSession.title,
                sport: editingSession.sport,
                type: editingSession.type,
                date: editingSession.date,
                ...timeFields,
                maxAttendees: Number(editingSession.maxAttendees),
                maxWaitlistSize: Number(editingSession.maxWaitlistSize ?? 0),
                coach: editingSession.type === 'coaching' ? editingSession.coach || 'TBD' : null,
                coachId: null,
            };

            if (editingSession.weekStartDate) {
                updateData.weekStartDate = editingSession.weekStartDate;
            }

            if (usesCourts && courts && courts.length > 0) {
                updateData.courts = courts;
                updateData.slotsPerCourt = slotsPerCourt;
            } else if (usesCourts) {
                updateData.courts = null;
                updateData.slotsPerCourt = null;
            }

            const capSession: Session = {
                ...editingSession,
                courts: usesCourts && courts && courts.length > 0 ? courts : editingSession.courts,
                maxAttendees: Number(editingSession.maxAttendees),
            };
            const capCourts = getCourtsForSession(capSession, recurringSchedules, disabledBuiltinSchedules);
            const maxPerCourt = getSlotsPerCourt(capSession, recurringSchedules, disabledBuiltinSchedules);
            const newCap = getSessionEnrollmentCap(capSession, capCourts, maxPerCourt);

            if (preservedAttendees.length > newCap) {
                setPendingSessionSave({
                    editingSession,
                    updateData,
                    preservedAttendees,
                    preservedWaitlist,
                    newCap,
                });
                setCapacityReductionPrompt({
                    sessionTitle: editingSession.title,
                    newCap,
                    attendees: preservedAttendees,
                    requiredRemovals: preservedAttendees.length - newCap,
                });
                return;
            }

            await applySessionSave(editingSession, updateData, preservedAttendees, preservedWaitlist);
        } catch (err) {
            console.error('Error saving session edit:', err);
            window.alert('Error updating session.');
        }
    };

    const confirmCapacityReduction = async (attendeesToRemove: string[]) => {
        if (!pendingSessionSave || !capacityReductionPrompt) return;
        const { editingSession: sessionToSave, updateData, preservedAttendees, preservedWaitlist, newCap } =
            pendingSessionSave;

        if (attendeesToRemove.length < capacityReductionPrompt.requiredRemovals) {
            window.alert(
                `Please select at least ${capacityReductionPrompt.requiredRemovals} player(s) to remove.`,
            );
            return;
        }

        const removeSet = new Set(attendeesToRemove);
        const finalAttendees = preservedAttendees.filter((entry) => !removeSet.has(entry));
        if (finalAttendees.length > newCap) {
            window.alert('Too many players would remain enrolled. Remove more players or cancel.');
            return;
        }

        try {
            await applySessionSave(sessionToSave, updateData, finalAttendees, preservedWaitlist);
        } catch (err) {
            console.error('Error saving session edit after capacity reduction:', err);
            window.alert('Error updating session.');
        }
    };

    const cancelCapacityReduction = () => {
        setCapacityReductionPrompt(null);
        setPendingSessionSave(null);
    };

    const handleDeleteSession = async (session: Session) => {
        if (isRecurringSession(session)) {
            const config = getRecurringConfigForSession(
                session,
                recurringSchedules,
                disabledBuiltinSchedules,
            );
            const sport = session.sport || inferSport(session);
            const message = config?.isCustom
                ? `Remove "${session.title}" from the weekly schedule? This stops all future weeks.`
                : `Disable "${session.title}" as a weekly recurring session?`;
            if (!window.confirm(message)) return;

            try {
                if (config?.scheduleId) {
                    await removeRecurringSchedule(config.scheduleId);
                } else if (config) {
                    await disableBuiltinSchedule(
                        sport as AdminRecurringSchedule['sport'],
                        config.day,
                        config.sessionType ?? 'court',
                    );
                }
                try {
                    await deleteDoc(doc(db, 'sessions', session.id));
                } catch {
                    /* instance doc may not exist yet */
                }
            } catch (err) {
                console.error('Error removing recurring schedule:', err);
                window.alert('Error removing weekly schedule.');
            }
            return;
        }

        if (!window.confirm('Are you sure you want to delete this session?')) return;
        try {
            await deleteDoc(doc(db, 'sessions', session.id));
        } catch (err) {
            console.error('Error deleting session:', err);
            window.alert('Error deleting session.');
        }
    };

    const handleAddAttendee = async (session: Session) => {
        const sessionId = session.id;
        const draft = memberDrafts[sessionId] ?? emptyMemberDraft();
        const { name, uid, email } = resolveMemberIdentity(draft);
        if (!name) return;

        const court = newAttendeeCourt[sessionId]?.trim() || '';

        if (sessionRequiresCourtForAdd(session) && !court) {
            window.alert('Please select a court for this session.');
            return;
        }

        if (findUserAttendeeEntry(session.attendees, uid) || findUserWaitlistEntry(session.waitlist, uid)) {
            window.alert(`${name} is already on this session.`);
            return;
        }

        const attendeeString = court ? `${uid}|${name}|${email}|${court}` : `${uid}|${name}|${email}`;

        try {
            await setDoc(
                doc(db, 'sessions', sessionId),
                {
                    title: session.title,
                    sport: session.sport || inferSport(session),
                    type: session.type,
                    date: session.date,
                    time: session.time,
                    maxAttendees: session.maxAttendees,
                    attendees: arrayUnion(attendeeString),
                    ...(session.courts?.length
                        ? { courts: session.courts, slotsPerCourt: getSlotsPerCourt(session) }
                        : {}),
                },
                { merge: true },
            );
            setMemberDrafts((prev) => ({ ...prev, [sessionId]: emptyMemberDraft() }));
            setNewAttendeeCourt((prev) => ({ ...prev, [sessionId]: '' }));
        } catch (err) {
            console.error('Error adding attendee: ', err);
            window.alert('Failed to add attendee.');
        }
    };

    const handleAddToWaitlist = async (session: Session) => {
        const sessionId = session.id;
        const draft = memberDrafts[sessionId] ?? emptyMemberDraft();
        const { name, uid, email } = resolveMemberIdentity(draft);
        if (!name) return;

        const maxWaitlistSize = getMaxWaitlistSize(session);
        if (maxWaitlistSize <= 0) {
            window.alert('Waitlist is disabled for this session.');
            return;
        }

        if ((session.waitlist || []).length >= maxWaitlistSize) {
            window.alert('The waitlist is full.');
            return;
        }

        if (findUserAttendeeEntry(session.attendees, uid) || findUserWaitlistEntry(session.waitlist, uid)) {
            window.alert(`${name} is already on this session.`);
            return;
        }

        const waitlistEntry = formatWaitlistEntry(uid, name, email);

        try {
            await setDoc(
                doc(db, 'sessions', sessionId),
                {
                    title: session.title,
                    sport: session.sport || inferSport(session),
                    type: session.type,
                    date: session.date,
                    time: session.time,
                    maxAttendees: session.maxAttendees,
                    waitlist: arrayUnion(waitlistEntry),
                    ...(session.maxWaitlistSize != null ? { maxWaitlistSize: session.maxWaitlistSize } : {}),
                },
                { merge: true },
            );
            setMemberDrafts((prev) => ({ ...prev, [sessionId]: emptyMemberDraft() }));
        } catch (err) {
            console.error('Error adding to waitlist: ', err);
            window.alert('Failed to add to waitlist.');
        }
    };

    const handleUpdateCoach = async (sessionId: string) => {
        const coachName = coachDraft[sessionId]?.trim();
        setSavingCoach((prev) => ({ ...prev, [sessionId]: true }));
        try {
            await updateDoc(doc(db, 'sessions', sessionId), {
                coach: coachName || 'TBD',
                coachId: null,
            });
        } catch (err) {
            console.error('Error updating coach:', err);
            window.alert('Failed to update coach.');
        } finally {
            setSavingCoach((prev) => ({ ...prev, [sessionId]: false }));
        }
    };

    const handleRemoveAttendee = async (session: Session, attendeeStr: string) => {
        const parts = attendeeStr.split('|');
        const name = parts[1] || 'Player';
        if (!window.confirm(`Are you sure you want to remove ${name} from this session?`)) return;
        try {
            const result = await removeAttendeeWithPromotion(session, attendeeStr);
            if (result.promoted && result.promotedUid) {
                const courtNote = result.promotedCourt ? ` on ${result.promotedCourt}` : '';
                window.alert(`${result.promotedName} was promoted from the waitlist${courtNote}.`);
                try {
                    await notifyWaitlistPromotion({
                        promotedUid: result.promotedUid,
                        promotedName: result.promotedName || 'Member',
                        promotedCourt: result.promotedCourt,
                        sessionId: session.id,
                        sessionTitle: session.title,
                        sessionDate: session.date,
                        actorUid: user?.uid,
                    });
                } catch (notifyErr) {
                    console.warn('Could not write waitlist promotion notification:', notifyErr);
                }
            }
        } catch (err) {
            console.error('Error removing attendee: ', err);
            window.alert('Failed to remove attendee.');
        }
    };

    const handleRemoveWaitlistEntry = async (sessionId: string, waitlistEntry: string) => {
        const name = parseWaitlistEntry(waitlistEntry).name;
        if (!window.confirm(`Remove ${name} from the waitlist?`)) return;
        try {
            await removeWaitlistEntry(sessionId, waitlistEntry);
        } catch (err) {
            console.error('Error removing waitlist entry: ', err);
            window.alert('Failed to remove waitlist entry.');
        }
    };

    return {
        members,
        editingSession,
        editCourtFields,
        setEditingSession,
        setEditCourtFields,
        memberDrafts,
        coachDraft,
        savingCoach,
        newAttendeeCourt,
        getSessionRoster,
        sessionRequiresCourtForAdd,
        openEditSession,
        handleSaveSessionEdit,
        handleDeleteSession,
        handleAddAttendee,
        handleAddToWaitlist,
        handleUpdateCoach,
        handleRemoveAttendee,
        handleRemoveWaitlistEntry,
        capacityReductionPrompt,
        confirmCapacityReduction,
        cancelCapacityReduction,
        setCoachDraft,
        setMemberDrafts,
        setNewAttendeeCourt,
    };
}

export type SessionAdminOps = ReturnType<typeof useSessionAdminOps>;
