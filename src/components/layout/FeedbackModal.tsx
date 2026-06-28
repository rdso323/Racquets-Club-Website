import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { X, Send, CheckCircle2, MessageSquare, AlertTriangle, Sparkles, Mail, Lock } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useNavigate } from 'react-router-dom';
import ModalPortal from '../admin/ModalPortal';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type FeedbackType = 'bug' | 'improvement' | 'other';

const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Form states
    const [type, setType] = useState<FeedbackType>('improvement');
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [submitAnonymously, setSubmitAnonymously] = useState(true);
    
    // Status states
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) {
            setError('Please enter a description for your feedback.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const feedbackData = {
                type,
                message: message.trim(),
                email: submitAnonymously ? 'anonymous' : (user?.email || email.trim() || 'anonymous'),
                userId: submitAnonymously ? 'anonymous' : (user?.uid || 'anonymous'),
                createdAt: serverTimestamp(),
            };

            await addDoc(collection(db, 'feedback'), feedbackData);

            // Trigger email notification to rohan.dsouza@duke.edu
            try {
                await addDoc(collection(db, 'mail'), {
                    to: 'rohan.dsouza@duke.edu',
                    message: {
                        subject: `Feedback Submission: [${type.toUpperCase()}]`,
                        text: `A new feedback item has been submitted.\n\nType: ${type.toUpperCase()}\nEmail: ${feedbackData.email}\nMessage: ${message.trim()}\nDate: ${new Date().toLocaleString()}`,
                        html: `
                            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #eee; border-radius: 8px;">
                                <h2 style="color: #001A57; border-bottom: 2px solid #C9A84C; padding-bottom: 10px;">New Feedback Received</h2>
                                <p style="margin: 15px 0;"><strong>Type:</strong> <span style="background: #f0f0f0; padding: 3px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase;">${type}</span></p>
                                <p style="margin: 15px 0;"><strong>User Email:</strong> ${feedbackData.email}</p>
                                <p style="margin: 15px 0;"><strong>Message:</strong></p>
                                <blockquote style="background: #f9f9f9; padding: 15px; border-left: 5px solid #001A57; margin: 15px 0; border-radius: 4px; line-height: 1.6;">
                                    ${message.trim().replace(/\n/g, '<br/>')}
                                </blockquote>
                                <p style="font-size: 11px; color: #888; margin-top: 25px; border-top: 1px solid #eee; padding-top: 10px;">Submitted via Fuqua Racquets Club Website Feedback Widget.</p>
                            </div>
                        `
                    }
                });
            } catch (mailErr) {
                console.error("Failed to write email notification to Firestore mail collection:", mailErr);
            }

            setSuccess(true);
            
            // Reset fields
            setMessage('');
            setEmail('');
            setSubmitAnonymously(true);
        } catch (err: any) {
            console.error('Error submitting feedback:', err);
            setError('Failed to submit feedback. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setSuccess(false);
        setError(null);
        setType('improvement');
        setMessage('');
        setEmail('');
        setSubmitAnonymously(true);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <ModalPortal>
            <div className="flex max-h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl dark:border-gray-800 dark:bg-club-surface">
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-club-bg/30 sm:p-5">
                    <div className="min-w-0 pr-3">
                        <h2 className="flex items-center gap-2 text-lg font-semibold text-wimbledon-navy dark:text-gray-100 sm:text-xl">
                            <MessageSquare className="h-5 w-5 shrink-0 text-wimbledon-gold" />
                            Submit Feedback
                        </h2>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Bugs, suggestions, or general improvements.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleReset}
                        aria-label="Close feedback form"
                        className="flex min-h-11 min-w-11 shrink-0 touch-manipulation items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                    {!user ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/20 rounded-full flex items-center justify-center mb-4 border border-amber-100 dark:border-amber-900/30">
                                <Lock className="w-8 h-8 text-amber-600 dark:text-wimbledon-gold" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Sign In Required</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-6">
                                You must be logged in to submit feedback. This helps us ensure suggestions are from verified club members.
                            </p>
                            <button
                                type="button"
                                onClick={() => {
                                    handleReset();
                                    navigate('/login');
                                }}
                                className="min-h-11 touch-manipulation rounded-xl bg-wimbledon-navy px-6 py-2.5 font-semibold text-white shadow-sm transition duration-300 hover:bg-[#00287a] dark:bg-wimbledon-gold dark:text-slate-950 dark:hover:bg-amber-500"
                            >
                                Go to Sign In
                            </button>
                        </div>
                    ) : success ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-green-50 dark:bg-green-950/20 rounded-full flex items-center justify-center mb-4 border border-green-100 dark:border-green-900/30">
                                <CheckCircle2 className="w-10 h-10 text-wimbledon-green dark:text-wimbledon-green-accent" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Thank you!</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                                Your feedback has been sent directly to the club administration. We appreciate your help in improving the digital clubhouse!
                            </p>
                            <button
                                type="button"
                                onClick={handleReset}
                                className="mt-6 min-h-11 touch-manipulation rounded-xl bg-wimbledon-navy px-6 py-2 font-semibold text-white shadow-sm transition duration-300 hover:bg-[#00287a] dark:bg-wimbledon-gold dark:text-slate-950 dark:hover:bg-amber-500"
                            >
                                Close Window
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            
                            {/* Type Selection */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    Feedback Type
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {/* Bug button */}
                                    <button
                                        type="button"
                                        onClick={() => setType('bug')}
                                        className={`flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-all duration-200 sm:px-3 sm:py-2.5 ${
                                            type === 'bug'
                                                ? 'bg-red-50/50 dark:bg-red-950/20 border-red-500 text-red-800 dark:text-red-400 font-semibold shadow-sm'
                                                : 'bg-white dark:bg-club-bg border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        <AlertTriangle className={`w-5 h-5 mb-1 ${type === 'bug' ? 'text-red-500' : 'text-gray-400'}`} />
                                        <span className="text-xs">Bug / Issue</span>
                                    </button>

                                    {/* Suggestion button */}
                                    <button
                                        type="button"
                                        onClick={() => setType('improvement')}
                                        className={`flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-all duration-200 sm:px-3 sm:py-2.5 ${
                                            type === 'improvement'
                                                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-500 text-amber-800 dark:text-amber-300 font-semibold shadow-sm'
                                                : 'bg-white dark:bg-club-bg border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        <Sparkles className={`w-5 h-5 mb-1 ${type === 'improvement' ? 'text-amber-500 dark:text-wimbledon-gold' : 'text-gray-400'}`} />
                                        <span className="text-xs">Suggestion</span>
                                    </button>

                                    {/* Other button */}
                                    <button
                                        type="button"
                                        onClick={() => setType('other')}
                                        className={`flex min-h-11 touch-manipulation flex-col items-center justify-center rounded-xl border px-2 py-2 text-center transition-all duration-200 sm:px-3 sm:py-2.5 ${
                                            type === 'other'
                                                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500 text-blue-800 dark:text-blue-300 font-semibold shadow-sm'
                                                : 'bg-white dark:bg-club-bg border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-700'
                                        }`}
                                    >
                                        <MessageSquare className={`w-5 h-5 mb-1 ${type === 'other' ? 'text-blue-500' : 'text-gray-400'}`} />
                                        <span className="text-xs">Other</span>
                                    </button>
                                </div>
                            </div>

                            {/* Message Input */}
                            <div className="space-y-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                    Details
                                </label>
                                <textarea
                                    required
                                    value={message}
                                    onChange={(e) => {
                                        setMessage(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    placeholder={
                                        type === 'bug'
                                            ? 'What went wrong? Tell us what you did and what happened...'
                                            : type === 'improvement'
                                            ? 'How can we improve? What features or changes would you like to see?'
                                            : 'Tell us what is on your mind...'
                                    }
                                    className="h-32 w-full resize-none rounded-xl border border-gray-200 bg-white p-3.5 text-base leading-relaxed text-gray-900 transition-all placeholder-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wimbledon-navy dark:border-gray-800 dark:bg-club-bg dark:text-gray-100 dark:placeholder-gray-500 dark:focus:ring-wimbledon-gold"
                                />
                            </div>

                            {/* Submitter Info */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2.5">
                                    <input
                                        type="checkbox"
                                        id="submitAnonymously"
                                        checked={submitAnonymously}
                                        onChange={(e) => setSubmitAnonymously(e.target.checked)}
                                        className="rounded border-gray-300 dark:border-gray-750 text-wimbledon-navy dark:text-wimbledon-gold focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold w-4 h-4 bg-white dark:bg-club-bg"
                                    />
                                    <label htmlFor="submitAnonymously" className="text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer select-none">
                                        Submit anonymously
                                    </label>
                                </div>

                                {!submitAnonymously && (
                                    <div className="space-y-2 animate-in fade-in duration-200">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                            Contact Email
                                        </label>
                                        {user ? (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-club-bg/50 border border-gray-150 dark:border-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-300 font-medium animate-in slide-in-from-top-1 duration-200">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <span>Include email: <strong className="text-gray-800 dark:text-gray-200">{user.email}</strong></span>
                                            </div>
                                        ) : (
                                            <div className="relative animate-in slide-in-from-top-1 duration-200">
                                                <input
                                                    type="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="Enter email address"
                                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent transition-all text-sm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="text-red-500 text-xs font-medium flex items-center gap-1.5 animate-in fade-in duration-200">
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-3 border-t border-gray-100 bg-white pt-4 dark:border-gray-800 dark:bg-club-surface sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    disabled={loading}
                                    className="min-h-11 touch-manipulation rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-xl bg-wimbledon-navy px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#00287a] hover:shadow disabled:opacity-50 dark:bg-wimbledon-gold dark:text-slate-950 dark:hover:bg-amber-500"
                                >
                                    {loading ? (
                                        <>Submitting...</>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Send Feedback
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </ModalPortal>
    );
};

export default FeedbackModal;
