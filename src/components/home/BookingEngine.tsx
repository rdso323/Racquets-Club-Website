import { useState, useEffect, type CSSProperties } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Rocket, AlertTriangle, Lock, X, PartyPopper } from 'lucide-react';
import { type Sport, SPORTS, getSportTheme, type OpenPlayDayConfig, type AdminRecurringSchedule } from '../../lib/sports';
import CourtDiagram from './CourtDiagram';
import WaitlistPanel from './WaitlistPanel';
import {
    joinSessionCourt,
    joinWaitlist,
    leaveWaitlist,
    toBookingProfile,
} from '../../lib/bookingActions';
import { dismissNotification, notifyWaitlistPromotion, type WaitlistPromotionNotification } from '../../lib/waitlistNotifications';
import {
    type Session,
    type SessionStatus,
    getBaseWeekStart,
    isWeekLocked,
    getWeekDateRangeDisplay,
    getOpenPlayInstancesWithinHorizon,
    pickAdminOpenPlayInstances,
    filterRegularSessionsForDisplay,
    inferSport,
    parseSessionDateString,
    isWithinBookingHorizon,
    getCourtsForSession,
    getSlotsPerCourt,
    getSessionEnrollmentCap,
    getSessionRosterAttendees,
    getDiagramSlotsPerCourt,
    isRecurringSession,
    filterAttendeesByCourt,
    findUserAttendeeEntry,
    findUserWaitlistEntry,
    isAttendeeOnCourt,
    isSessionEnrollmentFull,
    isOpenPlaySessionEnded,
    isOpenPlaySession,
    isRecurringCoachingSession,
    getRecurringConfigForSession,
    parseAttendee,
    getAttendeesNotOnConfiguredCourts,
    normalizeSessionFromFirestore,
    NEXT_WEEK_BOOKING_LOCK_MESSAGE,
} from '../../lib/sessions';
import { buildCourtSlots } from '../../lib/courtSlots';
import { sectionHud } from '../../lib/siteNav';
import { formatCourtDisplayName } from '../../lib/memberNames';
import SessionTags from '../SessionTags';
import BookingCardAdminMenu from './BookingCardAdminMenu';
import SessionOpsModal from './SessionOpsModal';
import EditSessionModal from '../admin/modals/EditSessionModal';
import CapacityReductionModal from '../admin/modals/CapacityReductionModal';
import { useSessionAdminOps } from '../../hooks/useSessionAdminOps';

/** Prevents duplicate clinic week-reset writes when snapshots re-fire. */
const pendingClinicResets = new Set<string>();
const pendingOpenPlayResets = new Set<string>();

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

