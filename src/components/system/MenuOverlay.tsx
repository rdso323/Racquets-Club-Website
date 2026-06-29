import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from './UIProvider';
import { SITE_NAV_SECTIONS, type SiteSectionId } from '../../lib/siteNav';
import { useHomeSectionNavigation } from '../../hooks/useHomeSectionNavigation';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import { menuPanelSurfaceClasses, useIsMobile } from '../../lib/navChrome';

const EASE = [0.16, 1, 0.3, 1] as const;

interface MenuNavItem {
    label: string;
    sub: string;
    index: string;
    action: () => void;
    accent?: boolean;
}

const MenuNavItemRow = ({
    item,
    size,
    delay,
    animate,
    maskedReveal,
}: {
    item: MenuNavItem;
    size: 'primary' | 'secondary';
    delay: number;
    animate: boolean;
    maskedReveal: boolean;
}) => {
    const labelClass =
        size === 'primary'
            ? 'text-2xl leading-[1.05] sm:text-3xl md:text-[2.75rem]'
            : 'text-lg leading-tight sm:text-xl md:text-2xl';

    return (
        <button
            type="button"
            onClick={item.action}
            data-cursor
            className="group flex min-h-12 w-full touch-manipulation items-baseline gap-3 py-3 text-left active:bg-gray-100/70 sm:gap-4 sm:py-2.5 md:min-h-0 md:py-2 md:hover:bg-transparent dark:active:bg-chalk/10"
        >
            <motion.span
                className="hud-label w-7 shrink-0 translate-y-0 text-[11px] text-gray-400 transition-transform duration-300 group-hover:-translate-y-0.5 dark:text-chalk/30"
                initial={animate ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ delay, duration: 0.4, ease: EASE }}
            >
                {item.index}
            </motion.span>

            <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 overflow-hidden pb-[0.06em]">
                    <motion.span
                        className={`block font-display tracking-tight transition-colors duration-300 ${labelClass} ${
                            item.accent
                                ? 'text-emerald-600 group-hover:text-clay-500 dark:text-court-accent dark:group-hover:text-clay-300'
                                : 'text-gray-900 group-hover:text-clay-500 dark:text-chalk dark:group-hover:text-clay-300'
                        }`}
                        initial={
                            animate
                                ? maskedReveal
                                    ? { y: '115%' }
                                    : { opacity: 0, y: 6 }
                                : false
                        }
                        animate={maskedReveal ? { y: '0%' } : { opacity: 1, y: 0 }}
                        transition={{ delay, duration: maskedReveal ? 0.6 : 0.22, ease: EASE }}
                    >
                        {item.label}
                    </motion.span>
                    <ArrowUpRight
                        className={`shrink-0 text-gray-300 transition-all duration-300 dark:text-chalk/40 ${
                            size === 'primary' ? 'h-5 w-5' : 'h-4 w-4'
                        } -translate-x-1 opacity-60 sm:-translate-x-2 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100`}
                        aria-hidden
                    />
                </span>
                <motion.span
                    className="mt-1 block text-xs font-medium text-gray-400 dark:text-chalk/40 sm:text-sm"
                    initial={animate ? { opacity: 0 } : false}
                    animate={{ opacity: 1 }}
                    transition={{ delay: delay + 0.08, duration: 0.4, ease: EASE }}
                >
                    {item.sub}
                </motion.span>
            </span>
        </button>
    );
};

const MenuNavGroup = ({
    title,
    items,
    size,
    animate,
    maskedReveal,
    baseDelay,
    stagger,
}: {
    title: string;
    items: MenuNavItem[];
    size: 'primary' | 'secondary';
    animate: boolean;
    maskedReveal: boolean;
    baseDelay: number;
    stagger: number;
}) => (
    <div>
        <motion.p
            className="hud-label mb-4 text-[11px] text-gray-400 dark:text-chalk/35"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ delay: baseDelay, duration: 0.4, ease: EASE }}
        >
            {title}
        </motion.p>
        <nav className="flex flex-col divide-y divide-gray-200/60 dark:divide-chalk/8">
            {items.map((item, i) => (
                <MenuNavItemRow
                    key={item.label}
                    item={item}
                    size={size}
                    animate={animate}
                    maskedReveal={maskedReveal}
                    delay={animate ? baseDelay + 0.06 + i * stagger : 0}
                />
            ))}
        </nav>
    </div>
);

