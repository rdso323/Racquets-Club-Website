import { memo } from 'react';
import { Calendar, Clock, Edit, MapPin, Trash2 } from 'lucide-react';
import type { AdminEvent } from '../types';

export interface EventOpsCardProps {
    event: AdminEvent;
    onEdit: () => void;
    onDelete: () => void;
}

const EventOpsCard = memo(({ event, onEdit, onDelete }: EventOpsCardProps) => (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-250/75 bg-gray-50/20 shadow-sm dark:border-gray-800/80 dark:bg-court-950/30">
        <div className="relative h-44 w-full overflow-hidden bg-gray-200 dark:bg-carbon">
            <img
                src={event.image}
                alt={event.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute right-2 top-2 flex gap-1.5">
                <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-lg bg-black/60 p-1.5 text-white transition-colors hover:text-court-accent"
                    title="Edit Event"
                >
                    <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                    type="button"
                    onClick={onDelete}
                    className="rounded-lg bg-black/60 p-1.5 text-white transition-colors hover:text-red-500"
                    title="Delete Event"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3
                    className="line-clamp-2 font-display text-lg font-bold text-white drop-shadow-sm"
                    title={event.title}
                >
                    {event.title}
                </h3>
            </div>
        </div>
        <div className="flex flex-grow flex-col justify-between p-4">
            <div className="flex flex-col gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span>{event.date}</span>
                </div>
                {event.time && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-gray-400" />
                        <span>{event.time}</span>
                    </div>
                )}
                {event.location && (
                    <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        <span>{event.location}</span>
                    </div>
                )}
            </div>
            {event.link && (
                <a
                    href={event.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 truncate text-xs font-semibold text-wimbledon-navy hover:underline dark:text-court-accent"
                >
                    Link: {event.link.substring(0, 30)}...
                </a>
            )}
        </div>
    </div>
));

EventOpsCard.displayName = 'EventOpsCard';

export default EventOpsCard;
