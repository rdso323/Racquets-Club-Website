import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { AirlockScene } from '../components/three/scenes';
import { RevealLines } from '../components/system/kinetic';

/*
 * ACCESS — the airlock. A lone satellite spins over a sunken court
 * while the terminal on the right negotiates Duke credentials.
 * Auth handlers are the legacy ones, untouched.
 */
const Login = () => {
    const { signInWithEmail, signUpWithEmail, error } = useAuth();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Forgot Password States
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [isResetLoading, setIsResetLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (isSignUp) {
                await signUpWithEmail(email, password);
            } else {
                await signInWithEmail(email, password);
            }
        } finally {
            setSubmitting(false);
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

    const isVerifyNotice = !!error && error.includes('verify your account');

    const inputClass =
        'w-full border-0 border-b border-chalk/20 bg-transparent px-0 py-3.5 font-mono text-sm text-chalk placeholder-chalk/30 transition-colors focus:border-ace focus:outline-none focus:ring-0';

    return (
        <motion.main
            className="relative min-h-screen overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
        >
            <div className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
                {/* ── Left: the satellite chamber ── */}
                <div className="relative hidden overflow-hidden lg:block">
                    <AirlockScene />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,#070907_95%)]" />

                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-12 pt-28">
                        <RevealLines
                            delay={0.3}
                            lines={[
                                <span key="1" className="display-tight block text-7xl text-chalk xl:text-8xl">MEMBERS</span>,
                                <span key="2" className="display-tight block text-7xl text-hollow xl:text-8xl">ONLY<span className="text-ace">.</span></span>,
                                <span key="3" className="serif-ital mt-3 block text-2xl text-chalk/70">the airlock checks your credentials</span>,
                            ]}
                        />
                        <div className="flex items-end justify-between">
                            <span className="hud-label text-chalk/50">CHANNEL — AUTH.01</span>
                            <span className="hud-label text-chalk/50">FIREBASE SECURE LINK ●</span>
                        </div>
                    </div>

                    <div className="absolute inset-y-12 right-0 w-px bg-gradient-to-b from-transparent via-chalk/25 to-transparent" />
                </div>

                {/* ── Right: the terminal ── */}
                <div className="relative flex items-center justify-center px-5 py-28 lg:px-16">
                    <div className="w-full max-w-md">
                        <AnimatePresence mode="wait">
                            {!showForgotPassword ? (
                                <motion.div
                                    key="auth-terminal"
                                    initial={{ opacity: 0, y: 28 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <p className="hud-label mb-3 text-ace">● AIRLOCK TERMINAL</p>
                                    <h1 className="display-tight mb-2 text-5xl text-chalk md:text-6xl">
                                        {isSignUp ? 'ENLIST' : 'ACCESS'}
                                    </h1>
                                    <p className="hud-label mb-10 text-chalk/50">
                                        DUKE.EDU CREDENTIALS — VERIFIED MEMBERS ONLY
                                    </p>

                                    {/* mode switch */}
                                    <div className="mb-10 flex border border-chalk/15">
                                        {[
                                            { label: 'SIGN IN', value: false },
                                            { label: 'REGISTER', value: true },
                                        ].map((mode) => (
                                            <button
                                                key={mode.label}
                                                onClick={() => setIsSignUp(mode.value)}
                                                data-cursor="hover"
                                                className={`relative flex-1 py-3 font-mono text-[11px] uppercase tracking-hud transition-colors ${isSignUp === mode.value ? 'text-court' : 'text-chalk/50 hover:text-chalk'}`}
                                            >
                                                {isSignUp === mode.value && (
                                                    <motion.span
                                                        layoutId="auth-mode"
                                                        className="absolute inset-0 bg-ace"
                                                        transition={{ duration: 0.35, ease: [0.76, 0, 0.24, 1] }}
                                                    />
                                                )}
                                                <span className="relative z-10">{mode.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {/* system alerts */}
                                    <AnimatePresence>
                                        {error && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className={`mb-8 border px-4 py-3.5 ${isVerifyNotice ? 'border-ace/50' : 'border-alert/60'}`}>
                                                    <p className={`hud-label mb-1 ${isVerifyNotice ? 'text-ace' : 'text-alert'}`}>
                                                        {isVerifyNotice ? '▲ VERIFICATION REQUIRED' : '▲ SYSTEM ALERT'}
                                                    </p>
                                                    <p className="font-mono text-xs leading-relaxed text-chalk/75">
                                                        {error}
                                                        {isVerifyNotice && ' Check your junk/spam folder — verification drops often land there.'}
                                                    </p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
                                        <div>
                                            <label className="hud-label mb-1 block text-chalk/45">CALLSIGN / EMAIL</label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="you@duke.edu"
                                                className={inputClass}
                                            />
                                        </div>

                                        <div>
                                            <label className="hud-label mb-1 block text-chalk/45">PASSKEY</label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    required
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="••••••••"
                                                    className={`${inputClass} pr-16`}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    data-cursor="hover"
                                                    className="hud-label absolute right-0 top-1/2 -translate-y-1/2 text-chalk/40 transition-colors hover:text-ace"
                                                >
                                                    {showPassword ? 'HIDE' : 'SHOW'}
                                                </button>
                                            </div>
                                            {!isSignUp && (
                                                <div className="mt-2.5 text-right">
                                                    <button
                                                        type="button"
                                                        data-cursor="hover"
                                                        onClick={() => {
                                                            setShowForgotPassword(true);
                                                            setResetEmail(email);
                                                            setResetError(null);
                                                            setResetSuccess(false);
                                                        }}
                                                        className="hud-label text-chalk/40 transition-colors hover:text-ace"
                                                    >
                                                        LOST PASSKEY?
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={submitting}
                                            data-cursor="hover"
                                            data-cursor-label="TRANSMIT"
                                            className="group mt-2 flex w-full items-center justify-between bg-ace px-6 py-4 font-mono text-sm uppercase tracking-hud text-court transition-all hover:brightness-110 disabled:opacity-40"
                                        >
                                            <span>{submitting ? 'NEGOTIATING…' : isSignUp ? 'CREATE CREDENTIALS' : 'OPEN THE AIRLOCK'}</span>
                                            <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                                        </button>
                                    </form>

                                    <p className="hud-label mt-10 text-center text-chalk/30">
                                        TROUBLE DOCKING? CONTACT THE ADMIN.
                                    </p>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="reset-terminal"
                                    initial={{ opacity: 0, y: 28 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <p className="hud-label mb-3 text-ace">● RECOVERY CHANNEL</p>
                                    <h1 className="display-tight mb-2 text-5xl text-chalk md:text-6xl">RESET</h1>
                                    <p className="hud-label mb-10 text-chalk/50">
                                        WE BEAM A RESET LINK TO YOUR DUKE INBOX
                                    </p>

                                    {resetError && (
                                        <div className="mb-8 border border-alert/60 px-4 py-3.5">
                                            <p className="hud-label mb-1 text-alert">▲ SYSTEM ALERT</p>
                                            <p className="font-mono text-xs leading-relaxed text-chalk/75">{resetError}</p>
                                        </div>
                                    )}

                                    {resetSuccess ? (
                                        <div className="border border-ace/50 px-5 py-6">
                                            <p className="hud-label mb-2 text-ace">✓ RESET LINK DEPLOYED</p>
                                            <p className="font-mono text-xs leading-relaxed text-chalk/75">
                                                A reset link is en route to{' '}
                                                <strong className="text-chalk">{resetEmail || 'your email'}</strong>. Check your inbox.
                                            </p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleResetPassword} className="flex flex-col gap-7">
                                            <div>
                                                <label className="hud-label mb-1 block text-chalk/45">CALLSIGN / EMAIL</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={resetEmail}
                                                    onChange={(e) => setResetEmail(e.target.value)}
                                                    placeholder="you@duke.edu"
                                                    className={inputClass}
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={isResetLoading}
                                                data-cursor="hover"
                                                className="group flex w-full items-center justify-between bg-ace px-6 py-4 font-mono text-sm uppercase tracking-hud text-court transition-all hover:brightness-110 disabled:opacity-40"
                                            >
                                                <span>{isResetLoading ? 'TRANSMITTING…' : 'SEND RESET LINK'}</span>
                                                <span className="transition-transform duration-300 group-hover:translate-x-1.5">→</span>
                                            </button>
                                        </form>
                                    )}

                                    <button
                                        type="button"
                                        data-cursor="hover"
                                        onClick={() => {
                                            setShowForgotPassword(false);
                                            setResetError(null);
                                            setResetSuccess(false);
                                        }}
                                        className="hud-label mt-10 text-chalk/50 transition-colors hover:text-ace"
                                    >
                                        ← BACK TO THE AIRLOCK
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* corner telemetry */}
                    <span className="hud-label absolute bottom-6 left-5 text-chalk/30 lg:left-16">AUTH NODE 01</span>
                    <span className="hud-label absolute bottom-6 right-5 text-chalk/30 lg:right-16">FRC — AFTER DARK</span>
                </div>
            </div>
        </motion.main>
    );
};

export default Login;