const MenuOverlay = () => {
    const { user, signOut, isAdmin } = useAuth();
    const { menuOpen, setMenuOpen, openFeedback } = useUI();
    const location = useLocation();
    const navigate = useNavigate();
    const { scrollToHomeSection } = useHomeSectionNavigation();
    const prefersReducedMotion = usePrefersReducedMotion();
    const isMobile = useIsMobile();
    const animateEntries = !prefersReducedMotion;
    const useMaskedReveal = animateEntries && !isMobile;

    const panelRef = useRef<HTMLDivElement>(null);
    const restoreFocusRef = useRef<HTMLElement | null>(null);

    // Escape-to-close + focus move/restore. No body scroll-lock (avoids scrollbar shift).
    useEffect(() => {
        if (!menuOpen) return;

        restoreFocusRef.current = document.activeElement as HTMLElement | null;
        const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 60);

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.clearTimeout(focusTimer);
            document.removeEventListener('keydown', handleKeyDown);
            restoreFocusRef.current?.focus?.();
        };
    }, [menuOpen, setMenuOpen]);

    const closeAnd = (action: () => void) => {
        setMenuOpen(false);
        window.setTimeout(action, isMobile ? 100 : 160);
    };

    const scrollToId = (id: 'booking-section' | 'events-section' | 'news-section') => {
        closeAnd(() => scrollToHomeSection(id));
    };

    const goTo = (path: string) => closeAnd(() => navigate(path));

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

    // Club group reveals just after the primary explore group finishes staggering in.
    const clubBaseDelay = 0.04 + exploreItems.length * (isMobile ? 0.03 : 0.06);

    return (
        <AnimatePresence>
            {menuOpen && (
                <>
                    <motion.button
                        type="button"
                        aria-label="Close menu"
                        data-lenis-prevent
                        className="fixed inset-0 z-[140] cursor-pointer bg-black/30 md:bg-black/20 md:backdrop-blur-[3px] dark:bg-black/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: EASE }}
                        onClick={() => setMenuOpen(false)}
                    />

                    <motion.div
                        ref={panelRef}
                        tabIndex={-1}
                        data-lenis-prevent
                        role="dialog"
                        aria-modal="true"
                        aria-label="Site menu"
                        className={`fixed inset-x-0 top-16 z-[145] outline-none md:top-[4.5rem] ${menuPanelSurfaceClasses}`}
                        initial={animateEntries ? { opacity: 0, y: isMobile ? -8 : -14 } : false}
                        animate={{ opacity: 1, y: 0 }}
                        exit={animateEntries ? { opacity: 0, y: isMobile ? -6 : -10 } : { opacity: 0 }}
                        transition={{ duration: prefersReducedMotion ? 0 : isMobile ? 0.22 : 0.32, ease: EASE }}
                    >
                        <div className="max-h-[calc(100dvh-4rem-env(safe-area-inset-bottom,0px))] overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] md:max-h-none md:overflow-visible md:pb-0">
                            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:px-10 md:py-12">
                                <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:gap-y-10 lg:grid-cols-12">
                                    <div className="lg:col-span-7">
                                        <MenuNavGroup
                                            title="Explore"
                                            items={exploreItems}
                                            size="primary"
                                            animate={animateEntries}
                                            maskedReveal={useMaskedReveal}
                                            baseDelay={0.04}
                                            stagger={isMobile ? 0.03 : 0.06}
                                        />
                                    </div>
                                    <div className="border-t border-gray-200/60 pt-8 dark:border-chalk/8 lg:col-span-4 lg:col-start-9 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                                        <MenuNavGroup
                                            title="Club & Account"
                                            items={clubItems}
                                            size="secondary"
                                            animate={animateEntries}
                                            maskedReveal={useMaskedReveal}
                                            baseDelay={clubBaseDelay}
                                            stagger={isMobile ? 0.025 : 0.05}
                                        />
                                    </div>
                                </div>

                                <motion.p
                                    className="mt-10 hud-label text-[11px] text-gray-400 dark:text-chalk/30 md:mt-14"
                                    initial={animateEntries ? { opacity: 0 } : false}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: clubBaseDelay + 0.18, duration: 0.5, ease: EASE }}
                                >
                                    Fuqua School of Business · Duke University
                                </motion.p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default MenuOverlay;
