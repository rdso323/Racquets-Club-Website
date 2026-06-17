import { useState, useEffect, useMemo, forwardRef } from 'react';
import {
    doc,
    addDoc,
    collection,
    deleteDoc,
    updateDoc,
    setDoc,
    arrayUnion,
} from 'firebase/firestore';
import { Calendar, Plus } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { SPORTS, SPORT_FILTER_TABS, SLOTS_PER_COURT, DEFAULT_WAITLIST_PER_COURT, DAY_OPTIONS, type AdminRecurringSchedule, type DayName } from '../../../lib/sports';
import {
    type Session,
    type SessionType,
    getActiveCourtAttendees,
    getDefaultMaxAttendees,
    inferSport,
    buildAdminDisplaySessions,
    getCourtsForSession,
    buildCourtLabels,
    suggestedCapacityForCourts,
    courtFieldsFromSession,
    parseWaitlistEntry,
    getMaxWaitlistSize,
} from '../../../lib/sessions';
import { removeAttendeeWithPromotion, removeWaitlistEntry } from '../../../lib/bookingActions';
import { addRecurringSchedule, defaultRecurringTitle } from '../../../lib/recurringSchedules';
import SessionOpsCard from '../cards/SessionOpsCard';
import EditSessionModal, { type EditCourtFields } from '../modals/EditSessionModal';

interface SessionsModuleProps {
    sessionsList: Session[];
    showCreateForm?: boolean;
    sportFilter?: string;
    recurringSchedules?: AdminRecurringSchedule[];
}

type ScheduleMode = 'one-time' | 'recurring';

const formatSelectedDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const [year, month, day] = parts.map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};

const isEditableCustomCourtSession = (session: Session) =>
    session.type === 'court' &&
    !session.id.startsWith('open_play_') &&
    !session.title.toLowerCase().includes('open play');

