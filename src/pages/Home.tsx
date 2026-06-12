import { motion, useReducedMotion } from 'framer-motion';
import SocialHub from '../components/home/SocialHub';
import BookingEngine from '../components/home/BookingEngine';
import { ArrowRight, ArrowDown, ChevronRight } from 'lucide-react';

/* Decorative top-down court drawn in chalk lines, tilted like a magazine spread */
const HeroCourtArt = () => (
    <svg
        aria-hidden="true"
        viewBox="0 0 360 640"
        fill="none"
        className="absolute -right-16 top-1/2 -translate-y-1/2 h-[120%] w-auto opacity-[0.16] dark:opacity-[0.22] rotate-[14deg] pointer-events-none select-none"
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

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
        }
    };

    const rise = (delay: number) => ({
        initial: prefersReducedMotion ? false : { opacity: 0, y: 28 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] as const },
    });

    return (
        <div className="space-y-20 md:space-y-28">
            {/* ============================== HERO ============================== */}
            <section className="relative left-1/2 -translate-x-1/2 w-screen -mt-8 overflow-x-clip">
                <div className="relative min-h-[78vh] flex items-center bg-gradient-to-br from-emerald-50/60 via-white to-orange-50/50 dark:from-court-900 dark:via-court-950 dark:to-court-950 transition-colors duration-300">
                    {/* Glows */}
                    <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-0 right-[8%] w-[34rem] h-[34rem] bg-court-accent/10 dark:bg-court-accent/15 blur-[130px] rounded-full" />
                        <div className="absolute -bottom-32 left-[2%] w-[28rem] h-[28rem] bg-clay-500/15 dark:bg-clay-600/20 blur-[120px] rounded-full" />
                        <div className="text-court-700 dark:text-court-line hidden md:block absolute inset-y-0 right-0 w-1/2">
                            <HeroCourtArt />
                        </div>
                        {/* Floating ball */}
                        <div className="hidden md:block absolute top-[22%] right-[16%] animate-float-slow">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-lime-300 to-lime-500 shadow-[0_0_34px_rgba(163,230,53,0.5)]">
                                <div className="w-full h-full rounded-full border-[1.5px] border-white/50 [clip-path:ellipse(46%_28%_at_50%_50%)]" />
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24">
                        <div className="max-w-3xl">
                            <motion.div {...rise(0)} className="flex items-center gap-4 mb-7">
                                <span className="h-px w-12 bg-wimbledon-gold" aria-hidden="true" />
                                <span className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.35em] text-wimbledon-gold">
                                    Fuqua Racquets Club &middot; Est. 2025
                                </span>
                            </motion.div>

                            <motion.h1
                                {...rise(0.08)}
                                className="font-display text-5xl sm:text-7xl lg:text-8xl leading-[1.02] text-wimbledon-navy dark:text-court-line tracking-tight"
                            >
                                The court
                                <br />
                                is <em className="italic text-clay-500 dark:text-clay-300 text-glow-gold">calling.</em>
                            </motion.h1>

                            <motion.p
                                {...rise(0.18)}
                                className="mt-7 text-base sm:text-lg font-light text-gray-700 dark:text-court-line/70 max-w-2xl leading-relaxed"
                            >
                                The Racquets Club aims to create a sense of community by providing a place for all racquet
                                sports players (tennis, pickleball, squash, and more) and of all levels the opportunity to
                                play and socialize. We host hitting events and social events to bring together members of
                                the Fuqua community, Duke community, and greater Durham community.
                            </motion.p>

                            <motion.div {...rise(0.28)} className="flex flex-col sm:flex-row gap-4 pt-9">
                                <button
                                    onClick={() => scrollToSection('booking-section')}
                                    className="clay-gradient px-8 py-4 rounded-full text-white font-bold text-base sm:text-lg hover:scale-[1.03] motion-reduce:hover:scale-100 transition-all shadow-[0_18px_44px_-12px_rgba(199,93,61,0.55)] flex items-center justify-center gap-2 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay-300"
                                >
                                    Join Session
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => scrollToSection('news-section')}
                                    className="text-wimbledon-navy dark:text-court-line hover:text-clay-600 dark:hover:text-wimbledon-gold px-6 py-3 font-semibold transition-colors flex items-center justify-center cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wimbledon-gold rounded-full"
                                >
                                    Club News <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            </motion.div>

                            <motion.div
                                {...rise(0.4)}
                                className="mt-14 flex flex-wrap items-center gap-x-10 gap-y-4 text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-court-line/40 font-semibold"
                            >
                                <span>Tennis</span>
                                <span className="text-clay-500 dark:text-clay-400" aria-hidden="true">&bull;</span>
                                <span>Pickleball</span>
                                <span className="text-clay-500 dark:text-clay-400" aria-hidden="true">&bull;</span>
                                <span>Squash</span>
                                <span className="text-clay-500 dark:text-clay-400" aria-hidden="true">&bull;</span>
                                <span>Badminton</span>
                            </motion.div>
                        </div>
                    </div>

                    {/* Scroll cue */}
                    <div aria-hidden="true" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-400 dark:text-court-line/30 motion-safe:animate-bounce">
                        <ArrowDown className="w-5 h-5" />
                    </div>
                </div>
                {/* Chalk baseline under the hero */}
                <div aria-hidden="true" className="h-px w-full bg-gradient-to-r from-transparent via-court-line/40 dark:via-court-line/20 to-transparent" />
            </section>

            {/* ===================== EVENTS + NEWS (editorial band) ===================== */}
            <div className="scroll-rise">
                <SocialHub />
            </div>

            {/* ============================ BOOKING ============================ */}
            <div className="scroll-rise">
                <BookingEngine />
            </div>
        </div>
    );
};

export default Home;
