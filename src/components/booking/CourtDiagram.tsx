import { motion } from 'framer-motion';

/*
 * Top-down vector court, drawn per discipline with regulation-ish markings.
 * Player slots render as glowing nodes pinned to the court quadrants.
 */

export interface SlotNode {
    name: string | null;   // null = open slot
    isYou: boolean;
}

interface CourtDiagramProps {
    sport: string;
    courtName: string;
    slots: SlotNode[];     // length = maxPerCourt
    selected: boolean;
    dimmed: boolean;
    locked: boolean;
    redact: boolean;       // guests see scrambled names
    onSelect: () => void;
}

const SLOT_POS = [
    { x: 0.3, y: 0.3 },
    { x: 0.7, y: 0.3 },
    { x: 0.3, y: 0.7 },
    { x: 0.7, y: 0.7 },
];

/** discipline-specific line work, normalized to a 200x340 viewBox */
const CourtMarkings = ({ sport }: { sport: string }) => {
    const stroke = 'var(--accent)';
    const common = { stroke, strokeWidth: 1.5, fill: 'none' as const, vectorEffect: 'non-scaling-stroke' as const };

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
                <line x1={20} y1={36} x2={180} y2={36} {...common} opacity={0.5} />
                <line x1={20} y1={304} x2={180} y2={304} {...common} opacity={0.5} />
            </g>
        );
    }

    if (sport === 'Squash') {
        return (
            <g opacity={0.85}>
                <rect x={20} y={20} width={160} height={300} {...common} />
                {/* front wall + short line + T */}
                <line x1={20} y1={28} x2={180} y2={28} {...common} strokeWidth={3} />
                <line x1={20} y1={196} x2={180} y2={196} {...common} />
                <line x1={100} y1={196} x2={100} y2={320} {...common} />
                {/* service boxes */}
                <rect x={20} y={196} width={42} height={42} {...common} opacity={0.8} />
                <rect x={138} y={196} width={42} height={42} {...common} opacity={0.8} />
            </g>
        );
    }

    // Tennis (default)
    return (
        <g opacity={0.85}>
            <rect x={20} y={20} width={160} height={300} {...common} />
            <line x1={40} y1={20} x2={40} y2={320} {...common} opacity={0.7} />
            <line x1={160} y1={20} x2={160} y2={320} {...common} opacity={0.7} />
            <line x1={40} y1={96} x2={160} y2={96} {...common} opacity={0.8} />
            <line x1={40} y1={244} x2={160} y2={244} {...common} opacity={0.8} />
            <line x1={100} y1={96} x2={100} y2={244} {...common} opacity={0.8} />
            <line x1={20} y1={170} x2={180} y2={170} {...common} strokeDasharray="4 4" />
            <line x1={100} y1={20} x2={100} y2={27} {...common} />
            <line x1={100} y1={313} x2={100} y2={320} {...common} />
        </g>
    );
};

const scramble = (name: string) => '█'.repeat(Math.max(4, Math.min(9, name.length)));

const CourtDiagram = ({
    sport,
    courtName,
    slots,
    selected,
    dimmed,
    locked,
    redact,
    onSelect,
}: CourtDiagramProps) => {
    const filled = slots.filter((s) => s.name).length;

    return (
        <motion.button
            type="button"
            onClick={onSelect}
            data-cursor="hover"
            data-cursor-label={selected ? 'TARGET LOCKED' : 'SELECT COURT'}
            className="group relative block w-full text-left focus:outline-none"
            initial={false}
            animate={{ opacity: dimmed ? 0.55 : 1, scale: selected ? 1 : 0.97 }}
            whileHover={{ scale: selected ? 1 : 0.99 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* header strip */}
            <div className="mb-2 flex items-center justify-between">
                <span className={`hud-label ${selected ? 'accent-text' : 'text-chalk/50'}`}>
                    {courtName.toUpperCase()}
                </span>
                <span className="hud-label text-chalk/40 tabular-nums">
                    {filled}/{slots.length}
                </span>
            </div>

            <div
                className={`relative overflow-hidden border transition-colors duration-500 ${selected ? 'accent-border bg-carbon' : 'border-chalk/10 bg-carbon/40 group-hover:border-chalk/30'}`}
            >
                {/* radar sweep on the selected court */}
                {selected && !locked && (
                    <div className="scanline absolute inset-y-0 w-1/2 animate-sweep" />
                )}

                <svg viewBox="0 0 200 340" className={`block w-full ${selected ? 'accent-glow' : ''}`}>
                    <CourtMarkings sport={sport} />

                    {SLOT_POS.slice(0, slots.length).map((pos, i) => {
                        const slot = slots[i];
                        const cx = pos.x * 200;
                        const cy = pos.y * 340;
                        const occupied = !!slot?.name;
                        return (
                            <g key={i}>
                                {occupied ? (
                                    <>
                                        <circle cx={cx} cy={cy} r={11} fill="var(--accent)" opacity={0.14}>
                                            <animate attributeName="r" values="11;17;11" dur="2.4s" repeatCount="indefinite" />
                                        </circle>
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={5.5}
                                            fill={slot.isYou ? 'var(--accent)' : 'transparent'}
                                            stroke="var(--accent)"
                                            strokeWidth={1.5}
                                        />
                                        <text
                                            x={cx}
                                            y={cy + 21}
                                            textAnchor="middle"
                                            className="font-mono"
                                            fill={slot.isYou ? 'var(--accent)' : 'rgba(237,242,228,0.78)'}
                                            fontSize={9.5}
                                            letterSpacing={0.5}
                                        >
                                            {redact ? scramble(slot.name!) : (slot.isYou ? 'YOU' : slot.name)}
                                        </text>
                                    </>
                                ) : (
                                    <>
                                        <circle
                                            cx={cx}
                                            cy={cy}
                                            r={5.5}
                                            fill="none"
                                            stroke="rgba(237,242,228,0.35)"
                                            strokeWidth={1.2}
                                            strokeDasharray="2.5 2.5"
                                        >
                                            <animateTransform
                                                attributeName="transform"
                                                type="rotate"
                                                from={`0 ${cx} ${cy}`}
                                                to={`360 ${cx} ${cy}`}
                                                dur="9s"
                                                repeatCount="indefinite"
                                            />
                                        </circle>
                                        <text
                                            x={cx}
                                            y={cy + 21}
                                            textAnchor="middle"
                                            fill="rgba(237,242,228,0.3)"
                                            fontSize={9}
                                            className="font-mono"
                                            letterSpacing={1}
                                        >
                                            OPEN
                                        </text>
                                    </>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-court/35">
                        <span className="hud-label border border-chalk/30 bg-court/80 px-3 py-1.5 text-chalk/80">▦ LOCKED</span>
                    </div>
                )}
            </div>
        </motion.button>
    );
};

export default CourtDiagram;
