import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ReactLenis, useLenis } from 'lenis/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { UIProvider, useUI } from './components/system/UIProvider';
import Preloader from './components/system/Preloader';
import TopBar from './components/system/TopBar';
import MenuOverlay from './components/system/MenuOverlay';
import PointerSurface from './components/system/PointerSurface';
import FeedbackModal from './components/layout/FeedbackModal';
import { usePointerVars } from './hooks/usePointerVars';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

const RouteLoader = () => (
    <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-court-accent border-t-transparent" />
    </div>
);

const ProtectedRoute = ({
    children,
    requireAdmin = false,
}: {
    children: React.ReactNode;
    requireAdmin?: boolean;
}) => {
    const { user, isAdmin, loading } = useAuth();
    if (loading) return <RouteLoader />;
    if (!user) return <Navigate to="/login" replace />;
    if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
    return <>{children}</>;
};

const ScrollLock = () => {
    const { menuOpen } = useUI();
    const lenis = useLenis();
    useEffect(() => {
        if (menuOpen) lenis?.stop();
        else lenis?.start();
    }, [menuOpen, lenis]);
    return null;
};

const ScrollReset = () => {
    const { pathname } = useLocation();
    const lenis = useLenis();
    useEffect(() => {
        lenis?.scrollTo(0, { immediate: true, force: true });
    }, [pathname, lenis]);
    return null;
};

const AppRoutes = () => {
    const { user, loading } = useAuth();
    const { feedbackOpen, closeFeedback } = useUI();

    return (
        <>
            <Routes>
                <Route
                    path="/login"
                    element={loading ? <RouteLoader /> : !user ? <Login /> : <Navigate to="/" replace />}
                />
                <Route path="/" element={<Home />} />
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute requireAdmin>
                            <div className="px-5 py-24 md:px-10">
                                <AdminDashboard />
                            </div>
                        </ProtectedRoute>
                    }
                />
            </Routes>
            <FeedbackModal isOpen={feedbackOpen} onClose={closeFeedback} />
        </>
    );
};

const Shell = () => {
    const [booted, setBooted] = useState(false);
    usePointerVars();

    return (
        <UIProvider>
            <div className="grain min-h-screen bg-white text-gray-900 dark:bg-court-950 dark:text-chalk">
                {!booted && <Preloader onDone={() => setBooted(true)} />}

                {booted && (
                    <>
                        <ScrollLock />
                        <ScrollReset />
                        <TopBar />
                        <MenuOverlay />
                        <PointerSurface />
                        <AppRoutes />
                    </>
                )}
            </div>
        </UIProvider>
    );
};

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <ReactLenis root options={{ lerp: 0.08, smoothWheel: true }}>
                        <Shell />
                    </ReactLenis>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
