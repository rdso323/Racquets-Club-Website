import { useEffect, useState } from 'react';

interface AdminNumericFieldProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    required?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const clamp = (value: number, min?: number, max?: number): number => {
    let next = value;
    if (min != null) next = Math.max(min, next);
    if (max != null) next = Math.min(max, next);
    return next;
};

const parseInput = (raw: string, min?: number): number | null => {
    const trimmed = raw.trim();
    if (trimmed === '') return min != null ? min : 0;
    const normalized = trimmed.replace(/^0+(?=\d)/, '');
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return Math.trunc(parsed);
};

const AdminNumericField = ({
    value,
    onChange,
    min,
    max,
    required,
    placeholder,
    disabled,
    className = 'w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900 focus:ring-1 focus:ring-court-accent dark:border-gray-700 dark:bg-court-950 dark:text-chalk',
}: AdminNumericFieldProps) => {
    const [display, setDisplay] = useState(String(value));

    useEffect(() => {
        setDisplay(String(value));
    }, [value]);

    const commit = (raw: string) => {
        const parsed = parseInput(raw, min);
        if (parsed == null) {
            setDisplay(String(value));
            return;
        }
        const next = clamp(parsed, min, max);
        setDisplay(String(next));
        onChange(next);
    };

    return (
        <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            value={display}
            onChange={(e) => {
                if (disabled) return;
                const raw = e.target.value;
                if (raw === '' || /^\d*$/.test(raw)) {
                    setDisplay(raw);
                    const parsed = parseInput(raw, min);
                    if (parsed != null) {
                        onChange(clamp(parsed, min, max));
                    }
                }
            }}
            onBlur={() => commit(display)}
            className={`${className}${disabled ? ' opacity-50' : ''}`}
        />
    );
};

export default AdminNumericField;
