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
        <div className="bg-[#001A57] text-white text-sm py-2 overflow-hidden border-b-2 border-green-700 shadow-md">
            <div
                className="whitespace-nowrap inline-flex animate-marquee hover:[animation-play-state:paused] will-change-transform"
                style={{ width: 'max-content' }}
            >
                <div
                    className="flex-shrink-0 pr-12"
                    dangerouslySetInnerHTML={{ __html: tickerText }}
                />
                <div
                    className="flex-shrink-0 pr-12"
                    dangerouslySetInnerHTML={{ __html: tickerText }}
                />
            </div>
        </div>
    );
};

export default Ticker;
