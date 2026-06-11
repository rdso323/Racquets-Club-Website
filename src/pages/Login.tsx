import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogIn, UserPlus, Mail, ArrowLeft, KeyRound, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
    const { signInWithEmail, signUpWithEmail, error } = useAuth();
    const { theme } = useTheme();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Use the correct logo per theme — same logic as Navbar
    const logoSrc = theme === 'dark' ? '/logo_dark.png' : '/logo_light.png';

    // Forgot Password States
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [isResetLoading, setIsResetLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSignUp) {
            await signUpWithEmail(email, password);
        } else {
            await signInWithEmail(email, password);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setResetError(null);
        setResetSuccess(false);

        const emailToReset = resetEmail.trim();
        if (!emailToReset.endsWith('@duke.edu')) {
            setResetError('Only @duke.edu email addresses are allowed.');
            return;
        }

        setIsResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, emailToReset);
            setResetSuccess(true);
        } catch (err: any) {
            console.error("Password reset error:", err);
            if (err.code === 'auth/user-not-found') {
                setResetError('This email address is not registered with our club.');
            } else if (err.code === 'auth/invalid-email') {
                setResetError('Please enter a valid email address.');
            } else {
                setResetError('Failed to send reset link. Please try again.');
            }
        } finally {
            setIsResetLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-950 flex-col px-4 text-center transition-colors duration-300">
            <div className="bg-white dark:bg-club-surface p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 max-w-md w-full transition-colors relative overflow-hidden min-h-[520px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                    {!showForgotPassword ? (
                        <motion.div
                            key="login-view"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.25 }}
                            className="w-full flex flex-col justify-between h-full"
                        >
                            <div>
                                <img
                                    src={logoSrc}
                                    alt="Fuqua Racquets Club Logo"
                                    className="mx-auto h-56 w-auto -mb-6 object-contain relative z-0"
                                    style={theme === 'dark' ? { mixBlendMode: 'screen' } : {}}
                                />
                                <h1 className="text-3xl font-light text-wimbledon-navy dark:text-gray-100 mb-2 tracking-tight -mt-4 transition-colors relative z-10">
                                    Digital Clubhouse
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm transition-colors relative z-10">
                                    Exclusive access for Fuqua members.
                                </p>

                                {error && (
                                    error.includes('verify your account') ? (
                                        <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl mb-6 text-sm flex items-start text-left border border-amber-200 dark:border-amber-900/30">
                                            <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                                            <div>
                                                <span className="font-semibold block mb-0.5 text-amber-900 dark:text-amber-200">Verification Required</span>
                                                <span>
                                                    Please check your Duke inbox to verify your account. Be sure to check your <strong>junk/spam folder</strong>, as verification emails often land there.
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-sm flex items-center text-left border border-red-100 dark:border-red-900/30">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                            <span>{error}</span>
                                        </div>
                                    )
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Email (@duke.edu)"
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div>
                                        <div className="relative flex items-center">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Password"
                                                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none transition-colors"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                        {!isSignUp && (
                                            <div className="text-right mt-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowForgotPassword(true);
                                                        setResetEmail(email);
                                                        setResetError(null);
                                                        setResetSuccess(false);
                                                    }}
                                                    className="text-xs font-medium text-wimbledon-navy dark:text-wimbledon-gold hover:underline focus:outline-none transition-colors"
                                                >
                                                    Forgot Password?
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full flex items-center justify-center bg-wimbledon-navy hover:bg-[#00287a] text-white py-3 px-4 rounded-xl transition duration-300 ease-in-out font-medium mt-6"
                                    >
                                        {isSignUp ? <UserPlus className="w-5 h-5 mr-2" /> : <LogIn className="w-5 h-5 mr-2" />}
                                        {isSignUp ? 'Create Account' : 'Sign In'}
                                    </button>
                                </form>

                                <div className="mt-6 flex justify-between text-sm">
                                    <button
                                        onClick={() => setIsSignUp(!isSignUp)}
                                        className="text-wimbledon-navy dark:text-wimbledon-gold hover:underline focus:outline-none transition-colors mx-auto"
                                    >
                                        {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                                Trouble logging in? Contact the admin.
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="forgot-password-view"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.25 }}
                            className="w-full flex flex-col justify-between h-full"
                        >
                            <div>
                                <div className="mx-auto w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/30">
                                    <KeyRound className="w-6 h-6 text-wimbledon-navy dark:text-wimbledon-gold" />
                                </div>
                                <h1 className="text-2xl font-semibold text-wimbledon-navy dark:text-gray-100 mb-2 tracking-tight transition-colors">
                                    Reset Password
                                </h1>
                                <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm transition-colors max-w-xs mx-auto leading-relaxed">
                                    Enter your Duke email address and we'll send you a link to reset your password.
                                </p>

                                {resetError && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm flex items-center text-left border border-red-100">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        <span>{resetError}</span>
                                    </div>
                                )}

                                {resetSuccess ? (
                                    <div className="bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 p-5 rounded-2xl mb-6 text-sm flex flex-col items-center text-center border border-green-200 dark:border-green-900/30 shadow-sm">
                                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-wimbledon-green dark:text-wimbledon-green-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="font-bold text-base text-wimbledon-green dark:text-wimbledon-green-accent mb-1.5">Reset Link Sent!</span>
                                        <span className="text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                                            We sent a reset link to <strong className="text-gray-800 dark:text-gray-200">{resetEmail || 'your email'}</strong>. Please check your inbox.
                                        </span>
                                    </div>
                                ) : (
                                    <form onSubmit={handleResetPassword} className="space-y-4">
                                        <div className="relative">
                                            <input
                                                type="email"
                                                required
                                                value={resetEmail}
                                                onChange={(e) => setResetEmail(e.target.value)}
                                                placeholder="Email (@duke.edu)"
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-club-bg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-wimbledon-navy dark:focus:ring-wimbledon-gold focus:border-transparent transition-all"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isResetLoading}
                                            className="w-full flex items-center justify-center bg-wimbledon-navy hover:bg-[#00287a] text-white py-3 px-4 rounded-xl transition duration-300 ease-in-out font-medium mt-6 disabled:opacity-50"
                                        >
                                            <Mail className="w-5 h-5 mr-2" />
                                            {isResetLoading ? 'Sending Link...' : 'Send Reset Link'}
                                        </button>
                                    </form>
                                )}

                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setResetError(null);
                                            setResetSuccess(false);
                                        }}
                                        className="text-sm font-medium text-wimbledon-navy dark:text-wimbledon-gold hover:underline focus:outline-none transition-colors inline-flex items-center"
                                    >
                                        <ArrowLeft className="w-4 h-4 mr-1.5" />
                                        Back to Sign In
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                                Trouble logging in? Contact the admin.
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Login;

