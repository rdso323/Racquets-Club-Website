import { useEffect, useRef } from 'react';
import { purgeDemoClubContentIfNeeded } from '../lib/purgeDemoContent';

/** Runs the one-time Firestore demo purge when an allowlisted admin is signed in. */
export const usePurgeDemoContent = (enabled: boolean) => {
    const startedRef = useRef(false);

    useEffect(() => {
        if (!enabled || startedRef.current) return;
        startedRef.current = true;
        void purgeDemoClubContentIfNeeded().catch(() => {
            startedRef.current = false;
        });
    }, [enabled]);
};