const SessionsModule = forwardRef<HTMLDivElement, SessionsModuleProps>(
    ({ sessionsList, showCreateForm = true, sportFilter: sportFilterProp = 'All', recurringSchedules = [] }, ref) => {
        const [sessionsSportFilter, setSessionsSportFilter] = useState(sportFilterProp);
        const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('one-time');

        const [newSession, setNewSession] = useState({
            title: '',
            sport: 'Tennis',
            type: 'court' as SessionType,
            date: '',
            time: '',
            maxAttendees: getDefaultMaxAttendees('court'),
            maxWaitlistSize: DEFAULT_WAITLIST_PER_COURT * 2,
            coach: '',
            courtCount: 2,
            courtStartNumber: 1,
            customCourtLabels: '',
            recurringDay: 'tuesday' as DayName,
        });
        const [sessionDateInput, setSessionDateInput] = useState('');
        const [newSessionSaving, setNewSessionSaving] = useState(false);
        const [newSessionMsg, setNewSessionMsg] = useState('');

        const [editingSession, setEditingSession] = useState<Session | null>(null);
        const [editCourtFields, setEditCourtFields] = useState<EditCourtFields>({
            courtCount: 2,
            courtStartNumber: 1,
            customCourtLabels: '',
        });

        const [newAttendeeName, setNewAttendeeName] = useState<Record<string, string>>({});
        const [newAttendeeCourt, setNewAttendeeCourt] = useState<Record<string, string>>({});
        const [coachDraft, setCoachDraft] = useState<Record<string, string>>({});
        const [savingCoach, setSavingCoach] = useState<Record<string, boolean>>({});

        useEffect(() => {
            setSessionsSportFilter(sportFilterProp);
        }, [sportFilterProp]);

        useEffect(() => {
            if (sessionsSportFilter !== 'All') {
                setNewSession((prev) => ({ ...prev, sport: sessionsSportFilter }));
            }
        }, [sessionsSportFilter]);

        const adminDisplaySessions = useMemo(() => {
            const sportFilter = sessionsSportFilter === 'All' ? null : sessionsSportFilter;
            return buildAdminDisplaySessions(sessionsList, sportFilter, recurringSchedules);
        }, [sessionsList, sessionsSportFilter, recurringSchedules]);

        const previewCourtLabels = buildCourtLabels(
            newSession.courtCount,
            newSession.courtStartNumber,
            newSession.customCourtLabels,
        );

        const getSessionRoster = (session: Session): string[] => {
            const courts = getCourtsForSession(session, recurringSchedules);
            if (courts.length > 0) {
                return getActiveCourtAttendees(session.attendees || [], courts);
            }
            return session.attendees || [];
        };

        const openEditSession = (session: Session) => {
            setEditingSession(session);
            setEditCourtFields(courtFieldsFromSession(session.courts));
        };

        const handleAddSession = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!newSession.title || !newSession.time) {
                setNewSessionMsg('Please fill in all required fields.');
                return;
            }
            if (scheduleMode === 'one-time' && (!newSession.date || !sessionDateInput)) {
                setNewSessionMsg('Please pick a date for one-time sessions.');
                return;
            }
            setNewSessionSaving(true);
            setNewSessionMsg('');
            try {
                const courts =
                    newSession.type === 'court'
                        ? buildCourtLabels(
                              newSession.courtCount,
                              newSession.courtStartNumber,
                              newSession.customCourtLabels,
                          )
                        : [];

                if (scheduleMode === 'recurring') {
                    if (newSession.type !== 'court') {
                        setNewSessionMsg('Weekly recurring schedules are only available for court open play.');
                        return;
                    }
                    if (courts.length === 0) {
                        setNewSessionMsg('Please configure at least one court.');
                        return;
                    }

                    await addRecurringSchedule({
                        sport: newSession.sport as AdminRecurringSchedule['sport'],
                        day: newSession.recurringDay,
                        title: newSession.title,
                        time: newSession.time,
                        courts,
                        maxPerCourt: SLOTS_PER_COURT,
                        maxWaitlistSize: Number(newSession.maxWaitlistSize),
                    });
                    setNewSessionMsg('Weekly recurring court schedule created!');
                } else {
                    const sessionData: Record<string, unknown> = {
                        title: newSession.title,
                        sport: newSession.sport,
                        type: newSession.type,
                        date: newSession.date,
                        time: newSession.time,
                        maxAttendees: Number(newSession.maxAttendees),
                        attendees: [],
                        coach: newSession.type === 'coaching' ? newSession.coach || 'TBD' : null,
                        coachId: null,
                        weekStartDate: sessionDateInput,
                    };

                    if (newSession.type === 'court' && courts.length > 0) {
                        sessionData.courts = courts;
                        sessionData.slotsPerCourt = SLOTS_PER_COURT;
                        sessionData.maxWaitlistSize = Number(newSession.maxWaitlistSize);
                        sessionData.waitlist = [];
                    } else if (newSession.type === 'coaching') {
                        sessionData.maxWaitlistSize = Number(newSession.maxWaitlistSize);
                        sessionData.waitlist = [];
                    }

                    await addDoc(collection(db, 'sessions'), sessionData);
                    setNewSessionMsg('Session scheduled successfully!');
                }

                setNewSession({
                    title: '',
                    sport: sessionsSportFilter !== 'All' ? sessionsSportFilter : 'Tennis',
                    type: 'court',
                    date: '',
                    time: '',
                    maxAttendees: getDefaultMaxAttendees('court'),
                    coach: '',
                    courtCount: 2,
                    courtStartNumber: 1,
                    customCourtLabels: '',
                    maxWaitlistSize: DEFAULT_WAITLIST_PER_COURT * 2,
                    recurringDay: 'tuesday',
                });
                setScheduleMode('one-time');
                setSessionDateInput('');
                window.setTimeout(() => setNewSessionMsg(''), 3000);
            } catch (err) {
                console.error('Error creating session:', err);
                setNewSessionMsg('Error creating session.');
            } finally {
                setNewSessionSaving(false);
            }
        };

        const handleSaveSessionEdit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!editingSession) return;
            try {
                const courts =
                    editingSession.type === 'court' && isEditableCustomCourtSession(editingSession)
                        ? buildCourtLabels(
                              editCourtFields.courtCount,
                              editCourtFields.courtStartNumber,
                              editCourtFields.customCourtLabels,
                          )
                        : editingSession.courts;

                const updateData: Record<string, unknown> = {
                    title: editingSession.title,
                    sport: editingSession.sport,
                    type: editingSession.type,
                    date: editingSession.date,
                    time: editingSession.time,
                    maxAttendees: Number(editingSession.maxAttendees),
                    maxWaitlistSize: Number(editingSession.maxWaitlistSize ?? 0),
                    coach: editingSession.type === 'coaching' ? editingSession.coach || 'TBD' : null,
                };

                if (editingSession.type === 'court') {
                    if (isEditableCustomCourtSession(editingSession) && courts && courts.length > 0) {
                        updateData.courts = courts;
                        updateData.slotsPerCourt = SLOTS_PER_COURT;
                    }
                } else {
                    updateData.courts = null;
                    updateData.slotsPerCourt = null;
                }

                await updateDoc(doc(db, 'sessions', editingSession.id), updateData);
                setEditingSession(null);
            } catch (err) {
                console.error('Error saving session edit:', err);
                window.alert('Error updating session.');
            }
        };

        const handleDeleteSession = async (id: string) => {
            if (!window.confirm('Are you sure you want to delete this session?')) return;
            try {
                await deleteDoc(doc(db, 'sessions', id));
            } catch (err) {
                console.error('Error deleting session:', err);
                window.alert('Error deleting session.');
            }
        };

        const handleAddAttendee = async (session: Session) => {
            const sessionId = session.id;
            const name = newAttendeeName[sessionId]?.trim();
            if (!name) return;

            const availableCourts = getCourtsForSession(session, recurringSchedules);
            const court = newAttendeeCourt[sessionId]?.trim() || '';

            if (availableCourts.length > 0 && !court) {
                window.alert('Please select a court for this open play session.');
                return;
            }

            const uid = `manual_${Date.now()}`;
            const email = `${name.toLowerCase().replace(/\s+/g, '')}@manual.club`;
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
                            ? { courts: session.courts, slotsPerCourt: session.slotsPerCourt ?? SLOTS_PER_COURT }
                            : {}),
                    },
                    { merge: true },
                );
                setNewAttendeeName((prev) => ({ ...prev, [sessionId]: '' }));
                setNewAttendeeCourt((prev) => ({ ...prev, [sessionId]: '' }));
            } catch (err) {
                console.error('Error adding attendee: ', err);
                window.alert('Failed to add attendee.');
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
                if (result.promoted) {
                    const courtNote = result.promotedCourt ? ` on ${result.promotedCourt}` : '';
                    window.alert(`${result.promotedName} was promoted from the waitlist${courtNote}.`);
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

        return (
            <div className="animate-fadeIn space-y-8">
                <div>
                    <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800 sm:flex-row sm:items-center">
                        <div>
                            <h2 className="font-display text-2xl text-gray-900 dark:text-chalk">
                                Live Scheduled Sessions
                            </h2>
                            <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                                Add attendees, edit capacities or remove sessions live on the website.
                            </p>
                        </div>

                        <div className="flex overflow-x-auto rounded-full border border-gray-200 bg-gray-105 p-1 dark:border-gray-800 dark:bg-court-950">
                            {SPORT_FILTER_TABS.map((sport) => (
                                <button
                                    key={sport}
                                    type="button"
                                    onClick={() => setSessionsSportFilter(sport)}
                                    className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                                        sessionsSportFilter === sport
                                            ? 'bg-white font-extrabold text-wimbledon-navy shadow-sm dark:bg-carbon dark:text-court-accent'
                                            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    {sport}
                                </button>
                            ))}
                        </div>
                    </div>

                    {adminDisplaySessions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-gray-400 dark:border-gray-800 dark:text-gray-500">
                            <Calendar className="mx-auto mb-2 h-8 w-8 opacity-50" />
                            <p className="text-sm">No scheduled sessions in Firestore database.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            {adminDisplaySessions.map((session) => {
                                const rosterAttendees = getSessionRoster(session);
                                const coachValue = coachDraft[session.id] ?? session.coach ?? '';

                                return (
                                    <SessionOpsCard
                                        key={session.id}
                                        session={session}
                                        recurringSchedules={recurringSchedules}
                                        rosterAttendees={rosterAttendees}
                                        coachValue={coachValue}
                                        newAttendeeName={newAttendeeName[session.id] || ''}
                                        newAttendeeCourt={newAttendeeCourt[session.id] || ''}
                                        savingCoach={!!savingCoach[session.id]}
                                        onCoachDraftChange={(value) =>
                                            setCoachDraft((prev) => ({ ...prev, [session.id]: value }))
                                        }
                                        onUpdateCoach={() => handleUpdateCoach(session.id)}
                                        onNewAttendeeNameChange={(value) =>
                                            setNewAttendeeName((prev) => ({ ...prev, [session.id]: value }))
                                        }
                                        onNewAttendeeCourtChange={(value) =>
                                            setNewAttendeeCourt((prev) => ({ ...prev, [session.id]: value }))
                                        }
                                        onAddAttendee={() => handleAddAttendee(session)}
                                        onRemoveAttendee={(attendeeStr) =>
                                            handleRemoveAttendee(session, attendeeStr)
                                        }
                                        onRemoveWaitlistEntry={(waitlistEntry) =>
                                            handleRemoveWaitlistEntry(session.id, waitlistEntry)
                                        }
                                        waitlist={session.waitlist || []}
                                        maxWaitlistSize={getMaxWaitlistSize(session)}
                                        onEdit={() => openEditSession(session)}
                                        onDelete={() => handleDeleteSession(session.id)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {showCreateForm && (
                    <>
                        <hr className="border-gray-150 dark:border-gray-800" />

                        <div
                            ref={ref}
                            className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-55/20 p-6 dark:border-gray-800 dark:bg-court-950/20"
                        >
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-court-accent" />
                            <h3 className="flex items-center gap-2 font-display text-2xl text-gray-900 dark:text-chalk">
                                <Plus className="h-5 w-5 text-court-accent" />
                                Schedule New Session
                            </h3>
                            <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Create a one-time clinic or court booking, or add a weekly recurring open play schedule.
                            </p>

                            <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-white/60 p-1 dark:border-gray-800 dark:bg-court-950/40">
                                <button
                                    type="button"
                                    onClick={() => setScheduleMode('one-time')}
                                    className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                                        scheduleMode === 'one-time'
                                            ? 'bg-wimbledon-green text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    One-time session
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setScheduleMode('recurring');
                                        setNewSession((prev) => ({
                                            ...prev,
                                            type: 'court',
                                            title: prev.title || defaultRecurringTitle(prev.recurringDay),
                                        }));
                                    }}
                                    className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                                        scheduleMode === 'recurring'
                                            ? 'bg-violet-600 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                                    }`}
                                >
                                    Weekly recurring court
                                </button>
                            </div>

                            <form onSubmit={handleAddSession} className="space-y-4">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                            Session Title
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. Intermediate Backhand Clinic"
                                            value={newSession.title}
                                            onChange={(e) =>
                                                setNewSession({ ...newSession, title: e.target.value })
                                            }
                                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Sport
                                            </label>
                                            <select
                                                value={newSession.sport}
                                                onChange={(e) =>
                                                    setNewSession({ ...newSession, sport: e.target.value })
                                                }
                                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                            >
                                                {SPORTS.map((sport) => (
                                                    <option key={sport} value={sport}>
                                                        {sport}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Session Type
                                            </label>
                                            <select
                                                value={newSession.type}
                                                onChange={(e) => {
                                                    const type = e.target.value as SessionType;
                                                    if (scheduleMode === 'recurring' && type !== 'court') return;
                                                    const courts =
                                                        type === 'court'
                                                            ? buildCourtLabels(
                                                                  newSession.courtCount,
                                                                  newSession.courtStartNumber,
                                                                  newSession.customCourtLabels,
                                                              )
                                                            : [];
                                                    setNewSession({
                                                        ...newSession,
                                                        type,
                                                        maxAttendees:
                                                            type === 'court'
                                                                ? suggestedCapacityForCourts(courts, SLOTS_PER_COURT)
                                                                : getDefaultMaxAttendees('coaching'),
                                                    });
                                                }}
                                                disabled={scheduleMode === 'recurring'}
                                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent disabled:opacity-60 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                            >
                                                <option value="court">Court Open Play</option>
                                                <option value="coaching">Clinic / Coaching</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {scheduleMode === 'recurring' ? (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Repeats every
                                            </label>
                                            <select
                                                value={newSession.recurringDay}
                                                onChange={(e) => {
                                                    const recurringDay = e.target.value as DayName;
                                                    setNewSession((prev) => ({
                                                        ...prev,
                                                        recurringDay,
                                                        title: defaultRecurringTitle(recurringDay),
                                                    }));
                                                }}
                                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                            >
                                                {DAY_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Schedule note
                                            </label>
                                            <input
                                                type="text"
                                                readOnly
                                                value={`Runs every week on ${DAY_OPTIONS.find((d) => d.value === newSession.recurringDay)?.label ?? 'weekday'}`}
                                                className="w-full cursor-default rounded-lg border border-violet-200 bg-violet-50 p-2.5 text-sm text-violet-800 outline-none dark:border-violet-900/30 dark:bg-violet-950/20 dark:text-violet-200"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Pick Date
                                            </label>
                                            <input
                                                type="date"
                                                required
                                                value={sessionDateInput}
                                                onChange={(e) => {
                                                    setSessionDateInput(e.target.value);
                                                    setNewSession((prev) => ({
                                                        ...prev,
                                                        date: formatSelectedDate(e.target.value),
                                                    }));
                                                }}
                                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-500 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-gray-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Formatted Date (Read-only)
                                            </label>
                                            <input
                                                type="text"
                                                readOnly
                                                placeholder="e.g. Tuesday, Jun 9"
                                                value={newSession.date}
                                                className="w-full cursor-default rounded-lg border border-gray-200 bg-gray-50 p-2.5 text-sm text-gray-500 outline-none dark:border-gray-800 dark:bg-black/20 dark:text-gray-400"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Time Slot (Text input)
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. 9:00 PM - 11:00 PM"
                                                value={newSession.time}
                                                onChange={(e) =>
                                                    setNewSession({ ...newSession, time: e.target.value })
                                                }
                                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                            />
                                        </div>
                                    </div>
                                )}

                                {scheduleMode === 'recurring' && (
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                            Time Slot (Text input)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="e.g. 9:00 PM - 11:00 PM"
                                            value={newSession.time}
                                            onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
                                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                        />
                                    </div>
                                )}
                                {newSession.type === 'court' && (
                                    <div className="space-y-3 rounded-xl border border-gray-200 bg-white/50 p-4 dark:border-gray-800 dark:bg-court-950/30">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                            Courts
                                        </p>
                                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                            <div>
                                                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                    Number of courts
                                                </label>
                                                <select
                                                    value={newSession.courtCount}
                                                    onChange={(e) => {
                                                        const courtCount = Number(e.target.value);
                                                        const courts = buildCourtLabels(
                                                            courtCount,
                                                            newSession.courtStartNumber,
                                                            newSession.customCourtLabels,
                                                        );
                                                        setNewSession({
                                                            ...newSession,
                                                            courtCount,
                                                            maxAttendees: suggestedCapacityForCourts(
                                                                courts,
                                                                SLOTS_PER_COURT,
                                                            ),
                                                            maxWaitlistSize: courts.length * DEFAULT_WAITLIST_PER_COURT,
                                                        });
                                                    }}
                                                    disabled={!!newSession.customCourtLabels.trim()}
                                                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent disabled:opacity-50 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                                >
                                                    {[1, 2, 3, 4, 5].map((n) => (
                                                        <option key={n} value={n}>
                                                            {n}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                    Starting court #
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={newSession.courtStartNumber}
                                                    onChange={(e) => {
                                                        const courtStartNumber = Number(e.target.value) || 1;
                                                        const courts = buildCourtLabels(
                                                            newSession.courtCount,
                                                            courtStartNumber,
                                                            newSession.customCourtLabels,
                                                        );
                                                        setNewSession({
                                                            ...newSession,
                                                            courtStartNumber,
                                                            maxAttendees: suggestedCapacityForCourts(
                                                                courts,
                                                                SLOTS_PER_COURT,
                                                            ),
                                                            maxWaitlistSize: courts.length * DEFAULT_WAITLIST_PER_COURT,
                                                        });
                                                    }}
                                                    disabled={!!newSession.customCourtLabels.trim()}
                                                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent disabled:opacity-50 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                    Custom labels (optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Court 2, Court 4"
                                                    value={newSession.customCourtLabels}
                                                    onChange={(e) => {
                                                        const customCourtLabels = e.target.value;
                                                        const courts = buildCourtLabels(
                                                            newSession.courtCount,
                                                            newSession.courtStartNumber,
                                                            customCourtLabels,
                                                        );
                                                        setNewSession({
                                                            ...newSession,
                                                            customCourtLabels,
                                                            maxAttendees: suggestedCapacityForCourts(
                                                                courts,
                                                                SLOTS_PER_COURT,
                                                            ),
                                                            maxWaitlistSize: courts.length * DEFAULT_WAITLIST_PER_COURT,
                                                        });
                                                    }}
                                                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-xs font-semibold uppercase text-gray-500">
                                                Preview:
                                            </span>
                                            {previewCourtLabels.map((court) => (
                                                <span
                                                    key={court}
                                                    className="rounded-full border border-wimbledon-navy/20 bg-wimbledon-navy/10 px-2.5 py-1 text-xs font-bold text-wimbledon-navy dark:bg-court-accent/10 dark:text-court-accent"
                                                >
                                                    {court}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                            Max capacity (Max Attendees)
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min={1}
                                            placeholder="8"
                                            value={newSession.maxAttendees}
                                            onChange={(e) =>
                                                setNewSession({
                                                    ...newSession,
                                                    maxAttendees: Number(e.target.value),
                                                })
                                            }
                                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                            Max waitlist size
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min={0}
                                            placeholder="8"
                                            value={newSession.maxWaitlistSize}
                                            onChange={(e) =>
                                                setNewSession({
                                                    ...newSession,
                                                    maxWaitlistSize: Number(e.target.value),
                                                })
                                            }
                                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                        />
                                        <p className="mt-1 text-[10px] text-gray-400">0 disables waitlist. Default is 4 per court.</p>
                                    </div>
                                    {newSession.type === 'coaching' && (
                                        <div>
                                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                                Coach Name
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Coach's Full Name"
                                                value={newSession.coach}
                                                onChange={(e) =>
                                                    setNewSession({ ...newSession, coach: e.target.value })
                                                }
                                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <span
                                        className={`text-sm ${newSessionMsg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}
                                    >
                                        {newSessionMsg}
                                    </span>
                                    <button
                                        type="submit"
                                        disabled={newSessionSaving}
                                        className="flex items-center rounded-lg bg-wimbledon-green px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#004d00] disabled:opacity-50"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        {newSessionSaving
                                            ? 'Scheduling...'
                                            : scheduleMode === 'recurring'
                                              ? 'Create Weekly Schedule'
                                              : 'Schedule Session'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                )}

                {editingSession && (
                    <EditSessionModal
                        session={editingSession}
                        editCourtFields={editCourtFields}
                        onSessionChange={setEditingSession}
                        onEditCourtFieldsChange={setEditCourtFields}
                        onClose={() => setEditingSession(null)}
                        onSubmit={handleSaveSessionEdit}
                        isEditableCustomCourtSession={isEditableCustomCourtSession}
                    />
                )}
            </div>
        );
    },
);

SessionsModule.displayName = 'SessionsModule';

export default SessionsModule;
