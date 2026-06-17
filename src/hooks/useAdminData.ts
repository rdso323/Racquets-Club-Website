import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SESSION_STATUS_CATEGORIES, type AdminRecurringSchedule } from '../lib/sports';
import type { Session, SessionStatus } from '../lib/sessions';
import type { AdminEvent, FeedbackItem, SessionStatusMap } from '../components/admin/types';

const defaultStatuses = (): SessionStatusMap => {
    const defaults: SessionStatusMap = {};
    SESSION_STATUS_CATEGORIES.forEach((cat) => {
        defaults[cat.id] = 'active';
    });
    return defaults;
};

/** Subscribes to all Operations Deck collections on mount so stats and modules stay in sync. */
export const useAdminData = () => {
    const [initialLoading, setInitialLoading] = useState(true);
    const [tickerText, setTickerText] = useState('');
    const [sessionStatuses, setSessionStatuses] = useState<SessionStatusMap>(defaultStatuses);
    const [sessionsList, setSessionsList] = useState<Session[]>([]);
    const [recurringSchedules, setRecurringSchedules] = useState<AdminRecurringSchedule[]>([]);
    const [eventsList, setEventsList] = useState<AdminEvent[]>([]);
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);

    useEffect(() => {
        const unsubs: (() => void)[] = [];

        unsubs.push(
            onSnapshot(
                doc(db, 'settings', 'ticker'),
                (snap) => {
                    if (snap.exists()) setTickerText(snap.data().text || '');
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
                doc(db, 'settings', 'sessionStatus'),
                (snap) => {
                    if (snap.exists()) {
                        setSessionStatuses(snap.data() as SessionStatusMap);
                    } else {
                        setSessionStatuses(defaultStatuses());
                    }
                },
                (err) => console.error('Session status subscription error', err),
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
                    } else {
                        setRecurringSchedules([]);
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
                        snapshot.docs.map((docSnap) => ({
                            id: docSnap.id,
                            ...docSnap.data(),
                        })) as Session[],
                    );
                },
                (err) => console.error('Sessions subscription error', err),
            ),
        );

        unsubs.push(
            onSnapshot(
                collection(db, 'events'),
                (snapshot) => {
                    setEventsList(
                        snapshot.docs.map((docSnap) => ({
                            id: docSnap.id,
                            ...docSnap.data(),
                        })) as AdminEvent[],
                    );
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
    }, []);

    const updateStatus = (id: string, status: SessionStatus) => {
        setSessionStatuses((prev) => ({ ...prev, [id]: status }));
    };

    return {
        initialLoading,
        tickerText,
        setTickerText,
        sessionStatuses,
        setSessionStatuses,
        updateStatus,
        sessionsList,
        recurringSchedules,
        eventsList,
        feedbackList,
    };
};
