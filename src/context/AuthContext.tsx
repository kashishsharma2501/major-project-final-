/**
 * AuthContext — SkillShare Local
 *
 * Real Supabase Auth implementation replacing the previous mock.
 *
 * What changed from the mock:
 *   • login()   → supabase.auth.signInWithPassword()  (password is validated)
 *   • signup()  → supabase.auth.signUp()              (new — was missing)
 *   • logout()  → supabase.auth.signOut()
 *   • resetPassword() → supabase.auth.resetPasswordForEmail()  (new)
 *   • Session is restored from localStorage on startup via onAuthStateChange
 *   • AuthUser is populated from the profiles table, not mock fixtures
 *   • switchRole() removed — role comes from the database, not a UI toggle
 *
 * What did NOT change (preserved for zero-churn in consuming components):
 *   • useAuth() hook API
 *   • AuthUser shape (id, name, email, avatar, role, city, isAuthenticated)
 *   • isAuthenticated boolean
 *   • login(email, password) signature (role param dropped — comes from DB)
 *   • logout() signature
 *
 * Demo accounts:
 *   These still work — the demo emails/passwords must exist as real Supabase
 *   Auth users with matching profiles rows. Until the backend is connected the
 *   app will show a clear "backend not configured" message rather than
 *   silently pretending to work.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import type { Session, AuthError } from '@supabase/supabase-js';
import type { AuthUser, UserRole } from '@/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// ── Helper: wrap supabase as a resolved promise for consistent call pattern ──
async function getSupabase() {
  return isSupabaseConfigured ? supabase : null;
}

// ── Types ────────────────────────────────────────────────────────────────────

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'network_error'
  | 'backend_not_configured'
  | 'unknown';

export interface AuthResult {
  error: AuthErrorCode | null;
  /** Human-readable message safe to show in the UI */
  message: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** True while the initial session is being restored from storage */
  initialising: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (
    email: string,
    password: string,
    metadata: { name: string; role: 'learner' | 'provider'; city: string }
  ) => Promise<AuthResult & { needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  /** Update the authenticated user's profile fields in the database */
  updateProfile: (fields: {
    name?: string;
    city?: string;
    bio?: string;
    languages?: string[];
    onboarding_complete?: boolean;
  }) => Promise<AuthResult>;
  /** Change the authenticated user's password via Supabase Auth */
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  /** Upload a new avatar image and update avatar_url in profile + in-memory user */
  updateAvatar: (avatarUrl: string | null) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Helpers ──────────────────────────────────────────────────────────────────

function classifyError(err: AuthError | Error | unknown): AuthErrorCode {
  if (!err) return 'unknown';
  const msg = (err as AuthError).message ?? String(err);
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'invalid_credentials';
  }
  if (msg.includes('Email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'email_not_confirmed';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
    return 'network_error';
  }
  if (msg.includes('Missing Supabase environment')) {
    return 'backend_not_configured';
  }
  return 'unknown';
}

const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Incorrect email or password. Please try again.',
  email_not_confirmed: 'Please confirm your email address before signing in. Check your inbox.',
  network_error: 'Could not reach the server. Check your internet connection and try again.',
  backend_not_configured:
    'The backend is not configured yet. Create a .env.local file with your Supabase credentials.',
  // 'unknown' falls through to the raw Supabase message (see classifyError callers below)
  unknown: 'Something went wrong. Please try again.',
};

/**
 * Fetch the profile row for a given user id and build an AuthUser.
 * Returns null if the profile does not exist yet (trigger may still be running).
 */
