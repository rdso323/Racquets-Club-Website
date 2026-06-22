import { useEffect, useRef, useState } from 'react';
import { CalendarX, Edit, RotateCcw, Settings, Trash2, Users } from 'lucide-react';
import { type Session, isRecurringSession } from '../../lib/sessions';

interface BookingCardAdminMenuProps {
    session: Session;
    onEdit: () => void;
    onManageRoster: () => void;
    onCancelThisWeek?: () => void;
    onRestoreThisWeek?: () => void;
    onDelete: () => void;
}

const BookingCardAdminMenu = ({
    session,
    onEdit,
    onManageRoster,
    onCancelThisWeek,
    onRestoreThisWeek,
    onDelete,
}: BookingCardAdminMenuProps) => {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const isRecurring = isRecurringSession(session);
    const isCancelledThisWeek = session.cancelledThisWeek === true;

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!rootRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    const run = (action: () => void) => {
        setOpen(false);
        action();
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="rounded-lg border border-gray-200 bg-white/80 p-1.5 text-gray-500 transition-colors hover:border-court-accent/40 hover:text-court-accent dark:border-chalk/10 dark:bg-carbon/80 dark:text-chalk/50 dark:hover:text-court-accent"
                aria-label="Session admin options"
                aria-expanded={open}
            >
                <Settings className="h-4 w-4" />
            </button>

            {open && (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-48 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-800 dark:bg-carbon">
                    <button
                        type="button"
                        onClick={() => run(onEdit)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-chalk/80 dark:hover:bg-court-950/60"
                    >
                        <Edit className="h-3.5 w-3.5" />
                        Edit details
                    </button>
                    <button
                        type="button"
                        onClick={() => run(onManageRoster)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:text-chalk/80 dark:hover:bg-court-950/60"
                    >
                        <Users className="h-3.5 w-3.5" />
                        Manage roster
                    </button>
                    {isRecurring && (
                        <>
                            <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                            {isCancelledThisWeek ? (
                                <button
                                    type="button"
                                    onClick={() => onRestoreThisWeek && run(onRestoreThisWeek)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    Restore this week
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => onCancelThisWeek && run(onCancelThisWeek)}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                >
                                    <CalendarX className="h-3.5 w-3.5" />
                                    Cancel this week
                                </button>
                            )}
                        </>
                    )}
                    <div className="my-1 border-t border-gray-100 dark:border-gray-800" />
                    <button
                        type="button"
                        onClick={() => run(onDelete)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isRecurring ? 'Remove schedule' : 'Delete session'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default BookingCardAdminMenu;
