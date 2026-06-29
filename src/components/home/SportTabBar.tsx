import { useCallback, useState, type CSSProperties } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Check, Eye, EyeOff, GripVertical, SlidersHorizontal } from 'lucide-react';
import { getSportTheme, type Sport } from '../../lib/sports';
import type { TabPreference } from '../../contexts/AuthContext';

const DRAG_TRANSITION = { power: 0.05, timeConstant: 60 };
const LAYOUT_TRANSITION = { type: 'spring' as const, stiffness: 900, damping: 50, mass: 0.4 };

interface SportTabBarProps {
    tabPreferences: TabPreference[];
    activeSport: Sport;
    onSelectSport: (sport: Sport) => void;
    onUpdatePreferences: (next: TabPreference[]) => void;
}

interface EditablePillProps {
    tab: TabPreference;
    canHide: boolean;
    onToggle: () => void;
}

const EditablePill = ({ tab, canHide, onToggle }: EditablePillProps) => {
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);

    const handleGripPointerDown = useCallback(
        (e: React.PointerEvent<HTMLButtonElement>) => {
            e.preventDefault();
            e.stopPropagation();
            dragControls.start(e);
        },
        [dragControls],
    );

    return (
        <Reorder.Item
            value={tab}
            dragListener={false}
            dragControls={dragControls}
            dragTransition={DRAG_TRANSITION}
            transition={LAYOUT_TRANSITION}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            style={{ touchAction: 'none' }}
            className={`flex shrink-0 list-none select-none touch-manipulation items-center gap-1.5 rounded-full border py-2 pl-1.5 pr-3 transition-shadow duration-100 sm:pl-2 ${
                isDragging
                    ? 'z-50 border-wimbledon-navy/30 bg-white shadow-md dark:border-court-accent/40 dark:bg-carbon'
                    : tab.visible
                      ? 'border-emerald-500/35 bg-emerald-500/8 dark:border-court-accent/35 dark:bg-court-accent/8'
                      : 'border-gray-200 bg-white/60 opacity-70 dark:border-chalk/10 dark:bg-carbon/40'
            }`}
        >
            <button
                type="button"
                tabIndex={-1}
                onPointerDown={handleGripPointerDown}
                className="flex min-h-11 min-w-10 cursor-grab touch-none items-center justify-center rounded text-gray-400 outline-none hover:text-gray-700 active:cursor-grabbing dark:text-chalk/35 dark:hover:text-chalk/70"
                title="Drag to reorder"
                aria-label={`Drag to reorder ${tab.id}`}
            >
                <GripVertical className="pointer-events-none h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={onToggle}
                disabled={tab.visible && !canHide}
                data-cursor
                className={`flex min-h-11 touch-manipulation items-center gap-1.5 px-1 text-sm font-semibold disabled:cursor-not-allowed sm:px-0 ${
                    tab.visible
                        ? 'text-gray-900 dark:text-chalk'
                        : 'text-gray-400 line-through dark:text-chalk/40'
                }`}
                title={
                    tab.visible
                        ? canHide
                            ? `Hide ${tab.id}`
                            : 'Keep at least one sport visible'
                        : `Show ${tab.id}`
                }
                aria-pressed={tab.visible}
            >
                {tab.id}
                {tab.visible ? (
                    <Eye className="h-3.5 w-3.5 text-emerald-600 dark:text-court-accent" />
                ) : (
                    <EyeOff className="h-3.5 w-3.5 text-gray-400 dark:text-chalk/40" />
                )}
            </button>
        </Reorder.Item>
    );
};

const SportTabBar = ({
    tabPreferences,
    activeSport,
    onSelectSport,
    onUpdatePreferences,
}: SportTabBarProps) => {
    const [editing, setEditing] = useState(false);
    const [localTabs, setLocalTabs] = useState<TabPreference[]>(tabPreferences);

    const visibleCount = localTabs.filter((t) => t.visible).length;

    const startEditing = () => {
        setLocalTabs(tabPreferences);
        setEditing(true);
    };

    const finishEditing = () => {
        if (localTabs.some((t) => t.visible)) {
            onUpdatePreferences(localTabs);
        }
        setEditing(false);
    };

    const toggleVisibility = (id: string) => {
        setLocalTabs((prev) => {
            const target = prev.find((t) => t.id === id);
            // Never allow hiding the final visible sport.
            if (target?.visible && prev.filter((t) => t.visible).length <= 1) return prev;
            return prev.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t));
        });
    };

    if (editing) {
        return (
            <div className="mb-8 flex flex-col gap-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="hud-label max-w-[16rem] text-[11px] leading-relaxed text-gray-400 dark:text-chalk/40 sm:max-w-none">
                        Drag to reorder · tap a sport to show or hide
                    </p>
                    <button
                        type="button"
                        onClick={finishEditing}
                        data-cursor
                        className="flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-full bg-wimbledon-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#00287a] sm:w-auto sm:px-4 sm:py-1.5 sm:text-xs dark:bg-court-accent dark:text-court-950 dark:hover:bg-emerald-300"
                    >
                        <Check className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                        Done
                    </button>
                </div>
                <div className="-mx-4 overflow-x-auto px-4 pb-2 scrollbar-hide touch-pan-x sm:-mx-5 sm:px-5">
                    <Reorder.Group
                        axis="x"
                        values={localTabs}
                        onReorder={setLocalTabs}
                        className="flex gap-2"
                    >
                        {localTabs.map((tab) => (
                            <EditablePill
                                key={tab.id}
                                tab={tab}
                                canHide={visibleCount > 1}
                                onToggle={() => toggleVisibility(tab.id)}
                            />
                        ))}
                    </Reorder.Group>
                </div>
            </div>
        );
    }

    const visibleTabs = tabPreferences.filter((t) => t.visible).map((t) => t.id);

    return (
        <div className="mb-8 flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="min-w-0 flex-1 overflow-x-auto pb-2 scrollbar-hide touch-pan-x">
                <div className="flex w-max gap-2 rounded-full border border-chalk/10 bg-gray-100/80 p-1.5 dark:bg-carbon/80">
                    {visibleTabs.map((sport) => {
                        const t = getSportTheme(sport);
                        const active = activeSport === sport;
                        return (
                            <button
                                key={sport}
                                onClick={() => onSelectSport(sport as Sport)}
                                data-cursor="hover"
                                className={`flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 whitespace-nowrap sm:gap-2.5 sm:px-5 ${
                                    active
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-court-800 dark:text-chalk accent-glow'
                                        : 'text-gray-500 hover:text-gray-800 dark:text-chalk/50 dark:hover:text-chalk'
                                }`}
                                style={
                                    active
                                        ? ({ '--accent': t.accent, '--accent-light': t.accentLight } as CSSProperties)
                                        : undefined
                                }
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${active ? 'animate-blink accent-bg' : 'bg-gray-400 dark:bg-chalk/30'}`}
                                />
                                {sport}
                            </button>
                        );
                    })}
                </div>
            </div>
            <button
                type="button"
                onClick={startEditing}
                data-cursor
                aria-label="Customize sports"
                title="Customize sports"
                className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-full border border-gray-200 bg-white/70 text-gray-500 transition-colors hover:border-court-accent/40 hover:text-court-accent dark:border-chalk/10 dark:bg-carbon/70 dark:text-chalk/50 dark:hover:text-court-accent"
            >
                <SlidersHorizontal className="h-4 w-4" />
            </button>
        </div>
    );
};

export default SportTabBar;
