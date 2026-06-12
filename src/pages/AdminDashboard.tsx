import { useState, useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, onSnapshot, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTransitionRouter } from '../components/system/TransitionProvider';

/*
 * CONTROL — the operations deck. A telemetry console for broadcast,
 * sessions, transmissions and the inbox. Every Firestore handler is
 * carried over from the legacy dashboard, byte for byte.
 */

type SessionStatus = 'active' | 'hidden' | 'cancelled';
type SessionType = 'coaching' | 'court';

interface Session {
    id: string;
    title: string;
    type: SessionType;
    date: string;
    time: string;
    maxAttendees: number;
    attendees: string[]; // array of uid|name|email or uid|name|email|court
    coach?: string | null;
    coachId?: string | null;
    sport?: string;
}

interface Event {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    image: string;
    link?: string;
}

interface FeedbackItem {
    id: string;
    type: 'bug' | 'improvement' | 'other';
    message: string;
    email: string;
    userId: string;
    createdAt?: any;
}

const CATEGORIES = [
    { id: 'Tennis_OpenPlay', label: 'Tennis Open Play' },
    { id: 'Tennis_Clinic', label: 'Tennis Clinic' },
    { id: 'Badminton_OpenPlay', label: 'Badminton Open Play' },
    { id: 'Badminton_Clinic', label: 'Badminton Clinic' },
    { id: 'Squash_OpenPlay', label: 'Squash Open Play' },
    { id: 'Squash_Clinic', label: 'Squash Clinic' }
];

/* shared console field styles */
const FIELD = 'w-full border border-chalk/15 bg-carbon px-3.5 py-3 font-mono text-xs text-chalk placeholder-chalk/30 transition-colors focus:border-ace focus:outline-none';
const LABEL = 'hud-label mb-1.5 block text-chalk/45';
const SPORT_DOT: Record<string, string> = { Tennis: '#D7FF3E', Badminton: '#6FA8FF', Squash: '#FF6A3D' };

