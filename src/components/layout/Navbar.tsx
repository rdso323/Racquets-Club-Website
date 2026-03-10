import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogOut, Settings, SlidersHorizontal } from 'lucide-react';
import SettingsModal from './SettingsModal';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Navbar = () => {
    const { user, signOut, isAdmin } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-20 items-center">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center group">
                            <img
                                src="/new_logo.png"
                                alt="Fuqua Racquets Club"
                                className="h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                {isAdmin && (
                                    <Link
                                        to={location.pathname === '/admin' ? '/' : '/admin'}
                                        className="text-gray-500 hover:text-wimbledon-navy transition-colors flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50"
                                    >
                                        <Settings className="w-4 h-4" />
                                        {location.pathname === '/admin' ? 'Back to Hub' : 'Admin'}
                                    </Link>
                                )}
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className="text-gray-500 hover:text-wimbledon-green transition-colors flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md hover:bg-gray-50"
                                    title="Booking Tab Preferences"
                                >
                                    <SlidersHorizontal className="w-4 h-4" />
                                    <span className="hidden md:inline">Tabs</span>
                                </button>
                                <div className="hidden sm:flex flex-col items-end mr-4">
                                    <span className="text-sm font-medium text-gray-900 border-l border-gray-200 pl-4">{user.displayName || user.email}</span>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="text-gray-500 hover:text-red-600 transition-colors p-2 rounded-full hover:bg-red-50"
                                    title="Sign out"
                                >
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/login"
                                className="bg-wimbledon-navy text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#00287a] transition-colors shadow-sm text-sm"
                            >
                                Member Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </nav>
    );
};

export default Navbar;
