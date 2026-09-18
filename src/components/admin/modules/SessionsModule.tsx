import { useState, useEffect, useMemo, forwardRef } from 'react';
import { Calendar } from 'lucide-react';
import { SPORT_FILTER_TABS, type AdminRecurringSchedule } from '../../../lib/sports';
import {
    type Session,
    buildAdminDisplaySessions,
    isRecurringSession,
    getRecurringConfigForSession,
    getMaxWaitlistSize,
} from '../../../lib/sessions';
import { useSessionAdminOps } from '../../../hooks/useSessionAdminOps';
import SessionOpsCard from '../cards/SessionOpsCard';
import EditSessionModal from '../modals/EditSessionModal';
import CapacityReductionModal from '../modals/CapacityReductionModal';
import ScheduleSessionForm from '../modals/ScheduleSessionForm';

interface SessionsModuleProps {
    sessionsList: Session[];
    showCreateForm?: boolean;
    sportFilter?: string;
    recurringSchedules?: AdminRecurringSchedule[];
    disabledBuiltinSchedules?: string[];
}

const emptyMemberDraft = () => ({ name: '' });

const SessionsModule = forwardRef<HTMLDivElement, SessionsModuleProps>(
    ({ sessionsList, showCreateForm = true, sportFilter: sportFilterProp = 'Tennis', recurringSchedules = [], disabledBuiltinSchedules = [] }, ref) => {
        const adminOps = useSessionAdminOps({ sessionsList, recurringSchedules, disabledBuiltinSchedules });
        const {
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
            handleCancelThisWeek,
            handleRestoreThisWeek,
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
        } = adminOps;
        const [sessionsSportFilter, setSessionsSportFilter] = useState(sportFilterProp);

        useEffect(() => {
            setSessionsSportFilter(sportFilterProp);
        }, [sportFilterProp]);

        const adminDisplaySessions = useMemo(() => {
            return buildAdminDisplaySessions(sessionsList, sessionsSportFilter, recurringSchedules, disabledBuiltinSchedules);
        }, [sessionsList, sessionsSportFilter, recurringSchedules, disabledBuiltinSchedules]);

        return (
            <div className="animate-fadeIn space-y-8">
                {showCreateForm && (
                    <>
                        <div
                            ref={ref}
                            className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-55/20 p-6 dark:border-gray-800 dark:bg-court-950/20"
                        >
                            <div className="absolute left-0 top-0 h-full w-1.5 bg-court-accent" />
                            <ScheduleSessionForm initialSport={sessionsSportFilter} />
                        </div>

                        <hr className="border-gray-150 dark:border-gray-800" />
                    </>
                )}

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
                                        disabledBuiltinSchedules={disabledBuiltinSchedules}
                                        rosterAttendees={rosterAttendees}
                                        coachValue={coachValue}
                                        memberDraft={memberDrafts[session.id] ?? emptyMemberDraft()}
                                        members={members}
                                        newAttendeeCourt={newAttendeeCourt[session.id] || ''}
                                        savingCoach={!!savingCoach[session.id]}
                                        onCoachDraftChange={(value) =>
                                            setCoachDraft((prev) => ({ ...prev, [session.id]: value }))
                                        }
                                        onUpdateCoach={() => handleUpdateCoach(session)}
                                        onMemberDraftChange={(draft) =>
                                            setMemberDrafts((prev) => ({ ...prev, [session.id]: draft }))
                                        }
                                        onNewAttendeeCourtChange={(value) =>
                                            setNewAttendeeCourt((prev) => ({ ...prev, [session.id]: value }))
                                        }
                                        onAddAttendee={() => handleAddAttendee(session)}
                                        onAddToWaitlist={() => handleAddToWaitlist(session)}
                                        onRemoveAttendee={(attendeeStr) =>
                                            handleRemoveAttendee(session, attendeeStr)
                                        }
                                        onRemoveWaitlistEntry={(waitlistEntry) =>
                                            handleRemoveWaitlistEntry(session.id, waitlistEntry)
                                        }
                                        waitlist={session.waitlist || []}
                                        maxWaitlistSize={getMaxWaitlistSize(session)}
                                        requiresCourtForAdd={sessionRequiresCourtForAdd(session)}
                                        onEdit={() => openEditSession(session)}
                                        onCancelThisWeek={() => handleCancelThisWeek(session)}
                                        onRestoreThisWeek={() => handleRestoreThisWeek(session)}
                                        onDelete={() => handleDeleteSession(session)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>

                {editingSession && (
                    <EditSessionModal
                        session={editingSession}
                        editCourtFields={editCourtFields}
                        recurringConfig={
                            isRecurringSession(editingSession)
                                ? getRecurringConfigForSession(
                                      editingSession,
                                      recurringSchedules,
                                      disabledBuiltinSchedules,
                                  )
                                : null
                        }
                        onSessionChange={setEditingSession}
                        onEditCourtFieldsChange={setEditCourtFields}
                        onClose={() => setEditingSession(null)}
                        onSubmit={handleSaveSessionEdit}
                    />
                )}

                {capacityReductionPrompt && (
                    <CapacityReductionModal
                        prompt={capacityReductionPrompt}
                        onConfirm={confirmCapacityReduction}
                        onCancel={cancelCapacityReduction}
                    />
                )}
            </div>
        );
    },
);

SessionsModule.displayName = 'SessionsModule';

export default SessionsModule;
