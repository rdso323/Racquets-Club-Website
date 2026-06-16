import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useLenis } from 'lenis/react';

const supportsFinePointer = () =>
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const IDLE_MS = 2000;

const INTERACTIVE_SELECTOR =
    'a, button, [data-cursor], input, textarea, select, [role="button"]';

const isHomeHeroZone = (pathname: string): boolean => {
    if (pathname !== '/') return false;
    const ticker = document.getElementById('primary-ticker');
    if (!ticker) return true;
    return ticker.getBoundingClientRect().top > 0;
};

/**
 * Custom cursor (green dot + ring) only on the home hero — above the first ticker.
 * Everywhere else uses the native system cursor.
 */
export const usePointerVars = () => {
    const location = useLocation();
    const lenis = useLenis();

    useEffect(() => {
        if (location.pathname.startsWith('/admin')) return;
        if (!supportsFinePointer()) return;

        const root = document.documentElement;

        let targetX = window.innerWidth / 2;
        let targetY = window.innerHeight / 2;
        let ringX = targetX;
        let ringY = targetY;
        let raf = 0;
        let running = true;
        let loopActive = false;
        let lastMoveAt = performance.now();
        let lastHover = false;
        let customCursorOn = false;

        const setCustomCursor = (active: boolean) => {
            if (customCursorOn === active) return;
            customCursorOn = active;
            if (active) {
                ringX = targetX;
                ringY = targetY;
                root.style.setProperty('--mouse-x', `${targetX}px`);
                root.style.setProperty('--mouse-y', `${targetY}px`);
                root.style.setProperty('--ring-x', `${ringX}px`);
                root.style.setProperty('--ring-y', `${ringY}px`);
                lastHover = false;
                root.classList.remove('cursor-hover', 'cursor-down');
                root.classList.add('cursor-active');
                startLoop();
            } else {
                root.classList.remove('cursor-active', 'cursor-hover', 'cursor-down');
                loopActive = false;
                cancelAnimationFrame(raf);
            }
        };

        const syncCursorZone = () => {
            setCustomCursor(isHomeHeroZone(location.pathname));
        };

        const setHover = (hover: boolean) => {
            if (lastHover === hover) return;
            lastHover = hover;
            root.classList.toggle('cursor-hover', hover);
        };

        const loop = () => {
            if (!running) return;

            const tabVisible = !document.hidden;
            const recentlyMoved = performance.now() - lastMoveAt < IDLE_MS;

            if (!tabVisible || !recentlyMoved || !customCursorOn) {
                loopActive = false;
                return;
            }

            ringX += (targetX - ringX) * 0.35;
            ringY += (targetY - ringY) * 0.35;
            root.style.setProperty('--mouse-x', `${targetX}px`);
            root.style.setProperty('--mouse-y', `${targetY}px`);
            root.style.setProperty('--ring-x', `${ringX}px`);
            root.style.setProperty('--ring-y', `${ringY}px`);
            raf = requestAnimationFrame(loop);
        };

        const startLoop = () => {
            if (loopActive || !running || !customCursorOn) return;
            loopActive = true;
            raf = requestAnimationFrame(loop);
        };

        const onMove = (e: MouseEvent) => {
            targetX = e.clientX;
            targetY = e.clientY;
            lastMoveAt = performance.now();

            if (!customCursorOn) return;

            const interactive = (e.target as HTMLElement)?.closest?.(INTERACTIVE_SELECTOR);
            setHover(!!interactive);
            startLoop();
        };

        const onScroll = () => syncCursorZone();

        const onVisibility = () => {
            if (document.hidden) {
                loopActive = false;
                cancelAnimationFrame(raf);
            } else {
                lastMoveAt = performance.now();
                syncCursorZone();
                startLoop();
            }
        };

        const onDown = () => {
            if (customCursorOn) root.classList.add('cursor-down');
        };
        const onUp = () => root.classList.remove('cursor-down');

        syncCursorZone();
        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        lenis?.on('scroll', onScroll);
        window.addEventListener('mousedown', onDown, { passive: true });
        window.addEventListener('mouseup', onUp, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            running = false;
            loopActive = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            lenis?.off('scroll', onScroll);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
            document.removeEventListener('visibilitychange', onVisibility);
            root.classList.remove('cursor-active', 'cursor-hover', 'cursor-down');
        };
    }, [location.pathname, lenis]);
};

export default usePointerVars;
