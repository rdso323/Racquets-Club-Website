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
        <div className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-carbon">
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 pb-2 pt-6 dark:border-gray-800">
                <h3 className="text-lg font-bold text-gray-900 dark:text-chalk">{title}</h3>
                <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>
            </div>
            <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-4">
                    {children}
                </div>
                <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-800 dark:bg-carbon">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="clay-gradient rounded-lg px-4 py-2 text-sm text-white hover:brightness-110"
                    >
                        {submitLabel}
                    </button>
                </div>
            </form>
        </div>
    </ModalPortal>
);

export default AdminModalShell;
