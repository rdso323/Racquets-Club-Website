import { ArrowLeft, Shield } from 'lucide-react';
import type { ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';
import OpsStatsStrip from './OpsStatsStrip';
import type { AdminTab } from './types';

interface AdminLayoutProps {
    activeTab: AdminTab;
    onTabChange: (tab: AdminTab) => void;
    onQuickSession: () => void;
    userEmail?: string | null;
    sessionCount: number;
    eventCount: number;
    archiveCount: number;
    feedbackCount: number;
    tickerConfigured: boolean;
    children: ReactNode;
}

const AdminLayout = ({
    activeTab,
    onTabChange,
    onQuickSession,
    userEmail,
    sessionCount,
    eventCount,
    archiveCount,
    feedbackCount,
    tickerConfigured,
    children,
}: AdminLayoutProps) => (
    <div className="min-h-screen text-gray-900 transition-colors duration-300 dark:text-chalk">
        <div className="mb-8 flex flex-col justify-between gap-4 border-b border-gray-200 pb-6 dark:border-chalk/10 md:flex-row md:items-end">
            <div>
                <p className="hud-label mb-2 flex items-center gap-2 text-emerald-600 dark:text-court-accent">
                    <Shield className="h-4 w-4" />
                    Club Operations
                </p>
                <h1 className="font-display text-3xl tracking-tight text-wimbledon-navy dark:text-chalk md:text-4xl">
                    Operations Deck
                </h1>
                <p className="mt-2 text-sm text-gray-500 dark:text-chalk/50">
                    Signed in as{' '}
                    <span className="font-semibold text-clay-600 dark:text-clay-300">{userEmail}</span>
                </p>
            </div>
            <a
                href="/"
                className="flex min-h-11 touch-manipulation items-center gap-1.5 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:border-chalk/10 dark:bg-carbon dark:text-chalk/70 dark:hover:bg-court-800"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                View Live Website
            </a>
        </div>

        <OpsStatsStrip
            sessionCount={sessionCount}
            eventCount={eventCount}
            feedbackCount={feedbackCount}
            tickerConfigured={tickerConfigured}
        />

        <div className="flex flex-col items-start gap-8 lg:flex-row">
            <AdminSidebar
                activeTab={activeTab}
                onTabChange={onTabChange}
                onQuickSession={onQuickSession}
                sessionCount={sessionCount}
                eventCount={eventCount}
                archiveCount={archiveCount}
                feedbackCount={feedbackCount}
            />
            <main className="glass-deep min-h-[600px] w-full flex-grow p-4 transition-colors duration-300 sm:p-6 md:p-8">
                {children}
            </main>
        </div>
    </div>
);

export default AdminLayout;
