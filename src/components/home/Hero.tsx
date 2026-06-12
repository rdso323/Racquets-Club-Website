import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { HeroScene } from '../three/scenes';
import { RevealLines } from '../system/kinetic';

/*
 * ACT I — the cathedral. Full-bleed WebGL court flythrough under
 * a stacked typographic monument. Scroll feeds the camera dolly.
 */
const Hero = () => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start start', 'end start'],
    });

    const typeY = useTransform(scrollYProgress, [0, 1], ['0%', '38%']);
    const typeOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
    const hudOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0]);

    return (
        <section ref={ref} className="relative h-[130vh]">
            <div className="sticky top-0 h-screen overflow-hidden">
                {/* WebGL court */}
                <HeroScene scrollProgress={scrollYProgress} />

                {/* radial vignette to seat the type */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,#070907_92%)]" />

                {/* Typographic monument */}
                <motion.div
                    style={{ y: typeY, opacity: typeOpacity }}
                    className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center"
                >
                    <motion.p
                        className="hud-label mb-6 text-ace"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35, duration: 0.7 }}
                    >
                        ● DUKE / FUQUA — MEMBERS FREQUENCY — EST. 2025
                    </motion.p>

                    <RevealLines
                        delay={0.45}
                        lines={[
                            <span key="1" className="display-tight block text-[clamp(3.4rem,12.5vw,12rem)] text-chalk">
                                FUQUA
                            </span>,
                            <span key="2" className="display-tight block text-[clamp(3.4rem,12.5vw,12rem)] text-hollow">
                                RACQUETS
                            </span>,
                            <span key="3" className="display-tight block text-[clamp(3.4rem,12.5vw,12rem)] text-chalk">
                                CLUB<span className="text-ace">.</span>
                                <span className="serif-ital ml-4 align-middle text-[0.3em] font-normal text-chalk/80 md:ml-8">
                                    after dark
                                </span>
                            </span>,
                        ]}
                    />

                    <motion.p
                        className="hud-label mt-8 max-w-md leading-relaxed text-chalk/60"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.1, duration: 0.8 }}
                    >
                        TENNIS / BADMINTON / SQUASH — ONE GRID.
                        <br />EVERY RALLY LOGGED. EVERY COURT LIVE.
                    </motion.p>
                </motion.div>

                {/* HUD corners */}
                <motion.div style={{ opacity: hudOpacity }} className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-6 md:px-8">
                    <span className="hud-label hidden text-chalk/50 md:block">35.9940°N / 78.8986°W</span>
                    <motion.span
                        className="hud-label flex flex-col items-center gap-2 text-chalk/70"
                        animate={{ y: [0, 7, 0] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        SCROLL TO ENTER
                        <span className="block h-8 w-px bg-gradient-to-b from-ace to-transparent" />
                    </motion.span>
                    <span className="hud-label hidden text-chalk/50 md:block">SYS.V2 — AFTER DARK</span>
                </motion.div>
            </div>
        </section>
    );
};

export default Hero;
