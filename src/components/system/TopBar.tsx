import { useEffect, useState, type MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUI } from './UIProvider';
import { Moon, Sun, LogIn } from 'lucide-react';

const TopBar = () => {
    const { user, isAdmin } = useAuth();
    const { menuOpen, setMenuOpen } = useUI();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [time, setTime] = useState('');

    const [scrolled, setScrolled] = useState(false);

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

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const memberLabel = user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || null;
    const onAdminPage = location.pathname === '/admin';
    const darkLogo = '/dark_logo.jpg';

    const handleBrandClick = (e: MouseEvent<HTMLAnchorElement>) => {
        if (!menuOpen) return;
        e.preventDefault();
        setMenuOpen(false);
        if (location.pathname !== '/') {
            window.setTimeout(() => navigate('/'), 180);
        }
    };

    return (
        <header
            className={`fixed inset-x-0 top-0 z-[150] flex items-center justify-between px-5 py-4 transition-[background-color,box-shadow,border-color] duration-300 md:px-10 ${
                scrolled
                    ? 'border-b border-gray-200/80 bg-[#F3F0E8]/94 shadow-sm backdrop-blur-md dark:border-chalk/10 dark:bg-court-950/94'
                    : 'border-b border-transparent bg-transparent'
            }`}
        >
            <Link
                to="/"
                onClick={handleBrandClick}
                data-cursor
                className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
            >
                <img
                    src={theme === 'dark' ? darkLogo : '/logo_light.png'}
                    alt="Fuqua Racquets Club"
                    className={`object-contain ${theme === 'dark' ? 'h-10 w-auto max-w-[2.75rem]' : 'h-9 w-9'}`}
                />
                <span className="font-display text-lg tracking-tight text-wimbledon-navy dark:text-chalk md:text-xl">
                    Fuqua Racquets Club
                </span>
            </Link>

            <div className="flex items-center gap-3 md:gap-5">
                <span className="hidden hud-label text-gray-400 lg:inline dark:text-chalk/40">{time} ET</span>

                {isAdmin && (
                    <Link
                        to={onAdminPage ? '/' : '/admin'}
                        data-cursor
                        className="hidden hud-label rounded-full bg-wimbledon-navy px-4 py-2 text-white transition-colors hover:bg-[#00287a] dark:bg-chalk dark:text-court-950 dark:hover:bg-white sm:inline-block"
                    >
                        {onAdminPage ? 'Home' : 'Admin'}
                    </Link>
                )}

                {!user && (
                    <button
                        onClick={() => navigate('/login')}
                        data-cursor
                        className="hidden hud-label items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-wimbledon-navy transition-colors hover:bg-gray-50 dark:border-chalk/20 dark:text-chalk dark:hover:bg-chalk/5 sm:inline-flex"
                    >
                        <LogIn className="h-3.5 w-3.5" />
                        Sign In
                    </button>
                )}

                {user && (
                    <span className="hidden hud-label text-gray-400 md:inline dark:text-chalk/40">{memberLabel}</span>
                )}

                <button
                    onClick={toggleTheme}
                    data-cursor
                    aria-label="Toggle theme"
                    className="rounded-full p-2 text-gray-500 transition-colors hover:text-wimbledon-navy dark:text-chalk/60 dark:hover:text-chalk"
                >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>

                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    data-cursor
                    className="hud-label rounded-full border border-gray-300 px-4 py-2 text-wimbledon-navy transition-colors hover:border-wimbledon-navy/40 hover:bg-gray-50 dark:border-chalk/20 dark:text-chalk dark:hover:border-chalk/40 dark:hover:bg-chalk/5"
                >
                    {menuOpen ? 'Close' : 'Menu'}
                </button>
            </div>
        </header>
    );
};

export default TopBar;
