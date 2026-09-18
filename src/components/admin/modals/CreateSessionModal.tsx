import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import type { Sport } from '../../../lib/sports';
import ScheduleSessionForm from './ScheduleSessionForm';

interface CreateSessionModalProps {
    initialSport?: Sport | string;
    onClose: () => void;
}

/** Wide modal for creating a session from the booking page (admin only). */
const CreateSessionModal = ({ initialSport = 'Tennis', onClose }: CreateSessionModalProps) => {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKey);
        };
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[160] flex items-start justify-center overflow-y-auto bg-black/50 p-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:p-6"
            onClick={onClose}
            role="presentation"
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Schedule new session"
                className="my-2 flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-carbon sm:my-0"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 pb-2 pt-4 dark:border-gray-800 sm:px-6 sm:pt-5">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-chalk">Schedule New Session</h3>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-chalk/50">
                            One-time or weekly recurring · prefilled with {initialSport}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                <div
                    data-lenis-prevent
                    className="max-h-[min(80dvh,44rem)] space-y-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
                >
                    <ScheduleSessionForm
                        initialSport={initialSport}
                        compact
                        onCreated={onClose}
                    />
                </div>
            </div>
        </div>,
        document.body,
    );
};

export default CreateSessionModal;
