import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, CalendarDays, Rocket, AlertTriangle } from 'lucide-react';
import { type Sport } from '../../lib/sports';
import {
    type Session,
    type SessionStatus,
    getBaseWeekStart,
    isWeekLocked,
    getWeekDateRangeDisplay,
    bucketAttendeesByCourt,
    getOpenPlayInstancesWithinHorizon,
    filterRegularSessionsForDisplay,
    inferSport,
    parseSessionDateString,
    isWithinBookingHorizon,
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
                    sport: activeSport
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
                    <div key={courtIdx} className="bg-gray-50/80 dark:bg-slate-900/50 rounded shadow-sm border border-gray-100 dark:border-slate-800 p-3">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-2 flex justify-between">
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
                                    <div key={i} className={`text-center py-2 px-1 rounded transition-all duration-300 ${isPresent ? 'bg-wimbledon-green/10 text-wimbledon-green font-semibold border border-wimbledon-green/30 truncate' : 'bg-white border border-dashed border-gray-300 text-gray-400 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500'}`} title={isPresent ? tooltip : ''}>
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

        const isFull = session.attendees.length >= session.maxAttendees;
        const isJoining = user ? session.attendees.some(a => a.startsWith(user.uid + "|") || a === user.uid) : false;

        return (
            <div key={session.id} className="club-card overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 relative">
                {isCancelled && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-[2px] bg-white/30 rounded-xl">
                        <div className="bg-white border border-red-200 shadow-lg rounded-xl px-5 py-4 flex flex-col items-center text-center max-w-[75%]">
                            <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
                            <p className="text-sm font-bold text-red-700">Cancelled This Week</p>
                            <p className="text-xs text-gray-500 mt-1 font-medium">This session won't be running this week.</p>
                        </div>
                    </div>
                )}

                <div className={`p-4 border-b relative transition-colors ${session.type === 'coaching' ? 'bg-gradient-to-r from-blue-50 to-indigo-50/50 border-blue-100 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-900/30' : 'bg-gradient-to-r from-green-50 to-emerald-50/50 border-green-100 dark:from-green-900/20 dark:to-emerald-900/20 dark:border-green-900/30'} ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-sm text-white shadow-sm transition-colors ${session.type === 'coaching' ? 'bg-wimbledon-navy dark:bg-blue-600' : 'bg-wimbledon-green dark:bg-wimbledon-green-accent'}`}>
                            {session.type}
                        </span>
                        <p className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded shadow-sm border transition-colors ${session.type === 'coaching' ? 'text-wimbledon-navy bg-blue-50/80 border-blue-200 dark:text-blue-200 dark:bg-blue-900/40 dark:border-blue-800/50' : 'text-wimbledon-green bg-green-50/80 border-green-200 dark:text-wimbledon-green-accent dark:bg-green-900/30 dark:border-green-800/50'}`}>
                            {dateRangeDisplay}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors">{session.title}</h3>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white/70 dark:bg-black/20 w-fit px-2 py-1 rounded shadow-sm border border-gray-100 dark:border-gray-800/50 whitespace-nowrap transition-colors">{formattedClinicDate} • {session.time || '3:00 PM - 4:00 PM'}</p>
                    </div>
                    {session.type === 'coaching' && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 font-medium flex items-center transition-colors">
                            <Rocket className="w-4 h-4 mr-1.5 text-wimbledon-navy dark:text-blue-400" />
                            Instructor: <span className="text-wimbledon-navy dark:text-blue-400 ml-1 font-bold">{session.coach || 'TBD'}</span>
                        </p>
                    )}
                </div>

                <div className={`p-4 flex-grow flex flex-col justify-between relative text-left ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    {!user && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] rounded-b-xl border-t border-gray-100 dark:border-slate-800">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 flex flex-col items-center text-center max-w-[80%] mb-10">
                                <Users className="w-8 h-8 text-wimbledon-navy dark:text-gray-300 mb-2 opacity-80" />
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Members Only</h4>
                                <p className="text-xs text-gray-500 font-medium">Please login to view spots and book this session.</p>
                            </div>
                        </div>
                    )}

                    <div className={`${!user ? 'opacity-40 pointer-events-none blur-[1.5px] transition-all' : ''}`}>
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                            <span className="flex items-center group relative">
                                <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                                {session.attendees.length} / {session.maxAttendees} Enrolled
                            </span>
                            <span className={isFull ? 'text-red-500' : 'text-wimbledon-green'}>{session.maxAttendees - session.attendees.length} Spots Left</span>
                        </div>

                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-700 ease-out ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-wimbledon-green to-emerald-400'}`}
                                style={{ width: `${Math.min(100, (session.attendees.length / session.maxAttendees) * 100)}%` }}
                            />
                        </div>

                        {renderAttendeesList(session.attendees, session.maxAttendees)}
                    </div>

                    <div className={`mt-auto pt-2 space-y-2 relative z-10 w-full ${!user ? 'opacity-30 pointer-events-none blur-[1px]' : ''}`}>
                        {isLocked && !isCancelled && (
                            <div className="mb-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs px-3 py-2 rounded-lg font-medium text-center shadow-sm">
                                Locked until Sunday 5:00 PM
                            </div>
                        )}
                        <button
                            onClick={() => handleJoin(session)}
                            disabled={isPast || isLocked || isCancelled || (isFull && !isJoining) || !user}
                            className={`w-full py-2.5 rounded-lg font-semibold tracking-wide text-sm transition-all duration-300 flex items-center justify-center shadow-sm ${isPast || isCancelled ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700' :
                                isLocked ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700' :
                                    isJoining ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:shadow' :
                                        isFull ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700' :
                                            'bg-wimbledon-navy hover:bg-[#00287a] text-white hover:shadow-md hover:-translate-y-0.5'
                                }`}
                        >
                            {isPast ? 'Session Ended' : isCancelled ? 'Cancelled' : isLocked ? 'Locked' : isJoining ? 'Drop Session' : isFull ? 'Session Full' : 'Join Session'}
                        </button>

                        {session.type === 'coaching' && isAdmin && (
                            <button
                                onClick={() => handleCoachAction(session)}
                                className={`w-full py-2.5 rounded-lg font-semibold tracking-wide text-sm transition-all duration-300 flex items-center justify-center shadow-sm ${session.coachId === user?.uid
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:shadow'
                                    : session.coachId
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                        : 'bg-wimbledon-green hover:bg-[#004d00] text-white hover:shadow-md hover:-translate-y-0.5 dark:bg-[#10B981] dark:hover:bg-emerald-500'
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
        const orderedAttendees = bucketAttendeesByCourt(activeAttendees, courtsForDay, maxPerCourt);

        const isFull = activeAttendees.length >= totalMax;
        const userEntry = user ? session.attendees.find(a => a.startsWith(user.uid + "|") || a === user.uid) : undefined;
        const isPast = playDate.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime();

        const dayLabel = config.day.charAt(0).toUpperCase() + config.day.slice(1);

        return (
            <div key={session.id} className="glass-panel p-6 transition-all duration-300 hover:shadow-lg flex flex-col justify-between h-full relative">
                {isCancelled && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-[2px] bg-white/30 rounded-xl">
                        <div className="bg-white border border-red-200 shadow-lg rounded-xl px-5 py-4 flex flex-col items-center text-center max-w-[75%]">
                            <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
                            <p className="text-sm font-bold text-red-700">Cancelled This Week</p>
                            <p className="text-xs text-gray-500 mt-1 font-medium">This session won't be running this week.</p>
                        </div>
                    </div>
                )}

                <div className={`p-5 border-b bg-gradient-to-br from-green-50 to-emerald-100/30 border-green-100 dark:from-green-900/20 dark:to-emerald-900/10 dark:border-green-900/30 relative transition-colors ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    <div className="absolute top-0 right-0 p-4 opacity-10 dark:opacity-5 pointer-events-none transition-opacity">
                        <Users className="w-24 h-24 text-wimbledon-green dark:text-wimbledon-green-accent" />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4 relative z-10">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded text-white bg-wimbledon-green dark:bg-wimbledon-green-accent flex items-center w-fit shadow-sm transition-colors">
                                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                                Weekly Open Play
                            </span>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-3 transition-colors">{config.title}</h3>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Every {dayLabel}</p>
                        </div>
                        <p className="text-[10px] font-bold tracking-widest uppercase text-wimbledon-green dark:text-wimbledon-green-accent bg-green-50/80 dark:bg-green-900/30 w-fit px-2 py-1.5 rounded shadow-sm border border-green-200 dark:border-green-800/50 mt-1 sm:mt-0 transition-colors">
                            {dateRangeDisplay}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 relative z-10">
                        <p className="text-sm font-medium text-wimbledon-navy dark:text-gray-300 bg-white/50 dark:bg-black/20 w-fit px-3 py-1.5 rounded-md shadow-sm border border-white/60 dark:border-gray-800/50 transition-colors">{session.date} • {session.time}</p>
                    </div>
                </div>

                <div className={`p-5 flex-grow flex flex-col justify-between relative text-left ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    {!user && (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-[2px] rounded-b-xl border-t border-gray-100 dark:border-slate-800">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 flex flex-col items-center text-center max-w-[80%] mb-10">
                                <Users className="w-8 h-8 text-wimbledon-navy dark:text-gray-300 mb-2 opacity-80" />
                                <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">Members Only</h4>
                                <p className="text-xs text-gray-500 font-medium">Please login to view spots and book this session.</p>
                            </div>
                        </div>
                    )}

                    <div className={`${!user ? 'opacity-40 pointer-events-none blur-[1.5px] transition-all' : ''}`}>
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                            <span className="flex items-center group relative">
                                <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                                {activeAttendees.length} / {totalMax} Enrolled
                            </span>
                            <span className={isFull ? 'text-red-500' : 'text-wimbledon-green'}>{totalMax - activeAttendees.length} Spots Left</span>
                        </div>

                        <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-1.5 mb-2 overflow-hidden shadow-inner">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-700 ease-out ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-wimbledon-green to-emerald-400'}`}
                                style={{ width: `${Math.min(100, (activeAttendees.length / totalMax) * 100)}%` }}
                            />
                        </div>

                        {isLocked && !isCancelled && (
                            <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs px-3 py-2 rounded-lg font-medium text-center">
                                Next week's sessions are locked until Sunday at 5:00 PM
                            </div>
                        )}

                        {renderAttendeesList(orderedAttendees, totalMax, courtsForDay)}

                        <div className={`mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 gap-3 relative z-20 w-full ${!user ? 'opacity-30 pointer-events-none blur-[1px]' : ''}`}>
                            {courtsForDay.map((courtName) => {
                                const courtAttendees = session.attendees.filter(a => a.endsWith(`|${courtName}`));
                                const isCourtFull = courtAttendees.length >= maxPerCourt;
                                const userInThisCourt = userEntry && (courtAttendees.includes(userEntry) || userEntry.endsWith(`|${courtName}`));
                                const userInAnotherCourt = userEntry && !userInThisCourt;

                                return (
                                    <button
                                        key={courtName}
                                        onClick={() => handleJoin(session, courtName)}
                                        disabled={isPast || isLocked || isCancelled || (isCourtFull && !userInThisCourt) || !user}
                                        className={`w-full py-3 rounded-xl font-semibold tracking-wide text-xs md:text-sm transition-all duration-300 flex items-center justify-center shadow-sm ${isPast || isCancelled ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700' :
                                            isLocked ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700' :
                                                userInThisCourt ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:shadow' :
                                                    isCourtFull ? 'bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed border border-gray-200 dark:border-slate-700' :
                                                        'bg-wimbledon-green hover:bg-[#004d00] text-white hover:shadow-md hover:-translate-y-0.5 dark:bg-[#10B981] dark:hover:bg-emerald-500'
                                            }`}
                                    >
                                        {isPast ? 'Session Ended' : isCancelled ? 'Cancelled' : isLocked ? 'Locked' : userInThisCourt ? `Drop ${courtName}` : userInAnotherCourt ? `Switch to ${courtName}` : isCourtFull ? `${courtName} Full` : `Join ${courtName}`}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="py-12 flex justify-center"><div className="w-8 h-8 border-4 border-wimbledon-green border-t-transparent rounded-full animate-spin"></div></div>;
    }

    const regularSessions = filterRegularSessionsForDisplay(sessions, activeSport);
    const openPlayInstances = getOpenPlayInstancesWithinHorizon(sessions, activeSport);
    const hasDisplayContent = openPlayInstances.length > 0 || regularSessions.length > 0;

    return (
        <section id="booking-section">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors tracking-tight uppercase">
                        RESERVE YOUR COURT
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 transition-colors">
                        Browse availability across 12 professional surfaces.
                    </p>
                </div>
            </div>

            <div className="flex justify-start mb-8 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex bg-gray-100/80 dark:bg-slate-900 p-1.5 rounded-full shadow-inner border border-gray-200 dark:border-transparent transition-colors">
                    {displayTabs.map(sport => (
                        <button
                            key={sport}
                            onClick={() => setActiveSport(sport as Sport)}
                            className={`px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 whitespace-nowrap ${activeSport === sport ? 'bg-white dark:bg-slate-800 text-wimbledon-navy dark:text-white shadow-sm opacity-100' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-white/5 opacity-80'}`}
                        >
                            {sport}
                        </button>
                    ))}
                </div>
            </div>

            {error ? (
                <div className="p-8 bg-red-50 border border-red-100 rounded-xl text-red-600 text-center text-sm shadow-sm">
                    {error}
                </div>
            ) : !hasDisplayContent && !isAdmin ? (
                <div className="p-16 text-center club-card items-center justify-center flex flex-col bg-gray-50/50 border-gray-100">
                    <Rocket className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No upcoming sessions</h3>
                    <p className="text-gray-500 text-sm max-w-sm mt-1">Check back later for court availability and coaching clinics.</p>
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
