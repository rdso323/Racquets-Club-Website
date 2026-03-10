import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendEmailVerification,
    signOut as firebaseSignOut
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface TabPreference {
    id: string;
    visible: boolean;
}

const DEFAULT_TABS: TabPreference[] = [
    { id: 'Tennis', visible: true },
    { id: 'Badminton', visible: true },
    { id: 'Squash', visible: true }
];

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

// Using a specific ID or email for the admin, or a generic check.
const ADMIN_EMAILS = ['rohan@duke.edu', 'admin@duke.edu', 'rohan.dsouza@duke.edu']; // Assuming we can use these for admin check

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tabPreferences, setTabPreferences] = useState<TabPreference[]>(DEFAULT_TABS);

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

                    // Fetch settings once on login
                    try {
                        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                        if (userDoc.exists() && userDoc.data().tabPreferences) {
                            setTabPreferences(userDoc.data().tabPreferences);
                        } else {
                            // Migration / Default
                            const local = localStorage.getItem('booking_tabs_preferences');
                            if (local) {
                                try {
                                    const parsed = JSON.parse(local);
                                    setTabPreferences(parsed);
                                    // Sync to firestore immediately so it's backed up
                                    await setDoc(doc(db, 'users', currentUser.uid), { tabPreferences: parsed }, { merge: true });
                                } catch (e) { }
                            }
                        }
                    } catch (err) {
                        console.error("Error fetching user settings:", err);
                    }
                }
            } else {
                setUser(null);
                setTabPreferences(DEFAULT_TABS);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

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
        setTabPreferences(newTabs);
        if (user) {
            try {
                await setDoc(doc(db, 'users', user.uid), { tabPreferences: newTabs }, { merge: true });
            } catch (err) {
                console.error("Error saving preferences:", err);
            }
        }
    };

    const isAdmin = user ? ADMIN_EMAILS.includes(user.email || '') : false;

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
