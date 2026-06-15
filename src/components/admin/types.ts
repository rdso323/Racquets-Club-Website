import type { SessionStatus } from '../../lib/sessions';

export type AdminTab = 'settings' | 'sessions' | 'events' | 'feedback';

export interface AdminEvent {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    image: string;
    link?: string;
}

export interface FeedbackItem {
    id: string;
    type: 'bug' | 'improvement' | 'other';
    message: string;
    email: string;
    userId: string;
    createdAt?: { seconds?: number };
}

export type SessionStatusMap = Record<string, SessionStatus>;
