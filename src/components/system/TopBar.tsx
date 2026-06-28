import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUI } from './UIProvider';
import { LOGO_CLASS, logoSrcForTheme } from '../../lib/branding';
import { formatMemberFirstName } from '../../lib/memberNames';
import { headerSurfaceClasses, useHeaderScrolled } from '../../lib/navChrome';
import { Menu, Moon, Sun, LogIn, X } from 'lucide-react';

const TopBar = () => {
    const { user, isAdmin } = useAuth();
    const { menuOpen, setMenuOpen } = useUI();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
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

    const scrolled = useHeaderScrolled();

    const memberLabel = user ? formatMemberFirstName(user.email, user.displayName) : null;
    const onAdminPage = location.pathname === '/admin';

    return (
        <header
            className={`fixed inset-x-0 top-0 z-[150] flex items-center justify-between px-5 py-4 transition-[background-color,box-shadow,border-color] duration-300 md:px-10 ${headerSurfaceClasses(scrolled)}`}
        >
            <div className="flex items-center gap-3 md:gap-4">
                <button
                    type="button"
                    onClick={() => setMenuOpen(!menuOpen)}
                    data-cursor
                    aria-expanded={menuOpen}
                    aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                    className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full text-wimbledon-navy transition-colors hover:bg-gray-100 active:bg-gray-200/80 dark:text-chalk dark:hover:bg-chalk/10 dark:active:bg-chalk/15"
                >
                    {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                <Link
                    to="/"
                    data-cursor
                    className="flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80 sm:gap-2.5"
                >
                    <img
                        src={logoSrcForTheme(theme)}
                        alt="Fuqua Racquets Club"
                        className={LOGO_CLASS.nav}
                    />
                    <span className="hidden font-display text-lg tracking-tight text-wimbledon-navy dark:text-chalk sm:inline md:text-xl">
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
                    className="flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-full text-gray-500 transition-colors hover:text-wimbledon-navy active:bg-gray-100 dark:text-chalk/60 dark:hover:text-chalk dark:active:bg-chalk/10"
                >
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
            </div>
        </header>
    );
};

export default TopBar;
