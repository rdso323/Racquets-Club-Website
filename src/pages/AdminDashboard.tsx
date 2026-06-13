import { useState, useEffect, useRef, useMemo } from 'react';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, onSnapshot, deleteDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { SPORTS, SPORT_FILTER_TABS, SESSION_STATUS_CATEGORIES } from '../lib/sports';
import {
    type Session,
    type SessionStatus,
    type SessionType,
    parseAttendee,
    getOpenPlayInstancesWithinHorizon,
    filterRegularSessionsForDisplay,
    isLegacyBundledOpenPlay,
    getActiveCourtAttendees,
    getDefaultMaxAttendees,
    inferSport,
} from '../lib/sessions';

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

import { 
    Save, Plus, EyeOff, XCircle, CheckCircle2, Trash2, AlertTriangle, Sparkles, MessageSquare, 
    Calendar, MapPin, Clock, Edit, Sliders, ArrowLeft, Users, X, UserPlus, Shield
} from 'lucide-react';

const CATEGORIES = SESSION_STATUS_CATEGORIES;

const AdminDashboard = () => {
    const { user } = useAuth();
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
        maxAttendees: getDefaultMaxAttendees('court'),
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

    // Bind sport dropdown to active filter tab
    useEffect(() => {
        if (sessionsSportFilter !== 'All') {
            setNewSession(prev => ({ ...prev, sport: sessionsSportFilter }));
        }
    }, [sessionsSportFilter]);

    const adminDisplaySessions = useMemo(() => {
        const sportFilter = sessionsSportFilter === 'All' ? null : sessionsSportFilter;
        const sportsToShow = sportFilter ? [sportFilter] : [...SPORTS];

        const openPlayResolved: Session[] = [];
        for (const sport of sportsToShow) {
            const instances = getOpenPlayInstancesWithinHorizon(sessionsList, sport as typeof SPORTS[number]);
            openPlayResolved.push(...instances.map(({ session }) => session));
        }

        const regularSessions = sportsToShow.flatMap((sport) =>
            filterRegularSessionsForDisplay(sessionsList, sport as typeof SPORTS[number]),
        );

        const customSessions = sessionsList.filter((s) => {
            if (isLegacyBundledOpenPlay(s)) return false;
            if (s.type === 'court' && s.title.toLowerCase().includes('open play') && s.id.startsWith('open_play_')) {
                return false;
            }
            const sport = inferSport(s);
            if (sportFilter && sport !== sportFilter) return false;
            if (s.type === 'court' && s.title.toLowerCase().includes('open play')) return false;
            if (regularSessions.some((r) => r.id === s.id)) return false;
            return true;
        });

        const combined = [...openPlayResolved, ...regularSessions, ...customSessions];
        const seen = new Set<string>();
        return combined.filter((s) => {
            if (seen.has(s.id)) return false;
            seen.add(s.id);
            return true;
        });
    }, [sessionsList, sessionsSportFilter]);

    const getSessionRoster = (session: Session): string[] => {
        const sport = inferSport(session);
        const isOpenPlay = session.title.toLowerCase().includes('open play') || session.id.startsWith('open_play_');

        if (!isOpenPlay) {
            return session.attendees || [];
        }

        const schedule = getOpenPlayInstancesWithinHorizon(sessionsList, sport)
            .find(({ session: resolved }) => resolved.id === session.id);

        if (schedule) {
            return getActiveCourtAttendees(session.attendees || [], schedule.config.courts);
        }

        return getActiveCourtAttendees(session.attendees || [], []);
    };

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
                sport: sessionsSportFilter !== 'All' ? sessionsSportFilter : 'Tennis',
                type: 'court',
                date: '',
                time: '',
                maxAttendees: getDefaultMaxAttendees('court'),
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

    // Parse attendee string utility — uses shared parser
    const parseAttendeeLocal = parseAttendee;

    if (loading) return <div className="p-8 text-center text-gray-500">Loading admin terminal...</div>;

    return (
        <div className="min-h-screen text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Upper title grid */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-4">
                <div>
                    <h1 className="text-3xl font-light text-wimbledon-navy dark:text-gray-100 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-wimbledon-gold animate-pulse" />
                        Admin Operations Terminal
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Signed in as <span className="font-semibold text-wimbledon-navy dark:text-wimbledon-gold">{user?.email}</span>
                    </p>
                </div>
                
                <div className="flex gap-3 mt-4 md:mt-0">
                    <button 
                        onClick={removeDuplicates} 
                        className="text-xs bg-red-55 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 px-3 py-2 font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Scan Duplicates
                    </button>
                    <a 
                        href="/" 
                        className="text-xs bg-gray-100 hover:bg-gray-200 dark:bg-club-surface dark:hover:bg-club-surface_hover text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-800 px-3 py-2 font-medium rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        View Live Website
                    </a>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="flex flex-col lg:flex-row gap-8 items-start">
                
                {/* Sidebar Navigation */}
                <aside className="w-full lg:w-64 shrink-0 bg-white dark:bg-club-surface rounded-2xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm flex flex-col gap-2">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800/80 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-wimbledon-gold">Menu Modules</span>
                    </div>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'settings' 
                                ? 'bg-wimbledon-navy dark:bg-wimbledon-navy/40 text-white dark:text-wimbledon-gold border-l-4 border-wimbledon-gold shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-club-surface_hover'
                        }`}
                    >
                        <Sliders className="w-4 h-4" />
                        Ticker & Settings
                    </button>

                    <button
                        onClick={() => setActiveTab('sessions')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'sessions' 
                                ? 'bg-wimbledon-navy dark:bg-wimbledon-navy/40 text-white dark:text-wimbledon-gold border-l-4 border-wimbledon-gold shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-club-surface_hover'
                        }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Courts & Sessions
                        {sessionsList.length > 0 && (
                            <span className="ml-auto bg-gray-100 dark:bg-club-bg text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-bold">
                                {sessionsList.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('events')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'events' 
                                ? 'bg-wimbledon-navy dark:bg-wimbledon-navy/40 text-white dark:text-wimbledon-gold border-l-4 border-wimbledon-gold shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-club-surface_hover'
                        }`}
                    >
                        <Sparkles className="w-4 h-4" />
                        Events Manager
                        {eventsList.length > 0 && (
                            <span className="ml-auto bg-gray-100 dark:bg-club-bg text-gray-600 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full font-bold">
                                {eventsList.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={() => setActiveTab('feedback')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                            activeTab === 'feedback' 
                                ? 'bg-wimbledon-navy dark:bg-wimbledon-navy/40 text-white dark:text-wimbledon-gold border-l-4 border-wimbledon-gold shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-club-surface_hover'
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Feedback Inbox
                        {feedbackList.length > 0 && (
                            <span className="ml-auto bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs px-2 py-0.5 rounded-full font-bold">
                                {feedbackList.length}
                            </span>
                        )}
                    </button>

                    <div className="pt-4 mt-4 border-t border-gray-150 dark:border-gray-800 flex flex-col gap-2">
                        <button 
                            onClick={triggerQuickSession}
                            className="w-full bg-wimbledon-green hover:bg-[#004d00] dark:bg-wimbledon-green dark:hover:bg-emerald-600 text-white text-xs font-bold py-2.5 rounded-xl transition-all duration-150 active:scale-95 shadow-sm flex items-center justify-center gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Quick Session
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-grow w-full bg-white dark:bg-club-surface rounded-2xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-sm min-h-[600px] transition-colors duration-300">
                    
                    {/* Settings Tab */}
                    {activeTab === 'settings' && (
                        <div className="space-y-8 animate-fadeIn">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Edit Live Ticker</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 transition-colors">
                                    Change the message scrollbar displayed at the top of the homepage. Use dots • or lines | to split ideas.
                                </p>
                                <div className="mt-4 space-y-4">
                                    <textarea
                                        value={tickerText}
                                        onChange={(e) => setTickerText(e.target.value)}
                                        className="w-full h-32 p-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent resize-none font-mono text-sm transition-colors"
                                        placeholder="Type marquee text..."
                                    />
                                    <div className="flex items-center justify-between">
                                        <span className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                                            {message}
                                        </span>
                                        <button
                                            onClick={handleSaveTicker}
                                            disabled={savingTicker}
                                            className="flex items-center bg-wimbledon-navy hover:bg-[#00287a] text-white px-5 py-2 rounded-lg text-sm transition-colors font-medium disabled:opacity-50"
                                        >
                                            <Save className="w-4 h-4 mr-2" />
                                            {savingTicker ? 'Saving...' : 'Save Ticker'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <hr className="border-gray-150 dark:border-gray-800" />

                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Session Status Manager</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 transition-colors">
                                    Manage visibility blocks for weekly recurring category slots in the Booking Engine.
                                </p>
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {CATEGORIES.map(cat => (
                                        <div key={cat.id} className="p-4 border border-gray-100 dark:border-gray-800/80 rounded-xl bg-gray-50/30 dark:bg-club-bg/50 transition-colors">
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 transition-colors">{cat.label}</label>
                                            <div className="flex bg-white dark:bg-club-surface p-1 rounded-lg border border-gray-200 dark:border-gray-800 gap-1 shadow-sm">
                                                {(['active', 'hidden', 'cancelled'] as SessionStatus[]).map(status => (
                                                    <button
                                                        key={status}
                                                        onClick={() => updateStatus(cat.id, status)}
                                                        className={`flex-1 flex items-center justify-center py-2 px-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                                            sessionStatuses[cat.id] === status
                                                                ? (status === 'active' ? 'bg-wimbledon-green text-white shadow-sm font-black' : status === 'hidden' ? 'bg-gray-500 text-white shadow-sm font-black' : 'bg-red-500 text-white shadow-sm font-black')
                                                                : 'text-gray-400 hover:text-gray-650 dark:hover:text-gray-300'
                                                        }`}
                                                    >
                                                        {status === 'active' && <CheckCircle2 className="w-3.5 h-3.5 mr-1" />}
                                                        {status === 'hidden' && <EyeOff className="w-3.5 h-3.5 mr-1" />}
                                                        {status === 'cancelled' && <XCircle className="w-3.5 h-3.5 mr-1" />}
                                                        {status}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 flex items-center justify-between">
                                    <span className={`text-sm ${statusMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                                        {statusMessage}
                                    </span>
                                    <button
                                        onClick={handleSaveStatuses}
                                        disabled={savingStatuses}
                                        className="flex items-center bg-wimbledon-navy hover:bg-[#00287a] text-white px-5 py-2 rounded-lg text-sm transition-colors font-medium disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4 mr-2" />
                                        {savingStatuses ? 'Saving...' : 'Save All Statuses'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Courts & Sessions Tab */}
                    {activeTab === 'sessions' && (
                        <div className="space-y-8 animate-fadeIn">
                            
                            {/* Filter and Sessions List */}
                            <div>
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Live Scheduled Sessions</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Add attendees, edit capacities or remove sessions live on the website.</p>
                                    </div>
                                    
                                    <div className="flex bg-gray-105 dark:bg-club-bg p-1 rounded-full border border-gray-200 dark:border-gray-800 overflow-x-auto">
                                        {SPORT_FILTER_TABS.map(sport => (
                                            <button
                                                key={sport}
                                                onClick={() => setSessionsSportFilter(sport)}
                                                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                                                    sessionsSportFilter === sport 
                                                        ? 'bg-white dark:bg-club-surface text-wimbledon-navy dark:text-wimbledon-gold shadow-sm font-extrabold' 
                                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                                }`}
                                            >
                                                {sport}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {adminDisplaySessions.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-500">
                                        <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No scheduled sessions in Firestore database.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {adminDisplaySessions.map(session => {
                                                const rosterAttendees = getSessionRoster(session);
                                                const enrolledCount = rosterAttendees.length;
                                                const isFull = enrolledCount >= session.maxAttendees;

                                                return (
                                                    <div 
                                                        key={session.id} 
                                                        className="bg-gray-50/20 dark:bg-club-bg/30 border border-gray-250/70 dark:border-gray-800/80 rounded-2xl p-5 flex flex-col justify-between hover:border-wimbledon-gold/30 hover:shadow-md transition-all duration-200 relative overflow-hidden"
                                                    >
                                                        <div>
                                                            <div className="flex justify-between items-start mb-3">
                                                                <div>
                                                                    <span className="text-[10px] font-bold tracking-widest uppercase text-wimbledon-gold bg-wimbledon-navy/10 dark:bg-wimbledon-navy/50 px-2.5 py-1 rounded border border-wimbledon-navy/20 dark:border-wimbledon-gold/10">
                                                                        {session.sport || 'Tennis'}
                                                                    </span>
                                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-2 truncate">{session.title}</h3>
                                                                </div>
                                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                                    session.type === 'coaching' 
                                                                        ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-450 border border-blue-100 dark:border-blue-900/20' 
                                                                        : 'bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/20'
                                                                }`}>
                                                                    {session.type === 'coaching' ? 'Clinic' : 'Court'}
                                                                </span>
                                                            </div>

                                                            <div className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 mb-4 bg-white/40 dark:bg-club-surface/40 p-2.5 rounded-xl border border-gray-150 dark:border-gray-850">
                                                                <div className="flex items-center gap-1.5">
                                                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                                    <span>{session.date}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5">
                                                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                    <span>{session.time}</span>
                                                                </div>
                                                                {session.type === 'coaching' && (
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Users className="w-3.5 h-3.5 text-gray-400" />
                                                                        <span>Coach: <span className="font-semibold text-gray-700 dark:text-gray-300">{session.coach || 'TBD'}</span></span>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Roster list */}
                                                            <div className="mb-4 space-y-2">
                                                                <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                                    <span>Roster ({enrolledCount} / {session.maxAttendees})</span>
                                                                    <span className={isFull ? 'text-red-500' : 'text-wimbledon-green'}>{session.maxAttendees - enrolledCount} Open</span>
                                                                </div>
                                                                
                                                                {enrolledCount === 0 ? (
                                                                    <p className="text-xs text-gray-400 dark:text-gray-500 italic p-3 text-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl bg-white/10 dark:bg-black/10">No players registered.</p>
                                                                ) : (
                                                                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                                                        {rosterAttendees.map((attString, i) => {
                                                                            const player = parseAttendeeLocal(attString);
                                                                            return (
                                                                                <div key={i} className="flex justify-between items-center text-xs bg-white dark:bg-club-surface/60 border border-gray-150 dark:border-gray-800/60 p-2 rounded-lg group/item">
                                                                                    <div className="truncate pr-2">
                                                                                        <p className="font-semibold text-gray-850 dark:text-gray-250 truncate">{player.name}</p>
                                                                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">{player.email} {player.court && `• ${player.court}`}</p>
                                                                                    </div>
                                                                                    <button 
                                                                                        onClick={() => handleRemoveAttendee(session.id, player.raw)}
                                                                                        className="text-gray-450 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-1 rounded transition-colors"
                                                                                        title="Remove player"
                                                                                    >
                                                                                        <X className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Actions & Manual Add Attendee */}
                                                        <div className="mt-4 pt-3 border-t border-gray-150 dark:border-gray-800/80 space-y-3">
                                                            <div className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Add Name..."
                                                                    value={newAttendeeName[session.id] || ''}
                                                                    onChange={e => setNewAttendeeName(prev => ({ ...prev, [session.id]: e.target.value }))}
                                                                    className="flex-grow text-xs p-2 border border-gray-350 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                                />
                                                                
                                                                {/* Optional court selector for Tennis/Badminton */}
                                                                {(session.sport === 'Tennis' || session.sport === 'Badminton' || session.sport === 'Squash' || session.sport === 'Pickleball' || session.sport === 'Table Tennis') && (
                                                                    <select
                                                                        value={newAttendeeCourt[session.id] || ''}
                                                                        onChange={e => setNewAttendeeCourt(prev => ({ ...prev, [session.id]: e.target.value }))}
                                                                        className="w-24 text-[10px] p-2 border border-gray-350 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                                    >
                                                                        <option value="">Court...</option>
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
                                                                    className="bg-wimbledon-navy hover:bg-[#00287a] text-white p-2 rounded-lg transition-colors disabled:opacity-40"
                                                                    title="Register member"
                                                                >
                                                                    <UserPlus className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>

                                                            <div className="flex justify-between items-center pt-2">
                                                                <button 
                                                                    onClick={() => setEditingSession(session)}
                                                                    className="text-xs text-gray-500 hover:text-wimbledon-gold dark:hover:text-wimbledon-gold flex items-center gap-1 transition-colors font-medium"
                                                                >
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                    Edit Details
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleDeleteSession(session.id)}
                                                                    className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors font-medium"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    Delete Session
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-150 dark:border-gray-800" />

                            {/* Create Session Form */}
                            <div ref={createSessionFormRef} className="bg-gray-55/20 dark:bg-club-bg/20 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-wimbledon-gold"></div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-wimbledon-gold" />
                                    Schedule New Custom Session
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-6">Create customized coaching clinics or court booking reservations.</p>

                                <form onSubmit={handleAddSession} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Session Title</label>
                                            <input 
                                                type="text" 
                                                required
                                                placeholder="e.g. Intermediate Backhand Clinic"
                                                value={newSession.title}
                                                onChange={e => setNewSession({ ...newSession, title: e.target.value })}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sport</label>
                                                <select 
                                                    value={newSession.sport}
                                                    onChange={e => setNewSession({ ...newSession, sport: e.target.value })}
                                                    className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                >
                                                    {SPORTS.map(sport => (
                                                        <option key={sport} value={sport}>{sport}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Session Type</label>
                                                <select 
                                                    value={newSession.type}
                                                    onChange={e => {
                                                        const type = e.target.value as SessionType;
                                                        setNewSession({
                                                            ...newSession,
                                                            type,
                                                            maxAttendees: getDefaultMaxAttendees(type),
                                                        });
                                                    }}
                                                    className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                >
                                                    <option value="court">Court Open Play</option>
                                                    <option value="coaching">Clinic / Coaching</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pick Date</label>
                                            <input 
                                                type="date" 
                                                required
                                                value={sessionDateInput}
                                                onChange={e => {
                                                    setSessionDateInput(e.target.value);
                                                    setNewSession(prev => ({ ...prev, date: formatSelectedDate(e.target.value) }));
                                                }}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold text-gray-500 dark:text-gray-300"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Formatted Date (Read-only)</label>
                                            <input 
                                                type="text" 
                                                readOnly
                                                placeholder="e.g. Tuesday, Jun 9"
                                                value={newSession.date}
                                                className="w-full p-2.5 text-sm border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 text-gray-500 dark:text-gray-400 rounded-lg outline-none cursor-default"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Slot (Text input)</label>
                                            <input 
                                                type="text" 
                                                required
                                                placeholder="e.g. 9:00 PM - 11:00 PM"
                                                value={newSession.time}
                                                onChange={e => setNewSession({ ...newSession, time: e.target.value })}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max capacity (Max Attendees)</label>
                                            <input 
                                                type="number" 
                                                required
                                                min={1}
                                                placeholder="8"
                                                value={newSession.maxAttendees}
                                                onChange={e => setNewSession({ ...newSession, maxAttendees: Number(e.target.value) })}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                            />
                                        </div>
                                        {newSession.type === 'coaching' && (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coach Name</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="Coach's Full Name"
                                                    value={newSession.coach}
                                                    onChange={e => setNewSession({ ...newSession, coach: e.target.value })}
                                                    className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <span className={`text-sm ${newSessionMsg.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                                            {newSessionMsg}
                                        </span>
                                        <button
                                            type="submit"
                                            disabled={newSessionSaving}
                                            className="flex items-center bg-wimbledon-green hover:bg-[#004d00] text-white px-6 py-2.5 rounded-lg text-sm transition-colors font-medium disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            {newSessionSaving ? 'Scheduling...' : 'Schedule Session'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Events Tab */}
                    {activeTab === 'events' && (
                        <div className="space-y-8 animate-fadeIn">
                            
                            {/* Live Events List */}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Active Events Carousel</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Manage cards inside the Upcoming Events slider carousel on the home page.</p>
                                
                                {eventsList.length === 0 ? (
                                    <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-500">
                                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No events listed in Firestore. Use the form below to create one!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {eventsList.map(event => (
                                            <div 
                                                key={event.id}
                                                className="bg-gray-50/20 dark:bg-club-bg/30 border border-gray-250/75 dark:border-gray-800/80 rounded-2xl overflow-hidden shadow-sm flex flex-col group relative"
                                            >
                                                <div className="h-40 w-full relative overflow-hidden bg-gray-200 dark:bg-club-surface">
                                                    <img 
                                                        src={event.image} 
                                                        alt={event.title} 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    />
                                                    <div className="absolute top-2 right-2 flex gap-1.5">
                                                        <button 
                                                            onClick={() => setEditingEvent(event)}
                                                            className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:text-wimbledon-gold transition-colors"
                                                            title="Edit Event"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteEvent(event.id)}
                                                            className="p-1.5 bg-black/60 backdrop-blur-sm rounded-lg text-white hover:text-red-500 transition-colors"
                                                            title="Delete Event"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="p-4 flex-grow flex flex-col justify-between">
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1" title={event.title}>{event.title}</h3>
                                                        <div className="flex flex-col gap-1 mt-2.5 text-xs text-gray-500 dark:text-gray-400">
                                                            <div className="flex items-center gap-1.5">
                                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                                <span>{event.date}</span>
                                                            </div>
                                                            {event.time && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                    <span>{event.time}</span>
                                                                </div>
                                                            )}
                                                            {event.location && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                                                    <span>{event.location}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {event.link && (
                                                        <a 
                                                            href={event.link} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="mt-4 text-xs font-semibold text-wimbledon-navy dark:text-wimbledon-gold hover:underline truncate"
                                                        >
                                                            Link: {event.link.substring(0, 30)}...
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <hr className="border-gray-150 dark:border-gray-800" />

                            {/* Add New Event Form */}
                            <div className="bg-gray-50/20 dark:bg-club-bg/20 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-wimbledon-gold"></div>
                                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-wimbledon-gold" />
                                    Add New Club Event
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 mb-6">Insert new announcements or matches into Upcoming Events slider.</p>

                                <form onSubmit={handleAddEvent} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title</label>
                                            <input
                                                type="text"
                                                required
                                                value={newEvent.title}
                                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                placeholder="e.g. Annual Squash Championship Match"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date String</label>
                                            <input
                                                type="text"
                                                required
                                                value={newEvent.date}
                                                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                placeholder="e.g. October 14"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Slot</label>
                                            <input
                                                type="text"
                                                required
                                                value={newEvent.time}
                                                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                placeholder="e.g. 9:00 AM EST"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                                            <input
                                                type="text"
                                                required
                                                value={newEvent.location}
                                                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                placeholder="e.g. Center Courts 1 & 2"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image URL</label>
                                            <input
                                                type="url"
                                                required
                                                value={newEvent.image}
                                                onChange={e => setNewEvent({ ...newEvent, image: e.target.value })}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">External Link (Optional)</label>
                                            <input
                                                type="url"
                                                value={newEvent.link}
                                                onChange={e => setNewEvent({ ...newEvent, link: e.target.value })}
                                                className="w-full p-2.5 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-1 focus:ring-wimbledon-gold"
                                                placeholder="https://fuquaconnect..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2">
                                        <span className={`text-sm ${eventMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                                            {eventMessage}
                                        </span>
                                        <button
                                            type="submit"
                                            disabled={savingEvent}
                                            className="flex items-center bg-wimbledon-green hover:bg-[#004d00] text-white px-6 py-2.5 rounded-lg text-sm transition-colors font-medium disabled:opacity-50"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            {savingEvent ? 'Adding...' : 'Add Event'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Feedback Tab */}
                    {activeTab === 'feedback' && (
                        <div className="space-y-6 animate-fadeIn">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Feedback Inbox</h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Read bugs, suggestions, and submissions sent by members.</p>
                                </div>
                                <span className="bg-gray-100 dark:bg-club-bg text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full font-bold">
                                    {feedbackList.length} Items
                                </span>
                            </div>

                            {feedbackList.length === 0 ? (
                                <div className="py-12 border-2 border-dashed border-gray-150 dark:border-gray-800 rounded-2xl text-center text-gray-400 dark:text-gray-500">
                                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No feedback reports found.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                                    {feedbackList.map((item) => {
                                        const dateLabel = item.createdAt?.seconds 
                                            ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })
                                            : 'Recent';

                                        return (
                                            <div key={item.id} className="p-4 border border-gray-150 dark:border-gray-850 rounded-xl bg-gray-50/20 dark:bg-club-bg/40 flex flex-col md:flex-row justify-between gap-4 items-start transition-all hover:border-gray-250 dark:hover:border-gray-750">
                                                <div className="space-y-2 flex-grow">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {item.type === 'bug' ? (
                                                            <span className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-405 border border-red-200 dark:border-red-900/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                Bug
                                                            </span>
                                                        ) : item.type === 'improvement' ? (
                                                            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-305 border border-amber-200 dark:border-amber-900/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                                                <Sparkles className="w-3 h-3" />
                                                                Suggestion
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                                                <MessageSquare className="w-3 h-3" />
                                                                Other
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-gray-400 font-medium">{dateLabel}</span>
                                                        <span className="text-xs text-gray-350 dark:text-gray-700">•</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{item.email}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                                                        {item.message}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteFeedback(item.id)}
                                                    className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-550 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-105 rounded-xl transition-all self-end md:self-start flex-shrink-0"
                                                    title="Dismiss feedback"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* Edit Session Modal */}
            {editingSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-club-surface rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Edit Session Details</h3>
                            <button onClick={() => setEditingSession(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveSessionEdit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Session Title</label>
                                <input 
                                    type="text" 
                                    required
                                    value={editingSession.title}
                                    onChange={e => setEditingSession({ ...editingSession, title: e.target.value })}
                                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sport</label>
                                    <select 
                                        value={editingSession.sport}
                                        onChange={e => setEditingSession({ ...editingSession, sport: e.target.value })}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                    >
                                        {SPORTS.map(sport => (
                                            <option key={sport} value={sport}>{sport}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                    <select 
                                        value={editingSession.type}
                                        onChange={e => setEditingSession({ ...editingSession, type: e.target.value as SessionType })}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                    >
                                        <option value="court">Open Play / Court</option>
                                        <option value="coaching">Clinic / Coaching</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={editingSession.date}
                                        onChange={e => setEditingSession({ ...editingSession, date: e.target.value })}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                        placeholder="e.g. Monday, Jun 15"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time Slot</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={editingSession.time}
                                        onChange={e => setEditingSession({ ...editingSession, time: e.target.value })}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                        placeholder="e.g. 9:00 PM - 11:00 PM"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Max Capacity</label>
                                    <input 
                                        type="number" 
                                        required
                                        min={1}
                                        value={editingSession.maxAttendees}
                                        onChange={e => setEditingSession({ ...editingSession, maxAttendees: Number(e.target.value) })}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                    />
                                </div>
                                {editingSession.type === 'coaching' && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Coach Name</label>
                                        <input 
                                            type="text" 
                                            value={editingSession.coach || ''}
                                            onChange={e => setEditingSession({ ...editingSession, coach: e.target.value })}
                                            className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-905 dark:text-gray-100 rounded-lg"
                                            placeholder="Coach Name"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                <button type="button" onClick={() => setEditingSession(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm bg-wimbledon-navy hover:bg-[#00287a] text-white rounded-lg">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Event Modal */}
            {editingEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-club-surface rounded-2xl border border-gray-200 dark:border-gray-800 p-6 max-w-md w-full shadow-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200 dark:border-gray-800">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Edit Event</h3>
                            <button onClick={() => setEditingEvent(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveEventEdit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event Title</label>
                                <input 
                                    type="text" 
                                    required
                                    value={editingEvent.title}
                                    onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Date</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={editingEvent.date}
                                        onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Time</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={editingEvent.time}
                                        onChange={e => setEditingEvent({ ...editingEvent, time: e.target.value })}
                                        className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-950 dark:text-gray-100 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                                <input 
                                    type="text" 
                                    required
                                    value={editingEvent.location}
                                    onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })}
                                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Image URL</label>
                                <input 
                                    type="url" 
                                    required
                                    value={editingEvent.image}
                                    onChange={e => setEditingEvent({ ...editingEvent, image: e.target.value })}
                                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">External Link (Optional)</label>
                                <input 
                                    type="url" 
                                    value={editingEvent.link || ''}
                                    onChange={e => setEditingEvent({ ...editingEvent, link: e.target.value })}
                                    className="w-full p-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                <button type="button" onClick={() => setEditingEvent(null)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 text-sm bg-wimbledon-navy hover:bg-[#00287a] text-white rounded-lg">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
