import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, addDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Save, Plus, EyeOff, XCircle, CheckCircle2 } from 'lucide-react';

type SessionStatus = 'active' | 'hidden' | 'cancelled';

const CATEGORIES = [
    { id: 'Tennis_Clinic', label: 'Tennis Clinic' },
    { id: 'Tennis_OpenPlay', label: 'Tennis Open Play' },
    { id: 'Badminton_Clinic', label: 'Badminton Clinic' },
    { id: 'Badminton_OpenPlay', label: 'Badminton Open Play' },
    { id: 'Squash_Clinic', label: 'Squash Clinic' },
    { id: 'Squash_OpenPlay', label: 'Squash Open Play' }
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
                    // Initialize defaults if missing
                    const defaults: Record<string, SessionStatus> = {};
                    CATEGORIES.forEach(cat => defaults[cat.id] = 'active');
                    setSessionStatuses(defaults);
                }
            } catch (error) {
                console.error("Error fetching settings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
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
        <div className="max-w-3xl mx-auto py-8">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h1 className="text-3xl font-light text-wimbledon-navy">Admin Dashboard</h1>
                <button onClick={removeDuplicates} className="text-xs bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 font-medium rounded hover:bg-red-100 transition-colors">
                    Remove Duplicate Data
                </button>
            </div>

            {/* Ticker Section */}
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-4">Edit Live Ticker</h2>
                <p className="text-gray-500 text-sm mb-4">
                    This text will appear in the infinite scrolling banner at the top of the site. Use • or | to separate items.
                </p>

                <div className="space-y-4">
                    <textarea
                        value={tickerText}
                        onChange={(e) => setTickerText(e.target.value)}
                        className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wimbledon-navy focus:border-transparent resize-none font-mono text-sm"
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
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
                <h2 className="text-xl font-medium text-gray-900 mb-2">Session Status Manager</h2>
                <p className="text-gray-500 text-sm mb-6">
                    Control which sessions appear on the Booking Engine and their current availability for this week.
                </p>

                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {CATEGORIES.map(cat => (
                            <div key={cat.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/30">
                                <label className="block text-sm font-bold text-gray-700 mb-3">{cat.label}</label>
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
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-xl font-medium text-gray-900 mb-4">Add New Event</h2>
                <p className="text-gray-500 text-sm mb-6">
                    Add a new event to the Social Hub carousel. It will automatically appear for all users.
                </p>

                <form onSubmit={handleAddEvent} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
                            <input
                                type="text"
                                required
                                value={newEvent.title}
                                onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wimbledon-navy focus:border-transparent text-sm"
                                placeholder="e.g., Summer tournament"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                            <input
                                type="text"
                                required
                                value={newEvent.date}
                                onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wimbledon-navy focus:border-transparent text-sm"
                                placeholder="e.g., June 15"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                            <input
                                type="text"
                                required
                                value={newEvent.time}
                                onChange={e => setNewEvent({ ...newEvent, time: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wimbledon-navy focus:border-transparent text-sm"
                                placeholder="e.g., 2:00 PM EST"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                            <input
                                type="text"
                                required
                                value={newEvent.location}
                                onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wimbledon-navy focus:border-transparent text-sm"
                                placeholder="e.g., Court 3"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                            <input
                                type="url"
                                required
                                value={newEvent.image}
                                onChange={e => setNewEvent({ ...newEvent, image: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wimbledon-navy focus:border-transparent text-sm"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">External Link (Optional)</label>
                            <input
                                type="url"
                                value={newEvent.link}
                                onChange={e => setNewEvent({ ...newEvent, link: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wimbledon-navy focus:border-transparent text-sm"
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

        </div>
    );
};

export default AdminDashboard;
