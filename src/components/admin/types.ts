import type { SessionStatus } from '../../lib/sessions';

export type AdminTab = 'settings' | 'sessions' | 'events' | 'archive' | 'feedback';

export interface AdminEvent {
    id: string;
    title: string;
    date: string;
    dateISO?: string;
    time: string;
    startTime?: string;
    endTime?: string;
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
