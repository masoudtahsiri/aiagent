import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { LoadingScreen } from '@/components/shared/loading-screen';
import { AppShell } from '@/components/layout/app-shell';
import { AuthGuard } from '@/features/auth/auth-guard';

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/login'));
const SignupPage = lazy(() => import('@/pages/auth/signup'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password'));

// Onboarding
const OnboardingPage = lazy(() => import('@/pages/onboarding'));

// Main app pages - New structure
const OverviewPage = lazy(() => import('@/pages/dashboard'));
const AISetupPage = lazy(() => import('@/pages/ai'));
const BusinessPage = lazy(() => import('@/pages/business'));
const ServicesPage = lazy(() => import('@/pages/services'));
const TeamPage = lazy(() => import('@/pages/team'));
const CustomersPage = lazy(() => import('@/pages/customers'));
const CustomerDetailPage = lazy(() => import('@/pages/customers/detail'));
const ActivityPage = lazy(() => import('@/pages/activity'));
const SettingsPage = lazy(() => import('@/pages/settings'));

// Error pages
const NotFoundPage = lazy(() => import('@/pages/errors/not-found'));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* Onboarding */}
        <Route element={<AuthGuard />}>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>

        {/* Protected routes - New structure */}
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            {/* Main navigation */}
            <Route path="/" element={<OverviewPage />} />
            <Route path="/ai" element={<AISetupPage />} />
            <Route path="/business" element={<BusinessPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/services" element={<ServicesPage />} />

            {/* Redirects from old routes */}
            <Route path="/ai-config" element={<Navigate to="/ai" replace />} />
            <Route path="/ai-config/*" element={<Navigate to="/ai" replace />} />
            <Route path="/staff" element={<Navigate to="/team" replace />} />
            <Route path="/staff/*" element={<Navigate to="/team" replace />} />
            <Route path="/hours" element={<Navigate to="/business?tab=hours" replace />} />
            <Route path="/calls" element={<Navigate to="/activity?tab=calls" replace />} />
            <Route path="/appointments" element={<Navigate to="/activity?tab=appointments" replace />} />
            <Route path="/integrations" element={<Navigate to="/settings" replace />} />
            <Route path="/messaging" element={<Navigate to="/settings" replace />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
