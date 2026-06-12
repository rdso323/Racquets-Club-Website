import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactLenis, useLenis } from 'lenis/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UIProvider, useUI } from './components/system/UIProvider';
import { TransitionProvider } from './components/system/TransitionProvider';
import Preloader from './components/system/Preloader';
import TopBar from './components/system/TopBar';
import MenuOverlay from './components/system/MenuOverlay';
import CustomCursor from './components/system/CustomCursor';
import FeedbackModal from './components/layout/FeedbackModal';
import Home from './pages/Home';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';

/*
 * FRC — AFTER DARK OS
 * One continuous surface: Lenis-smoothed scroll, shutter-bladed route
 * transitions, HUD chrome over every page. Auth + Firestore plumbing
 * untouched underneath.
 */

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
    const { user, isAdmin } = useAuth();

    if (!user) return <Navigate to="/login" replace />;
    if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

    return <>{children}</>;
};

/** Freeze the scroll while the command deck (menu) is open. */
const ScrollLock = () => {
    const { menuOpen } = useUI();
    const lenis = useLenis();
    useEffect(() => {
        if (menuOpen) lenis?.stop();
        else lenis?.start();
    }, [menuOpen, lenis]);
    return null;
};

/** Hard scroll reset for redirect-style navigations (guards, post-login). */
const ScrollReset = () => {
    const { pathname } = useLocation();
    const lenis = useLenis();
    useEffect(() => {
        lenis?.scrollTo(0, { immediate: true, force: true });
        window.scrollTo(0, 0);
    }, [pathname, lenis]);
    return null;
};

const AppRoutes = () => {
    const { user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
        </Routes>
    );
};

const Shell = () => {
    const [booted, setBooted] = useState(false);

    return (
        <TransitionProvider>
            <UIProvider>
                <div className="grain min-h-screen bg-court text-chalk selection:bg-ace">
                    {!booted && <Preloader onDone={() => setBooted(true)} />}

                    {booted && (
                        <>
                            <ScrollLock />
                            <ScrollReset />
                            <TopBar />
                            <MenuOverlay />
                            <AppRoutes />
                            <FeedbackModal />
                        </>
                    )}

                    <CustomCursor />
                </div>
            </UIProvider>
        </TransitionProvider>
    );
};

function App() {
    return (
        <AuthProvider>
            <ReactLenis root options={{ lerp: 0.09, smoothWheel: true }}>
                <Router>
                    <Shell />
                </Router>
            </ReactLenis>
        </AuthProvider>
    );
}

export default App;
