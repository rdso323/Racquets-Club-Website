import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_CLUB_EVENTS } from './defaultEvents';
import { isEventPast } from './events';

/** Write recommended events to Firestore with stable document IDs; remove stale docs. */
export const syncRecommendedEventsToFirestore = async (existingIds: string[]): Promise<void> => {
    const keepIds = new Set(DEFAULT_CLUB_EVENTS.map((event) => event.id));

    await Promise.all(
        existingIds
            .filter((id) => !keepIds.has(id))
            .map((id) => deleteDoc(doc(db, 'events', id))),
    );

    await Promise.all(
        DEFAULT_CLUB_EVENTS.map(({ id, ...event }) => setDoc(doc(db, 'events', id), event)),
    );
};

/** Delete past event documents from Firestore (same end-of-day rule as the home carousel). */
export const removePastEventsFromFirestore = async (
    events: Array<{ id: string; date: string }>,
): Promise<number> => {
    const pastIds = events.filter((event) => isEventPast(event)).map((event) => event.id);
    await Promise.all(pastIds.map((id) => deleteDoc(doc(db, 'events', id))));
    return pastIds.length;
};
