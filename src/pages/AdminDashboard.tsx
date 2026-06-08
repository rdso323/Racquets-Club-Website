import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Save, Plus, EyeOff, XCircle, CheckCircle2, Trash2, AlertTriangle, Sparkles, MessageSquare } from 'lucide-react';

type SessionStatus = 'active' | 'hidden' | 'cancelled';

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

const AdminDashboard = () => {
    const [tickerText, setTickerText] = useState('');
    const [loading, setLoading] = useState(true);
    const [savingTicker, setSavingTicker] = useState(false);
    const [message, setMessage] = useState('');

    // Session Status State
    const [sessionStatuses, setSessionStatuses] = useState<Record<string, SessionStatus>>({});
    const [savingStatuses, setSavingStatuses] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Event State
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

    // Feedback State
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
    const [fetchingFeedback, setFetchingFeedback] = useState(false);

    useEffect(() => {
        const fetchSettingsAndFeedback = async () => {
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
                    // Initialize defaults if missing
                    const defaults: Record<string, SessionStatus> = {};
                    CATEGORIES.forEach(cat => defaults[cat.id] = 'active');
                    setSessionStatuses(defaults);
                }

                // Fetch feedback
                setFetchingFeedback(true);
                const feedbackSnap = await getDocs(collection(db, 'feedback'));
                const list = feedbackSnap.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data()
                })) as FeedbackItem[];
                
                // Sort by timestamp descending (newest first)
                list.sort((a, b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA;
                });
                setFeedbackList(list);
            } catch (error) {
                console.error("Error fetching admin data", error);
            } finally {
                setLoading(false);
                setFetchingFeedback(false);
            }
        };
        fetchSettingsAndFeedback();
    }, []);

    const handleSaveTicker = async () => {
        setSavingTicker(true);
        setMessage('');
        try {
            await setDoc(doc(db, 'settings', 'ticker'), { text: tickerText }, { merge: true });
            setMessage('Ticker updated successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error updating ticker", error);
            setMessage('Error updating ticker. Check permissions.');
        } finally {
            setSavingTicker(false);
        }
    };

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

    const handleDeleteFeedback = async (id: string) => {
        if (!window.confirm("Are you sure you want to dismiss this feedback?")) return;
        try {
            await deleteDoc(doc(db, 'feedback', id));
            setFeedbackList(prev => prev.filter(item => item.id !== id));
        } catch (error) {
            console.error("Error deleting feedback:", error);
            alert("Failed to delete feedback record.");
        }
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingEvent(true);
        setEventMessage('');
        try {
            await addDoc(collection(db, 'events'), newEvent);
            setEventMessage('Event added successfully!');
            setNewEvent({ title: '', date: '', time: '', location: '', image: '', link: '' }); // reset
            setTimeout(() => setEventMessage(''), 3000);
        } catch (error) {
            console.error("Error adding event", error);
            setEventMessage('Error adding event. Check permissions.');
        } finally {
            setSavingEvent(false);
        }
    };

    const removeDuplicates = async () => {
        if (!window.confirm("Are you sure you want to scan for and delete duplicate events and sessions?")) return;
        setSavingEvent(true);
        setEventMessage('Scanning for duplicates...');
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

            setEventMessage(`Success! Removed ${deletedEvents} duplicate events and ${deletedSessions} duplicate sessions.`);
            setTimeout(() => setEventMessage(''), 5000);
        } catch (error) {
            console.error(error);
            setEventMessage('Error while attempting to remove duplicates.');
        } finally {
            setSavingEvent(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading admin data...</div>;

    return (
        <div className="max-w-3xl mx-auto py-8 transition-colors">
            <div className="flex justify-between items-center mb-8 border-b border-gray-200 dark:border-gray-800 pb-4 transition-colors">
                <h1 className="text-3xl font-light text-wimbledon-navy dark:text-gray-100 transition-colors">Admin Dashboard</h1>
                <button onClick={removeDuplicates} className="text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50 px-3 py-1.5 font-medium rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
                    Remove Duplicate Data
                </button>
            </div>

            {/* Ticker Section */}
            <div className="bg-white dark:bg-club-surface p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-8 transition-colors">
                <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4 transition-colors">Edit Live Ticker</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 transition-colors">
                    This text will appear in the infinite scrolling banner at the top of the site. Use • or | to separate items.
                </p>

                <div className="space-y-4">
                    <textarea
                        value={tickerText}
                        onChange={(e) => setTickerText(e.target.value)}
                        className="w-full h-32 p-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent resize-none font-mono text-sm transition-colors"
                        placeholder="Enter ticker text here..."
                    />

                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                            {message}
                        </span>
                        <button
                            onClick={handleSaveTicker}
                            disabled={savingTicker}
                            className="flex items-center bg-wimbledon-navy hover:bg-[#00287a] text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {savingTicker ? 'Saving...' : 'Save Ticker'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Session Status Section */}
            <div className="bg-white dark:bg-club-surface p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 mb-8 transition-colors">
                <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2 transition-colors">Session Status Manager</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 transition-colors">
                    Control which sessions appear on the Booking Engine and their current availability for this week.
                </p>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {CATEGORIES.map(cat => (
                            <div key={cat.id} className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/30 dark:bg-club-bg transition-colors">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 transition-colors">{cat.label}</label>
                                <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm gap-1">
                                    {(['active', 'hidden', 'cancelled'] as SessionStatus[]).map(status => (
                                        <button
                                            key={status}
                                            onClick={() => updateStatus(cat.id, status)}
                                            className={`flex-1 flex items-center justify-center py-2 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${sessionStatuses[cat.id] === status
                                                ? (status === 'active' ? 'bg-wimbledon-green text-white shadow-md' : status === 'hidden' ? 'bg-gray-500 text-white shadow-md' : 'bg-red-500 text-white shadow-md')
                                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                                }`}
                                        >
                                            {status === 'active' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                            {status === 'hidden' && <EyeOff className="w-3 h-3 mr-1" />}
                                            {status === 'cancelled' && <XCircle className="w-3 h-3 mr-1" />}
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className={`text-sm ${statusMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                            {statusMessage}
                        </span>
                        <button
                            onClick={handleSaveStatuses}
                            disabled={savingStatuses}
                            className="flex items-center bg-wimbledon-navy hover:bg-[#00287a] text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {savingStatuses ? 'Saving...' : 'Save All Statuses'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Events Section */}
            <div className="bg-white dark:bg-club-surface p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors">
                <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-4 transition-colors">Add New Event</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 transition-colors">
                    Add a new event to the Social Hub carousel. It will automatically appear for all users.
                </p>

                <form onSubmit={handleAddEvent} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Event Title</label>
                            <input
                                type="text"
                                required
                                value={newEvent.title}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent text-sm transition-colors"
                                placeholder="e.g., Summer tournament"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Date</label>
                            <input
                                type="text"
                                required
                                value={newEvent.date}
                                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent text-sm transition-colors"
                                placeholder="e.g., June 15"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Time</label>
                            <input
                                type="text"
                                required
                                value={newEvent.time}
                                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent text-sm transition-colors"
                                placeholder="e.g., 2:00 PM EST"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Location</label>
                            <input
                                type="text"
                                required
                                value={newEvent.location}
                                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent text-sm transition-colors"
                                placeholder="e.g., Court 3"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">Image URL</label>
                            <input
                                type="url"
                                required
                                value={newEvent.image}
                                onChange={e => setNewEvent({ ...newEvent, image: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent text-sm transition-colors"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 transition-colors">External Link (Optional)</label>
                            <input
                                type="url"
                                value={newEvent.link}
                                onChange={e => setNewEvent({ ...newEvent, link: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent text-sm transition-colors"
                                placeholder="https://fuquaconnect..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        <span className={`text-sm ${eventMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                            {eventMessage}
                        </span>
                        <button
                            type="submit"
                            disabled={savingEvent}
                            className="flex items-center bg-wimbledon-green hover:bg-[#004d00] text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {savingEvent ? 'Adding...' : 'Add Event'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Feedback Inbox Section */}
            <div className="bg-white dark:bg-club-surface p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors mt-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 transition-colors">Feedback Inbox</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 transition-colors">
                            Bugs, suggestions, and feature requests submitted by club members.
                        </p>
                    </div>
                    <span className="bg-gray-100 dark:bg-club-bg text-gray-700 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full font-bold">
                        {feedbackList.length} total
                    </span>
                </div>

                {fetchingFeedback ? (
                    <div className="py-8 text-center text-gray-500">Loading feedback...</div>
                ) : feedbackList.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl text-center text-gray-400 dark:text-gray-500">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No feedback items received yet.</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
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
                                <div key={item.id} className="p-4 border border-gray-150 dark:border-gray-800/80 rounded-xl bg-gray-50/20 dark:bg-club-bg/40 flex flex-col md:flex-row justify-between gap-4 items-start transition-all hover:border-gray-250 dark:hover:border-gray-700">
                                    <div className="space-y-2.5 flex-grow">
                                        <div className="flex flex-wrap items-center gap-2">
                                            {item.type === 'bug' ? (
                                                <span className="inline-flex items-center gap-1 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Bug
                                                </span>
                                            ) : item.type === 'improvement' ? (
                                                <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
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
                                            <span className="text-xs text-gray-300 dark:text-gray-700">•</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">{item.email}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-sans whitespace-pre-wrap">
                                            {item.message}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteFeedback(item.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-450 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/30 rounded-xl transition-all self-end md:self-start flex-shrink-0"
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

        </div>
    );
};

export default AdminDashboard;
