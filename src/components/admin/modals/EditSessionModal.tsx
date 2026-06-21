import { SPORTS, getSlotsPerCourtForSport, DEFAULT_WAITLIST_PER_COURT, type OpenPlayDayConfig } from '../../../lib/sports';
import { buildDateFieldsFromIso, resolveSessionDateISO } from '../../../lib/dates';
import DatePickerField from '../fields/DatePickerField';
import TimeRangePicker from '../fields/TimeRangePicker';
import AdminNumericField from '../fields/AdminNumericField';
import AdminModalShell from '../AdminModalShell';
import { formatRecurringDayLabel } from '../../../lib/recurringSchedules';
import {
    type Session,
    type SessionType,
    applySessionTypeChange,
    buildCourtLabels,
    suggestedCapacityForCourts,
    isRecurringSession,
} from '../../../lib/sessions';

export interface EditCourtFields {
    courtCount: number;
    courtStartNumber: number;
    customCourtLabels: string;
}

interface EditSessionModalProps {
    session: Session;
    editCourtFields: EditCourtFields;
    recurringConfig?: OpenPlayDayConfig | null;
    onSessionChange: (session: Session) => void;
    onEditCourtFieldsChange: (fields: EditCourtFields) => void;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

const EditSessionModal = ({
    session,
    editCourtFields,
    recurringConfig = null,
    onSessionChange,
    onEditCourtFieldsChange,
    onClose,
    onSubmit,
}: EditSessionModalProps) => {
    const isRecurring = isRecurringSession(session);
    const isOneTime = !isRecurring;
    const showCourtFields = session.type === 'court' || session.type === 'coaching';
    const dateISO = session.weekStartDate || resolveSessionDateISO(session) || '';

    const updateCourtsCapacity = (fields: EditCourtFields) => {
        const courts = buildCourtLabels(fields.courtCount, fields.courtStartNumber, fields.customCourtLabels);
        onSessionChange({
            ...session,
            maxWaitlistSize: courts.length * DEFAULT_WAITLIST_PER_COURT,
        });
    };

    return (
        <AdminModalShell title="Edit Session Details" onClose={onClose} onSubmit={onSubmit}>
            <div>
                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Session Title</label>
                <input
                    type="text"
                    required
                    value={session.title}
                    onChange={(e) => onSessionChange({ ...session, title: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Sport</label>
                    <select
                        value={session.sport}
                        onChange={(e) => {
                            const sport = e.target.value;
                            const courts = buildCourtLabels(
                                editCourtFields.courtCount,
                                editCourtFields.courtStartNumber,
                                editCourtFields.customCourtLabels,
                            );
                            onSessionChange({
                                ...session,
                                sport,
                                maxAttendees: showCourtFields
                                    ? suggestedCapacityForCourts(courts, getSlotsPerCourtForSport(sport))
                                    : session.maxAttendees,
                            });
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                    >
                        {SPORTS.map((sport) => (
                            <option key={sport} value={sport}>
                                {sport}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Type</label>
                    <select
                        value={session.type}
                        onChange={(e) => {
                            const newType = e.target.value as SessionType;
                            const result = applySessionTypeChange(session, newType, editCourtFields);
                            onEditCourtFieldsChange(result.editCourtFields);
                            onSessionChange(result.session);
                        }}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                    >
                        <option value="court">Open Play / Court</option>
                        <option value="coaching">Clinic / Coaching</option>
                    </select>
                </div>
            </div>

            {isRecurring && recurringConfig ? (
                <>
                    <div className="rounded-xl border border-violet-200 bg-violet-50/80 p-3 dark:border-violet-900/40 dark:bg-violet-950/25">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                            Weekly recurring session
                        </p>
                        <p className="mt-1 text-sm font-medium text-violet-900 dark:text-violet-100">
                            Every {formatRecurringDayLabel(recurringConfig.day)}
                        </p>
                        <p className="mt-1 text-xs text-violet-700/80 dark:text-violet-300/80">
                            Date shifts each week automatically. Edit the weekly time and courts below.
                        </p>
                    </div>
                    <TimeRangePicker
                        startTime={session.startTime}
                        endTime={session.endTime}
                        legacyTime={session.time}
                        onChange={(fields) =>
                            onSessionChange({
                                ...session,
                                startTime: fields.startTime,
                                endTime: fields.endTime,
                                time: fields.time,
                            })
                        }
                    />
                </>
            ) : isOneTime ? (
                <>
                    <DatePickerField
                        label="Session Date"
                        required
                        value={dateISO}
                        onChange={(iso) => {
                            const dateFields = buildDateFieldsFromIso(iso);
                            onSessionChange({
                                ...session,
                                weekStartDate: iso,
                                date: dateFields.date,
                            });
                        }}
                    />
                    <TimeRangePicker
                        startTime={session.startTime}
                        endTime={session.endTime}
                        legacyTime={session.time}
                        onChange={(fields) =>
                            onSessionChange({
                                ...session,
                                startTime: fields.startTime,
                                endTime: fields.endTime,
                                time: fields.time,
                            })
                        }
                    />
                </>
            ) : null}

            {showCourtFields && (
                <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-court-950/30">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Courts</p>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                    Number of courts
                                </label>
                                <select
                                    value={editCourtFields.courtCount}
                                    onChange={(e) => {
                                        const courtCount = Number(e.target.value);
                                        const fields = { ...editCourtFields, courtCount };
                                        onEditCourtFieldsChange(fields);
                                        updateCourtsCapacity(fields);
                                    }}
                                    disabled={!!editCourtFields.customCourtLabels.trim()}
                                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
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
                                    value={editCourtFields.courtStartNumber}
                                    onChange={(courtStartNumber) => {
                                        onEditCourtFieldsChange({ ...editCourtFields, courtStartNumber });
                                    }}
                                    className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                Custom labels (optional)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Court 2, Court 4"
                                value={editCourtFields.customCourtLabels}
                                onChange={(e) => {
                                    const customCourtLabels = e.target.value;
                                    onEditCourtFieldsChange({ ...editCourtFields, customCourtLabels });
                                }}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold uppercase text-gray-500">Preview:</span>
                            {buildCourtLabels(
                                editCourtFields.courtCount,
                                editCourtFields.courtStartNumber,
                                editCourtFields.customCourtLabels,
                            ).map((court) => (
                                <span
                                    key={court}
                                    className="rounded-full bg-wimbledon-navy/10 px-2 py-0.5 text-xs font-bold text-wimbledon-navy dark:text-court-accent"
                                >
                                    {court}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Max Capacity</label>
                    <AdminNumericField
                        required
                        min={1}
                        value={session.maxAttendees}
                        onChange={(maxAttendees) => onSessionChange({ ...session, maxAttendees })}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Max Waitlist</label>
                    <AdminNumericField
                        required
                        min={0}
                        value={session.maxWaitlistSize ?? 0}
                        onChange={(maxWaitlistSize) => onSessionChange({ ...session, maxWaitlistSize })}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                    />
                </div>
                {session.type === 'coaching' && (
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Coach Name</label>
                        <input
                            type="text"
                            value={session.coach || ''}
                            onChange={(e) => onSessionChange({ ...session, coach: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                            placeholder="Coach Name"
                        />
                    </div>
                )}
            </div>
        </AdminModalShell>
    );
};

export default EditSessionModal;
