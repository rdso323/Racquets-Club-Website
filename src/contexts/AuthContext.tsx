import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    isSignInWithEmailLink,
    onAuthStateChanged,
    sendSignInLinkToEmail,
    signInWithEmailLink,
    signOut as firebaseSignOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { SPORTS } from '../lib/sports';
import {
    formatMemberNameFromEmail,
    isAllowedDukeEmail,
    isDukeEmail,
    DUKE_EMAIL_FORMAT_MESSAGE,
    DUKE_SIGNIN_EMAIL_MESSAGE,
} from '../lib/memberNames';

export interface TabPreference {
    id: string;
    visible: boolean;
}

const DEFAULT_TABS: TabPreference[] = SPORTS.map((id) => ({ id, visible: true }));
const LEGACY_TAB_PREFS_KEY = 'booking_tabs_preferences';
export const EMAIL_FOR_SIGN_IN_KEY = 'emailForSignIn';

const tabPrefsCacheKey = (uid: string) => `booking_tabs_preferences_${uid}`;

const readCachedTabPreferences = (uid: string): TabPreference[] | null => {
    try {
        const raw = localStorage.getItem(tabPrefsCacheKey(uid));
        if (!raw) return null;
        return JSON.parse(raw) as TabPreference[];
    } catch {
        return null;
    }
};

const writeCachedTabPreferences = (uid: string, tabs: TabPreference[]) => {
    try {
        localStorage.setItem(tabPrefsCacheKey(uid), JSON.stringify(tabs));
    } catch (err) {
        console.error('Error caching tab preferences:', err);
    }
};

/** Merge saved preferences with current defaults so new sports appear automatically. */
export const mergeTabPreferences = (saved: TabPreference[]): TabPreference[] => {
    const validIds = new Set<string>(SPORTS);
    const merged: TabPreference[] = [];

    for (const tab of saved) {
        if (validIds.has(tab.id) && !merged.some((t) => t.id === tab.id)) {
            merged.push(tab);
        }
    }

    for (const defaultTab of DEFAULT_TABS) {
        if (!merged.some((t) => t.id === defaultTab.id)) {
            merged.push({ ...defaultTab });
        }
    }

    return merged;
};

const tabsNeedSync = (saved: TabPreference[], merged: TabPreference[]): boolean => {
    if (saved.length !== merged.length) return true;
    return merged.some((tab, i) => tab.id !== saved[i]?.id);
};

