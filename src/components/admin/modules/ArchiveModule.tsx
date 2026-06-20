import { deleteDoc, doc } from 'firebase/firestore';
import { Archive, Calendar, Clock, Trash2 } from 'lucide-react';
import { db } from '../../../lib/firebase';
import {
    ARCHIVE_RETENTION_DAYS,
    partitionEventsByPast,
    partitionSessionsByPast,
} from '../../../lib/archive';
import type { AdminEvent } from '../types';
import type { Session } from '../../../lib/sessions';
import EventOpsCard from '../cards/EventOpsCard';

interface ArchiveModuleProps {
    eventsList: AdminEvent[];
    sessionsList: Session[];
}

const ArchivedSessionCard = ({
    session,
    onDelete,
}: {
    session: Session;
    onDelete: () => void;
}) => (
    <div className="flex flex-col rounded-2xl border border-gray-200/60 bg-gray-50/20 p-5 opacity-75 dark:border-gray-800/60 dark:bg-court-950/30">
        <div className="mb-3 flex items-start justify-between gap-3">
            <div>
                <span className="mb-2 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    Archived
                </span>
                <h4 className="font-display text-lg text-gray-900 dark:text-chalk">{session.title}</h4>
            </div>
            <button
                type="button"
                onClick={onDelete}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:text-red-500"
                title="Delete now"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
        <div className="space-y-1 text-sm text-gray-500 dark:text-gray-400">
            <p className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                {session.date}
            </p>
            <p className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {session.time}
            </p>
        </div>
    </div>
);

const ArchiveModule = ({ eventsList, sessionsList }: ArchiveModuleProps) => {
    const { past: pastEvents } = partitionEventsByPast(eventsList);
    const { past: pastSessions } = partitionSessionsByPast(sessionsList);

    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm('Delete this archived event now?')) return;
        try {
            await deleteDoc(doc(db, 'events', id));
        } catch (err) {
            console.error('Error deleting event:', err);
            window.alert('Error deleting event.');
        }
    };

    const handleDeleteSession = async (session: Session) => {
        if (!window.confirm(`Delete "${session.title}" now?`)) return;
        try {
            await deleteDoc(doc(db, 'sessions', session.id));
        } catch (err) {
            console.error('Error deleting session:', err);
            window.alert('Error deleting session.');
        }
    };

    const isEmpty = pastEvents.length === 0 && pastSessions.length === 0;

    return (
        <div className="animate-fadeIn space-y-8">
            <div>
                <h2 className="mb-2 font-display text-2xl text-gray-900 dark:text-chalk">Archive</h2>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                    Recently ended events and one-time sessions appear here for {ARCHIVE_RETENTION_DAYS} days,
                    then are auto-deleted when an admin visits the site. Weekly open play rolls forward and is
                    not archived.
                </p>

                {isEmpty ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-gray-400 dark:border-gray-800 dark:text-gray-500">
                        <Archive className="mx-auto mb-2 h-8 w-8 opacity-50" />
                        <p className="text-sm">Nothing in the archive right now.</p>
                    </div>
                ) : (
                    <div className="space-y-10">
                        {pastEvents.length > 0 && (
                            <div>
                                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-chalk/40">
                                    Past events ({pastEvents.length})
                                </h3>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {pastEvents.map((event) => (
                                        <EventOpsCard
                                            key={event.id}
                                            event={event}
                                            isPast
                                            onEdit={() => {}}
                                            onDelete={() => handleDeleteEvent(event.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {pastSessions.length > 0 && (
                            <div>
                                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-400 dark:text-chalk/40">
                                    Past sessions ({pastSessions.length})
                                </h3>
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                                    {pastSessions.map((session) => (
                                        <ArchivedSessionCard
                                            key={session.id}
                                            session={session}
                                            onDelete={() => handleDeleteSession(session)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ArchiveModule;
