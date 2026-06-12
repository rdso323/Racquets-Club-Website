import { useState, useEffect, type CSSProperties } from 'react';
import { collection, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTransitionRouter } from '../system/TransitionProvider';
import { RevealLines } from '../system/kinetic';
import CourtDiagram, { type SlotNode } from './CourtDiagram';

type SessionStatus = 'active' | 'hidden' | 'cancelled';

/* ────────────────────────────────────────────────────────────────
   SCHEDULING CORE — ported verbatim from the legacy BookingEngine.
   Do not restyle the math: rollovers, locks and ICS files are law.
   ──────────────────────────────────────────────────────────────── */

const getBaseWeekStart = (sport: string) => {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const weekRolloverTime = new Date(startOfWeek);
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
    weekStartDate?: string;
}

const createICSFile = (session: Session, courtName?: string, _isCoaching = false) => {
    let startDate = new Date();
    let endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatICSDate = (date: Date) => {
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };

    const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays',
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const targetDate = new Date();
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

/* ── visual constants ─────────────────────────────────────────── */

const SPORT_THEME: Record<string, { accent: string; dim: string; code: string }> = {
    Tennis: { accent: '#D7FF3E', dim: 'rgba(215,255,62,0.14)', code: 'TNS' },
    Badminton: { accent: '#6FA8FF', dim: 'rgba(111,168,255,0.14)', code: 'BDM' },
    Squash: { accent: '#FF6A3D', dim: 'rgba(255,106,61,0.16)', code: 'SQH' },
};

const SIM_ROSTER = ['Naomi K.', 'Dev P.', 'Lena W.', 'Marcus T.', 'Iris C.'];

const parseAttendee = (a: string) => {
    const parts = a.split('|');
    return { name: parts[1] || 'Player', email: parts[2] || '', court: parts[3] || '' };
};

/* ── capacity arc ─────────────────────────────────────────────── */

const CapacityArc = ({ filled, total }: { filled: number; total: number }) => {
    const R = 30;
    const C = 2 * Math.PI * R;
    const pct = total > 0 ? Math.min(1, filled / total) : 0;
    return (
        <div className="relative h-20 w-20">
            <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
                <circle cx={36} cy={36} r={R} fill="none" stroke="rgba(237,242,228,0.12)" strokeWidth={2} />
                <circle
                    cx={36} cy={36} r={R} fill="none"
                    stroke="var(--accent)" strokeWidth={2.5}
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - pct)}
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-sm accent-text tabular-nums">{filled}/{total}</span>
            </div>
        </div>
    );
};

/* ────────────────────────────────────────────────────────────────
   COURT RADAR — the booking instrument.
   ──────────────────────────────────────────────────────────────── */

