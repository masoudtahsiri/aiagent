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

// Main app pages
const DashboardPage = lazy(() => import('@/pages/dashboard'));
const AppointmentsPage = lazy(() => import('@/pages/appointments'));
const CustomersPage = lazy(() => import('@/pages/customers'));
const CustomerDetailPage = lazy(() => import('@/pages/customers/detail'));
const StaffPage = lazy(() => import('@/pages/staff'));
const StaffDetailPage = lazy(() => import('@/pages/staff/detail'));
const ServicesPage = lazy(() => import('@/pages/services'));
const CallsPage = lazy(() => import('@/pages/calls'));
const AIConfigPage = lazy(() => import('@/pages/ai-config'));
const AIRolesPage = lazy(() => import('@/pages/ai-config/roles'));
const KnowledgeBasePage = lazy(() => import('@/pages/ai-config/knowledge'));
const MessagingPage = lazy(() => import('@/pages/messaging'));
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

        {/* Protected routes */}
        <Route element={<AuthGuard />}>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/staff" element={<StaffPage />} />
            <Route path="/staff/:id" element={<StaffDetailPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/calls" element={<CallsPage />} />
            <Route path="/ai-config" element={<AIConfigPage />} />
            <Route path="/ai-config/roles" element={<AIRolesPage />} />
            <Route path="/ai-config/knowledge" element={<KnowledgeBasePage />} />
            <Route path="/messaging" element={<MessagingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
