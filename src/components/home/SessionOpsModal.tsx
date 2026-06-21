import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, type ReactNode } from 'react';
import SessionOpsCard from '../admin/cards/SessionOpsCard';
import type { AdminRecurringSchedule } from '../../lib/sports';
import { type Session, getMaxWaitlistSize } from '../../lib/sessions';
import type { SessionAdminOps } from '../../hooks/useSessionAdminOps';

interface SessionOpsModalProps {
    session: Session;
    adminOps: SessionAdminOps;
    recurringSchedules: AdminRecurringSchedule[];
    disabledBuiltinSchedules: string[];
    onClose: () => void;
}

const emptyMemberDraft = () => ({ name: '' });

const OpsModalPortal = ({ children }: { children: ReactNode }) => {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[160] bg-black/50 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6">
            <div className="mx-auto flex h-full w-full max-w-lg min-h-0 flex-col justify-center">
                {children}
            </div>
        </div>,
        document.body,
    );
};

const SessionOpsModal = ({
    session,
    adminOps,
    recurringSchedules,
    disabledBuiltinSchedules,
    onClose,
}: SessionOpsModalProps) => {
    const rosterAttendees = adminOps.getSessionRoster(session);
    const coachValue = adminOps.coachDraft[session.id] ?? session.coach ?? '';

    return (
        <OpsModalPortal>
            <div className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-carbon">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800 sm:px-5">
                    <div className="min-w-0 pr-3">
                        <h3 className="truncate text-base font-bold text-gray-900 dark:text-chalk">
                            {session.title}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Manage roster & waitlist</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    <SessionOpsCard
                        embedded
                        showEmbeddedLabel={false}
                        session={session}
                        recurringSchedules={recurringSchedules}
                        disabledBuiltinSchedules={disabledBuiltinSchedules}
                        rosterAttendees={rosterAttendees}
                        coachValue={coachValue}
                        memberDraft={adminOps.memberDrafts[session.id] ?? emptyMemberDraft()}
                        members={adminOps.members}
                        newAttendeeCourt={adminOps.newAttendeeCourt[session.id] || ''}
                        savingCoach={!!adminOps.savingCoach[session.id]}
                        requiresCourtForAdd={adminOps.sessionRequiresCourtForAdd(session)}
                        onCoachDraftChange={(value) =>
                            adminOps.setCoachDraft((prev) => ({ ...prev, [session.id]: value }))
                        }
                        onUpdateCoach={() => adminOps.handleUpdateCoach(session.id)}
                        onMemberDraftChange={(draft) =>
                            adminOps.setMemberDrafts((prev) => ({ ...prev, [session.id]: draft }))
                        }
                        onNewAttendeeCourtChange={(value) =>
                            adminOps.setNewAttendeeCourt((prev) => ({ ...prev, [session.id]: value }))
                        }
                        onAddAttendee={() => adminOps.handleAddAttendee(session)}
                        onAddToWaitlist={() => adminOps.handleAddToWaitlist(session)}
                        onRemoveAttendee={(attendeeStr) => adminOps.handleRemoveAttendee(session, attendeeStr)}
                        onRemoveWaitlistEntry={(waitlistEntry) =>
                            adminOps.handleRemoveWaitlistEntry(session.id, waitlistEntry)
                        }
                        waitlist={session.waitlist || []}
                        maxWaitlistSize={getMaxWaitlistSize(session)}
                        onEdit={() => {
                            onClose();
                            adminOps.openEditSession(session);
                        }}
                        onDelete={() => {
                            onClose();
                            adminOps.handleDeleteSession(session);
                        }}
                    />
                </div>
            </div>
        </OpsModalPortal>
    );
};

export default SessionOpsModal;
