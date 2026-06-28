import { memo } from 'react';
import type { User } from 'firebase/auth';
import { Users, Rocket, AlertTriangle, Lock, RotateCcw } from 'lucide-react';
import type { AdminRecurringSchedule, OpenPlayDayConfig, Sport } from '../../../lib/sports';
import CourtDiagram from '../CourtDiagram';
import WaitlistPanel from '../WaitlistPanel';
import SessionTags from '../../SessionTags';
import BookingCardAdminMenu from '../BookingCardAdminMenu';
import { buildCourtSlots } from '../../../lib/courtSlots';
import { formatCourtDisplayName } from '../../../lib/memberNames';
import {
    type Session,
    getBaseWeekStart,
    isWeekLocked,
    getWeekDateRangeDisplay,
    parseSessionDateString,
    isWithinBookingHorizon,
    getCourtsForSession,
    getSlotsPerCourt,
    getSessionEnrollmentCap,
    getSessionRosterAttendees,
    getDiagramSlotsPerCourt,
    isRecurringCoachingSession,
    getRecurringConfigForSession,
    filterAttendeesByCourt,
    findUserAttendeeEntry,
    findUserWaitlistEntry,
    isAttendeeOnCourt,
    isSessionEnrollmentFull,
    getAttendeesNotOnConfiguredCourts,
    parseAttendee,
    NEXT_WEEK_BOOKING_LOCK_MESSAGE,
} from '../../../lib/sessions';

export interface BookingAdminActions {
    onEdit: (session: Session) => void;
    onManageRoster: (session: Session) => void;
    onCancelThisWeek: (session: Session) => void;
    onRestoreThisWeek: (session: Session) => void;
    onDelete: (session: Session) => void;
}

export interface BookingCardHandlers {
    onJoin: (session: Session, courtName?: string, slotIndex?: number) => void;
    onJoinWaitlist: (session: Session, openPlayConfig?: OpenPlayDayConfig | null) => void;
    onLeaveWaitlist: (session: Session) => void;
    onCoachAction: (session: Session) => void;
}

const SessionLockOverlay = () => (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-b-2xl bg-amber-50/45 backdrop-blur-[1px] dark:bg-court-950/40">
        <div className="flex max-w-[85%] flex-col items-center rounded-xl border border-amber-300/80 bg-white/90 px-5 py-4 text-center shadow-lg backdrop-blur-sm dark:border-amber-800/80 dark:bg-carbon/90">
            <Lock className="mb-2 h-7 w-7 text-amber-600 dark:text-amber-400" />
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Booking not open yet</p>
            <p className="mt-1.5 text-xs font-medium leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                {NEXT_WEEK_BOOKING_LOCK_MESSAGE}
            </p>
        </div>
    </div>
);

const SessionCancelledOverlay = ({
    showRestore,
    onRestore,
}: {
    showRestore?: boolean;
    onRestore?: () => void;
}) => (
    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl bg-white/30 backdrop-blur-[2px] dark:bg-court-950/40">
        <div className="flex max-w-[75%] flex-col items-center rounded-xl border border-red-200 bg-white px-5 py-4 text-center shadow-lg dark:border-red-900/50 dark:bg-carbon">
            <AlertTriangle className="mb-2 h-6 w-6 text-red-500" />
            <p className="text-sm font-bold text-red-700 dark:text-red-300">Cancelled This Week</p>
            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-chalk/50">
                This session won&apos;t be running this week.
            </p>
            {showRestore && onRestore && (
                <button
                    type="button"
                    onClick={onRestore}
                    className="mt-4 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore this week
                </button>
            )}
        </div>
    </div>
);

