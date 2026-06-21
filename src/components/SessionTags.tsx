import { CalendarDays, Rocket } from 'lucide-react';
import { isRecurringSession, type Session } from '../lib/sessions';

interface SessionTagsProps {
    session: Session;
    variant?: 'admin' | 'booking';
    className?: string;
}

const adminTypeClass = (type: Session['type']) =>
    type === 'coaching'
        ? 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/20 dark:bg-blue-950/30 dark:text-blue-450'
        : 'border-green-100 bg-green-50 text-green-600 dark:border-green-900/20 dark:bg-green-950/30 dark:text-green-400';

const adminScheduleClass = (recurring: boolean) =>
    recurring
        ? 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/20 dark:bg-violet-950/30 dark:text-violet-300'
        : 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-court-950/40 dark:text-gray-300';

const SessionTags = ({ session, variant = 'admin', className = '' }: SessionTagsProps) => {
    const isRecurring = isRecurringSession(session);
    const isClinic = session.type === 'coaching';
    const typeLabel = isClinic ? 'Clinic' : 'Open Play';
    const scheduleLabel = isRecurring ? 'Recurring' : 'One-time';

    if (variant === 'booking') {
        return (
            <div className={`flex flex-wrap items-center gap-2 ${className}`}>
                <span className="inline-flex items-center gap-1.5 rounded bg-court-accent/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest accent-text">
                    {isClinic ? <Rocket className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
                    {typeLabel}
                </span>
                <span
                    className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isRecurring
                            ? 'border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-200'
                            : 'border border-gray-200 bg-gray-50 text-gray-600 dark:border-chalk/10 dark:bg-carbon/60 dark:text-chalk/60'
                    }`}
                >
                    {scheduleLabel}
                </span>
            </div>
        );
    }

    return (
        <div className={`flex flex-wrap items-center justify-end gap-1.5 ${className}`}>
            <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${adminTypeClass(session.type)}`}
            >
                {typeLabel}
            </span>
            <span
                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${adminScheduleClass(isRecurring)}`}
            >
                {scheduleLabel}
            </span>
        </div>
    );
};

export default SessionTags;
