import { motion } from 'framer-motion';
import { useLenis } from 'lenis/react';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../system/UIProvider';
import { useTransitionRouter } from '../system/TransitionProvider';
import { Magnetic, VelocityMarquee } from '../system/kinetic';

/*
 * END CREDITS — a final typographic detonation, the call to court,
 * and the service hatches (feedback / access / control).
 */
const Footer = () => {
    const { user, isAdmin } = useAuth();
    const { openFeedback } = useUI();
    const { go } = useTransitionRouter();
    const lenis = useLenis();

    const backToRadar = () => {
        const el = document.getElementById('radar');
        if (el) lenis?.scrollTo(el, { duration: 1.6 });
    };

    return (
        <footer className="relative overflow-hidden pt-24">
            {/* closing marquee */}
            <VelocityMarquee baseVelocity={-2.6} itemClassName="pr-10" copies={4} className="hairline-t hairline-b py-4">
                <span className="display-tight text-4xl uppercase text-hollow md:text-6xl">
                    SEE YOU ON COURT — AFTER DARK — FUQUA RACQUETS CLUB —&nbsp;
                </span>
            </VelocityMarquee>

            <div className="px-5 py-20 md:px-12 md:py-28">
                <div className="flex flex-col items-start justify-between gap-14 md:flex-row md:items-end">
                    <div>
                        <p className="hud-label mb-6 text-ace">FINAL TRANSMISSION</p>
                        <h2 className="display-tight text-[clamp(3rem,10vw,9.5rem)] text-chalk">
                            BRING
                            <br />
                            YOUR <span className="serif-ital font-normal text-ace">game.</span>
                        </h2>

                        <Magnetic className="mt-10 inline-block">
                            <button
                                onClick={user ? backToRadar : () => go('/login', 'ACCESS')}
                                data-cursor="hover"
                                data-cursor-label={user ? 'RADAR' : 'AIRLOCK'}
                                className="group flex items-center gap-4 bg-ace px-8 py-5 font-mono text-sm uppercase tracking-hud text-court transition-all hover:brightness-110"
                            >
                                {user ? '↑ RETURN TO RADAR' : 'REQUEST ACCESS →'}
                            </button>
                        </Magnetic>
                    </div>

                    {/* hatch grid */}
                    <div className="grid w-full max-w-sm grid-cols-2 gap-px bg-chalk/10 md:w-auto">
                        {[
                            { label: 'TRANSMIT FEEDBACK', sub: 'BUGS / IDEAS', action: openFeedback },
                            user
                                ? { label: 'MEMBER ACTIVE', sub: (user.email || '').toUpperCase(), action: backToRadar }
                                : { label: 'MEMBER ACCESS', sub: 'DUKE.EDU ONLY', action: () => go('/login', 'ACCESS') },
                            ...(isAdmin ? [{ label: 'CONTROL DECK', sub: 'ADMIN OPS', action: () => go('/admin', 'CONTROL') }] : []),
                            { label: 'BACK TO TOP', sub: 'REWIND', action: () => lenis?.scrollTo(0, { duration: 1.8 }) },
                        ].map((hatch) => (
                            <motion.button
                                key={hatch.label}
                                onClick={hatch.action}
                                data-cursor="hover"
                                className="flex flex-col gap-2 bg-court p-6 text-left transition-colors hover:bg-carbon"
                                whileHover={{ x: 3 }}
                            >
                                <span className="hud-label text-chalk">{hatch.label}</span>
                                <span className="hud-label max-w-[11rem] truncate text-[8px] text-chalk/40">{hatch.sub}</span>
                            </motion.button>
                        ))}
                    </div>
                </div>

                <div className="hairline-t mt-20 flex flex-col gap-3 pt-6 md:flex-row md:items-center md:justify-between">
                    <span className="hud-label text-chalk/40">
                        © {new Date().getFullYear()} FUQUA RACQUETS CLUB — ALL RIGHTS RESERVED
                    </span>
                    <span className="hud-label text-chalk/40">
                        DUKE UNIVERSITY / DURHAM NC — 35.9940°N 78.8986°W
                    </span>
                    <span className="hud-label text-ace">DESIGNED AFTER DARK ●</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
