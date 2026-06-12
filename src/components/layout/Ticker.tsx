import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const HARDCODED_TICKER = "INDIAN WELLS M1000 (LIVE): A. Zverev 🇩🇪 d. B. Nakashima 🇺🇸 7-6, 5-7, 6-4 | A. Davidovich Fokina 🇪🇸 d. J. Mensik 🇨🇿 6-2, 4-6, 6-2 | L. Tien 🇺🇸 d. B. Shelton 🇺🇸 7-6, 4-6, 6-3 | A. Sabalenka 🇧🇾 d. J. Cristian 🇷🇴 6-4, 6-1 | T. Gibson 🇦🇺 d. C. Tauson 🇩🇰 7-6, 4-6, 6-4 | SQUASH NZ OPEN: P. Coll 🇳🇿 d. M. Zakaria 🇪🇬 11-7, 11-2, 11-5 | T. Gilis 🇧🇪 d. N. Gilis 🇧🇪 3-1 | BADMINTON ALL ENGLAND: Lin C. 🇹🇼 d. L. Sen 🇮🇳 2-1 | RANKINGS: ATP: 1. Alcaraz 🇪🇸, 2. Sinner 🇮🇹, 3. Djokovic 🇷🇸 | WTA: 1. Sabalenka 🇧🇾, 2. Swiatek 🇵🇱, 3. Rybakina 🇰🇿";

const Ticker = () => {
    const [tickerText, setTickerText] = useState(HARDCODED_TICKER);

    // Try to load from Firestore, fall back to hardcoded
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'ticker'), (docSnap) => {
            if (docSnap.exists() && docSnap.data().text && docSnap.data().text.trim().length > 0) {
                setTickerText(docSnap.data().text);
            }
        }, (error) => {
            console.warn("Could not load ticker from Firestore, using default.", error);
        });

        return () => unsubscribe();
    }, []);

    return (
        <div className="bg-wimbledon-navy dark:bg-court-900 text-white text-sm border-b border-green-700 dark:border-court-line/10 shadow-md flex items-stretch transition-colors duration-300">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-clay-600 dark:bg-clay-700 flex-shrink-0 z-10">
                <span className="relative flex h-2 w-2">
                    <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-court-line opacity-60"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-court-line"></span>
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-court-line">The Wire</span>
            </div>
            <div className="flex-1 overflow-hidden py-2">
                <div
                    className="whitespace-nowrap inline-flex animate-marquee hover:[animation-play-state:paused] will-change-transform"
                    style={{
                        width: 'max-content',
                        animationDuration: `${Math.max(30, Math.round(tickerText.length * 0.08))}s`
                    }}
                >
                    <div
                        className="flex-shrink-0 pr-12 pl-4"
                        dangerouslySetInnerHTML={{ __html: tickerText }}
                    />
                    <div
                        className="flex-shrink-0 pr-12 pl-4"
                        dangerouslySetInnerHTML={{ __html: tickerText }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Ticker;
