import { deleteDoc, doc } from 'firebase/firestore';
import { MessageSquare } from 'lucide-react';
import { db } from '../../../lib/firebase';
import type { FeedbackItem } from '../types';
import FeedbackInboxItem from '../cards/FeedbackInboxItem';

interface FeedbackModuleProps {
    feedbackList: FeedbackItem[];
}

const FeedbackModule = ({ feedbackList }: FeedbackModuleProps) => {
    const handleDeleteFeedback = async (id: string) => {
        if (!window.confirm('Are you sure you want to dismiss this feedback?')) return;
        try {
            await deleteDoc(doc(db, 'feedback', id));
        } catch (error) {
            console.error('Error deleting feedback:', error);
            window.alert('Failed to delete feedback record.');
        }
    };

    return (
        <div className="animate-fadeIn space-y-6">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h2 className="font-display text-2xl text-gray-900 dark:text-chalk">Feedback Inbox</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Read bugs, suggestions, and submissions sent by members.
                    </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 dark:bg-court-950 dark:text-gray-300">
                    {feedbackList.length} Items
                </span>
            </div>

            {feedbackList.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-150 py-12 text-center text-gray-400 dark:border-gray-800 dark:text-gray-500">
                    <MessageSquare className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    <p className="text-sm">No feedback reports found.</p>
                </div>
            ) : (
                <div className="max-h-[600px] space-y-4 overflow-y-auto pr-1">
                    {feedbackList.map((item) => (
                        <FeedbackInboxItem key={item.id} item={item} onDelete={handleDeleteFeedback} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default FeedbackModule;