const readLegacyTabPreferences = (): TabPreference[] | null => {
    try {
        const raw = localStorage.getItem(LEGACY_TAB_PREFS_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as TabPreference[];
    } catch {
        return null;
    }
};

const PRODUCTION_SITE_ORIGIN = 'https://www.fuquaracquetsclub.com';

/** Continue URL for email sign-in links — localhost for local testing, production otherwise. */
const getSignInContinueUrl = (): string => {
    if (typeof window === 'undefined') {
        return `${PRODUCTION_SITE_ORIGIN}/login`;
    }
    const { hostname, origin } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${origin}/login`;
    }
    return `${PRODUCTION_SITE_ORIGIN}/login`;
};

const getEmailLinkActionCodeSettings = () => ({
    url: getSignInContinueUrl(),
    handleCodeInApp: true,
});

const isContinueUriError = (err: unknown): boolean => {
    const code = (err as { code?: string })?.code;
    return code === 'auth/unauthorized-continue-uri' || code === 'auth/invalid-continue-uri';
};

const emailLinkSendErrorMessage = (err: unknown): string => {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/too-many-requests') {
        return 'Too many sign-in attempts from this device. Please wait 15–30 minutes and try again.';
    }
    if (code === 'auth/invalid-email') {
        return 'Please enter a valid email address.';
    }
    if (isContinueUriError(err)) {
        return 'Could not send sign-in link due to a site configuration issue. Ask an admin to allowlist this domain in Firebase Authentication → Settings → Authorized domains.';
    }
    if (code === 'auth/operation-not-allowed') {
        return 'Email link sign-in is not enabled yet. Ask an admin to enable Email/Password → Email link (passwordless) in Firebase Authentication.';
    }
    return 'Failed to send sign-in link. Please try again.';
};

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    /** True after a sign-in link was sent and we are waiting for the user to open their inbox. */
    linkSentPending: boolean;
    /** True when the URL is an email sign-in link but we still need the user to confirm their email. */
    emailLinkNeedsEmail: boolean;
    sendSignInLink: (email: string) => Promise<void>;
    completeEmailLinkSignIn: (email: string) => Promise<void>;
    clearAuthMessage: () => void;
    clearAuthError: () => void;
    signOut: () => Promise<void>;
    isAdmin: boolean;
    tabPreferences: TabPreference[];
    updateTabPreferences: (newTabs: TabPreference[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const CLUB_ADMIN_EMAIL = `${['fuqua', 'racquets'].join('-')}@duke.edu`;

const DEFAULT_ADMIN_EMAILS = [
    'altamash.memon@duke.edu',
    'armin.thomas@duke.edu',
    'hirsh.sinaihede@duke.edu',
    'joe.chantajunlasin@duke.edu',
    'kathryne.piazza@duke.edu',
    'laura.wang@duke.edu',
    'maddie.latimore@duke.edu',
    'naitik.reshamwala@duke.edu',
    CLUB_ADMIN_EMAIL,
];

const getAdminEmails = (): string[] => {
    const fromEnv = import.meta.env.VITE_ADMIN_EMAILS as string | undefined;
    const extras = fromEnv
        ? fromEnv.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
        : [];
    return [...new Set([...DEFAULT_ADMIN_EMAILS.map((email) => email.toLowerCase()), ...extras])];
};

const ADMIN_EMAILS = getAdminEmails();

const isAdminEmail = (email: string | null | undefined) =>
    !!email && ADMIN_EMAILS.includes(email.toLowerCase());

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [linkSentPending, setLinkSentPending] = useState(false);
    const [emailLinkNeedsEmail, setEmailLinkNeedsEmail] = useState(false);
    const [tabPreferences, setTabPreferences] = useState<TabPreference[]>(DEFAULT_TABS);
    const migrationAttemptedRef = useRef<string | null>(null);
    const completingEmailLinkRef = useRef(false);

    const acceptAuthenticatedUser = async (currentUser: User) => {
        if (!currentUser.email?.endsWith('@duke.edu')) {
            await firebaseSignOut(auth);
            setUser(null);
            setError('Only @duke.edu email addresses are allowed.');
            return;
        }

        // Email-link sign-in always verifies; reject leftover unverified password accounts.
        if (!currentUser.emailVerified) {
            await firebaseSignOut(auth);
            setUser(null);
            setError('Please sign in with the email link sent to your Duke inbox.');
            return;
        }

        setUser(currentUser);
        setError(null);
        setLinkSentPending(false);
        setEmailLinkNeedsEmail(false);

        setDoc(
            doc(db, 'users', currentUser.uid),
            {
                email: currentUser.email || '',
                displayName: currentUser.displayName || formatMemberNameFromEmail(currentUser.email),
            },
            { merge: true },
        ).catch((err) => console.error('Error syncing user profile:', err));

        const cached = readCachedTabPreferences(currentUser.uid);
        if (cached) {
            setTabPreferences(mergeTabPreferences(cached));
        }
    };

    const completeEmailLinkSignIn = async (email: string) => {
        const trimmed = email.trim().toLowerCase();
        setError(null);

        if (!isDukeEmail(trimmed)) {
            setError(DUKE_SIGNIN_EMAIL_MESSAGE);
            return;
        }

        if (!isSignInWithEmailLink(auth, window.location.href)) {
            setError('This sign-in link is invalid or has expired. Request a new one.');
            setEmailLinkNeedsEmail(false);
            return;
        }

        completingEmailLinkRef.current = true;
        setLoading(true);
        try {
            const result = await signInWithEmailLink(auth, trimmed, window.location.href);
            window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, trimmed);
            window.history.replaceState({}, document.title, '/login');
            setEmailLinkNeedsEmail(false);
            setLinkSentPending(false);
            await acceptAuthenticatedUser(result.user);
        } catch (err: unknown) {
            console.error(err);
            const code = (err as { code?: string })?.code;
            if (code === 'auth/invalid-action-code' || code === 'auth/expired-action-code') {
                setError('This sign-in link is invalid or has expired. Request a new one.');
            } else if (code === 'auth/invalid-email') {
                setError('That email does not match the link. Use the same @duke.edu address you requested.');
            } else {
                setError('Failed to complete sign-in. Request a new link and try again.');
            }
            setEmailLinkNeedsEmail(true);
        } finally {
            completingEmailLinkRef.current = false;
            setLoading(false);
        }
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isSignInWithEmailLink(auth, window.location.href)) return;

        const stored = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
        if (stored) {
            void completeEmailLinkSignIn(stored);
        } else {
            setEmailLinkNeedsEmail(true);
            setLoading(false);
        }
        // Intentionally run once on mount to complete inbound email links.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (completingEmailLinkRef.current) {
                return;
            }

            if (currentUser) {
                try {
                    await currentUser.getIdToken(true);
                    await currentUser.reload();
                } catch (e) {
                    console.error('Error refreshing token', e);
                }

                await acceptAuthenticatedUser(currentUser);
            } else {
                setUser(null);
                setTabPreferences(DEFAULT_TABS);
                migrationAttemptedRef.current = null;
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);

        const unsubscribe = onSnapshot(
            userRef,
            async (snapshot) => {
                const data = snapshot.exists() ? snapshot.data() : null;

                const onAllowlist = isAdminEmail(user.email);

                if (onAllowlist) {
                    if (data?.isAdmin !== true) {
                        try {
                            await setDoc(userRef, { isAdmin: true }, { merge: true });
                        } catch (err) {
                            console.error('Error bootstrapping admin flag:', err);
                        }
                    }
                } else if (data?.isAdmin === true) {
                    try {
                        await setDoc(userRef, { isAdmin: false }, { merge: true });
                    } catch (err) {
                        console.error('Error revoking admin flag:', err);
                    }
                }

                if (data?.tabPreferences) {
                    const saved = data.tabPreferences as TabPreference[];
                    const merged = mergeTabPreferences(saved);
                    setTabPreferences(merged);
                    writeCachedTabPreferences(user.uid, merged);

                    if (tabsNeedSync(saved, merged)) {
                        try {
                            await setDoc(userRef, { tabPreferences: merged }, { merge: true });
                        } catch (err) {
                            console.error('Error syncing tab preferences:', err);
                        }
                    }
                    return;
                }

                if (migrationAttemptedRef.current === user.uid) return;
                migrationAttemptedRef.current = user.uid;

                const legacy = readLegacyTabPreferences();
                const cached = readCachedTabPreferences(user.uid);
                const source = legacy ?? cached;
                if (!source) return;

                const merged = mergeTabPreferences(source);
                setTabPreferences(merged);
                writeCachedTabPreferences(user.uid, merged);

                try {
                    await setDoc(userRef, { tabPreferences: merged }, { merge: true });
                    if (legacy) {
                        localStorage.removeItem(LEGACY_TAB_PREFS_KEY);
                    }
                } catch (err) {
                    console.error('Error migrating tab preferences:', err);
                }
            },
            (err) => {
                console.error('Error listening to user settings:', err);
            },
        );

        return unsubscribe;
    }, [user]);

    const clearAuthMessage = () => {
        setError(null);
        setLinkSentPending(false);
    };

    const clearAuthError = () => {
        setError(null);
    };

    const sendSignInLink = async (email: string) => {
        setError(null);
        setLinkSentPending(false);

        const trimmed = email.trim().toLowerCase();
        if (!isAllowedDukeEmail(trimmed)) {
            setError(DUKE_EMAIL_FORMAT_MESSAGE);
            return;
        }

        try {
            await sendSignInLinkToEmail(auth, trimmed, getEmailLinkActionCodeSettings());
            window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, trimmed);
            setLinkSentPending(true);
        } catch (err: unknown) {
            console.error(err);
            setError(emailLinkSendErrorMessage(err));
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    const updateTabPreferences = async (newTabs: TabPreference[]) => {
        const merged = mergeTabPreferences(newTabs);
        setTabPreferences(merged);

        if (!user) return;

        writeCachedTabPreferences(user.uid, merged);

        try {
            await setDoc(doc(db, 'users', user.uid), { tabPreferences: merged }, { merge: true });
        } catch (err) {
            console.error('Error saving preferences:', err);
        }
    };

    const isAdmin = user ? isAdminEmail(user.email) : false;

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                error,
                linkSentPending,
                emailLinkNeedsEmail,
                sendSignInLink,
                completeEmailLinkSignIn,
                clearAuthMessage,
                clearAuthError,
                signOut,
                isAdmin,
                tabPreferences,
                updateTabPreferences,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
