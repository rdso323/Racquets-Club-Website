import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useUI } from './UIProvider';
import { useTransitionRouter } from './TransitionProvider';
import { Magnetic } from './kinetic';

const formatClock = () =>
    new Date().toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

const useClock = () => {
    const [time, setTime] = useState(formatClock);
    useEffect(() => {
        const id = window.setInterval(() => setTime(formatClock()), 1000);
        return () => window.clearInterval(id);
    }, []);
    return time;
};

const TopBar = () => {
    const { user } = useAuth();
    const { menuOpen, setMenuOpen } = useUI();
    const { go } = useTransitionRouter();
    const time = useClock();

    const firstName = user
        ? user.displayName?.split(' ')[0] ||
        (user.email ? user.email.split('@')[0].split('.')[0].toUpperCase() : 'MEMBER')
        : null;

    return (
        <motion.header
            className="fixed inset-x-0 top-0 z-[150] mix-blend-difference"
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
            <div className="flex items-center justify-between px-5 py-5 md:px-8">
                {/* Wordmark */}
                <button
                    onClick={() => {
                        setMenuOpen(false);
                        go('/', 'INDEX');
                    }}
                    data-cursor="hover"
                    className="group text-left"
                >
                    <span className="display-tight block text-lg leading-none text-chalk md:text-xl">
                        FRC<span className="text-ace">*</span>
                    </span>
                    <span className="hud-label block text-[8px] text-chalk/50 group-hover:text-chalk transition-colors">
                        RACQUETS — EST.2025
                    </span>
                </button>

                {/* Telemetry */}
                <div className="hidden items-center gap-8 md:flex">
                    <span className="hud-label text-chalk/60">DURHAM, NC</span>
                    <span className="hud-label text-chalk/60 tabular-nums">{time} EST</span>
                    <span className="hud-label text-chalk/60">
                        {firstName ? (
                            <>
                                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-ace align-middle" />
                                {firstName.toUpperCase()} ON COURT
                            </>
                        ) : (
                            <>
                                <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-chalk/30 align-middle" />
                                GUEST FREQUENCY
                            </>
                        )}
                    </span>
                </div>

                {/* Menu trigger */}
                <Magnetic strength={0.3}>
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        data-cursor="hover"
                        className="flex items-center gap-3 border border-chalk/30 px-5 py-2.5 font-mono text-[11px] uppercase tracking-hud text-chalk hover:border-ace hover:text-ace transition-colors"
                    >
                        <span className={`h-1.5 w-1.5 rounded-full ${menuOpen ? 'bg-alert' : 'bg-ace animate-blink'}`} />
                        {menuOpen ? 'CLOSE' : 'MENU'}
                    </button>
                </Magnetic>
            </div>
        </motion.header>
    );
};

export default TopBar;
