import { memo } from 'react';
import { Calendar, CalendarX, Clock, Edit, ListOrdered, RotateCcw, Trash2, UserPlus, Users, X } from 'lucide-react';
import { getSportTheme } from '../../../lib/sports';
import {
    type Session,
    parseAttendee,
    parseWaitlistEntry,
    getCourtsForSession,
    inferSport,
    isRecurringSession,
    getRecurringConfigForSession,
} from '../../../lib/sessions';
import type { AdminRecurringSchedule } from '../../../lib/sports';
import { formatRecurringDayLabel } from '../../../lib/recurringSchedules';
import SessionTags from '../../SessionTags';
import MemberLookupInput, { type MemberDraft } from '../MemberLookupInput';
import type { ClubMember } from '../../../lib/members';

export interface SessionOpsCardProps {
    session: Session;
    recurringSchedules?: AdminRecurringSchedule[];
    disabledBuiltinSchedules?: string[];
    rosterAttendees: string[];
    waitlist: string[];
    maxWaitlistSize: number;
    coachValue: string;
    memberDraft: MemberDraft;
    members: ClubMember[];
    newAttendeeCourt: string;
    savingCoach: boolean;
    onCoachDraftChange: (value: string) => void;
    onUpdateCoach: () => void;
    onMemberDraftChange: (draft: MemberDraft) => void;
    onNewAttendeeCourtChange: (value: string) => void;
    onAddAttendee: () => void;
    onAddToWaitlist: () => void;
    onRemoveAttendee: (attendeeStr: string) => void;
    onRemoveWaitlistEntry: (waitlistEntry: string) => void;
    onEdit: () => void;
    onCancelThisWeek?: () => void;
    onRestoreThisWeek?: () => void;
    onDelete: () => void;
    /** When true, renders only roster/admin controls (no session header). */
    embedded?: boolean;
    /** Hide the "Admin controls" label in embedded mode. */
    showEmbeddedLabel?: boolean;
    /** When false, court picker is hidden and not required to add members. */
    requiresCourtForAdd?: boolean;
}

