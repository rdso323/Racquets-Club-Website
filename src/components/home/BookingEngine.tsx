import { useState, useEffect, useMemo, useCallback, type CSSProperties } from 'react';
import { collection, onSnapshot, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Rocket, PartyPopper, X } from 'lucide-react';
import { type Sport, SPORTS, getSportTheme, type AdminRecurringSchedule, type OpenPlayDayConfig } from '../../lib/sports';
import {
    joinSessionCourt,
    joinWaitlist,
    leaveWaitlist,
    toBookingProfile,
} from '../../lib/bookingActions';
import { dismissNotification, notifyWaitlistPromotion, type WaitlistPromotionNotification } from '../../lib/waitlistNotifications';
import {
    type Session,
    getOpenPlayInstancesWithinHorizon,
    pickAdminOpenPlayInstances,
    filterRegularSessionsForDisplay,
    isRecurringSession,
    getRecurringConfigForSession,
} from '../../lib/sessions';
import { sectionHud } from '../../lib/siteNav';
import SessionOpsModal from './SessionOpsModal';
import EditSessionModal from '../admin/modals/EditSessionModal';
import CapacityReductionModal from '../admin/modals/CapacityReductionModal';
import { useSessionAdminOps } from '../../hooks/useSessionAdminOps';
import { useBookingSessions } from '../../hooks/useBookingSessions';
import { useSessionMaintenanceResets } from '../../hooks/useSessionMaintenanceResets';
import {
    BookingRegularCard,
    BookingOpenPlayCard,
    type BookingAdminActions,
    type BookingCardHandlers,
} from './booking/BookingCards';

