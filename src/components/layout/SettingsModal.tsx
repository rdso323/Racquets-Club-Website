import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

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

    const moveTab = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === localTabs.length - 1) return;

        const newTabs = [...localTabs];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        const temp = newTabs[index];
        newTabs[index] = newTabs[swapIndex];
        newTabs[swapIndex] = temp;
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
                        Customize which sports appear in the Booking Engine and reorder them for your convenience.
                    </p>

                    <div className="space-y-2">
                        {localTabs.map((tab, idx) => (
                            <div key={tab.id} className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${tab.visible ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleVisibility(idx)}
                                        className={`p-1.5 rounded-lg transition-colors ${tab.visible ? 'text-wimbledon-green hover:bg-green-50' : 'text-gray-400 hover:bg-gray-200'}`}
                                        title={tab.visible ? "Hide tab" : "Show tab"}
                                    >
                                        {tab.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                                    </button>
                                    <span className={`font-medium ${tab.visible ? 'text-gray-900' : 'text-gray-500 line-through'}`}>{tab.id}</span>
                                </div>
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => moveTab(idx, 'up')}
                                        disabled={idx === 0}
                                        className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                                    >
                                        <ChevronUp className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={() => moveTab(idx, 'down')}
                                        disabled={idx === localTabs.length - 1}
                                        className="p-1 text-gray-400 hover:text-gray-800 disabled:opacity-30 disabled:hover:text-gray-400 transition-colors"
                                    >
                                        <ChevronDown className="w-5 h-5" />
                                    </button>
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
