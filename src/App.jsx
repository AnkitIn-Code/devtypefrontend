import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from '@store/auth.store';
import { ROUTES } from '@constants';
import { Spinner } from '@components/common/Badge';

// Lazy load pages for code splitting
const Landing = lazy(() => import('@pages/Landing'));
const Login = lazy(() => import('@pages/Login'));
const Signup = lazy(() => import('@pages/Signup'));
const ForgotPassword = lazy(() => import('@pages/ForgotPassword'));
const Dashboard = lazy(() => import('@pages/Dashboard'));
const Typing = lazy(() => import('@pages/Typing'));
const Templates = lazy(() => import('@pages/Templates'));
const CreateTemplate = lazy(() => import('@pages/CreateTemplate'));
const AITemplate = lazy(() => import('@pages/AITemplate'));
const Multiplayer = lazy(() => import('@pages/Multiplayer'));
const MultiplayerRoom = lazy(() => import('@pages/MultiplayerRoom'));
const Leaderboard = lazy(() => import('@pages/Leaderboard'));
const Reports = lazy(() => import('@pages/Reports'));
const ReportDetail = lazy(() => import('@pages/ReportDetail'));
const Profile = lazy(() => import('@pages/Profile'));
const Achievements = lazy(() => import('@pages/Achievements'));
const Settings = lazy(() => import('@pages/Settings'));
const NotFound = lazy(() => import('@pages/NotFound'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Route guards
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to={ROUTES.LOGIN} replace />;
};

const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated ? children : <Navigate to={ROUTES.DASHBOARD} replace />;
};

// Page loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="text-muted text-sm">Loading...</p>
    </div>
  </div>
);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public Routes */}
            <Route path={ROUTES.HOME} element={<Landing />} />
            <Route path={ROUTES.TYPING} element={<Typing />} />
            <Route path={ROUTES.TYPING_TEMPLATE} element={<Typing />} />
            <Route path={ROUTES.TEMPLATES} element={<Templates />} />
            <Route path={ROUTES.LEADERBOARD} element={<Leaderboard />} />

            {/* Auth Routes (redirect if logged in) */}
            <Route path={ROUTES.LOGIN} element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path={ROUTES.SIGNUP} element={<PublicOnlyRoute><Signup /></PublicOnlyRoute>} />
            <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />

            {/* Protected Routes */}
            <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path={ROUTES.CREATE_TEMPLATE} element={<ProtectedRoute><CreateTemplate /></ProtectedRoute>} />
            <Route path={ROUTES.AI_TEMPLATE} element={<ProtectedRoute><AITemplate /></ProtectedRoute>} />
            <Route path={ROUTES.MULTIPLAYER} element={<ProtectedRoute><Multiplayer /></ProtectedRoute>} />
            <Route path={ROUTES.MULTIPLAYER_ROOM} element={<ProtectedRoute><MultiplayerRoom /></ProtectedRoute>} />
            <Route path={ROUTES.REPORTS} element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path={ROUTES.REPORT_DETAIL} element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
            <Route path={ROUTES.PROFILE} element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path={ROUTES.ACHIEVEMENTS} element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
            <Route path={ROUTES.SETTINGS} element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>

      {/* Global Toast Notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#27272A',
            color: '#FAFAFA',
            border: '1px solid #3F3F46',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#EAB308', secondary: '#18181B' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#18181B' },
          },
        }}
      />
    </QueryClientProvider>
  );
}

export default App;
