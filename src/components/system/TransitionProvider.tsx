import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLenis } from 'lenis/react';

/*
 * Cinematic route shutter.
 * `go(path, label)` slides chalk-black blades over the viewport, flashes the
 * destination callsign, swaps the route underneath, then lifts the blades.
 */

type Phase = 'idle' | 'cover' | 'reveal';

interface TransitionContextType {
    go: (to: string, label?: string) => void;
    phase: Phase;
}

const TransitionContext = createContext<TransitionContextType>({} as TransitionContextType);

const BLADES = 5;

const LABELS: Record<string, string> = {
    '/': 'INDEX',
    '/login': 'ACCESS',
    '/admin': 'CONTROL',
};

export const TransitionProvider = ({ children }: { children: React.ReactNode }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const lenis = useLenis();
    const [phase, setPhase] = useState<Phase>('idle');
    const [label, setLabel] = useState('');
    const pendingRef = useRef<string | null>(null);

    const go = useCallback(
        (to: string, customLabel?: string) => {
            if (phase !== 'idle') return;
            if (to === location.pathname) {
                lenis?.scrollTo(0, { duration: 1.2 });
                return;
            }
            pendingRef.current = to;
            setLabel(customLabel || LABELS[to] || to.replace('/', '').toUpperCase() || 'INDEX');
            setPhase('cover');
        },
        [phase, location.pathname, lenis]
    );

    const handleCoverComplete = () => {
        if (phase !== 'cover') return;
        const to = pendingRef.current;
        pendingRef.current = null;
        if (to) {
            navigate(to);
            lenis?.scrollTo(0, { immediate: true, force: true });
            window.scrollTo(0, 0);
        }
        // brief hold on full cover so the route can mount underneath
        window.setTimeout(() => setPhase('reveal'), 180);
    };

    const handleRevealComplete = () => {
        if (phase === 'reveal') setPhase('idle');
    };

    return (
        <TransitionContext.Provider value={{ go, phase }}>
            {children}

            {/* Shutter blades */}
            <div
                className={`fixed inset-0 z-[160] flex ${phase === 'idle' ? 'pointer-events-none' : 'pointer-events-auto'}`}
                aria-hidden
            >
                {Array.from({ length: BLADES }).map((_, i) => (
                    <motion.div
                        key={i}
                        className="relative h-full flex-1 bg-[#0B0E0B]"
                        style={{ borderRight: i < BLADES - 1 ? '1px solid rgba(215,255,62,0.07)' : 'none' }}
                        initial={false}
                        animate={
                            phase === 'cover'
                                ? { y: '0%' }
                                : phase === 'reveal'
                                    ? { y: '-100.5%' }
                                    : { y: '100.5%' }
                        }
                        transition={
                            phase === 'idle'
                                ? { duration: 0 }
                                : {
                                    duration: phase === 'cover' ? 0.5 : 0.6,
                                    ease: [0.76, 0, 0.24, 1],
                                    delay: i * 0.045,
                                }
                        }
                        onAnimationComplete={
                            i === BLADES - 1
                                ? phase === 'cover'
                                    ? handleCoverComplete
                                    : handleRevealComplete
                                : undefined
                        }
                    />
                ))}

                {/* Destination callsign */}
                <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    initial={false}
                    animate={{ opacity: phase === 'cover' ? 1 : 0 }}
                    transition={{ duration: 0.25, delay: phase === 'cover' ? 0.25 : 0 }}
                >
                    <div className="flex items-baseline gap-4">
                        <span className="hud-label text-ace/70">FRC →</span>
                        <span className="display-tight text-[clamp(3rem,9vw,8rem)] text-chalk">{label}</span>
                    </div>
                </motion.div>
            </div>
        </TransitionContext.Provider>
    );
};

export const useTransitionRouter = () => useContext(TransitionContext);
