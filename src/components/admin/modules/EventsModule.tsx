import { useState } from 'react';
import { addDoc, collection, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { Plus, Sparkles } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { filterUpcomingEvents } from '../../../lib/events';
import { ARCHIVE_RETENTION_DAYS } from '../../../lib/archive';
import {
    buildDateFieldsFromIso,
    buildTimeFields,
    resolveEventDateISO,
    resolveEventTimes,
} from '../../../lib/dates';
import DatePickerField from '../fields/DatePickerField';
import TimeRangePicker from '../fields/TimeRangePicker';
import type { AdminEvent } from '../types';
import EventOpsCard from '../cards/EventOpsCard';
import EditEventModal from '../modals/EditEventModal';

interface EventsModuleProps {
    eventsList: AdminEvent[];
}

const emptyEventForm = () => ({
    title: '',
    dateISO: '',
    date: '',
    startTime: '18:30',
    endTime: '',
    time: '6:30 PM',
    location: '',
    image: '',
    link: '',
});

const EventsModule = ({ eventsList }: EventsModuleProps) => {
    const [newEvent, setNewEvent] = useState(emptyEventForm());
    const [savingEvent, setSavingEvent] = useState(false);
    const [eventMessage, setEventMessage] = useState('');
    const [editingEvent, setEditingEvent] = useState<AdminEvent | null>(null);

    const upcomingEvents = filterUpcomingEvents(eventsList);

    const buildEventPayload = (fields: typeof newEvent) => {
        const dateFields = buildDateFieldsFromIso(fields.dateISO);
        const timeFields = buildTimeFields(fields.startTime, fields.endTime || undefined);
        return {
            title: fields.title,
            ...dateFields,
            ...timeFields,
            location: fields.location,
            image: fields.image,
            link: fields.link || '',
        };
    };

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEvent.dateISO) {
            setEventMessage('Please pick a date.');
            return;
        }
        setSavingEvent(true);
        setEventMessage('');
        try {
            await addDoc(collection(db, 'events'), buildEventPayload(newEvent));
            setEventMessage('Event added successfully!');
            setNewEvent(emptyEventForm());
            window.setTimeout(() => setEventMessage(''), 3000);
        } catch (error) {
            console.error('Error adding event', error);
            setEventMessage('Error adding event.');
        } finally {
            setSavingEvent(false);
        }
    };

    const handleSaveEventEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEvent?.dateISO) return;
        try {
            const dateFields = buildDateFieldsFromIso(editingEvent.dateISO);
            const times = resolveEventTimes(editingEvent);
            const timeFields = times
                ? buildTimeFields(times.startTime, times.endTime)
                : { startTime: editingEvent.startTime || '18:30', time: editingEvent.time };

            await setDoc(
                doc(db, 'events', editingEvent.id),
                {
                    title: editingEvent.title,
                    ...dateFields,
                    ...timeFields,
                    location: editingEvent.location,
                    image: editingEvent.image,
                    link: editingEvent.link || '',
                },
                { merge: true },
            );
            setEditingEvent(null);
        } catch (err) {
            console.error('Error updating event:', err);
            window.alert('Failed to edit event.');
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        try {
            await deleteDoc(doc(db, 'events', id));
        } catch (err) {
            console.error('Error deleting event:', err);
            window.alert('Error deleting event.');
        }
    };

    return (
        <div className="animate-fadeIn space-y-8">
            <div>
                <h2 className="mb-2 font-display text-2xl text-gray-900 dark:text-chalk">
                    Active Events Carousel
                </h2>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Create and edit cards for the home page carousel. Past events are hidden from members
                    automatically and appear in the Archive tab for {ARCHIVE_RETENTION_DAYS} days before
                    auto-deletion.
                </p>

                {upcomingEvents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-gray-400 dark:border-gray-800 dark:text-gray-500">
                        <Sparkles className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">
                            No upcoming events in Firestore. Built-in defaults show on the home page until you add one.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                        {upcomingEvents.map((event) => (
                            <EventOpsCard
                                key={event.id}
                                event={event}
                                onEdit={() =>
                                    setEditingEvent({
                                        ...event,
                                        dateISO: resolveEventDateISO(event) || event.dateISO || '',
                                    })
                                }
                                onDelete={() => handleDeleteEvent(event.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            <hr className="border-gray-150 dark:border-gray-800" />

            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-50/20 p-6 dark:border-gray-800 dark:bg-court-950/20">
                <div className="absolute left-0 top-0 h-full w-1.5 bg-court-accent" />
                <h3 className="flex items-center gap-2 font-display text-2xl text-gray-900 dark:text-chalk">
                    <Plus className="h-5 w-5 text-court-accent" />
                    Add New Club Event
                </h3>
                <p className="mb-6 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    New events appear on the home page carousel as soon as they are saved.
                </p>

                <form onSubmit={handleAddEvent} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                Event Title
                            </label>
                            <input
                                type="text"
                                required
                                value={newEvent.title}
                                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                placeholder="e.g. Annual Squash Championship Match"
                            />
                        </div>
                        <DatePickerField
                            label="Event Date"
                            required
                            value={newEvent.dateISO}
                            onChange={(dateISO) =>
                                setNewEvent({
                                    ...newEvent,
                                    dateISO,
                                    date: buildDateFieldsFromIso(dateISO).date,
                                })
                            }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <TimeRangePicker
                            startTime={newEvent.startTime}
                            endTime={newEvent.endTime}
                            onChange={(fields) =>
                                setNewEvent({
                                    ...newEvent,
                                    startTime: fields.startTime,
                                    endTime: fields.endTime || '',
                                    time: fields.time,
                                })
                            }
                        />
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                Location
                            </label>
                            <input
                                type="text"
                                required
                                value={newEvent.location}
                                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                placeholder="e.g. Center Courts 1 & 2"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                Image URL
                            </label>
                            <input
                                type="url"
                                required
                                value={newEvent.image}
                                onChange={(e) => setNewEvent({ ...newEvent, image: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                                External Link (Optional)
                            </label>
                            <input
                                type="url"
                                value={newEvent.link}
                                onChange={(e) => setNewEvent({ ...newEvent, link: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                                placeholder="https://fuquaconnect..."
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span
                            className={`text-sm ${eventMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}
                        >
                            {eventMessage}
                        </span>
                        <button
                            type="submit"
                            disabled={savingEvent}
                            className="flex items-center rounded-lg bg-wimbledon-green px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#004d00] disabled:opacity-50"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {savingEvent ? 'Adding...' : 'Add Event'}
                        </button>
                    </div>
                </form>
            </div>

            {editingEvent && (
                <EditEventModal
                    event={editingEvent}
                    onEventChange={setEditingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSubmit={handleSaveEventEdit}
                />
            )}
        </div>
    );
};

export default EventsModule;
