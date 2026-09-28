import type { DayName } from '../../../lib/sports';
import { listWeekdayPlayDates } from '../../../lib/sessions';

interface SkipWeekTogglesProps {
    day: DayName;
    endsOn?: string;
    skipDates: string[];
    onChange: (skipDates: string[]) => void;
}

const shortWeekLabel = (iso: string): string => {
    const parts = iso.split('-').map(Number);
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return iso;
    const [year, month, day] = parts;
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
};

/** Weekday dates that start on. Turning one off stores that date as skipped. */
const SkipWeekToggles = ({ day, endsOn, skipDates, onChange }: SkipWeekTogglesProps) => {
    const dates = listWeekdayPlayDates(day, endsOn || undefined);
    const skipped = new Set(skipDates);

    const toggle = (iso: string) => {
        if (skipped.has(iso)) {
            onChange(skipDates.filter((date) => date !== iso));
            return;
        }
        onChange([...skipDates, iso].sort());
    };

    return (
        <fieldset className="rounded-xl border border-violet-200 bg-violet-50/70 p-3 dark:border-violet-900/40 dark:bg-violet-950/20">
            <legend className="px-1 text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                Weeks
            </legend>
            <p className="mb-3 text-xs text-violet-800/80 dark:text-violet-200/80">
                Turn off dates that will not happen. Those weeks do not appear for members. A week that already has people booked still shows as cancelled.
            </p>
            {dates.length === 0 ? (
                <p className="text-xs text-gray-500">No dates of this weekday before the end date.</p>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {dates.map((iso) => {
                        const on = !skipped.has(iso);
                        return (
                            <button
                                key={iso}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggle(iso)}
                                className={
                                    on
                                        ? 'rounded-full border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-950 dark:border-violet-700 dark:bg-court-950 dark:text-violet-100'
                                        : 'rounded-full border border-dashed border-gray-300 bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-400 line-through dark:border-gray-700 dark:bg-court-950/60 dark:text-gray-500'
                                }
                            >
                                {shortWeekLabel(iso)}
                            </button>
                        );
                    })}
                </div>
            )}
        </fieldset>
    );
};

export default SkipWeekToggles;
