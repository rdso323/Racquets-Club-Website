import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signOut as firebaseSignOut
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { SPORTS } from '../lib/sports';

export interface TabPreference {
    id: string;
    visible: boolean;
}

const DEFAULT_TABS: TabPreference[] = SPORTS.map((id) => ({ id, visible: true }));
const LEGACY_TAB_PREFS_KEY = 'booking_tabs_preferences';

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

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    signInWithEmail: (email: string, pass: string) => Promise<void>;
    signUpWithEmail: (email: string, pass: string) => Promise<void>;
    signOut: () => Promise<void>;
    isAdmin: boolean;
    tabPreferences: TabPreference[];
    updateTabPreferences: (newTabs: TabPreference[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const DEFAULT_ADMIN_EMAILS = ['rohan@duke.edu', 'admin@duke.edu', 'rohan.dsouza@duke.edu'];

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
    const [tabPreferences, setTabPreferences] = useState<TabPreference[]>(DEFAULT_TABS);
    const [firestoreIsAdmin, setFirestoreIsAdmin] = useState(false);
    const migrationAttemptedRef = useRef<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    // Force token refresh so Firestore rules receive the latest email_verified claim
                    await currentUser.getIdToken(true);
                    // Also reload the user to get the latest emailVerification flag from Auth on this client
                    await currentUser.reload();
                } catch (e) {
                    console.error("Error refreshing token", e);
                }

                if (!currentUser.email?.endsWith('@duke.edu')) {
                    firebaseSignOut(auth);
                    setUser(null);
                    setError('Only @duke.edu email addresses are allowed.');
                } else if (!currentUser.emailVerified) {
                    firebaseSignOut(auth);
                    setUser(null);
                    setError('Please check your Duke inbox to verify your account.');
                } else {
                    setUser(currentUser);
                    setError(null);
                    setFirestoreIsAdmin(isAdminEmail(currentUser.email));

                    const cached = readCachedTabPreferences(currentUser.uid);
                    if (cached) {
                        setTabPreferences(mergeTabPreferences(cached));
                    }
                }
            } else {
                setUser(null);
                setTabPreferences(DEFAULT_TABS);
                setFirestoreIsAdmin(false);
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

                if (data?.isAdmin === true) {
                    setFirestoreIsAdmin(true);
                } else if (isAdminEmail(user.email)) {
                    setFirestoreIsAdmin(true);
                    try {
                        await setDoc(userRef, { isAdmin: true }, { merge: true });
                    } catch (err) {
                        console.error('Error bootstrapping admin flag:', err);
                    }
                } else {
                    setFirestoreIsAdmin(false);
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

    const signInWithEmail = async (email: string, pass: string) => {
        setError(null);
        if (!email.endsWith('@duke.edu')) {
            setError('Only @duke.edu email addresses are allowed.');
            return;
        }

        try {
            const result = await signInWithEmailAndPassword(auth, email, pass);
            if (!result.user.emailVerified) {
                await sendEmailVerification(result.user);
                await firebaseSignOut(auth);
                setError('Please check your Duke inbox to verify your account.');
                return;
            }
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                setError('Invalid email or password.');
            } else {
                setError('Failed to sign in. Please try again.');
            }
        }
    };

    const signUpWithEmail = async (email: string, pass: string) => {
        setError(null);
        if (!email.endsWith('@duke.edu')) {
            setError('Only @duke.edu email addresses are allowed.');
            return;
        }

        try {
            const result = await createUserWithEmailAndPassword(auth, email, pass);
            const userEmail = result.user.email;

            if (!userEmail?.endsWith('@duke.edu')) {
                await firebaseSignOut(auth);
                setError('Only @duke.edu email addresses are allowed.');
                throw new Error('Invalid domain');
            }

            await sendEmailVerification(result.user);
            await firebaseSignOut(auth);
            setError('Please check your Duke inbox to verify your account.');
        } catch (err: any) {
            console.error(err);
            if (err.message === 'Invalid domain') {
                // Error already set
            } else if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use at least 6 characters.');
            } else {
                setError('Failed to create account. Please try again.');
            }
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
            console.error("Error saving preferences:", err);
        }
    };

    const isAdmin = user
        ? isAdminEmail(user.email) || firestoreIsAdmin
        : false;

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            isAdmin,
            tabPreferences,
            updateTabPreferences
        }}>
            {loading ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col">
                    <div className="w-8 h-8 border-4 border-[#001A57] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-gray-500">Connecting securely...</p>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