const CourtRadar = () => {
    const { user, isAdmin, tabPreferences } = useAuth();
    const { go } = useTransitionRouter();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sessionStatuses, setSessionStatuses] = useState<Record<string, SessionStatus>>({});
    const [activeSport, setActiveSport] = useState('Tennis');
    const [displayTabs, setDisplayTabs] = useState<string[]>([]);
    const [activeDay, setActiveDay] = useState<'tuesday' | 'thursday' | 'wednesday' | 'monday'>('tuesday');
    const [selectedCourt, setSelectedCourt] = useState<string | null>(null);

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
                    const storedWeekStart = session.weekStartDate;

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

    /* ── derived weekly open-play instrument (legacy math intact) ── */

    const theme = SPORT_THEME[activeSport] || SPORT_THEME.Tennis;
    const simulation = !!error;

    const categoryKeyOpenPlay = `${activeSport}_OpenPlay`;
    const openPlayStatus = sessionStatuses[categoryKeyOpenPlay] || 'active';
    const openPlayCancelled = openPlayStatus === 'cancelled';

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

    const simAttendees = simulation
        ? SIM_ROSTER.slice(0, 3).map((n, i) => `sim_${i}|${n}|sim@duke.edu|${courtsForDay[i % courtsForDay.length]}`)
        : [];

    const openPlaySession: Session = dbSession || {
        id: sessionId,
        title: `Open Play`,
        type: 'court',
        date: activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
        time: timeStr,
        maxAttendees: totalMax,
        attendees: simAttendees,
    };

    openPlaySession.maxAttendees = totalMax;

    const userEntry = user ? openPlaySession.attendees.find(a => a.startsWith(user.uid + "|") || a === user.uid) : undefined;
    const isPast = activeDateObj.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime();

    // Bucket attendees logically to match courts (legacy algorithm)
    const courtAttendeeBuckets = courtsForDay.map(c => openPlaySession.attendees.filter(a => a.endsWith(`|${c}`)));
    const assignedAttendees = courtAttendeeBuckets.flat();
    const unassignedAttendees = openPlaySession.attendees.filter(a => !assignedAttendees.includes(a));

    for (const a of unassignedAttendees) {
        for (let i = 0; i < courtsForDay.length; i++) {
            if (courtAttendeeBuckets[i].length < maxPerCourt) {
                courtAttendeeBuckets[i].push(a);
                break;
            }
        }
    }

    /* ── selection state ───────────────────────────────────────── */

    const effectiveSelected = selectedCourt && courtsForDay.includes(selectedCourt) ? selectedCourt : courtsForDay[0];
    const selectedIdx = courtsForDay.indexOf(effectiveSelected);
    const selectedBucket = courtAttendeeBuckets[selectedIdx] || [];
    const isCourtFull = selectedBucket.length >= maxPerCourt;
    const userInThisCourt = !!(userEntry && (selectedBucket.includes(userEntry) || userEntry.endsWith(`|${effectiveSelected}`)));
    const userInAnotherCourt = !!(userEntry && !userInThisCourt);

    const ctaDisabled = simulation || isPast || isLocked || openPlayCancelled || (isCourtFull && !userInThisCourt) || !user;
    const ctaLabel = simulation ? 'SIMULATION FEED' :
        isPast ? 'SESSION ENDED' :
            openPlayCancelled ? 'CANCELLED' :
                isLocked ? 'LOCKED' :
                    userInThisCourt ? `DROP ${effectiveSelected}` :
                        userInAnotherCourt ? `SWITCH TO ${effectiveSelected}` :
                            isCourtFull ? `${effectiveSelected} FULL` :
                                `JOIN ${effectiveSelected}`;

    /* ── clinics / protocol sessions (legacy filters intact) ───── */

    const displaySessions = sessions.filter(s => {
        if (s.sport) {
            return s.sport === activeSport;
        }
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

    let regularSessions = displaySessions.filter(s => !(s.type === 'court' && s.title.toLowerCase().includes('open play')));

    if (simulation) {
        regularSessions = [{
            id: `sim_clinic_${activeSport.toLowerCase()}`,
            title: `${activeSport} Clinic`,
            type: 'coaching',
            date: 'Friday',
            time: '3:00 PM - 4:00 PM',
            maxAttendees: 8,
            attendees: SIM_ROSTER.slice(0, 4).map((n, i) => `sim_c${i}|${n}|sim@duke.edu`),
            coach: 'TBD',
        }];
    }

    const clinicDateObj = new Date(baseStartOfWeek);
    clinicDateObj.setDate(baseStartOfWeek.getDate() + 4); // Friday
    clinicDateObj.setHours(14, 0, 0, 0);
    const clinicIsPast = clinicDateObj.getTime() + 24 * 60 * 60 * 1000 < new Date().getTime();
    const formattedClinicDate = clinicDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

    /* ── render ───────────────────────────────────────────────── */

    const sportTabs = displayTabs.length > 0 ? displayTabs : ['Tennis', 'Badminton', 'Squash'];
    const accentStyle = { '--accent': theme.accent, '--accent-dim': theme.dim } as CSSProperties;

    if (openPlayStatus === 'hidden' && regularSessions.length === 0) {
        return (
            <section id="radar" className="relative px-5 py-32 md:px-12" style={accentStyle}>
                <p className="hud-label text-chalk/40">▦ {activeSport.toUpperCase()} FEED CURRENTLY HIDDEN BY CONTROL</p>
            </section>
        );
    }

    return (
        <section id="radar" className="relative overflow-hidden py-24 md:py-32" style={accentStyle}>
            <div className="px-5 md:px-12">
                {/* Section header */}
                <div className="mb-4 flex items-baseline justify-between">
                    <span className="hud-label accent-text">02 / THE INSTRUMENT</span>
                    <span className="hud-label text-chalk/40">{dateRangeDisplay.toUpperCase()}</span>
                </div>

                <RevealLines
                    className="mb-3"
                    lines={[
                        <h2 key="l1" className="display-tight text-[clamp(3rem,9vw,9rem)] text-chalk">COURT</h2>,
                        <h2 key="l2" className="display-tight text-[clamp(3rem,9vw,9rem)]">
                            <span className="text-hollow-accent">RADAR</span>
                            <span className="serif-ital ml-6 align-middle text-[0.32em] text-chalk/70">select your arena</span>
                        </h2>,
                    ]}
                />

                {/* Sport frequency selector */}
                <div className="mb-12 mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 hairline-t pt-6">
                    {sportTabs.map(sport => {
                        const t = SPORT_THEME[sport] || SPORT_THEME.Tennis;
                        const active = activeSport === sport;
                        return (
                            <button
                                key={sport}
                                onClick={() => { setActiveSport(sport); setSelectedCourt(null); }}
                                data-cursor="hover"
                                className="group flex items-center gap-3"
                            >
                                <span
                                    className={`h-2 w-2 rounded-full transition-all ${active ? 'animate-blink' : 'opacity-30'}`}
                                    style={{ background: t.accent }}
                                />
                                <span
                                    className={`display-narrow text-2xl uppercase transition-colors md:text-4xl ${active ? 'text-chalk' : 'text-chalk/30 group-hover:text-chalk/60'}`}
                                >
                                    {sport}
                                </span>
                                <span className={`hud-label hidden md:block ${active ? 'accent-text' : 'text-chalk/25'}`}>{t.code}</span>
                            </button>
                        );
                    })}

                    <div className="ml-auto flex items-center gap-4">
                        {activeSport === 'Tennis' && (
                            <div className="flex border border-chalk/15">
                                {(['tuesday', 'thursday'] as const).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => { setActiveDay(d); setSelectedCourt(null); }}
                                        data-cursor="hover"
                                        className={`px-4 py-2 font-mono text-[11px] uppercase tracking-hud transition-colors ${activeDay === d ? 'accent-bg text-court' : 'text-chalk/50 hover:text-chalk'}`}
                                    >
                                        {d.slice(0, 3)}
                                    </button>
                                ))}
                            </div>
                        )}
                        {simulation && (
                            <span className="hud-label border border-ember/50 px-3 py-1.5 text-ember">⚠ OFFLINE — SIMULATION FEED</span>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <span className="hud-label animate-blink accent-text">SCANNING COURTS…</span>
                    </div>
                ) : openPlayStatus === 'hidden' ? (
                    <p className="hud-label py-12 text-chalk/40">▦ OPEN PLAY FEED HIDDEN BY CONTROL</p>
                ) : (
                    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-16">
                        {/* ── Radar field ── */}
                        <div className="relative">
                            <div className="mb-5 flex items-center justify-between">
                                <span className="hud-label text-chalk/60">
                                    OPEN PLAY — {openPlaySession.date.toUpperCase()} / {openPlaySession.time}
                                </span>
                                <span className="hud-label accent-text animate-blink">● LIVE FEED</span>
                            </div>

                            <div className={`grid gap-6 ${courtsForDay.length > 1 ? 'grid-cols-2' : 'grid-cols-1 max-w-sm'} ${openPlayCancelled ? 'opacity-40 saturate-0' : ''}`}>
                                {courtsForDay.map((courtName, idx) => {
                                    const bucket = courtAttendeeBuckets[idx];
                                    const slots: SlotNode[] = Array(maxPerCourt).fill(null).map((_, i) => {
                                        const a = bucket[i];
                                        if (!a) return { name: null, isYou: false };
                                        const parsed = parseAttendee(a);
                                        return { name: parsed.name, isYou: !!(user && a.startsWith(user.uid + '|')) };
                                    });
                                    return (
                                        <CourtDiagram
                                            key={courtName}
                                            sport={activeSport}
                                            courtName={courtName}
                                            slots={slots}
                                            selected={effectiveSelected === courtName}
                                            dimmed={effectiveSelected !== courtName}
                                            locked={isLocked && !openPlayCancelled}
                                            redact={!user}
                                            onSelect={() => setSelectedCourt(courtName)}
                                        />
                                    );
                                })}
                            </div>

                            {openPlayCancelled && (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                    <span className="display-tight -rotate-12 border-2 border-alert px-8 py-3 text-4xl text-alert md:text-6xl">
                                        CANCELLED
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* ── Mission dossier ── */}
                        <AnimatePresence mode="wait">
                            <motion.aside
                                key={`${activeSport}-${effectiveSelected}-${dayToRender}`}
                                initial={{ opacity: 0, x: 40 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                className="hairline relative flex flex-col bg-carbon/60 p-6 backdrop-blur-sm md:p-8 self-start lg:sticky lg:top-24"
                            >
                                <div className="mb-6 flex items-start justify-between">
                                    <div>
                                        <p className="hud-label accent-text mb-2">MISSION DOSSIER</p>
                                        <h3 className="display-narrow text-4xl text-chalk md:text-5xl">{effectiveSelected.toUpperCase()}</h3>
                                        <p className="hud-label mt-2 text-chalk/50">
                                            {activeSport.toUpperCase()} — {openPlaySession.date.toUpperCase()}
                                        </p>
                                    </div>
                                    <CapacityArc filled={selectedBucket.length} total={maxPerCourt} />
                                </div>

                                {/* Roster */}
                                <div className="mb-6 flex flex-col gap-1.5">
                                    {Array(maxPerCourt).fill(null).map((_, i) => {
                                        const a = selectedBucket[i];
                                        const parsed = a ? parseAttendee(a) : null;
                                        const isYou = !!(user && a && a.startsWith(user.uid + '|'));
                                        return (
                                            <div
                                                key={i}
                                                className={`flex items-center justify-between border-b border-chalk/8 py-2.5 font-mono text-xs uppercase tracking-wider ${parsed ? 'text-chalk/85' : 'text-chalk/30'}`}
                                                title={parsed?.email && user ? parsed.email : undefined}
                                            >
                                                <span className="flex items-center gap-3">
                                                    <span className="hud-label text-chalk/35">P{i + 1}</span>
                                                    {parsed ? (
                                                        user ? (
                                                            <span className={isYou ? 'accent-text' : ''}>{isYou ? `${parsed.name} (YOU)` : parsed.name}</span>
                                                        ) : (
                                                            <span className="redacted">{parsed.name}</span>
                                                        )
                                                    ) : (
                                                        <span>OPEN SLOT</span>
                                                    )}
                                                </span>
                                                <span className={`h-1.5 w-1.5 rounded-full ${parsed ? 'accent-bg' : 'border border-chalk/30'}`} />
                                            </div>
                                        );
                                    })}
                                </div>

                                {isLocked && !openPlayCancelled && (
                                    <p className="hud-label mb-4 border border-chalk/20 px-3 py-2.5 text-chalk/60">
                                        ▦ GRID LOCKED — OPENS SUNDAY 17:00 EST
                                    </p>
                                )}

                                {/* CTA — same routing into handleJoin as legacy court buttons */}
                                {user ? (
                                    <button
                                        onClick={() => handleJoin(openPlaySession, simulation, effectiveSelected)}
                                        disabled={ctaDisabled}
                                        data-cursor="hover"
                                        data-cursor-label={ctaDisabled ? undefined : 'TRANSMIT'}
                                        className={`group relative w-full overflow-hidden py-4 font-mono text-sm uppercase tracking-hud transition-all ${ctaDisabled
                                            ? 'cursor-not-allowed border border-chalk/15 text-chalk/35'
                                            : userInThisCourt
                                                ? 'border border-alert/70 text-alert hover:bg-alert hover:text-court'
                                                : 'accent-bg text-court hover:brightness-110'
                                            }`}
                                    >
                                        <span className="relative z-10">{ctaLabel} →</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => go('/login', 'ACCESS')}
                                        data-cursor="hover"
                                        data-cursor-label="AIRLOCK"
                                        className="w-full border accent-border py-4 font-mono text-sm uppercase tracking-hud accent-text transition-all hover:accent-bg hover:text-court"
                                    >
                                        AUTHENTICATE TO BOOK →
                                    </button>
                                )}

                                <p className="hud-label mt-4 text-center text-[8px] text-chalk/30">
                                    CONFIRMED BOOKINGS OFFER AN .ICS CALENDAR DROP
                                </p>
                            </motion.aside>
                        </AnimatePresence>
                    </div>
                )}

                {/* ── PROTOCOLS: clinics + custom sessions ── */}
                {regularSessions.length > 0 && (
                    <div className="mt-28">
                        <div className="mb-8 flex items-baseline justify-between hairline-b pb-4">
                            <h3 className="display-narrow text-3xl text-chalk md:text-5xl">
                                TRAINING <span className="text-hollow">PROTOCOLS</span>
                            </h3>
                            <span className="hud-label text-chalk/40">{regularSessions.length} ACTIVE</span>
                        </div>

                        <div className="grid gap-px bg-chalk/10 sm:grid-cols-2 xl:grid-cols-3">
                            {regularSessions.map((session) => {
                                const categoryKey = session.type === 'court'
                                    ? `${activeSport}_OpenPlay`
                                    : `${activeSport}_Clinic`;
                                const status = sessionStatuses[categoryKey] || 'active';
                                if (status === 'hidden') return null;
                                const isCancelled = status === 'cancelled';

                                const isFull = session.attendees.length >= session.maxAttendees;
                                const isJoining = user ? session.attendees.some(a => a.startsWith(user.uid + "|") || a === user.uid) : false;
                                const sessionLocked = isWeekLocked(baseStartOfWeek, false);

                                const joinDisabled = simulation || clinicIsPast || sessionLocked || isCancelled || (isFull && !isJoining) || !user;
                                const joinLabel = simulation ? 'SIMULATION' :
                                    clinicIsPast ? 'SESSION ENDED' :
                                        isCancelled ? 'CANCELLED' :
                                            sessionLocked ? 'LOCKED' :
                                                isJoining ? 'DROP SESSION' :
                                                    isFull ? 'SESSION FULL' : 'JOIN SESSION';

                                return (
                                    <div key={session.id} className={`relative flex flex-col bg-court p-6 transition-colors hover:bg-carbon ${isCancelled ? 'opacity-50' : ''}`}>
                                        <div className="mb-5 flex items-start justify-between">
                                            <span className={`hud-label border px-2 py-1 ${session.type === 'coaching' ? 'accent-border accent-text' : 'border-chalk/25 text-chalk/60'}`}>
                                                {session.type === 'coaching' ? '◆ COACHING' : '■ COURT'}
                                            </span>
                                            <span className="hud-label text-chalk/40 tabular-nums">{session.attendees.length}/{session.maxAttendees}</span>
                                        </div>

                                        <h4 className="display-narrow mb-1 text-2xl uppercase text-chalk md:text-3xl">{session.title}</h4>
                                        <p className="hud-label mb-5 text-chalk/50">
                                            {formattedClinicDate.toUpperCase()} — {(session.time || '3:00 PM - 4:00 PM').toUpperCase()}
                                        </p>

                                        {session.type === 'coaching' && (
                                            <p className="hud-label mb-4 text-chalk/60">
                                                INSTRUCTOR: <span className="accent-text">{(session.coach || 'TBD').toUpperCase()}</span>
                                            </p>
                                        )}

                                        {/* capacity rail */}
                                        <div className="mb-4 h-px w-full bg-chalk/10">
                                            <div
                                                className="h-px accent-bg transition-all duration-700"
                                                style={{ width: `${Math.min(100, (session.attendees.length / session.maxAttendees) * 100)}%` }}
                                            />
                                        </div>

                                        {/* roster chips */}
                                        <div className="mb-6 flex flex-wrap gap-1.5">
                                            {session.attendees.length === 0 ? (
                                                <span className="hud-label text-chalk/30">NO PLAYERS ON FEED</span>
                                            ) : (
                                                session.attendees.slice(0, 8).map((a, i) => {
                                                    const parsed = parseAttendee(a);
                                                    const isYou = !!(user && a.startsWith(user.uid + '|'));
                                                    return (
                                                        <span
                                                            key={i}
                                                            className={`border px-2 py-1 font-mono text-[10px] uppercase ${isYou ? 'accent-border accent-text' : 'border-chalk/15 text-chalk/65'}`}
                                                            title={user && parsed.email.includes('@') ? parsed.email : undefined}
                                                        >
                                                            {user ? parsed.name : <span className="redacted">{parsed.name}</span>}
                                                        </span>
                                                    );
                                                })
                                            )}
                                            {session.attendees.length > 8 && (
                                                <span className="hud-label self-center text-chalk/40">+{session.attendees.length - 8}</span>
                                            )}
                                        </div>

                                        <div className="mt-auto flex flex-col gap-2">
                                            {user ? (
                                                <button
                                                    onClick={() => handleJoin(session, simulation)}
                                                    disabled={joinDisabled}
                                                    data-cursor="hover"
                                                    className={`w-full py-3 font-mono text-xs uppercase tracking-hud transition-all ${joinDisabled
                                                        ? 'cursor-not-allowed border border-chalk/15 text-chalk/35'
                                                        : isJoining
                                                            ? 'border border-alert/70 text-alert hover:bg-alert hover:text-court'
                                                            : 'accent-bg text-court hover:brightness-110'
                                                        }`}
                                                >
                                                    {joinLabel} →
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => go('/login', 'ACCESS')}
                                                    data-cursor="hover"
                                                    className="w-full border accent-border py-3 font-mono text-xs uppercase tracking-hud accent-text transition-all hover:accent-bg hover:text-court"
                                                >
                                                    AUTHENTICATE →
                                                </button>
                                            )}

                                            {session.type === 'coaching' && isAdmin && (
                                                <button
                                                    onClick={() => handleCoachAction(session, simulation)}
                                                    disabled={(!!session.coachId && session.coachId !== user?.uid) || simulation}
                                                    data-cursor="hover"
                                                    className={`w-full border py-3 font-mono text-xs uppercase tracking-hud transition-all ${(!!session.coachId && session.coachId !== user?.uid) || simulation
                                                        ? 'cursor-not-allowed border-chalk/15 text-chalk/35'
                                                        : 'border-chalk/40 text-chalk hover:bg-chalk hover:text-court'
                                                        }`}
                                                >
                                                    {simulation ? 'DEMO MODE' : session.coachId === user?.uid ? 'DROP COACH SLOT' : session.coachId ? 'COACH SLOT FILLED' : 'CLAIM COACH SLOT'}
                                                </button>
                                            )}
                                        </div>

                                        {isCancelled && (
                                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-court/60">
                                                <span className="display-narrow -rotate-6 border border-alert px-4 py-1 text-xl text-alert">CANCELLED THIS WEEK</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default CourtRadar;
