import { Plus, User } from 'lucide-react';

export interface CourtSlot {
    name: string;
    tooltip: string;
    isMine: boolean;
}

interface CourtSchematicProps {
    courtName: string;
    /** Slots in court order; null = open position. Length === maxPerCourt. */
    slots: (CourtSlot | null)[];
    spotsLeft: number;
    /** Disables every interactive element on this court (locked/past/cancelled/full/mock/logged-out). */
    disabled: boolean;
    /** Exact CTA label from the booking state machine, e.g. "Join Court 2" / "Drop Court 2". */
    actionLabel: string;
    userInThisCourt: boolean;
    /** Invokes the real, unchanged join handler: handleJoin(session, isMock, courtName). */
    onAction: () => void;
}

/* Doubles positions, in % of the playing surface (landscape, net in the middle).
   First half of slots take the left side of the net, second half the right. */
const slotPosition = (index: number, total: number) => {
    const perSide = Math.max(1, Math.ceil(total / 2));
    const left = index < perSide;
    const row = left ? index : index - perSide;
    const x = left ? 17 : 83;
    const y = perSide === 1 ? 50 : 26 + (row * 48) / (perSide - 1);
    return { x, y };
};

/* Chalk lines of a regulation court, drawn as absolutely-positioned divs. */
const CourtLines = () => (
    <div aria-hidden="true" className="absolute inset-0">
        {/* Doubles boundary */}
        <div className="absolute inset-0 border-2 border-court-line/90 rounded-[3px] shadow-[0_0_8px_rgba(244,239,226,0.15)]" />
        {/* Singles sidelines */}
        <div className="court-line absolute left-0 right-0 top-[16%] h-[2px]" />
        <div className="court-line absolute left-0 right-0 bottom-[16%] h-[2px]" />
        {/* Service lines */}
        <div className="court-line absolute top-[16%] bottom-[16%] left-[31%] w-[2px]" />
        <div className="court-line absolute top-[16%] bottom-[16%] right-[31%] w-[2px]" />
        {/* Center service line */}
        <div className="court-line absolute left-[31%] right-[31%] top-1/2 -translate-y-1/2 h-[2px]" />
        {/* Baseline center marks */}
        <div className="court-line absolute left-0 top-1/2 -translate-y-1/2 w-[1.5%] h-[2px]" />
        <div className="court-line absolute right-0 top-1/2 -translate-y-1/2 w-[1.5%] h-[2px]" />
        {/* The net */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-[5%] -bottom-[5%] w-[3px] bg-court-950/80 shadow-[0_0_12px_rgba(0,0,0,0.6)]" />
        <div className="absolute left-1/2 -translate-x-1/2 -top-[5%] w-2 h-2 -translate-y-1/2 rounded-full bg-court-line/90" />
        <div className="absolute left-1/2 -translate-x-1/2 -bottom-[5%] w-2 h-2 translate-y-1/2 rounded-full bg-court-line/90" />
    </div>
);

const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p.charAt(0).toUpperCase())
        .join('');

