import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
    children: ReactNode;
}

/** Renders modals on document.body so fixed positioning tracks the viewport, not blurred parents. */
const ModalPortal = ({ children }: ModalPortalProps) => {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    return createPortal(
        <div className="fixed inset-0 z-[160] overflow-y-auto overscroll-contain bg-black/50 p-4 sm:p-6">
            <div className="flex min-h-full items-start justify-center py-2 sm:items-center sm:py-8">
                {children}
            </div>
        </div>,
        document.body,
    );
};

export default ModalPortal;
