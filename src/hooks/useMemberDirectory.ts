import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { buildMemberDirectory, type ClubMember } from '../lib/members';
import type { Session } from '../lib/sessions';

/** Club members from Firestore `users` plus anyone on session rosters/waitlists. */
export const useMemberDirectory = (sessions: Session[]): ClubMember[] => {
    const [userDocs, setUserDocs] = useState<Array<{ id: string; data: Record<string, unknown> }>>([]);

    useEffect(() => {
        const unsub = onSnapshot(
            collection(db, 'users'),
            (snapshot) => {
                setUserDocs(snapshot.docs.map((docSnap) => ({ id: docSnap.id, data: docSnap.data() })));
            },
            (err) => console.error('Users subscription error', err),
        );
        return unsub;
    }, []);

    return useMemo(() => buildMemberDirectory(userDocs, sessions), [userDocs, sessions]);
};
