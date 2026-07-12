import { useEffect, useState, type RefObject } from 'react';

interface UseInViewportOptions {
    rootMargin?: string;
    threshold?: number;
}

export function useInViewport(
    ref: RefObject<Element | null>,
    { rootMargin = '200px 0px', threshold = 0 }: UseInViewportOptions = {},
) {
    const [inView, setInView] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin, threshold },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [ref, rootMargin, threshold]);

    return inView;
}
