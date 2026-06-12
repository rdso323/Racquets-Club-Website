import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Users, CalendarDays, Rocket, AlertTriangle, Lock } from 'lucide-react';
import CourtSchematic, { type CourtSlot } from './CourtSchematic';

type SessionStatus = 'active' | 'hidden' | 'cancelled';

const getBaseWeekStart = (sport: string) => {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    let weekRolloverTime = new Date(startOfWeek);
    if (sport === 'Tennis') {
        weekRolloverTime.setDate(startOfWeek.getDate() + 3); // Thursday
        weekRolloverTime.setHours(23, 0, 0, 0); // 11 PM
    } else if (sport === 'Badminton') {
        weekRolloverTime.setDate(startOfWeek.getDate() + 2); // Wednesday
        weekRolloverTime.setHours(16, 0, 0, 0); // 4 PM
    } else {
        weekRolloverTime.setDate(startOfWeek.getDate() + 6); // Sunday
        weekRolloverTime.setHours(23, 59, 59, 999);
    }

    if (now.getTime() > weekRolloverTime.getTime()) {
        startOfWeek.setDate(startOfWeek.getDate() + 7);
    }

    return startOfWeek;
};

const getPlayDate = (startOfWeek: Date, isNextWeek: boolean, dayName: string) => {
    const offset = isNextWeek ? 7 : 0;
    const date = new Date(startOfWeek);

    let dayOffset = 0;
    if (dayName === 'tuesday') dayOffset = 1;
    if (dayName === 'wednesday') dayOffset = 2;
    if (dayName === 'thursday') dayOffset = 3;

    date.setDate(startOfWeek.getDate() + dayOffset + offset);
    return date;
};

const isWeekLocked = (startOfWeek: Date, isNextWeek: boolean) => {
    const targetMonday = new Date(startOfWeek);
    if (isNextWeek) {
        targetMonday.setDate(startOfWeek.getDate() + 7);
    }

    const unlockTime = new Date(targetMonday);
    unlockTime.setDate(targetMonday.getDate() - 1); // Sunday prior
    unlockTime.setHours(17, 0, 0, 0); // 5 PM

    return new Date().getTime() < unlockTime.getTime();
};

