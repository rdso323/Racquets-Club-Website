import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const HARDCODED_TICKER =
    'Indian Wells: Zverev advances | Sabalenka through to round of 16 | All England: Lin Chun-Yi wins men\'s singles | PSA Squash NZ Open: Paul Coll defends title | Fuqua Racquets Club — Open play sessions weekly';

let sharedText = HARDCODED_TICKER;
const subscribers = new Set<() => void>();
let unsubscribeFirestore: (() => void) | null = null;

const notify = () => subscribers.forEach((fn) => fn());

const ensureFirestoreSubscription = () => {
    if (unsubscribeFirestore) return;

    unsubscribeFirestore = onSnapshot(
        doc(db, 'settings', 'ticker'),
        (docSnap) => {
            if (docSnap.exists() && docSnap.data().text?.trim()) {
                sharedText = docSnap.data().text;
                notify();
            }
        },
        (error) => console.warn('Ticker fallback in use.', error),
    );
};

const stripTickerHtml = (html: string) =>
    html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ');

/** Seconds for one marquee loop — scales with copy length, capped for readability. */
export const tickerMarqueeDurationSec = (text: string): number =>
    Math.max(120, Math.round(stripTickerHtml(text).length * 0.22));

/** Single shared Firestore listener for all ticker instances on the page. */
export const useTickerText = () => {
    const [, bump] = useState(0);

    useEffect(() => {
        ensureFirestoreSubscription();
        const rerender = () => bump((n) => n + 1);
        subscribers.add(rerender);
        return () => {
            subscribers.delete(rerender);
            if (subscribers.size === 0 && unsubscribeFirestore) {
                unsubscribeFirestore();
                unsubscribeFirestore = null;
            }
        };
    }, []);

    return sharedText;
};
