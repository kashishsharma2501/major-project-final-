/**
 * ResetPasswordPage — SkillShare Local
 * Handles the final step of Supabase password-reset flow.
 * Supabase fires PASSWORD_RECOVERY via onAuthStateChange when the user
 * arrives from the email link (detectSessionInUrl: true in supabase.ts).
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

type PageState = 'loading' | 'invalid_link' | 'form' | 'success' | 'error';

export function ResetPasswordPage() {
  const navigate = useNavigate();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Wait for Supabase to exchange the URL token for a session
  useEffect(() => {
    let cancelled = false;
    let subscription: { unsubscribe: () => void } | null = null;
    const timeoutId = setTimeout(() => {
      if (!cancelled) setPageState('invalid_link');
    }, 5000);

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && !cancelled) {
        clearTimeout(timeoutId);
        setPageState('form');
        return;
      }
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (cancelled) return;
        if (event === 'PASSWORD_RECOVERY') {
          clearTimeout(timeoutId);
          setPageState('form');
        }
      });
      subscription = data.subscription;
    }

    init();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      subscription?.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-redirect to login after success
  useEffect(() => {
    if (pageState !== 'success') return;
    const id = setTimeout(() => navigate('/login', { replace: true }), 3000);
    return () => clearTimeout(id);
  }, [pageState, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const errs: Record<string, string> = {};
    if (password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (password !== confirm) errs.confirm = 'Passwords do not match.';
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setFieldErrors({});
    setSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (error) {
      if (error.message.includes('expired') || error.message.includes('invalid') || error.message.includes('Auth session missing')) {
        setPageState('invalid_link');
      } else {
        setServerError(error.message ?? 'Failed to update password. Please try again.');
        setPageState('error');
      }
      return;
    }
    await supabase.auth.signOut().catch(() => {});
    setPageState('success');
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8"><Logo size="md" /></div>
        <div className="card p-8">{children}</div>
      </div>
    </div>
  );

  if (pageState === 'loading') {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Verifying reset link…</p>
        </div>
      </Shell>
    );
  }

  if (pageState === 'invalid_link') {
    return (
      <Shell>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-2">Link expired or invalid</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            This password reset link has expired or has already been used. Links are valid for one hour and can only be used once.
          </p>
          <Link to="/forgot-password">
            <Button variant="primary" className="w-full">Request a new link</Button>
          </Link>
          <div className="mt-4">
            <Link to="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
              Back to sign in
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  if (pageState === 'success') {
    return (
      <Shell>
        <div className="text-center py-4">
          <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-2">Password updated</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Your password has been changed. Redirecting you to sign in…
          </p>
          <Link to="/login" replace>
            <Button variant="primary" className="w-full">
              Sign in now <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // form | error
  return (
    <Shell>
      <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-5">
        <Lock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
      </div>
      <h1 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Choose a new password</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        Enter a new password for your account. You will be signed out of all other devices.
      </p>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="New password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={e => { setPassword(e.target.value); setFieldErrors(p => ({ ...p, password: '' })); }}
          placeholder="At least 8 characters"
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowPassword(v => !v)}
              className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle">
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={fieldErrors.password}
          hint="Minimum 8 characters"
        />
        <Input
          label="Confirm new password"
          type={showConfirm ? 'text' : 'password'}
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setFieldErrors(p => ({ ...p, confirm: '' })); }}
          placeholder="Re-enter your new password"
          autoComplete="new-password"
          leftIcon={<Lock className="w-4 h-4" />}
          rightIcon={
            <button type="button" onClick={() => setShowConfirm(v => !v)}
              className="text-slate-400 hover:text-slate-600 transition-colors" aria-label="Toggle">
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          error={fieldErrors.confirm}
        />
        {serverError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400" role="alert">
            {serverError}
          </div>
        )}
        <Button type="submit" variant="primary" className="w-full h-11" loading={submitting}>
          {!submitting && <>Update password <ArrowRight className="w-4 h-4" /></>}
        </Button>
      </form>
      <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#1E293B] flex justify-center">
        <Link to="/login" className="text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors">
          Back to sign in
        </Link>
      </div>
    </Shell>
  );
}