const createICSFile = (session: Session, courtName?: string) => {
    let startDate = new Date();
    let endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const formatICSDate = (date: Date) => {
        const pad = (n: number) => n < 10 ? '0' + n : n;
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}00`;
    };

    const days = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays',
        'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let targetDate = new Date();
    for (let i = 0; i < days.length; i++) {
        if (session.date.includes(days[i])) {
            const targetDay = i % 7;
            const currentDay = targetDate.getDay();
            let distance = targetDay - currentDay;
            if (distance < 0) distance += 7;
            targetDate.setDate(targetDate.getDate() + distance);
            break;
        }
    }

    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)/i;
    const match = session.time?.match(timeRegex);
    if (match) {
        let hours = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        targetDate.setHours(hours, mins, 0, 0);

        if (targetDate.getTime() < new Date().getTime() - 60 * 60 * 1000) {
            targetDate.setDate(targetDate.getDate() + 7);
        }
        startDate = new Date(targetDate);

        const remainingStr = session.time?.substring(match.index! + match[0].length);
        const endMatch = remainingStr?.match(timeRegex);
        if (endMatch) {
            let eHours = parseInt(endMatch[1]);
            const eMins = parseInt(endMatch[2]);
            const eAmpm = endMatch[3].toUpperCase();
            if (eAmpm === 'PM' && eHours < 12) eHours += 12;
            if (eAmpm === 'AM' && eHours === 12) eHours = 0;
            endDate = new Date(targetDate);
            endDate.setHours(eHours, eMins, 0, 0);
            if (endDate < startDate) endDate.setDate(endDate.getDate() + 1);
        }
    }

    const title = courtName ? `${session.title} - ${courtName}` : session.title;
    const description = `Racquets Club Session\\nTitle: ${session.title}\\nDate: ${session.date}\\nTime: ${session.time}${courtName ? `\\nCourt: ${courtName}` : ''}`;

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Racquets Club//Booking Engine//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${Date.now()}-${Math.random().toString(36).substring(2)}@racquetsclub`,
        `DTSTAMP:${(() => { const d = new Date(); const p = (n: number) => n < 10 ? '0' + n : n; return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`; })()}`,
        `DTSTART:${formatICSDate(startDate)}`,
        `DTEND:${formatICSDate(endDate)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title.replace(/[^a-zA-Z0-9]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const BookingEngine = () => {
    const { user, isAdmin, tabPreferences } = useAuth();
    const [recurringSchedules, setRecurringSchedules] = useState<AdminRecurringSchedule[]>([]);
    const [disabledBuiltinSchedules, setDisabledBuiltinSchedules] = useState<string[]>([]);
    const [activeSport, setActiveSport] = useState<Sport>('Tennis');
    const [displayTabs, setDisplayTabs] = useState<string[]>([]);
    const [bookingBusy, setBookingBusy] = useState<string | null>(null);
    const [promotionAlerts, setPromotionAlerts] = useState<
        Array<{ id: string } & WaitlistPromotionNotification>
    >([]);
    const [opsSession, setOpsSession] = useState<Session | null>(null);

    const { sessions, loading, error } = useBookingSessions({
        recurringSchedules,
        disabledBuiltinSchedules,
    });

    useSessionMaintenanceResets({
        sessions,
        recurringSchedules,
        disabledBuiltinSchedules,
    });

    const adminOps = useSessionAdminOps({
        sessionsList: sessions,
        recurringSchedules,
        disabledBuiltinSchedules,
        enabled: isAdmin,
    });

    useEffect(() => {
        if (!user) {
            setPromotionAlerts([]);
            return;
        }

        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        const unreadQuery = query(notificationsRef, where('read', '==', false));

        const unsub = onSnapshot(unreadQuery, (snapshot) => {
            const alerts = snapshot.docs
                .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as { id: string } & WaitlistPromotionNotification))
                .filter((item) => item.type === 'waitlist_promoted');
            setPromotionAlerts(alerts);
        }, (err) => {
            console.warn('Could not load promotion notifications:', err);
        });

        return () => unsub();
    }, [user]);

    useEffect(() => {
        const visibleTabs = tabPreferences.filter(t => t.visible).map(t => t.id);
        if (visibleTabs.length > 0) {
            setDisplayTabs(visibleTabs);
            setActiveSport(prev => visibleTabs.includes(prev) ? prev as Sport : visibleTabs[0] as Sport);
        }
    }, [tabPreferences]);

    useEffect(() => {
        const unsubRecurring = onSnapshot(
            doc(db, 'settings', 'recurringSchedules'),
            (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setRecurringSchedules(
                        Array.isArray(data.schedules) ? (data.schedules as AdminRecurringSchedule[]) : [],
                    );
                    setDisabledBuiltinSchedules(
                        Array.isArray(data.disabledBuiltin) ? (data.disabledBuiltin as string[]) : [],
                    );
                } else {
                    setRecurringSchedules([]);
                    setDisabledBuiltinSchedules([]);
                }
            },
            (err) => console.error('Error fetching recurring schedules:', err),
        );

        return () => unsubRecurring();
    }, []);

    const handleJoin = useCallback(async (sessionToJoin: Session, courtName?: string, slotIndex?: number) => {
        if (!user) return;
        setBookingBusy(sessionToJoin.id);
        const profile = toBookingProfile(user);

        try {
            const result = await joinSessionCourt(sessionToJoin, profile, courtName, activeSport, slotIndex);

            if (result.action === 'joined' && window.confirm('Successfully joined! Would you like to download a calendar invite?')) {
                createICSFile(sessionToJoin, courtName);
            } else if (result.action === 'switched' && window.confirm('Successfully switched courts! Would you like to download a calendar invite?')) {
                createICSFile(sessionToJoin, courtName);
            } else if (result.action === 'left' && result.promotion?.promoted && result.promotion.promotedUid) {
                try {
                    await notifyWaitlistPromotion({
                        promotedUid: result.promotion.promotedUid,
                        promotedName: result.promotion.promotedName || 'Member',
                        promotedCourt: result.promotion.promotedCourt,
                        sessionId: sessionToJoin.id,
                        sessionTitle: sessionToJoin.title,
                        sessionDate: sessionToJoin.date,
                        actorUid: user.uid,
                    });
                } catch (notifyErr) {
                    console.warn('Could not write waitlist promotion notification:', notifyErr);
                }
            }
        } catch (error) {
            console.error('Error updating session', error);
            alert(error instanceof Error ? error.message : 'Failed to update booking. Make sure you have the right permissions.');
        } finally {
            setBookingBusy(null);
        }
    }, [user, activeSport]);

    const handleJoinWaitlist = useCallback(async (sessionToJoin: Session, openPlayConfig?: OpenPlayDayConfig | null) => {
        if (!user) return;
        setBookingBusy(`${sessionToJoin.id}:waitlist`);
        const profile = toBookingProfile(user);

        try {
            await joinWaitlist(sessionToJoin, profile, openPlayConfig, activeSport);
            alert("You're on the waitlist. We'll add you automatically when a spot opens.");
        } catch (error) {
            console.error('Error joining waitlist', error);
            alert(error instanceof Error ? error.message : 'Failed to join the waitlist.');
        } finally {
            setBookingBusy(null);
        }
    }, [user, activeSport]);

    const handleLeaveWaitlist = useCallback(async (sessionToJoin: Session) => {
        if (!user) return;
        setBookingBusy(`${sessionToJoin.id}:waitlist`);
        const profile = toBookingProfile(user);

        try {
            await leaveWaitlist(sessionToJoin, profile, activeSport);
        } catch (error) {
            console.error('Error leaving waitlist', error);
            alert(error instanceof Error ? error.message : 'Failed to leave the waitlist.');
        } finally {
            setBookingBusy(null);
        }
    }, [user, activeSport]);

    const handleCoachAction = useCallback(async (session: Session) => {
        if (!user || !isAdmin) return;
        const sessionRef = doc(db, 'sessions', session.id);

        try {
            if (session.coachId === user.uid) {
                await updateDoc(sessionRef, {
                    coachId: null,
                    coach: null
                });
            } else {
                const nameParts = user.email ? user.email.split('@')[0].split('.') : ['Coach'];
                const formattedName = nameParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

                await updateDoc(sessionRef, {
                    coachId: user.uid,
                    coach: formattedName
                });

                if (window.confirm("You've claimed the coaching slot! Would you like to download a calendar invite?")) {
                    const coachSession = {
                        ...session,
                        title: `Coaching: ${session.title}`
                    };
                    createICSFile(coachSession);
                }
            }
        } catch (error) {
            console.error("Error updating coach slot", error);
            alert("Failed to update coach slot.");
        }
    }, [user, isAdmin]);

    const cardHandlers = useMemo<BookingCardHandlers>(() => ({
        onJoin: handleJoin,
        onJoinWaitlist: handleJoinWaitlist,
        onLeaveWaitlist: handleLeaveWaitlist,
        onCoachAction: handleCoachAction,
    }), [handleJoin, handleJoinWaitlist, handleLeaveWaitlist, handleCoachAction]);

    const adminActions = useMemo<BookingAdminActions | undefined>(() => {
        if (!isAdmin) return undefined;
        return {
            onEdit: adminOps.openEditSession,
            onManageRoster: setOpsSession,
            onCancelThisWeek: adminOps.handleCancelThisWeek,
            onRestoreThisWeek: adminOps.handleRestoreThisWeek,
            onDelete: adminOps.handleDeleteSession,
        };
    }, [isAdmin, adminOps]);

    const { openPlayInstances, recurringClinicInstances, oneTimeSessions } = useMemo(() => {
        const allRecurringInstances = pickAdminOpenPlayInstances(
            getOpenPlayInstancesWithinHorizon(
                sessions,
                activeSport,
                recurringSchedules,
                disabledBuiltinSchedules,
            ),
            activeSport,
        );

        return {
            openPlayInstances: allRecurringInstances.filter(
                (item) => (item.config.sessionType ?? 'court') === 'court',
            ),
            recurringClinicInstances: allRecurringInstances.filter(
                (item) => item.config.sessionType === 'coaching',
            ),
            oneTimeSessions: filterRegularSessionsForDisplay(sessions, activeSport),
        };
    }, [sessions, activeSport, recurringSchedules, disabledBuiltinSchedules]);

    const hasDisplayContent =
        openPlayInstances.length > 0 ||
        recurringClinicInstances.length > 0 ||
        oneTimeSessions.length > 0;
    const theme = getSportTheme(activeSport);
    const accentStyle = {
        '--accent': theme.accent,
        '--accent-light': theme.accentLight,
        '--accent-dim': theme.dim,
    } as CSSProperties;

    if (loading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-court-accent border-t-transparent" />
            </div>
        );
    }

    return (
        <>
        <section id="booking-section" style={accentStyle} className="transition-[--accent] duration-500">
            <div id="radar" className="mb-10 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <p className="hud-label mb-3 text-court-accent">{sectionHud('booking')}</p>
                    <h2 className="font-display text-3xl text-gray-900 dark:text-chalk md:text-4xl">
                        Reserve your court
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-gray-500 dark:text-chalk/50">
                        Browse open play and clinic sessions across all {SPORTS.length} club sports.
                    </p>
                </div>
                <p className="hud-label text-gray-400 dark:text-chalk/40">{theme.code} · {activeSport.toUpperCase()}</p>
            </div>

            {promotionAlerts.length > 0 && (
                <div className="mb-8 space-y-3">
                    {promotionAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/30"
                        >
                            <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-court-accent" />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                                    You&apos;re off the waitlist!
                                </p>
                                <p className="mt-1 text-sm text-emerald-800/90 dark:text-emerald-200/90">
                                    {alert.court
                                        ? `You were promoted to ${alert.court} for ${alert.sessionTitle} (${alert.sessionDate}).`
                                        : `You were promoted into ${alert.sessionTitle} (${alert.sessionDate}).`}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => user && dismissNotification(user.uid, alert.id)}
                                className="rounded-lg p-1 text-emerald-700/70 transition-colors hover:text-emerald-900 dark:text-emerald-300/70 dark:hover:text-emerald-100"
                                aria-label="Dismiss"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="mb-10 flex justify-start overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex gap-2 rounded-full border border-chalk/10 bg-gray-100/80 p-1.5 dark:bg-carbon/80">
                    {displayTabs.map((sport) => {
                        const t = getSportTheme(sport);
                        const active = activeSport === sport;
                        return (
                            <button
                                key={sport}
                                onClick={() => setActiveSport(sport as Sport)}
                                data-cursor="hover"
                                className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 whitespace-nowrap ${
                                    active
                                        ? 'bg-white text-gray-900 shadow-sm dark:bg-court-800 dark:text-chalk accent-glow'
                                        : 'text-gray-500 hover:text-gray-800 dark:text-chalk/50 dark:hover:text-chalk'
                                }`}
                                style={active ? { '--accent': t.accent, '--accent-light': t.accentLight } as CSSProperties : undefined}
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${active ? 'animate-blink accent-bg' : 'bg-gray-400 dark:bg-chalk/30'}`}
                                />
                                {sport}
                            </button>
                        );
                    })}
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center text-sm text-red-600 shadow-sm dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                    {error}
                </div>
            ) : !hasDisplayContent && !isAdmin ? (
                <div className="glass-deep flex flex-col items-center justify-center p-16 text-center">
                    <Rocket className="mb-4 h-12 w-12 text-gray-300 dark:text-chalk/30" />
                    <h3 className="mb-2 font-display text-xl text-gray-900 dark:text-chalk">No upcoming sessions</h3>
                    <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-chalk/50">Check back later for court availability and coaching clinics.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-8">
                    {openPlayInstances.length > 0 && (
                        <div>
                            <p className="mb-4 text-sm text-gray-500 dark:text-chalk/50 md:hidden">
                                Swipe sideways to browse open play sessions
                            </p>
                            <div className="-mx-5 overflow-x-auto px-5 pb-2 scrollbar-hide snap-x snap-mandatory md:mx-0 md:overflow-visible md:px-0 md:pb-0">
                                <div className="flex gap-6 md:grid md:grid-cols-2 md:gap-6">
                                    {openPlayInstances.map(({ session, config, playDate, isNextWeek }) => (
                                        <BookingOpenPlayCard
                                            key={`${session.id}-${isNextWeek ? 'next' : 'this'}`}
                                            session={session}
                                            config={config}
                                            playDate={playDate}
                                            isNextWeek={isNextWeek}
                                            activeSport={activeSport}
                                            user={user}
                                            isAdmin={isAdmin}
                                            bookingBusy={bookingBusy}
                                            recurringSchedules={recurringSchedules}
                                            disabledBuiltinSchedules={disabledBuiltinSchedules}
                                            adminActions={adminActions}
                                            handlers={cardHandlers}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {recurringClinicInstances.length > 0 && (
                        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-6">
                            {recurringClinicInstances.map(({ session, playDate, isNextWeek }) => (
                                <BookingRegularCard
                                    key={`${session.id}-${isNextWeek ? 'next' : 'this'}`}
                                    session={session}
                                    recurringWeek={{ playDate, isNextWeek }}
                                    activeSport={activeSport}
                                    user={user}
                                    isAdmin={isAdmin}
                                    bookingBusy={bookingBusy}
                                    recurringSchedules={recurringSchedules}
                                    disabledBuiltinSchedules={disabledBuiltinSchedules}
                                    adminActions={adminActions}
                                    handlers={cardHandlers}
                                />
                            ))}
                        </div>
                    )}

                    {oneTimeSessions.length > 0 && (
                        <div className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-start md:gap-6">
                            {oneTimeSessions.map((session) => (
                                <BookingRegularCard
                                    key={session.id}
                                    session={session}
                                    activeSport={activeSport}
                                    user={user}
                                    isAdmin={isAdmin}
                                    bookingBusy={bookingBusy}
                                    recurringSchedules={recurringSchedules}
                                    disabledBuiltinSchedules={disabledBuiltinSchedules}
                                    adminActions={adminActions}
                                    handlers={cardHandlers}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>

        {adminOps.editingSession && (
            <EditSessionModal
                session={adminOps.editingSession}
                editCourtFields={adminOps.editCourtFields}
                recurringConfig={
                    isRecurringSession(adminOps.editingSession)
                        ? getRecurringConfigForSession(
                              adminOps.editingSession,
                              recurringSchedules,
                              disabledBuiltinSchedules,
                          )
                        : null
                }
                onSessionChange={adminOps.setEditingSession}
                onEditCourtFieldsChange={adminOps.setEditCourtFields}
                onClose={() => adminOps.setEditingSession(null)}
                onSubmit={adminOps.handleSaveSessionEdit}
            />
        )}

        {adminOps.capacityReductionPrompt && (
            <CapacityReductionModal
                prompt={adminOps.capacityReductionPrompt}
                onConfirm={adminOps.confirmCapacityReduction}
                onCancel={adminOps.cancelCapacityReduction}
            />
        )}

        {opsSession && (
            <SessionOpsModal
                session={opsSession}
                adminOps={adminOps}
                recurringSchedules={recurringSchedules}
                disabledBuiltinSchedules={disabledBuiltinSchedules}
                onClose={() => setOpsSession(null)}
            />
        )}
    </>
    );
};

export default BookingEngine;
