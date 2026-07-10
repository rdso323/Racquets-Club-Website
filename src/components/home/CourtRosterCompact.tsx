import { memo } from 'react';
import { Plus } from 'lucide-react';
import type { CourtDiagramProps } from './CourtDiagram';

const CourtRosterCompact = ({
    sport,
    courtName,
    slots,
    spotsLeft,
    disabled,
    actionLabel,
    userInThisCourt,
    onAction,
    onJoinSlot,
}: CourtDiagramProps) => {
    const filled = slots.filter(Boolean).length;

    return (
        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-chalk/10 dark:bg-court-900/60">
            <div className="flex items-center justify-between">
                <div>
                    <p className="hud-label text-gray-400 dark:text-chalk/45">{sport}</p>
                    <h4 className="font-display text-lg text-gray-900 dark:text-chalk">{courtName}</h4>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-900 dark:accent-text">{filled}/{slots.length}</p>
                    <p className="hud-label text-gray-400 dark:text-chalk/40">{spotsLeft} open</p>
                </div>
            </div>

            <ul
                role="list"
                aria-label={`${courtName} roster, ${filled} of ${slots.length} filled`}
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
            >
                {slots.map((slot, index) => {
                    if (!slot) {
                        return (
                            <li key={index}>
                                <button
                                    type="button"
                                    disabled={disabled}
                                    onClick={() => onJoinSlot(index)}
                                    aria-label={`Join spot ${index + 1} on ${courtName}`}
                                    className="player-slot--open flex h-11 w-full min-h-11 touch-manipulation items-center justify-center rounded-lg text-xs disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </li>
                        );
                    }

                    return (
                        <li key={index}>
                            <div
                                title={slot.tooltip}
                                aria-label={`${slot.name}, spot ${index + 1}`}
                                className={`flex h-11 w-full items-center justify-center rounded-lg text-xs font-semibold ${
                                    slot.isMine ? 'player-slot--mine' : 'player-slot--filled'
                                }`}
                            >
                                {slot.initials}
                            </div>
                        </li>
                    );
                })}
            </ul>

            <button
                type="button"
                onClick={onAction}
                disabled={disabled}
                className={`min-h-11 w-full touch-manipulation rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
                    userInThisCourt
                        ? 'border border-red-400/40 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-300'
                        : disabled
                          ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 dark:border-chalk/10 dark:bg-carbon dark:text-chalk/30'
                          : 'accent-bg text-court-950 hover:brightness-110'
                }`}
            >
                {actionLabel}
            </button>
        </div>
    );
};

export default memo(CourtRosterCompact);
