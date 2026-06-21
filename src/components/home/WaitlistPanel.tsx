import { Clock, ListOrdered } from 'lucide-react';
import type { OpenPlayDayConfig } from '../../lib/sports';
import {
    type Session,
    findUserWaitlistEntry,
    getMaxWaitlistSize,
    getWaitlistPosition,
    isSessionEnrollmentFull,
    isWaitlistEnabled,
    isWaitlistFull,
    parseWaitlistEntry,
} from '../../lib/sessions';

interface WaitlistPanelProps {
    session: Session;
    courts: string[];
    maxPerCourt: number;
    openPlayConfig?: OpenPlayDayConfig | null;
    userId?: string;
    disabled: boolean;
    onJoinWaitlist: () => void;
    onLeaveWaitlist: () => void;
    busy?: boolean;
}

const WaitlistPanel = ({
    session,
    courts,
    maxPerCourt,
    openPlayConfig,
    userId,
    disabled,
    onJoinWaitlist,
    onLeaveWaitlist,
    busy = false,
}: WaitlistPanelProps) => {
    if (!isWaitlistEnabled(session, openPlayConfig)) return null;

    const waitlist = session.waitlist || [];
    const maxWaitlist = getMaxWaitlistSize(session, openPlayConfig);
    const sessionFull = isSessionEnrollmentFull(session, courts, maxPerCourt);
    const userWaitlistEntry = userId ? findUserWaitlistEntry(waitlist, userId) : undefined;
    const waitlistPosition = userId ? getWaitlistPosition(waitlist, userId) : 0;
    const waitlistFull = isWaitlistFull(session, openPlayConfig);
    const hasEntries = waitlist.length > 0;
    const showJoin = sessionFull && !userWaitlistEntry && !!userId;

    if (!hasEntries && !sessionFull && !userWaitlistEntry) return null;

    return (
        <div className="mt-5 rounded-xl border border-amber-200/60 bg-amber-50/50 p-4 dark:border-amber-900/30 dark:bg-amber-950/20">
            <div className="mb-3 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                    <ListOrdered className="h-3.5 w-3.5" />
                    Session Waitlist
                </p>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600/80 dark:text-amber-400/80">
                    {waitlist.length} / {maxWaitlist}
                </span>
            </div>

            <p className="mb-3 text-xs text-amber-800/80 dark:text-amber-200/70">
                {sessionFull
                    ? 'One shared queue for all courts. When a spot opens, the next person is automatically added.'
                    : 'Waitlist is active for this session. Spots are still open — members can join directly when available.'}
            </p>

            {hasEntries && (
                <div className="mb-3 max-h-36 space-y-1.5 overflow-y-auto pr-1">
                    {waitlist.map((entry, index) => {
                        const person = parseWaitlistEntry(entry);
                        const isCurrentUser =
                            !!userId &&
                            (entry.startsWith(`${userId}|`) || entry === userId);
                        return (
                            <div
                                key={entry}
                                className={`flex items-center justify-between rounded-lg border px-2.5 py-2 text-xs ${
                                    isCurrentUser
                                        ? 'border-amber-300 bg-amber-100/80 dark:border-amber-700 dark:bg-amber-900/30'
                                        : 'border-amber-100 bg-white/70 dark:border-amber-900/25 dark:bg-carbon/50'
                                }`}
                            >
                                <span className="truncate font-semibold text-amber-900 dark:text-amber-100">
                                    #{index + 1} {person.name}
                                    {isCurrentUser ? ' (You)' : ''}
                                </span>
                                <span className="ml-2 shrink-0 text-[10px] text-amber-700/70 dark:text-amber-300/60">
                                    {person.email}
                                </span>
                            </div>
                        );
                    })}
                </div>
            )}

            {userWaitlistEntry ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-900 dark:text-amber-100">
                        <Clock className="h-4 w-4" />
                        You&apos;re #{waitlistPosition} on the waitlist
                    </p>
                    <button
                        type="button"
                        onClick={onLeaveWaitlist}
                        disabled={disabled || busy}
                        className="rounded-lg border border-amber-300/60 bg-white px-4 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-carbon dark:text-amber-200 dark:hover:bg-amber-950/40"
                    >
                        {busy ? 'Updating…' : 'Leave Waitlist'}
                    </button>
                </div>
            ) : showJoin ? (
                <button
                    type="button"
                    onClick={onJoinWaitlist}
                    disabled={disabled || busy || waitlistFull}
                    className="w-full rounded-lg border border-amber-300/60 bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/50"
                >
                    {busy
                        ? 'Joining waitlist…'
                        : waitlistFull
                          ? 'Waitlist Full'
                          : `Join Waitlist (${waitlist.length + 1}${maxWaitlist ? ` of ${maxWaitlist}` : ''})`}
                </button>
            ) : null}
        </div>
    );
};

export default WaitlistPanel;
