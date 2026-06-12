import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from './UIProvider';
import { useTransitionRouter } from './TransitionProvider';

/*
 * Full-bleed command deck. Giant staggered destinations on the left,
 * live sport-feed preferences (Firestore-synced) on the right.
 */
const MenuOverlay = () => {
    const { user, isAdmin, signOut, tabPreferences, updateTabPreferences } = useAuth();
    const { menuOpen, setMenuOpen, openFeedback } = useUI();
    const { go } = useTransitionRouter();
    const location = useLocation();
    const lenis = useLenis();

    const navigateTo = (path: string, label: string) => {
        setMenuOpen(false);
        window.setTimeout(() => go(path, label), 150);
    };

    const reserveCourt = () => {
        setMenuOpen(false);
        if (location.pathname === '/') {
            window.setTimeout(() => {
                const el = document.getElementById('radar');
                if (el) lenis?.scrollTo(el, { duration: 1.6, offset: -20 });
            }, 250);
        } else {
            window.setTimeout(() => go('/#radar', 'RESERVE'), 150);
        }
    };

    const handleExit = async () => {
        setMenuOpen(false);
        await signOut();
        window.setTimeout(() => go('/login', 'ACCESS'), 150);
    };

    const toggleSport = (id: string) => {
        const next = tabPreferences.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t));
        if (next.some((t) => t.visible)) updateTabPreferences(next);
    };

    interface Item { index: string; label: string; sub: string; action: () => void; accent?: boolean }

    const items: Item[] = [
        { index: '01', label: 'INDEX', sub: 'THE CLUBHOUSE', action: () => navigateTo('/', 'INDEX') },
        { index: '02', label: 'RESERVE', sub: 'COURT RADAR', action: reserveCourt, accent: true },
        user
            ? { index: '03', label: 'EXIT', sub: 'SIGN OUT OF THE GRID', action: handleExit }
            : { index: '03', label: 'ACCESS', sub: 'MEMBERS AIRLOCK', action: () => navigateTo('/login', 'ACCESS') },
        ...(isAdmin
            ? [{ index: '04', label: 'CONTROL', sub: 'OPERATIONS DECK', action: () => navigateTo('/admin', 'CONTROL') }]
            : []),
        { index: isAdmin ? '05' : '04', label: 'TRANSMIT', sub: 'SEND FEEDBACK', action: openFeedback },
    ];

    return (
        <AnimatePresence>
            {menuOpen && (
                <motion.div
                    className="fixed inset-0 z-[145] bg-[#0A0D0A]/97 backdrop-blur-xl"
                    initial={{ clipPath: 'inset(0 0 100% 0)' }}
                    animate={{ clipPath: 'inset(0 0 0% 0)' }}
                    exit={{ clipPath: 'inset(0 0 100% 0)' }}
                    transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
                >
                    <div className="flex h-full flex-col justify-between px-5 pb-8 pt-28 md:flex-row md:items-end md:px-12 md:pb-14">
                        {/* Destinations */}
                        <nav className="flex flex-col gap-1">
                            {items.map((item, i) => (
                                <div key={item.label} className="overflow-hidden">
                                    <motion.button
                                        onClick={item.action}
                                        data-cursor="hover"
                                        data-cursor-label={item.sub}
                                        className="group flex items-baseline gap-4 text-left"
                                        initial={{ y: '110%' }}
                                        animate={{ y: '0%' }}
                                        exit={{ y: '110%', transition: { duration: 0.3, delay: 0 } }}
                                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.18 + i * 0.07 }}
                                    >
                                        <span className="hud-label text-chalk/40">{item.index}</span>
                                        <span
                                            className={`display-tight text-[clamp(2.8rem,9vh,6.5rem)] transition-all duration-300 group-hover:translate-x-3 ${item.accent
                                                ? 'text-ace'
                                                : 'text-chalk group-hover:text-ace'
                                                }`}
                                        >
                                            {item.label}
                                        </span>
                                        <span className="hud-label hidden text-chalk/40 transition-colors group-hover:text-ace md:inline">
                                            {item.sub}
                                        </span>
                                    </motion.button>
                                </div>
                            ))}
                        </nav>

                        {/* Right rail: sport feeds + meta */}
                        <motion.div
                            className="mt-10 flex flex-col gap-8 md:mt-0 md:w-72"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 30, transition: { duration: 0.25 } }}
                            transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {user && (
                                <div>
                                    <p className="hud-label mb-3 text-chalk/50">SPORT FREQUENCIES</p>
                                    <div className="flex flex-col gap-2">
                                        {tabPreferences.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => toggleSport(tab.id)}
                                                data-cursor="hover"
                                                className={`flex items-center justify-between border px-4 py-2.5 font-mono text-[11px] uppercase tracking-hud transition-colors ${tab.visible
                                                    ? 'border-ace/60 text-ace'
                                                    : 'border-chalk/15 text-chalk/35'
                                                    }`}
                                            >
                                                {tab.id}
                                                <span>{tab.visible ? '● LIVE' : '○ MUTED'}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="hud-label mt-2 text-[8px] text-chalk/30">
                                        SYNCED TO YOUR MEMBER PROFILE
                                    </p>
                                </div>
                            )}

                            <div className="hairline-t pt-5">
                                <p className="hud-label text-chalk/50">FUQUA SCHOOL OF BUSINESS</p>
                                <p className="hud-label text-chalk/50">DUKE UNIVERSITY — DURHAM, NC</p>
                                <p className="hud-label mt-3 text-ace">35.9940°N / 78.8986°W</p>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MenuOverlay;
