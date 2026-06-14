import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SESSION_STATUS_CATEGORIES } from '../lib/sports';
import type { Session, SessionStatus } from '../lib/sessions';
import type { AdminEvent, AdminTab, FeedbackItem, SessionStatusMap } from '../components/admin/types';

const defaultStatuses = (): SessionStatusMap => {
    const defaults: SessionStatusMap = {};
    SESSION_STATUS_CATEGORIES.forEach((cat) => {
        defaults[cat.id] = 'active';
    });
    return defaults;
};

export const useAdminData = (activeTab: AdminTab) => {
    const [initialLoading, setInitialLoading] = useState(true);
    const [tabLoading, setTabLoading] = useState(false);
    const [tickerText, setTickerText] = useState('');
    const [sessionStatuses, setSessionStatuses] = useState<SessionStatusMap>(defaultStatuses);
    const [sessionsList, setSessionsList] = useState<Session[]>([]);
    const [eventsList, setEventsList] = useState<AdminEvent[]>([]);
    const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);

    useEffect(() => {
        setTabLoading(true);
        const unsubs: (() => void)[] = [];

        if (activeTab === 'settings') {
            unsubs.push(
                onSnapshot(
                    doc(db, 'settings', 'ticker'),
                    (snap) => {
                        if (snap.exists()) setTickerText(snap.data().text || '');
                        setInitialLoading(false);
                        setTabLoading(false);
                    },
                    (err) => {
                        console.error('Ticker subscription error', err);
                        setInitialLoading(false);
                        setTabLoading(false);
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
        }

        if (activeTab === 'sessions') {
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
                        setInitialLoading(false);
                        setTabLoading(false);
                    },
                    (err) => {
                        console.error('Sessions subscription error', err);
                        setInitialLoading(false);
                        setTabLoading(false);
                    },
                ),
            );
        }

        if (activeTab === 'events') {
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
                        setInitialLoading(false);
                        setTabLoading(false);
                    },
                    (err) => {
                        console.error('Events subscription error', err);
                        setInitialLoading(false);
                        setTabLoading(false);
                    },
                ),
            );
        }

        if (activeTab === 'feedback') {
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
                        setInitialLoading(false);
                        setTabLoading(false);
                    },
                    (err) => {
                        console.error('Feedback subscription error', err);
                        setInitialLoading(false);
                        setTabLoading(false);
                    },
                ),
            );
        }

        return () => {
            unsubs.forEach((unsub) => unsub());
        };
    }, [activeTab]);

    const updateStatus = (id: string, status: SessionStatus) => {
        setSessionStatuses((prev) => ({ ...prev, [id]: status }));
    };

    return {
        initialLoading,
        tabLoading,
        tickerText,
        setTickerText,
        sessionStatuses,
        setSessionStatuses,
        updateStatus,
        sessionsList,
        eventsList,
        feedbackList,
    };
};
