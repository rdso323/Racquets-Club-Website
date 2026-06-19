import { motion, useScroll, useTransform } from 'framer-motion';
import { useTickerText, tickerMarqueeDurationSec } from '../../hooks/useTickerText';

interface LiveWireProps {
    /** When true, ticker slides out on scroll (hero entrance). */
    dismissOnScroll?: boolean;
    flipped?: boolean;
}

const LiveWire = ({ dismissOnScroll = false, flipped = false }: LiveWireProps) => {
    const tickerText = useTickerText();
    const durationSec = tickerMarqueeDurationSec(tickerText);
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [120, 620], dismissOnScroll ? [0, -72] : [0, 0]);
    const opacity = useTransform(scrollY, [120, 520], dismissOnScroll ? [1, 0] : [1, 1]);

    const rowClassName =
        'inline-flex items-center gap-5 pr-12 text-[11px] font-medium uppercase tracking-hud text-gray-600 dark:text-chalk/70';

    return (
        <motion.div
            className="relative border-y border-gray-200 bg-gray-50 py-3 dark:border-chalk/10 dark:bg-court-950"
            style={dismissOnScroll ? { y, opacity } : undefined}
        >
            <div className="overflow-hidden">
                <div
                    className="inline-flex w-max animate-marquee whitespace-nowrap motion-reduce:animate-none hover:[animation-play-state:paused]"
                    style={{
                        animationDuration: `${durationSec}s`,
                        animationDirection: flipped ? 'reverse' : 'normal',
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
