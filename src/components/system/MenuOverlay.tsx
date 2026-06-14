import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from './UIProvider';
import { SPORTS } from '../../lib/sports';

const MenuOverlay = () => {
    const { user, isAdmin, signOut, tabPreferences, updateTabPreferences } = useAuth();
    const { menuOpen, setMenuOpen, openFeedback } = useUI();
    const location = useLocation();
    const navigate = useNavigate();
    const lenis = useLenis();

    const closeAnd = (action: () => void) => {
        setMenuOpen(false);
        window.setTimeout(action, 180);
    };

    const scrollToBooking = () => {
        closeAnd(() => {
            const el = document.getElementById('booking-section');
            if (el) lenis?.scrollTo(el, { duration: 1.4, offset: -80 });
            else if (location.pathname !== '/') navigate('/');
        });
    };

    const goTo = (path: string) => closeAnd(() => navigate(path));

    const toggleSport = (id: string) => {
        const next = tabPreferences.map((t) =>
            t.id === id ? { ...t, visible: !t.visible } : t,
        );
        if (next.some((t) => t.visible)) updateTabPreferences(next);
    };

    const items = [
        { index: '01', label: 'Home', sub: 'Club overview', action: () => goTo('/') },
        { index: '02', label: 'Book a Court', sub: 'Session availability', action: scrollToBooking, accent: true },
        user
            ? { index: '03', label: 'Sign Out', sub: 'End session', action: () => closeAnd(() => signOut()) }
            : { index: '03', label: 'Member Login', sub: 'Duke.edu accounts', action: () => goTo('/login') },
        ...(isAdmin
            ? [{ index: '04', label: 'Admin', sub: 'Club operations', action: () => goTo('/admin') }]
            : []),
        {
            index: isAdmin ? '05' : '04',
            label: 'Feedback',
            sub: 'Share your thoughts',
            action: () => closeAnd(openFeedback),
        },
    ];

    return (
        <AnimatePresence>
            {menuOpen && (
                <motion.div
                    className="fixed inset-0 z-[145] bg-court-950/97 backdrop-blur-xl"
                    initial={{ clipPath: 'inset(0 0 100% 0)' }}
                    animate={{ clipPath: 'inset(0 0 0% 0)' }}
                    exit={{ clipPath: 'inset(0 0 100% 0)' }}
                    transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                >
                    <div className="flex h-full flex-col justify-between px-5 pb-10 pt-28 md:flex-row md:items-end md:px-12 md:pb-14">
                        <nav className="flex flex-col gap-1">
                            {items.map((item, i) => (
                                <div key={item.label} className="overflow-hidden">
                                    <motion.button
                                        onClick={item.action}
                                        data-cursor="hover"
                                        className="group flex items-baseline gap-4 text-left"
                                        initial={{ y: '100%' }}
                                        animate={{ y: '0%' }}
                                        transition={{ delay: 0.08 + i * 0.06, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <span className="hud-label w-8 text-chalk/30">{item.index}</span>
                                        <span
                                            className={`font-display text-3xl transition-colors md:text-5xl ${
                                                item.accent
                                                    ? 'text-court-accent group-hover:text-clay-300'
                                                    : 'text-chalk group-hover:text-clay-300'
                                            }`}
                                        >
                                            {item.label}
                                        </span>
                                        <span className="hidden hud-label text-chalk/35 md:inline">{item.sub}</span>
                                    </motion.button>
                                </div>
                            ))}
                        </nav>

                        <div className="mt-10 md:mt-0 md:max-w-xs">
                            <p className="hud-label mb-4 text-chalk/40">Your sports</p>
                            <div className="flex flex-col gap-2">
                                {tabPreferences.map((tab) => {
                                    const sport = SPORTS.find((s) => s === tab.id);
                                    if (!sport) return null;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => toggleSport(tab.id)}
                                            data-cursor="hover"
                                            className={`flex items-center justify-between border px-4 py-3 text-left transition-colors ${
                                                tab.visible
                                                    ? 'border-court-accent/30 bg-court-accent/5 text-chalk'
                                                    : 'border-chalk/10 text-chalk/40 hover:border-chalk/20'
                                            }`}
                                        >
                                            <span className="text-sm font-medium">{tab.id}</span>
                                            <span className="hud-label text-[9px]">
                                                {tab.visible ? 'Visible' : 'Hidden'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="mt-6 hud-label text-chalk/30">
                                Fuqua School of Business · Duke University
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MenuOverlay;
