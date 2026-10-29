import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Public pages
import { LandingPage } from '@/pages/LandingPage';
import { ExplorePage } from '@/pages/ExplorePage';
import { ProviderProfilePage } from '@/pages/ProviderProfilePage';
import { BookingPage } from '@/pages/BookingPage';
import { AboutPage } from '@/pages/AboutPage';
import { HowItWorksPage } from '@/pages/HowItWorksPage';
import { BecomeProviderPage } from '@/pages/BecomeProviderPage';
import { ContactPage } from '@/pages/ContactPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { SignupPage } from '@/pages/auth/SignupPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

// Onboarding
import { OnboardingPage } from '@/pages/OnboardingPage';

// Learner dashboard
import { LearnerDashboardHome } from '@/pages/learner/DashboardHome';
import { MyBookingsPage } from '@/pages/learner/MyBookingsPage';
import { MessagesPage } from '@/pages/learner/MessagesPage';
import { LearnerReviewsPage } from '@/pages/learner/ReviewsPage';
import { LearnerProfilePage } from '@/pages/learner/ProfilePage';
import { SavedItemsPage } from '@/pages/learner/SavedItemsPage';

// Provider dashboard
import { ProviderDashboard } from '@/pages/provider/ProviderDashboard';
import { ProviderSkillsPage } from '@/pages/provider/ProviderSkillsPage';
import { ProviderBookingsPage } from '@/pages/provider/ProviderBookingsPage';
import { ProviderEarningsPage } from '@/pages/provider/ProviderEarningsPage';
import { ProviderAvailabilityPage } from '@/pages/provider/ProviderAvailabilityPage';
import { ProviderQuestionnairePage } from '@/pages/provider/ProviderQuestionnairePage';

// Admin
import { AdminDashboard } from '@/pages/admin/AdminDashboard';

// Shared
import { SettingsPage } from '@/pages/SettingsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SupportPage } from '@/pages/SupportPage';

// ── Protected route wrappers ──────────────────────────────────────────────────

// Generic: requires authentication. Redirects to /login when unauthenticated.
// Waits for session restoration before redirecting so a page refresh does not
// flash the login screen for an already-authenticated user.
function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, initialising } = useAuth();
  if (initialising) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Provider-only: must be authenticated AND have role 'provider'.
// Learners and admins are redirected to their own home routes.
function ProviderRoute({ children }: { children: React.ReactNode }) {
  const { user, initialising } = useAuth();
  if (initialising) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role !== 'provider') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Admin-only: already handled by ProtectedRoute roles prop, but kept explicit for clarity.
// Kept as an alias so future admin sub-routes are self-documenting.
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, initialising } = useAuth();
  if (initialising) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// ── Loading fallback ──────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/skills" element={<ExplorePage />} />
        <Route path="/providers/:id" element={<ProviderProfilePage />} />
        <Route path="/booking/:id" element={<BookingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/become-a-provider" element={<BecomeProviderPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* ── Auth ── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        {/* Public — Supabase sets a temporary recovery session via URL fragment */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ── Onboarding ── */}
        <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

        {/* ── Learner dashboard ── */}
        <Route path="/dashboard" element={<ProtectedRoute><LearnerDashboardHome /></ProtectedRoute>} />
        <Route path="/dashboard/bookings" element={<ProtectedRoute><MyBookingsPage /></ProtectedRoute>} />
        <Route path="/dashboard/messages" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
        <Route path="/dashboard/reviews" element={<ProtectedRoute><LearnerReviewsPage /></ProtectedRoute>} />
        <Route path="/dashboard/profile" element={<ProtectedRoute><LearnerProfilePage /></ProtectedRoute>} />
        <Route path="/dashboard/saved" element={<ProtectedRoute><SavedItemsPage /></ProtectedRoute>} />

        {/* ── Provider dashboard ── */}
        <Route path="/provider" element={<ProviderRoute><ProviderDashboard /></ProviderRoute>} />
        <Route path="/provider/questionnaire" element={<ProviderRoute><ProviderQuestionnairePage /></ProviderRoute>} />
        <Route path="/provider/skills" element={<ProviderRoute><ProviderSkillsPage /></ProviderRoute>} />
        <Route path="/provider/bookings" element={<ProviderRoute><ProviderBookingsPage /></ProviderRoute>} />
        <Route path="/provider/messages" element={<ProviderRoute><MessagesPage /></ProviderRoute>} />
        <Route path="/provider/reviews" element={<ProviderRoute><LearnerReviewsPage /></ProviderRoute>} />
        <Route path="/provider/earnings" element={<ProviderRoute><ProviderEarningsPage /></ProviderRoute>} />
        <Route path="/provider/availability" element={<ProviderRoute><ProviderAvailabilityPage /></ProviderRoute>} />
        <Route path="/provider/profile" element={<ProviderRoute><SettingsPage /></ProviderRoute>} />

        {/* ── Admin ── */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />

        {/* ── Shared ── */}
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/settings/:tab" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
        <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />

        {/* ── Fallback ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
