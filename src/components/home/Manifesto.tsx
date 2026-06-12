import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

/*
 * ACT II — the creed. The club's mission rendered as a scroll-lit
 * editorial wall: words ignite from ghost to chalk as you pass.
 */

const CREED =
    'The Racquets Club exists to create community — a place for every racquet sport and every level of player to rally, compete and socialize. Fuqua, Duke, and greater Durham: one grid, under the lights.';

const STATS = [
    { value: '12', label: 'PRO SURFACES' },
    { value: '03', label: 'DISCIPLINES' },
    { value: '52', label: 'WEEKS LIVE' },
    { value: '∞', label: 'RALLIES' },
];

const IgnitingText = ({ text }: { text: string }) => {
    const ref = useRef<HTMLParagraphElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ['start 0.85', 'start 0.3'],
    });

    const words = text.split(' ');

    return (
        <p ref={ref} className="display-narrow flex flex-wrap gap-x-[0.45ch] gap-y-1 text-[clamp(1.7rem,4.6vw,4rem)] uppercase leading-[1.04]">
            {words.map((word, i) => {
                const start = i / words.length;
                const end = start + 1 / words.length;
                return <Word key={i} progress={scrollYProgress} range={[start, end]} word={word} />;
            })}
        </p>
    );
};

const Word = ({
    word,
    progress,
    range,
}: {
    word: string;
    progress: ReturnType<typeof useScroll>['scrollYProgress'];
    range: [number, number];
}) => {
    const opacity = useTransform(progress, range, [0.14, 1]);
    const isKeyword = ['community', 'rally,', 'grid,', 'lights.'].includes(word.toLowerCase());
    return (
        <motion.span style={{ opacity }} className={isKeyword ? 'serif-ital normal-case text-ace' : 'text-chalk'}>
            {word}
        </motion.span>
    );
};

const Manifesto = () => {
    return (
        <section className="relative px-5 py-28 md:px-12 md:py-40">
            <div className="mb-10 flex items-baseline justify-between">
                <span className="hud-label text-ace">01 / THE CREED</span>
                <span className="hud-label text-chalk/40">EVERY LEVEL — EVERY RACQUET</span>
            </div>

            <div className="max-w-6xl">
                <IgnitingText text={CREED} />
            </div>

            {/* telemetry stats */}
            <div className="mt-24 grid grid-cols-2 gap-px bg-chalk/10 md:grid-cols-4">
                {STATS.map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        className="flex flex-col gap-3 bg-court px-6 py-10 transition-colors hover:bg-carbon"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: '-10%' }}
                        transition={{ delay: i * 0.08, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className="display-tight text-6xl text-chalk md:text-7xl">
                            {stat.value}
                            <span className="text-ace">*</span>
                        </span>
                        <span className="hud-label text-chalk/50">{stat.label}</span>
                    </motion.div>
                ))}
            </div>
        </section>
    );
};

export default Manifesto;
