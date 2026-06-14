import { useEffect } from 'react';
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

    useEffect(() => {
        if (!menuOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [menuOpen]);

    const closeAnd = (action: () => void) => {
        setMenuOpen(false);
        window.setTimeout(action, 180);
    };

    const scrollToId = (id: string) => {
        closeAnd(() => {
            if (location.pathname !== '/') {
                navigate('/');
                window.setTimeout(() => {
                    const el = document.getElementById(id);
                    if (el) lenis?.scrollTo(el, { duration: 1.4, offset: -80 });
                }, 400);
                return;
            }
            const el = document.getElementById(id);
            if (el) lenis?.scrollTo(el, { duration: 1.4, offset: -80 });
        });
    };

    const goTo = (path: string) => closeAnd(() => navigate(path));

    const toggleSport = (id: string) => {
        const next = tabPreferences.map((t) =>
            t.id === id ? { ...t, visible: !t.visible } : t,
        );
        if (next.some((t) => t.visible)) updateTabPreferences(next);
    };

    const baseItems = [
        { label: 'Home', sub: 'Club overview', action: () => goTo('/') },
        { label: 'Book a Court', sub: 'Session availability', action: () => scrollToId('booking-section'), accent: true },
        { label: 'Events', sub: 'Socials & mixers', action: () => scrollToId('events-section') },
        { label: 'News', sub: 'Latest results', action: () => scrollToId('news-section') },
        ...(isAdmin ? [{ label: 'Admin', sub: 'Club operations', action: () => goTo('/admin') }] : []),
        { label: 'Feedback', sub: 'Share your thoughts', action: () => closeAnd(openFeedback) },
        user
            ? { label: 'Sign Out', sub: 'End session', action: () => closeAnd(() => signOut()) }
            : { label: 'Sign In', sub: 'Duke.edu accounts', action: () => goTo('/login') },
    ];

    const items = baseItems.map((item, i) => ({ ...item, index: String(i + 1).padStart(2, '0') }));

    return (
        <AnimatePresence>
            {menuOpen && (
                <motion.div
                    data-lenis-prevent
                    className="fixed inset-0 z-[145] overflow-y-auto overscroll-contain bg-white/97 backdrop-blur-xl dark:bg-court-950/97"
                    initial={{ clipPath: 'inset(0 0 100% 0)' }}
                    animate={{ clipPath: 'inset(0 0 0% 0)' }}
                    exit={{ clipPath: 'inset(0 0 100% 0)' }}
                    transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}
                >
                    <div className="flex min-h-[100dvh] flex-col px-5 pb-32 pt-28 md:flex-row md:items-start md:justify-between md:gap-16 md:px-12 md:pb-40 md:pt-32">
                        {/* Nav — left on desktop, top on mobile */}
                        <nav
                            data-lenis-prevent
                            className="flex w-full shrink-0 flex-col gap-2 md:max-h-[calc(100dvh-9rem)] md:max-w-3xl md:overflow-y-auto md:overscroll-contain md:pr-1"
                        >
                            {items.map((item, i) => (
                                <div key={item.label} className="overflow-hidden py-1 last:pb-2">
                                    <motion.button
                                        onClick={item.action}
                                        data-cursor
                                        className="group flex w-full items-baseline gap-4 py-0.5 text-left"
                                        initial={{ y: '100%' }}
                                        animate={{ y: '0%' }}
                                        transition={{ delay: 0.08 + i * 0.05, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                                    >
                                        <span className="hud-label w-8 shrink-0 text-gray-400 dark:text-chalk/30">{item.index}</span>
                                        <span
                                            className={`font-display text-3xl leading-tight transition-colors md:text-4xl md:leading-[1.12] lg:text-5xl lg:leading-[1.1] ${
                                                item.accent
                                                    ? 'text-emerald-600 group-hover:text-clay-500 dark:text-court-accent dark:group-hover:text-clay-300'
                                                    : 'text-gray-900 group-hover:text-clay-500 dark:text-chalk dark:group-hover:text-clay-300'
                                            }`}
                                        >
                                            {item.label}
                                        </span>
                                        <span className="hidden hud-label text-gray-400 dark:text-chalk/35 md:inline">{item.sub}</span>
                                    </motion.button>
                                </div>
                            ))}
                        </nav>

                        {/* Your sports — right on desktop, below nav on mobile */}
                        <aside className="mt-12 w-full shrink-0 md:mt-0 md:w-auto md:max-w-xs md:self-end">
                            <p className="hud-label mb-4 text-gray-400 dark:text-chalk/40">Your sports</p>
                            <div className="flex flex-col gap-2">
                                {tabPreferences.map((tab) => {
                                    const sport = SPORTS.find((s) => s === tab.id);
                                    if (!sport) return null;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => toggleSport(tab.id)}
                                            data-cursor
                                            className={`flex items-center justify-between border px-4 py-3 text-left transition-colors ${
                                                tab.visible
                                                    ? 'border-emerald-500/30 bg-emerald-500/5 text-gray-900 dark:border-court-accent/30 dark:bg-court-accent/5 dark:text-chalk'
                                                    : 'border-gray-200 text-gray-400 hover:border-gray-300 dark:border-chalk/10 dark:text-chalk/40 dark:hover:border-chalk/20'
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
                            <p className="mt-6 hud-label text-gray-400 dark:text-chalk/30">
                                Fuqua School of Business · Duke University
                            </p>
                        </aside>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default MenuOverlay;
