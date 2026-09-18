import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, CalendarPlus, ChevronDown, ChevronUp, LayoutGrid, LogIn, MousePointerClick } from 'lucide-react';
import BookingEngine from '../components/home/BookingEngine';
import Footer from '../components/home/Footer';
import { useAuth } from '../contexts/AuthContext';
import { useGoToLogin } from '../hooks/useGoToLogin';
import { formatMemberFirstName } from '../lib/memberNames';
import { COURTS_PATH } from '../lib/siteNav';
import { SPORTS, parseSportSlug } from '../lib/sports';

const HOW_IT_WORKS_HIDDEN_KEY = 'courts_how_it_works_hidden';

const STEPS = [
    {
        Icon: LogIn,
        title: 'Sign in',
        body: 'One-time email link to your firstname.lastname@duke.edu inbox. No password.',
    },
    {
        Icon: LayoutGrid,
        title: 'Pick your sport',
        body: `Switch tabs between ${SPORTS.length} club sports. Hide or reorder them any time.`,
    },
    {
        Icon: MousePointerClick,
        title: 'Tap an open spot',
        body: 'Choose a court on the diagram or use Join. Full session? Join the shared waitlist.',
    },
    {
        Icon: CalendarPlus,
        title: 'Add it to your calendar',
        body: 'Download the invite after booking. Next week opens Sunday at 5:00 PM ET.',
    },
] as const;

const readHowItWorksHidden = (): boolean => {
    try {
        return window.localStorage.getItem(HOW_IT_WORKS_HIDDEN_KEY) === '1';
    } catch {
        return false;
    }
};

