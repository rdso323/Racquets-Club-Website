import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUI } from './UIProvider';
import { LOGO_CLASS, logoSrcForTheme } from '../../lib/branding';
import { formatMemberFirstName } from '../../lib/memberNames';
import { Menu, Moon, Sun, LogIn, X } from 'lucide-react';

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

    const memberLabel = user ? formatMemberFirstName(user.email, user.displayName) : null;
    const onAdminPage = location.pathname === '/admin';

    return (
        <header
            className={`fixed inset-x-0 top-0 z-[150] flex items-center justify-between px-5 py-4 transition-[background-color,box-shadow,border-color] duration-300 md:px-10 ${
                scrolled
                    ? 'border-b border-gray-200 bg-[#F3F0E8] shadow-sm dark:border-chalk/10 dark:bg-court-950'
                    : 'border-b border-gray-200/90 bg-[#F3F0E8] dark:border-chalk/10 dark:bg-court-950'
            }`}
        >
            <div className="flex items-center gap-3 md:gap-4">
                <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    data-cursor
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    className="rounded-full p-2 text-wimbledon-navy transition-colors hover:bg-gray-100 dark:text-chalk dark:hover:bg-chalk/10"
                >
                    {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                <Link
                    to="/"
                    data-cursor
                    className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
                >
                    <img
                        src={logoSrcForTheme(theme)}
                        alt="Fuqua Racquets Club"
                        className={LOGO_CLASS.nav}
                    />
                    <span className="font-display text-lg tracking-tight text-wimbledon-navy dark:text-chalk md:text-xl">
                        Fuqua Racquets Club
                    </span>
                </Link>
            </div>

            <div className="flex items-center gap-3 md:gap-5">
                <span className="hidden hud-label text-gray-400 lg:inline dark:text-chalk/40">{time} ET</span>

                {isAdmin && (
                    <Link
                        to={onAdminPage ? '/' : '/admin'}
                        data-cursor
                        className="hud-label inline-block rounded-full bg-wimbledon-navy px-3 py-1.5 text-[10px] text-white transition-colors hover:bg-[#00287a] sm:px-4 sm:py-2 dark:bg-chalk dark:text-court-950 dark:hover:bg-white"
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
            </div>
        </header>
    );
};

export default TopBar;
