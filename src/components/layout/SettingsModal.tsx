import { memo, useState, useEffect, useCallback } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { useAuth, type TabPreference } from '../../contexts/AuthContext';
import { X, Eye, EyeOff, GripVertical } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface SortableTabRowProps {
    tab: TabPreference;
    onToggleVisibility: () => void;
}

const LAYOUT_TRANSITION = { type: 'spring' as const, stiffness: 900, damping: 50, mass: 0.4 };
const DRAG_TRANSITION = { power: 0.05, timeConstant: 60 };

const SortableTabRow = memo(({ tab, onToggleVisibility }: SortableTabRowProps) => {
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = useCallback(() => setIsDragging(true), []);
    const handleDragEnd = useCallback(() => setIsDragging(false), []);

    const handleGripPointerDown = useCallback(
        (e: React.PointerEvent<HTMLButtonElement>) => {
            e.preventDefault();
            dragControls.start(e);
        },
        [dragControls],
    );

    const handleGripPointerUp = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.blur();
    }, []);

    return (
        <Reorder.Item
            value={tab}
            dragListener={false}
            dragControls={dragControls}
            dragTransition={DRAG_TRANSITION}
            layout="position"
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={`flex items-center justify-between p-3 border rounded-xl select-none list-none transition-shadow duration-100 ${
                isDragging
                    ? 'z-50 shadow-md border-gray-300 bg-white'
                    : tab.visible
                      ? 'bg-white border-gray-200 shadow-sm'
                      : 'bg-gray-50 border-gray-100 opacity-60'
            }`}
            style={{ touchAction: 'none' }}
            transition={LAYOUT_TRANSITION}
        >
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                    type="button"
                    tabIndex={-1}
                    onPointerDown={handleGripPointerDown}
                    onPointerUp={handleGripPointerUp}
                    onPointerCancel={handleGripPointerUp}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-grab active:cursor-grabbing touch-none outline-none focus:outline-none"
                    title="Drag to reorder"
                    aria-label={`Drag to reorder ${tab.id}`}
                >
                    <GripVertical className="w-5 h-5 pointer-events-none" />
                </button>
                <button
                    type="button"
                    onClick={onToggleVisibility}
                    className={`p-1.5 rounded-lg outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-wimbledon-navy/30 ${tab.visible ? 'text-wimbledon-green hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                    title={tab.visible ? 'Hide tab' : 'Show tab'}
                >
                    {tab.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                </button>
                <span className={`font-medium truncate ${tab.visible ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                    {tab.id}
                </span>
            </div>
        </Reorder.Item>
    );
});

SortableTabRow.displayName = 'SortableTabRow';

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { tabPreferences, updateTabPreferences } = useAuth();
    const [localTabs, setLocalTabs] = useState(tabPreferences);

    useEffect(() => {
        if (isOpen) {
            setLocalTabs(tabPreferences);
        }
    }, [isOpen, tabPreferences]);

    const handleSave = async () => {
        await updateTabPreferences(localTabs);
        onClose();
    };

    const toggleVisibility = (id: string) => {
        setLocalTabs((prev) =>
            prev.map((tab) => (tab.id === id ? { ...tab, visible: !tab.visible } : tab)),
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col mt-10 md:mt-0 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-semibold text-wimbledon-navy">Booking Engine Settings</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 flex-grow overflow-y-auto">
                    <p className="text-sm text-gray-600 mb-4">
                        Drag sports to reorder them, or use the eye icon to show or hide tabs in the Booking Engine.
                    </p>

                    <Reorder.Group
                        axis="y"
                        values={localTabs}
                        onReorder={setLocalTabs}
                        className="space-y-2"
                    >
                        {localTabs.map((tab) => (
                            <SortableTabRow
                                key={tab.id}
                                tab={tab}
                                onToggleVisibility={() => toggleVisibility(tab.id)}
                            />
                        ))}
                    </Reorder.Group>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 text-sm font-semibold text-white bg-wimbledon-navy hover:bg-[#00287a] rounded-lg shadow-sm hover:shadow transition-all"
                    >
                        Save Preferences
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
