import { useEffect, useState } from 'react';

const supportsFinePointer = () =>
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** CSS custom-property cursor — positioned entirely from --mouse/--ring vars (no React state per frame). */
const PointerSurface = () => {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
        setEnabled(supportsFinePointer());
    }, []);

    if (!enabled) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[300]" aria-hidden>
            <div className="pointer-dot" />
            <div className="pointer-ring" />
        </div>
    );
};

export default PointerSurface;
