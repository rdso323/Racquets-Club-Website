import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getSessionsLookbackStartISO } from '../lib/sessions';

/** Lightweight prefetch so the preloader can reveal once the first session snapshot arrives. */
export function useSessionsPrefetchReady() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const lookbackISO = getSessionsLookbackStartISO();
        const unsub = onSnapshot(
            query(collection(db, 'sessions'), where('weekStartDate', '>=', lookbackISO)),
            () => setReady(true),
            () => setReady(true),
        );
        return unsub;
    }, []);

    return ready;
}
