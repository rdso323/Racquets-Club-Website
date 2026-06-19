import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { DEFAULT_CLUB_EVENTS } from './defaultEvents';

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
