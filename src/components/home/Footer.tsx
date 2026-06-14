import { useLenis } from 'lenis/react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUI } from '../system/UIProvider';

const Footer = () => {
    const { user, isAdmin } = useAuth();
    const { openFeedback } = useUI();
    const { theme } = useTheme();
    const navigate = useNavigate();
    const lenis = useLenis();

    const scrollToId = (id: string) => {
        const el = document.getElementById(id);
        if (el) lenis?.scrollTo(el, { duration: 1.4, offset: -80 });
    };

    const links = [
        { label: 'Book a Court', action: () => scrollToId('booking-section') },
        { label: 'Events', action: () => scrollToId('events-section') },
        { label: 'News', action: () => scrollToId('news-section') },
        { label: 'Feedback', action: openFeedback },
        ...(isAdmin ? [{ label: 'Admin', action: () => navigate('/admin') }] : []),
        user
            ? { label: 'Back to Top', action: () => lenis?.scrollTo(0, { duration: 1.5 }) }
            : { label: 'Member Sign In', action: () => navigate('/login') },
    ];

    return (
        <footer className="border-t border-gray-200 dark:border-chalk/10">
            <div className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-20">
                <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
                    {/* Brand */}
                    <div className="max-w-sm">
                        <div className="flex items-center gap-3">
                            <img
                                src={theme === 'dark' ? '/dark_logo.jpg' : '/logo_light.png'}
                                alt="Fuqua Racquets Club"
                                className="h-10 w-10 object-contain"
                            />
                            <span className="font-display text-xl text-gray-900 dark:text-chalk">
                                Fuqua Racquets Club
                            </span>
                        </div>
                        <p className="mt-5 text-sm leading-relaxed text-gray-500 dark:text-chalk/50">
                            A community for racquet sports players of every level across the Fuqua,
                            Duke, and greater Durham communities.
                        </p>
                    </div>

                    {/* Options */}
                    <nav className="grid grid-cols-2 gap-x-12 gap-y-3 sm:gap-x-20">
                        {links.map((link) => (
                            <button
                                key={link.label}
                                onClick={link.action}
                                data-cursor
                                className="group flex items-center gap-1.5 text-left text-sm font-medium text-gray-600 transition-colors hover:text-clay-600 dark:text-chalk/70 dark:hover:text-clay-300"
                            >
                                {link.label}
                                <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="mt-14 flex flex-col gap-2 border-t border-gray-200 pt-6 text-gray-400 dark:border-chalk/10 dark:text-chalk/40 md:flex-row md:items-center md:justify-between">
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
