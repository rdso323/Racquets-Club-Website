import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

interface ScrollNavButtonProps {
    label: string;
    onClick: () => void;
    className?: string;
}

const ScrollNavButton = ({ label, onClick, className = '' }: ScrollNavButtonProps) => {
    const prefersReducedMotion = usePrefersReducedMotion();
    const [pulse, setPulse] = useState(!prefersReducedMotion);

    useEffect(() => {
        if (prefersReducedMotion) return;
        const timer = window.setTimeout(() => setPulse(false), 3200);
        return () => window.clearTimeout(timer);
    }, [prefersReducedMotion]);

    return (
        <div className={`flex justify-center ${className}`}>
            <button
                type="button"
                onClick={onClick}
                className={`inline-flex min-h-11 touch-manipulation flex-col items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-white dark:border-chalk/10 dark:bg-court-900/70 dark:text-chalk/85 dark:hover:bg-court-900 ${
                    pulse ? 'motion-safe:animate-pulse ring-2 ring-court-accent/35' : ''
                }`}
                aria-label={label}
            >
                <span>{label}</span>
                <ChevronDown className="h-4 w-4 text-gray-400 dark:text-chalk/50" aria-hidden />
            </button>
        </div>
    );
};

export default ScrollNavButton;