const SessionOpsCard = memo(({
    session,
    recurringSchedules = [],
    disabledBuiltinSchedules = [],
    rosterAttendees,
    waitlist,
    maxWaitlistSize,
    coachValue,
    memberDraft,
    members,
    newAttendeeCourt,
    savingCoach,
    onCoachDraftChange,
    onUpdateCoach,
    onMemberDraftChange,
    onNewAttendeeCourtChange,
    onAddAttendee,
    onAddToWaitlist,
    onRemoveAttendee,
    onRemoveWaitlistEntry,
    onEdit,
    onCancelThisWeek,
    onRestoreThisWeek,
    onDelete,
    embedded = false,
    showEmbeddedLabel = true,
    requiresCourtForAdd,
}: SessionOpsCardProps) => {
    const sport = session.sport || inferSport(session);
    const theme = getSportTheme(sport);
    const enrolledCount = rosterAttendees.length;
    const isFull = enrolledCount >= session.maxAttendees;
    const sessionCourts = getCourtsForSession(session, recurringSchedules, disabledBuiltinSchedules);
    const courtRequired = requiresCourtForAdd ?? sessionCourts.length > 0;
    const isRecurring = isRecurringSession(session);
    const isCancelledThisWeek = session.cancelledThisWeek === true;
    const recurringConfig = isRecurring
        ? getRecurringConfigForSession(session, recurringSchedules, disabledBuiltinSchedules)
        : null;

    const coachEditor = session.type === 'coaching' && (
        <div className={embedded ? 'mb-4 space-y-2' : 'space-y-2'}>
            {!embedded && (
                <div className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    <span>
                        Coach:{' '}
                        <span className="font-semibold text-gray-700 dark:text-gray-300">
                            {session.coach || 'TBD'}
                        </span>
                    </span>
                </div>
            )}
            <div className="flex gap-2">
                <input
                    type="text"
                    placeholder="Assign coach name..."
                    value={coachValue}
                    onChange={(e) => onCoachDraftChange(e.target.value)}
                    className="flex-grow rounded-lg border border-gray-350 bg-white p-2 text-xs text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                />
                <button
                    type="button"
                    onClick={onUpdateCoach}
                    disabled={savingCoach}
                    className="clay-gradient rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors hover:brightness-110 disabled:opacity-40"
                >
                    {savingCoach ? 'Saving...' : 'Save Coach'}
                </button>
            </div>
        </div>
    );

    const rosterSection = (
        <>
            <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    <span>
                        Roster ({enrolledCount} / {session.maxAttendees})
                    </span>
                    <span className={isFull ? 'text-red-500' : 'text-wimbledon-green'}>
                        {session.maxAttendees - enrolledCount} Open
                    </span>
                </div>

                {enrolledCount === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-200 bg-white/10 p-3 text-center text-xs italic text-gray-400 dark:border-gray-800 dark:bg-black/10 dark:text-gray-500">
                        No players registered.
                    </p>
                ) : (
                    <div className="max-h-[160px] space-y-1.5 overflow-y-auto pr-1">
                        {rosterAttendees.map((attString, i) => {
                            const player = parseAttendee(attString);
                            return (
                                <div
                                    key={i}
                                    className="group/item flex items-center justify-between rounded-lg border border-gray-150 bg-white p-2 text-xs dark:border-gray-800/60 dark:bg-carbon/60"
                                >
                                    <div className="truncate pr-2">
                                        <p className="truncate font-semibold text-gray-850 dark:text-gray-250">
                                            {player.name}
                                        </p>
                                        <p className="mt-0.5 truncate text-[10px] text-gray-400">
                                            {player.email}
                                            {player.court && ` • ${player.court}`}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => onRemoveAttendee(player.raw)}
                                        className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-gray-450 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/20"
                                        title="Remove player"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {maxWaitlistSize > 0 && (
                <div className="mb-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span className="flex items-center gap-1">
                            <ListOrdered className="h-3 w-3" />
                            Waitlist ({waitlist.length} / {maxWaitlistSize})
                        </span>
                    </div>
                    {waitlist.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-gray-200 bg-white/10 p-3 text-center text-xs italic text-gray-400 dark:border-gray-800 dark:bg-black/10 dark:text-gray-500">
                            No one on the waitlist.
                        </p>
                    ) : (
                        <div className="max-h-[120px] space-y-1.5 overflow-y-auto pr-1">
                            {waitlist.map((entry, i) => {
                                const person = parseWaitlistEntry(entry);
                                return (
                                    <div
                                        key={entry}
                                        className="group/item flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/50 p-2 text-xs dark:border-amber-900/30 dark:bg-amber-950/20"
                                    >
                                        <div className="truncate pr-2">
                                            <p className="truncate font-semibold text-amber-900 dark:text-amber-100">
                                                #{i + 1} {person.name}
                                            </p>
                                            <p className="mt-0.5 truncate text-[10px] text-amber-700/70 dark:text-amber-300/60">
                                                {person.email}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => onRemoveWaitlistEntry(entry)}
                                            className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-amber-600 transition-colors hover:bg-amber-100 hover:text-red-500 dark:hover:bg-amber-950/40"
                                            title="Remove from waitlist"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </>
    );

    const actionSection = (
        <div className={`space-y-3 ${embedded ? '' : 'mt-4 border-t border-gray-150 pt-3 dark:border-gray-800/80'}`}>
            <div className="flex flex-col gap-2 sm:flex-row">
                <MemberLookupInput
                    value={memberDraft.name}
                    members={members}
                    onChange={onMemberDraftChange}
                    className="min-w-0 flex-1"
                />

                <div className="flex shrink-0 gap-2">
                {courtRequired && sessionCourts.length > 0 && (
                    <select
                        value={newAttendeeCourt}
                        onChange={(e) => onNewAttendeeCourtChange(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-gray-350 bg-white p-2 text-xs text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk sm:w-28 sm:flex-none"
                    >
                        <option value="">Court...</option>
                        {sessionCourts.map((court) => (
                            <option key={court} value={court}>
                                {court}
                            </option>
                        ))}
                    </select>
                )}

                <button
                    type="button"
                    onClick={onAddAttendee}
                    disabled={
                        !memberDraft.name.trim() ||
                        (courtRequired && sessionCourts.length > 0 && !newAttendeeCourt)
                    }
                    className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg clay-gradient text-white transition-colors hover:brightness-110 disabled:opacity-40"
                    title="Add to roster"
                >
                    <UserPlus className="h-4 w-4" />
                </button>

                {maxWaitlistSize > 0 && (
                    <button
                        type="button"
                        onClick={onAddToWaitlist}
                        disabled={!memberDraft.name.trim() || waitlist.length >= maxWaitlistSize}
                        className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-40 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300 dark:hover:bg-amber-950/50"
                        title="Add to waitlist"
                    >
                        <ListOrdered className="h-4 w-4" />
                    </button>
                )}
                </div>
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
                Search registered members or type any name manually.
            </p>

            <div className="flex items-center justify-between pt-2">
                <button
                    type="button"
                    onClick={onEdit}
                    className="flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors hover:text-court-accent dark:hover:text-court-accent"
                >
                    <Edit className="h-3.5 w-3.5" />
                    Edit Details
                </button>
                <div className="flex items-center gap-3">
                    {isRecurring &&
                        (isCancelledThisWeek ? (
                            <button
                                type="button"
                                onClick={onRestoreThisWeek}
                                className="flex items-center gap-1 text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-700 dark:text-emerald-400"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore this week
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={onCancelThisWeek}
                                className="flex items-center gap-1 text-xs font-medium text-amber-600 transition-colors hover:text-amber-700 dark:text-amber-400"
                            >
                                <CalendarX className="h-3.5 w-3.5" />
                                Cancel this week
                            </button>
                        ))}
                    <button
                        type="button"
                        onClick={onDelete}
                        className="flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-red-500"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isRecurring ? 'Remove schedule' : 'Delete Session'}
                    </button>
                </div>
            </div>
        </div>
    );

    if (embedded) {
        return (
            <div className="rounded-xl border border-dashed border-court-accent/35 bg-white/50 p-4 dark:border-court-accent/25 dark:bg-court-950/25">
                {showEmbeddedLabel && (
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-court-accent">
                        Admin controls
                    </p>
                )}
                {coachEditor}
                {rosterSection}
                {actionSection}
            </div>
        );
    }

    return (
        <div
            className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-250/70 bg-gray-50/20 p-5 transition-all duration-200 hover:border-court-accent/30 hover:shadow-md dark:border-gray-800/80 dark:bg-court-950/30"
            style={{ borderLeftWidth: '4px', borderLeftColor: theme.accent }}
        >
            <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <span
                            className="rounded border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest"
                            style={{
                                color: theme.accentLight,
                                backgroundColor: theme.dim,
                                borderColor: `${theme.accent}33`,
                            }}
                        >
                            {sport}
                        </span>
                        <h3 className="mt-2 truncate text-lg font-bold text-gray-900 dark:text-chalk">
                            {session.title}
                        </h3>
                        {isRecurring && recurringConfig && (
                            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                Every {formatRecurringDayLabel(recurringConfig.day)} · {session.time}
                            </p>
                        )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                        {isCancelledThisWeek && (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                                Cancelled this week
                            </span>
                        )}
                        <SessionTags session={session} variant="admin" />
                    </div>
                </div>

                <div className="mb-4 flex flex-col gap-1 rounded-xl border border-gray-150 bg-white/40 p-2.5 text-xs text-gray-500 dark:border-gray-850 dark:bg-carbon/40 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        <span>{session.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{session.time}</span>
                    </div>
                    {coachEditor}
                </div>

                {rosterSection}
            </div>

            {actionSection}
        </div>
    );
});

SessionOpsCard.displayName = 'SessionOpsCard';

export default SessionOpsCard;
