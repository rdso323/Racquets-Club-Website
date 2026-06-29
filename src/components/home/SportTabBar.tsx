import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { AnimatePresence, Reorder, motion, useDragControls } from 'framer-motion';
import { Check, Eye, EyeOff, GripVertical, SlidersHorizontal } from 'lucide-react';
import { getSportTheme, type Sport } from '../../lib/sports';
import type { TabPreference } from '../../contexts/AuthContext';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';

const EASE = [0.16, 1, 0.3, 1] as const;
const SHELL_SPRING = { type: 'spring' as const, stiffness: 520, damping: 38, mass: 0.85 };
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
    index: number;
    animateIn: boolean;
}

const EditablePill = ({ tab, canHide, onToggle, index, animateIn }: EditablePillProps) => {
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
            className={`flex shrink-0 list-none select-none touch-manipulation items-center gap-1 rounded-full border py-1.5 pl-1 pr-2.5 transition-shadow duration-100 sm:pr-3 ${
                isDragging
                    ? 'z-50 border-wimbledon-navy/30 bg-white shadow-md dark:border-court-accent/40 dark:bg-carbon'
                    : tab.visible
                      ? 'border-emerald-500/35 bg-emerald-500/8 dark:border-court-accent/35 dark:bg-court-accent/8'
                      : 'border-gray-200 bg-white/60 opacity-70 dark:border-chalk/10 dark:bg-carbon/40'
            }`}
        >
            <motion.button
                type="button"
                tabIndex={-1}
                onPointerDown={handleGripPointerDown}
                initial={animateIn ? { opacity: 0, scale: 0.6 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.04, duration: 0.25, ease: EASE }}
                className="flex min-h-10 min-w-8 cursor-grab touch-none items-center justify-center rounded-full text-gray-400 outline-none hover:text-gray-700 active:cursor-grabbing dark:text-chalk/35 dark:hover:text-chalk/70"
                title="Drag to reorder"
                aria-label={`Drag to reorder ${tab.id}`}
            >
                <GripVertical className="pointer-events-none h-3.5 w-3.5" />
            </motion.button>
            <button
                type="button"
                onClick={onToggle}
                disabled={tab.visible && !canHide}
                data-cursor
                className={`flex min-h-10 touch-manipulation items-center gap-1.5 px-1 text-sm font-semibold disabled:cursor-not-allowed ${
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
    const prefersReducedMotion = usePrefersReducedMotion();
    const [editing, setEditing] = useState(false);
    const [localTabs, setLocalTabs] = useState<TabPreference[]>(tabPreferences);

    const visibleCount = localTabs.filter((t) => t.visible).length;
    const visibleTabs = tabPreferences.filter((t) => t.visible).map((t) => t.id);
    const animateIn = !prefersReducedMotion;

    useEffect(() => {
        if (!editing) setLocalTabs(tabPreferences);
    }, [tabPreferences, editing]);

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

    const toggleAction = () => {
        if (editing) finishEditing();
        else startEditing();
    };

    const toggleVisibility = (id: string) => {
        setLocalTabs((prev) => {
            const target = prev.find((t) => t.id === id);
            if (target?.visible && prev.filter((t) => t.visible).length <= 1) return prev;
            return prev.map((t) => (t.id === id ? { ...t, visible: !t.visible } : t));
        });
    };

    return (
        <div className="mb-8">
            <AnimatePresence initial={false}>
                {editing && (
                    <motion.p
                        key="sport-edit-hint"
                        initial={animateIn ? { opacity: 0, y: -6, height: 0 } : false}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={animateIn ? { opacity: 0, y: -4, height: 0 } : { opacity: 0, height: 0 }}
                        transition={{ duration: 0.28, ease: EASE }}
                        className="hud-label mb-2 overflow-hidden text-[11px] leading-relaxed text-gray-400 dark:text-chalk/40"
                    >
                        Drag to reorder · tap a sport to show or hide
                    </motion.p>
                )}
            </AnimatePresence>

            <div className="overflow-x-auto pb-2 scrollbar-hide touch-pan-x">
                <div className="flex w-max items-center gap-2">
                    <motion.div
                        layout
                        transition={prefersReducedMotion ? { duration: 0 } : SHELL_SPRING}
                        className={`flex min-h-[3.25rem] items-center gap-1.5 rounded-full border p-1.5 transition-[box-shadow] duration-300 sm:gap-2 ${
                            editing
                                ? 'border-court-accent/35 bg-emerald-50/60 shadow-sm shadow-court-accent/10 dark:border-court-accent/30 dark:bg-court-accent/8'
                                : 'border-chalk/10 bg-gray-100/80 dark:bg-carbon/80'
                        }`}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {editing ? (
                                <motion.div
                                    key="edit-pills"
                                    initial={animateIn ? { opacity: 0 } : false}
                                    animate={{ opacity: 1 }}
                                    exit={animateIn ? { opacity: 0 } : undefined}
                                    transition={{ duration: 0.2, ease: EASE }}
                                    className="flex items-center"
                                >
                                    <Reorder.Group
                                        axis="x"
                                        values={localTabs}
                                        onReorder={setLocalTabs}
                                        className="flex items-center gap-1.5 sm:gap-2"
                                    >
                                        {localTabs.map((tab, index) => (
                                            <EditablePill
                                                key={tab.id}
                                                tab={tab}
                                                canHide={visibleCount > 1}
                                                onToggle={() => toggleVisibility(tab.id)}
                                                index={index}
                                                animateIn={animateIn}
                                            />
                                        ))}
                                    </Reorder.Group>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="browse-pills"
                                    initial={animateIn ? { opacity: 0 } : false}
                                    animate={{ opacity: 1 }}
                                    exit={animateIn ? { opacity: 0 } : undefined}
                                    transition={{ duration: 0.2, ease: EASE }}
                                    className="flex items-center gap-1.5 sm:gap-2"
                                >
                                    {visibleTabs.map((sport) => {
                                        const t = getSportTheme(sport);
                                        const active = activeSport === sport;
                                        return (
                                            <motion.button
                                                key={sport}
                                                layout
                                                onClick={() => onSelectSport(sport as Sport)}
                                                data-cursor="hover"
                                                transition={prefersReducedMotion ? { duration: 0 } : SHELL_SPRING}
                                                className={`flex min-h-11 touch-manipulation items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors duration-300 sm:gap-2.5 sm:px-5 ${
                                                    active
                                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-court-800 dark:text-chalk accent-glow'
                                                        : 'text-gray-500 hover:text-gray-800 dark:text-chalk/50 dark:hover:text-chalk'
                                                }`}
                                                style={
                                                    active
                                                        ? ({
                                                              '--accent': t.accent,
                                                              '--accent-light': t.accentLight,
                                                          } as CSSProperties)
                                                        : undefined
                                                }
                                            >
                                                <span
                                                    className={`h-2 w-2 rounded-full ${active ? 'animate-blink accent-bg' : 'bg-gray-400 dark:bg-chalk/30'}`}
                                                />
                                                {sport}
                                            </motion.button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>

                    <motion.button
                        type="button"
                        layout
                        layoutId="sport-tab-action"
                        onClick={toggleAction}
                        data-cursor
                        aria-label={editing ? 'Done customizing sports' : 'Customize sports'}
                        aria-pressed={editing}
                        title={editing ? 'Done' : 'Customize sports'}
                        transition={prefersReducedMotion ? { duration: 0 } : SHELL_SPRING}
                        className={`flex min-h-11 shrink-0 touch-manipulation items-center justify-center rounded-full border transition-colors duration-300 ${
                            editing
                                ? 'gap-1.5 border-wimbledon-navy/20 bg-wimbledon-navy px-4 text-sm font-semibold text-white hover:bg-[#00287a] dark:border-court-accent/30 dark:bg-court-accent dark:text-court-950 dark:hover:bg-emerald-300'
                                : 'min-w-11 border-gray-200 bg-white/70 text-gray-500 hover:border-court-accent/40 hover:text-court-accent dark:border-chalk/10 dark:bg-carbon/70 dark:text-chalk/50 dark:hover:text-court-accent'
                        }`}
                    >
                        <AnimatePresence mode="wait" initial={false}>
                            {editing ? (
                                <motion.span
                                    key="done"
                                    initial={animateIn ? { opacity: 0, y: 6 } : false}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={animateIn ? { opacity: 0, y: -6 } : undefined}
                                    transition={{ duration: 0.18, ease: EASE }}
                                    className="flex items-center gap-1.5"
                                >
                                    <Check className="h-4 w-4" />
                                    Done
                                </motion.span>
                            ) : (
                                <motion.span
                                    key="customize"
                                    initial={animateIn ? { opacity: 0, rotate: -90 } : false}
                                    animate={{ opacity: 1, rotate: 0 }}
                                    exit={animateIn ? { opacity: 0, rotate: 90 } : undefined}
                                    transition={{ duration: 0.22, ease: EASE }}
                                    className="flex items-center justify-center"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.button>
                </div>
            </div>
        </div>
    );
};

export default SportTabBar;