const AttendeesList = ({
    attendees,
    maxAttendees,
    courtNames,
}: {
    attendees: string[];
    maxAttendees: number;
    courtNames?: string[];
}) => {
    const perCourt = courtNames?.length
        ? maxAttendees % courtNames.length === 0
            ? maxAttendees / courtNames.length
            : Math.ceil(maxAttendees / courtNames.length)
        : 4;
    const slots = Array(maxAttendees).fill(null).map((_, i) => attendees[i] || null);
    const courts = [];
    for (let i = 0; i < slots.length; i += perCourt) {
        courts.push(slots.slice(i, i + perCourt));
    }

    return (
        <div className="my-3 grid grid-cols-1 gap-3">
            {courts.map((court, courtIdx) => (
                <div key={courtIdx} className="bg-gray-50/80 dark:bg-court-900/50 rounded shadow-sm border border-gray-100 dark:border-chalk/10 p-3">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-chalk/40 mb-2 flex justify-between">
                        <span>{courtNames ? courtNames[courtIdx] : `Court ${courtIdx + 1}`}</span>
                        <span>{court.filter(Boolean).length}/{court.length}</span>
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                        {court.map((p, i) => {
                            const isPresent = !!p;
                            let name = 'Open';
                            let tooltip = '';
                            if (isPresent) {
                                if (p.includes('|')) {
                                    const parsed = parseAttendee(p);
                                    name = formatCourtDisplayName(parsed.email, parsed.name);
                                    tooltip = parsed.email.includes('@') ? parsed.email : parsed.name;
                                } else {
                                    name = 'Player';
                                    tooltip = 'Player';
                                }
                            }
                            return (
                                <div key={i} className={`text-center py-2 px-1 rounded transition-all duration-300 ${isPresent ? 'bg-emerald-500/10 text-emerald-700 dark:text-court-accent font-semibold border border-emerald-500/30 truncate' : 'bg-white border border-dashed border-gray-300 text-gray-400 dark:bg-court-900/50 dark:border-chalk/10 dark:text-chalk/40'}`} title={isPresent ? tooltip : ''}>
                                    {name}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
};

interface BookingRegularCardProps {
    session: Session;
    recurringWeek?: { playDate: Date; isNextWeek: boolean };
    activeSport: Sport;
    user: User | null;
    isAdmin: boolean;
    bookingBusy: string | null;
    recurringSchedules: AdminRecurringSchedule[];
    disabledBuiltinSchedules: string[];
    adminActions?: BookingAdminActions;
    handlers: BookingCardHandlers;
}

export const BookingRegularCard = memo(function BookingRegularCard({
    session,
    recurringWeek,
    activeSport,
    user,
    isAdmin,
    bookingBusy,
    recurringSchedules,
    disabledBuiltinSchedules,
    adminActions,
    handlers,
}: BookingRegularCardProps) {
    const isCancelled = session.cancelledThisWeek === true;

    const sessionDateObj = recurringWeek?.playDate ?? parseSessionDateString(session.date);
    if (sessionDateObj && !isWithinBookingHorizon(sessionDateObj)) return null;

    const isPast = sessionDateObj
        ? sessionDateObj.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime()
        : false;
    const formattedClinicDate = sessionDateObj
        ? sessionDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        : session.date;

    const sessionCourts = getCourtsForSession(session, recurringSchedules, disabledBuiltinSchedules);
    const maxPerCourt = getSlotsPerCourt(session, recurringSchedules, disabledBuiltinSchedules);
    const totalMax = getSessionEnrollmentCap(session, sessionCourts, maxPerCourt);
    const diagramSlotsPerCourt = getDiagramSlotsPerCourt(
        session,
        sessionCourts,
        recurringSchedules,
        disabledBuiltinSchedules,
    );
    const showCourtDiagram = diagramSlotsPerCourt != null;
    const slotsPerCourtForUi = diagramSlotsPerCourt ?? maxPerCourt;

    const activeAttendees = getSessionRosterAttendees(session, sessionCourts, maxPerCourt);
    const orphanedAttendees = getAttendeesNotOnConfiguredCourts(session.attendees || [], sessionCourts);

    const isFull = isSessionEnrollmentFull(session, sessionCourts, maxPerCourt);
    const userEntry = user ? findUserAttendeeEntry(session.attendees, user.uid) : undefined;
    const userOnWaitlist = user ? !!findUserWaitlistEntry(session.waitlist, user.uid) : false;
    const isJoining = !!userEntry;
    const baseStartOfWeek = getBaseWeekStart(activeSport);
    const isLocked = recurringWeek
        ? isWeekLocked(baseStartOfWeek, recurringWeek.isNextWeek)
        : false;
    const sessionDisabled = isPast || isCancelled || isLocked || !user;
    const isRecurringClinic = isRecurringCoachingSession(session);
    const recurringClinicConfig = isRecurringClinic
        ? getRecurringConfigForSession(session, recurringSchedules, disabledBuiltinSchedules)
        : null;
    const recurringDayLabel = recurringClinicConfig
        ? recurringClinicConfig.day.charAt(0).toUpperCase() + recurringClinicConfig.day.slice(1)
        : null;
    const dateHeaderLabel = recurringWeek
        ? getWeekDateRangeDisplay(baseStartOfWeek, recurringWeek.isNextWeek)
        : formattedClinicDate;

    return (
        <div className="booking-card relative flex h-full w-[min(calc(100vw-2.5rem),28rem)] shrink-0 snap-start flex-col overflow-hidden md:w-full">
            {isCancelled && (
                <SessionCancelledOverlay
                    showRestore={isAdmin}
                    onRestore={adminActions ? () => adminActions.onRestoreThisWeek(session) : undefined}
                />
            )}

            <div className={`border-b border-gray-200 p-4 dark:border-chalk/10 md:p-6 ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <SessionTags session={session} variant="booking" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {isAdmin && adminActions && (
                            <BookingCardAdminMenu
                                session={session}
                                onEdit={() => adminActions.onEdit(session)}
                                onManageRoster={() => adminActions.onManageRoster(session)}
                                onCancelThisWeek={() => adminActions.onCancelThisWeek(session)}
                                onRestoreThisWeek={() => adminActions.onRestoreThisWeek(session)}
                                onDelete={() => adminActions.onDelete(session)}
                            />
                        )}
                        <p className="hud-label w-fit border border-gray-200 px-2 py-1.5 text-gray-500 dark:border-chalk/10 dark:text-chalk/50">
                            {dateHeaderLabel}
                        </p>
                    </div>
                </div>
                <h3 className="font-display text-xl text-gray-900 dark:text-chalk md:text-2xl">{session.title}</h3>
                {recurringDayLabel && (
                    <p className="mt-1 text-xs font-medium text-gray-500 dark:text-chalk/45">Every {recurringDayLabel}</p>
                )}
                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-chalk/60">
                    {formattedClinicDate} · {session.time || '3:00 PM - 4:00 PM'}
                </p>
                {session.type === 'coaching' && (
                    <p className="mt-2 flex items-center text-sm font-medium text-gray-600 dark:text-chalk/60">
                        <Rocket className="mr-1.5 h-4 w-4 accent-text" />
                        Instructor:
                        <span className="ml-1 font-bold accent-text">{session.coach || 'TBD'}</span>
                    </p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-chalk/50">
                    <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {activeAttendees.length} / {totalMax} enrolled
                    </span>
                    <span className={isFull ? 'text-red-500 dark:text-red-400' : 'accent-text'}>
                        {totalMax - activeAttendees.length} spots left
                    </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-chalk/10">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${isFull ? 'bg-red-500' : 'accent-bg'}`}
                        style={{ width: `${Math.min(100, (activeAttendees.length / totalMax) * 100)}%` }}
                    />
                </div>
            </div>

            <div className={`relative flex-grow p-4 md:p-5 ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                {!user && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-b-2xl bg-white/60 backdrop-blur-[2px] dark:bg-court-950/60">
                        <div className="mb-8 flex max-w-[80%] flex-col items-center rounded-xl border border-gray-100 bg-white p-5 text-center shadow-lg dark:border-chalk/10 dark:bg-carbon">
                            <Users className="mb-2 h-8 w-8 text-wimbledon-navy opacity-80 dark:text-chalk" />
                            <h4 className="mb-1 text-sm font-bold text-gray-900 dark:text-chalk">Members Only</h4>
                            <p className="text-xs font-medium text-gray-500 dark:text-chalk/50">Sign in to view availability and book.</p>
                        </div>
                    </div>
                )}

                <div className={!user ? 'pointer-events-none blur-[1.5px] opacity-40' : isLocked && !isCancelled ? 'pointer-events-none' : ''}>
                    <div className={isLocked && !isCancelled ? 'opacity-65' : ''}>
                        {showCourtDiagram ? (
                            <>
                                <div
                                    className={
                                        sessionCourts.length === 1
                                            ? 'grid grid-cols-1 gap-5'
                                            : 'grid grid-cols-1 gap-5 lg:grid-cols-2'
                                    }
                                >
                                    {sessionCourts.map((courtName) => {
                                        const courtAttendees = filterAttendeesByCourt(session.attendees || [], courtName);
                                        const sessionAtCapacity = activeAttendees.length >= totalMax;
                                        const isCourtFull =
                                            courtAttendees.length >= slotsPerCourtForUi ||
                                            (session.type === 'coaching' && sessionAtCapacity);
                                        const userInThisCourt = !!(userEntry && isAttendeeOnCourt(userEntry, courtName));
                                        const userInAnotherCourt = !!(userEntry && !userInThisCourt);
                                        const slots = buildCourtSlots(courtAttendees, slotsPerCourtForUi, user?.uid);
                                        const spotsLeft = Math.min(
                                            slotsPerCourtForUi - courtAttendees.length,
                                            totalMax - activeAttendees.length,
                                        );
                                        const disabled =
                                            sessionDisabled ||
                                            userOnWaitlist ||
                                            ((isCourtFull || sessionAtCapacity) && !userInThisCourt) ||
                                            bookingBusy === session.id;

                                        const actionLabel = isPast
                                            ? 'Session Ended'
                                            : isCancelled
                                              ? 'Cancelled'
                                              : isLocked
                                                ? 'Locked'
                                                : userInThisCourt
                                                  ? `Drop ${courtName}`
                                                  : userInAnotherCourt
                                                    ? `Switch to ${courtName}`
                                                    : isCourtFull
                                                      ? `${courtName} Full`
                                                      : `Join ${courtName}`;

                                        return (
                                            <CourtDiagram
                                                key={courtName}
                                                sport={activeSport}
                                                courtName={courtName}
                                                slots={slots}
                                                spotsLeft={Math.max(0, spotsLeft)}
                                                disabled={disabled}
                                                actionLabel={actionLabel}
                                                userInThisCourt={userInThisCourt}
                                                onAction={() => handlers.onJoin(session, courtName)}
                                                onJoinSlot={(slotIndex) => handlers.onJoin(session, courtName, slotIndex)}
                                            />
                                        );
                                    })}
                                </div>
                                {orphanedAttendees.length > 0 && (
                                    <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                            Enrolled roster
                                        </p>
                                        <div className="space-y-1">
                                            {orphanedAttendees.map((entry) => {
                                                const { name, court } = parseAttendee(entry);
                                                return (
                                                    <p
                                                        key={entry}
                                                        className="text-sm font-medium text-gray-800 dark:text-chalk/85"
                                                    >
                                                        {name}
                                                        {court ? (
                                                            <span className="ml-1 text-xs font-normal text-gray-500 dark:text-chalk/45">
                                                                ({court})
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <AttendeesList
                                    attendees={activeAttendees}
                                    maxAttendees={totalMax}
                                    courtNames={sessionCourts.length > 0 ? sessionCourts : undefined}
                                />
                                <button
                                    onClick={() => handlers.onJoin(session)}
                                    disabled={sessionDisabled || userOnWaitlist || (isFull && !isJoining) || bookingBusy === session.id}
                                    className={`mt-3 w-full min-h-11 touch-manipulation rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                                        isPast || isCancelled || (isFull && !isJoining) || userOnWaitlist
                                            ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 dark:border-chalk/10 dark:bg-carbon dark:text-chalk/30'
                                            : isJoining
                                              ? 'border border-red-400/40 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-300'
                                              : 'accent-bg text-court-950 hover:brightness-110'
                                    }`}
                                >
                                    {isPast ? 'Session Ended' : isCancelled ? 'Cancelled' : isLocked ? 'Locked' : userOnWaitlist ? 'On Waitlist' : isJoining ? 'Drop Session' : isFull ? 'Session Full' : 'Join Session'}
                                </button>
                            </>
                        )}

                        <WaitlistPanel
                            session={session}
                            courts={sessionCourts}
                            maxPerCourt={maxPerCourt}
                            userId={user?.uid}
                            disabled={sessionDisabled}
                            busy={bookingBusy === `${session.id}:waitlist`}
                            onJoinWaitlist={() => handlers.onJoinWaitlist(session)}
                            onLeaveWaitlist={() => handlers.onLeaveWaitlist(session)}
                        />

                        {session.type === 'coaching' && isAdmin && (
                            <button
                                onClick={() => handlers.onCoachAction(session)}
                                className={`mt-3 w-full min-h-11 touch-manipulation rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                                    session.coachId === user?.uid
                                        ? 'border border-amber-300/50 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300'
                                        : session.coachId
                                          ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 dark:border-chalk/10 dark:bg-carbon dark:text-chalk/30'
                                          : 'border border-court-accent/40 bg-court-accent/10 text-emerald-700 hover:bg-court-accent/20 dark:text-court-accent'
                                }`}
                                disabled={!!session.coachId && session.coachId !== user?.uid}
                            >
                                {session.coachId === user?.uid ? 'Drop Coach Slot' : session.coachId ? 'Coach Slot Filled' : 'Claim Coach Slot'}
                            </button>
                        )}
                    </div>
                    {isLocked && !isCancelled && user && <SessionLockOverlay />}
                </div>
            </div>
        </div>
    );
});

interface BookingOpenPlayCardProps {
    session: Session;
    config: OpenPlayDayConfig;
    playDate: Date;
    isNextWeek: boolean;
    activeSport: Sport;
    user: User | null;
    isAdmin: boolean;
    bookingBusy: string | null;
    recurringSchedules: AdminRecurringSchedule[];
    disabledBuiltinSchedules: string[];
    adminActions?: BookingAdminActions;
    handlers: BookingCardHandlers;
}

export const BookingOpenPlayCard = memo(function BookingOpenPlayCard({
    session,
    config,
    playDate,
    isNextWeek,
    activeSport,
    user,
    isAdmin,
    bookingBusy,
    recurringSchedules,
    disabledBuiltinSchedules,
    adminActions,
    handlers,
}: BookingOpenPlayCardProps) {
    const isCancelled = session.cancelledThisWeek === true;

    const baseStartOfWeek = getBaseWeekStart(activeSport);
    const isLocked = isWeekLocked(baseStartOfWeek, isNextWeek);
    const dateRangeDisplay = getWeekDateRangeDisplay(baseStartOfWeek, isNextWeek);

    const courtsForDay = getCourtsForSession(session, recurringSchedules, disabledBuiltinSchedules);
    const maxPerCourt = getSlotsPerCourt(session, recurringSchedules, disabledBuiltinSchedules);
    const diagramSlotsPerCourt = getDiagramSlotsPerCourt(
        session,
        courtsForDay,
        recurringSchedules,
        disabledBuiltinSchedules,
    );
    const showCourtDiagram = diagramSlotsPerCourt != null;
    const slotsPerCourtForUi = diagramSlotsPerCourt ?? maxPerCourt;
    const totalMax = getSessionEnrollmentCap(session, courtsForDay, maxPerCourt);

    const activeAttendees = getSessionRosterAttendees(session, courtsForDay, maxPerCourt);
    const orphanedAttendees = getAttendeesNotOnConfiguredCourts(session.attendees || [], courtsForDay);

    const isFull = isSessionEnrollmentFull(session, courtsForDay, maxPerCourt);
    const userEntry = user ? findUserAttendeeEntry(session.attendees, user.uid) : undefined;
    const userOnWaitlist = user ? !!findUserWaitlistEntry(session.waitlist, user.uid) : false;
    const isPast = playDate.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime();
    const sessionDisabled = isPast || isLocked || isCancelled || !user;

    const dayLabel = config.day.charAt(0).toUpperCase() + config.day.slice(1);

    return (
        <div className="booking-card relative flex h-full w-[min(calc(100vw-2.5rem),28rem)] shrink-0 snap-start flex-col overflow-hidden md:w-full md:shrink">
            {isCancelled && (
                <SessionCancelledOverlay
                    showRestore={isAdmin}
                    onRestore={adminActions ? () => adminActions.onRestoreThisWeek(session) : undefined}
                />
            )}

            <div className={`border-b border-chalk/10 p-4 md:p-6 ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <SessionTags session={session} variant="booking" />
                        </div>
                        <h3 className="mt-3 font-display text-xl text-gray-900 dark:text-chalk md:text-2xl">{config.title}</h3>
                        <p className="mt-1 text-xs font-medium text-gray-500 dark:text-chalk/45">Every {dayLabel}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 sm:mt-0">
                        {isAdmin && adminActions && (
                            <BookingCardAdminMenu
                                session={session}
                                onEdit={() => adminActions.onEdit(session)}
                                onManageRoster={() => adminActions.onManageRoster(session)}
                                onCancelThisWeek={() => adminActions.onCancelThisWeek(session)}
                                onRestoreThisWeek={() => adminActions.onRestoreThisWeek(session)}
                                onDelete={() => adminActions.onDelete(session)}
                            />
                        )}
                        <p className="hud-label mt-1 w-fit border border-gray-200 px-2 py-1.5 text-gray-500 dark:border-chalk/10 dark:text-chalk/50">
                            {dateRangeDisplay}
                        </p>
                    </div>
                </div>
                <p className="text-sm font-medium text-wimbledon-navy dark:text-chalk/70">
                    {session.date} · {session.time}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-chalk/50">
                    <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        {activeAttendees.length} / {totalMax} enrolled
                    </span>
                    <span className={isFull ? 'text-red-400' : 'accent-text'}>
                        {totalMax - activeAttendees.length} spots left
                    </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-chalk/10">
                    <div
                        className={`h-full rounded-full transition-all duration-700 ${isFull ? 'bg-red-500' : 'accent-bg'}`}
                        style={{ width: `${Math.min(100, (activeAttendees.length / totalMax) * 100)}%` }}
                    />
                </div>
            </div>

            <div className={`relative flex-grow p-4 md:p-5 ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                {!user && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center rounded-b-2xl bg-white/60 backdrop-blur-[2px] dark:bg-court-950/60">
                        <div className="mb-8 flex max-w-[80%] flex-col items-center rounded-xl border border-gray-100 bg-white p-5 text-center shadow-lg dark:border-chalk/10 dark:bg-carbon">
                            <Users className="mb-2 h-8 w-8 text-wimbledon-navy opacity-80 dark:text-chalk" />
                            <h4 className="mb-1 text-sm font-bold text-gray-900 dark:text-chalk">Members Only</h4>
                            <p className="text-xs font-medium text-gray-500 dark:text-chalk/50">Sign in to view availability and book.</p>
                        </div>
                    </div>
                )}

                <div className={!user ? 'pointer-events-none blur-[1.5px] opacity-40' : isLocked && !isCancelled ? 'pointer-events-none' : ''}>
                    <div className={isLocked && !isCancelled ? 'opacity-65' : ''}>
                        {showCourtDiagram ? (
                            <>
                                <div
                                    className={
                                        courtsForDay.length === 1
                                            ? 'grid grid-cols-1 gap-5'
                                            : 'grid grid-cols-1 gap-5 lg:grid-cols-2'
                                    }
                                >
                                    {courtsForDay.map((courtName) => {
                                        const courtAttendees = filterAttendeesByCourt(session.attendees || [], courtName);
                                        const sessionAtCapacity = activeAttendees.length >= totalMax;
                                        const isCourtFull =
                                            courtAttendees.length >= slotsPerCourtForUi ||
                                            sessionAtCapacity;
                                        const userInThisCourt = !!(userEntry && isAttendeeOnCourt(userEntry, courtName));
                                        const userInAnotherCourt = !!(userEntry && !userInThisCourt);
                                        const slots = buildCourtSlots(courtAttendees, slotsPerCourtForUi, user?.uid);
                                        const spotsLeft = Math.min(
                                            slotsPerCourtForUi - courtAttendees.length,
                                            totalMax - activeAttendees.length,
                                        );
                                        const disabled =
                                            sessionDisabled ||
                                            userOnWaitlist ||
                                            ((isCourtFull || sessionAtCapacity) && !userInThisCourt) ||
                                            bookingBusy === session.id;

                                        const actionLabel = isPast
                                            ? 'Session Ended'
                                            : isCancelled
                                              ? 'Cancelled'
                                              : isLocked
                                                ? 'Locked'
                                                : userInThisCourt
                                                  ? `Drop ${courtName}`
                                                  : userInAnotherCourt
                                                    ? `Switch to ${courtName}`
                                                    : isCourtFull
                                                      ? `${courtName} Full`
                                                      : `Join ${courtName}`;

                                        return (
                                            <CourtDiagram
                                                key={courtName}
                                                sport={activeSport}
                                                courtName={courtName}
                                                slots={slots}
                                                spotsLeft={Math.max(0, spotsLeft)}
                                                disabled={disabled}
                                                actionLabel={actionLabel}
                                                userInThisCourt={userInThisCourt}
                                                onAction={() => handlers.onJoin(session, courtName)}
                                                onJoinSlot={(slotIndex) => handlers.onJoin(session, courtName, slotIndex)}
                                            />
                                        );
                                    })}
                                </div>
                                {orphanedAttendees.length > 0 && (
                                    <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                            Enrolled roster
                                        </p>
                                        <div className="space-y-1">
                                            {orphanedAttendees.map((entry) => {
                                                const { name, court } = parseAttendee(entry);
                                                return (
                                                    <p
                                                        key={entry}
                                                        className="text-sm font-medium text-gray-800 dark:text-chalk/85"
                                                    >
                                                        {name}
                                                        {court ? (
                                                            <span className="ml-1 text-xs font-normal text-gray-500 dark:text-chalk/45">
                                                                ({court})
                                                            </span>
                                                        ) : null}
                                                    </p>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <AttendeesList
                                    attendees={activeAttendees}
                                    maxAttendees={totalMax}
                                    courtNames={courtsForDay.length > 0 ? courtsForDay : undefined}
                                />
                                <button
                                    onClick={() => handlers.onJoin(session)}
                                    disabled={
                                        sessionDisabled ||
                                        userOnWaitlist ||
                                        (isFull && !userEntry) ||
                                        bookingBusy === session.id
                                    }
                                    className={`mt-3 w-full min-h-11 touch-manipulation rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                                        isPast || isCancelled || isLocked || (isFull && !userEntry) || userOnWaitlist
                                            ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 dark:border-chalk/10 dark:bg-carbon dark:text-chalk/30'
                                            : userEntry
                                              ? 'border border-red-400/40 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-300'
                                              : 'accent-bg text-court-950 hover:brightness-110'
                                    }`}
                                >
                                    {isPast
                                        ? 'Session Ended'
                                        : isCancelled
                                          ? 'Cancelled'
                                          : isLocked
                                            ? 'Locked'
                                            : userOnWaitlist
                                              ? 'On Waitlist'
                                              : userEntry
                                                ? 'Drop Session'
                                                : isFull
                                                  ? 'Session Full'
                                                  : 'Join Session'}
                                </button>
                            </>
                        )}

                        <WaitlistPanel
                            session={session}
                            courts={courtsForDay}
                            maxPerCourt={maxPerCourt}
                            openPlayConfig={config}
                            userId={user?.uid}
                            disabled={sessionDisabled}
                            busy={bookingBusy === `${session.id}:waitlist`}
                            onJoinWaitlist={() => handlers.onJoinWaitlist(session, config)}
                            onLeaveWaitlist={() => handlers.onLeaveWaitlist(session)}
                        />
                    </div>
                    {isLocked && !isCancelled && user && <SessionLockOverlay />}
                </div>
            </div>
        </div>
    );
});
