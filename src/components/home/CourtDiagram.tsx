import { memo } from 'react';
import { Plus } from 'lucide-react';
import type { Sport } from '../../lib/sports';

export interface CourtSlot {
    name: string;
    email: string;
    tooltip: string;
    isMine: boolean;
}

interface CourtDiagramProps {
    sport: Sport | string;
    courtName: string;
    slots: (CourtSlot | null)[];
    spotsLeft: number;
    disabled: boolean;
    actionLabel: string;
    userInThisCourt: boolean;
    onAction: () => void;
    onJoinSlot: (slotIndex: number) => void;
}

const slotPosition = (index: number, total: number) => {
    const perSide = Math.max(1, Math.ceil(total / 2));
    const left = index < perSide;
    const row = left ? index : index - perSide;
    const x = left ? 22 : 78;
    const y = perSide === 1 ? 50 : 24 + (row * 52) / (perSide - 1);
    return { x, y };
};

const CourtMarkings = ({ sport }: { sport: string }) => {
    const common = {
        stroke: 'currentColor',
        strokeWidth: 1.5,
        fill: 'none' as const,
        vectorEffect: 'non-scaling-stroke' as const,
    };

    if (sport === 'Badminton') {
        return (
            <g opacity={0.85}>
                <rect x={20} y={20} width={160} height={300} {...common} />
                <line x1={32} y1={20} x2={32} y2={320} {...common} opacity={0.7} />
                <line x1={168} y1={20} x2={168} y2={320} {...common} opacity={0.7} />
                <line x1={20} y1={170} x2={180} y2={170} {...common} strokeDasharray="5 4" />
                <line x1={20} y1={140} x2={180} y2={140} {...common} opacity={0.7} />
                <line x1={20} y1={200} x2={180} y2={200} {...common} opacity={0.7} />
                <line x1={100} y1={20} x2={100} y2={140} {...common} opacity={0.7} />
                <line x1={100} y1={200} x2={100} y2={320} {...common} opacity={0.7} />
            </g>
        );
    }

    if (sport === 'Squash') {
        return (
            <g opacity={0.85}>
                <rect x={20} y={20} width={160} height={300} {...common} />
                <line x1={20} y1={28} x2={180} y2={28} {...common} strokeWidth={3} />
                <line x1={20} y1={196} x2={180} y2={196} {...common} />
                <line x1={100} y1={196} x2={100} y2={320} {...common} />
                <rect x={20} y={196} width={42} height={42} {...common} opacity={0.8} />
                <rect x={138} y={196} width={42} height={42} {...common} opacity={0.8} />
            </g>
        );
    }

    if (sport === 'Pickleball') {
        return (
            <g opacity={0.85}>
                <rect x={20} y={20} width={160} height={300} {...common} />
                <line x1={20} y1={110} x2={180} y2={110} {...common} opacity={0.8} />
                <line x1={20} y1={230} x2={180} y2={230} {...common} opacity={0.8} />
                <line x1={100} y1={20} x2={100} y2={320} {...common} strokeDasharray="4 4" />
                <rect x={20} y={110} width={160} height={120} {...common} opacity={0.5} strokeDasharray="3 3" />
            </g>
        );
    }

    if (sport === 'Table Tennis') {
        return (
            <g opacity={0.85}>
                <rect x={30} y={40} width={140} height={260} rx={4} {...common} />
                <line x1={100} y1={40} x2={100} y2={300} {...common} />
                <line x1={30} y1={170} x2={170} y2={170} {...common} strokeDasharray="4 4" opacity={0.6} />
            </g>
        );
    }

    // Tennis default
    return (
        <g opacity={0.85}>
            <rect x={20} y={20} width={160} height={300} {...common} />
            <line x1={40} y1={20} x2={40} y2={320} {...common} opacity={0.7} />
            <line x1={160} y1={20} x2={160} y2={320} {...common} opacity={0.7} />
            <line x1={40} y1={96} x2={160} y2={96} {...common} opacity={0.8} />
            <line x1={40} y1={244} x2={160} y2={244} {...common} opacity={0.8} />
            <line x1={100} y1={96} x2={100} y2={244} {...common} opacity={0.8} />
            <line x1={20} y1={170} x2={180} y2={170} {...common} strokeDasharray="4 4" />
        </g>
    );
};

const displayInitials = (name: string, email: string): string => {
    const trimmed = name.trim();
    if (trimmed) {
        const parts = trimmed.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return trimmed.slice(0, 2).toUpperCase();
    }
    const local = email.split('@')[0]?.trim() ?? '';
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    return local.slice(0, 1).toUpperCase() || '?';
};

const CourtDiagram = ({
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

    const actionButtonClass = `rounded-lg px-4 py-3 text-sm font-semibold transition-colors ${
        userInThisCourt
            ? 'border border-red-400/40 bg-red-500/10 text-red-600 hover:bg-red-500/15 dark:text-red-300'
            : disabled
              ? 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400 dark:border-chalk/10 dark:bg-carbon dark:text-chalk/30'
              : 'accent-bg text-court-950 hover:brightness-110'
    }`;

    const courtSurface = (
        <div className="court-surface relative h-[11.2rem] w-[14rem] shrink-0 overflow-hidden rounded-md bg-emerald-100/60 dark:bg-court-800/50">
            <svg
                viewBox="0 0 200 340"
                className="absolute inset-0 h-full w-full text-emerald-800/45 dark:text-court-line/70"
                aria-hidden
            >
                <CourtMarkings sport={sport} />
            </svg>

            {slots.map((slot, index) => {
                const { x, y } = slotPosition(index, slots.length);
                const style = { left: `${x}%`, top: `${y}%` };

                if (!slot) {
                    return (
                        <button
                            key={index}
                            type="button"
                            disabled={disabled}
                            onClick={() => onJoinSlot(index)}
                            style={style}
                            className="player-slot--open absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs disabled:cursor-not-allowed disabled:opacity-40"
                            title={`Join spot ${index + 1}`}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    );
                }

                return (
                    <div
                        key={index}
                        style={style}
                        title={slot.tooltip}
                        className={`absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-semibold ${
                            slot.isMine ? 'player-slot--mine' : 'player-slot--filled'
                        }`}
                    >
                        {displayInitials(slot.name, slot.email)}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="w-full shrink-0 rounded-lg border border-gray-200 bg-gray-50/80 p-4 dark:border-chalk/10 dark:bg-court-900/60 md:w-auto">
            <div className="mb-4 flex items-start justify-between gap-3 md:hidden">
                <div>
                    <p className="hud-label text-gray-400 dark:text-chalk/45">{sport}</p>
                    <h4 className="font-display text-lg leading-tight text-gray-900 dark:text-chalk">{courtName}</h4>
                </div>
                <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-900 dark:accent-text">
                        {filled}/{slots.length}
                    </p>
                    <p className="hud-label text-gray-400 dark:text-chalk/40">{spotsLeft} open</p>
                </div>
            </div>

            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-5">
                {courtSurface}

                <div className="flex w-full min-w-0 flex-col gap-4 md:w-auto md:min-w-[10rem] md:max-w-[12rem]">
                    <div className="hidden md:flex md:flex-col md:gap-1">
                        <p className="hud-label text-gray-400 dark:text-chalk/45">{sport}</p>
                        <h4 className="font-display text-lg leading-tight text-gray-900 dark:text-chalk">{courtName}</h4>
                        <p className="text-sm font-semibold text-emerald-900 dark:accent-text">
                            {filled}/{slots.length} · {spotsLeft} open
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onAction}
                        disabled={disabled}
                        className={`w-full ${actionButtonClass}`}
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default memo(CourtDiagram);
