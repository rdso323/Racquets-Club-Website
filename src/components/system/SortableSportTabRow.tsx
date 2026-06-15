import { memo, useCallback, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import type { TabPreference } from '../../contexts/AuthContext';
import { GripVertical } from 'lucide-react';

const LAYOUT_TRANSITION = { type: 'spring' as const, stiffness: 900, damping: 50, mass: 0.4 };
const DRAG_TRANSITION = { power: 0.05, timeConstant: 60 };

interface SortableSportTabRowProps {
    tab: TabPreference;
    onToggleVisibility: () => void;
}

const SortableSportTabRow = memo(({ tab, onToggleVisibility }: SortableSportTabRowProps) => {
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
            className={`flex list-none select-none items-center gap-2 border px-3 py-2.5 transition-shadow duration-100 ${
                isDragging
                    ? 'z-50 border-wimbledon-navy/30 bg-white shadow-md dark:border-court-accent/40 dark:bg-carbon'
                    : tab.visible
                      ? 'border-emerald-500/30 bg-emerald-500/5 dark:border-court-accent/30 dark:bg-court-accent/5'
                      : 'border-gray-200 opacity-70 dark:border-chalk/10'
            }`}
            style={{ touchAction: 'none' }}
            transition={LAYOUT_TRANSITION}
        >
            <button
                type="button"
                tabIndex={-1}
                onPointerDown={handleGripPointerDown}
                className="cursor-grab touch-none rounded p-1 text-gray-400 outline-none hover:text-gray-700 active:cursor-grabbing dark:text-chalk/35 dark:hover:text-chalk/70"
                title="Drag to reorder"
                aria-label={`Drag to reorder ${tab.id}`}
            >
                <GripVertical className="pointer-events-none h-4 w-4" />
            </button>
            <button
                type="button"
                onClick={onToggleVisibility}
                data-cursor
                className="flex min-w-0 flex-1 items-center justify-between text-left"
            >
                <span
                    className={`truncate text-sm font-medium ${
                        tab.visible
                            ? 'text-gray-900 dark:text-chalk'
                            : 'text-gray-400 line-through dark:text-chalk/40'
                    }`}
                >
                    {tab.id}
                </span>
                <span className="hud-label ml-3 shrink-0 text-[9px]">
                    {tab.visible ? 'Visible' : 'Hidden'}
                </span>
            </button>
        </Reorder.Item>
    );
});

SortableSportTabRow.displayName = 'SortableSportTabRow';

export default SortableSportTabRow;
