import { memo, useCallback, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import type { TabPreference } from '../../contexts/AuthContext';
import { GripVertical } from 'lucide-react';

const LAYOUT_TRANSITION = { type: 'spring' as const, stiffness: 900, damping: 50, mass: 0.4 };
const DRAG_TRANSITION = { power: 0.05, timeConstant: 60 };

interface SportChipRowProps {
    tab: TabPreference;
    onToggleVisibility: () => void;
}

const SportChipRow = memo(({ tab, onToggleVisibility }: SportChipRowProps) => {
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
            layout="position"
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            className={`flex min-h-12 list-none select-none touch-manipulation items-center gap-2.5 rounded-lg border px-3 py-2.5 transition-shadow duration-100 ${
                isDragging
                    ? 'z-50 border-wimbledon-navy/30 bg-white shadow-md dark:border-court-accent/40 dark:bg-carbon'
                    : tab.visible
                      ? 'border-emerald-500/35 bg-emerald-500/8 dark:border-court-accent/35 dark:bg-court-accent/8'
                      : 'border-gray-200/90 opacity-75 dark:border-chalk/10'
            }`}
            style={{ touchAction: 'none' }}
            transition={LAYOUT_TRANSITION}
        >
            <button
                type="button"
                tabIndex={-1}
                onPointerDown={handleGripPointerDown}
                className="flex min-h-10 min-w-10 cursor-grab touch-none items-center justify-center rounded text-gray-400 outline-none hover:text-gray-700 active:cursor-grabbing dark:text-chalk/35 dark:hover:text-chalk/70"
                title="Drag to reorder"
                aria-label={`Drag to reorder ${tab.id}`}
            >
                <GripVertical className="pointer-events-none h-5 w-5" />
            </button>
            <button
                type="button"
                onClick={onToggleVisibility}
                data-cursor
                className="flex min-h-10 min-w-0 flex-1 touch-manipulation items-center justify-between gap-2 text-left"
            >
                <span
                    className={`truncate text-sm font-semibold sm:text-base ${
                        tab.visible
                            ? 'text-gray-900 dark:text-chalk'
                            : 'text-gray-400 line-through dark:text-chalk/40'
                    }`}
                >
                    {tab.id}
                </span>
                <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                        tab.visible ? 'bg-emerald-500 dark:bg-court-accent' : 'bg-gray-300 dark:bg-chalk/20'
                    }`}
                    aria-hidden
                />
            </button>
        </Reorder.Item>
    );
});

SportChipRow.displayName = 'SportChipRow';

interface SportPreferenceChipsProps {
    tabs: TabPreference[];
    onReorder: (next: TabPreference[]) => void;
    onToggleVisibility: (id: string) => void;
}

const SportPreferenceChips = ({ tabs, onReorder, onToggleVisibility }: SportPreferenceChipsProps) => (
    <Reorder.Group
        axis="y"
        values={tabs}
        onReorder={onReorder}
        className="flex flex-col gap-2"
    >
        {tabs.map((tab) => (
            <SportChipRow
                key={tab.id}
                tab={tab}
                onToggleVisibility={() => onToggleVisibility(tab.id)}
            />
        ))}
    </Reorder.Group>
);

export default SportPreferenceChips;