async function fetchProfile(userId: string): Promise<AuthUser | null> {
  const sb = await getSupabase();
  if (!sb) return null;

  const { data, error } = await sb
    .from('profiles')
    .select('id, name, email, avatar_url, city, role, bio, languages')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    avatar: data.avatar_url ?? undefined,
    city: data.city,
    role: data.role as UserRole,
    bio: (data as any).bio ?? undefined,
    languages: (data as any).languages ?? [],
    isAuthenticated: true,
  };
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initialising, setInitialising] = useState(true);
  // Keep a ref to the current session so we can unsubscribe cleanly
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  // ── Session initialisation and subscription ──────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      const sb = await getSupabase();

      if (!sb) {
        // Backend not configured — stay logged out, clear loading state
        if (!cancelled) setInitialising(false);
        return;
      }

      // 1. Restore any existing session from localStorage
      const { data: { session } } = await sb.auth.getSession();
      if (!cancelled && session?.user) {
        const profile = await fetchProfile(session.user.id);
        if (!cancelled) setUser(profile);
      }

      // 2. Subscribe to future auth state changes (login, logout, token refresh)
      const { data: { subscription } } = sb.auth.onAuthStateChange(
        async (_event: string, session: Session | null) => {
          if (session?.user) {
            const profile = await fetchProfile(session.user.id);
            setUser(profile);
          } else {
            setUser(null);
          }
        }
      );

      subscriptionRef.current = subscription;
      if (!cancelled) setInitialising(false);
    }

    init();

    return () => {
      cancelled = true;
      subscriptionRef.current?.unsubscribe();
    };
  }, []);

  // ── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (
    email: string,
    password: string,
  ): Promise<AuthResult> => {
    const sb = await getSupabase();
    if (!sb) {
      return {
        error: 'backend_not_configured',
        message: ERROR_MESSAGES.backend_not_configured,
      };
    }

    const { error } = await sb.auth.signInWithPassword({ email, password });

    if (error) {
      const code = classifyError(error);
      const message = code === 'unknown'
        ? (error.message ?? ERROR_MESSAGES.unknown)
        : ERROR_MESSAGES[code];
      return { error: code, message };
    }

    // onAuthStateChange will call fetchProfile and setUser automatically
    return { error: null, message: null };
  }, []);

  // ── signup ───────────────────────────────────────────────────────────────
  const signup = useCallback(async (
    email: string,
    password: string,
    metadata: { name: string; role: 'learner' | 'provider'; city: string },
  ): Promise<AuthResult & { needsConfirmation: boolean }> => {
    const sb = await getSupabase();
    if (!sb) {
      return {
        error: 'backend_not_configured',
        message: ERROR_MESSAGES.backend_not_configured,
        needsConfirmation: false,
      };
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: metadata.name,
          // Only 'learner' and 'provider' are accepted by the handle_new_user trigger
          role: metadata.role,
          city: metadata.city,
        },
      },
    });

    if (error) {
      const code = classifyError(error);
      // For unknown errors surface the raw Supabase message so the cause is visible
      const message = code === 'unknown'
        ? (error.message ?? ERROR_MESSAGES.unknown)
        : ERROR_MESSAGES[code];
      return { error: code, message, needsConfirmation: false };
    }

    // Supabase returns a user but no session when email confirmation is required
    const needsConfirmation = !!data.user && !data.session;

    return { error: null, message: null, needsConfirmation };
  }, []);

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const sb = await getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null);
  }, []);

  // ── resetPassword ────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email: string): Promise<AuthResult> => {
    const sb = await getSupabase();
    if (!sb) {
      return {
        error: 'backend_not_configured',
        message: ERROR_MESSAGES.backend_not_configured,
      };
    }

    const { error } = await sb.auth.resetPasswordForEmail(email, {
      // The user will be redirected here after clicking the reset link.
      // This route must be added to your Supabase Auth redirect allow-list.
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      const code = classifyError(error);
      return { error: code, message: ERROR_MESSAGES[code] };
    }

    return { error: null, message: null };
  }, []);

  // ── updateProfile ─────────────────────────────────────────────────────────
  const updateProfile = useCallback(async (fields: {
    name?: string;
    city?: string;
    bio?: string;
    languages?: string[];
    onboarding_complete?: boolean;
  }): Promise<AuthResult> => {
    const sb = await getSupabase();
    if (!sb) return { error: 'backend_not_configured', message: ERROR_MESSAGES.backend_not_configured };

    const { error } = await sb
      .from('profiles')
      .update(fields)
      .eq('id', (await sb.auth.getUser()).data.user?.id ?? '');

    if (error) {
      const code = classifyError(error);
      const message = code === 'unknown' ? (error.message ?? ERROR_MESSAGES.unknown) : ERROR_MESSAGES[code];
      return { error: code, message };
    }

    // Refresh the in-memory user object
    if (user) {
      setUser(prev => prev ? { ...prev, ...fields } : null);
    }
    return { error: null, message: null };
  }, [user]);

  // ── updatePassword ────────────────────────────────────────────────────────
  const updatePassword = useCallback(async (newPassword: string): Promise<AuthResult> => {
    const sb = await getSupabase();
    if (!sb) return { error: 'backend_not_configured', message: ERROR_MESSAGES.backend_not_configured };

    const { error } = await sb.auth.updateUser({ password: newPassword });

    if (error) {
      const code = classifyError(error);
      const message = code === 'unknown' ? (error.message ?? ERROR_MESSAGES.unknown) : ERROR_MESSAGES[code];
      return { error: code, message };
    }
    return { error: null, message: null };
  }, []);

  // ── updateAvatar (in-memory sync after upload) ───────────────────────────
  const updateAvatar = useCallback((avatarUrl: string | null) => {
    setUser(prev => prev ? { ...prev, avatar: avatarUrl ?? undefined } : null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      initialising,
      login,
      signup,
      logout,
      resetPassword,
      updateProfile,
      updatePassword,
      updateAvatar,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
