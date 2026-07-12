import { useEffect, useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Eye,
    EyeOff,
    KeyRound,
    LogIn,
    Mail,
    UserPlus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { LOGO_CLASS, logoSrcForTheme } from '../lib/branding';
import { auth } from '../lib/firebase';
import { isDukeEmail, DUKE_SIGNIN_EMAIL_MESSAGE } from '../lib/memberNames';

const RESEND_COOLDOWN_SECONDS = 60;
const MOTION_EASE = [0.16, 1, 0.3, 1] as const;

const Login = () => {
    const {
        signInWithEmail,
        signUpWithEmail,
        resendVerificationEmail,
        error,
        verificationPending,
        clearAuthError,
    } = useAuth();
    const { theme } = useTheme();
    const prefersReducedMotion = usePrefersReducedMotion();

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState<string | null>(null);
    const [resendError, setResendError] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [isResetLoading, setIsResetLoading] = useState(false);

    const logoSrc = logoSrcForTheme(theme);
    const verificationError = resendError ?? (verificationPending ? error : null);
    const showVerificationPanel = verificationPending && !showForgotPassword;

    const viewTransition = prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.2, ease: MOTION_EASE };
    const layoutTransition = prefersReducedMotion
        ? { duration: 0 }
        : { layout: { duration: 0.24, ease: MOTION_EASE } };

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = window.setInterval(() => {
            setResendCooldown((previous) => (previous <= 1 ? 0 : previous - 1));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [resendCooldown]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setResendSuccess(null);
        setResendError(null);
        if (isSignUp) {
            await signUpWithEmail(email, password);
        } else {
            await signInWithEmail(email, password);
        }
    };

    const handleResendVerification = async () => {
        if (resendCooldown > 0 || resendLoading || !email.trim() || !password) return;

        setResendLoading(true);
        setResendSuccess(null);
        setResendError(null);
        clearAuthError();
        try {
            const result = await resendVerificationEmail(email, password);
            if (result === 'already-verified') {
                setResendSuccess('Your email is already verified — try signing in.');
            } else {
                setResendSuccess(`Verification email sent to ${email}. Check inbox and spam.`);
                setResendCooldown(RESEND_COOLDOWN_SECONDS);
            }
        } catch (caughtError) {
            const message = caughtError instanceof Error
                ? caughtError.message
                : 'Failed to send verification email. Please try again.';
            setResendError(message);
        } finally {
            setResendLoading(false);
        }
    };

    const handleResetPassword = async (event: React.FormEvent) => {
        event.preventDefault();
        setResetError(null);
        setResetSuccess(false);

        const emailToReset = resetEmail.trim();
        if (!isDukeEmail(emailToReset)) {
            setResetError(DUKE_SIGNIN_EMAIL_MESSAGE);
            return;
        }

        setIsResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, emailToReset);
            setResetSuccess(true);
        } catch (caughtError) {
            console.error('Password reset error:', caughtError);
            const code = (caughtError as { code?: string }).code;
            if (code === 'auth/user-not-found') {
                setResetError('This email address is not registered with our club.');
            } else if (code === 'auth/invalid-email') {
                setResetError('Please enter a valid email address.');
            } else {
                setResetError('Failed to send reset link. Please try again.');
            }
        } finally {
            setIsResetLoading(false);
        }
    };

    const switchMode = () => {
        setIsSignUp((current) => !current);
        setResendSuccess(null);
        setResendError(null);
    };

    const openForgotPassword = () => {
        setShowForgotPassword(true);
        setResetEmail(email);
        setResetError(null);
        setResetSuccess(false);
    };

    const closeForgotPassword = () => {
        setShowForgotPassword(false);
        setResetError(null);
        setResetSuccess(false);
    };

    return (
        <main
            className="grain flex min-h-[100dvh] items-start justify-center bg-gradient-to-br from-emerald-50/70 via-[#F3F0E8] to-orange-50/40 px-4 pb-4 pt-20 text-center transition-colors duration-300 dark:from-court-900 dark:via-court-950 dark:to-court-950 sm:px-6 sm:pb-6 sm:pt-24"
        >
            <motion.div
                layout={!prefersReducedMotion}
                transition={layoutTransition}
                className="my-auto w-full max-w-md"
            >
                <motion.section
                    layout={!prefersReducedMotion}
                    transition={layoutTransition}
                    className="glass-deep relative w-full overflow-x-clip p-5 sm:p-7"
                >
                    <AnimatePresence initial={false} mode="popLayout">
                        {!showForgotPassword ? (
                            <motion.div
                                key="login-view"
                                layout={!prefersReducedMotion}
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                                transition={viewTransition}
                                className="w-full"
                            >
                                <img
                                    src={logoSrc}
                                    alt="Fuqua Racquets Club Logo"
                                    className={LOGO_CLASS.login}
                                />
                                <p className="hud-label mb-2 text-emerald-600 dark:text-court-accent">
                                    Members Access
                                </p>

                                <AnimatePresence initial={false} mode="popLayout">
                                    <motion.div
                                        key={isSignUp ? 'sign-up-intro' : 'sign-in-intro'}
                                        layout={!prefersReducedMotion}
                                        initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={prefersReducedMotion ? undefined : { opacity: 0, y: -4 }}
                                        transition={viewTransition}
                                    >
                                        <h1 className="font-display text-2xl tracking-tight text-wimbledon-navy dark:text-chalk sm:text-3xl">
                                            {isSignUp ? 'Create your account' : 'Welcome back'}
                                        </h1>
                                        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-chalk/55">
                                            {isSignUp ? (
                                                <>
                                                    Use your{' '}
                                                    <span className="font-medium text-gray-700 dark:text-chalk/75">
                                                        firstname.lastname@duke.edu
                                                    </span>{' '}
                                                    address, not your NetID alias.
                                                </>
                                            ) : (
                                                <>
                                                    Sign in with your verified{' '}
                                                    <span className="font-medium text-gray-700 dark:text-chalk/75">
                                                        @duke.edu
                                                    </span>{' '}
                                                    address.
                                                </>
                                            )}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>

                                <AnimatePresence initial={false}>
                                    {showVerificationPanel && (
                                        <motion.div
                                            layout={!prefersReducedMotion}
                                            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                                            transition={viewTransition}
                                            aria-live="polite"
                                            className="mt-5 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 text-left dark:border-amber-900/40 dark:bg-amber-950/20"
                                        >
                                            <div className="p-3">
                                                <div className="flex items-start">
                                                    <AlertCircle className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                                    <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
                                                        <span className="font-semibold text-amber-900 dark:text-amber-200">
                                                            Verification required —{' '}
                                                        </span>
                                                        check your Duke inbox and junk/spam folder.
                                                    </p>
                                                </div>

                                                {resendSuccess && (
                                                    <p className="mt-2 pl-6 text-sm text-emerald-700 dark:text-emerald-400">
                                                        {resendSuccess}
                                                    </p>
                                                )}
                                                {verificationError && (
                                                    <p role="alert" className="mt-2 pl-6 text-sm text-red-700 dark:text-red-400">
                                                        {verificationError}
                                                    </p>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={handleResendVerification}
                                                    disabled={resendLoading || resendCooldown > 0 || !email.trim() || !password}
                                                    className="mt-3 inline-flex min-h-9 w-full touch-manipulation items-center justify-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
                                                >
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    {resendLoading
                                                        ? 'Sending...'
                                                        : resendCooldown > 0
                                                            ? `Resend in ${resendCooldown}s`
                                                            : 'Resend verification email'}
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {error && !verificationPending && (
                                    <div
                                        role="alert"
                                        className="mt-5 flex items-start rounded-xl border border-red-100 bg-red-50 p-3 text-left text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400"
                                    >
                                        <AlertCircle className="mr-2 mt-0.5 h-5 w-5 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <motion.form
                                    layout={!prefersReducedMotion}
                                    transition={layoutTransition}
                                    onSubmit={handleSubmit}
                                    className="mt-5 space-y-3"
                                >
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        placeholder="firstname.lastname@duke.edu"
                                        autoComplete="email"
                                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-court-accent dark:border-chalk/10 dark:bg-court-950/60 dark:text-chalk dark:placeholder-chalk/40"
                                    />
                                    <div>
                                        <div className="relative flex items-center">
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                required
                                                value={password}
                                                onChange={(event) => setPassword(event.target.value)}
                                                placeholder="Password"
                                                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                                                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-14 text-base text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-court-accent dark:border-chalk/10 dark:bg-court-950/60 dark:text-chalk dark:placeholder-chalk/40"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((visible) => !visible)}
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                className="absolute right-1 flex min-h-11 min-w-11 touch-manipulation items-center justify-center rounded-lg text-gray-400 transition-colors hover:text-gray-600 focus:outline-none dark:hover:text-gray-200"
                                            >
                                                {showPassword
                                                    ? <EyeOff className="h-5 w-5" />
                                                    : <Eye className="h-5 w-5" />}
                                            </button>
                                        </div>
                                        <AnimatePresence initial={false}>
                                            {!isSignUp && (
                                                <motion.div
                                                    initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={prefersReducedMotion ? undefined : { height: 0, opacity: 0 }}
                                                    transition={viewTransition}
                                                    className="flex overflow-hidden pt-1 justify-end"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={openForgotPassword}
                                                        className="inline-flex min-h-11 touch-manipulation items-center px-2 text-sm font-medium text-clay-600 hover:underline focus:outline-none dark:text-clay-300"
                                                    >
                                                        Forgot Password?
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <button
                                        type="submit"
                                        data-cursor
                                        className="clay-gradient flex min-h-11 w-full touch-manipulation items-center justify-center rounded-xl px-4 py-3 font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-[1.01]"
                                    >
                                        {isSignUp
                                            ? <UserPlus className="mr-2 h-5 w-5" />
                                            : <LogIn className="mr-2 h-5 w-5" />}
                                        {isSignUp ? 'Create Account' : 'Sign In'}
                                    </button>
                                </motion.form>

                                <button
                                    type="button"
                                    onClick={switchMode}
                                    className="mt-3 inline-flex min-h-11 touch-manipulation items-center px-2 text-sm text-clay-600 hover:underline focus:outline-none dark:text-clay-300"
                                >
                                    {isSignUp
                                        ? 'Already have an account? Sign in'
                                        : 'Need an account? Sign up'}
                                </button>

                                <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-800">
                                    Trouble logging in?{' '}
                                    <a
                                        href="mailto:fuqua-racquets@duke.edu"
                                        className="text-clay-600 hover:underline dark:text-clay-300"
                                    >
                                        Contact fuqua-racquets@duke.edu
                                    </a>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="forgot-password-view"
                                layout={!prefersReducedMotion}
                                initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={prefersReducedMotion ? undefined : { opacity: 0, y: -6 }}
                                transition={viewTransition}
                                className="w-full"
                            >
                                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 dark:border-court-accent/30 dark:bg-court-accent/10">
                                    <KeyRound className="h-6 w-6 text-emerald-600 dark:text-court-accent" />
                                </div>
                                <h1 className="font-display text-2xl tracking-tight text-wimbledon-navy dark:text-chalk">
                                    Reset Password
                                </h1>
                                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                                    Enter your Duke email address and we&apos;ll send you a reset link.
                                </p>

                                {resetError && (
                                    <div
                                        role="alert"
                                        className="mt-5 flex items-start rounded-xl border border-red-100 bg-red-50 p-3 text-left text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400"
                                    >
                                        <AlertCircle className="mr-2 mt-0.5 h-5 w-5 shrink-0" />
                                        <span>{resetError}</span>
                                    </div>
                                )}

                                {resetSuccess ? (
                                    <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-700 shadow-sm dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-400">
                                        <CheckCircle2 className="mx-auto mb-3 h-9 w-9" />
                                        <p className="font-semibold">Reset link sent</p>
                                        <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
                                            Check the inbox for{' '}
                                            <strong className="text-gray-800 dark:text-gray-200">
                                                {resetEmail || 'your Duke email'}
                                            </strong>.
                                        </p>
                                    </div>
                                ) : (
                                    <form onSubmit={handleResetPassword} className="mt-5 space-y-3">
                                        <input
                                            type="email"
                                            required
                                            value={resetEmail}
                                            onChange={(event) => setResetEmail(event.target.value)}
                                            placeholder="firstname.lastname@duke.edu"
                                            autoComplete="email"
                                            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder-gray-400 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-court-accent dark:border-chalk/10 dark:bg-court-950/60 dark:text-chalk dark:placeholder-chalk/40"
                                        />
                                        <button
                                            type="submit"
                                            disabled={isResetLoading}
                                            data-cursor
                                            className="clay-gradient flex min-h-11 w-full touch-manipulation items-center justify-center rounded-xl px-4 py-3 font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-[1.01] disabled:opacity-50"
                                        >
                                            <Mail className="mr-2 h-5 w-5" />
                                            {isResetLoading ? 'Sending Link...' : 'Send Reset Link'}
                                        </button>
                                    </form>
                                )}

                                <button
                                    type="button"
                                    onClick={closeForgotPassword}
                                    className="mt-3 inline-flex min-h-11 touch-manipulation items-center px-1 text-sm font-medium text-clay-600 hover:underline focus:outline-none dark:text-clay-300"
                                >
                                    <ArrowLeft className="mr-1.5 h-4 w-4" />
                                    Back to Sign In
                                </button>

                                <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-800">
                                    Trouble logging in?{' '}
                                    <a
                                        href="mailto:fuqua-racquets@duke.edu"
                                        className="text-clay-600 hover:underline dark:text-clay-300"
                                    >
                                        Contact fuqua-racquets@duke.edu
                                    </a>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.section>
            </motion.div>
        </main>
    );
};

export default Login;
