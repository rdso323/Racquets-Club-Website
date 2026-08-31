import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { LOGO_CLASS, logoSrcForTheme } from '../lib/branding';
import { DUKE_EMAIL_FORMAT_MESSAGE, isAllowedDukeEmail } from '../lib/memberNames';

const MOTION_EASE = [0.16, 1, 0.3, 1] as const;
const SUPPORT_EMAIL = `${['fuqua', 'racquets'].join('-')}@duke.edu`;

const Login = () => {
    const {
        sendSignInLink,
        completeEmailLinkSignIn,
        error,
        linkSentPending,
        emailLinkNeedsEmail,
        clearAuthError,
        loading,
    } = useAuth();
    const { theme } = useTheme();
    const prefersReducedMotion = usePrefersReducedMotion();

    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const logoSrc = logoSrcForTheme(theme);
    const displayError = localError || error;

    const viewTransition = prefersReducedMotion
        ? { duration: 0 }
        : { duration: 0.2, ease: MOTION_EASE };
    const layoutTransition = prefersReducedMotion
        ? { duration: 0 }
        : { layout: { duration: 0.24, ease: MOTION_EASE } };

    useEffect(() => {
        if (!emailLinkNeedsEmail) return;
        try {
            const stored = window.localStorage.getItem('emailForSignIn');
            if (stored) setEmail(stored);
        } catch {
            /* ignore */
        }
    }, [emailLinkNeedsEmail]);

    const handleSendLink = async (event: React.FormEvent) => {
        event.preventDefault();
        clearAuthError();
        setLocalError(null);

        if (!isAllowedDukeEmail(email)) {
            setLocalError(DUKE_EMAIL_FORMAT_MESSAGE);
            return;
        }

        setSending(true);
        try {
            await sendSignInLink(email);
        } finally {
            setSending(false);
        }
    };

    const handleCompleteLink = async (event: React.FormEvent) => {
        event.preventDefault();
        clearAuthError();
        setLocalError(null);
        setCompleting(true);
        try {
            await completeEmailLinkSignIn(email);
        } finally {
            setCompleting(false);
        }
    };

    const busy = sending || completing || loading;

    return (
        <main className="grain flex min-h-[100dvh] items-start justify-center bg-gradient-to-br from-emerald-50/70 via-[#F3F0E8] to-orange-50/40 px-4 pb-4 pt-20 text-center transition-colors duration-300 dark:from-court-900 dark:via-court-950 dark:to-court-950 sm:px-6 sm:pb-6 sm:pt-24">
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
                    <motion.div
                        layout={!prefersReducedMotion}
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
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

                        <h1 className="font-display text-2xl tracking-tight text-wimbledon-navy dark:text-chalk sm:text-3xl">
                            {emailLinkNeedsEmail ? 'Confirm your email' : 'Sign in with Duke email'}
                        </h1>
                        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-chalk/55">
                            {emailLinkNeedsEmail ? (
                                <>
                                    Opened a sign-in link on a new device? Enter the same{' '}
                                    <span className="font-medium text-gray-700 dark:text-chalk/75">
                                        firstname.lastname@duke.edu
                                    </span>{' '}
                                    address to finish signing in.
                                </>
                            ) : (
                                <>
                                    No password. We&apos;ll email a one-time link to your{' '}
                                    <span className="font-medium text-gray-700 dark:text-chalk/75">
                                        firstname.lastname@duke.edu
                                    </span>{' '}
                                    inbox. You stay signed in on this browser until you sign out.
                                </>
                            )}
                        </p>

                        {linkSentPending && !emailLinkNeedsEmail && (
                            <div
                                aria-live="polite"
                                className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left dark:border-emerald-900/40 dark:bg-emerald-950/20"
                            >
                                <div className="flex items-start">
                                    <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                                    <div className="text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
                                        <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                                            Check your Duke inbox
                                        </p>
                                        <p className="mt-1">
                                            We sent a sign-in link to{' '}
                                            <strong className="font-semibold">{email.trim() || 'your email'}</strong>.
                                            Open it on this device. Check junk/spam if it is not in your inbox.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {displayError && (
                            <div
                                role="alert"
                                className="mt-5 flex items-start rounded-xl border border-red-100 bg-red-50 p-3 text-left text-sm text-red-600 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-400"
                            >
                                <AlertCircle className="mr-2 mt-0.5 h-5 w-5 shrink-0" />
                                <span>{displayError}</span>
                            </div>
                        )}

                        <motion.form
                            layout={!prefersReducedMotion}
                            transition={layoutTransition}
                            onSubmit={emailLinkNeedsEmail ? handleCompleteLink : handleSendLink}
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
                            <button
                                type="submit"
                                disabled={busy}
                                data-cursor
                                className="clay-gradient flex min-h-11 w-full touch-manipulation items-center justify-center rounded-xl px-4 py-3 font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-[1.01] disabled:opacity-50"
                            >
                                <Mail className="mr-2 h-5 w-5" />
                                {emailLinkNeedsEmail
                                    ? completing || loading
                                        ? 'Signing in…'
                                        : 'Finish sign-in'
                                    : sending
                                      ? 'Sending link…'
                                      : linkSentPending
                                        ? 'Resend sign-in link'
                                        : 'Email me a sign-in link'}
                            </button>
                        </motion.form>

                        <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-400 dark:border-gray-800">
                            Trouble signing in?{' '}
                            <a
                                href={`mailto:${SUPPORT_EMAIL}`}
                                className="text-clay-600 hover:underline dark:text-clay-300"
                            >
                                Contact {SUPPORT_EMAIL}
                            </a>
                        </div>
                    </motion.div>
                </motion.section>
            </motion.div>
        </main>
    );
};

export default Login;
