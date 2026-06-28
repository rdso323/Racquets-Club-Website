import { X } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import ModalPortal from './ModalPortal';

interface AdminModalShellProps {
    title: string;
    onClose: () => void;
    onSubmit: (e: FormEvent) => void;
    children: ReactNode;
    submitLabel?: string;
}

const AdminModalShell = ({
    title,
    onClose,
    onSubmit,
    children,
    submitLabel = 'Save Changes',
}: AdminModalShellProps) => (
    <ModalPortal>
        <div className="flex min-h-0 max-h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-carbon">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 pb-2 pt-4 dark:border-gray-800 sm:px-6 sm:pt-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-chalk">{title}</h3>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3 sm:space-y-4 sm:px-6 sm:py-4">
                    {children}
                </div>
                <div className="flex shrink-0 justify-end gap-2 rounded-b-2xl border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-carbon sm:px-6 sm:py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="min-h-11 touch-manipulation px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="clay-gradient min-h-11 touch-manipulation rounded-lg px-4 py-2 text-sm text-white hover:brightness-110"
                    >
                        {submitLabel}
                    </button>
                </div>
            </form>
        </div>
    </ModalPortal>
);

export default AdminModalShell;
