import { memo } from 'react';
import { AlertTriangle, MessageSquare, Sparkles, Trash2 } from 'lucide-react';
import type { FeedbackItem } from '../types';

export interface FeedbackInboxItemProps {
    item: FeedbackItem;
    onDelete: (id: string) => void;
}

const FeedbackInboxItem = memo(({ item, onDelete }: FeedbackInboxItemProps) => {
    const dateLabel = item.createdAt?.seconds
        ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : 'Recent';

    return (
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-150 bg-gray-50/20 p-4 transition-all hover:border-gray-250 dark:border-gray-850 dark:bg-court-950/40 dark:hover:border-gray-750 md:flex-row">
            <div className="flex-grow space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    {item.type === 'bug' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-405">
                            <AlertTriangle className="h-3 w-3" />
                            Bug
                        </span>
                    ) : item.type === 'improvement' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-305">
                            <Sparkles className="h-3 w-3" />
                            Suggestion
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
                            <MessageSquare className="h-3 w-3" />
                            Other
                        </span>
                    )}
                    <span className="text-xs font-medium text-gray-400">{dateLabel}</span>
                    <span className="text-xs text-gray-350 dark:text-gray-700">•</span>
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{item.email}</span>
                </div>
                <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    {item.message}
                </p>
            </div>
            <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="flex-shrink-0 self-end rounded-xl border border-transparent p-2 text-gray-400 transition-all hover:border-red-105 hover:bg-red-50 hover:text-red-500 dark:text-gray-550 dark:hover:bg-red-950/20 dark:hover:text-red-400 md:self-start"
                title="Dismiss feedback"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
});

FeedbackInboxItem.displayName = 'FeedbackInboxItem';

export default FeedbackInboxItem;
