import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../contexts/ThemeContext';
import { LOGO_CLASS, logoSrcForTheme } from '../../lib/branding';

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STATUS_LINES = [
    'Pulling court rosters…',
    'Checking availability…',
    'Courts are loading…',
];

interface PreloaderProps {
    onReveal: () => void;
    onDone: () => void;
}

const Preloader = ({ onReveal, onDone }: PreloaderProps) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const [reduced] = useState(prefersReducedMotion);
    const [count, setCount] = useState(0);
    const [statusIndex, setStatusIndex] = useState(0);
    const [exiting, setExiting] = useState(() => prefersReducedMotion());
    const revealedRef = useRef(false);

    useEffect(() => {
        if (reduced) {
            onReveal();
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
                window.setTimeout(() => {
                    if (!revealedRef.current) {
                        revealedRef.current = true;
                        onReveal();
                    }
                    setExiting(true);
                }, 300);
            }
        };

        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [reduced, onReveal, onDone]);

    return (
        <AnimatePresence onExitComplete={onDone}>
            {!exiting && (
                <motion.div
                    className={`fixed inset-0 z-[250] flex flex-col justify-between px-6 py-8 md:px-10 ${
                        isDark ? 'bg-court-950' : 'bg-[#F3F0E8]'
                    }`}
                    exit={{ y: '-100%' }}
                    transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
                >
                    <div className="flex items-start justify-between">
                        <img
                            src={logoSrcForTheme(theme)}
                            alt="Fuqua Racquets Club"
                            className={LOGO_CLASS.preloader}
                        />
                        <span className={`hud-label ${isDark ? 'text-chalk/60' : 'text-gray-500'}`}>
                            Durham, NC
                        </span>
                    </div>

                    <div className="flex items-end justify-between gap-8">
                        <div>
                            <motion.p
                                className={`hud-label mb-4 ${isDark ? 'text-court-accent' : 'text-emerald-700'}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.15 }}
                            >
                                {STATUS_LINES[statusIndex]}
                            </motion.p>
                            <div className="overflow-hidden">
                                <motion.h1
                                    className={`display-tight text-[clamp(2.4rem,7vw,6.5rem)] ${
                                        isDark ? 'text-chalk' : 'text-wimbledon-navy'
                                    }`}
                                    initial={{ y: '110%' }}
                                    animate={{ y: '0%' }}
                                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
                                >
                                    Courts are loading.
                                </motion.h1>
                            </div>
                            <div className="overflow-hidden">
                                <motion.h1
                                    className={`display-tight text-[clamp(2.4rem,7vw,6.5rem)] italic ${
                                        isDark ? 'text-clay-300' : 'text-clay-600'
                                    }`}
                                    initial={{ y: '110%' }}
                                    animate={{ y: '0%' }}
                                    transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
                                >
                                    See you on court.
                                </motion.h1>
                            </div>
                        </div>

                        <div className="shrink-0 text-right">
                            <span
                                className={`display-tight block text-[clamp(2.5rem,8vw,7rem)] leading-none tabular-nums ${
                                    isDark ? 'text-court-accent' : 'text-emerald-600'
                                }`}
                            >
                                {String(count).padStart(3, '0')}
                            </span>
                            <span className={`hud-label ${isDark ? 'text-chalk/45' : 'text-gray-500'}`}>
                                Loading
                            </span>
                        </div>
                    </div>

                    <div className={`h-px w-full ${isDark ? 'bg-chalk/10' : 'bg-gray-300/70'}`}>
                        <div
                            className={`h-px transition-[width] duration-100 ${
                                isDark ? 'bg-court-accent' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${count}%` }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Preloader;
