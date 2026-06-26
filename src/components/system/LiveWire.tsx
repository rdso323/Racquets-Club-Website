import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useTickerText, useTickerEnabled, tickerMarqueeDurationSec } from '../../hooks/useTickerText';
import { SPORTS } from '../../lib/sports';

interface LiveWireProps {
    /** When true, ticker slides out on scroll (hero entrance). */
    dismissOnScroll?: boolean;
    id?: string;
}

const SPORT_CODES = SPORTS.map((s) => {
    const lookup: Record<string, string> = {
        Tennis: 'TNS',
        Badminton: 'BDM',
        Squash: 'SQH',
        Pickleball: 'PKL',
        'Table Tennis': 'TBL',
    };
    return lookup[s] ?? s.slice(0, 3).toUpperCase();
});

/** Shown in place of the ticker when it is disabled — primary (hero) position only. */
const SportCodesDivider = ({ id }: { id?: string }) => (
    <div
        id={id}
        className="border-y border-gray-200 bg-gray-50/60 py-2.5 dark:border-chalk/10 dark:bg-court-950/60"
    >
        <div className="flex items-center justify-center gap-6 md:gap-10">
            {SPORT_CODES.map((code) => (
                <span key={code} className="hud-label text-gray-400 dark:text-chalk/25">
                    {code}
                </span>
            ))}
        </div>
    </div>
);

const LiveWire = ({ dismissOnScroll = false, id }: LiveWireProps) => {
    const enabled = useTickerEnabled();

    // When disabled: primary slot → clean sport codes divider; secondary slot → nothing
    if (!enabled) {
        return dismissOnScroll ? <SportCodesDivider id={id} /> : null;
    }

    return <LiveWireActive dismissOnScroll={dismissOnScroll} id={id} />;
};

const LiveWireActive = ({ dismissOnScroll, id }: LiveWireProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const inView = useInView(containerRef, { margin: '80px 0px' });
    const prefersReducedMotion = useReducedMotion();
    const [documentHidden, setDocumentHidden] = useState(
        () => typeof document !== 'undefined' && document.hidden,
    );

    useEffect(() => {
        const onVisibility = () => setDocumentHidden(document.hidden);
        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, []);

    const shouldAnimate = inView && !documentHidden && !prefersReducedMotion;

    const tickerText = useTickerText();
    const durationSec = tickerMarqueeDurationSec(tickerText);
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [120, 620], dismissOnScroll ? [0, -72] : [0, 0]);
    const opacity = useTransform(scrollY, [120, 520], dismissOnScroll ? [1, 0] : [1, 1]);

    const rowClassName =
        'inline-flex items-center gap-5 pr-12 text-[11px] font-medium uppercase tracking-hud text-gray-600 dark:text-chalk/70';

    return (
        <motion.div
            ref={containerRef}
            id={id}
            className="relative border-y border-gray-200 bg-gray-50 py-3 dark:border-chalk/10 dark:bg-court-950"
            style={dismissOnScroll ? { y, opacity } : undefined}
        >
            <div className="overflow-hidden">
                <div
                    className="inline-flex w-max animate-marquee whitespace-nowrap motion-reduce:animate-none hover:[animation-play-state:paused]"
                    style={{
                        animationDuration: `${durationSec}s`,
                        animationPlayState: shouldAnimate ? 'running' : 'paused',
                    }}
                >
                    <span className={rowClassName}>
                        <span className="text-emerald-600 dark:text-court-accent">● Club Wire</span>
                        <span dangerouslySetInnerHTML={{ __html: tickerText }} />
                    </span>
                    <span className={rowClassName} aria-hidden>
                        <span className="text-emerald-600 dark:text-court-accent">● Club Wire</span>
                        <span dangerouslySetInnerHTML={{ __html: tickerText }} />
                    </span>
                </div>
            </div>
        </motion.div>
    );
};

export default LiveWire;
