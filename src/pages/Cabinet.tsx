import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Footer from '../components/home/Footer';
import CabinetMemberPortrait from '../components/cabinet/CabinetMemberPortrait';
import {
    CABINET_CO_PRESIDENTS,
    CABINET_OFFICERS,
    CABINET_YEAR,
} from '../lib/cabinet';
import { sectionHud } from '../lib/siteNav';
import { useHomeSectionNavigation } from '../hooks/useHomeSectionNavigation';

const HeroCourtArt = () => (
    <svg
        aria-hidden="true"
        viewBox="0 0 360 640"
        fill="none"
        className="pointer-events-none absolute -right-20 top-1/2 h-[110%] w-auto -translate-y-1/2 rotate-[12deg] select-none opacity-[0.12] dark:opacity-[0.18]"
    >
        <g stroke="currentColor" strokeWidth="2.5">
            <rect x="30" y="20" width="300" height="600" rx="2" />
            <line x1="70" y1="20" x2="70" y2="620" />
            <line x1="290" y1="20" x2="290" y2="620" />
            <line x1="70" y1="170" x2="290" y2="170" />
            <line x1="70" y1="470" x2="290" y2="470" />
            <line x1="180" y1="170" x2="180" y2="470" />
            <line x1="24" y1="320" x2="336" y2="320" strokeWidth="5" strokeDasharray="10 7" />
        </g>
    </svg>
);

const Cabinet = () => {
    const prefersReducedMotion = useReducedMotion();
    const { scrollToHomeSection } = useHomeSectionNavigation();

    const rise = (delay: number) => ({
        initial: prefersReducedMotion ? false : { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
    });

    return (
        <main className="min-h-screen">
            {/* Hero */}
            <section className="relative overflow-hidden">
                <div className="relative bg-gradient-to-br from-emerald-50/70 via-[#F3F0E8] to-orange-50/40 pt-28 dark:from-court-900 dark:via-court-950 dark:to-court-950 md:pt-32">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute right-[6%] top-0 h-[28rem] w-[28rem] rounded-full bg-court-accent/10 blur-3xl dark:bg-court-accent/15 md:blur-[80px]" />
                        <div className="absolute -bottom-24 left-[4%] h-[22rem] w-[22rem] rounded-full bg-clay-500/12 blur-3xl dark:bg-clay-600/18 md:blur-[72px]" />
                        <div className="absolute inset-y-0 right-0 hidden w-1/2 text-court-700 dark:text-court-line md:block">
                            <HeroCourtArt />
                        </div>
                    </div>

                    <div className="relative z-10 mx-auto max-w-7xl px-5 pb-16 md:px-10 md:pb-20">
                        <motion.div {...rise(0)} className="mb-6 flex items-center gap-4">
                            <span className="h-px w-12 bg-wimbledon-gold" aria-hidden="true" />
                            <span className="text-[11px] font-bold uppercase tracking-editorial text-wimbledon-gold sm:text-xs">
                                Cabinet · {CABINET_YEAR}
                            </span>
                        </motion.div>

                        <p className="hud-label mb-3 text-court-accent">{sectionHud('cabinet')}</p>

                        <motion.h1
                            {...rise(0.08)}
                            className="font-display text-4xl leading-[1.05] tracking-tight text-wimbledon-navy dark:text-court-line sm:text-6xl lg:text-7xl"
                        >
                            Meet the{' '}
                            <em className="italic text-clay-500 text-glow-gold dark:text-clay-300">Cabinet</em>
                        </motion.h1>

                        <motion.p
                            {...rise(0.18)}
                            className="mt-6 max-w-2xl text-base font-light leading-relaxed text-gray-700 dark:text-court-line/70 sm:text-lg"
                        >
                            The student leaders steering Fuqua Racquets Club across five sports — open play,
                            clinics, events, and the day-to-day of club life.
                        </motion.p>
                    </div>
                </div>
            </section>

            {/* Co-Presidents */}
            <section className="mx-auto max-w-5xl px-5 py-12 md:px-10 md:py-16">
                <div className="mb-8">
                    <p className="hud-label mb-3 text-emerald-600 dark:text-court-accent">Leadership</p>
                    <h2 className="font-display text-3xl text-gray-900 dark:text-chalk md:text-4xl">
                        Co-Presidents
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6">
                    {CABINET_CO_PRESIDENTS.map((member, i) => (
                        <CabinetMemberPortrait
                            key={member.id}
                            member={member}
                            size="featured"
                            index={i}
                        />
                    ))}
                </div>
            </section>

            {/* Officers */}
            <section className="border-t border-gray-200/80 bg-[#FAF8F3]/60 dark:border-chalk/10 dark:bg-court-950/40">
                <div className="mx-auto max-w-6xl px-5 py-12 md:px-10 md:py-16">
                    <div className="mb-8">
                        <p className="hud-label mb-3 text-emerald-600 dark:text-court-accent">Operations</p>
                        <h2 className="font-display text-3xl text-gray-900 dark:text-chalk md:text-4xl">
                            Sport Leads &amp; Treasury
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-6 sm:gap-y-10">
                        {CABINET_OFFICERS.map((member, i) => (
                            <CabinetMemberPortrait key={member.id} member={member} index={i} />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-20">
                <div className="flex flex-col gap-6 border-y border-gray-200 py-10 dark:border-chalk/10 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="hud-label mb-2 text-court-accent">Get involved</p>
                        <h2 className="font-display text-2xl text-gray-900 dark:text-chalk md:text-3xl">
                            Play with the club this week
                        </h2>
                        <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-500 dark:text-chalk/50">
                            Book an open play or clinic session, or browse FAQ if you&apos;re new to the roster.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => scrollToHomeSection('booking-section')}
                            data-cursor="hover"
                            className="clay-gradient inline-flex min-h-11 touch-manipulation items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-transform hover:scale-[1.02]"
                        >
                            Book a Court
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <Link
                            to="/help"
                            data-cursor="hover"
                            className="inline-flex min-h-11 touch-manipulation items-center justify-center rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-800 transition-colors hover:border-court-accent/40 hover:text-wimbledon-navy dark:border-chalk/20 dark:text-chalk dark:hover:border-court-accent/50"
                        >
                            Help &amp; FAQ
                        </Link>
                    </div>
                </div>
            </section>

            <Footer />
        </main>
    );
};

export default Cabinet;
