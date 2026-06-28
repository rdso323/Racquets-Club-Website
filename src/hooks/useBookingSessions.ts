import { useEffect, useMemo, useState } from 'react';
import {
    collection,
    documentId,
    onSnapshot,
    query,
    where,
    type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AdminRecurringSchedule } from '../lib/sports';
import {
    type Session,
    getExpectedRecurringSessionIds,
    getSessionsLookbackStartISO,
    normalizeSessionFromFirestore,
} from '../lib/sessions';

const FIRESTORE_IN_LIMIT = 30;

const chunkArray = <T,>(items: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
};

interface UseBookingSessionsOptions {
    recurringSchedules: AdminRecurringSchedule[];
    disabledBuiltinSchedules: string[];
}

export function useBookingSessions({
    recurringSchedules,
    disabledBuiltinSchedules,
}: UseBookingSessionsOptions) {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const lookbackISO = useMemo(() => getSessionsLookbackStartISO(), []);
    const recurringIdChunks = useMemo(() => {
        const ids = getExpectedRecurringSessionIds(recurringSchedules, disabledBuiltinSchedules);
        return chunkArray(ids, FIRESTORE_IN_LIMIT);
    }, [recurringSchedules, disabledBuiltinSchedules]);

    useEffect(() => {
        setLoading(true);
        setError(null);

        const sourceSessions = new Map<string, Map<string, Session>>();
        const sourceKeys: string[] = ['weekStartDate', ...recurringIdChunks.map((_, i) => `recurring-${i}`)];
        const readySources = new Set<string>();

        const publishMergedSessions = () => {
            const merged = new Map<string, Session>();
            for (const map of sourceSessions.values()) {
                for (const [id, session] of map) {
                    merged.set(id, session);
                }
            }
            setSessions([...merged.values()]);
        };

        const markSourceReady = (sourceKey: string, nextSessions: Session[]) => {
            sourceSessions.set(
                sourceKey,
                new Map(nextSessions.map((session) => [session.id, session])),
            );
            readySources.add(sourceKey);
            publishMergedSessions();

            if (readySources.size >= sourceKeys.length) {
                setLoading(false);
            }
        };

        const handleError = (err: unknown) => {
            console.error('Error fetching sessions:', err);
            setError('Could not load sessions. Please try again later.');
            setLoading(false);
        };

        const unsubscribers: Unsubscribe[] = [];

        unsubscribers.push(
            onSnapshot(
                query(collection(db, 'sessions'), where('weekStartDate', '>=', lookbackISO)),
                (snapshot) => {
                    markSourceReady(
                        'weekStartDate',
                        snapshot.docs.map((docSnap) =>
                            normalizeSessionFromFirestore(docSnap.id, docSnap.data()),
                        ),
                    );
                },
                handleError,
            ),
        );

        recurringIdChunks.forEach((chunk, index) => {
            const sourceKey = `recurring-${index}`;

            if (chunk.length === 0) {
                markSourceReady(sourceKey, []);
                return;
            }

            unsubscribers.push(
                onSnapshot(
                    query(collection(db, 'sessions'), where(documentId(), 'in', chunk)),
                    (snapshot) => {
                        markSourceReady(
                            sourceKey,
                            snapshot.docs.map((docSnap) =>
                                normalizeSessionFromFirestore(docSnap.id, docSnap.data()),
                            ),
                        );
                    },
                    handleError,
                ),
            );
        });

        return () => {
            for (const unsub of unsubscribers) unsub();
        };
    }, [lookbackISO, recurringIdChunks]);

    return { sessions, loading, error };
}
