import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, MapPin, ArrowRight, CheckCircle } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';

const indianCities = [
  'Ludhiana', 'Chandigarh', 'Amritsar', 'Jalandhar', 'Delhi',
  'Patiala', 'Mohali', 'Gurugram', 'Noida', 'Jaipur',
];

const providerBenefits = [
  'Set your own prices',
  'Choose your availability',
  'Build your review profile',
  'Reach local learners',
];

export function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signup } = useAuth();

  const defaultRole = searchParams.get('role') === 'provider' ? 'provider' : 'learner';

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    city: 'Ludhiana',
    role: defaultRole as 'learner' | 'provider',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');
  const [step, setStep] = useState<'form' | 'verify'>('form');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email address.';
    if (form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    if (!form.city) e.city = 'Please select your city.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setServerError('');
    setLoading(true);

    const result = await signup(form.email, form.password, {
      name: form.name,
      role: form.role,
      city: form.city,
    });

    setLoading(false);

    if (result.error) {
      setServerError(result.message ?? 'Sign up failed. Please try again.');
      return;
    }

    if (result.needsConfirmation) {
      setStep('verify');
    } else {
      navigate('/onboarding', { replace: true });
    }
  };

  // ── Email confirmation screen ─────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#080E1A] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8"><Logo size="md" /></div>
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/30">
              <Mail className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 mb-2">Check your email</h1>
            <p className="text-slate-500 dark:text-slate-400 mb-1">We sent a verification link to</p>
            <p className="font-semibold text-indigo-600 dark:text-indigo-400 mb-5">{form.email}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
              Click the link in the email to verify your account. You'll be redirected to onboarding automatically.
            </p>
            <Button variant="ghost" className="w-full text-sm" onClick={() => setStep('form')}>
              ← Back to signup
            </Button>
            <p className="text-xs text-slate-400 mt-5">
              Didn't receive it?{' '}
              <button
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                onClick={async () => {
                  setLoading(true);
                  await signup(form.email, form.password, { name: form.name, role: form.role, city: form.city });
                  setLoading(false);
                }}
              >
                {loading ? 'Sending…' : 'Resend email'}
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Signup form ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      {/* Left panel — role-based branding */}
      <div className="hidden lg:flex lg:w-5/12 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: form.role === 'provider'
          ? 'linear-gradient(135deg, #0f4c2a 0%, #065f46 40%, #134e4a 100%)'
          : 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-white/10 blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-white/10 blur-3xl animate-float-delayed" />
          <svg className="absolute inset-0 w-full h-full opacity-10" aria-hidden="true">
            <defs><pattern id="su-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#su-dots)" />
          </svg>
        </div>

        <Logo light size="md" />

        <div>
          <div className="text-4xl mb-4">{form.role === 'provider' ? '🎓' : '📚'}</div>
          <h2 className="text-2xl font-bold text-white mb-3">
            {form.role === 'provider' ? 'Start teaching today' : 'Start learning today'}
          </h2>
          <p className="text-white/70 text-sm leading-relaxed mb-6">
            {form.role === 'provider'
              ? 'Share your skills with learners in your city. Set your own schedule and prices.'
              : 'Find local teachers for any skill you want to learn — in person or online.'}
          </p>
          {form.role === 'provider' && (
            <div className="space-y-2">
              {providerBenefits.map(b => (
                <div key={b} className="flex items-center gap-2 text-white/80 text-sm">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-white/40 text-xs">
          SkillShare Local · Academic Project · LPU
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 bg-[#F4F6FB] dark:bg-[#080E1A]">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Logo size="md" />
          </div>

          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Create your account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">Sign in</Link>
          </p>

          {/* Role toggle */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-2">I want to…</p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'learner', label: 'Learn a skill', icon: '📚', desc: 'Find local teachers' },
                { value: 'provider', label: 'Teach a skill', icon: '🎓', desc: 'Share your expertise' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
                  className={cn(
                    'flex flex-col items-center gap-1 p-4 rounded-2xl border-2 text-center transition-all duration-200',
                    form.role === opt.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 shadow-md shadow-indigo-500/10'
                      : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-indigo-200 dark:hover:border-indigo-800 bg-white dark:bg-[#0F1929]'
                  )}
                >
                  <span className="text-2xl">{opt.icon}</span>
                  <span className={cn('text-sm font-semibold', form.role === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-[#0F172A] dark:text-slate-100')}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input label="Full name" value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your name" autoComplete="name"
              leftIcon={<User className="w-4 h-4" />} error={errors.name} />

            <Input label="Email address" type="email" value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com" autoComplete="email"
              leftIcon={<Mail className="w-4 h-4" />} error={errors.email} />

            <Input label="Password" type={showPassword ? 'text' : 'password'} value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="At least 8 characters" autoComplete="new-password"
              leftIcon={<Lock className="w-4 h-4" />} error={errors.password}
              hint="Minimum 8 characters"
              rightIcon={
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide' : 'Show'}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              } />

            <div>
              <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">Your city</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  className="input-base pl-10 appearance-none">
                  {indianCities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input type="checkbox" required
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-slate-600 dark:text-slate-400">
                I agree to the{' '}
                <Link to="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline">Terms of Use</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline">Privacy Policy</Link>
              </span>
            </label>

            {serverError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400" role="alert">
                {serverError}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full h-11" loading={loading}>
              {!loading && <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