const createICSFile = (session: Session, courtName?: string) => {
    let startDate = new Date();
    let endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatICSDate = (date: Date) => {
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };

    const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays',
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let targetDate = new Date();
    for (let i = 0; i < days.length; i++) {
        if (session.date.includes(days[i])) {
            const targetDay = i % 7;
            const currentDay = targetDate.getDay();
            let distance = targetDay - currentDay;
            if (distance < 0) distance += 7;
            targetDate.setDate(targetDate.getDate() + distance);
            break;
        }
    }

    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const match = session.time?.match(timeRegex);
    if (match) {
        let hours = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        targetDate.setHours(hours, mins, 0, 0);

        if (targetDate.getTime() < new Date().getTime() - 60 * 60 * 1000) {
            targetDate.setDate(targetDate.getDate() + 7);
        }
        startDate = new Date(targetDate);

        const remainingStr = session.time?.substring(match.index! + match[0].length);
        const endMatch = remainingStr?.match(timeRegex);
        if (endMatch) {
            let eHours = parseInt(endMatch[1]);
            const eMins = parseInt(endMatch[2]);
            const eAmpm = endMatch[3].toUpperCase();
            if (eAmpm === 'PM' && eHours < 12) eHours += 12;
            if (eAmpm === 'AM' && eHours === 12) eHours = 0;
            endDate = new Date(targetDate);
            endDate.setHours(eHours, eMins, 0, 0);
            if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
        }
    }

    const title = courtName ? `${session.title} - ${courtName}` : session.title;
    const description = `Racquets Club Session\\nTitle: ${session.title}\\nDate: ${session.date}\\nTime: ${session.time}${courtName ? `\\nCourt: ${courtName}` : ''}`;

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Racquets Club//Booking Engine//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${Date.now()}-${Math.random().toString(36).substring(2)}@racquetsclub`,
        `DTSTAMP:${(() => { const d = new Date(); const p = (n: number) => n < 10 ? '0' + n : n; return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`; })()}`,
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const BookingEngine = () => {
    const { user, isAdmin, tabPreferences } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionStatuses, setSessionStatuses] = useState<Record<string, SessionStatus>>({});
    const [recurringSchedules, setRecurringSchedules] = useState<AdminRecurringSchedule[]>([]);
    const [disabledBuiltinSchedules, setDisabledBuiltinSchedules] = useState<string[]>([]);
    const [activeSport, setActiveSport] = useState<Sport>('Tennis');
    const [displayTabs, setDisplayTabs] = useState<string[]>([]);
    const [bookingBusy, setBookingBusy] = useState<string | null>(null);
    const [promotionAlerts, setPromotionAlerts] = useState<
        Array<{ id: string } & WaitlistPromotionNotification>
    >([]);
    const [opsSession, setOpsSession] = useState<Session | null>(null);

    const adminOps = useSessionAdminOps({
        sessionsList: sessions,
        recurringSchedules,
        disabledBuiltinSchedules,
    });

    useEffect(() => {
        if (!user) {
            setPromotionAlerts([]);
            return;
        }

        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        const unreadQuery = query(notificationsRef, where('read', '==', false));

        const unsub = onSnapshot(unreadQuery, (snapshot) => {
            const alerts = snapshot.docs
                .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as { id: string } & WaitlistPromotionNotification))
                .filter((item) => item.type === 'waitlist_promoted');
            setPromotionAlerts(alerts);
        }, (err) => {
            console.warn('Could not load promotion notifications:', err);
        });

        return () => unsub();
    }, [user]);

    useEffect(() => {
        const visibleTabs = tabPreferences.filter(t => t.visible).map(t => t.id);
        if (visibleTabs.length > 0) {
            setDisplayTabs(visibleTabs);
            setActiveSport(prev => visibleTabs.includes(prev) ? prev as Sport : visibleTabs[0] as Sport);
        }
    }, [tabPreferences]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sessions'), (snapshot) => {
            const sessionsData = snapshot.docs.map((docSnap) =>
                normalizeSessionFromFirestore(docSnap.id, docSnap.data()),
            );

            setSessions(sessionsData);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching sessions:", err);
            setError("Could not load sessions. Please try again later.");
            setLoading(false);
        });

        const fetchStatuses = async () => {
            try {
                const statusDoc = await getDoc(doc(db, 'settings', 'sessionStatus'));
                if (statusDoc.exists()) {
                    setSessionStatuses(statusDoc.data() as Record<string, SessionStatus>);
                }
            } catch (err) {
                console.error("Error fetching statuses:", err);
            }
        };
        fetchStatuses();

        const unsubRecurring = onSnapshot(
            doc(db, 'settings', 'recurringSchedules'),
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setRecurringSchedules(
                        Array.isArray(data.schedules) ? (data.schedules as AdminRecurringSchedule[]) : [],
                    );
                    setDisabledBuiltinSchedules(
                        Array.isArray(data.disabledBuiltin) ? (data.disabledBuiltin as string[]) : [],
                    );
                } else {
                    setRecurringSchedules([]);
                    setDisabledBuiltinSchedules([]);
                }
            },
            (err) => console.error('Error fetching recurring schedules:', err),
        );

        return () => {
            unsubscribe();
            unsubRecurring();
        };
    }, []);

    useEffect(() => {
        sessions.forEach(async (session) => {
            if (isRecurringCoachingSession(session)) return;
            if (session.type === 'coaching' || session.title.toLowerCase().includes('clinic')) {
                const sport = inferSport(session);
                const baseStartOfWeek = getBaseWeekStart(sport);
                const currentWeekStartStr = baseStartOfWeek.toISOString().split('T')[0];
                const storedWeekStart = session.weekStartDate;

                if (storedWeekStart === currentWeekStartStr) {
                    pendingClinicResets.delete(`${session.id}:${currentWeekStartStr}`);
                    return;
                }

                const resetKey = `${session.id}:${currentWeekStartStr}`;
                if (pendingClinicResets.has(resetKey)) return;
                pendingClinicResets.add(resetKey);

                try {
                    const sessionRef = doc(db, 'sessions', session.id);
                    await updateDoc(sessionRef, {
                        attendees: [],
                        coach: null,
                        coachId: null,
                        weekStartDate: currentWeekStartStr,
                    });
                } catch (e) {
                    pendingClinicResets.delete(resetKey);
                    console.error(`Failed to auto-reset weekly session ${session.id}:`, e);
                }
            }
        });
    }, [sessions]);

    useEffect(() => {
        for (const sport of SPORTS) {
            const instances = getOpenPlayInstancesWithinHorizon(
                sessions,
                sport,
                recurringSchedules,
                disabledBuiltinSchedules,
            );

            instances.forEach(async ({ session, playDate, config }) => {
                if (!isOpenPlaySession(session) && config.sessionType !== 'coaching') return;
                if (!isOpenPlaySessionEnded(playDate, session.time)) return;

                const hasRoster =
                    (session.attendees?.length ?? 0) > 0 || (session.waitlist?.length ?? 0) > 0;
                if (!hasRoster) return;

                const resetKey = `${session.id}:ended`;
                if (pendingOpenPlayResets.has(resetKey)) return;
                pendingOpenPlayResets.add(resetKey);

                try {
                    const reset: Record<string, unknown> = {
                        attendees: [],
                        waitlist: [],
                    };
                    if (config.sessionType === 'coaching') {
                        reset.coachId = null;
                    }
                    await updateDoc(doc(db, 'sessions', session.id), reset);
                } catch (e) {
                    pendingOpenPlayResets.delete(resetKey);
                    console.error(`Failed to reset ended open play session ${session.id}:`, e);
                }
            });
        }
    }, [sessions, recurringSchedules, disabledBuiltinSchedules]);

    const handleJoin = async (sessionToJoin: Session, courtName?: string, slotIndex?: number) => {
        if (!user) return;
        setBookingBusy(sessionToJoin.id);
        const profile = toBookingProfile(user);

        try {
            const result = await joinSessionCourt(sessionToJoin, profile, courtName, activeSport, slotIndex);

            if (result.action === 'joined' && window.confirm('Successfully joined! Would you like to download a calendar invite?')) {
                createICSFile(sessionToJoin, courtName);
            } else if (result.action === 'switched' && window.confirm('Successfully switched courts! Would you like to download a calendar invite?')) {
                createICSFile(sessionToJoin, courtName);
            } else if (result.action === 'left' && result.promotion?.promoted && result.promotion.promotedUid) {
                try {
                    await notifyWaitlistPromotion({
                        promotedUid: result.promotion.promotedUid,
                        promotedName: result.promotion.promotedName || 'Member',
                        promotedCourt: result.promotion.promotedCourt,
                        sessionId: sessionToJoin.id,
                        sessionTitle: sessionToJoin.title,
                        sessionDate: sessionToJoin.date,
                        actorUid: user.uid,
                    });
                } catch (notifyErr) {
                    console.warn('Could not write waitlist promotion notification:', notifyErr);
                }
            }
        } catch (error) {
            console.error('Error updating session', error);
            alert(error instanceof Error ? error.message : 'Failed to update booking. Make sure you have the right permissions.');
        } finally {
            setBookingBusy(null);
        }
    };

    const handleJoinWaitlist = async (sessionToJoin: Session, openPlayConfig?: OpenPlayDayConfig | null) => {
        if (!user) return;
        setBookingBusy(`${sessionToJoin.id}:waitlist`);
        const profile = toBookingProfile(user);

        try {
            await joinWaitlist(sessionToJoin, profile, openPlayConfig, activeSport);
            alert("You're on the waitlist. We'll add you automatically when a spot opens.");
        } catch (error) {
            console.error('Error joining waitlist', error);
            alert(error instanceof Error ? error.message : 'Failed to join the waitlist.');
        } finally {
            setBookingBusy(null);
        }
    };

    const handleLeaveWaitlist = async (sessionToJoin: Session) => {
        if (!user) return;
        setBookingBusy(`${sessionToJoin.id}:waitlist`);
        const profile = toBookingProfile(user);

        try {
            await leaveWaitlist(sessionToJoin, profile, activeSport);
        } catch (error) {
            console.error('Error leaving waitlist', error);
            alert(error instanceof Error ? error.message : 'Failed to leave the waitlist.');
        } finally {
            setBookingBusy(null);
        }
    };

    const handleCoachAction = async (session: Session) => {
        if (!user || !isAdmin) return;
        const sessionRef = doc(db, 'sessions', session.id);

        try {
            if (session.coachId === user.uid) {
                await updateDoc(sessionRef, {
                    coachId: null,
                    coach: null
                });
            } else {
                const nameParts = user.email ? user.email.split('@')[0].split('.') : ['Coach'];
                const formattedName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

                await updateDoc(sessionRef, {
                    coachId: user.uid,
                    coach: formattedName
                });

                if (window.confirm("You've claimed the coaching slot! Would you like to download a calendar invite?")) {
                    const coachSession = {
                        ...session,
                        title: `Coaching: ${session.title}`
                    };
                    createICSFile(coachSession);
                }
            }
        } catch (error) {
            console.error("Error updating coach slot", error);
            alert("Failed to update coach slot.");
        }
    };

    const renderAttendeesList = (attendees: string[], maxAttendees: number, courtNames?: string[]) => {
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

    const renderAdminMenu = (session: Session) => {
        if (!user || !isAdmin) return null;

        return (
            <BookingCardAdminMenu
                session={session}
                onEdit={() => adminOps.openEditSession(session)}
                onManageRoster={() => setOpsSession(session)}
                onDelete={() => adminOps.handleDeleteSession(session)}
            />
        );
    };

    const renderCard = (
        session: Session,
        recurringWeek?: { playDate: Date; isNextWeek: boolean },
    ) => {
        const categoryKey = session.type === 'court'
            ? `${activeSport}_OpenPlay`
            : `${activeSport}_Clinic`;
        const status = sessionStatuses[categoryKey] || 'active';

        if (status === 'hidden') return null;
        const isCancelled = status === 'cancelled';

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
            <div key={session.id} className="booking-card relative flex h-full w-[min(92vw,28rem)] shrink-0 snap-start flex-col overflow-hidden md:w-full">
                {isCancelled && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl backdrop-blur-[2px] bg-white/30 dark:bg-court-950/40">
                        <div className="flex max-w-[75%] flex-col items-center rounded-xl border border-red-200 bg-white px-5 py-4 text-center shadow-lg dark:border-red-900/50 dark:bg-carbon">
                            <AlertTriangle className="mb-2 h-6 w-6 text-red-500" />
                            <p className="text-sm font-bold text-red-700 dark:text-red-300">Cancelled This Week</p>
                            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-chalk/50">This session won't be running this week.</p>
                        </div>
                    </div>
                )}

                <div className={`border-b border-gray-200 p-6 dark:border-chalk/10 ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <SessionTags session={session} variant="booking" />
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            {renderAdminMenu(session)}
                            <p className="hud-label w-fit border border-gray-200 px-2 py-1.5 text-gray-500 dark:border-chalk/10 dark:text-chalk/50">
                                {dateHeaderLabel}
                            </p>
                        </div>
                    </div>
                    <h3 className="font-display text-2xl text-gray-900 dark:text-chalk">{session.title}</h3>
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

                <div className={`relative flex-grow p-5 ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
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
                                            onAction={() => handleJoin(session, courtName)}
                                            onJoinSlot={(slotIndex) => handleJoin(session, courtName, slotIndex)}
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
                                {renderAttendeesList(
                                    activeAttendees,
                                    totalMax,
                                    sessionCourts.length > 0 ? sessionCourts : undefined,
                                )}
                                <button
                                    onClick={() => handleJoin(session)}
                                    disabled={sessionDisabled || userOnWaitlist || (isFull && !isJoining) || bookingBusy === session.id}
                                    className={`mt-3 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
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
                            onJoinWaitlist={() => handleJoinWaitlist(session)}
                            onLeaveWaitlist={() => handleLeaveWaitlist(session)}
                        />

                        {session.type === 'coaching' && isAdmin && (
                            <button
                                onClick={() => handleCoachAction(session)}
                                className={`mt-3 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
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
    };

    const renderOpenPlayCard = (
        session: Session,
        config: ReturnType<typeof getOpenPlayInstancesWithinHorizon>[0]['config'],
        playDate: Date,
        isNextWeek: boolean,
    ) => {
        const categoryKey = `${activeSport}_OpenPlay`;
        const status = sessionStatuses[categoryKey] || 'active';

        if (status === 'hidden') return null;
        const isCancelled = status === 'cancelled';

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
            <div key={session.id} className="booking-card relative flex h-full w-[min(92vw,28rem)] shrink-0 snap-start flex-col overflow-hidden md:w-full md:shrink">
                {isCancelled && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl backdrop-blur-[2px] bg-white/30 dark:bg-court-950/40">
                        <div className="flex max-w-[75%] flex-col items-center rounded-xl border border-red-200 bg-white px-5 py-4 text-center shadow-lg dark:border-red-900/50 dark:bg-carbon">
                            <AlertTriangle className="mb-2 h-6 w-6 text-red-500" />
                            <p className="text-sm font-bold text-red-700 dark:text-red-300">Cancelled This Week</p>
                            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-chalk/50">This session won't be running this week.</p>
                        </div>
                    </div>
                )}

                <div className={`border-b border-chalk/10 p-6 ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <SessionTags session={session} variant="booking" />
                            </div>
                            <h3 className="mt-3 font-display text-2xl text-gray-900 dark:text-chalk">{config.title}</h3>
                            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-chalk/45">Every {dayLabel}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 sm:mt-0">
                            {renderAdminMenu(session)}
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

                <div className={`relative flex-grow p-5 ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
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
                                        onAction={() => handleJoin(session, courtName)}
                                        onJoinSlot={(slotIndex) => handleJoin(session, courtName, slotIndex)}
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
                                {renderAttendeesList(
                                    activeAttendees,
                                    totalMax,
                                    courtsForDay.length > 0 ? courtsForDay : undefined,
                                )}
                                <button
                                    onClick={() => handleJoin(session)}
                                    disabled={
                                        sessionDisabled ||
                                        userOnWaitlist ||
                                        (isFull && !userEntry) ||
                                        bookingBusy === session.id
                                    }
                                    className={`mt-3 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
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
                            onJoinWaitlist={() => handleJoinWaitlist(session, config)}
                            onLeaveWaitlist={() => handleLeaveWaitlist(session)}
                        />
                        </div>
                        {isLocked && !isCancelled && user && <SessionLockOverlay />}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-court-accent border-t-transparent" />
            </div>
        );
    }

    const allRecurringInstances = pickAdminOpenPlayInstances(
        getOpenPlayInstancesWithinHorizon(
            sessions,
            activeSport,
            recurringSchedules,
            disabledBuiltinSchedules,
        ),
        activeSport,
    );
    const openPlayInstances = allRecurringInstances.filter(
        (item) => (item.config.sessionType ?? 'court') === 'court',
    );
    const recurringClinicInstances = allRecurringInstances.filter(
        (item) => item.config.sessionType === 'coaching',
    );
    const oneTimeSessions = filterRegularSessionsForDisplay(sessions, activeSport);
    const hasDisplayContent =
        openPlayInstances.length > 0 ||
        recurringClinicInstances.length > 0 ||
        oneTimeSessions.length > 0;
    const theme = getSportTheme(activeSport);
    const accentStyle = {
        '--accent': theme.accent,
        '--accent-light': theme.accentLight,
        '--accent-dim': theme.dim,
    } as CSSProperties;

    return (
        <>
        <section id="booking-section" style={accentStyle} className="transition-[--accent] duration-500">
            <div id="radar" className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="hud-label mb-3 text-court-accent">{sectionHud('booking')}</p>
                    <h2 className="font-display text-3xl text-gray-900 dark:text-chalk md:text-4xl">
                        Reserve your court
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-chalk/50">
                        Browse open play and clinic sessions across all {SPORTS.length} club sports.
                    </p>
                </div>
                <p className="hud-label text-gray-400 dark:text-chalk/40">{theme.code} · {activeSport.toUpperCase()}</p>
            </div>

            {promotionAlerts.length > 0 && (
                <div className="mb-8 space-y-3">
                    {promotionAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30"
                        >
                            <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-court-accent" />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                                    You&apos;re off the waitlist!
                                </p>
                                <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/90">
                                    {alert.court
                                        ? `You were promoted to ${alert.court} for ${alert.sessionTitle} (${alert.sessionDate}).`
                                        : `You were promoted into ${alert.sessionTitle} (${alert.sessionDate}).`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => user && dismissNotification(user.uid, alert.id)}
                                className="rounded-lg p-1 text-emerald-700/70 transition-colors hover:text-emerald-900 dark:text-emerald-300/70 dark:hover:text-emerald-100"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mb-10 flex justify-start overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-2 rounded-full border border-chalk/10 bg-gray-100/80 p-1.5 dark:bg-carbon/80">
                    {displayTabs.map((sport) => {
                        const t = getSportTheme(sport);
                        const active = activeSport === sport;
                        return (
                            <button
                                key={sport}
                                onClick={() => setActiveSport(sport as Sport)}
                                data-cursor="hover"
                                className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                                    active
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-court-800 dark:text-chalk accent-glow'
                                        : 'text-gray-500 hover:text-gray-800 dark:text-chalk/50 dark:hover:text-chalk'
                                }`}
                                style={active ? { '--accent': t.accent, '--accent-light': t.accentLight } as CSSProperties : undefined}
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${active ? 'animate-blink accent-bg' : 'bg-gray-400 dark:bg-chalk/30'}`}
                                />
                                {sport}
                            </button>
                        );
                    })}
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center text-sm text-red-600 shadow-sm dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                </div>
            ) : !hasDisplayContent && !isAdmin ? (
                <div className="glass-deep flex flex-col items-center justify-center p-16 text-center">
                    <Rocket className="mb-4 h-12 w-12 text-gray-300 dark:text-chalk/30" />
                    <h3 className="mb-2 font-display text-xl text-gray-900 dark:text-chalk">No upcoming sessions</h3>
                    <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-chalk/50">Check back later for court availability and coaching clinics.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {openPlayInstances.length > 0 && (
                        <div>
                            <p className="mb-4 text-sm text-gray-500 dark:text-chalk/50 md:hidden">
                                Swipe sideways to browse open play sessions
                            </p>
                            <div className="-mx-5 overflow-x-auto px-5 pb-2 scrollbar-hide snap-x snap-mandatory md:mx-0 md:overflow-visible md:px-0 md:pb-0">
                                <div className="flex gap-6 md:grid md:grid-cols-2 md:gap-6">
                                    {openPlayInstances.map(({ session, config, playDate, isNextWeek }) =>
                                        renderOpenPlayCard(session, config, playDate, isNextWeek),
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {recurringClinicInstances.length > 0 && (
                        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-6">
                            {recurringClinicInstances.map(({ session, playDate, isNextWeek }) =>
                                renderCard(session, { playDate, isNextWeek }),
                            )}
                        </div>
                    )}

                    {oneTimeSessions.length > 0 && (
                        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-6">
                            {oneTimeSessions.map((session) => renderCard(session))}
                        </div>
                    )}
                </div>
            )}
        </section>

        {adminOps.editingSession && (
            <EditSessionModal
                session={adminOps.editingSession}
                editCourtFields={adminOps.editCourtFields}
                recurringConfig={
                    isRecurringSession(adminOps.editingSession)
                        ? getRecurringConfigForSession(
                              adminOps.editingSession,
                              recurringSchedules,
                              disabledBuiltinSchedules,
                          )
                        : null
                }
                onSessionChange={adminOps.setEditingSession}
                onEditCourtFieldsChange={adminOps.setEditCourtFields}
                onClose={() => adminOps.setEditingSession(null)}
                onSubmit={adminOps.handleSaveSessionEdit}
            />
        )}

        {adminOps.capacityReductionPrompt && (
            <CapacityReductionModal
                prompt={adminOps.capacityReductionPrompt}
                onConfirm={adminOps.confirmCapacityReduction}
                onCancel={adminOps.cancelCapacityReduction}
            />
        )}

        {opsSession && (
            <SessionOpsModal
                session={opsSession}
                adminOps={adminOps}
                recurringSchedules={recurringSchedules}
                disabledBuiltinSchedules={disabledBuiltinSchedules}
                onClose={() => setOpsSession(null)}
            />
        )}
    </>
    );
};

export default BookingEngine;
