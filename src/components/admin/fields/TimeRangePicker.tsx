import { useMemo, useState } from 'react';
import {
    buildEventTimePayload,
    resolveEventTimes,
    resolveSessionTimes,
    timePartsFrom24,
    type TimeFields,
    type TimeParts,
} from '../../../lib/dates';

interface TimeRangePickerProps {
    label?: string;
    startTime?: string;
    endTime?: string;
    legacyTime?: string;
    onChange: (fields: TimeFields) => void;
    allowEndTime?: boolean;
}

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const selectClass =
    'rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk';

const TimeSelects = ({
    parts,
    onChange,
}: {
    parts: TimeParts;
    onChange: (parts: TimeParts) => void;
}) => (
    <div className="flex flex-wrap items-center gap-2">
        <select
            value={parts.hour12}
            onChange={(e) => onChange({ ...parts, hour12: Number(e.target.value) })}
            className={selectClass}
            aria-label="Hour"
        >
            {HOURS.map((h) => (
                <option key={h} value={h}>
                    {h}
                </option>
            ))}
        </select>
        <span className="text-sm text-gray-400">:</span>
        <select
            value={parts.minute}
            onChange={(e) => onChange({ ...parts, minute: Number(e.target.value) })}
            className={selectClass}
            aria-label="Minute"
        >
            {MINUTES.map((m) => (
                <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                </option>
            ))}
        </select>
        <select
            value={parts.period}
            onChange={(e) => onChange({ ...parts, period: e.target.value as 'AM' | 'PM' })}
            className={selectClass}
            aria-label="AM or PM"
        >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
        </select>
    </div>
);

const TimeRangePicker = ({
    label = 'Time',
    startTime,
    endTime,
    legacyTime = '',
    onChange,
    allowEndTime = true,
}: TimeRangePickerProps) => {
    const resolved = useMemo(
        () =>
            startTime
                ? { startTime, endTime }
                : legacyTime
                  ? resolveEventTimes({ time: legacyTime, startTime, endTime }) ??
                    resolveSessionTimes({ time: legacyTime, startTime, endTime })
                  : null,
        [startTime, endTime, legacyTime],
    );

    const [startParts, setStartParts] = useState<TimeParts>(() =>
        resolved ? timePartsFrom24(resolved.startTime) : { hour12: 6, minute: 30, period: 'PM' },
    );
    const [endParts, setEndParts] = useState<TimeParts>(() =>
        resolved?.endTime
            ? timePartsFrom24(resolved.endTime)
            : { hour12: 8, minute: 0, period: 'PM' },
    );
    const [hasEndTime, setHasEndTime] = useState(!!resolved?.endTime);

    const emitChange = (start: TimeParts, end: TimeParts, includeEnd: boolean) => {
        onChange(buildEventTimePayload(start, includeEnd ? end : null));
    };

    return (
        <div>
            <label className="mb-1 block text-xs font-bold uppercase text-gray-500">{label}</label>
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-court-950/30">
                <div>
                    <p className="mb-1 text-xs font-semibold text-gray-500">Start</p>
                    <TimeSelects
                        parts={startParts}
                        onChange={(parts) => {
                            setStartParts(parts);
                            emitChange(parts, endParts, hasEndTime);
                        }}
                    />
                </div>
                {allowEndTime && (
                    <>
                        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={hasEndTime}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setHasEndTime(checked);
                                    emitChange(startParts, endParts, checked);
                                }}
                                className="rounded border-gray-300 text-court-accent focus:ring-court-accent"
                            />
                            Add end time
                        </label>
                        {hasEndTime && (
                            <div>
                                <p className="mb-1 text-xs font-semibold text-gray-500">End</p>
                                <TimeSelects
                                    parts={endParts}
                                    onChange={(parts) => {
                                        setEndParts(parts);
                                        emitChange(startParts, parts, true);
                                    }}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default TimeRangePicker;
