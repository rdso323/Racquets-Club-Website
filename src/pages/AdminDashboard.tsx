import { useRef, useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminData } from '../hooks/useAdminData';
import AdminLayout from '../components/admin/AdminLayout';
import SettingsModule from '../components/admin/modules/SettingsModule';
import SessionsModule from '../components/admin/modules/SessionsModule';
import EventsModule from '../components/admin/modules/EventsModule';
import ArchiveModule from '../components/admin/modules/ArchiveModule';
import FeedbackModule from '../components/admin/modules/FeedbackModule';
import type { AdminTab } from '../components/admin/types';
import { filterUpcomingEvents, partitionEventsByPast } from '../lib/events';
import { partitionSessionsByPast } from '../lib/archive';
import { buildAdminDisplaySessions } from '../lib/sessions';

const AdminDashboard = () => {
    const { user, isAdmin } = useAuth();
    const [activeTab, setActiveTab] = useState<AdminTab>('settings');
    const createSessionFormRef = useRef<HTMLDivElement>(null);

    const {
        initialLoading,
        tickerText,
        setTickerText,
        sessionsList,
        recurringSchedules,
        disabledBuiltinSchedules,
        eventsList,
        feedbackList,
    } = useAdminData(isAdmin);

    const upcomingSessions = useMemo(
        () =>
            buildAdminDisplaySessions(
                sessionsList,
                null,
                recurringSchedules,
                disabledBuiltinSchedules,
            ),
        [sessionsList, recurringSchedules, disabledBuiltinSchedules],
    );

    const archiveCount = useMemo(() => {
        const { past: pastEvents } = partitionEventsByPast(eventsList);
        const { past: pastSessions } = partitionSessionsByPast(sessionsList);
        return pastEvents.length + pastSessions.length;
    }, [eventsList, sessionsList]);

    const triggerQuickSession = () => {
        setActiveTab('sessions');
        window.setTimeout(() => {
            createSessionFormRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
    };

    if (initialLoading) {
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
            sessionCount={upcomingSessions.length}
            eventCount={filterUpcomingEvents(eventsList).length}
            archiveCount={archiveCount}
            feedbackCount={feedbackList.length}
            tickerConfigured={tickerText.trim().length > 0}
        >
            {activeTab === 'settings' && (
                <SettingsModule tickerText={tickerText} setTickerText={setTickerText} />
            )}

            {activeTab === 'sessions' && (
                <SessionsModule
                    ref={createSessionFormRef}
                    sessionsList={sessionsList}
                    recurringSchedules={recurringSchedules}
                    disabledBuiltinSchedules={disabledBuiltinSchedules}
                />
            )}

            {activeTab === 'events' && <EventsModule eventsList={eventsList} />}

            {activeTab === 'archive' && (
                <ArchiveModule eventsList={eventsList} sessionsList={sessionsList} />
            )}

            {activeTab === 'feedback' && <FeedbackModule feedbackList={feedbackList} />}
        </AdminLayout>
    );
};

export default AdminDashboard;
