import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import AdminModalShell from '../AdminModalShell';
import { parseAttendee } from '../../../lib/sessions';

export interface CapacityReductionPrompt {
    sessionTitle: string;
    newCap: number;
    attendees: string[];
    requiredRemovals: number;
}

interface CapacityReductionModalProps {
    prompt: CapacityReductionPrompt;
    onConfirm: (attendeesToRemove: string[]) => void;
    onCancel: () => void;
}

const CapacityReductionModal = ({ prompt, onConfirm, onCancel }: CapacityReductionModalProps) => {
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        setSelected(new Set());
    }, [prompt]);

    const toggle = (raw: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(raw)) next.delete(raw);
            else next.add(raw);
            return next;
        });
    };

    const canConfirm = selected.size >= prompt.requiredRemovals;

    return (
        <AdminModalShell
            title="Reduce capacity?"
            onClose={onCancel}
            onSubmit={(e) => {
                e.preventDefault();
                if (!canConfirm) return;
                onConfirm([...selected]);
            }}
            submitLabel={`Remove ${selected.size} & save`}
        >
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900/40 dark:bg-amber-950/25">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                            More players are enrolled than the new capacity allows
                        </p>
                        <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/80">
                            <span className="font-medium">{prompt.sessionTitle}</span> would drop to{' '}
                            <span className="font-medium">{prompt.newCap}</span> spots, but{' '}
                            <span className="font-medium">{prompt.attendees.length}</span> people are already
                            on the roster. Select at least{' '}
                            <span className="font-medium">{prompt.requiredRemovals}</span> to remove, or cancel
                            to keep the current roster unchanged.
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {prompt.attendees.map((entry) => {
                    const { name, court } = parseAttendee(entry);
                    const isSelected = selected.has(entry);
                    return (
                        <label
                            key={entry}
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                isSelected
                                    ? 'border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20'
                                    : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-court-950/40'
                            }`}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggle(entry)}
                                className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-900 dark:text-chalk">{name}</p>
                                {court ? (
                                    <p className="text-xs text-gray-500 dark:text-chalk/50">{court}</p>
                                ) : null}
                            </div>
                        </label>
                    );
                })}
            </div>

            {!canConfirm && (
                <p className="text-xs text-gray-500 dark:text-chalk/50">
                    Select {prompt.requiredRemovals - selected.size} more to continue, or cancel to abort this
                    save.
                </p>
            )}
        </AdminModalShell>
    );
};

export default CapacityReductionModal;
