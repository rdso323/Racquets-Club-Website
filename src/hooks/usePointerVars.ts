import { useEffect } from 'react';

const supportsFinePointer = () =>
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Maps pointer position to CSS custom properties — no React re-renders per frame. */
export const usePointerVars = () => {
    useEffect(() => {
        if (!supportsFinePointer()) return;

        let raf = 0;
        let pendingX = 0;
        let pendingY = 0;

        const flush = () => {
            document.documentElement.style.setProperty('--mouse-x', `${pendingX}px`);
            document.documentElement.style.setProperty('--mouse-y', `${pendingY}px`);
            raf = 0;
        };

        const onMove = (e: MouseEvent) => {
            pendingX = e.clientX;
            pendingY = e.clientY;
            if (!raf) raf = requestAnimationFrame(flush);
        };

        window.addEventListener('mousemove', onMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', onMove);
            if (raf) cancelAnimationFrame(raf);
        };
    }, []);
};

export default usePointerVars;
