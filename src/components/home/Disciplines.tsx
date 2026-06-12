import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLenis } from 'lenis/react';

/*
 * ACT III — the arsenal. Three disciplines as a giant kinetic index;
 * hovering re-arms the row with its signature frequency color.
 */

const DISCIPLINES = [
    {
        id: 'Tennis',
        index: '001',
        accent: '#D7FF3E',
        schedule: 'TUE + THU — 21:00–23:00',
        venue: 'CARD GYM COURTS 2–5',
        blurb: 'open play & friday clinics',
    },
    {
        id: 'Badminton',
        index: '002',
        accent: '#6FA8FF',
        schedule: 'WED — 15:00–16:00',
        venue: 'COURTS 1–2',
        blurb: 'feathers at full velocity',
    },
    {
        id: 'Squash',
        index: '003',
        accent: '#FF6A3D',
        schedule: 'MON — 18:00–20:00',
        venue: 'GLASS BOX 1–2',
        blurb: 'the pressure chamber',
    },
];

const Disciplines = () => {
    const lenis = useLenis();
    const [hovered, setHovered] = useState<string | null>(null);

    const jumpToRadar = () => {
        const el = document.getElementById('radar');
        if (el) lenis?.scrollTo(el, { duration: 1.4, offset: -10 });
    };

    return (
        <section className="relative py-24 md:py-32">
            <div className="mb-10 flex items-baseline justify-between px-5 md:px-12">
                <span className="hud-label text-ace">01.5 / THE ARSENAL</span>
                <span className="hud-label text-chalk/40">SELECT A FREQUENCY ↓</span>
            </div>

            <div className="hairline-t">
                {DISCIPLINES.map((d, i) => {
                    const isHover = hovered === d.id;
                    return (
                        <motion.button
                            key={d.id}
                            onClick={jumpToRadar}
                            onMouseEnter={() => setHovered(d.id)}
                            onMouseLeave={() => setHovered(null)}
                            data-cursor="hover"
                            data-cursor-label="ENTER RADAR"
                            className="hairline-b group relative block w-full overflow-hidden text-left"
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true, margin: '-5%' }}
                            transition={{ delay: i * 0.08, duration: 0.6 }}
                        >
                            {/* accent flood on hover */}
                            <motion.div
                                className="absolute inset-0"
                                style={{ background: d.accent }}
                                initial={false}
                                animate={{ y: isHover ? '0%' : '101%' }}
                                transition={{ duration: 0.45, ease: [0.76, 0, 0.24, 1] }}
                            />

                            <div className="relative z-10 flex flex-col gap-2 px-5 py-8 md:flex-row md:items-center md:gap-10 md:px-12 md:py-10">
                                <span
                                    className={`hud-label transition-colors duration-300 ${isHover ? 'text-court' : 'text-chalk/40'}`}
                                >
                                    {d.index}
                                </span>

                                <motion.h3
                                    className={`display-tight text-[clamp(2.8rem,8.5vw,7.5rem)] uppercase transition-colors duration-300 ${isHover ? 'text-court' : 'text-chalk'}`}
                                    animate={{ x: isHover ? 24 : 0 }}
                                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    {d.id}
                                </motion.h3>

                                <span
                                    className={`serif-ital text-xl transition-colors duration-300 md:text-2xl ${isHover ? 'text-court/80' : 'text-chalk/45'}`}
                                >
                                    {d.blurb}
                                </span>

                                <div className="md:ml-auto md:text-right">
                                    <p className={`hud-label transition-colors duration-300 ${isHover ? 'text-court' : 'text-chalk/60'}`}>
                                        {d.schedule}
                                    </p>
                                    <p className={`hud-label transition-colors duration-300 ${isHover ? 'text-court/70' : 'text-chalk/35'}`}>
                                        {d.venue}
                                    </p>
                                </div>

                                <motion.span
                                    className={`display-tight hidden text-5xl md:block ${isHover ? 'text-court' : 'text-chalk/30'}`}
                                    animate={{ x: isHover ? -10 : 0, rotate: isHover ? -45 : 0 }}
                                    transition={{ duration: 0.4 }}
                                >
                                    →
                                </motion.span>
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </section>
    );
};

export default Disciplines;
