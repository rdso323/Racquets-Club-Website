import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X, Eye, EyeOff, GripVertical } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal = ({ isOpen, onClose }: SettingsModalProps) => {
    const { tabPreferences, updateTabPreferences } = useAuth();
    const [localTabs, setLocalTabs] = useState(tabPreferences);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dropIndex, setDropIndex] = useState<number | null>(null);

    useEffect(() => {
        if (isOpen) {
            setLocalTabs(tabPreferences);
            setDragIndex(null);
            setDropIndex(null);
        }
    }, [isOpen, tabPreferences]);

    const handleSave = async () => {
        await updateTabPreferences(localTabs);
        onClose();
    };

    const reorderTabs = (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        const newTabs = [...localTabs];
        const [moved] = newTabs.splice(fromIndex, 1);
        newTabs.splice(toIndex, 0, moved);
        setLocalTabs(newTabs);
    };

    const toggleVisibility = (index: number) => {
        const newTabs = [...localTabs];
        newTabs[index] = { ...newTabs[index], visible: !newTabs[index].visible };
        setLocalTabs(newTabs);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
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

                    <div className="space-y-2">
                        {localTabs.map((tab, idx) => (
                            <div
                                key={tab.id}
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    if (dragIndex !== null && dragIndex !== idx) {
                                        setDropIndex(idx);
                                    }
                                }}
                                onDragLeave={() => setDropIndex(null)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    if (dragIndex !== null) {
                                        reorderTabs(dragIndex, idx);
                                    }
                                    setDragIndex(null);
                                    setDropIndex(null);
                                }}
                                className={`flex items-center justify-between p-3 border rounded-xl transition-all ${
                                    tab.visible ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'
                                } ${dropIndex === idx ? 'border-wimbledon-gold ring-2 ring-wimbledon-gold/30' : ''} ${
                                    dragIndex === idx ? 'opacity-40 scale-[0.98]' : ''
                                }`}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <button
                                        type="button"
                                        draggable
                                        onDragStart={() => setDragIndex(idx)}
                                        onDragEnd={() => {
                                            setDragIndex(null);
                                            setDropIndex(null);
                                        }}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-grab active:cursor-grabbing transition-colors touch-none"
                                        title="Drag to reorder"
                                        aria-label={`Drag to reorder ${tab.id}`}
                                    >
                                        <GripVertical className="w-5 h-5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => toggleVisibility(idx)}
                                        className={`p-1.5 rounded-lg transition-colors ${tab.visible ? 'text-wimbledon-green hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                                        title={tab.visible ? 'Hide tab' : 'Show tab'}
                                    >
                                        {tab.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                    </button>
                                    <span className={`font-medium truncate ${tab.visible ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                                        {tab.id}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
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
