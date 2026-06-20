import { collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface WaitlistPromotionNotification {
    type: 'waitlist_promoted';
    sessionId: string;
    sessionTitle: string;
    sessionDate: string;
    court?: string;
    read: boolean;
    createdAt: ReturnType<typeof serverTimestamp>;
}

export interface PromotionInfo {
    uid: string;
    name: string;
    court?: string;
    sessionId: string;
    sessionTitle: string;
    sessionDate: string;
}

export const writeWaitlistPromotionNotification = async (
    promoted: PromotionInfo,
    actorUid?: string,
): Promise<void> => {
    if (actorUid && promoted.uid === actorUid) return;

    const notificationRef = doc(collection(db, 'users', promoted.uid, 'notifications'));
    await setDoc(notificationRef, {
        type: 'waitlist_promoted',
        sessionId: promoted.sessionId,
        sessionTitle: promoted.sessionTitle,
        sessionDate: promoted.sessionDate,
        ...(promoted.court ? { court: promoted.court } : {}),
        read: false,
        createdAt: serverTimestamp(),
    } satisfies WaitlistPromotionNotification);
};

export const dismissNotification = async (uid: string, notificationId: string): Promise<void> => {
    await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), { read: true });
};

export const notifyWaitlistPromotion = async (params: {
    promotedUid: string;
    promotedName: string;
    promotedCourt?: string;
    sessionId: string;
    sessionTitle: string;
    sessionDate: string;
    actorUid?: string;
}): Promise<void> => {
    await writeWaitlistPromotionNotification(
        {
            uid: params.promotedUid,
            name: params.promotedName,
            court: params.promotedCourt,
            sessionId: params.sessionId,
            sessionTitle: params.sessionTitle,
            sessionDate: params.sessionDate,
        },
        params.actorUid,
    );
};
