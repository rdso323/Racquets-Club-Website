import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUI } from './UIProvider';
import { Moon, Sun } from 'lucide-react';

const TopBar = () => {
    const { user } = useAuth();
    const { menuOpen, setMenuOpen } = useUI();
    const { theme, toggleTheme } = useTheme();
    const [time, setTime] = useState('');

    useEffect(() => {
        const tick = () => {
            setTime(
                new Date().toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: 'America/New_York',
                }),
            );
        };
        tick();
        const id = window.setInterval(tick, 30_000);
        return () => window.clearInterval(id);
    }, []);

    const memberLabel = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || null;

    return (
        <header className="fixed inset-x-0 top-0 z-[150] flex items-center justify-between px-5 py-5 md:px-10">
            <Link
                to="/"
                data-cursor="hover"
                className="font-display text-lg tracking-tight text-wimbledon-navy transition-opacity hover:opacity-80 dark:text-chalk md:text-xl"
            >
                Fuqua Racquets
            </Link>

            <div className="flex items-center gap-4 md:gap-6">
                <span className="hidden hud-label text-gray-500 sm:inline dark:text-chalk/50">{time} ET</span>
                <span className="hidden hud-label text-gray-400 md:inline dark:text-chalk/40">
                    {memberLabel ? memberLabel : 'Guest'}
                </span>
                <button
                    onClick={toggleTheme}
                    data-cursor="hover"
                    aria-label="Toggle theme"
                    className="rounded-full p-2 text-gray-500 transition-colors hover:text-wimbledon-navy dark:text-chalk/60 dark:hover:text-chalk"
                >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    data-cursor="hover"
                    className="hud-label rounded-full border border-gray-300 px-4 py-2 text-wimbledon-navy transition-colors hover:border-wimbledon-navy/40 hover:bg-gray-50 dark:border-chalk/20 dark:text-chalk dark:hover:border-chalk/40 dark:hover:bg-chalk/5"
                >
                    {menuOpen ? 'Close' : 'Menu'}
                </button>
            </div>
        </header>
    );
};

export default TopBar;
