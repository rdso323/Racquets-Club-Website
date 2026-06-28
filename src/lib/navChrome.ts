import { useEffect, useState } from 'react';

/** Matches TopBar scroll threshold (`window.scrollY > 20`). */
export function useHeaderScrolled(): boolean {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    return scrolled;
}

/** TopBar background — transparent at top, frosted when scrolled. */
export const headerSurfaceClasses = (scrolled: boolean): string =>
    scrolled
        ? 'border-b border-gray-200/80 bg-[#F3F0E8]/94 shadow-sm backdrop-blur-md dark:border-chalk/10 dark:bg-court-950/94'
        : 'border-b border-transparent bg-transparent';

/** Distinct mega-menu panel surface (glass-deep tones, separate from TopBar). */
export const menuPanelSurfaceClasses =
    'border-b border-gray-200/80 bg-[#FAF8F3]/95 shadow-lg backdrop-blur-xl dark:border-chalk/10 dark:bg-court-900/95';

/** Viewport width below Tailwind `sm` (640px). */
export function useIsMobile(breakpointPx = 640): boolean {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== 'undefined' ? window.matchMedia(`(max-width: ${breakpointPx - 1}px)`).matches : false,
    );

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
        const onChange = () => setIsMobile(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [breakpointPx]);

    return isMobile;
}
