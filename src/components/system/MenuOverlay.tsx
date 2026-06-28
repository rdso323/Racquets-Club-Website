import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, type TabPreference } from '../../contexts/AuthContext';
import { useUI } from './UIProvider';
import SportPreferenceChips from './SportPreferenceChips';
import { SITE_NAV_SECTIONS, type SiteSectionId } from '../../lib/siteNav';
import { useHomeSectionNavigation } from '../../hooks/useHomeSectionNavigation';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { menuPanelSurfaceClasses, useIsMobile } from '../../lib/navChrome';

interface MenuNavItem {
    label: string;
    sub: string;
    index: string;
    action: () => void;
    accent?: boolean;
}

const MenuNavColumn = ({
    title,
    items,
    animate = true,
    startDelay = 0,
}: {
    title: string;
    items: MenuNavItem[];
    animate?: boolean;
    startDelay?: number;
}) => (
    <div>
        <p className="hud-label mb-2 text-xs text-gray-400 dark:text-chalk/35 md:mb-3">{title}</p>
        <nav className="flex flex-col gap-1">
            {items.map((item, i) => (
                <motion.button
                    key={item.label}
                    type="button"
                    onClick={item.action}
                    data-cursor
                    className="group flex min-h-12 w-full touch-manipulation items-baseline gap-3 rounded-lg py-2.5 text-left transition-colors active:bg-gray-100/80 md:min-h-11 md:py-2 md:hover:bg-gray-100/70 dark:active:bg-chalk/10 dark:md:hover:bg-chalk/5"
                    initial={animate ? { opacity: 0, y: -6 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                        animate
                            ? { delay: startDelay + i * 0.02, duration: 0.25, ease: [0.16, 1, 0.3, 1] }
                            : { duration: 0 }
                    }
                >
                    <span className="hud-label w-8 shrink-0 text-xs text-gray-400 dark:text-chalk/30">
                        {item.index}
                    </span>
                    <span className="min-w-0 flex-1">
                        <span
                            className={`block font-display text-lg leading-tight transition-colors sm:text-xl md:text-2xl ${
                                item.accent
                                    ? 'text-emerald-600 group-hover:text-clay-500 dark:text-court-accent dark:group-hover:text-clay-300'
                                    : 'text-gray-900 group-hover:text-clay-500 dark:text-chalk dark:group-hover:text-clay-300'
                            }`}
                        >
                            {item.label}
                        </span>
                        <span className="mt-1 block text-xs font-medium text-gray-400 dark:text-chalk/40 sm:text-sm">
                            {item.sub}
                        </span>
                    </span>
                </motion.button>
            ))}
        </nav>
    </div>
);

const MenuOverlay = () => {
    const { user, signOut, isAdmin, tabPreferences, updateTabPreferences } = useAuth();
    const { menuOpen, setMenuOpen, openFeedback } = useUI();
    const [localTabs, setLocalTabs] = useState<TabPreference[]>(tabPreferences);
    const location = useLocation();
    const navigate = useNavigate();
    const { scrollToHomeSection } = useHomeSectionNavigation();
    const prefersReducedMotion = usePrefersReducedMotion();
    const isMobile = useIsMobile();
    const animateEntries = !prefersReducedMotion && !isMobile;

    useEffect(() => {
        if (menuOpen) setLocalTabs(tabPreferences);
    }, [menuOpen, tabPreferences]);

    const closeAnd = (action: () => void) => {
        setMenuOpen(false);
        window.setTimeout(action, isMobile ? 100 : 160);
    };

    const scrollToId = (id: 'booking-section' | 'events-section' | 'news-section') => {
        closeAnd(() => scrollToHomeSection(id));
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

    const onAdminPage = location.pathname === '/admin';

    const exploreIds: SiteSectionId[] = ['home', 'booking', 'events', 'news'];
    const clubIds: SiteSectionId[] = ['help', 'feedback'];

    const exploreItems: MenuNavItem[] = exploreIds.map((id) => ({
        label: SITE_NAV_SECTIONS[id].menuLabel,
        sub: SITE_NAV_SECTIONS[id].menuSub,
        index: SITE_NAV_SECTIONS[id].index,
        action:
            id === 'home'
                ? () => goTo('/')
                : id === 'booking'
                  ? () => scrollToId('booking-section')
                  : id === 'events'
                    ? () => scrollToId('events-section')
                    : () => scrollToId('news-section'),
        accent: id === 'booking',
    }));

    const clubItems: MenuNavItem[] = clubIds.map((id) => ({
        label: SITE_NAV_SECTIONS[id].menuLabel,
        sub: SITE_NAV_SECTIONS[id].menuSub,
        index: SITE_NAV_SECTIONS[id].index,
        action: id === 'help' ? () => goTo('/help') : () => closeAnd(openFeedback),
    }));

    if (isAdmin) {
        clubItems.push({
            label: onAdminPage ? 'Home' : 'Admin',
            sub: onAdminPage ? 'Return to site' : 'Operations Deck',
            index: '07',
            action: () => goTo(onAdminPage ? '/' : '/admin'),
        });
    }

    clubItems.push(
        user
            ? {
                  label: 'Sign Out',
                  sub: 'End session',
                  index: isAdmin ? '08' : '07',
                  action: () => closeAnd(() => signOut()),
              }
            : {
                  label: 'Sign In',
                  sub: 'Duke.edu accounts',
                  index: isAdmin ? '08' : '07',
                  action: () => goTo('/login'),
              },
    );

    return (
        <AnimatePresence>
            {menuOpen && (
                <>
                    <motion.button
                        type="button"
                        aria-label="Close menu"
                        data-lenis-prevent
                        className="fixed inset-0 z-[140] cursor-default bg-black/25 md:bg-black/20 md:backdrop-blur-[2px] dark:bg-black/45"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
                        onClick={() => setMenuOpen(false)}
                    />

                    <motion.div
                        data-lenis-prevent
                        role="dialog"
                        aria-modal="true"
                        aria-label="Site menu"
                        className={`fixed inset-x-0 top-16 z-[145] md:top-[4.5rem] ${menuPanelSurfaceClasses}`}
                        initial={animateEntries ? { opacity: 0, y: -12 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={animateEntries ? { opacity: 0, y: -8 } : { opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain md:max-h-none md:overflow-visible">
                            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-5 md:px-10 md:py-8">
                                <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-10">
                                    <MenuNavColumn
                                        title="Explore"
                                        items={exploreItems}
                                        animate={animateEntries}
                                        startDelay={0.02}
                                    />
                                    <MenuNavColumn
                                        title="Club"
                                        items={clubItems}
                                        animate={animateEntries}
                                        startDelay={0.04}
                                    />

                                    <motion.section
                                        initial={animateEntries ? { opacity: 0, y: -6 } : false}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={
                                            animateEntries
                                                ? { delay: 0.06, duration: 0.25, ease: [0.16, 1, 0.3, 1] }
                                                : { duration: 0 }
                                        }
                                    >
                                        <p className="hud-label mb-1.5 text-xs text-gray-400 dark:text-chalk/35">
                                            Your sports
                                        </p>
                                        <p className="mb-3 text-sm leading-snug text-gray-500 dark:text-chalk/50 md:mb-4">
                                            Drag to reorder · tap to show or hide
                                        </p>
                                        <SportPreferenceChips
                                            tabs={localTabs}
                                            onReorder={handleReorder}
                                            onToggleVisibility={toggleSport}
                                        />
                                    </motion.section>
                                </div>

                                <p className="mt-6 hud-label text-xs text-gray-400 dark:text-chalk/30 md:mt-8">
                                    Fuqua School of Business · Duke University
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MenuOverlay;