const AdminDashboard = () => {
    const { user } = useAuth();
    const { go } = useTransitionRouter();
    const [activeTab, setActiveTab] = useState<'settings' | 'sessions' | 'events' | 'feedback'>('settings');
    const [loading, setLoading] = useState(true);

    // Ticker State
    const [tickerText, setTickerText] = useState('');
    const [savingTicker, setSavingTicker] = useState(false);
    const [message, setMessage] = useState('');

    // Session Status State
    const [sessionStatuses, setSessionStatuses] = useState<Record<string, SessionStatus>>({});
    const [savingStatuses, setSavingStatuses] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Real-time Lists State
    const [sessionsList, setSessionsList] = useState<Session[]>([]);
    const [eventsList, setEventsList] = useState<Event[]>([]);
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);

    // Form creation states
    const [newSession, setNewSession] = useState({
        title: '',
        sport: 'Tennis',
        type: 'court' as SessionType,
        date: '',
        time: '',
        maxAttendees: 4,
        coach: '',
    });
    const [sessionDateInput, setSessionDateInput] = useState(''); // helper YYYY-MM-DD
    const [newSessionSaving, setNewSessionSaving] = useState(false);
    const [newSessionMsg, setNewSessionMsg] = useState('');

    const [newEvent, setNewEvent] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        image: '',
        link: ''
    });
    const [savingEvent, setSavingEvent] = useState(false);
    const [eventMessage, setEventMessage] = useState('');

    // Editing states
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);

    // Attendee lists manual add states
    const [newAttendeeName, setNewAttendeeName] = useState<Record<string, string>>({});
    const [newAttendeeCourt, setNewAttendeeCourt] = useState<Record<string, string>>({});

    // Filter states
    const [sessionsSportFilter, setSessionsSportFilter] = useState('All');

    // Refs for scrolling to Create Session form
    const createSessionFormRef = useRef<HTMLDivElement>(null);

    // Fetch and sync data
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Fetch ticker
                const tickerRef = doc(db, 'settings', 'ticker');
                const tickerSnap = await getDoc(tickerRef);
                if (tickerSnap.exists()) {
                    setTickerText(tickerSnap.data().text || '');
                }

                // Fetch session statuses
                const statusRef = doc(db, 'settings', 'sessionStatus');
                const statusSnap = await getDoc(statusRef);
                if (statusSnap.exists()) {
                    setSessionStatuses(statusSnap.data() as Record<string, SessionStatus>);
                } else {
                    const defaults: Record<string, SessionStatus> = {};
                    CATEGORIES.forEach(cat => defaults[cat.id] = 'active');
                    setSessionStatuses(defaults);
                }
            } catch (error) {
                console.error("Error fetching admin settings", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();

        // Real-time sessions sync
        const unsubscribeSessions = onSnapshot(collection(db, 'sessions'), (snapshot) => {
            const list = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })) as Session[];
            setSessionsList(list);
        }, (err) => console.error("Real-time sessions subscription error", err));

        // Real-time events sync
        const unsubscribeEvents = onSnapshot(collection(db, 'events'), (snapshot) => {
            const list = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })) as Event[];
            setEventsList(list);
        }, (err) => console.error("Real-time events subscription error", err));

        // Real-time feedback sync
        const unsubscribeFeedback = onSnapshot(collection(db, 'feedback'), (snapshot) => {
            const list = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })) as FeedbackItem[];
            // Sort by timestamp descending
            list.sort((a, b) => {
                const timeA = a.createdAt?.seconds || 0;
                const timeB = b.createdAt?.seconds || 0;
                return timeB - timeA;
            });
            setFeedbackList(list);
        }, (err) => console.error("Real-time feedback subscription error", err));

        return () => {
            unsubscribeSessions();
            unsubscribeEvents();
            unsubscribeFeedback();
        };
    }, []);

    // Scroll to new session form
    const triggerQuickSession = () => {
        setActiveTab('sessions');
        setTimeout(() => {
            createSessionFormRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // Save ticker text
    const handleSaveTicker = async () => {
        setSavingTicker(true);
        setMessage('');
        try {
            await setDoc(doc(db, 'settings', 'ticker'), { text: tickerText }, { merge: true });
            setMessage('Ticker updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error updating ticker", error);
            setMessage('Error updating ticker.');
        } finally {
            setSavingTicker(false);
        }
    };

    // Save visibility statuses
    const handleSaveStatuses = async () => {
        setSavingStatuses(true);
        setStatusMessage('');
        try {
            await setDoc(doc(db, 'settings', 'sessionStatus'), sessionStatuses);
            setStatusMessage('Statuses updated successfully!');
            setTimeout(() => setStatusMessage(''), 3000);
        } catch (error) {
            console.error("Error updating statuses", error);
            setStatusMessage('Error updating statuses.');
        } finally {
            setSavingStatuses(false);
        }
    };

    const updateStatus = (id: string, status: SessionStatus) => {
        setSessionStatuses(prev => ({ ...prev, [id]: status }));
    };

    // Remove feedback item
    const handleDeleteFeedback = async (id: string) => {
        if (!window.confirm("Are you sure you want to dismiss this feedback?")) return;
        try {
            await deleteDoc(doc(db, 'feedback', id));
        } catch (error) {
            console.error("Error deleting feedback:", error);
            alert("Failed to delete feedback record.");
        }
    };

    // scanning for and removing duplicates
    const removeDuplicates = async () => {
        if (!window.confirm("Are you sure you want to scan for and delete duplicate events and sessions?")) return;
        setStatusMessage('Scanning for duplicates...');
        try {
            const removeDupesInCol = async (colName: string) => {
                const snap = await getDocs(collection(db, colName));
                const seen = new Set<string>();
                let deletedCount = 0;
                for (const docSnap of snap.docs) {
                    const data = docSnap.data();
                    const key = `${data.title}-${data.date}`; // use title and date as unique key
                    if (seen.has(key)) {
                        await deleteDoc(doc(db, colName, docSnap.id));
                        deletedCount++;
                    } else {
                        seen.add(key);
                    }
                }
                return deletedCount;
            };

            const deletedEvents = await removeDupesInCol('events');
            const deletedSessions = await removeDupesInCol('sessions');

            setStatusMessage(`Removed ${deletedEvents} duplicate events and ${deletedSessions} duplicate sessions.`);
            setTimeout(() => setStatusMessage(''), 5000);
        } catch (error) {
            console.error(error);
            setStatusMessage('Error while attempting to remove duplicates.');
        }
    };

    // Helper date formatter YYYY-MM-DD to "weekday, month day"
    const formatSelectedDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return '';
        const [year, month, day] = parts.map(Number);
        if (isNaN(year) || isNaN(month) || isNaN(day)) return '';
        const dateObj = new Date(year, month - 1, day);
        return dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    };

    // Create session
    const handleAddSession = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSession.title || !newSession.date || !newSession.time) {
            setNewSessionMsg('Please fill in all required fields.');
            return;
        }
        setNewSessionSaving(true);
        setNewSessionMsg('');
        try {
            const sessionData = {
                title: newSession.title,
                sport: newSession.sport,
                type: newSession.type,
                date: newSession.date,
                time: newSession.time,
                maxAttendees: Number(newSession.maxAttendees),
                attendees: [],
                coach: newSession.type === 'coaching' ? (newSession.coach || 'TBD') : null,
                coachId: null,
                weekStartDate: sessionDateInput // Store base date input for rollover checks
            };
            await addDoc(collection(db, 'sessions'), sessionData);
            setNewSessionMsg('Session scheduled successfully!');
            // Reset form
            setNewSession({
                title: '',
                sport: 'Tennis',
                type: 'court',
                date: '',
                time: '',
                maxAttendees: 4,
                coach: ''
            });
            setSessionDateInput('');
            setTimeout(() => setNewSessionMsg(''), 3000);
        } catch (err) {
            console.error("Error creating session:", err);
            setNewSessionMsg('Error creating session.');
        } finally {
            setNewSessionSaving(false);
        }
    };

    // Edit session
    const handleSaveSessionEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSession) return;
        try {
            await updateDoc(doc(db, 'sessions', editingSession.id), {
                title: editingSession.title,
                sport: editingSession.sport,
                type: editingSession.type,
                date: editingSession.date,
                time: editingSession.time,
                maxAttendees: Number(editingSession.maxAttendees),
                coach: editingSession.type === 'coaching' ? (editingSession.coach || 'TBD') : null
            });
            setEditingSession(null);
        } catch (err) {
            console.error("Error saving session edit:", err);
            alert("Error updating session.");
        }
    };

    // Delete session
    const handleDeleteSession = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this session?")) return;
        try {
            await deleteDoc(doc(db, 'sessions', id));
        } catch (err) {
            console.error("Error deleting session:", err);
            alert("Error deleting session.");
        }
    };

    // Roster management: add attendee
    const handleAddAttendee = async (sessionId: string) => {
        const name = newAttendeeName[sessionId]?.trim();
        if (!name) return;
        const court = newAttendeeCourt[sessionId]?.trim() || '';

        const uid = `manual_${Date.now()}`;
        const email = `${name.toLowerCase().replace(/\s+/g, '')}@manual.club`;
        const attendeeString = court ? `${uid}|${name}|${email}|${court}` : `${uid}|${name}|${email}`;

        try {
            await updateDoc(doc(db, 'sessions', sessionId), {
                attendees: arrayUnion(attendeeString)
            });
            setNewAttendeeName(prev => ({ ...prev, [sessionId]: '' }));
            setNewAttendeeCourt(prev => ({ ...prev, [sessionId]: '' }));
        } catch (err) {
            console.error("Error adding attendee: ", err);
            alert("Failed to add attendee.");
        }
    };

    // Roster management: remove attendee
    const handleRemoveAttendee = async (sessionId: string, attendeeStr: string) => {
        const parts = attendeeStr.split('|');
        const name = parts[1] || 'Player';
        if (!window.confirm(`Are you sure you want to remove ${name} from this session?`)) return;
        try {
            await updateDoc(doc(db, 'sessions', sessionId), {
                attendees: arrayRemove(attendeeStr)
            });
        } catch (err) {
            console.error("Error removing attendee: ", err);
            alert("Failed to remove attendee.");
        }
    };

    // Events management: add event
    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingEvent(true);
        setEventMessage('');
        try {
            await addDoc(collection(db, 'events'), newEvent);
            setEventMessage('Event added successfully!');
            setNewEvent({ title: '', date: '', time: '', location: '', image: '', link: '' });
            setTimeout(() => setEventMessage(''), 3000);
        } catch (error) {
            console.error("Error adding event", error);
            setEventMessage('Error adding event.');
        } finally {
            setSavingEvent(false);
        }
    };

    // Events management: edit event
    const handleSaveEventEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent) return;
        try {
            await setDoc(doc(db, 'events', editingEvent.id), {
                title: editingEvent.title,
                date: editingEvent.date,
                time: editingEvent.time,
                location: editingEvent.location,
                image: editingEvent.image,
                link: editingEvent.link || ''
            }, { merge: true });
            setEditingEvent(null);
        } catch (err) {
            console.error("Error updating event:", err);
            alert("Failed to edit event.");
        }
    };

    // Events management: delete event
    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            await deleteDoc(doc(db, 'events', id));
        } catch (err) {
            console.error("Error deleting event:", err);
            alert("Error deleting event.");
        }
    };

    // Parse attendee string utility
    const parseAttendee = (attendeeStr: string) => {
        const parts = attendeeStr.split('|');
        const uid = parts[0] || '';
        const name = parts[1] || 'Unknown Player';
        const email = parts[2] || 'No Email';
        const court = parts[3] || '';
        return { uid, name, email, court, raw: attendeeStr };
    };

    /* ── render ───────────────────────────────────────────────── */

    const MODULES = [
        { id: 'settings' as const, code: 'M.01', label: 'BROADCAST', sub: 'WIRE + GRID STATUS', count: null },
        { id: 'sessions' as const, code: 'M.02', label: 'SESSIONS', sub: 'COURTS + ROSTERS', count: sessionsList.length },
        { id: 'events' as const, code: 'M.03', label: 'SIGNALS', sub: 'EVENTS REEL', count: eventsList.length },
        { id: 'feedback' as const, code: 'M.04', label: 'INBOX', sub: 'MEMBER FEEDBACK', count: feedbackList.length },
    ];

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center">
                <span className="hud-label animate-blink text-ace">BOOTING CONTROL DECK…</span>
            </main>
        );
    }

    return (
        <motion.main
            className="relative min-h-screen px-5 pb-24 pt-28 md:px-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            {/* Deck header */}
            <div className="hairline-b mb-10 flex flex-col gap-6 pb-8 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="hud-label mb-3 text-ace">● OPERATIONS — RESTRICTED FREQUENCY</p>
                    <h1 className="display-tight text-6xl text-chalk md:text-8xl">
                        CONTROL<span className="text-ace">.</span>
                    </h1>
                    <p className="hud-label mt-3 text-chalk/50">
                        OPERATOR: <span className="text-ace">{user?.email?.toUpperCase()}</span>
                    </p>
                </div>
                <div className="flex gap-px bg-chalk/10">
                    <button
                        onClick={removeDuplicates}
                        data-cursor="hover"
                        className="bg-court px-5 py-3.5 font-mono text-[10px] uppercase tracking-hud text-alert transition-colors hover:bg-carbon"
                    >
                        ⌦ SCAN DUPLICATES
                    </button>
                    <button
                        onClick={() => go('/', 'INDEX')}
                        data-cursor="hover"
                        className="bg-court px-5 py-3.5 font-mono text-[10px] uppercase tracking-hud text-chalk/70 transition-colors hover:bg-carbon hover:text-chalk"
                    >
                        ← LIVE SITE
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-10 lg:flex-row">
                {/* ── Module rail ── */}
                <aside className="w-full shrink-0 lg:w-64">
                    <div className="flex flex-row gap-px overflow-x-auto bg-chalk/10 no-scrollbar lg:flex-col lg:sticky lg:top-24">
                        {MODULES.map((mod) => {
                            const active = activeTab === mod.id;
                            return (
                                <button
                                    key={mod.id}
                                    onClick={() => setActiveTab(mod.id)}
                                    data-cursor="hover"
                                    className={`group relative flex min-w-[10rem] flex-1 flex-col gap-1 p-5 text-left transition-colors lg:min-w-0 ${active ? 'bg-carbon' : 'bg-court hover:bg-carbon/60'}`}
                                >
                                    <span className={`hud-label ${active ? 'text-ace' : 'text-chalk/35'}`}>{mod.code}</span>
                                    <span className={`display-narrow text-2xl ${active ? 'text-chalk' : 'text-chalk/55 group-hover:text-chalk'}`}>
                                        {mod.label}
                                        {mod.count !== null && mod.count > 0 && (
                                            <span className="ml-2 align-middle font-mono text-[10px] text-ace">[{mod.count}]</span>
                                        )}
                                    </span>
                                    <span className="hud-label text-[8px] text-chalk/35">{mod.sub}</span>
                                    {active && <span className="absolute inset-y-0 left-0 w-0.5 bg-ace" />}
                                </button>
                            );
                        })}
                        <button
                            onClick={triggerQuickSession}
                            data-cursor="hover"
                            className="flex min-w-[10rem] items-center justify-center gap-2 bg-ace p-5 font-mono text-[11px] uppercase tracking-hud text-court transition-all hover:brightness-110 lg:min-w-0"
                        >
                            + QUICK SESSION
                        </button>
                    </div>
                </aside>

                {/* ── Module canvas ── */}
                <div className="min-h-[600px] flex-grow">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {/* ════ BROADCAST ════ */}
                            {activeTab === 'settings' && (
                                <div className="space-y-14">
                                    <div>
                                        <div className="mb-2 flex items-baseline justify-between">
                                            <h2 className="display-narrow text-3xl text-chalk">THE WIRE</h2>
                                            <span className="hud-label text-chalk/40">SETTINGS / TICKER</span>
                                        </div>
                                        <p className="hud-label mb-6 text-chalk/45">
                                            FEEDS THE KINETIC MARQUEE ON THE INDEX. SPLIT IDEAS WITH DOTS • OR PIPES |
                                        </p>
                                        <textarea
                                            value={tickerText}
                                            onChange={(e) => setTickerText(e.target.value)}
                                            className={`${FIELD} h-36 resize-none leading-relaxed`}
                                            placeholder="TYPE BROADCAST COPY…"
                                        />
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className={`hud-label ${message.includes('Error') ? 'text-alert' : 'text-ace'}`}>{message.toUpperCase()}</span>
                                            <button
                                                onClick={handleSaveTicker}
                                                disabled={savingTicker}
                                                data-cursor="hover"
                                                className="bg-ace px-6 py-3 font-mono text-[11px] uppercase tracking-hud text-court transition-all hover:brightness-110 disabled:opacity-40"
                                            >
                                                {savingTicker ? 'TRANSMITTING…' : 'PUSH TO WIRE →'}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-baseline justify-between">
                                            <h2 className="display-narrow text-3xl text-chalk">GRID STATUS</h2>
                                            <span className="hud-label text-chalk/40">VISIBILITY MATRIX</span>
                                        </div>
                                        <p className="hud-label mb-6 text-chalk/45">
                                            ARM / HIDE / SCRUB EACH WEEKLY CATEGORY ON THE COURT RADAR
                                        </p>
                                        <div className="grid gap-px bg-chalk/10 md:grid-cols-2">
                                            {CATEGORIES.map(cat => {
                                                const sport = cat.id.split('_')[0];
                                                return (
                                                    <div key={cat.id} className="bg-court p-5">
                                                        <p className="hud-label mb-3 flex items-center gap-2 text-chalk/80">
                                                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: SPORT_DOT[sport] }} />
                                                            {cat.label.toUpperCase()}
                                                        </p>
                                                        <div className="flex gap-px bg-chalk/10">
                                                            {(['active', 'hidden', 'cancelled'] as SessionStatus[]).map(status => {
                                                                const selected = sessionStatuses[cat.id] === status;
                                                                return (
                                                                    <button
                                                                        key={status}
                                                                        onClick={() => updateStatus(cat.id, status)}
                                                                        data-cursor="hover"
                                                                        className={`flex-1 py-2.5 font-mono text-[9px] uppercase tracking-hud transition-colors ${selected
                                                                            ? status === 'active' ? 'bg-ace text-court'
                                                                                : status === 'hidden' ? 'bg-chalk/25 text-chalk'
                                                                                    : 'bg-alert text-court'
                                                                            : 'bg-carbon text-chalk/40 hover:text-chalk'}`}
                                                                    >
                                                                        {status === 'active' ? '● LIVE' : status === 'hidden' ? '◌ HIDDEN' : '✕ SCRUB'}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className={`hud-label ${statusMessage.includes('Error') ? 'text-alert' : 'text-ace'}`}>{statusMessage.toUpperCase()}</span>
                                            <button
                                                onClick={handleSaveStatuses}
                                                disabled={savingStatuses}
                                                data-cursor="hover"
                                                className="bg-ace px-6 py-3 font-mono text-[11px] uppercase tracking-hud text-court transition-all hover:brightness-110 disabled:opacity-40"
                                            >
                                                {savingStatuses ? 'ARMING…' : 'COMMIT MATRIX →'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* ════ SESSIONS ════ */}
                            {activeTab === 'sessions' && (
                                <div className="space-y-14">
                                    <div>
                                        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                                            <div>
                                                <h2 className="display-narrow text-3xl text-chalk">LIVE SESSIONS</h2>
                                                <p className="hud-label mt-1 text-chalk/45">ROSTERS, CAPACITIES AND SCRUBS — LIVE ON THE GRID</p>
                                            </div>
                                            <div className="flex gap-px bg-chalk/10">
                                                {['All', 'Tennis', 'Badminton', 'Squash'].map(sport => (
                                                    <button
                                                        key={sport}
                                                        onClick={() => setSessionsSportFilter(sport)}
                                                        data-cursor="hover"
                                                        className={`px-4 py-2 font-mono text-[10px] uppercase tracking-hud transition-colors ${sessionsSportFilter === sport ? 'bg-ace text-court' : 'bg-carbon text-chalk/50 hover:text-chalk'}`}
                                                    >
                                                        {sport}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {sessionsList.length === 0 ? (
                                            <div className="border border-dashed border-chalk/15 py-16 text-center">
                                                <p className="hud-label text-chalk/40">NO SCHEDULED SESSIONS ON THE FIRESTORE GRID</p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-px bg-chalk/10 md:grid-cols-2">
                                                {sessionsList
                                                    .filter(s => sessionsSportFilter === 'All' || s.sport?.toLowerCase() === sessionsSportFilter.toLowerCase())
                                                    .map(session => {
                                                        const enrolledCount = session.attendees?.length || 0;
                                                        const isFull = enrolledCount >= session.maxAttendees;

                                                        return (
                                                            <div key={session.id} className="flex flex-col bg-court p-6 transition-colors hover:bg-carbon/70">
                                                                <div className="mb-4 flex items-start justify-between">
                                                                    <div>
                                                                        <span className="hud-label flex items-center gap-2 text-chalk/50">
                                                                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: SPORT_DOT[session.sport || 'Tennis'] || '#D7FF3E' }} />
                                                                            {(session.sport || 'Tennis').toUpperCase()}
                                                                        </span>
                                                                        <h3 className="display-narrow mt-2 text-2xl uppercase text-chalk">{session.title}</h3>
                                                                    </div>
                                                                    <span className={`hud-label border px-2 py-1 ${session.type === 'coaching' ? 'border-ace/50 text-ace' : 'border-chalk/25 text-chalk/60'}`}>
                                                                        {session.type === 'coaching' ? 'CLINIC' : 'COURT'}
                                                                    </span>
                                                                </div>

                                                                <div className="hairline-t hairline-b mb-4 flex flex-col gap-1 py-3">
                                                                    <span className="hud-label text-chalk/60">▸ {session.date?.toUpperCase()}</span>
                                                                    <span className="hud-label text-chalk/60">▸ {session.time?.toUpperCase()}</span>
                                                                    {session.type === 'coaching' && (
                                                                        <span className="hud-label text-chalk/60">▸ COACH: <span className="text-ace">{(session.coach || 'TBD').toUpperCase()}</span></span>
                                                                    )}
                                                                </div>

                                                                {/* Roster */}
                                                                <div className="mb-4">
                                                                    <div className="mb-2 flex justify-between">
                                                                        <span className="hud-label text-chalk/45">ROSTER {enrolledCount}/{session.maxAttendees}</span>
                                                                        <span className={`hud-label ${isFull ? 'text-alert' : 'text-ace'}`}>{session.maxAttendees - enrolledCount} OPEN</span>
                                                                    </div>
                                                                    {enrolledCount === 0 ? (
                                                                        <p className="hud-label border border-dashed border-chalk/15 py-4 text-center text-chalk/30">EMPTY GRID</p>
                                                                    ) : (
                                                                        <div className="max-h-44 space-y-px overflow-y-auto bg-chalk/8">
                                                                            {session.attendees.map((attString, i) => {
                                                                                const player = parseAttendee(attString);
                                                                                return (
                                                                                    <div key={i} className="flex items-center justify-between bg-carbon px-3 py-2">
                                                                                        <div className="min-w-0">
                                                                                            <p className="truncate font-mono text-[11px] uppercase text-chalk/85">{player.name}</p>
                                                                                            <p className="truncate font-mono text-[9px] text-chalk/35">{player.email}{player.court && ` — ${player.court}`}</p>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => handleRemoveAttendee(session.id, player.raw)}
                                                                                            data-cursor="hover"
                                                                                            title="Remove player"
                                                                                            className="ml-3 shrink-0 font-mono text-[10px] text-chalk/40 transition-colors hover:text-alert"
                                                                                        >
                                                                                            ✕
                                                                                        </button>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Manual add + actions */}
                                                                <div className="mt-auto space-y-3">
                                                                    <div className="flex gap-px bg-chalk/10">
                                                                        <input
                                                                            type="text"
                                                                            placeholder="ADD NAME…"
                                                                            value={newAttendeeName[session.id] || ''}
                                                                            onChange={e => setNewAttendeeName(prev => ({ ...prev, [session.id]: e.target.value }))}
                                                                            className="min-w-0 flex-grow border-0 bg-carbon px-3 py-2.5 font-mono text-[11px] uppercase text-chalk placeholder-chalk/30 focus:outline-none focus:ring-1 focus:ring-ace"
                                                                        />
                                                                        {(session.sport === 'Tennis' || session.sport === 'Badminton' || session.sport === 'Squash') && (
                                                                            <select
                                                                                value={newAttendeeCourt[session.id] || ''}
                                                                                onChange={e => setNewAttendeeCourt(prev => ({ ...prev, [session.id]: e.target.value }))}
                                                                                className="w-28 border-0 bg-carbon px-2 py-2.5 font-mono text-[10px] uppercase text-chalk/70 focus:outline-none focus:ring-1 focus:ring-ace"
                                                                            >
                                                                                <option value="">COURT…</option>
                                                                                <option value="Court 1">Court 1</option>
                                                                                <option value="Court 2">Court 2</option>
                                                                                {session.sport === 'Tennis' && (
                                                                                    <>
                                                                                        <option value="Court 3">Court 3</option>
                                                                                        <option value="Court 4">Court 4</option>
                                                                                        <option value="Court 5">Court 5</option>
                                                                                    </>
                                                                                )}
                                                                            </select>
                                                                        )}
                                                                        <button
                                                                            onClick={() => handleAddAttendee(session.id)}
                                                                            disabled={!newAttendeeName[session.id]}
                                                                            data-cursor="hover"
                                                                            title="Register member"
                                                                            className="bg-ace px-4 font-mono text-[11px] uppercase text-court transition-all hover:brightness-110 disabled:opacity-30"
                                                                        >
                                                                            +
                                                                        </button>
                                                                    </div>

                                                                    <div className="flex justify-between">
                                                                        <button
                                                                            onClick={() => setEditingSession(session)}
                                                                            data-cursor="hover"
                                                                            className="hud-label text-chalk/50 transition-colors hover:text-ace"
                                                                        >
                                                                            ✎ EDIT DETAILS
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDeleteSession(session.id)}
                                                                            data-cursor="hover"
                                                                            className="hud-label text-chalk/50 transition-colors hover:text-alert"
                                                                        >
                                                                            ⌦ DELETE
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Create Session */}
                                    <div ref={createSessionFormRef} className="relative border border-chalk/15 p-6 md:p-8">
                                        <span className="absolute left-0 top-0 h-full w-0.5 bg-ace" />
                                        <h3 className="display-narrow text-3xl text-chalk">SCHEDULE NEW SESSION</h3>
                                        <p className="hud-label mb-8 mt-1 text-chalk/45">CUSTOM CLINICS OR COURT RESERVATIONS — STRAIGHT TO THE GRID</p>

                                        <form onSubmit={handleAddSession} className="space-y-6">
                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div>
                                                    <label className={LABEL}>SESSION TITLE</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="e.g. Intermediate Backhand Clinic"
                                                        value={newSession.title}
                                                        onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                                                        className={FIELD}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-6">
                                                    <div>
                                                        <label className={LABEL}>SPORT</label>
                                                        <select
                                                            value={newSession.sport}
                                                            onChange={e => setNewSession({ ...newSession, sport: e.target.value })}
                                                            className={FIELD}
                                                        >
                                                            <option value="Tennis">Tennis</option>
                                                            <option value="Badminton">Badminton</option>
                                                            <option value="Squash">Squash</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className={LABEL}>TYPE</label>
                                                        <select
                                                            value={newSession.type}
                                                            onChange={e => setNewSession({ ...newSession, type: e.target.value as SessionType })}
                                                            className={FIELD}
                                                        >
                                                            <option value="court">Court Open Play</option>
                                                            <option value="coaching">Clinic / Coaching</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid gap-6 md:grid-cols-3">
                                                <div>
                                                    <label className={LABEL}>PICK DATE</label>
                                                    <input
                                                        type="date"
                                                        required
                                                        value={sessionDateInput}
                                                        onChange={e => {
                                                            setSessionDateInput(e.target.value);
                                                            setNewSession(prev => ({ ...prev, date: formatSelectedDate(e.target.value) }));
                                                        }}
                                                        className={FIELD}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL}>FORMATTED (READ-ONLY)</label>
                                                    <input
                                                        type="text"
                                                        readOnly
                                                        placeholder="e.g. Tuesday, Jun 9"
                                                        value={newSession.date}
                                                        className={`${FIELD} cursor-default opacity-60`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL}>TIME SLOT</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="e.g. 9:00 PM - 11:00 PM"
                                                        value={newSession.time}
                                                        onChange={e => setNewSession({ ...newSession, time: e.target.value })}
                                                        className={FIELD}
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div>
                                                    <label className={LABEL}>MAX CAPACITY</label>
                                                    <input
                                                        type="number"
                                                        required
                                                        min={1}
                                                        placeholder="4"
                                                        value={newSession.maxAttendees}
                                                        onChange={e => setNewSession({ ...newSession, maxAttendees: Number(e.target.value) })}
                                                        className={FIELD}
                                                    />
                                                </div>
                                                {newSession.type === 'coaching' && (
                                                    <div>
                                                        <label className={LABEL}>COACH NAME</label>
                                                        <input
                                                            type="text"
                                                            placeholder="Coach's Full Name"
                                                            value={newSession.coach}
                                                            onChange={e => setNewSession({ ...newSession, coach: e.target.value })}
                                                            className={FIELD}
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <span className={`hud-label ${newSessionMsg.includes('Error') || newSessionMsg.includes('required') ? 'text-alert' : 'text-ace'}`}>
                                                    {newSessionMsg.toUpperCase()}
                                                </span>
                                                <button
                                                    type="submit"
                                                    disabled={newSessionSaving}
                                                    data-cursor="hover"
                                                    className="bg-ace px-7 py-3.5 font-mono text-[11px] uppercase tracking-hud text-court transition-all hover:brightness-110 disabled:opacity-40"
                                                >
                                                    {newSessionSaving ? 'SCHEDULING…' : '+ DEPLOY SESSION'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* ════ SIGNALS / EVENTS ════ */}
                            {activeTab === 'events' && (
                                <div className="space-y-14">
                                    <div>
                                        <h2 className="display-narrow text-3xl text-chalk">SIGNALS REEL</h2>
                                        <p className="hud-label mb-6 mt-1 text-chalk/45">CARDS ON THE INDEX TRANSMISSIONS STRIP</p>

                                        {eventsList.length === 0 ? (
                                            <div className="border border-dashed border-chalk/15 py-16 text-center">
                                                <p className="hud-label text-chalk/40">NO EVENTS ON THE FIRESTORE FEED — DEPLOY ONE BELOW</p>
                                            </div>
                                        ) : (
                                            <div className="grid gap-px bg-chalk/10 md:grid-cols-2 xl:grid-cols-3">
                                                {eventsList.map(event => (
                                                    <div key={event.id} className="group flex flex-col bg-court">
                                                        <div className="relative h-36 w-full overflow-hidden bg-carbon">
                                                            {event.image && (
                                                                <img
                                                                    src={event.image}
                                                                    alt={event.title}
                                                                    className="h-full w-full object-cover opacity-60 saturate-0 transition-all duration-500 group-hover:scale-105 group-hover:opacity-80"
                                                                />
                                                            )}
                                                            <div className="absolute right-2 top-2 flex gap-px bg-chalk/20">
                                                                <button
                                                                    onClick={() => setEditingEvent(event)}
                                                                    data-cursor="hover"
                                                                    title="Edit Event"
                                                                    className="bg-court/90 px-3 py-1.5 font-mono text-[10px] uppercase text-chalk transition-colors hover:text-ace"
                                                                >
                                                                    ✎
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteEvent(event.id)}
                                                                    data-cursor="hover"
                                                                    title="Delete Event"
                                                                    className="bg-court/90 px-3 py-1.5 font-mono text-[10px] uppercase text-chalk transition-colors hover:text-alert"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-grow flex-col p-5">
                                                            <h3 className="display-narrow mb-3 text-xl uppercase text-chalk" title={event.title}>{event.title}</h3>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="hud-label text-chalk/55">▸ {event.date?.toUpperCase()}</span>
                                                                {event.time && <span className="hud-label text-chalk/55">▸ {event.time.toUpperCase()}</span>}
                                                                {event.location && <span className="hud-label text-chalk/55">▸ {event.location.toUpperCase()}</span>}
                                                            </div>
                                                            {event.link && (
                                                                <a
                                                                    href={event.link}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    data-cursor="hover"
                                                                    className="hud-label mt-4 truncate text-ace hover:text-chalk"
                                                                >
                                                                    LINK: {event.link.substring(0, 30)}… ↗
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Add Event */}
                                    <div className="relative border border-chalk/15 p-6 md:p-8">
                                        <span className="absolute left-0 top-0 h-full w-0.5 bg-ace" />
                                        <h3 className="display-narrow text-3xl text-chalk">DEPLOY NEW SIGNAL</h3>
                                        <p className="hud-label mb-8 mt-1 text-chalk/45">ANNOUNCEMENTS + MATCHES FOR THE TRANSMISSIONS STRIP</p>

                                        <form onSubmit={handleAddEvent} className="space-y-6">
                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div>
                                                    <label className={LABEL}>EVENT TITLE</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newEvent.title}
                                                        onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                                        className={FIELD}
                                                        placeholder="e.g. Annual Squash Championship Match"
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL}>DATE STRING</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newEvent.date}
                                                        onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                                        className={FIELD}
                                                        placeholder="e.g. October 14"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div>
                                                    <label className={LABEL}>TIME SLOT</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newEvent.time}
                                                        onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                                        className={FIELD}
                                                        placeholder="e.g. 9:00 AM EST"
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL}>LOCATION</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={newEvent.location}
                                                        onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                                        className={FIELD}
                                                        placeholder="e.g. Center Courts 1 & 2"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-6 md:grid-cols-2">
                                                <div>
                                                    <label className={LABEL}>IMAGE URL</label>
                                                    <input
                                                        type="url"
                                                        required
                                                        value={newEvent.image}
                                                        onChange={e => setNewEvent({ ...newEvent, image: e.target.value })}
                                                        className={FIELD}
                                                        placeholder="https://…"
                                                    />
                                                </div>
                                                <div>
                                                    <label className={LABEL}>EXTERNAL LINK (OPTIONAL)</label>
                                                    <input
                                                        type="url"
                                                        value={newEvent.link}
                                                        onChange={e => setNewEvent({ ...newEvent, link: e.target.value })}
                                                        className={FIELD}
                                                        placeholder="https://fuquaconnect…"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2">
                                                <span className={`hud-label ${eventMessage.includes('Error') ? 'text-alert' : 'text-ace'}`}>{eventMessage.toUpperCase()}</span>
                                                <button
                                                    type="submit"
                                                    disabled={savingEvent}
                                                    data-cursor="hover"
                                                    className="bg-ace px-7 py-3.5 font-mono text-[11px] uppercase tracking-hud text-court transition-all hover:brightness-110 disabled:opacity-40"
                                                >
                                                    {savingEvent ? 'DEPLOYING…' : '+ DEPLOY SIGNAL'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {/* ════ INBOX ════ */}
                            {activeTab === 'feedback' && (
                                <div>
                                    <div className="mb-8 flex items-end justify-between">
                                        <div>
                                            <h2 className="display-narrow text-3xl text-chalk">THE INBOX</h2>
                                            <p className="hud-label mt-1 text-chalk/45">BUGS, IDEAS AND DISPATCHES FROM MEMBERS</p>
                                        </div>
                                        <span className="hud-label border border-chalk/20 px-3 py-1.5 text-chalk/70">{feedbackList.length} ITEMS</span>
                                    </div>

                                    {feedbackList.length === 0 ? (
                                        <div className="border border-dashed border-chalk/15 py-20 text-center">
                                            <p className="hud-label text-chalk/40">INBOX ZERO — NO TRANSMISSIONS</p>
                                        </div>
                                    ) : (
                                        <div className="max-h-[640px] space-y-px overflow-y-auto bg-chalk/10 pr-0.5">
                                            {feedbackList.map((item) => {
                                                const dateLabel = item.createdAt?.seconds
                                                    ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })
                                                    : 'Recent';

                                                const typeMeta = item.type === 'bug'
                                                    ? { label: '▲ BUG', cls: 'border-alert/60 text-alert' }
                                                    : item.type === 'improvement'
                                                        ? { label: '✦ SUGGESTION', cls: 'border-ace/60 text-ace' }
                                                        : { label: '◆ OTHER', cls: 'border-shuttle/60 text-shuttle' };

                                                return (
                                                    <div key={item.id} className="flex items-start justify-between gap-5 bg-court p-5 transition-colors hover:bg-carbon/70">
                                                        <div className="min-w-0 space-y-2.5">
                                                            <div className="flex flex-wrap items-center gap-3">
                                                                <span className={`hud-label border px-2 py-1 ${typeMeta.cls}`}>{typeMeta.label}</span>
                                                                <span className="hud-label text-chalk/40">{dateLabel.toUpperCase()}</span>
                                                                <span className="hud-label text-chalk/60">{item.email.toUpperCase()}</span>
                                                            </div>
                                                            <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-chalk/80">
                                                                {item.message}
                                                            </p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteFeedback(item.id)}
                                                            data-cursor="hover"
                                                            title="Dismiss feedback"
                                                            className="shrink-0 border border-chalk/15 px-3 py-2 font-mono text-[10px] uppercase text-chalk/50 transition-colors hover:border-alert hover:text-alert"
                                                        >
                                                            DISMISS ✕
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* ── Edit Session Modal ── */}
            <AnimatePresence>
                {editingSession && (
                    <motion.div
                        className="fixed inset-0 z-[170] flex items-center justify-center bg-court/85 p-4 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="w-full max-w-md border border-chalk/20 bg-carbon p-7"
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="hairline-b mb-6 flex items-center justify-between pb-4">
                                <h3 className="display-narrow text-2xl text-chalk">EDIT SESSION</h3>
                                <button onClick={() => setEditingSession(null)} data-cursor="hover" className="hud-label text-chalk/50 hover:text-alert">✕ ABORT</button>
                            </div>
                            <form onSubmit={handleSaveSessionEdit} className="space-y-5">
                                <div>
                                    <label className={LABEL}>SESSION TITLE</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingSession.title}
                                        onChange={e => setEditingSession({ ...editingSession, title: e.target.value })}
                                        className={FIELD}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={LABEL}>SPORT</label>
                                        <select
                                            value={editingSession.sport}
                                            onChange={e => setEditingSession({ ...editingSession, sport: e.target.value })}
                                            className={FIELD}
                                        >
                                            <option value="Tennis">Tennis</option>
                                            <option value="Badminton">Badminton</option>
                                            <option value="Squash">Squash</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={LABEL}>TYPE</label>
                                        <select
                                            value={editingSession.type}
                                            onChange={e => setEditingSession({ ...editingSession, type: e.target.value as SessionType })}
                                            className={FIELD}
                                        >
                                            <option value="court">Open Play / Court</option>
                                            <option value="coaching">Clinic / Coaching</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={LABEL}>DATE</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingSession.date}
                                            onChange={e => setEditingSession({ ...editingSession, date: e.target.value })}
                                            className={FIELD}
                                            placeholder="e.g. Monday, Jun 15"
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL}>TIME SLOT</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingSession.time}
                                            onChange={e => setEditingSession({ ...editingSession, time: e.target.value })}
                                            className={FIELD}
                                            placeholder="e.g. 9:00 PM - 11:00 PM"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={LABEL}>MAX CAPACITY</label>
                                        <input
                                            type="number"
                                            required
                                            min={1}
                                            value={editingSession.maxAttendees}
                                            onChange={e => setEditingSession({ ...editingSession, maxAttendees: Number(e.target.value) })}
                                            className={FIELD}
                                        />
                                    </div>
                                    {editingSession.type === 'coaching' && (
                                        <div>
                                            <label className={LABEL}>COACH NAME</label>
                                            <input
                                                type="text"
                                                value={editingSession.coach || ''}
                                                onChange={e => setEditingSession({ ...editingSession, coach: e.target.value })}
                                                className={FIELD}
                                                placeholder="Coach Name"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="hairline-t flex justify-end gap-px bg-chalk/10 pt-5">
                                    <button type="button" onClick={() => setEditingSession(null)} data-cursor="hover" className="bg-court px-5 py-3 font-mono text-[10px] uppercase tracking-hud text-chalk/60 hover:text-chalk">
                                        CANCEL
                                    </button>
                                    <button type="submit" data-cursor="hover" className="bg-ace px-5 py-3 font-mono text-[10px] uppercase tracking-hud text-court hover:brightness-110">
                                        COMMIT CHANGES →
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Edit Event Modal ── */}
            <AnimatePresence>
                {editingEvent && (
                    <motion.div
                        className="fixed inset-0 z-[170] flex items-center justify-center bg-court/85 p-4 backdrop-blur-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="w-full max-w-md border border-chalk/20 bg-carbon p-7"
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: 20, opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="hairline-b mb-6 flex items-center justify-between pb-4">
                                <h3 className="display-narrow text-2xl text-chalk">EDIT SIGNAL</h3>
                                <button onClick={() => setEditingEvent(null)} data-cursor="hover" className="hud-label text-chalk/50 hover:text-alert">✕ ABORT</button>
                            </div>
                            <form onSubmit={handleSaveEventEdit} className="space-y-5">
                                <div>
                                    <label className={LABEL}>EVENT TITLE</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingEvent.title}
                                        onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                        className={FIELD}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={LABEL}>DATE</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingEvent.date}
                                            onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })}
                                            className={FIELD}
                                        />
                                    </div>
                                    <div>
                                        <label className={LABEL}>TIME</label>
                                        <input
                                            type="text"
                                            required
                                            value={editingEvent.time}
                                            onChange={e => setEditingEvent({ ...editingEvent, time: e.target.value })}
                                            className={FIELD}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={LABEL}>LOCATION</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingEvent.location}
                                        onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })}
                                        className={FIELD}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>IMAGE URL</label>
                                    <input
                                        type="url"
                                        required
                                        value={editingEvent.image}
                                        onChange={e => setEditingEvent({ ...editingEvent, image: e.target.value })}
                                        className={FIELD}
                                    />
                                </div>
                                <div>
                                    <label className={LABEL}>EXTERNAL LINK (OPTIONAL)</label>
                                    <input
                                        type="url"
                                        value={editingEvent.link || ''}
                                        onChange={e => setEditingEvent({ ...editingEvent, link: e.target.value })}
                                        className={FIELD}
                                    />
                                </div>
                                <div className="hairline-t flex justify-end gap-px bg-chalk/10 pt-5">
                                    <button type="button" onClick={() => setEditingEvent(null)} data-cursor="hover" className="bg-court px-5 py-3 font-mono text-[10px] uppercase tracking-hud text-chalk/60 hover:text-chalk">
                                        CANCEL
                                    </button>
                                    <button type="submit" data-cursor="hover" className="bg-ace px-5 py-3 font-mono text-[10px] uppercase tracking-hud text-court hover:brightness-110">
                                        COMMIT CHANGES →
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.main>
    );
};

export default AdminDashboard;
