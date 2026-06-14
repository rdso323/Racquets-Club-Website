import { useEffect, useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { useAuth, type TabPreference } from '../../contexts/AuthContext';
import { useUI } from './UIProvider';
import SortableSportTabRow from './SortableSportTabRow';

const MenuOverlay = () => {
    const { user, isAdmin, signOut, tabPreferences, updateTabPreferences } = useAuth();
    const { menuOpen, setMenuOpen, openFeedback } = useUI();
    const [localTabs, setLocalTabs] = useState<TabPreference[]>(tabPreferences);
    const location = useLocation();
    const navigate = useNavigate();
    const lenis = useLenis();

    useEffect(() => {
        if (menuOpen) setLocalTabs(tabPreferences);
    }, [menuOpen, tabPreferences]);

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

    const persistTabs = (next: TabPreference[]) => {
        setLocalTabs(next);
        if (next.some((t) => t.visible)) updateTabPreferences(next);
    };

    const toggleSport = (id: string) => {
        persistTabs(
            localTabs.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t)),
        );
    };

    const handleReorder = (next: TabPreference[]) => {
        persistTabs(next);
    };

    const navItems: Array<{
        label: string;
        sub: string;
        action: () => void;
        accent?: boolean;
    }> = [
        { label: 'Home', sub: 'Club overview', action: () => goTo('/') },
        { label: 'Book a Court', sub: 'Session availability', action: () => scrollToId('booking-section'), accent: true },
        { label: 'Events', sub: 'Socials & mixers', action: () => scrollToId('events-section') },
        { label: 'News', sub: 'Latest results', action: () => scrollToId('news-section') },
        ...(isAdmin ? [{ label: 'Admin', sub: 'Club operations', action: () => goTo('/admin') }] : []),
        { label: 'Feedback', sub: 'Share your thoughts', action: () => closeAnd(openFeedback) },
    ];

    const authItem: { label: string; sub: string; action: () => void; accent?: boolean } = user
        ? { label: 'Sign Out', sub: 'End session', action: () => closeAnd(() => signOut()) }
        : { label: 'Sign In', sub: 'Duke.edu accounts', action: () => goTo('/login') };

    const menuItems = [...navItems, authItem].map((item, i) => ({
        ...item,
        index: String(i + 1).padStart(2, '0'),
    }));

    return (
        <AnimatePresence>
            {menuOpen && (
                <>
                    <motion.button
                        type="button"
                        aria-label="Close menu"
                        data-lenis-prevent
                        className="fixed inset-0 z-[140] cursor-default bg-black/25 backdrop-blur-[3px] dark:bg-black/45"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={() => setMenuOpen(false)}
                    />

                    <motion.aside
                        data-lenis-prevent
                        className="glass-deep fixed left-0 top-0 z-[145] flex h-[100dvh] w-[min(100vw-2.5rem,20rem)] flex-col border-r border-gray-200/80 shadow-xl dark:border-chalk/10 sm:w-80"
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
                    >
                        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-8 pt-24">
                            <nav className="flex flex-col gap-1">
                                {menuItems.map((item, i) => (
                                    <div key={item.label} className="overflow-hidden py-0.5">
                                        <motion.button
                                            onClick={item.action}
                                            data-cursor
                                            className="group flex w-full items-baseline gap-3 py-1.5 text-left"
                                            initial={{ opacity: 0, x: -12 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.04 + i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                        >
                                            <span className="hud-label w-7 shrink-0 text-gray-400 dark:text-chalk/30">
                                                {item.index}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span
                                                    className={`block font-display text-2xl leading-tight transition-colors sm:text-[1.65rem] ${
                                                        item.accent
                                                            ? 'text-emerald-600 group-hover:text-clay-500 dark:text-court-accent dark:group-hover:text-clay-300'
                                                            : 'text-gray-900 group-hover:text-clay-500 dark:text-chalk dark:group-hover:text-clay-300'
                                                    }`}
                                                >
                                                    {item.label}
                                                </span>
                                                <span className="mt-0.5 block hud-label text-[10px] text-gray-400 dark:text-chalk/35">
                                                    {item.sub}
                                                </span>
                                            </span>
                                        </motion.button>
                                    </div>
                                ))}
                            </nav>

                            <div className="my-6 h-px bg-gray-200 dark:bg-chalk/10" />

                            <section>
                                <p className="hud-label mb-1 text-gray-400 dark:text-chalk/40">Your sports</p>
                                <p className="mb-3 text-[11px] leading-snug text-gray-500 dark:text-chalk/45">
                                    Drag to reorder · tap to show or hide
                                </p>
                                <Reorder.Group
                                    axis="y"
                                    values={localTabs}
                                    onReorder={handleReorder}
                                    className="flex flex-col gap-1.5"
                                >
                                    {localTabs.map((tab) => (
                                        <SortableSportTabRow
                                            key={tab.id}
                                            tab={tab}
                                            onToggleVisibility={() => toggleSport(tab.id)}
                                        />
                                    ))}
                                </Reorder.Group>
                            </section>

                            <p className="mt-auto pt-8 hud-label text-gray-400 dark:text-chalk/30">
                                Fuqua School of Business · Duke University
                            </p>
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
};

export default MenuOverlay;
