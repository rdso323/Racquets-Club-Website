import { useState, useEffect, type CSSProperties } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, CalendarDays, Rocket, AlertTriangle } from 'lucide-react';
import { type Sport, SPORTS, getSportTheme } from '../../lib/sports';
import CourtDiagram, { type CourtSlot } from './CourtDiagram';
import {
    type Session,
    type SessionStatus,
    getBaseWeekStart,
    isWeekLocked,
    getWeekDateRangeDisplay,
    getOpenPlayInstancesWithinHorizon,
    filterRegularSessionsForDisplay,
    inferSport,
    parseSessionDateString,
    isWithinBookingHorizon,
    getCourtsForSession,
    getSlotsPerCourt,
} from '../../lib/sessions';

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
    const [activeSport, setActiveSport] = useState<Sport>('Tennis');
    const [displayTabs, setDisplayTabs] = useState<string[]>([]);

    useEffect(() => {
        const visibleTabs = tabPreferences.filter(t => t.visible).map(t => t.id);
        if (visibleTabs.length > 0) {
            setDisplayTabs(visibleTabs);
            setActiveSport(prev => visibleTabs.includes(prev) ? prev as Sport : visibleTabs[0] as Sport);
        }
    }, [tabPreferences]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sessions'), (snapshot) => {
            const sessionsData = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })) as Session[];

            sessionsData.forEach(async (session) => {
                if (session.type === 'coaching' || session.title.toLowerCase().includes('clinic')) {
                    const sport = inferSport(session);
                    const baseStartOfWeek = getBaseWeekStart(sport);
                    const currentWeekStartStr = baseStartOfWeek.toISOString().split('T')[0];
                    const storedWeekStart = session.weekStartDate;

                    if (storedWeekStart !== currentWeekStartStr) {
                        try {
                            const sessionRef = doc(db, 'sessions', session.id);
                            await updateDoc(sessionRef, {
                                attendees: [],
                                coach: null,
                                coachId: null,
                                weekStartDate: currentWeekStartStr
                            });
                        } catch (e) {
                            console.error(`Failed to auto-reset weekly session ${session.id}:`, e);
                        }
                    }
                }
            });

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

        return () => unsubscribe();
    }, []);

    const handleJoin = async (sessionToJoin: Session, courtName?: string) => {
        if (!user) return;
        const sessionRef = doc(db, 'sessions', sessionToJoin.id);

        let formattedName = 'Player';
        if (user.displayName) {
            const parts = user.displayName.split(' ');
            if (parts.length > 1) {
                formattedName = `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
            } else {
                formattedName = parts[0];
            }
        } else if (user.email) {
            const emailPart = user.email.split('@')[0];
            const parts = emailPart.split('.');
            if (parts.length > 1) {
                const first = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                const lastI = parts[1].charAt(0).toUpperCase() + '.';
                formattedName = `${first} ${lastI}`;
            } else {
                formattedName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
            }
        }

        const emailStr = user.email || 'Unknown Email';
        const attendeeString = courtName ? `${user.uid}|${formattedName}|${emailStr}|${courtName}` : `${user.uid}|${formattedName}|${emailStr}`;

        try {
            const existingEntry = sessionToJoin.attendees.find(a => a.startsWith(user.uid + "|") || a === user.uid);

            if (existingEntry) {
                if (courtName && !existingEntry.endsWith(`|${courtName}`)) {
                    await updateDoc(sessionRef, {
                        attendees: arrayRemove(existingEntry)
                    });
                    await updateDoc(sessionRef, {
                        attendees: arrayUnion(attendeeString)
                    });
                    if (window.confirm("Successfully switched courts! Would you like to download a calendar invite?")) {
                        createICSFile(sessionToJoin, courtName);
                    }
                    return;
                }

                await updateDoc(sessionRef, {
                    attendees: arrayRemove(existingEntry)
                });
            } else {
                await setDoc(sessionRef, {
                    title: sessionToJoin.title,
                    type: sessionToJoin.type,
                    date: sessionToJoin.date,
                    time: sessionToJoin.time,
                    maxAttendees: sessionToJoin.maxAttendees,
                    attendees: arrayUnion(attendeeString),
                    sport: activeSport,
                    ...(sessionToJoin.courts?.length ? {
                        courts: sessionToJoin.courts,
                        slotsPerCourt: sessionToJoin.slotsPerCourt ?? getSlotsPerCourt(sessionToJoin),
                    } : {}),
                }, { merge: true });

                if (window.confirm("Successfully joined! Would you like to download a calendar invite?")) {
                    createICSFile(sessionToJoin, courtName);
                }
            }
        } catch (error) {
            console.error("Error updating session", error);
            alert("Failed to update booking. Make sure you have the right permissions.");
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
        const perCourt = courtNames ? Math.ceil(maxAttendees / courtNames.length) : 4;
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
                                        const parts = p.split('|');
                                        name = parts[1];
                                        if (parts.length >= 3) {
                                            if (parts[2].includes('@')) tooltip = parts[2];
                                        }
                                        if (!tooltip) tooltip = name;
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

    const renderCard = (session: Session) => {
        const categoryKey = session.type === 'court'
            ? `${activeSport}_OpenPlay`
            : `${activeSport}_Clinic`;
        const status = sessionStatuses[categoryKey] || 'active';

        if (status === 'hidden') return null;
        const isCancelled = status === 'cancelled';

        const baseStartOfWeek = getBaseWeekStart(activeSport);
        const isLocked = isWeekLocked(baseStartOfWeek, false);
        const dateRangeDisplay = getWeekDateRangeDisplay(baseStartOfWeek, false);

        const clinicDateObj = parseSessionDateString(session.date) || new Date(baseStartOfWeek);
        if (!parseSessionDateString(session.date)) {
            clinicDateObj.setDate(baseStartOfWeek.getDate() + 4);
        }
        clinicDateObj.setHours(14, 0, 0, 0);

        if (!isWithinBookingHorizon(clinicDateObj)) return null;

        const isPast = clinicDateObj.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime();
        const formattedClinicDate = clinicDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

        const sessionCourts = session.type === 'court' ? getCourtsForSession(session) : [];
        const hasCourtBuckets = sessionCourts.length > 0;
        const maxPerCourt = getSlotsPerCourt(session);
        const totalMax = hasCourtBuckets ? sessionCourts.length * maxPerCourt : session.maxAttendees;

        const activeAttendees = hasCourtBuckets
            ? session.attendees.filter((a) => sessionCourts.some((court) => a.endsWith(`|${court}`)))
            : session.attendees;

        const isFull = activeAttendees.length >= totalMax;
        const isJoining = user ? session.attendees.some(a => a.startsWith(user.uid + "|") || a === user.uid) : false;
        const userEntry = user ? session.attendees.find(a => a.startsWith(user.uid + "|") || a === user.uid) : undefined;

        return (
            <div key={session.id} className="glass-deep relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:accent-glow">
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
                        <span className="inline-flex items-center gap-1.5 rounded bg-court-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest accent-text">
                            {session.type === 'coaching' ? <Rocket className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                            {session.type === 'coaching' ? 'Clinic' : 'Session'}
                        </span>
                        <p className="hud-label w-fit border border-gray-200 px-2 py-1.5 text-gray-500 dark:border-chalk/10 dark:text-chalk/50">
                            {dateRangeDisplay}
                        </p>
                    </div>
                    <h3 className="font-display text-2xl text-gray-900 dark:text-chalk">{session.title}</h3>
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

                    <div className={!user ? 'pointer-events-none blur-[1.5px] opacity-40' : ''}>
                        {isLocked && !isCancelled && (
                            <div className="mb-4 rounded-lg border border-amber-200/50 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                                Locked until Sunday 5:00 PM
                            </div>
                        )}

                        {hasCourtBuckets ? (
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                {sessionCourts.map((courtName) => {
                                    const courtAttendees = session.attendees.filter(a => a.endsWith(`|${courtName}`));
                                    const isCourtFull = courtAttendees.length >= maxPerCourt;
                                    const userInThisCourt = !!(userEntry && (courtAttendees.includes(userEntry) || userEntry.endsWith(`|${courtName}`)));
                                    const userInAnotherCourt = !!(userEntry && !userInThisCourt);
                                    const slots = buildCourtSlots(courtName, courtAttendees, maxPerCourt);
                                    const disabled = isPast || isLocked || isCancelled || (isCourtFull && !userInThisCourt) || !user;

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
                                            spotsLeft={maxPerCourt - courtAttendees.length}
                                            disabled={disabled}
                                            actionLabel={actionLabel}
                                            userInThisCourt={userInThisCourt}
                                            onAction={() => handleJoin(session, courtName)}
                                        />
                                    );
                                })}
                            </div>
                        ) : (
                            <>
                                {renderAttendeesList(session.attendees, session.maxAttendees, undefined)}
                                <button
                                    onClick={() => handleJoin(session)}
                                    disabled={isPast || isLocked || isCancelled || (isFull && !isJoining) || !user}
                                    className={`mt-3 w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all ${
                                        isPast || isCancelled || isLocked || (isFull && !isJoining)
                                            ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 dark:border-chalk/10 dark:bg-carbon dark:text-chalk/30'
                                            : isJoining
                                              ? 'border border-red-400/40 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-300'
                                              : 'accent-bg text-court-950 hover:brightness-110 accent-glow'
                                    }`}
                                >
                                    {isPast ? 'Session Ended' : isCancelled ? 'Cancelled' : isLocked ? 'Locked' : isJoining ? 'Drop Session' : isFull ? 'Session Full' : 'Join Session'}
                                </button>
                            </>
                        )}

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
                                disabled={(!!session.coachId && session.coachId !== user?.uid)}
                            >
                                {session.coachId === user?.uid ? 'Drop Coach Slot' : session.coachId ? 'Coach Slot Filled' : 'Claim Coach Slot'}
                            </button>
                        )}
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

        const courtsForDay = config.courts;
        const maxPerCourt = config.maxPerCourt;
        const totalMax = courtsForDay.length * maxPerCourt;

        const activeAttendees = session.attendees.filter((a) =>
            courtsForDay.some((court) => a.endsWith(`|${court}`)),
        );

        const isFull = activeAttendees.length >= totalMax;
        const userEntry = user ? session.attendees.find(a => a.startsWith(user.uid + "|") || a === user.uid) : undefined;
        const isPast = playDate.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime();

        const dayLabel = config.day.charAt(0).toUpperCase() + config.day.slice(1);

        return (
            <div key={session.id} className="glass-deep relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:accent-glow">
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
                            <span className="inline-flex items-center gap-1.5 rounded bg-court-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest accent-text">
                                <CalendarDays className="h-3.5 w-3.5" />
                                Open Play
                            </span>
                            <h3 className="mt-3 font-display text-2xl text-gray-900 dark:text-chalk">{config.title}</h3>
                            <p className="mt-1 text-xs font-medium text-gray-500 dark:text-chalk/45">Every {dayLabel}</p>
                        </div>
                        <p className="hud-label mt-1 w-fit border border-chalk/10 px-2 py-1.5 text-chalk/50 sm:mt-0">
                            {dateRangeDisplay}
                        </p>
                    </div>
                    <p className="text-sm font-medium text-wimbledon-navy dark:text-chalk/70">
                        {session.date} · {session.time}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-chalk/50">
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

                    <div className={!user ? 'pointer-events-none blur-[1.5px] opacity-40' : ''}>
                        {isLocked && !isCancelled && (
                            <div className="mb-4 rounded-lg border border-amber-200/50 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                                Next week's sessions lock Sunday at 5:00 PM
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                            {courtsForDay.map((courtName) => {
                                const courtAttendees = session.attendees.filter((a) => a.endsWith(`|${courtName}`));
                                const isCourtFull = courtAttendees.length >= maxPerCourt;
                                const userInThisCourt = !!(userEntry && (courtAttendees.includes(userEntry) || userEntry.endsWith(`|${courtName}`)));
                                const userInAnotherCourt = !!(userEntry && !userInThisCourt);
                                const slots = buildCourtSlots(courtName, courtAttendees, maxPerCourt);
                                const disabled =
                                    isPast || isLocked || isCancelled || (isCourtFull && !userInThisCourt) || !user;

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
                                        spotsLeft={maxPerCourt - courtAttendees.length}
                                        disabled={disabled}
                                        actionLabel={actionLabel}
                                        userInThisCourt={userInThisCourt}
                                        onAction={() => handleJoin(session, courtName)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const buildCourtSlots = (
        _courtName: string,
        courtAttendees: string[],
        maxPerCourt: number,
    ): (CourtSlot | null)[] => {
        const slots: (CourtSlot | null)[] = Array(maxPerCourt).fill(null);
        courtAttendees.forEach((entry, i) => {
            if (i >= maxPerCourt) return;
            const parts = entry.split('|');
            const name = parts[1] || 'Player';
            const email = parts[2] || '';
            const isMine = user ? entry.startsWith(user.uid + '|') || entry === user.uid : false;
            slots[i] = { name, tooltip: email.includes('@') ? email : name, isMine };
        });
        return slots;
    };

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-court-accent border-t-transparent" />
            </div>
        );
    }

    const regularSessions = filterRegularSessionsForDisplay(sessions, activeSport);
    const openPlayInstances = getOpenPlayInstancesWithinHorizon(sessions, activeSport);
    const hasDisplayContent = openPlayInstances.length > 0 || regularSessions.length > 0;
    const theme = getSportTheme(activeSport);
    const accentStyle = { '--accent': theme.accent, '--accent-dim': theme.dim } as CSSProperties;

    return (
        <section id="booking-section" style={accentStyle} className="transition-[--accent] duration-500">
            <div id="radar" className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="hud-label mb-3 text-court-accent">03 — Matchmaker</p>
                    <h2 className="font-display text-3xl text-gray-900 dark:text-chalk md:text-4xl">
                        Reserve your court
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-chalk/50">
                        Browse open play and clinic sessions across all {SPORTS.length} club sports.
                    </p>
                </div>
                <p className="hud-label text-chalk/40">{theme.code} · {activeSport.toUpperCase()}</p>
            </div>

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
                                style={active ? { '--accent': t.accent } as CSSProperties : undefined}
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${active ? 'animate-blink' : ''}`}
                                    style={{ backgroundColor: t.accent }}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {openPlayInstances.map(({ session, config, playDate, isNextWeek }) =>
                        renderOpenPlayCard(session, config, playDate, isNextWeek),
                    )}
                    {regularSessions.map(session => renderCard(session))}
                </div>
            )}
        </section>
    );
};

export default BookingEngine;
