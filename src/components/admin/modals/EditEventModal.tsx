import { buildDateFieldsFromIso } from '../../../lib/dates';
import DatePickerField from '../fields/DatePickerField';
import TimeRangePicker from '../fields/TimeRangePicker';
import AdminModalShell from '../AdminModalShell';
import type { AdminEvent } from '../types';

interface EditEventModalProps {
    event: AdminEvent;
    onEventChange: (event: AdminEvent) => void;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

const EditEventModal = ({ event, onEventChange, onClose, onSubmit }: EditEventModalProps) => (
    <AdminModalShell title="Edit Event" onClose={onClose} onSubmit={onSubmit}>
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
        <DatePickerField
            label="Event Date"
            required
            value={event.dateISO || ''}
            onChange={(dateISO) =>
                onEventChange({
                    ...event,
                    dateISO,
                    date: buildDateFieldsFromIso(dateISO).date,
                })
            }
        />
        <TimeRangePicker
            startTime={event.startTime}
            endTime={event.endTime}
            legacyTime={event.time}
            onChange={(fields) =>
                onEventChange({
                    ...event,
                    startTime: fields.startTime,
                    endTime: fields.endTime,
                    time: fields.time,
                })
            }
        />
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
    </AdminModalShell>
);

export default EditEventModal;
