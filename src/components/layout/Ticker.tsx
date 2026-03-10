import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';

const HARDCODED_TICKER = "INDIAN WELLS M1000 (LIVE): A. Zverev 🇩🇪 d. B. Nakashima 🇺🇸 7-6, 5-7, 6-4 | A. Davidovich Fokina 🇪🇸 d. J. Mensik 🇨🇿 6-2, 4-6, 6-2 | L. Tien 🇺🇸 d. B. Shelton 🇺🇸 7-6, 4-6, 6-3 | A. Sabalenka 🇧🇾 d. J. Cristian 🇷🇴 6-4, 6-1 | T. Gibson 🇦🇺 d. C. Tauson 🇩🇰 7-6, 4-6, 6-4 | SQUASH NZ OPEN: P. Coll 🇳🇿 d. M. Zakaria 🇪🇬 11-7, 11-2, 11-5 | T. Gilis 🇧🇪 d. N. Gilis 🇧🇪 3-1 | BADMINTON ALL ENGLAND: Lin C. 🇹🇼 d. L. Sen 🇮🇳 2-1 | RANKINGS: ATP: 1. Alcaraz 🇪🇸, 2. Sinner 🇮🇹, 3. Djokovic 🇷🇸 | WTA: 1. Sabalenka 🇧🇾, 2. Swiatek 🇵🇱, 3. Rybakina 🇰🇿";

const Ticker = () => {
    const [tickerText, setTickerText] = useState(HARDCODED_TICKER);
    const textRef = useRef<HTMLDivElement>(null);
    const [animDuration, setAnimDuration] = useState(60);

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

    // Calculate animation duration based on text width for consistent speed
    useEffect(() => {
        const calculatePosition = () => {
            if (textRef.current && textRef.current.firstElementChild) {
                const singleInstanceWidth = textRef.current.firstElementChild.scrollWidth;
                if (singleInstanceWidth > 0) {
                    // ~60 pixels per second
                    const duration = Math.max(10, singleInstanceWidth / 60);
                    setAnimDuration(duration);
                }
            }
        };

        // Small timeout to ensure DOM has rendered
        const timer = setTimeout(calculatePosition, 200);
        window.addEventListener('resize', calculatePosition);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculatePosition);
        };
    }, [tickerText]);

    return (
        <div className="bg-[#001A57] text-white text-sm py-2 overflow-hidden border-b-2 border-green-700 shadow-md">
            <style>{`
                @keyframes marquee-seamless {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .ticker-animate {
                    animation: marquee-seamless linear infinite;
                }
            `}</style>
            <div
                ref={textRef}
                className="whitespace-nowrap inline-flex ticker-animate"
                style={{
                    animationDuration: `${animDuration}s`,
                    width: 'max-content'
                }}
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