const Courts = () => {
    const { sport: sportSlug } = useParams<{ sport?: string }>();
    const { user } = useAuth();
    const goToLogin = useGoToLogin();
    const prefersReducedMotion = useReducedMotion();
    const [howItWorksHidden, setHowItWorksHidden] = useState(false);

    useEffect(() => {
        setHowItWorksHidden(readHowItWorksHidden());
    }, []);

    const setHowItWorksPreference = (hidden: boolean) => {
        setHowItWorksHidden(hidden);
        try {
            if (hidden) window.localStorage.setItem(HOW_IT_WORKS_HIDDEN_KEY, '1');
            else window.localStorage.removeItem(HOW_IT_WORKS_HIDDEN_KEY);
        } catch {
            /* storage unavailable */
        }
    };

    const initialSport = parseSportSlug(sportSlug);
    if (sportSlug && !initialSport) {
        return <Navigate to={COURTS_PATH} replace />;
    }

    const rise = (delay: number) => ({
        initial: prefersReducedMotion ? false : { opacity: 0, y: 24 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
    });

    const firstName = user ? formatMemberFirstName(user.email, user.displayName) : null;

    return (
        <main className="min-h-screen">
            {/* Compact hero */}
            <section className="relative overflow-hidden">
                <div className="relative bg-gradient-to-br from-emerald-50/70 via-[#F3F0E8] to-orange-50/40 pt-28 dark:from-court-900 dark:via-court-950 dark:to-court-950 md:pt-32">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute right-[6%] top-0 h-[24rem] w-[24rem] rounded-full bg-court-accent/10 blur-3xl dark:bg-court-accent/15 md:blur-[80px]" />
                        <div className="absolute -bottom-24 left-[4%] h-[20rem] w-[20rem] rounded-full bg-clay-500/12 blur-3xl dark:bg-clay-600/18 md:blur-[72px]" />
                    </div>

                    <div className="relative z-10 mx-auto max-w-7xl px-5 pb-12 md:px-10 md:pb-14">
                        <motion.div {...rise(0)} className="mb-6 flex items-center gap-4">
                            <span className="h-px w-12 bg-wimbledon-gold" aria-hidden="true" />
                            <span className="text-[11px] font-bold uppercase tracking-editorial text-wimbledon-gold sm:text-xs">
                                Fuqua Racquets Club · Court Bookings
                            </span>
                        </motion.div>

                        <motion.h1
                            {...rise(0.08)}
                            className="font-display text-4xl leading-[1.05] tracking-tight text-wimbledon-navy dark:text-court-line sm:text-6xl lg:text-7xl"
                        >
                            Book a{' '}
                            <em className="italic text-clay-500 text-glow-gold dark:text-clay-300">Court</em>
                        </motion.h1>

                        <motion.p
                            {...rise(0.16)}
                            className="mt-5 max-w-2xl text-base font-light leading-relaxed text-gray-700 dark:text-court-line/70 sm:text-lg"
                        >
                            Open play and coaching clinics across all five club sports, in one place. Pick a sport,
                            pick a session, and take your spot.
                        </motion.p>

                        <motion.div
                            {...rise(0.24)}
                            className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
                        >
                            {user ? (
                                <p className="text-sm text-gray-600 dark:text-chalk/60">
                                    Signed in as{' '}
                                    <span className="font-semibold text-gray-900 dark:text-chalk">{firstName}</span>.
                                    You&apos;re ready to book.
                                </p>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={goToLogin}
                                        data-cursor="hover"
                                        className="clay-gradient inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white shadow-[0_14px_36px_-12px_rgba(199,93,61,0.55)] transition-transform hover:scale-[1.02]"
                                    >
                                        <LogIn className="h-4 w-4" aria-hidden="true" />
                                        Sign in to book
                                    </button>
                                    <p className="text-sm text-gray-500 dark:text-chalk/50">
                                        Fuqua members only. You can browse the schedule without signing in.
                                    </p>
                                </>
                            )}
                        </motion.div>
                    </div>
                </div>
                <div
                    aria-hidden="true"
                    className="h-px w-full bg-gradient-to-r from-transparent via-court-line/30 to-transparent dark:via-court-line/15"
                />
            </section>

            {/* How it works — collapsible; preference remembered in localStorage */}
            <section aria-labelledby="courts-how-it-works" className="mx-auto max-w-7xl px-5 pt-10 md:px-10 md:pt-12">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h2 id="courts-how-it-works" className="hud-label text-gray-400 dark:text-chalk/40">
                        How it works
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/help"
                            data-cursor
                            className="inline-flex items-center gap-1 text-xs font-semibold text-clay-600 transition-colors hover:text-clay-500 dark:text-clay-300 dark:hover:text-clay-200"
                        >
                            Full FAQ
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                        </Link>
                        <button
                            type="button"
                            onClick={() => setHowItWorksPreference(!howItWorksHidden)}
                            data-cursor
                            aria-expanded={!howItWorksHidden}
                            aria-controls="courts-how-it-works-panel"
                            className="inline-flex min-h-9 touch-manipulation items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-court-accent/40 hover:text-wimbledon-navy dark:border-chalk/15 dark:text-chalk/60 dark:hover:border-court-accent/50 dark:hover:text-chalk"
                        >
                            {howItWorksHidden ? (
                                <>
                                    Show guide
                                    <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                                </>
                            ) : (
                                <>
                                    Hide guide
                                    <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {!howItWorksHidden && (
                    <ol
                        id="courts-how-it-works-panel"
                        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
                    >
                        {STEPS.map(({ Icon, title, body }, i) => (
                            <motion.li
                                key={title}
                                {...rise(0.06 + i * 0.05)}
                                className="glass-deep flex gap-4 p-4 dark:border-chalk/10 dark:bg-court-900/60"
                            >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-court-accent/10 dark:text-court-accent">
                                    <Icon className="h-5 w-5" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <p className="hud-label text-[10px] text-gray-400 dark:text-chalk/35">
                                        {String(i + 1).padStart(2, '0')}
                                    </p>
                                    <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-chalk">{title}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-500 dark:text-chalk/55">{body}</p>
                                </div>
                            </motion.li>
                        ))}
                    </ol>
                )}
            </section>

            {/* Booking engine — same max width as the hero so the columns line up */}
            <div className="mx-auto max-w-7xl px-5 pt-12 pb-10 md:px-10 md:pt-14 md:pb-12">
                <BookingEngine
                    initialSport={initialSport}
                    heading="Pick a session"
                    subheading="Choose a sport tab, then tap an open spot on a court."
                />
            </div>

            {/* Back to main site */}
            <section className="mx-auto max-w-7xl px-5 pb-16 md:px-10 md:pb-20">
                <div className="flex flex-col gap-4 border-y border-gray-200 py-8 dark:border-chalk/10 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="hud-label mb-1.5 text-court-accent">More from the club</p>
                        <p className="text-sm text-gray-600 dark:text-chalk/60">
                            Events, club news, and the Club Wire ticker live on the main site.
                        </p>
                    </div>
                    <Link
                        to="/"
                        data-cursor="hover"
                        className="inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition-colors hover:border-court-accent/40 hover:text-wimbledon-navy dark:border-chalk/20 dark:text-chalk dark:hover:border-court-accent/50"
                    >
                        Visit the main site
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                </div>
            </section>

            <Footer />
        </main>
    );
};

export default Courts;
