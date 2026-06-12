import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../system/UIProvider';
import { useTransitionRouter } from '../system/TransitionProvider';

/*
 * TRANSMIT — the feedback uplink. Firestore writes (feedback + mail
 * notification) are identical to the legacy modal.
 */

type FeedbackType = 'bug' | 'improvement' | 'other';

const FeedbackModal = () => {
    const { user } = useAuth();
    const { feedbackOpen, closeFeedback } = useUI();
    const { go } = useTransitionRouter();

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
        closeFeedback();
    };

    const TYPES: { id: FeedbackType; label: string; glyph: string }[] = [
        { id: 'bug', label: 'BUG', glyph: '▲' },
        { id: 'improvement', label: 'IDEA', glyph: '✦' },
        { id: 'other', label: 'OTHER', glyph: '◆' },
    ];

    return (
        <AnimatePresence>
            {feedbackOpen && (
                <motion.div
                    className="fixed inset-0 z-[180] flex items-center justify-center bg-court/85 p-4 backdrop-blur-md"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="w-full max-w-md border border-chalk/20 bg-carbon"
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 24, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Header */}
                        <div className="hairline-b flex items-start justify-between p-6">
                            <div>
                                <p className="hud-label mb-1 text-ace">● UPLINK CHANNEL</p>
                                <h2 className="display-narrow text-3xl text-chalk">TRANSMIT</h2>
                                <p className="hud-label mt-1 text-chalk/45">BUGS / IDEAS / DISPATCHES → CLUB OPS</p>
                            </div>
                            <button onClick={handleReset} data-cursor="hover" className="hud-label text-chalk/50 transition-colors hover:text-alert">
                                ✕ CLOSE
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto p-6">
                            {!user ? (
                                <div className="flex flex-col items-center py-8 text-center">
                                    <span className="hud-label mb-4 border border-chalk/25 px-3 py-2 text-chalk/70">▦ AUTH REQUIRED</span>
                                    <p className="mb-8 max-w-xs font-mono text-xs leading-relaxed text-chalk/60">
                                        You must be signed in to transmit. This keeps every dispatch tied to a verified club member.
                                    </p>
                                    <button
                                        onClick={() => {
                                            handleReset();
                                            go('/login', 'ACCESS');
                                        }}
                                        data-cursor="hover"
                                        className="bg-ace px-7 py-3.5 font-mono text-[11px] uppercase tracking-hud text-court transition-all hover:brightness-110"
                                    >
                                        OPEN THE AIRLOCK →
                                    </button>
                                </div>
                            ) : success ? (
                                <div className="flex flex-col items-center py-8 text-center">
                                    <span className="hud-label mb-4 border border-ace/60 px-3 py-2 text-ace">✓ TRANSMISSION RECEIVED</span>
                                    <p className="mb-8 max-w-xs font-mono text-xs leading-relaxed text-chalk/60">
                                        Your dispatch is on the operations desk. Thanks for sharpening the clubhouse.
                                    </p>
                                    <button
                                        onClick={handleReset}
                                        data-cursor="hover"
                                        className="bg-ace px-7 py-3.5 font-mono text-[11px] uppercase tracking-hud text-court transition-all hover:brightness-110"
                                    >
                                        CLOSE CHANNEL
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-7">
                                    {/* Type Selection */}
                                    <div>
                                        <label className="hud-label mb-3 block text-chalk/45">SIGNAL TYPE</label>
                                        <div className="flex gap-px bg-chalk/10">
                                            {TYPES.map((t) => (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => setType(t.id)}
                                                    data-cursor="hover"
                                                    className={`flex flex-1 flex-col items-center gap-1.5 py-3.5 font-mono text-[10px] uppercase tracking-hud transition-colors ${type === t.id ? 'bg-ace text-court' : 'bg-court text-chalk/50 hover:text-chalk'}`}
                                                >
                                                    <span className="text-sm">{t.glyph}</span>
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Message */}
                                    <div>
                                        <label className="hud-label mb-2 block text-chalk/45">PAYLOAD</label>
                                        <textarea
                                            required
                                            value={message}
                                            onChange={(e) => {
                                                setMessage(e.target.value);
                                                if (error) setError(null);
                                            }}
                                            placeholder={
                                                type === 'bug'
                                                    ? 'What went wrong? Tell us what you did and what happened…'
                                                    : type === 'improvement'
                                                        ? 'How can we improve? What would make the clubhouse sharper?'
                                                        : 'Tell us what is on your mind…'
                                            }
                                            className="h-32 w-full resize-none border border-chalk/15 bg-court p-3.5 font-mono text-xs leading-relaxed text-chalk placeholder-chalk/30 transition-colors focus:border-ace focus:outline-none"
                                        />
                                    </div>

                                    {/* Submitter Info */}
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={() => setSubmitAnonymously(!submitAnonymously)}
                                            data-cursor="hover"
                                            className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-hud text-chalk/70 transition-colors hover:text-chalk"
                                        >
                                            <span className={`flex h-4 w-4 items-center justify-center border ${submitAnonymously ? 'border-ace bg-ace text-court' : 'border-chalk/30'}`}>
                                                {submitAnonymously && '✓'}
                                            </span>
                                            GHOST MODE — TRANSMIT ANONYMOUSLY
                                        </button>

                                        {!submitAnonymously && (
                                            <div className="border border-chalk/15 bg-court px-3.5 py-3">
                                                <span className="hud-label text-chalk/50">
                                                    CALLSIGN ATTACHED: <span className="text-ace">{user.email?.toUpperCase()}</span>
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {error && (
                                        <p className="hud-label border border-alert/60 px-3 py-2.5 text-alert">▲ {error.toUpperCase()}</p>
                                    )}

                                    {/* Actions */}
                                    <div className="hairline-t flex justify-end gap-px bg-chalk/10 pt-5">
                                        <button
                                            type="button"
                                            onClick={handleReset}
                                            disabled={loading}
                                            data-cursor="hover"
                                            className="bg-court px-5 py-3 font-mono text-[10px] uppercase tracking-hud text-chalk/60 transition-colors hover:text-chalk disabled:opacity-40"
                                        >
                                            ABORT
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            data-cursor="hover"
                                            className="bg-ace px-6 py-3 font-mono text-[10px] uppercase tracking-hud text-court transition-all hover:brightness-110 disabled:opacity-40"
                                        >
                                            {loading ? 'TRANSMITTING…' : 'SEND TRANSMISSION →'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FeedbackModal;
