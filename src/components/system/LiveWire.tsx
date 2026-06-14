import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { motion, useScroll, useTransform } from 'framer-motion';
import { db } from '../../lib/firebase';
import { VelocityMarquee } from './kinetic';

const HARDCODED_TICKER =
    'Indian Wells: Zverev advances | Sabalenka through to round of 16 | All England: Lin Chun-Yi wins men\'s singles | PSA Squash NZ Open: Paul Coll defends title | Fuqua Racquets Club — Open play sessions weekly';

interface LiveWireProps {
    /** When true, ticker slides out on scroll (hero entrance). */
    dismissOnScroll?: boolean;
    flipped?: boolean;
}

const LiveWire = ({ dismissOnScroll = false, flipped = false }: LiveWireProps) => {
    const [tickerText, setTickerText] = useState(HARDCODED_TICKER);
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 280], dismissOnScroll ? [0, -72] : [0, 0]);
    const opacity = useTransform(scrollY, [0, 220], dismissOnScroll ? [1, 0] : [1, 1]);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            doc(db, 'settings', 'ticker'),
            (docSnap) => {
                if (docSnap.exists() && docSnap.data().text?.trim()) {
                    setTickerText(docSnap.data().text);
                }
            },
            (error) => console.warn('Ticker fallback in use.', error),
        );
        return () => unsubscribe();
    }, []);

    return (
        <motion.div
            className="relative border-y border-gray-200 bg-gray-50 py-3 dark:border-chalk/10 dark:bg-court-950"
            style={dismissOnScroll ? { y, opacity } : undefined}
        >
            <VelocityMarquee
                baseVelocity={flipped ? -0.6 : 0.6}
                itemClassName="pr-12"
                copies={4}
                skew={false}
                velocityBoost={0.8}
            >
                <span className="inline-flex items-center gap-5 text-[11px] font-medium uppercase tracking-hud text-gray-600 dark:text-chalk/70">
                    <span className="text-emerald-600 dark:text-court-accent">● Club Wire</span>
                    <span dangerouslySetInnerHTML={{ __html: tickerText }} />
                </span>
            </VelocityMarquee>
        </motion.div>
    );
};

export default LiveWire;
