import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/layout/Navbar';
import Ticker from './components/layout/Ticker';
import FeedbackModal from './components/layout/FeedbackModal';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';

const ProtectedRoute = ({ children, requireAdmin = false }: { children: React.ReactNode, requireAdmin?: boolean }) => {
  const { user, isAdmin } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-x-clip bg-gradient-to-br from-gray-50 to-emerald-50/40 dark:from-court-950 dark:to-court-950 dark:bg-court-950 flex flex-col font-sans transition-colors duration-300">
      {/* Ambient canvas glows (decorative) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 hidden dark:block">
        <div className="scroll-drift absolute -top-32 -left-40 w-[40rem] h-[40rem] rounded-full bg-court-500/15 blur-[140px]" />
        <div className="scroll-drift absolute top-[35%] -right-48 w-[36rem] h-[36rem] rounded-full bg-clay-600/15 blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 w-[30rem] h-[30rem] rounded-full bg-wimbledon-gold/[0.07] blur-[160px]" />
      </div>

      <Ticker />
      <Navbar />
      <main className="relative z-10 flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <footer className="relative z-10 bg-white dark:bg-court-950/80 border-t border-gray-200 dark:border-court-line/10 mt-auto py-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-500 dark:text-court-line/50">
          <div className="flex items-center gap-3">
            <span className="font-display italic text-base text-wimbledon-navy dark:text-court-line/80">Fuqua Racquets Club</span>
            <span className="hidden sm:inline text-gray-300 dark:text-court-line/20">·</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div>
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="text-wimbledon-navy dark:text-wimbledon-gold hover:underline font-semibold transition-colors"
            >
              Have Feedback? We'd love to hear it.
            </button>
          </div>
        </div>
      </footer>
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <AppLayout>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
        <Route path="/" element={<Home />} />
        <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
      </Routes>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
