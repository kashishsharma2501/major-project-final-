import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, Moon, Sun } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    setError('');
    setLoading(true);

    const result = await login(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.message ?? 'Sign in failed. Please try again.');
      return;
    }

    // Role-based redirect — the AuthContext now reads role from the database.
    // We navigate to the generic redirect first; the route guards will forward
    // providers and admins to their correct home screens.
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4c1d95 60%, #0f766e 100%)' }}>
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/20 blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-teal-400/20 blur-3xl animate-float-delayed" />
          <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full bg-indigo-400/20 blur-2xl" />
          {/* Dot grid */}
          <svg className="absolute inset-0 w-full h-full opacity-10" aria-hidden="true">
            <defs>
              <pattern id="ldots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ldots)" />
          </svg>
        </div>
        <Logo light size="md" />
        <div>
          <blockquote className="text-white text-xl font-medium leading-relaxed mb-4">
            "SkillShare Local connects you with real people in your city who teach the skills you want to learn."
          </blockquote>
          <p className="text-slate-400 text-sm">Learn from local experts. Teach what you know.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Hyperlocal', sub: 'Teachers in your neighbourhood' },
            { label: 'Verified Skills', sub: 'Research-backed catalogue' },
            { label: 'Any Skill', sub: 'Tech, arts, trades & more' },
            { label: 'Your City', sub: 'Punjab, Delhi & beyond' },
          ].map((s) => (
            <div key={s.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white font-semibold text-sm">{s.label}</p>
              <p className="text-slate-400 text-xs">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo + theme */}
          <div className="flex items-center justify-between mb-8 lg:hidden">
            <Logo size="sm" />
            <button onClick={toggleTheme} className="btn-ghost p-2" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>
          <div className="hidden lg:flex justify-end mb-6">
            <button onClick={toggleTheme} className="btn-ghost p-2" aria-label="Toggle theme">
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          </div>

          <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Welcome back</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            Don't have an account?{' '}
            <Link to="/signup" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Sign up free
            </Link>
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm text-slate-600 dark:text-slate-400">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">
                Forgot password?
              </Link>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400" role="alert">
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full h-11" loading={loading}>
              {!loading && <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            <p className="text-xs text-center text-slate-400">
              This is a private application. Unauthorised access is prohibited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
