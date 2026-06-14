import { useLenis } from 'lenis/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from '../system/UIProvider';
import { VelocityMarquee } from '../system/kinetic';

const Footer = () => {
    const { user, isAdmin } = useAuth();
    const { openFeedback } = useUI();
    const navigate = useNavigate();
    const lenis = useLenis();

    const scrollToBooking = () => {
        const el = document.getElementById('booking-section');
        if (el) lenis?.scrollTo(el, { duration: 1.4, offset: -80 });
    };

    return (
        <footer className="relative overflow-hidden pt-16">
            <VelocityMarquee baseVelocity={-2} itemClassName="pr-10" copies={3} className="hairline-t hairline-b py-4">
                <span className="font-display text-3xl italic text-chalk/20 md:text-5xl">
                    Fuqua Racquets Club — See you on court —&nbsp;
                </span>
            </VelocityMarquee>

            <div className="px-5 py-16 md:px-10 md:py-24">
                <div className="flex flex-col items-start justify-between gap-12 md:flex-row md:items-end">
                    <div>
                        <p className="hud-label mb-4 text-court-accent">Join the community</p>
                        <h2 className="font-display text-[clamp(2.5rem,8vw,5.5rem)] leading-tight text-chalk">
                            Bring your
                            <br />
                            <span className="italic text-clay-300">best game.</span>
                        </h2>
                        <button
                            onClick={user ? scrollToBooking : () => navigate('/login')}
                            data-cursor="hover"
                            className="clay-gradient mt-8 rounded-full px-8 py-4 text-sm font-bold text-white shadow-lg transition-transform hover:scale-[1.02]"
                        >
                            {user ? 'Book a Session' : 'Member Sign In'}
                        </button>
                    </div>

                    <div className="grid w-full max-w-md grid-cols-2 gap-px bg-chalk/10">
                        {[
                            { label: 'Feedback', sub: 'Share ideas', action: openFeedback },
                            user
                                ? { label: 'Signed In', sub: user.email || '', action: scrollToBooking }
                                : { label: 'Sign In', sub: '@duke.edu', action: () => navigate('/login') },
                            ...(isAdmin
                                ? [{ label: 'Admin', sub: 'Operations', action: () => navigate('/admin') }]
                                : []),
                            { label: 'Back to Top', sub: 'Scroll up', action: () => lenis?.scrollTo(0, { duration: 1.5 }) },
                        ].map((item) => (
                            <button
                                key={item.label}
                                onClick={item.action}
                                data-cursor="hover"
                                className="flex flex-col gap-2 bg-court-950 p-5 text-left transition-colors hover:bg-carbon"
                            >
                                <span className="text-sm font-semibold text-chalk">{item.label}</span>
                                <span className="hud-label truncate text-[9px] text-chalk/40">{item.sub}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="hairline-t mt-16 flex flex-col gap-2 pt-6 text-chalk/40 md:flex-row md:items-center md:justify-between">
                    <span className="text-xs">
                        © {new Date().getFullYear()} Fuqua Racquets Club. All rights reserved.
                    </span>
                    <span className="text-xs">Fuqua School of Business · Duke University · Durham, NC</span>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
