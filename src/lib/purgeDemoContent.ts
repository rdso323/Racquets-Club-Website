import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { isDemoClubEvent } from './demoClubContent';

const DEMO_PURGE_DOC = doc(db, 'settings', 'demoPurge');

let purgeInFlight = false;

/**
 * One-time cleanup of mock open-play/clinic schedules and demo events stored in Firestore.
 * Safe to call from any allowlisted admin session; no-ops after `settings/demoPurge.v1` is set.
 */
export const purgeDemoClubContentIfNeeded = async (): Promise<void> => {
    if (purgeInFlight) return;
    purgeInFlight = true;

    try {
        const flagSnap = await getDoc(DEMO_PURGE_DOC);
        if (flagSnap.exists() && flagSnap.data()?.v1 === true) return;

        const [eventsSnap, sessionsSnap] = await Promise.all([
            getDocs(collection(db, 'events')),
            getDocs(collection(db, 'sessions')),
        ]);

        const eventDeletes: Promise<void>[] = [];
        for (const eventDoc of eventsSnap.docs) {
            if (isDemoClubEvent({ id: eventDoc.id, title: eventDoc.data()?.title })) {
                eventDeletes.push(deleteDoc(eventDoc.ref));
            }
        }

        const sessionDeletes: Promise<void>[] = [];
        for (const sessionDoc of sessionsSnap.docs) {
            const id = sessionDoc.id;
            const title = String(sessionDoc.data()?.title ?? '').toLowerCase();
            const isBuiltinRecurring =
                id.startsWith('open_play_') ||
                id.startsWith('clinic_') ||
                id.startsWith('open_play_custom_') ||
                id.startsWith('clinic_custom_');
            const looksLikeDemoOpenPlay =
                title.includes('open play') || title.includes('coaching clinic');
            if (isBuiltinRecurring || looksLikeDemoOpenPlay) {
                sessionDeletes.push(deleteDoc(sessionDoc.ref));
            }
        }

        await Promise.all([
            ...eventDeletes,
            ...sessionDeletes,
            setDoc(
                doc(db, 'settings', 'recurringSchedules'),
                { schedules: [], disabledBuiltin: [] },
                { merge: true },
            ),
        ]);

        await setDoc(
            DEMO_PURGE_DOC,
            {
                v1: true,
                purgedAt: serverTimestamp(),
                deletedEvents: eventDeletes.length,
                deletedSessions: sessionDeletes.length,
            },
            { merge: true },
        );
    } catch (err) {
        console.warn('Demo content purge skipped or failed:', err);
        throw err;
    } finally {
        purgeInFlight = false;
    }
};
