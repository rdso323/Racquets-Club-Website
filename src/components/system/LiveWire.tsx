import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { VelocityMarquee } from './kinetic';

const HARDCODED_TICKER = "INDIAN WELLS M1000 (LIVE): A. Zverev 🇩🇪 d. B. Nakashima 🇺🇸 7-6, 5-7, 6-4 | A. Davidovich Fokina 🇪🇸 d. J. Mensik 🇨🇿 6-2, 4-6, 6-2 | L. Tien 🇺🇸 d. B. Shelton 🇺🇸 7-6, 4-6, 6-3 | A. Sabalenka 🇧🇾 d. J. Cristian 🇷🇴 6-4, 6-1 | T. Gibson 🇦🇺 d. C. Tauson 🇩🇰 7-6, 4-6, 6-4 | SQUASH NZ OPEN: P. Coll 🇳🇿 d. M. Zakaria 🇪🇬 11-7, 11-2, 11-5 | T. Gilis 🇧🇪 d. N. Gilis 🇧🇪 3-1 | BADMINTON ALL ENGLAND: Lin C. 🇹🇼 d. L. Sen 🇮🇳 2-1 | RANKINGS: ATP: 1. Alcaraz 🇪🇸, 2. Sinner 🇮🇹, 3. Djokovic 🇷🇸 | WTA: 1. Sabalenka 🇧🇾, 2. Swiatek 🇵🇱, 3. Rybakina 🇰🇿";

/*
 * THE WIRE — scroll-velocity-reactive broadcast strip.
 * Same Firestore source as the legacy ticker (settings/ticker),
 * reborn as a kinetic typographic band.
 */
const LiveWire = ({ flipped = false }: { flipped?: boolean }) => {
    const [tickerText, setTickerText] = useState(HARDCODED_TICKER);

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
        <div className="hairline-t hairline-b relative bg-court py-3">
            <VelocityMarquee
                baseVelocity={flipped ? -2 : 2}
                itemClassName="pr-16"
                copies={3}
            >
                <span className="inline-flex items-center gap-6 font-mono text-[11px] uppercase tracking-hud text-chalk/70">
                    <span className="text-ace">● THE WIRE</span>
                    <span dangerouslySetInnerHTML={{ __html: tickerText }} />
                </span>
            </VelocityMarquee>
        </div>
    );
};

export default LiveWire;
