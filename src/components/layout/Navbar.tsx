import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { User, Settings, LogOut, Sun, Moon, LogIn } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const { user, signOut, isAdmin } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <nav className="bg-white dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800/50 sticky top-0 z-40 shadow-sm transition-colors duration-300">
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center group mr-4">
                            <img src={theme === 'dark' ? "/logo_dark.png" : "/logo_light.png"} alt="Fuqua Racquets Club logo" className="h-10 w-auto mr-3 border border-transparent dark:border-gray-800 rounded shadow-sm" />
                            <span className="text-xl font-semibold font-['Outfit'] text-wimbledon-navy dark:text-white tracking-wide -ml-1 mt-0.5 transition-colors hidden sm:inline-block">
                                Fuqua Racquets Club
                            </span>
                        </Link>
                    </div>
                    
                    {/* Action buttons scrollable row */}
                    <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-1 pr-1 max-w-[65vw] sm:max-w-none scroll-smooth">
                        <button
                            onClick={toggleTheme}
                            className="text-gray-500 dark:text-gray-400 hover:text-wimbledon-navy dark:hover:text-white transition-colors p-2 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 flex-shrink-0"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>
                        
                        {user ? (
                            <>
                                <div className="hidden sm:flex items-center gap-2 mr-1 flex-shrink-0">
                                    <User className="w-5 h-5 mr-3 text-gray-400 dark:text-gray-500" strokeWidth={1.5} />
                                    <span className="text-[15px] font-semibold text-wimbledon-navy dark:text-gray-100">
                                        Welcome, {user.displayName?.split(' ')[0] || (user.email ? user.email.split('@')[0].split('.')[0].charAt(0).toUpperCase() + user.email.split('@')[0].split('.')[0].slice(1) : 'Member')}
                                    </span>
                                </div>
                                
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors p-1.5 focus:outline-none flex-shrink-0"
                                    title="Preferences"
                                >
                                    <Settings className="w-5 h-5" strokeWidth={2} />
                                </button>
                                
                                {isAdmin && (
                                    <Link
                                        to={location.pathname === '/admin' ? '/' : '/admin'}
                                        className="bg-[#001440] hover:bg-[#000a20] dark:bg-white dark:text-wimbledon-navy dark:hover:bg-gray-100 text-white transition-colors flex items-center justify-center text-sm font-bold px-5 py-1.5 rounded-[12px] shadow-sm ml-1 flex-shrink-0"
                                    >
                                        {location.pathname === '/admin' ? 'Hub' : 'Admin'}
                                    </Link>
                                )}
                                
                                <button
                                    onClick={handleSignOut}
                                    className="ml-2 text-red-600/80 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1.5 flex-shrink-0"
                                    title="Sign out"
                                >
                                    <LogOut className="w-5 h-5" strokeWidth={2} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => navigate('/login')}
                                className="bg-wimbledon-navy dark:bg-slate-800 hover:bg-[#00287a] dark:hover:bg-slate-700 text-white px-4 py-1.5 rounded-xl font-bold text-sm transition-colors shadow-sm flex items-center gap-1.5 flex-shrink-0"
                            >
                                <LogIn className="w-4 h-4" />
                                <span>Sign In</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </nav>
    );
};

export default Navbar;
