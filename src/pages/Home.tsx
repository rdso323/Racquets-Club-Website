import { useEffect } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { useLenis } from 'lenis/react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import BookingEngine from '../components/home/BookingEngine';
import Transmissions from '../components/home/Transmissions';
import Footer from '../components/home/Footer';
import LiveWire from '../components/system/LiveWire';
import { SPORTS } from '../lib/sports';
import { sectionHud } from '../lib/siteNav';

const HeroCourtArt = () => (
    <svg
        aria-hidden="true"
        viewBox="0 0 360 640"
        fill="none"
        className="pointer-events-none absolute -right-16 top-1/2 h-[120%] w-auto -translate-y-1/2 rotate-[14deg] select-none opacity-[0.14] dark:opacity-[0.2]"
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

const Home = () => {
    const prefersReducedMotion = useReducedMotion();
    const location = useLocation();
    const lenis = useLenis();
    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [140, 780], [1, 0]);
    const heroY = useTransform(scrollY, [140, 880], [0, 80]);
    const scrollCueOpacity = useTransform(scrollY, [100, 360], [1, 0]);

    useEffect(() => {
        if (location.hash === '#booking-section' || location.hash === '#radar') {
            const t = window.setTimeout(() => {
                const el = document.getElementById('booking-section');
                if (el) lenis?.scrollTo(el, { duration: 1.4, offset: -80 });
            }, 600);
            return () => window.clearTimeout(t);
        }
    }, [location.hash, lenis]);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) lenis?.scrollTo(el, { duration: 1.2, offset: -80 });
    };

    const rise = (delay: number) => ({
        initial: prefersReducedMotion ? false : { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
    });

    return (
        <motion.main initial={false}>
            {/* Hero — editorial full-bleed */}
            <section className="relative w-full overflow-hidden">
                <motion.div
                    style={prefersReducedMotion ? undefined : { opacity: heroOpacity, y: heroY }}
                    className="relative min-h-[88vh] flex items-center bg-gradient-to-br from-emerald-50/70 via-[#F3F0E8] to-orange-50/40 dark:from-court-900 dark:via-court-950 dark:to-court-950"
                >
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute right-[8%] top-0 h-[34rem] w-[34rem] rounded-full bg-court-accent/10 blur-3xl dark:bg-court-accent/15 md:blur-[80px]" />
                        <div className="absolute -bottom-32 left-[2%] h-[28rem] w-[28rem] rounded-full bg-clay-500/15 blur-3xl dark:bg-clay-600/20 md:blur-[72px]" />
                        <div className="absolute inset-y-0 right-0 hidden w-1/2 text-court-700 dark:text-court-line md:block">
                            <HeroCourtArt />
                        </div>
                        <div className="absolute right-[16%] top-[22%] hidden animate-float-slow md:block">
                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-lime-300 to-lime-500 shadow-[0_0_34px_rgba(163,230,53,0.45)]">
                                <div className="h-full w-full rounded-full border-[1.5px] border-white/50 [clip-path:ellipse(46%_28%_at_50%_50%)]" />
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mx-auto w-full max-w-7xl px-5 py-24 md:px-10 md:py-28">
                        <div className="max-w-3xl">
                            <motion.div {...rise(0)} className="mb-4">
                                <p className="hud-label text-court-accent">{sectionHud('home')}</p>
                            </motion.div>
                            <motion.div {...rise(0.04)} className="mb-7 flex items-center gap-4">
                                <span className="h-px w-12 bg-wimbledon-gold" aria-hidden="true" />
                                <span className="text-[11px] font-bold uppercase tracking-editorial text-wimbledon-gold sm:text-xs">
                                    Fuqua Racquets Club · Est. 2025
                                </span>
                            </motion.div>

                            <motion.h1
                                {...rise(0.1)}
                                className="font-display text-5xl leading-[1.02] tracking-tight text-wimbledon-navy dark:text-court-line sm:text-7xl lg:text-8xl"
                            >
                                Five sports.
                                <br />
                                <em className="italic text-clay-500 text-glow-gold dark:text-clay-300">One club.</em>
                            </motion.h1>

                            <motion.p
                                {...rise(0.18)}
                                className="mt-7 max-w-2xl text-base font-light leading-relaxed text-gray-700 dark:text-court-line/70 sm:text-lg"
                            >
                                A community for racquet sports players of every level — tennis, pickleball, squash,
                                badminton, and more. We host open play and social events for the Fuqua, Duke, and
                                greater Durham communities.
                            </motion.p>

                            <motion.div {...rise(0.28)} className="flex flex-col gap-4 pt-9 sm:flex-row">
                                <button
                                    onClick={() => scrollToSection('booking-section')}
                                    data-cursor="hover"
                                    className="clay-gradient flex cursor-pointer items-center justify-center gap-2 rounded-full px-8 py-4 text-base font-bold text-white shadow-[0_18px_44px_-12px_rgba(199,93,61,0.55)] transition-all hover:scale-[1.02] sm:text-lg"
                                >
                                    Join Session
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => scrollToSection('news-section')}
                                    data-cursor="hover"
                                    className="flex cursor-pointer items-center justify-center rounded-full px-6 py-3 font-semibold text-wimbledon-navy transition-colors hover:text-clay-600 dark:text-court-line dark:hover:text-wimbledon-gold"
                                >
                                    Club News <ArrowRight className="ml-2 h-4 w-4" />
                                </button>
                            </motion.div>

                            <motion.div
                                {...rise(0.4)}
                                className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500 dark:text-court-line/40"
                            >
                                {SPORTS.map((sport, i) => (
                                    <span key={sport} className="inline-flex items-center gap-x-6">
                                        {i > 0 && (
                                            <span className="text-clay-500 dark:text-clay-400" aria-hidden="true">·</span>
                                        )}
                                        {sport}
                                    </span>
                                ))}
                            </motion.div>
                        </div>
                    </div>

                    <motion.div
                        style={prefersReducedMotion ? undefined : { opacity: scrollCueOpacity }}
                        className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-chalk/40"
                        aria-hidden="true"
                    >
                        <span className="hud-label text-gray-400 dark:text-court-line/35">Scroll to explore</span>
                        <span className="block h-8 w-px bg-gradient-to-b from-court-accent/60 to-transparent motion-safe:animate-bounce" />
                    </motion.div>
                </motion.div>

                <div
                    aria-hidden="true"
                    className="h-px w-full bg-gradient-to-r from-transparent via-court-line/30 to-transparent dark:via-court-line/15"
                />
            </section>

            <LiveWire id="primary-ticker" dismissOnScroll flipped />

            <div className="scroll-rise px-5 pt-12 pb-10 md:px-10 md:pt-16 md:pb-12">
                <BookingEngine />
            </div>

            <Transmissions />
            <LiveWire flipped />
            <Footer />
        </motion.main>
    );
};

export default Home;
