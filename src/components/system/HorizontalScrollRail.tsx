import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const HINT_DURATION_MS = 3200;
const SCROLL_EDGE_THRESHOLD = 8;

interface DownNavConfig {
    onClick: () => void;
    ariaLabel: string;
}

interface HorizontalScrollRailProps {
    children: ReactNode;
    className?: string;
    scrollClassName?: string;
    ariaLabel?: string;
    /** Hide arrows and use native overflow only from md breakpoint up */
    mobileOnly?: boolean;
    /** Optional down arrow overlay (e.g. scroll to content below this rail) */
    downNav?: DownNavConfig;
}

const HorizontalScrollRail = ({
    children,
    className = '',
    scrollClassName = '',
    ariaLabel,
    mobileOnly = true,
    downNav,
}: HorizontalScrollRailProps) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [showDownHint, setShowDownHint] = useState(false);
    const prefersReducedMotion = usePrefersReducedMotion();

    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return false;

        const maxScroll = el.scrollWidth - el.clientWidth;
        const hasOverflow = maxScroll > SCROLL_EDGE_THRESHOLD;
        setCanScrollLeft(el.scrollLeft > SCROLL_EDGE_THRESHOLD);
        setCanScrollRight(hasOverflow && el.scrollLeft < maxScroll - SCROLL_EDGE_THRESHOLD);
        return hasOverflow;
    }, []);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;

        let hintTimer: ReturnType<typeof setTimeout> | undefined;

        const scheduleHint = (hasOverflow: boolean) => {
            if (hintTimer) clearTimeout(hintTimer);
            if (!hasOverflow || prefersReducedMotion) {
                setShowHint(false);
                return;
            }
            setShowHint(true);
            hintTimer = setTimeout(() => setShowHint(false), HINT_DURATION_MS);
        };

        const onScroll = () => {
            updateScrollState();
            if (el.scrollLeft > SCROLL_EDGE_THRESHOLD) {
                setShowHint(false);
            }
        };

        const onResize = () => {
            const hasOverflow = updateScrollState() ?? false;
            if (el.scrollLeft <= SCROLL_EDGE_THRESHOLD) {
                scheduleHint(hasOverflow);
            }
        };

        onResize();
        el.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);

        return () => {
            el.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onResize);
            if (hintTimer) clearTimeout(hintTimer);
        };
    }, [updateScrollState, prefersReducedMotion, children]);

    useEffect(() => {
        if (!downNav || prefersReducedMotion) {
            setShowDownHint(false);
            return;
        }
        setShowDownHint(true);
        const timer = window.setTimeout(() => setShowDownHint(false), HINT_DURATION_MS);
        return () => window.clearTimeout(timer);
    }, [downNav, prefersReducedMotion]);

    const scrollByPage = (direction: 'left' | 'right') => {
        const el = scrollRef.current;
        if (!el) return;
        const amount = Math.round(el.clientWidth * 0.88);
        el.scrollBy({ left: direction === 'right' ? amount : -amount, behavior: 'smooth' });
        setShowHint(false);
    };

    const arrowVisibility = mobileOnly ? 'md:hidden' : '';
    const scrollClasses = [
        'overflow-x-auto overscroll-x-contain scrollbar-hide snap-x snap-proximity',
        mobileOnly ? 'md:overflow-visible md:snap-none' : '',
        scrollClassName,
    ].filter(Boolean).join(' ');

    const arrowButtonClass =
        'pointer-events-auto flex h-11 w-11 touch-manipulation items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-lg transition-all hover:scale-105 hover:bg-gray-50 dark:border-chalk/15 dark:bg-carbon dark:text-chalk/90 dark:hover:bg-court-900';

    return (
        <div className={`relative ${className}`}>
            <div
                ref={scrollRef}
                className={scrollClasses}
                role={ariaLabel ? 'region' : undefined}
                aria-label={ariaLabel}
            >
                {children}
            </div>

            {canScrollLeft && (
                <button
                    type="button"
                    onClick={() => scrollByPage('left')}
                    className={`absolute left-1 top-[42%] z-40 -translate-y-1/2 ${arrowVisibility} ${arrowButtonClass}`}
                    aria-label="Scroll left"
                >
                    <ChevronLeft className="h-5 w-5" aria-hidden />
                </button>
            )}

            {(canScrollRight || showHint) && (
                <>
                    <div
                        className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#F3F0E8] via-[#F3F0E8]/80 to-transparent dark:from-court-950 dark:via-court-950/80 ${arrowVisibility}`}
                        aria-hidden
                    />
                    <button
                        type="button"
                        onClick={() => scrollByPage('right')}
                        className={`absolute right-2 top-[42%] z-40 -translate-y-1/2 ${arrowVisibility} ${arrowButtonClass} ${
                            showHint && canScrollRight ? 'motion-safe:animate-pulse ring-2 ring-court-accent/40' : ''
                        }`}
                        aria-label="Scroll right for more"
                    >
                        <ChevronRight className="h-5 w-5" aria-hidden />
                    </button>
                </>
            )}

            {downNav && (
                <>
                    <div
                        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-[#F3F0E8] via-[#F3F0E8]/80 to-transparent dark:from-court-950 dark:via-court-950/80 ${arrowVisibility}`}
                        aria-hidden
                    />
                    <button
                        type="button"
                        onClick={() => {
                            setShowDownHint(false);
                            downNav.onClick();
                        }}
                        className={`absolute bottom-2 left-1/2 z-40 -translate-x-1/2 ${arrowVisibility} ${arrowButtonClass} ${
                            showDownHint ? 'motion-safe:animate-pulse ring-2 ring-court-accent/40' : ''
                        }`}
                        aria-label={downNav.ariaLabel}
                    >
                        <ChevronDown className="h-5 w-5" aria-hidden />
                    </button>
                </>
            )}
        </div>
    );
};

export default HorizontalScrollRail;
