import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { Plus } from 'lucide-react';
import { db } from '../../../lib/firebase';
import {
    ADMIN_MAX_ATTENDEES,
    ADMIN_MAX_WAITLIST,
    DAY_OPTIONS,
    DEFAULT_WAITLIST_PER_COURT,
    SPORTS,
    clampAdminMaxAttendees,
    clampAdminMaxWaitlist,
    getSlotsPerCourtForSport,
    type AdminRecurringSchedule,
    type DayName,
    type Sport,
} from '../../../lib/sports';
import {
    applySessionTypeChange,
    buildCourtLabels,
    getDefaultMaxAttendees,
    suggestedCapacityForCourts,
    type SessionType,
} from '../../../lib/sessions';
import { buildDateFieldsFromIso, buildTimeFields } from '../../../lib/dates';
import { addRecurringSchedule, defaultRecurringTitle } from '../../../lib/recurringSchedules';
import DatePickerField from '../fields/DatePickerField';
import TimeRangePicker from '../fields/TimeRangePicker';
import AdminNumericField from '../fields/AdminNumericField';

export type ScheduleMode = 'one-time' | 'recurring';

export interface ScheduleSessionFormProps {
    /** Prefill sport (e.g. active tab on /courts). */
    initialSport?: Sport | string;
    /** Called after a successful create (modal can close). */
    onCreated?: () => void;
    /** Optional outer wrapper (admin page card vs bare modal body). */
    renderShell?: (content: ReactNode) => ReactNode;
    /** When true, hide the page-style heading (modal already has a title). */
    compact?: boolean;
    formId?: string;
    /** Expose saving state to a parent modal footer if needed. */
    onSavingChange?: (saving: boolean) => void;
}

const defaultDraft = (sport: string) => ({
    title: '',
    sport,
    type: 'court' as SessionType,
    date: '',
    time: '',
    startTime: '18:30',
    endTime: '20:00',
    maxAttendees: getDefaultMaxAttendees('court'),
    maxWaitlistSize: DEFAULT_WAITLIST_PER_COURT * 2,
    coach: '',
    courtCount: 2,
    courtStartNumber: 1,
    customCourtLabels: '',
    recurringDay: 'tuesday' as DayName,
});

/**
 * Shared create form for one-time sessions and weekly recurring schedules.
 * Used on the Operations Deck and in the booking-page Create Session modal.
 */
