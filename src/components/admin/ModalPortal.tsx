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
        <div className="fixed inset-0 z-[160] bg-black/50 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6">
            <div className="mx-auto flex h-full w-full max-w-md min-h-0 flex-col justify-center">
                {children}
            </div>
        </div>,
        document.body,
    );
};

export default ModalPortal;
