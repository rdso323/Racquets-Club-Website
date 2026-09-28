import { DAY_OPTIONS, type DayName } from '../../../lib/sports';

export interface BookingLockValue {
    bookingLockEnabled: boolean;
    bookingLockDay: DayName;
    bookingLockTime: string;
}

interface BookingLockFieldsProps {
    value: BookingLockValue;
    onChange: (value: BookingLockValue) => void;
}

/** Per-session choice: hold the later week until a weekday and time, or open it when the card appears. */
const BookingLockFields = ({ value, onChange }: BookingLockFieldsProps) => (
    <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
        <label className="flex items-start gap-3 text-sm text-violet-950 dark:text-violet-100">
            <input
                type="checkbox"
                className="mt-0.5"
                checked={value.bookingLockEnabled}
                onChange={(event) => onChange({ ...value, bookingLockEnabled: event.target.checked })}
            />
            <span>
                <span className="font-semibold">Hold the later week until a set time</span>
                <span className="mt-1 block text-xs text-violet-800/80 dark:text-violet-200/80">
                    {value.bookingLockEnabled
                        ? 'Members can see that week early, but cannot join until this Eastern time. Sunday at 5:00 PM is the usual time.'
                        : 'Members can book a week as soon as its card is on the page. The next week can appear while this week is still ahead.'}
                </span>
            </span>
        </label>
        {value.bookingLockEnabled && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-violet-700 dark:text-violet-300">
                        Opens on
                    </label>
                    <select
                        value={value.bookingLockDay}
                        onChange={(event) => onChange({ ...value, bookingLockDay: event.target.value as DayName })}
                        className="w-full rounded-lg border border-violet-200 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-violet-800 dark:bg-court-950 dark:text-chalk"
                    >
                        {DAY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-violet-700 dark:text-violet-300">
                        Eastern time
                    </label>
                    <input
                        type="time"
                        value={value.bookingLockTime}
                        onChange={(event) =>
                            onChange({ ...value, bookingLockTime: event.target.value || '17:00' })
                        }
                        className="w-full rounded-lg border border-violet-200 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-violet-800 dark:bg-court-950 dark:text-chalk"
                    />
                </div>
            </div>
        )}
    </div>
);

export default BookingLockFields;
