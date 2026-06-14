import { useEffect, useState } from 'react';

const supportsFinePointer = () =>
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** CSS custom-property cursor — no React state on mousemove. */
const PointerSurface = () => {
    const [enabled] = useState(supportsFinePointer);

    useEffect(() => {
        if (!enabled) return;
        document.documentElement.classList.add('cursor-none-host');
        return () => document.documentElement.classList.remove('cursor-none-host');
    }, [enabled]);

    if (!enabled) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[300]" aria-hidden>
            <div className="pointer-dot absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-court-accent" />
            <div className="pointer-ring absolute left-0 top-0 h-7 w-7 rounded-full border border-chalk/40" />
        </div>
    );
};

export default PointerSurface;
