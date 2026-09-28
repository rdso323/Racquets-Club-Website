import { useEffect, useState } from 'react';
import { doc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { Save, UserPlus } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { db } from '../../../lib/firebase';
import {
    ADMINS_SETTINGS_COLLECTION,
    ADMINS_SETTINGS_DOC_ID,
    addAdminEmail,
    builtinAdminEmails,
    normalizeAdminEmail,
    removeAdminEmail,
    storedAdminEmails,
} from '../../../lib/adminAllowlist';

interface SettingsModuleProps {
    tickerText: string;
    setTickerText: (text: string) => void;
}

const adminsRef = () => doc(db, ADMINS_SETTINGS_COLLECTION, ADMINS_SETTINGS_DOC_ID);

const SettingsModule = ({ tickerText, setTickerText }: SettingsModuleProps) => {
    const { user, adminEmails } = useAuth();
    const [savingTicker, setSavingTicker] = useState(false);
    const [message, setMessage] = useState('');
    const [draftEmail, setDraftEmail] = useState('');
    const [adminMessage, setAdminMessage] = useState('');
    const [savingAdmins, setSavingAdmins] = useState(false);

    useEffect(() => {
        const ref = adminsRef();
        const unsubscribe = onSnapshot(ref, (snapshot) => {
            if (snapshot.exists() || snapshot.metadata.fromCache) return;
            void runTransaction(db, async (transaction) => {
                const current = await transaction.get(ref);
                if (current.exists() && storedAdminEmails(current.data())) return;
                transaction.set(ref, { emails: builtinAdminEmails() });
            }).catch((error) => {
                console.error('Error seeding admin list', error);
            });
        });
        return unsubscribe;
    }, []);

    const handleSaveTicker = async () => {
        setSavingTicker(true);
        setMessage('');
        try {
            await setDoc(doc(db, 'settings', 'ticker'), { text: tickerText }, { merge: true });
            setMessage('Ticker updated successfully!');
            window.setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error updating ticker', error);
            setMessage('Error updating ticker.');
        } finally {
            setSavingTicker(false);
        }
    };

    const handleAddAdmin = async () => {
        const email = normalizeAdminEmail(draftEmail);
        const preview = addAdminEmail(adminEmails, draftEmail);
        if (!email || preview.error) {
            setAdminMessage(preview.error ?? 'Enter a valid email address.');
            return;
        }
        setSavingAdmins(true);
        setAdminMessage('');
        try {
            const added = await runTransaction(db, async (transaction) => {
                const ref = adminsRef();
                const current = await transaction.get(ref);
                const base = current.exists()
                    ? (storedAdminEmails(current.data()) ?? builtinAdminEmails())
                    : builtinAdminEmails();
                if (base.includes(email)) return false;
                transaction.set(ref, { emails: [...base, email] });
                return true;
            });
            if (!added) {
                setAdminMessage('That address is already an admin.');
                return;
            }
            setDraftEmail('');
            setAdminMessage('Admin added. Access shows up when they are signed in with that email.');
            window.setTimeout(() => setAdminMessage(''), 4000);
        } catch (error) {
            console.error('Error adding admin', error);
            setAdminMessage('Could not update admins.');
        } finally {
            setSavingAdmins(false);
        }
    };

    const handleRemoveAdmin = async (email: string) => {
        if (!removeAdminEmail(adminEmails, email)) return;
        const self = user?.email?.toLowerCase() === email;
        if (self && !window.confirm('You will lose the admin page.')) return;
        setSavingAdmins(true);
        setAdminMessage('');
        try {
            const removed = await runTransaction(db, async (transaction) => {
                const ref = adminsRef();
                const current = await transaction.get(ref);
                const base = current.exists()
                    ? (storedAdminEmails(current.data()) ?? builtinAdminEmails())
                    : builtinAdminEmails();
                const next = removeAdminEmail(base, email);
                if (!next) return false;
                transaction.set(ref, { emails: next });
                return true;
            });
            if (!removed) setAdminMessage('At least one admin is required.');
        } catch (error) {
            console.error('Error removing admin', error);
            setAdminMessage('Could not update admins.');
        } finally {
            setSavingAdmins(false);
        }
    };

    const selfEmail = user?.email?.toLowerCase() ?? '';
    const lastAdmin = adminEmails.length <= 1;

    return (
        <div className="animate-fadeIn space-y-8">
            <div>
                <h2 className="font-display text-2xl text-gray-900 dark:text-chalk">Edit Live Ticker</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Change the message scrollbar on the homepage. Use dots • or lines | to split ideas.
                </p>
                <div className="mt-4 space-y-4">
                    <textarea
                        value={tickerText}
                        onChange={(e) => setTickerText(e.target.value)}
                        className="h-32 w-full resize-none rounded-xl border border-gray-300 bg-white p-4 font-mono text-sm text-gray-900 transition-colors focus:border-transparent focus:ring-2 focus:ring-wimbledon-navy dark:border-gray-700 dark:bg-court-950 dark:text-chalk dark:focus:ring-court-accent"
                        placeholder="Type marquee text..."
                    />
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50 py-3 dark:border-chalk/10 dark:bg-court-950">
                        <p className="hud-label mb-2 px-4 text-gray-400 dark:text-chalk/40">Static preview</p>
                        <div className="px-4">
                            <span className="inline-flex items-center gap-5 text-[11px] font-medium uppercase tracking-hud text-gray-600 dark:text-chalk/70">
                                <span className="text-emerald-600 dark:text-court-accent">● Club Wire</span>
                                <span>{tickerText || 'Your ticker copy will appear here…'}</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className={`text-sm ${message.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                            {message}
                        </span>
                        <button
                            type="button"
                            onClick={handleSaveTicker}
                            disabled={savingTicker}
                            className="clay-gradient flex items-center rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {savingTicker ? 'Saving...' : 'Save Ticker'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-200 pt-8 dark:border-chalk/10">
                <h2 className="font-display text-2xl text-gray-900 dark:text-chalk">Admins</h2>
                <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    Add or remove who can open this page. They sign in with the Google account for that exact email.
                    At least one admin always stays.
                </p>

                <ul className="mt-4 divide-y divide-gray-200 overflow-hidden rounded-xl border border-gray-200 dark:divide-chalk/10 dark:border-chalk/10">
                    {adminEmails.map((email) => {
                        const isSelf = email === selfEmail;
                        return (
                            <li
                                key={email}
                                className="flex items-center justify-between gap-3 bg-white px-4 py-3 dark:bg-court-950"
                            >
                                <span className="min-w-0 truncate text-sm text-gray-800 dark:text-chalk">
                                    {email}
                                    {isSelf && (
                                        <span className="ml-2 text-xs font-medium text-gray-400 dark:text-chalk/40">
                                            You
                                        </span>
                                    )}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => void handleRemoveAdmin(email)}
                                    disabled={lastAdmin || savingAdmins}
                                    title={lastAdmin ? 'At least one admin is required' : 'Remove admin'}
                                    className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent dark:text-red-400 dark:hover:bg-red-950/30 dark:disabled:text-chalk/25"
                                >
                                    Remove
                                </button>
                            </li>
                        );
                    })}
                </ul>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        void handleAddAdmin();
                    }}
                    className="mt-4 flex flex-col gap-3 sm:flex-row"
                >
                    <label className="min-w-0 flex-1">
                        <span className="sr-only">Admin email</span>
                        <input
                            type="email"
                            value={draftEmail}
                            onChange={(event) => setDraftEmail(event.target.value)}
                            placeholder="name@email.com"
                            autoComplete="off"
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-wimbledon-navy dark:border-gray-700 dark:bg-court-950 dark:text-chalk dark:focus:ring-court-accent"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={savingAdmins || !draftEmail.trim()}
                        className="clay-gradient flex items-center justify-center rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        {savingAdmins ? 'Saving...' : 'Add admin'}
                    </button>
                </form>
                {adminMessage && (
                    <p
                        className={`mt-3 text-sm ${adminMessage.startsWith('Admin added') ? 'text-green-600' : 'text-red-500'}`}
                    >
                        {adminMessage}
                    </p>
                )}
            </div>
        </div>
    );
};

export default SettingsModule;
