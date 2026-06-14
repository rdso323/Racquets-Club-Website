import { X } from 'lucide-react';
import type { AdminEvent } from '../types';

interface EditEventModalProps {
    event: AdminEvent;
    onEventChange: (event: AdminEvent) => void;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

const EditEventModal = ({ event, onEventChange, onClose, onSubmit }: EditEventModalProps) => (
    <div className="fixed inset-0 z-50 flex animate-fadeIn items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-carbon">
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-chalk">Edit Event</h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Event Title</label>
                    <input
                        type="text"
                        required
                        value={event.title}
                        onChange={(e) => onEventChange({ ...event, title: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Date</label>
                        <input
                            type="text"
                            required
                            value={event.date}
                            onChange={(e) => onEventChange({ ...event, date: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Time</label>
                        <input
                            type="text"
                            required
                            value={event.time}
                            onChange={(e) => onEventChange({ ...event, time: e.target.value })}
                            className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                        />
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Location</label>
                    <input
                        type="text"
                        required
                        value={event.location}
                        onChange={(e) => onEventChange({ ...event, location: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">Image URL</label>
                    <input
                        type="url"
                        required
                        value={event.image}
                        onChange={(e) => onEventChange({ ...event, image: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-500">
                        External Link (Optional)
                    </label>
                    <input
                        type="url"
                        value={event.link || ''}
                        onChange={(e) => onEventChange({ ...event, link: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
                    />
                </div>
                <div className="flex justify-end gap-2 border-t border-gray-200 pt-2 dark:border-gray-800">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="clay-gradient rounded-lg px-4 py-2 text-sm text-white hover:brightness-110"
                    >
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    </div>
);

export default EditEventModal;
