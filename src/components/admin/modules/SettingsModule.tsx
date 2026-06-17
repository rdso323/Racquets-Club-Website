import { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { CheckCircle2, EyeOff, Repeat, Save, Trash2, XCircle } from 'lucide-react';
import { db } from '../../../lib/firebase';
import { SESSION_STATUS_CATEGORIES, type AdminRecurringSchedule } from '../../../lib/sports';
import type { SessionStatus } from '../../../lib/sessions';
import type { SessionStatusMap } from '../types';
import {
    formatRecurringDayLabel,
    listBuiltinRecurringSchedules,
    removeRecurringSchedule,
} from '../../../lib/recurringSchedules';

interface SettingsModuleProps {
    tickerText: string;
    setTickerText: (text: string) => void;
    sessionStatuses: SessionStatusMap;
    updateStatus: (id: string, status: SessionStatus) => void;
    recurringSchedules: AdminRecurringSchedule[];
}

const SettingsModule = ({
    tickerText,
    setTickerText,
    sessionStatuses,
    updateStatus,
    recurringSchedules,
}: SettingsModuleProps) => {
    const [savingTicker, setSavingTicker] = useState(false);
    const [message, setMessage] = useState('');
    const [savingStatuses, setSavingStatuses] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [deletingScheduleId, setDeletingScheduleId] = useState<string | null>(null);
    const builtinSchedules = listBuiltinRecurringSchedules();

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

    const handleSaveStatuses = async () => {
        setSavingStatuses(true);
        setStatusMessage('');
        try {
            await setDoc(doc(db, 'settings', 'sessionStatus'), sessionStatuses);
            setStatusMessage('Statuses updated successfully!');
            window.setTimeout(() => setStatusMessage(''), 3000);
        } catch (error) {
            console.error('Error updating statuses', error);
            setStatusMessage('Error updating statuses.');
        } finally {
            setSavingStatuses(false);
        }
    };

    const handleDeleteRecurringSchedule = async (id: string, title: string) => {
        if (!window.confirm(`Remove the weekly recurring schedule "${title}"? Future weeks will no longer show this session.`)) {
            return;
        }
        setDeletingScheduleId(id);
        try {
            await removeRecurringSchedule(id);
        } catch (error) {
            console.error('Error removing recurring schedule', error);
            window.alert('Error removing recurring schedule.');
        } finally {
            setDeletingScheduleId(null);
        }
    };

    return (
        <div className="space-y-8 animate-fadeIn">
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

            <hr className="border-gray-150 dark:border-gray-800" />

            <div>
                <h2 className="font-display text-2xl text-gray-900 dark:text-chalk">Weekly Recurring Court Schedules</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    These templates generate open play sessions every week on the Booking Engine. Built-in club
                    schedules are read-only; custom schedules can be added from the Sessions tab.
                </p>
                <div className="mt-6 space-y-3">
                    {builtinSchedules.map((schedule) => (
                        <div
                            key={schedule.id}
                            className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/30 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800/80 dark:bg-court-950/50"
                        >
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:border-violet-900/30 dark:bg-violet-950/30 dark:text-violet-300">
                                        Weekly recurring
                                    </span>
                                    <span className="rounded border border-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                        Built-in
                                    </span>
                                </div>
                                <p className="mt-2 text-sm font-bold text-gray-900 dark:text-chalk">
                                    {schedule.title}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {schedule.sport} · Every {formatRecurringDayLabel(schedule.day)} · {schedule.time} ·{' '}
                                    {schedule.courts.join(', ')}
                                </p>
                            </div>
                        </div>
                    ))}
                    {recurringSchedules.map((schedule) => (
                        <div
                            key={schedule.id}
                            className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50/30 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800/80 dark:bg-court-950/50"
                        >
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:border-violet-900/30 dark:bg-violet-950/30 dark:text-violet-300">
                                        <Repeat className="h-3 w-3" />
                                        Weekly recurring
                                    </span>
                                    <span className="rounded border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:border-emerald-900/30 dark:text-emerald-300">
                                        Custom
                                    </span>
                                </div>
                                <p className="mt-2 text-sm font-bold text-gray-900 dark:text-chalk">
                                    {schedule.title}
                                </p>
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {schedule.sport} · Every {formatRecurringDayLabel(schedule.day)} · {schedule.time} ·{' '}
                                    {schedule.courts.join(', ')}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleDeleteRecurringSchedule(schedule.id, schedule.title)}
                                disabled={deletingScheduleId === schedule.id}
                                className="inline-flex items-center gap-1 self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-950/20"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletingScheduleId === schedule.id ? 'Removing...' : 'Remove'}
                            </button>
                        </div>
                    ))}
                    {recurringSchedules.length === 0 && (
                        <p className="rounded-xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
                            No custom weekly schedules yet. Use the Sessions tab to add one.
                        </p>
                    )}
                </div>
            </div>

            <hr className="border-gray-150 dark:border-gray-800" />

            <div>
                <h2 className="font-display text-2xl text-gray-900 dark:text-chalk">Session Status Manager</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Show or hide weekly recurring open play and clinic categories on the homepage Booking Engine.
                </p>
                <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                    {SESSION_STATUS_CATEGORIES.map((cat) => (
                        <div
                            key={cat.id}
                            className="rounded-xl border border-gray-100 bg-gray-50/30 p-4 transition-colors dark:border-gray-800/80 dark:bg-court-950/50"
                        >
                            <label className="mb-3 block text-sm font-bold text-gray-700 dark:text-gray-300">
                                <span className="flex flex-wrap items-center gap-2">
                                    {cat.label}
                                    {cat.id.endsWith('_OpenPlay') && (
                                        <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-violet-700 dark:border-violet-900/30 dark:bg-violet-950/30 dark:text-violet-300">
                                            Weekly recurring
                                        </span>
                                    )}
                                </span>
                            </label>
                            <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm dark:border-gray-800 dark:bg-carbon">
                                {(['active', 'hidden', 'cancelled'] as SessionStatus[]).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => updateStatus(cat.id, status)}
                                        className={`flex flex-1 items-center justify-center rounded px-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${
                                            sessionStatuses[cat.id] === status
                                                ? status === 'active'
                                                    ? 'bg-wimbledon-green font-black text-white shadow-sm'
                                                    : status === 'hidden'
                                                      ? 'bg-gray-500 font-black text-white shadow-sm'
                                                      : 'bg-red-500 font-black text-white shadow-sm'
                                                : 'text-gray-400 hover:text-gray-650 dark:hover:text-gray-300'
                                        }`}
                                    >
                                        {status === 'active' && <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                                        {status === 'hidden' && <EyeOff className="mr-1 h-3.5 w-3.5" />}
                                        {status === 'cancelled' && <XCircle className="mr-1 h-3.5 w-3.5" />}
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-6 flex items-center justify-between">
                    <span className={`text-sm ${statusMessage.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>
                        {statusMessage}
                    </span>
                    <button
                        type="button"
                        onClick={handleSaveStatuses}
                        disabled={savingStatuses}
                        className="clay-gradient flex items-center rounded-lg px-5 py-2 text-sm font-medium text-white transition-colors hover:brightness-110 disabled:opacity-50"
                    >
                        <Save className="mr-2 h-4 w-4" />
                        {savingStatuses ? 'Saving...' : 'Save All Statuses'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModule;
