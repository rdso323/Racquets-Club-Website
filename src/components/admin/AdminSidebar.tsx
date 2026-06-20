import {
    Calendar,
    Archive,
    MessageSquare,
    Plus,
    Sliders,
    Sparkles,
} from 'lucide-react';
import type { AdminTab } from './types';

interface AdminSidebarProps {
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void;
    onQuickSession: () => void;
    sessionCount: number;
    eventCount: number;
    archiveCount: number;
    feedbackCount: number;
}

const navButtonClass = (active: boolean) =>
    `w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
        active
            ? 'border-l-4 border-court-accent bg-wimbledon-navy text-white shadow-sm dark:bg-wimbledon-navy/40 dark:text-court-accent'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-court-800 dark:hover:text-gray-200'
    }`;

const AdminSidebar = ({
    activeTab,
    onTabChange,
    onQuickSession,
    sessionCount,
    eventCount,
    archiveCount,
    feedbackCount,
}: AdminSidebarProps) => (
    <aside className="glass-deep flex w-full shrink-0 flex-col gap-2 p-4 lg:w-64">
        <div className="mb-2 border-b border-gray-100 px-3 py-2 dark:border-chalk/10">
            <span className="hud-label text-emerald-600 dark:text-court-accent">Modules</span>
        </div>

        <button onClick={() => onTabChange('settings')} className={navButtonClass(activeTab === 'settings')}>
            <Sliders className="h-4 w-4" />
            Ticker & Settings
        </button>

        <button onClick={() => onTabChange('sessions')} className={navButtonClass(activeTab === 'sessions')}>
            <Calendar className="h-4 w-4" />
            Courts & Sessions
            {sessionCount > 0 && (
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-court-950 dark:text-gray-300">
                    {sessionCount}
                </span>
            )}
        </button>

        <button onClick={() => onTabChange('events')} className={navButtonClass(activeTab === 'events')}>
            <Sparkles className="h-4 w-4" />
            Events Manager
            {eventCount > 0 && (
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-court-950 dark:text-gray-300">
                    {eventCount}
                </span>
            )}
        </button>

        <button onClick={() => onTabChange('archive')} className={navButtonClass(activeTab === 'archive')}>
            <Archive className="h-4 w-4" />
            Archive
            {archiveCount > 0 && (
                <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-600 dark:bg-court-950 dark:text-gray-300">
                    {archiveCount}
                </span>
            )}
        </button>

        <button onClick={() => onTabChange('feedback')} className={navButtonClass(activeTab === 'feedback')}>
            <MessageSquare className="h-4 w-4" />
            Feedback Inbox
            {feedbackCount > 0 && (
                <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                    {feedbackCount}
                </span>
            )}
        </button>

        <div className="mt-4 flex flex-col gap-2 border-t border-gray-150 pt-4 dark:border-gray-800">
            <button
                type="button"
                onClick={onQuickSession}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-wimbledon-green py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-150 hover:bg-[#004d00] active:scale-95 dark:bg-wimbledon-green dark:hover:bg-emerald-600"
            >
                <Plus className="h-3.5 w-3.5" />
                Quick Session
            </button>
        </div>
    </aside>
);

export default AdminSidebar;
