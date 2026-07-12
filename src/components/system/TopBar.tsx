import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUI } from './UIProvider';
import { LOGO_CLASS, logoSrcForTheme } from '../../lib/branding';
import { formatMemberFirstName } from '../../lib/memberNames';
import { headerSurfaceClasses, useHeaderScrolled } from '../../lib/navChrome';
import { Menu, Moon, Sun, LogIn, X, ChevronDown, LogOut, Shield } from 'lucide-react';

const TopBar = () => {
    const { user, signOut, isAdmin } = useAuth();
    const { menuOpen, setMenuOpen } = useUI();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [time, setTime] = useState('');
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

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
        if (!userMenuOpen) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setUserMenuOpen(false);
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [userMenuOpen]);

    const scrolled = useHeaderScrolled();

    const memberLabel = user ? formatMemberFirstName(user.email, user.displayName) : null;
    const onAdminPage = location.pathname === '/admin';

    const handleSignOut = async () => {
        setUserMenuOpen(false);
        await signOut();
        navigate('/login');
    };

    const goToAdmin = () => {
        setUserMenuOpen(false);
        navigate(onAdminPage ? '/' : '/admin');
    };

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

                {user && memberLabel && (
                    <div ref={userMenuRef} className="relative">
                        <button
                            type="button"
                            onClick={() => setUserMenuOpen((open) => !open)}
                            data-cursor
                            aria-expanded={userMenuOpen}
                            aria-haspopup="menu"
                            aria-label={`Account menu for ${memberLabel}`}
                            className="flex min-h-11 max-w-[11rem] touch-manipulation items-center gap-1 rounded-full border border-gray-200/80 bg-white/70 px-3 py-1.5 text-left transition-colors hover:bg-white dark:border-chalk/15 dark:bg-court-900/70 dark:hover:bg-court-900 sm:max-w-[12rem] sm:px-3.5"
                        >
                            <span className="hud-label truncate text-gray-600 dark:text-chalk/75">{memberLabel}</span>
                            <ChevronDown
                                className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform dark:text-chalk/45 ${userMenuOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                            />
                        </button>

                        {userMenuOpen && (
                            <div
                                role="menu"
                                aria-label="Account menu"
                                className="absolute right-0 top-[calc(100%+0.5rem)] z-[160] min-w-[11rem] overflow-hidden rounded-xl border border-gray-200/90 bg-white py-1 shadow-lg dark:border-chalk/15 dark:bg-court-950"
                            >
                                {isAdmin && (
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={goToAdmin}
                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-wimbledon-navy transition-colors hover:bg-gray-50 dark:text-chalk dark:hover:bg-chalk/5"
                                    >
                                        <Shield className="h-4 w-4 shrink-0 text-gray-400 dark:text-chalk/45" />
                                        {onAdminPage ? 'Home' : 'Admin'}
                                    </button>
                                )}
                                <button
                                    type="button"
                                    role="menuitem"
                                    onClick={handleSignOut}
                                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                >
                                    <LogOut className="h-4 w-4 shrink-0" />
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
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