const ScheduleSessionForm = ({
    initialSport = 'Tennis',
    onCreated,
    renderShell,
    compact = false,
    formId = 'schedule-session-form',
    onSavingChange,
}: ScheduleSessionFormProps) => {
    const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('one-time');
    const [newSession, setNewSession] = useState(() => defaultDraft(initialSport));
    const [sessionDateInput, setSessionDateInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        setNewSession((prev) => ({ ...prev, sport: initialSport }));
    }, [initialSport]);

    useEffect(() => {
        onSavingChange?.(saving);
    }, [saving, onSavingChange]);

    const previewCourtLabels = buildCourtLabels(
        newSession.courtCount,
        newSession.courtStartNumber,
        newSession.customCourtLabels,
    );

    const resetForm = (sport: string) => {
        setNewSession(defaultDraft(sport));
        setScheduleMode('one-time');
        setSessionDateInput('');
    };

    const handleAddSession = async (e: FormEvent) => {
        e.preventDefault();
        if (!newSession.title || !newSession.startTime) {
            setMessage('Please fill in all required fields.');
            return;
        }
        if (scheduleMode === 'one-time' && (!newSession.date || !sessionDateInput)) {
            setMessage('Please pick a date for one-time sessions.');
            return;
        }
        setSaving(true);
        setMessage('');
        try {
            const courts = buildCourtLabels(
                newSession.courtCount,
                newSession.courtStartNumber,
                newSession.customCourtLabels,
            );

            if (scheduleMode === 'recurring') {
                if (courts.length === 0) {
                    setMessage('Please configure at least one court.');
                    return;
                }

                await addRecurringSchedule({
                    sport: newSession.sport as AdminRecurringSchedule['sport'],
                    day: newSession.recurringDay,
                    title: newSession.title,
                    time: newSession.time,
                    sessionType: newSession.type,
                    courts,
                    maxPerCourt: getSlotsPerCourtForSport(newSession.sport),
                    maxAttendees: clampAdminMaxAttendees(Number(newSession.maxAttendees)),
                    coach: newSession.type === 'coaching' ? newSession.coach || 'TBD' : undefined,
                    maxWaitlistSize: clampAdminMaxWaitlist(Number(newSession.maxWaitlistSize)),
                });
                setMessage(
                    newSession.type === 'coaching'
                        ? 'Weekly recurring clinic schedule created!'
                        : 'Weekly recurring open play schedule created!',
                );
            } else {
                const timeFields = buildTimeFields(newSession.startTime, newSession.endTime || undefined);
                const sessionData: Record<string, unknown> = {
                    title: newSession.title,
                    sport: newSession.sport,
                    type: newSession.type,
                    date: newSession.date,
                    ...timeFields,
                    maxAttendees: clampAdminMaxAttendees(Number(newSession.maxAttendees)),
                    attendees: [],
                    coach: newSession.type === 'coaching' ? newSession.coach || 'TBD' : null,
                    coachId: null,
                    weekStartDate: sessionDateInput,
                };

                if (
                    (newSession.type === 'court' || newSession.type === 'coaching') &&
                    courts.length > 0
                ) {
                    const slotsPerCourt = getSlotsPerCourtForSport(newSession.sport);
                    sessionData.courts = courts;
                    sessionData.slotsPerCourt = slotsPerCourt;
                    sessionData.maxWaitlistSize = clampAdminMaxWaitlist(Number(newSession.maxWaitlistSize));
                    sessionData.waitlist = [];
                } else if (newSession.type === 'coaching') {
                    sessionData.maxWaitlistSize = clampAdminMaxWaitlist(Number(newSession.maxWaitlistSize));
                    sessionData.waitlist = [];
                }

                await addDoc(collection(db, 'sessions'), sessionData);
                setMessage('Session scheduled successfully!');
            }

            resetForm(newSession.sport);
            window.setTimeout(() => setMessage(''), 3000);
            onCreated?.();
        } catch (err) {
            console.error('Error creating session:', err);
            setMessage('Error creating session.');
        } finally {
            setSaving(false);
        }
    };

    const form = (
        <>
            {!compact && (
                <>
                    <h3 className="flex items-center gap-2 font-display text-2xl text-gray-900 dark:text-chalk">
                        <Plus className="h-5 w-5 text-court-accent" />
                        Schedule New Session
                    </h3>
                    <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Create a one-time session, or add a weekly recurring open play or coaching clinic schedule.
                    </p>
                </>
            )}

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
                            title: prev.title || defaultRecurringTitle(prev.recurringDay, prev.type),
                        }));
                    }}
                    className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all ${
                        scheduleMode === 'recurring'
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    Weekly recurring session
                </button>
            </div>

            <form id={formId} onSubmit={handleAddSession} className="space-y-4">
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
                            onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Sport</label>
                            <select
                                value={newSession.sport}
                                onChange={(e) => {
                                    const sport = e.target.value;
                                    const courts = buildCourtLabels(
                                        newSession.courtCount,
                                        newSession.courtStartNumber,
                                        newSession.customCourtLabels,
                                    );
                                    setNewSession({
                                        ...newSession,
                                        sport,
                                        maxAttendees:
                                            scheduleMode === 'one-time'
                                                ? suggestedCapacityForCourts(
                                                      courts,
                                                      getSlotsPerCourtForSport(sport),
                                                  )
                                                : newSession.type === 'court'
                                                  ? suggestedCapacityForCourts(
                                                        courts,
                                                        getSlotsPerCourtForSport(sport),
                                                    )
                                                  : newSession.maxAttendees,
                                    });
                                }}
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
                                    const result = applySessionTypeChange(
                                        {
                                            id: 'draft',
                                            title: newSession.title,
                                            type: newSession.type,
                                            date: newSession.date,
                                            time: newSession.time,
                                            maxAttendees: newSession.maxAttendees,
                                            attendees: [],
                                            sport: newSession.sport,
                                            coach: newSession.coach,
                                            maxWaitlistSize: newSession.maxWaitlistSize,
                                        },
                                        type,
                                        {
                                            courtCount: newSession.courtCount,
                                            courtStartNumber: newSession.courtStartNumber,
                                            customCourtLabels: newSession.customCourtLabels,
                                        },
                                    );
                                    setNewSession({
                                        ...newSession,
                                        type: result.session.type,
                                        coach: result.session.coach || '',
                                        maxAttendees: result.session.maxAttendees,
                                        maxWaitlistSize:
                                            result.session.maxWaitlistSize ?? newSession.maxWaitlistSize,
                                        courtCount: result.editCourtFields.courtCount,
                                        courtStartNumber: result.editCourtFields.courtStartNumber,
                                        customCourtLabels: result.editCourtFields.customCourtLabels,
                                        title:
                                            scheduleMode === 'recurring'
                                                ? defaultRecurringTitle(newSession.recurringDay, type)
                                                : newSession.title,
                                    });
                                }}
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
                                        title: defaultRecurringTitle(recurringDay, prev.type),
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
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <DatePickerField
                            label="Pick Date"
                            required
                            value={sessionDateInput}
                            onChange={(iso) => {
                                setSessionDateInput(iso);
                                setNewSession((prev) => ({
                                    ...prev,
                                    date: buildDateFieldsFromIso(iso).date,
                                }));
                            }}
                        />
                        <TimeRangePicker
                            startTime={newSession.startTime}
                            endTime={newSession.endTime}
                            onChange={(fields) =>
                                setNewSession({
                                    ...newSession,
                                    startTime: fields.startTime,
                                    endTime: fields.endTime || '',
                                    time: fields.time,
                                })
                            }
                        />
                    </div>
                )}

                {scheduleMode === 'recurring' && (
                    <TimeRangePicker
                        startTime={newSession.startTime}
                        endTime={newSession.endTime}
                        onChange={(fields) =>
                            setNewSession({
                                ...newSession,
                                startTime: fields.startTime,
                                endTime: fields.endTime || '',
                                time: fields.time,
                            })
                        }
                    />
                )}

                {((scheduleMode === 'one-time' &&
                    (newSession.type === 'court' || newSession.type === 'coaching')) ||
                    scheduleMode === 'recurring') && (
                    <div className="space-y-3 rounded-xl border border-gray-200 bg-white/50 p-4 dark:border-gray-800 dark:bg-court-950/30">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Courts</p>
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
                                                getSlotsPerCourtForSport(newSession.sport),
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
                                <AdminNumericField
                                    min={1}
                                    value={newSession.courtStartNumber}
                                    onChange={(courtStartNumber) => {
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
                                                getSlotsPerCourtForSport(newSession.sport),
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
                                                getSlotsPerCourtForSport(newSession.sport),
                                            ),
                                            maxWaitlistSize: courts.length * DEFAULT_WAITLIST_PER_COURT,
                                        });
                                    }}
                                    className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-gray-500">Preview:</span>
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
                        <AdminNumericField
                            required
                            min={1}
                            max={ADMIN_MAX_ATTENDEES}
                            placeholder="8"
                            value={newSession.maxAttendees}
                            onChange={(maxAttendees) => setNewSession({ ...newSession, maxAttendees })}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                        />
                        <p className="mt-1 text-[10px] text-gray-400">Max {ADMIN_MAX_ATTENDEES} roster spots.</p>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                            Max waitlist size
                        </label>
                        <AdminNumericField
                            required
                            min={0}
                            max={ADMIN_MAX_WAITLIST}
                            placeholder="8"
                            value={newSession.maxWaitlistSize}
                            onChange={(maxWaitlistSize) => setNewSession({ ...newSession, maxWaitlistSize })}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                        />
                        <p className="mt-1 text-[10px] text-gray-400">
                            Max {ADMIN_MAX_WAITLIST} waitlist spots. 0 disables waitlist.
                        </p>
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
                                onChange={(e) => setNewSession({ ...newSession, coach: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                            />
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-between pt-2">
                    <span
                        className={`text-sm ${message.includes('Error') || message.includes('Please') ? 'text-red-500' : 'text-green-600'}`}
                    >
                        {message}
                    </span>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center rounded-lg bg-wimbledon-green px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#004d00] disabled:opacity-50"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {saving
                            ? 'Scheduling...'
                            : scheduleMode === 'recurring'
                              ? 'Create Weekly Schedule'
                              : 'Schedule Session'}
                    </button>
                </div>
            </form>
        </>
    );

    if (renderShell) return <>{renderShell(form)}</>;
    return <>{form}</>;
};

export default ScheduleSessionForm;
