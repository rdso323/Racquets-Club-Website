import { formatDisplayDate } from '../../../lib/dates';

interface DatePickerFieldProps {
    label?: string;
    value: string;
    onChange: (iso: string) => void;
    required?: boolean;
}

const DatePickerField = ({ label = 'Date', value, onChange, required }: DatePickerFieldProps) => (
    <div>
        <label className="mb-1 block text-xs font-bold uppercase text-gray-500">{label}</label>
        <input
            type="date"
            required={required}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk"
        />
        {value && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formatDisplayDate(value)}</p>
        )}
    </div>
);

export default DatePickerField;
