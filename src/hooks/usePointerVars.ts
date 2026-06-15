import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const supportsFinePointer = () =>
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const IDLE_MS = 2000;

/**
 * Maps pointer position to CSS custom properties with zero React re-renders.
 * The dot tracks instantly; the ring is interpolated in the same rAF loop for a
 * subtle trailing feel without lagging behind the actual cursor.
 */
export const usePointerVars = () => {
    const location = useLocation();

    useEffect(() => {
        if (location.pathname.startsWith('/admin')) return;
        if (!supportsFinePointer()) return;

        const root = document.documentElement;
        root.classList.add('cursor-active');

        let targetX = window.innerWidth / 2;
        let targetY = window.innerHeight / 2;
        let ringX = targetX;
        let ringY = targetY;
        let raf = 0;
        let running = true;
        let loopActive = false;
        let lastMoveAt = performance.now();

        const loop = () => {
            if (!running) return;

            const tabVisible = !document.hidden;
            const recentlyMoved = performance.now() - lastMoveAt < IDLE_MS;

            if (!tabVisible || !recentlyMoved) {
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
            if (loopActive || !running) return;
            loopActive = true;
            raf = requestAnimationFrame(loop);
        };

        const onMove = (e: MouseEvent) => {
            targetX = e.clientX;
            targetY = e.clientY;
            lastMoveAt = performance.now();
            startLoop();
        };

        const onVisibility = () => {
            if (document.hidden) {
                loopActive = false;
                cancelAnimationFrame(raf);
            } else {
                lastMoveAt = performance.now();
                startLoop();
            }
        };

        const onOver = (e: MouseEvent) => {
            const interactive = (e.target as HTMLElement)?.closest?.(
                'a, button, [data-cursor], input, textarea, select, [role="button"]',
            );
            root.classList.toggle('cursor-hover', !!interactive);
        };

        const onDown = () => root.classList.add('cursor-down');
        const onUp = () => root.classList.remove('cursor-down');

        window.addEventListener('mousemove', onMove, { passive: true });
        window.addEventListener('mouseover', onOver, { passive: true });
        window.addEventListener('mousedown', onDown, { passive: true });
        window.addEventListener('mouseup', onUp, { passive: true });
        document.addEventListener('visibilitychange', onVisibility);
        startLoop();

        return () => {
            running = false;
            loopActive = false;
            cancelAnimationFrame(raf);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseover', onOver);
            window.removeEventListener('mousedown', onDown);
            window.removeEventListener('mouseup', onUp);
            document.removeEventListener('visibilitychange', onVisibility);
            root.classList.remove('cursor-active', 'cursor-hover', 'cursor-down');
        };
    }, [location.pathname]);
};

export default usePointerVars;