const CourtSchematic = ({
    courtName,
    slots,
    spotsLeft,
    disabled,
    actionLabel,
    userInThisCourt,
    onAction,
}: CourtSchematicProps) => {
    const renderSlot = (slot: CourtSlot | null, index: number) => {
        const { x, y } = slotPosition(index, slots.length);
        const style = { left: `${x}%`, top: `${y}%` };

        if (!slot) {
            return (
                <button
                    key={index}
                    type="button"
                    style={style}
                    onClick={onAction}
                    disabled={disabled}
                    aria-label={`Open spot on ${courtName}${disabled ? ' (unavailable)' : ' — tap to join'}`}
                    title={disabled ? `${courtName} — unavailable` : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left — join ${courtName}`}
                    className={`player-slot player-slot--open w-10 h-10 md:w-11 md:h-11 z-10 ${disabled ? 'player-slot--inert' : 'animate-glow-pulse cursor-pointer'}`}
                >
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
            );
        }

        const circle = (
            <>
                <span className="text-[11px] font-bold leading-none">{initialsOf(slot.name) || <User className="w-4 h-4" />}</span>
                <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-court-line/90 whitespace-nowrap max-w-[5.5rem] truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                    {slot.name}
                </span>
            </>
        );

        if (slot.isMine) {
            return (
                <button
                    key={index}
                    type="button"
                    style={style}
                    onClick={onAction}
                    disabled={disabled}
                    aria-label={`Your spot on ${courtName} — tap to drop`}
                    title={`${slot.tooltip} (you) — tap to drop`}
                    className={`player-slot player-slot--filled player-slot--mine w-10 h-10 md:w-11 md:h-11 z-10 ${disabled ? 'player-slot--inert' : 'cursor-pointer hover:brightness-110'}`}
                >
                    {circle}
                </button>
            );
        }

        return (
            <div
                key={index}
                style={style}
                title={slot.tooltip}
                className="player-slot player-slot--filled w-10 h-10 md:w-11 md:h-11 z-10"
            >
                {circle}
            </div>
        );
    };

    return (
        <div className="group/court">
            {/* Court header */}
            <div className="flex items-center justify-between mb-2.5 px-0.5">
                <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-[0.25em] text-gray-700 dark:text-court-line/80">{courtName}</span>
                    {userInThisCourt && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-wimbledon-gold border border-wimbledon-gold/50 rounded-full px-2 py-0.5">
                            You're In
                        </span>
                    )}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${spotsLeft === 0 ? 'text-red-400' : 'text-court-accent group-hover/court:text-glow-green'}`}>
                    {spotsLeft === 0 ? 'Court Full' : `${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                </span>
            </div>

            {/* Top-down schematic (sm and up) */}
            <div className="hidden sm:block court-apron rounded-2xl p-4 md:p-5 border border-court-line/10 shadow-lg transition-all duration-300 motion-safe:group-hover/court:-translate-y-0.5 group-hover/court:shadow-[0_18px_50px_-18px_rgba(52,211,153,0.25)]">
                <div className="relative w-full aspect-[2.15/1] court-surface rounded-[4px]">
                    <CourtLines />
                    {slots.map(renderSlot)}
                </div>
            </div>

            {/* Stacked roster (mobile) */}
            <div className="sm:hidden court-apron rounded-2xl p-3 border border-court-line/10 space-y-2">
                {slots.map((slot, i) =>
                    slot ? (
                        <div
                            key={i}
                            title={slot.tooltip}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 border text-sm font-semibold ${slot.isMine
                                ? 'border-wimbledon-gold/60 bg-clay-800/40 text-wimbledon-gold'
                                : 'border-court-line/20 bg-court-950/40 text-court-line'
                                }`}
                        >
                            <span className="w-7 h-7 rounded-full bg-court-line/10 border border-court-line/30 flex items-center justify-center text-[10px] font-bold">
                                {initialsOf(slot.name) || <User className="w-3.5 h-3.5" />}
                            </span>
                            <span className="truncate">{slot.name}</span>
                            {slot.isMine && <span className="ml-auto text-[9px] uppercase tracking-widest">You</span>}
                        </div>
                    ) : (
                        <button
                            key={i}
                            type="button"
                            onClick={onAction}
                            disabled={disabled}
                            aria-label={`Open spot on ${courtName}${disabled ? ' (unavailable)' : ' — tap to join'}`}
                            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 border-2 border-dashed text-sm font-semibold transition-colors ${disabled
                                ? 'border-court-line/15 text-court-line/30 cursor-not-allowed'
                                : 'border-court-line/40 text-court-line/70 hover:border-court-accent hover:text-court-accent'
                                }`}
                        >
                            <span className="w-7 h-7 rounded-full border-2 border-dashed border-current flex items-center justify-center">
                                <Plus className="w-3.5 h-3.5" />
                            </span>
                            Open Spot
                        </button>
                    )
                )}
            </div>

            {/* Primary keyboard-friendly CTA — same handler, same disabled logic */}
            <button
                type="button"
                onClick={onAction}
                disabled={disabled}
                className={`mt-3 w-full py-3 rounded-xl font-bold tracking-wide text-xs md:text-sm transition-all duration-300 flex items-center justify-center shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-court-accent ${disabled
                    ? 'bg-gray-100 dark:bg-court-900/80 text-gray-400 dark:text-court-line/30 cursor-not-allowed border border-gray-200 dark:border-court-line/10'
                    : userInThisCourt
                        ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/35 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:shadow'
                        : 'clay-gradient text-white hover:shadow-[0_14px_34px_-10px_rgba(199,93,61,0.6)] motion-safe:hover:-translate-y-0.5'
                    }`}
            >
                {actionLabel}
            </button>
        </div>
    );
};

export default CourtSchematic;
