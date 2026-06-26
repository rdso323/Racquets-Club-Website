import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { maintainArchivedCollections } from '../lib/archive';
import { type AdminRecurringSchedule } from '../lib/sports';
import { normalizeSessionFromFirestore, type Session } from '../lib/sessions';
import type { AdminEvent, FeedbackItem } from '../components/admin/types';

/** Subscribes to all Operations Deck collections on mount so stats and modules stay in sync. */
export const useAdminData = (isAdmin = false) => {
    const [initialLoading, setInitialLoading] = useState(true);
    const [tickerText, setTickerText] = useState('');
    const [tickerEnabled, setTickerEnabled] = useState(false);
    const [sessionsList, setSessionsList] = useState<Session[]>([]);
    const [recurringSchedules, setRecurringSchedules] = useState<AdminRecurringSchedule[]>([]);
    const [disabledBuiltinSchedules, setDisabledBuiltinSchedules] = useState<string[]>([]);
    const [eventsList, setEventsList] = useState<AdminEvent[]>([]);
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);

    useEffect(() => {
        const unsubs: (() => void)[] = [];

        unsubs.push(
            onSnapshot(
                doc(db, 'settings', 'ticker'),
                (snap) => {
                    if (snap.exists()) {
                        setTickerText(snap.data().text || '');
                        setTickerEnabled(snap.data().enabled === true);
                    }
                    setInitialLoading(false);
                },
                (err) => {
                    console.error('Ticker subscription error', err);
                    setInitialLoading(false);
                },
            ),
        );

        unsubs.push(
            onSnapshot(
                doc(db, 'settings', 'recurringSchedules'),
                (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        setRecurringSchedules(
                            Array.isArray(data.schedules) ? (data.schedules as AdminRecurringSchedule[]) : [],
                        );
                        setDisabledBuiltinSchedules(
                            Array.isArray(data.disabledBuiltin) ? (data.disabledBuiltin as string[]) : [],
                        );
                    } else {
                        setRecurringSchedules([]);
                        setDisabledBuiltinSchedules([]);
                    }
                },
                (err) => console.error('Recurring schedules subscription error', err),
            ),
        );

        unsubs.push(
            onSnapshot(
                collection(db, 'sessions'),
                (snapshot) => {
                    setSessionsList(
                        snapshot.docs.map((docSnap) =>
                            normalizeSessionFromFirestore(docSnap.id, docSnap.data()),
                        ),
                    );
                },
                (err) => console.error('Sessions subscription error', err),
            ),
        );

        unsubs.push(
            onSnapshot(
                collection(db, 'events'),
                (snapshot) => {
                    const events = snapshot.docs.map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                    })) as AdminEvent[];
                    setEventsList(events);
                },
                (err) => console.error('Events subscription error', err),
            ),
        );

        unsubs.push(
            onSnapshot(
                collection(db, 'feedback'),
                (snapshot) => {
                    const list = snapshot.docs.map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                    })) as FeedbackItem[];
                    list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                    setFeedbackList(list);
                },
                (err) => console.error('Feedback subscription error', err),
            ),
        );

        return () => {
            unsubs.forEach((unsub) => unsub());
        };
    }, [isAdmin]);

    useEffect(() => {
        if (!isAdmin) return;
        void maintainArchivedCollections(eventsList, sessionsList, isAdmin);
    }, [eventsList, sessionsList, isAdmin]);

    return {
        initialLoading,
        tickerText,
        setTickerText,
        tickerEnabled,
        setTickerEnabled,
        sessionsList,
        recurringSchedules,
        disabledBuiltinSchedules,
        eventsList,
        feedbackList,
    };
};