const getWeekDateRangeDisplay = (startOfWeek: Date, isNextWeek: boolean) => {
    const targetMonday = new Date(startOfWeek);
    if (isNextWeek) {
        targetMonday.setDate(startOfWeek.getDate() + 7);
    }
    const formatDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Week of ${formatDay(targetMonday)}`;
};

type SessionType = 'coaching' | 'court';

interface Session {
    id: string;
    title: string;
    type: SessionType;
    date: string;
    time: string;
    maxAttendees: number;
    attendees: string[]; // UIDs or DisplayNames via uid|Name
    coach?: string | null;
    coachId?: string | null;
    sport?: string;
}


// Mock sports data removed for live bookings

const createICSFile = (session: Session, courtName?: string, _isCoaching = false) => {
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
        `DTSTAMP:${(() => { const d = new Date(); const p = (n: number) => n < 10 ? '0' + n : n; return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`; })()}`,
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

/* Parses the attendee string format `uid|Name|email|Court` (same rules the
   legacy roster used) into display values. */
const parseAttendee = (a: string): { name: string; tooltip: string } => {
    if (a.includes('|')) {
        const parts = a.split('|');
        const name = parts[1];
        let tooltip = '';
        if (parts.length >= 3 && parts[2].includes('@')) tooltip = parts[2];
        if (!tooltip) tooltip = name;
        return { name, tooltip };
    }
    return { name: 'Player', tooltip: 'Player' };
};

/* The preserved logged-out gate, restyled. */
const MembersGate = () => (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 dark:bg-court-950/60 backdrop-blur-[3px] rounded-b-3xl border-t border-gray-100 dark:border-court-line/10">
        <div className="glass-deep p-6 flex flex-col items-center text-center max-w-[85%] sm:max-w-xs">
            <span className="w-12 h-12 rounded-full clay-gradient flex items-center justify-center mb-3 shadow-lg">
                <Lock className="w-5 h-5 text-court-line" />
            </span>
            <h4 className="font-display text-lg text-gray-900 dark:text-court-line mb-1">Members Only</h4>
            <p className="text-xs text-gray-500 dark:text-court-line/60 font-medium">Please login to view spots and book this session.</p>
        </div>
    </div>
);

const BookingEngine = () => {
    const { user, isAdmin, tabPreferences } = useAuth();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionStatuses, setSessionStatuses] = useState<Record<string, SessionStatus>>({});
    const [activeSport, setActiveSport] = useState('Tennis');
    const [displayTabs, setDisplayTabs] = useState<string[]>([]);
    const [activeDay, setActiveDay] = useState<'tuesday' | 'thursday' | 'wednesday' | 'monday'>('tuesday');

    useEffect(() => {
        const visibleTabs = tabPreferences.filter(t => t.visible).map(t => t.id);
        if (visibleTabs.length > 0) {
            setDisplayTabs(visibleTabs);
            // Ensure active sport is still valid
            setActiveSport(prev => visibleTabs.includes(prev) ? prev : visibleTabs[0]);
        }
    }, [tabPreferences]);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sessions'), (snapshot) => {
            const sessionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Session[];

            // Auto-reset weekly coaching/clinic sessions if the week has changed
            sessionsData.forEach(async (session) => {
                if (session.type === 'coaching' || session.title.toLowerCase().includes('clinic')) {
                    // Determine the sport to fetch correct week boundary
                    let sport = session.sport;
                    if (!sport) {
                        const idLower = session.id.toLowerCase();
                        const titleLower = session.title.toLowerCase();
                        if (idLower.includes('badminton') || titleLower.includes('badminton')) {
                            sport = 'Badminton';
                        } else if (idLower.includes('squash') || titleLower.includes('squash')) {
                            sport = 'Squash';
                        } else {
                            sport = 'Tennis';
                        }
                    }

                    const baseStartOfWeek = getBaseWeekStart(sport);
                    const currentWeekStartStr = baseStartOfWeek.toISOString().split('T')[0];
                    const storedWeekStart = (session as any).weekStartDate;

                    // If weekStartDate is empty or belongs to a past week, reset the session
                    if (storedWeekStart !== currentWeekStartStr) {
                        try {
                            const sessionRef = doc(db, 'sessions', session.id);
                            await updateDoc(sessionRef, {
                                attendees: [],
                                coach: null,
                                coachId: null,
                                weekStartDate: currentWeekStartStr
                            });
                            console.log(`Weekly auto-reset triggered for coaching/clinic session: ${session.id} (${sport})`);
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

        // Fetch session statuses
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

    const handleJoin = async (sessionToJoin: Session, isMock = false, courtName?: string) => {
        if (!user || isMock) {
            if (isMock) alert("This is a demo session. Switch to Tennis for live bookings.");
            return;
        }
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
                    // Switch courts
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

    const handleCoachAction = async (session: Session, isMock = false) => {
        if (!user || !isAdmin || isMock) return;
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
                    // Build a coaching-specific session object for the ICS
                    const coachSession = {
                        ...session,
                        title: `Coaching: ${session.title}`
                    };
                    createICSFile(coachSession, undefined, true);
                }
            }
        } catch (error) {
            console.error("Error updating coach slot", error);
            alert("Failed to update coach slot.");
        }
    };

    /* Lineup sheet for clinic / coaching rosters */
    const renderAttendeesList = (attendees: string[], maxAttendees: number, isWide: boolean = false, courtNames?: string[]) => {
        const slots = Array(maxAttendees).fill(null).map((_, i) => attendees[i] || null);
        const courts = [];
        const perCourt = 4; // Display 4 slots per row (simulating 4 players per court)
        for (let i = 0; i < slots.length; i += perCourt) {
            courts.push(slots.slice(i, i + perCourt));
        }

        return (
            <div className={`my-3 grid gap-3 ${isWide && courts.length > 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
                {courts.map((court, courtIdx) => (
                    <div key={courtIdx} className="bg-gray-50/80 dark:bg-court-950/50 rounded-lg border border-gray-100 dark:border-court-line/10 p-2.5">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 dark:text-court-line/40 mb-1.5 flex justify-between">
                            <span>{courtNames ? courtNames[courtIdx] : `Court ${courtIdx + 1}`}</span>
                            <span>{court.filter(Boolean).length}/{court.length}</span>
                        </p>
                        <div className="flex gap-1.5 text-xs">
                            {court.map((p, i) => {
                                const isPresent = !!p;
                                let name = 'Open';
                                let tooltip = '';
                                if (isPresent) {
                                    const parsed = parseAttendee(p);
                                    name = parsed.name;
                                    tooltip = parsed.tooltip;
                                }
                                return (
                                    <div key={i} className={`flex-1 truncate text-center py-1.5 px-0.5 rounded-md transition-all duration-300 ${isPresent ? 'bg-wimbledon-green/10 dark:bg-court-accent/10 text-wimbledon-green dark:text-court-accent font-semibold border border-wimbledon-green/30 dark:border-court-accent/30' : 'bg-white border border-dashed border-gray-300 text-gray-400 dark:bg-transparent dark:border-court-line/20 dark:text-court-line/30'}`} title={isPresent ? tooltip : ''}>
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

    const renderCard = (session: Session, isMock = false) => {
        // Correctly map session type to category key
        const categoryKey = session.type === 'court'
            ? `${activeSport}_OpenPlay`
            : `${activeSport}_Clinic`;
        const status = sessionStatuses[categoryKey] || 'active';

        if (status === 'hidden') return null;
        const isCancelled = status === 'cancelled';

        const isFull = session.attendees.length >= session.maxAttendees;
        const isJoining = user ? session.attendees.some(a => a.startsWith(user.uid + "|") || a === user.uid) : false;

        // Apply dynamic shift logic to standard cards (assumes they are for Tennis unless categorized otherwise)
        const baseStartOfWeek = getBaseWeekStart(activeSport);
        const isLocked = isWeekLocked(baseStartOfWeek, false);
        const dateRangeDisplay = getWeekDateRangeDisplay(baseStartOfWeek, false);

        // Derive standard clinic date object for checking if it's past
        // (Assuming standard clinic is Friday)
        const clinicDateObj = new Date(baseStartOfWeek);
        clinicDateObj.setDate(baseStartOfWeek.getDate() + 4); // Friday
        clinicDateObj.setHours(14, 0, 0, 0); // Approx Start Time

        const isPast = clinicDateObj.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime();
        const formattedClinicDate = clinicDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

        const isCoachingCard = session.type === 'coaching';

        return (
            <div key={session.id} className="glass-deep overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-xl motion-safe:hover:-translate-y-1 relative rounded-3xl">
                {/* Cancelled full-card overlay — centered message over blurred card */}
                {isCancelled && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-[2px] bg-white/30 dark:bg-court-950/40 rounded-3xl">
                        <div className="bg-white dark:bg-court-900 border border-red-200 dark:border-red-900/60 shadow-lg rounded-2xl px-5 py-4 flex flex-col items-center text-center max-w-[75%]">
                            <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">Cancelled This Week</p>
                            <p className="text-xs text-gray-500 dark:text-court-line/50 mt-1 font-medium">This session won't be running this week.</p>
                        </div>
                    </div>
                )}

                <div className={`p-5 border-b relative transition-colors ${isCoachingCard ? 'border-wimbledon-gold/20 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-wimbledon-gold/[0.07] dark:to-transparent' : 'border-court-accent/20 bg-gradient-to-br from-emerald-50/80 to-green-50/40 dark:from-court-accent/[0.07] dark:to-transparent'} ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    <div className="flex justify-between items-start mb-3">
                        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] px-2.5 py-1 rounded-full text-white shadow-sm transition-colors ${isCoachingCard ? 'bg-wimbledon-navy dark:clay-gradient' : 'bg-wimbledon-green dark:bg-court-600'}`}>
                            {session.type}
                        </span>
                        <p className="text-[10px] font-bold tracking-[0.15em] uppercase px-2 py-1 rounded-full transition-colors text-gray-600 dark:text-wimbledon-gold border border-gray-200 dark:border-wimbledon-gold/30 bg-white/70 dark:bg-transparent">
                            {dateRangeDisplay}
                        </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <h3 className="font-display text-2xl text-gray-900 dark:text-court-line transition-colors">{session.title}</h3>
                        <p className="text-sm font-semibold text-gray-700 dark:text-court-line/70 w-fit whitespace-nowrap transition-colors">
                            {formattedClinicDate} <span className="text-clay-500 dark:text-clay-400 mx-1">&bull;</span> 3:00 PM - 4:00 PM
                        </p>
                    </div>
                    {isCoachingCard && (
                        <p className="text-sm text-gray-600 dark:text-court-line/60 mt-2 font-medium flex items-center transition-colors">
                            <Rocket className="w-4 h-4 mr-1.5 text-wimbledon-navy dark:text-wimbledon-gold" />
                            Instructor: <span className="text-wimbledon-navy dark:text-wimbledon-gold ml-1 font-bold">{session.coach || 'TBD'}</span>
                        </p>
                    )}
                </div>

                <div className={`p-5 flex-grow flex flex-col justify-between relative text-left ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    {!user && !isMock && <MembersGate />}

                    <div className={`${!user && !isMock ? 'opacity-40 pointer-events-none blur-[1.5px] transition-all' : ''}`}>
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-court-line/50 mb-2 uppercase tracking-wide">
                            <span className="flex items-center group relative">
                                <Users className="w-4 h-4 mr-1.5 text-gray-400 dark:text-court-line/40" />
                                {session.attendees.length} / {session.maxAttendees} Enrolled
                            </span>
                            <span className={isFull ? 'text-red-500 dark:text-red-400' : 'text-wimbledon-green dark:text-court-accent'}>{session.maxAttendees - session.attendees.length} Spots Left</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 dark:bg-court-950/70 rounded-full h-1.5 mb-2 overflow-hidden">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-700 ease-out ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-court-500 to-court-accent'}`}
                                style={{ width: `${Math.min(100, (session.attendees.length / session.maxAttendees) * 100)}%` }}
                            />
                        </div>

                        {renderAttendeesList(session.attendees, session.maxAttendees)}
                    </div>

                    <div className={`mt-auto pt-2 space-y-2 relative z-10 w-full ${!user && !isMock ? 'opacity-30 pointer-events-none blur-[1px]' : ''}`}>
                        {isLocked && !isCancelled && (
                            <div className="mb-3 bg-amber-50 dark:bg-wimbledon-gold/10 border border-amber-100 dark:border-wimbledon-gold/30 text-amber-700 dark:text-wimbledon-gold text-xs px-3 py-2 rounded-lg font-medium text-center shadow-sm flex items-center justify-center gap-1.5">
                                <Lock className="w-3 h-3" /> Locked until Sunday 5:00 PM
                            </div>
                        )}
                        <button
                            onClick={() => handleJoin(session, isMock)}
                            disabled={isMock || isPast || isLocked || isCancelled || (isFull && !isJoining) || !user}
                            className={`w-full py-2.5 rounded-xl font-bold tracking-wide text-sm transition-all duration-300 flex items-center justify-center shadow-sm ${isPast || isCancelled ? 'bg-gray-100 dark:bg-court-900/80 text-gray-400 dark:text-court-line/30 cursor-not-allowed border border-gray-200 dark:border-court-line/10' :
                                isLocked ? 'bg-gray-100 dark:bg-court-900/80 text-gray-400 dark:text-court-line/30 cursor-not-allowed border border-gray-200 dark:border-court-line/10' :
                                    isJoining ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/35 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:shadow' :
                                        isFull ? 'bg-gray-100 dark:bg-court-900/80 text-gray-400 dark:text-court-line/30 cursor-not-allowed border border-gray-200 dark:border-court-line/10' :
                                            isMock ? 'bg-gray-50 dark:bg-court-900/80 text-gray-400 dark:text-court-line/30 cursor-not-allowed border border-gray-200 dark:border-court-line/10' :
                                                'bg-wimbledon-navy dark:clay-gradient hover:bg-[#00287a] dark:hover:brightness-110 text-white hover:shadow-md motion-safe:hover:-translate-y-0.5'
                                }`}
                        >
                            {isMock ? 'Demo Enabled' : isPast ? 'Session Ended' : isCancelled ? 'Cancelled' : isLocked ? 'Locked' : isJoining ? 'Drop Session' : isFull ? 'Session Full' : 'Join Session'}
                        </button>

                        {session.type === 'coaching' && isAdmin && (
                            <button
                                onClick={() => handleCoachAction(session, isMock)}
                                className={`w-full py-2.5 rounded-xl font-bold tracking-wide text-sm transition-all duration-300 flex items-center justify-center shadow-sm ${session.coachId === user?.uid
                                    ? 'bg-amber-50 dark:bg-wimbledon-gold/10 text-amber-700 dark:text-wimbledon-gold border border-amber-200 dark:border-wimbledon-gold/40 hover:bg-amber-100 dark:hover:bg-wimbledon-gold/20 hover:shadow'
                                    : session.coachId
                                        ? 'bg-gray-100 dark:bg-court-900/80 text-gray-400 dark:text-court-line/30 cursor-not-allowed border border-gray-200 dark:border-court-line/10'
                                        : isMock
                                            ? 'bg-gray-50 dark:bg-court-900/80 text-gray-400 dark:text-court-line/30 cursor-not-allowed border border-gray-200 dark:border-court-line/10'
                                            : 'bg-wimbledon-green hover:bg-[#004d00] text-white hover:shadow-md motion-safe:hover:-translate-y-0.5 dark:bg-court-500 dark:hover:bg-court-400'
                                    }`}
                                disabled={(!!session.coachId && session.coachId !== user?.uid) || isMock}
                            >
                                {isMock ? 'Demo Mode' : session.coachId === user?.uid ? 'Drop Coach Slot' : session.coachId ? 'Coach Slot Filled' : 'Claim Coach Slot'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderGroupedOpenPlayCard = (groupedSessions: Session[], isMock: boolean) => {
        const categoryKey = `${activeSport}_OpenPlay`;
        const status = sessionStatuses[categoryKey] || 'active';

        if (status === 'hidden') return null;
        const isCancelled = status === 'cancelled';

        const baseStartOfWeek = getBaseWeekStart(activeSport);
        const isLocked = isWeekLocked(baseStartOfWeek, false);
        const dateRangeDisplay = getWeekDateRangeDisplay(baseStartOfWeek, false);

        let dayToRender = activeDay;
        if (activeSport === 'Badminton') {
            dayToRender = 'wednesday';
        } else if (activeSport === 'Squash') {
            dayToRender = 'monday';
        }

        const activeDateObj = getPlayDate(baseStartOfWeek, false, dayToRender);
        const dateStr = activeDateObj.toISOString().split('T')[0];
        const sessionId = `open_play_${activeSport.toLowerCase()}_${dayToRender}_${dateStr}`;

        // Find if this dynamic instance already exists in DB
        const dbSession = sessions.find((s: Session) => s.id === sessionId);

        let courtsForDay = ['Court 1'];
        let maxPerCourt = 4;
        let totalMax = 8;
        let timeStr = '9:00 PM - 11:00 PM';

        if (activeSport === 'Tennis') {
            courtsForDay = dayToRender === 'tuesday' ? ['Court 2', 'Court 4'] : ['Court 3', 'Court 5'];
            totalMax = 8;
            maxPerCourt = 4;
            timeStr = '9:00 PM - 11:00 PM';
        } else if (activeSport === 'Badminton') {
            courtsForDay = ['Court 1', 'Court 2'];
            totalMax = 8;
            maxPerCourt = 4;
            timeStr = '3:00 PM - 4:00 PM';
        } else if (activeSport === 'Squash') {
            courtsForDay = ['Court 1', 'Court 2'];
            totalMax = 8;
            maxPerCourt = 4;
            timeStr = '6:00 PM - 8:00 PM';
        }

        const templateSession = groupedSessions[0] || { time: timeStr, maxAttendees: totalMax };

        const session: Session = dbSession || {
            id: sessionId,
            title: `Open Play`,
            type: 'court',
            date: activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
            time: templateSession.time,
            maxAttendees: totalMax,
            attendees: [],
        };

        session.maxAttendees = totalMax;

        const isFull = session.attendees.length >= totalMax;
        const userEntry = user ? session.attendees.find(a => a.startsWith(user.uid + "|") || a === user.uid) : undefined;
        const isPast = activeDateObj.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime();

        // Bucket attendees logically to match courts
        const courtAttendeeBuckets = courtsForDay.map(c => session.attendees.filter(a => a.endsWith(`|${c}`)));
        const assignedAttendees = courtAttendeeBuckets.flat();
        const unassignedAttendees = session.attendees.filter(a => !assignedAttendees.includes(a));

        for (const a of unassignedAttendees) {
            for (let i = 0; i < courtsForDay.length; i++) {
                if (courtAttendeeBuckets[i].length < maxPerCourt) {
                    courtAttendeeBuckets[i].push(a);
                    break;
                }
            }
        }

        return (
            <div className="glass-deep relative overflow-hidden flex flex-col">
                {/* Cancelled full-card overlay */}
                {isCancelled && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center backdrop-blur-[2px] bg-white/30 dark:bg-court-950/40 rounded-3xl">
                        <div className="bg-white dark:bg-court-900 border border-red-200 dark:border-red-900/60 shadow-lg rounded-2xl px-5 py-4 flex flex-col items-center text-center max-w-[75%]">
                            <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
                            <p className="text-sm font-bold text-red-700 dark:text-red-400">Cancelled This Week</p>
                            <p className="text-xs text-gray-500 dark:text-court-line/50 mt-1 font-medium">This session won't be running this week.</p>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className={`p-6 sm:p-8 border-b border-gray-100 dark:border-court-line/10 relative transition-colors ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    <div aria-hidden="true" className="absolute top-0 right-0 p-6 opacity-[0.06] pointer-events-none">
                        <Users className="w-28 h-28 text-wimbledon-green dark:text-court-accent" />
                    </div>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 relative z-10">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-[0.25em] px-3 py-1.5 rounded-full text-white bg-wimbledon-green dark:bg-court-600 flex items-center w-fit shadow-sm transition-colors">
                                <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
                                Weekly Open Play
                            </span>
                            <h3 className="font-display text-3xl sm:text-4xl text-gray-900 dark:text-court-line mt-4 transition-colors">
                                {session.title.includes('Open Play') ? 'The Matchmaker' : session.title}
                            </h3>
                            <p className="text-sm font-medium text-gray-600 dark:text-court-line/60 mt-2 transition-colors">
                                {session.date} <span className="text-clay-500 dark:text-clay-400 mx-1">&bull;</span> {session.time}
                            </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-3">
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-wimbledon-green dark:text-wimbledon-gold border border-green-200 dark:border-wimbledon-gold/30 bg-green-50/80 dark:bg-transparent w-fit px-2.5 py-1.5 rounded-full transition-colors">
                                {dateRangeDisplay}
                            </p>
                            {activeSport === 'Tennis' && (
                                <div className="flex space-x-1.5 bg-white/80 dark:bg-court-950/60 p-1 rounded-full border border-green-200 dark:border-court-line/15 shadow-sm backdrop-blur-md">
                                    <button
                                        onClick={() => setActiveDay('tuesday')}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${activeDay === 'tuesday' ? 'bg-wimbledon-green dark:bg-court-500 text-white shadow-md' : 'text-gray-600 dark:text-court-line/60 hover:bg-white dark:hover:bg-court-800 hover:text-wimbledon-green dark:hover:text-court-line'}`}
                                    >
                                        Tuesday
                                    </button>
                                    <button
                                        onClick={() => setActiveDay('thursday')}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-300 ${activeDay === 'thursday' ? 'bg-wimbledon-green dark:bg-court-500 text-white shadow-md' : 'text-gray-600 dark:text-court-line/60 hover:bg-white dark:hover:bg-court-800 hover:text-wimbledon-green dark:hover:text-court-line'}`}
                                    >
                                        Thursday
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className={`p-6 sm:p-8 flex-grow relative text-left ${isCancelled ? 'opacity-40 blur-[1px]' : ''}`}>
                    {!user && !isMock && <MembersGate />}

                    <div className={`${!user && !isMock ? 'opacity-40 pointer-events-none blur-[1.5px] transition-all' : ''}`}>
                        <div className="flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-court-line/50 mb-2 uppercase tracking-wide">
                            <span className="flex items-center group relative">
                                <Users className="w-4 h-4 mr-1.5 text-gray-400 dark:text-court-line/40" />
                                {session.attendees.length} / {session.maxAttendees} Enrolled
                            </span>
                            <span className={isFull ? 'text-red-500 dark:text-red-400' : 'text-wimbledon-green dark:text-court-accent'}>{session.maxAttendees - session.attendees.length} Spots Left</span>
                        </div>

                        <div className="w-full bg-gray-100 dark:bg-court-950/70 rounded-full h-1.5 mb-4 overflow-hidden shadow-inner">
                            <div
                                className={`h-1.5 rounded-full transition-all duration-700 ease-out ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-court-500 to-court-accent'}`}
                                style={{ width: `${Math.min(100, (session.attendees.length / session.maxAttendees) * 100)}%` }}
                            />
                        </div>

                        {isLocked && !isCancelled && (
                            <div className="mb-5 bg-amber-50 dark:bg-wimbledon-gold/10 border border-amber-100 dark:border-wimbledon-gold/30 text-amber-700 dark:text-wimbledon-gold text-xs px-3 py-2.5 rounded-xl font-medium text-center flex items-center justify-center gap-1.5">
                                <Lock className="w-3.5 h-3.5" /> Next week's sessions are locked until Sunday at 5:00 PM
                            </div>
                        )}

                        {/* The Matchmaker courts */}
                        <div className={`grid gap-6 lg:gap-8 ${courtsForDay.length > 1 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                            {courtsForDay.map((courtName, courtIdx) => {
                                const courtAttendees = session.attendees.filter(a => a.endsWith(`|${courtName}`));
                                const isCourtFull = courtAttendees.length >= maxPerCourt;
                                const userInThisCourt = !!(userEntry && (courtAttendees.includes(userEntry) || userEntry.endsWith(`|${courtName}`)));
                                const userInAnotherCourt = !!(userEntry && !userInThisCourt);

                                const bucket = courtAttendeeBuckets[courtIdx];
                                const slots: (CourtSlot | null)[] = Array(maxPerCourt).fill(null).map((_, i) => {
                                    const a = bucket[i];
                                    if (!a) return null;
                                    const parsed = parseAttendee(a);
                                    return {
                                        name: parsed.name,
                                        tooltip: parsed.tooltip,
                                        isMine: !!(user && (a.startsWith(user.uid + "|") || a === user.uid)),
                                    };
                                });

                                const disabled = isMock || isPast || isLocked || isCancelled || (isCourtFull && !userInThisCourt) || !user;
                                const actionLabel = isMock ? 'Demo Enabled' : isPast ? 'Session Ended' : isCancelled ? 'Cancelled' : isLocked ? 'Locked' : userInThisCourt ? `Drop ${courtName}` : userInAnotherCourt ? `Switch to ${courtName}` : isCourtFull ? `${courtName} Full` : `Join ${courtName}`;

                                return (
                                    <CourtSchematic
                                        key={courtName}
                                        courtName={courtName}
                                        slots={slots}
                                        spotsLeft={Math.max(0, maxPerCourt - bucket.length)}
                                        disabled={disabled}
                                        actionLabel={actionLabel}
                                        userInThisCourt={userInThisCourt}
                                        onAction={() => handleJoin(session, isMock, courtName)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="py-16 flex flex-col items-center gap-5" role="status" aria-label="Loading sessions">
                <div className="animate-ball-bounce w-8 h-8 rounded-full bg-gradient-to-br from-lime-300 to-lime-500 shadow-[0_0_24px_rgba(163,230,53,0.4)]" />
                <div className="w-10 h-1 rounded-full bg-court-950/20 dark:bg-court-line/10" />
                <p className="text-xs uppercase tracking-[0.3em] font-semibold text-gray-400 dark:text-court-line/40">Warming up the courts</p>
            </div>
        );
    }

    // Filter sessions by active sport
    const displaySessions = sessions.filter(s => {
        if (s.sport) {
            return s.sport === activeSport;
        }
        // Fallback for older/legacy sessions without a sport field
        const idLower = s.id.toLowerCase();
        const titleLower = s.title.toLowerCase();
        if (idLower.includes('badminton') || titleLower.includes('badminton')) {
            return activeSport === 'Badminton';
        }
        if (idLower.includes('squash') || titleLower.includes('squash')) {
            return activeSport === 'Squash';
        }
        return activeSport === 'Tennis';
    });

    // Group "Open Play" sessions for the active sport
    const openPlaySessions = displaySessions.filter(s => s.type === 'court' && s.title.toLowerCase().includes('open play'));

    const regularSessions = displaySessions.filter(s => !(s.type === 'court' && s.title.toLowerCase().includes('open play')));

    return (
        <section id="booking-section" className="scroll-mt-28">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-gray-200 dark:border-court-line/10 pb-4">
                <div className="flex items-baseline gap-4">
                    <span aria-hidden="true" className="font-display italic text-2xl sm:text-3xl text-clay-500 dark:text-clay-400 leading-none">03</span>
                    <div>
                        <h2 className="font-display text-2xl sm:text-4xl text-wimbledon-navy dark:text-court-line tracking-tight transition-colors">
                            Claim Your Court
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-court-line/50 mt-2 transition-colors font-light">
                            Browse availability across 12 professional surfaces. Pick a spot, step on court.
                        </p>
                    </div>
                </div>

                {/* Sport Selector Tabs */}
                <div className="flex justify-start overflow-x-auto pb-1 scrollbar-hide">
                    <div className="flex bg-gray-100/80 dark:bg-court-900/80 p-1.5 rounded-full shadow-inner border border-gray-200 dark:border-court-line/10 transition-colors">
                        {displayTabs.map(sport => (
                            <button
                                key={sport}
                                onClick={() => setActiveSport(sport)}
                                className={`px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 whitespace-nowrap ${activeSport === sport ? 'bg-white dark:clay-gradient text-wimbledon-navy dark:text-white shadow-sm opacity-100' : 'text-gray-500 hover:text-gray-700 hover:bg-white/50 dark:text-court-line/50 dark:hover:text-court-line dark:hover:bg-white/5 opacity-80'}`}
                            >
                                {sport}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error ? (
                <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-2xl text-red-600 dark:text-red-400 text-center text-sm shadow-sm">
                    {error}
                </div>
            ) : displaySessions.length === 0 && !isAdmin ? (
                <div className="p-16 text-center glass-deep items-center justify-center flex flex-col">
                    <div aria-hidden="true" className="relative w-28 h-14 court-apron rounded-lg mb-6 opacity-70">
                        <div className="absolute inset-2 border border-court-line/50 rounded-[2px]" />
                        <div className="absolute left-1/2 top-1 bottom-1 w-px bg-court-line/50" />
                    </div>
                    <h3 className="font-display text-2xl text-gray-900 dark:text-court-line mb-2">No upcoming sessions</h3>
                    <p className="text-gray-500 dark:text-court-line/50 text-sm max-w-sm mt-1 font-light">The grounds are quiet. Check back later for court availability and coaching clinics.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {openPlaySessions.length > 0 && renderGroupedOpenPlayCard(openPlaySessions, false)}
                    {regularSessions.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {regularSessions.map(session => renderCard(session, false))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
};

export default BookingEngine;
