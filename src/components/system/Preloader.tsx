import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/*
 * Boot sequence: telemetry counter 000→100, callsign stack,
 * then the whole plate splits upward to reveal the clubhouse.
 */
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const Preloader = ({ onDone }: { onDone: () => void }) => {
    const [reduced] = useState(prefersReducedMotion);
    const [count, setCount] = useState(0);
    const [exiting, setExiting] = useState(() => prefersReducedMotion());

    useEffect(() => {
        if (reduced) {
            onDone();
            return;
        }

        const start = performance.now();
        const DURATION = 1500;
        let raf: number;
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / DURATION);
            const eased = 1 - Math.pow(1 - t, 3);
            setCount(Math.round(eased * 100));
            if (t < 1) {
                raf = requestAnimationFrame(tick);
            } else {
                window.setTimeout(() => setExiting(true), 250);
            }
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [reduced, onDone]);

    return (
        <AnimatePresence onExitComplete={onDone}>
            {!exiting && (
                <motion.div
                    className="fixed inset-0 z-[250] flex flex-col justify-between bg-[#070907] px-6 py-6 md:px-10"
                    exit={{ y: '-100%' }}
                    transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
                >
                    <div className="flex items-start justify-between">
                        <span className="hud-label text-chalk/60">FUQUA RACQUETS CLUB</span>
                        <span className="hud-label text-chalk/60">DURHAM, NC — 35.99°N</span>
                    </div>

                    <div className="flex items-end justify-between gap-6">
                        <div>
                            <motion.p
                                className="hud-label text-ace mb-4"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                ● BOOT SEQUENCE / AFTER DARK OS
                            </motion.p>
                            <div className="overflow-hidden">
                                <motion.h1
                                    className="display-tight text-[clamp(2.6rem,8vw,7rem)] text-chalk"
                                    initial={{ y: '110%' }}
                                    animate={{ y: '0%' }}
                                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                                >
                                    THE COURTS
                                </motion.h1>
                            </div>
                            <div className="overflow-hidden">
                                <motion.h1
                                    className="display-tight text-[clamp(2.6rem,8vw,7rem)] text-hollow"
                                    initial={{ y: '110%' }}
                                    animate={{ y: '0%' }}
                                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.22 }}
                                >
                                    ARE WAITING
                                </motion.h1>
                            </div>
                        </div>

                        <div className="text-right shrink-0">
                            <span className="display-tight block text-[clamp(3rem,10vw,9rem)] leading-none text-ace tabular-nums">
                                {String(count).padStart(3, '0')}
                            </span>
                            <span className="hud-label text-chalk/50">SYSTEM CHARGE %</span>
                        </div>
                    </div>

                    {/* charge bar */}
                    <div className="h-px w-full bg-chalk/10">
                        <div className="h-px bg-ace transition-[width] duration-100" style={{ width: `${count}%` }} />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Preloader;
