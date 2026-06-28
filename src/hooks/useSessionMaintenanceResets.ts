import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AdminRecurringSchedule } from '../lib/sports';
import { SPORTS } from '../lib/sports';
import {
    type Session,
    getBaseWeekStart,
    getOpenPlayInstancesWithinHorizon,
    inferSport,
    isOpenPlaySession,
    isOpenPlaySessionEnded,
    isRecurringCoachingSession,
} from '../lib/sessions';

/** Prevents duplicate maintenance writes when snapshots re-fire. */
const pendingClinicResets = new Set<string>();
const pendingOpenPlayResets = new Set<string>();

interface UseSessionMaintenanceResetsOptions {
    sessions: Session[];
    recurringSchedules: AdminRecurringSchedule[];
    disabledBuiltinSchedules: string[];
}

/** Debounced weekly clinic rollover + ended open-play roster cleanup. */
export function useSessionMaintenanceResets({
    sessions,
    recurringSchedules,
    disabledBuiltinSchedules,
}: UseSessionMaintenanceResetsOptions) {
    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            sessions.forEach(async (session) => {
                if (isRecurringCoachingSession(session)) return;
                if (session.type === 'coaching' || session.title.toLowerCase().includes('clinic')) {
                    const sport = inferSport(session);
                    const baseStartOfWeek = getBaseWeekStart(sport);
                    const currentWeekStartStr = baseStartOfWeek.toISOString().split('T')[0];
                    const storedWeekStart = session.weekStartDate;

                    if (storedWeekStart === currentWeekStartStr) {
                        pendingClinicResets.delete(`${session.id}:${currentWeekStartStr}`);
                        return;
                    }

                    const resetKey = `${session.id}:${currentWeekStartStr}`;
                    if (pendingClinicResets.has(resetKey)) return;
                    pendingClinicResets.add(resetKey);

                    try {
                        await updateDoc(doc(db, 'sessions', session.id), {
                            attendees: [],
                            coach: null,
                            coachId: null,
                            weekStartDate: currentWeekStartStr,
                        });
                    } catch (e) {
                        pendingClinicResets.delete(resetKey);
                        console.error(`Failed to auto-reset weekly session ${session.id}:`, e);
                    }
                }
            });
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [sessions]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            for (const sport of SPORTS) {
                const instances = getOpenPlayInstancesWithinHorizon(
                    sessions,
                    sport,
                    recurringSchedules,
                    disabledBuiltinSchedules,
                );

                instances.forEach(async ({ session, playDate, config }) => {
                    if (!isOpenPlaySession(session) && config.sessionType !== 'coaching') return;
                    if (!isOpenPlaySessionEnded(playDate, session.time)) return;

                    const hasRoster =
                        (session.attendees?.length ?? 0) > 0 || (session.waitlist?.length ?? 0) > 0;
                    if (!hasRoster) return;

                    const resetKey = `${session.id}:ended`;
                    if (pendingOpenPlayResets.has(resetKey)) return;
                    pendingOpenPlayResets.add(resetKey);

                    try {
                        const reset: Record<string, unknown> = {
                            attendees: [],
                            waitlist: [],
                        };
                        if (config.sessionType === 'coaching') {
                            reset.coachId = null;
                        }
                        await updateDoc(doc(db, 'sessions', session.id), reset);
                    } catch (e) {
                        pendingOpenPlayResets.delete(resetKey);
                        console.error(`Failed to reset ended open play session ${session.id}:`, e);
                    }
                });
            }
        }, 500);

        return () => window.clearTimeout(timeoutId);
    }, [sessions, recurringSchedules, disabledBuiltinSchedules]);
}
