import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

/*
 * Twin-element cursor: a hard fluoro dot plus a lagging ring.
 * Elements tagged data-cursor="hover" swell the ring; data-cursor-label
 * prints a micro callout next to it. Desktop (fine pointer) only.
 */
const supportsCursor = () =>
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const CustomCursor = () => {
    const [enabled] = useState(supportsCursor);
    const [hovering, setHovering] = useState(false);
    const [label, setLabel] = useState('');

    const x = useMotionValue(-100);
    const y = useMotionValue(-100);
    const ringX = useSpring(x, { stiffness: 260, damping: 26, mass: 0.6 });
    const ringY = useSpring(y, { stiffness: 260, damping: 26, mass: 0.6 });

    useEffect(() => {
        if (!enabled) return;
        document.documentElement.classList.add('cursor-none-host');

        const onMove = (e: MouseEvent) => {
            x.set(e.clientX);
            y.set(e.clientY);
            const target = (e.target as HTMLElement)?.closest?.('[data-cursor]') as HTMLElement | null;
            if (target) {
                setHovering(true);
                setLabel(target.getAttribute('data-cursor-label') || '');
            } else {
                setHovering(false);
                setLabel('');
            }
        };

        window.addEventListener('mousemove', onMove, { passive: true });
        return () => {
            window.removeEventListener('mousemove', onMove);
            document.documentElement.classList.remove('cursor-none-host');
        };
    }, [enabled, x, y]);

    if (!enabled) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-[300]" aria-hidden>
            {/* hard dot */}
            <motion.div
                className="absolute h-1.5 w-1.5 rounded-full bg-ace"
                style={{ x, y, translateX: '-50%', translateY: '-50%' }}
            />
            {/* lagging ring */}
            <motion.div
                className="absolute flex items-center justify-center rounded-full border border-chalk/50"
                style={{ x: ringX, y: ringY, translateX: '-50%', translateY: '-50%' }}
                animate={{
                    width: hovering ? 56 : 28,
                    height: hovering ? 56 : 28,
                    borderColor: hovering ? 'rgba(215,255,62,0.9)' : 'rgba(237,242,228,0.45)',
                }}
                transition={{ type: 'spring', stiffness: 320, damping: 24 }}
            >
                {label && (
                    <span className="hud-label whitespace-nowrap text-ace translate-y-9">{label}</span>
                )}
            </motion.div>
        </div>
    );
};

export default CustomCursor;
