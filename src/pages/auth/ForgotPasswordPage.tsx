import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setLoading(true);

    // Real Supabase password reset — sends an actual email.
    // Supabase does not reveal whether the email exists (prevents enumeration).
    // The UI always shows the "check your email" state on success.
    const result = await resetPassword(email);

    setLoading(false);

    if (result.error) {
      setError(result.message ?? 'Something went wrong. Please try again.');
      return;
    }

    setSent(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo size="md" />
        </div>

        <div className="card p-8">
          {!sent ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mb-5">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Reset your password</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Enter the email address linked to your account and we'll send you a password reset link.
              </p>
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  leftIcon={<Mail className="w-4 h-4" />}
                  error={error}
                  required
                />
                <Button type="submit" variant="primary" className="w-full h-11" loading={loading}>
                  {!loading && 'Send Reset Link'}
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-2">Check your email</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                If an account exists for
              </p>
              <p className="font-semibold text-[#0F172A] dark:text-slate-100 mb-4">{email}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                a reset link has been sent. The link expires in 1 hour. Check your spam folder if you don't see it.
              </p>
              <Button variant="ghost" className="text-sm" onClick={() => { setSent(false); setEmail(''); }}>
                Try a different email
              </Button>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#1E293B] flex justify-center">
            <Link
              to="/login"
              className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
