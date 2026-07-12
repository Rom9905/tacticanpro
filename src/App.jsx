import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from '@/lib/LanguageContext'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AdminAnalytics from '@/pages/AdminAnalytics';
import MatchFileAnalysis from '@/pages/MatchFileAnalysis';
import PricingPlans from '@/pages/PricingPlans';
import Terms from '@/pages/Terms';
import CancellationPolicy from '@/pages/CancellationPolicy';
import AccessibilityStatement from '@/pages/AccessibilityStatement';
import UserManagement from '@/pages/UserManagement';
import Admin from '@/pages/Admin';
import SubscriptionBlocked from '@/pages/SubscriptionBlocked';
import Login from '@/pages/Login';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, isAuthenticated, authError, navigateToLogin, subscriptionStatus, user } = useAuth();

  // Show loading spinner while checking auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: '#0D1A12' }}>
        <div className="w-8 h-8 border-4 border-emerald-900 border-t-emerald-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  // Not authenticated — show login (except for public pages)
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/cancellation-policy" element={<CancellationPolicy />} />
        <Route path="/accessibility" element={<AccessibilityStatement />} />
        <Route path="/pricing-plans" element={<PricingPlans />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  // Subscription check — admin always passes, others need active subscription
  const isAdmin = user?.email === 'romfranko99@gmail.com';
  if (!isAdmin && subscriptionStatus !== 'active') {
    return (
      <Routes>
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<SubscriptionBlocked />} />
      </Routes>
    );
  }

  // Authenticated — render the full app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/admin-analytics" element={<AdminAnalytics />} />
      <Route path="/match-file-analysis" element={
        <LayoutWrapper currentPageName="MatchFileAnalysis">
          <MatchFileAnalysis />
        </LayoutWrapper>
      } />
      <Route path="/pricing-plans" element={<PricingPlans />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cancellation-policy" element={<CancellationPolicy />} />
      <Route path="/accessibility" element={<AccessibilityStatement />} />
      <Route path="/user-management" element={<UserManagement />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <LanguageProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </LanguageProvider>
  )
}

export default App