import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STATUS_LINES = [
    'Gathering roster data…',
    'Drawing baseline markers…',
    'Courts are waiting.',
];

const Preloader = ({ onDone }: { onDone: () => void }) => {
    const [reduced] = useState(prefersReducedMotion);
    const [count, setCount] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);
    const [exiting, setExiting] = useState(() => prefersReducedMotion());

    useEffect(() => {
        if (reduced) {
            onDone();
            return;
        }

        const start = performance.now();
        const DURATION = 1800;
        let raf: number;

        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION);
            const eased = 1 - Math.pow(1 - t, 3);
            const value = Math.round(eased * 100);
            setCount(value);
            setStatusIndex(Math.min(STATUS_LINES.length - 1, Math.floor(t * STATUS_LINES.length)));
            if (t < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                window.setTimeout(() => setExiting(true), 300);
            }
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [reduced, onDone]);

    return (
        <AnimatePresence onExitComplete={onDone}>
            {!exiting && (
                <motion.div
                    className="fixed inset-0 z-[250] flex flex-col justify-between bg-court-950 px-6 py-8 md:px-10"
                    exit={{ y: '-100%' }}
                    transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
                >
                    <div className="flex items-start justify-between">
                        <span className="hud-label text-chalk/60">Fuqua Racquets Club</span>
                        <span className="hud-label text-chalk/60">Durham, NC</span>
                    </div>

                    <div className="flex items-end justify-between gap-8">
                        <div>
                            <motion.p
                                className="hud-label mb-4 text-court-accent"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.15 }}
                            >
                                {STATUS_LINES[statusIndex]}
                            </motion.p>
                            <div className="overflow-hidden">
                                <motion.h1
                                    className="display-tight text-[clamp(2.4rem,7vw,6.5rem)] text-chalk"
                                    initial={{ y: '110%' }}
                                    animate={{ y: '0%' }}
                                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
                                >
                                    The court
                                </motion.h1>
                            </div>
                            <div className="overflow-hidden">
                                <motion.h1
                                    className="display-tight text-[clamp(2.4rem,7vw,6.5rem)] italic text-clay-300"
                                    initial={{ y: '110%' }}
                                    animate={{ y: '0%' }}
                                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
                                >
                                    is calling.
                                </motion.h1>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <span className="display-tight block text-[clamp(2.5rem,8vw,7rem)] leading-none text-court-accent tabular-nums">
                                {String(count).padStart(3, '0')}
                            </span>
                            <span className="hud-label text-chalk/45">Loading</span>
                        </div>
                    </div>

                    <div className="h-px w-full bg-chalk/10">
                        <div
                            className="h-px bg-court-accent transition-[width] duration-100"
                            style={{ width: `${count}%` }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Preloader;
