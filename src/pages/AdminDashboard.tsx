import { useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminData } from '../hooks/useAdminData';
import AdminLayout from '../components/admin/AdminLayout';
import SettingsModule from '../components/admin/modules/SettingsModule';
import SessionsModule from '../components/admin/modules/SessionsModule';
import EventsModule from '../components/admin/modules/EventsModule';
import FeedbackModule from '../components/admin/modules/FeedbackModule';
import type { AdminTab } from '../components/admin/types';

const AdminDashboard = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<AdminTab>('settings');
    const createSessionFormRef = useRef<HTMLDivElement>(null);

    const {
        initialLoading,
        tabLoading,
        tickerText,
        setTickerText,
        sessionStatuses,
        updateStatus,
        sessionsList,
        eventsList,
        feedbackList,
    } = useAdminData(activeTab);

    const triggerQuickSession = () => {
        setActiveTab('sessions');
        window.setTimeout(() => {
            createSessionFormRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
    };

    if (initialLoading && activeTab === 'settings') {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-court-accent border-t-transparent" />
            </div>
        );
    }

    return (
        <AdminLayout
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onQuickSession={triggerQuickSession}
            userEmail={user?.email}
            sessionCount={sessionsList.length}
            eventCount={eventsList.length}
            feedbackCount={feedbackList.length}
            tickerConfigured={tickerText.trim().length > 0}
        >
            {tabLoading && (
                <p className="hud-label mb-4 text-gray-400 dark:text-chalk/40">Syncing module data…</p>
            )}

            {activeTab === 'settings' && (
                <SettingsModule
                    tickerText={tickerText}
                    setTickerText={setTickerText}
                    sessionStatuses={sessionStatuses}
                    updateStatus={updateStatus}
                />
            )}

            {activeTab === 'sessions' && (
                <SessionsModule ref={createSessionFormRef} sessionsList={sessionsList} />
            )}

            {activeTab === 'events' && <EventsModule eventsList={eventsList} />}

            {activeTab === 'feedback' && <FeedbackModule feedbackList={feedbackList} />}
        </AdminLayout>
    );
};

export default AdminDashboard;
