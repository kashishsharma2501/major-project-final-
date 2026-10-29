import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Bell, Moon, Sun, ChevronDown, Settings, LogOut, User, LayoutDashboard } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Logo } from './Logo';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

const navLinks = [
  { label: 'Explore Skills', href: '/explore' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Become a Provider', href: '/become-a-provider' },
  { label: 'About', href: '/about' },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = useUnreadNotifications();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const dashboardPath = user?.role === 'provider' ? '/provider' : user?.role === 'admin' ? '/admin' : '/dashboard';

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#080E1A]/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-white/5 shadow-sm shadow-slate-900/5">
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo />

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-100 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="btn-ghost p-2"
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {user ? (
              <>
                {/* Notifications */}
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                    className="btn-ghost p-2 relative"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-600 rounded-full" />
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-80 card shadow-elevated animate-scale-in overflow-hidden z-50">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                        <span className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="text-xs text-indigo-600 dark:text-indigo-400">{unreadCount} new</span>
                        )}
                      </div>
                      <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] max-h-80 overflow-y-auto">
                        <button onClick={() => { navigate('/notifications'); setNotifOpen(false); }} className="w-full px-4 py-5 text-left text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}` : 'No unread notifications'}
                        </button>
                      </div>
                      <div className="px-4 py-2 border-t border-[#E2E8F0] dark:border-[#1E293B]">
                        <button
                          onClick={() => { navigate('/notifications'); setNotifOpen(false); }}
                          className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                        >
                          View all notifications
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Profile dropdown */}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    aria-label="Profile menu"
                  >
                    <Avatar src={user.avatar} name={user.name} size="sm" />
                    <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform hidden sm:block', profileOpen && 'rotate-180')} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 card shadow-elevated animate-scale-in z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-[#E2E8F0] dark:border-[#1E293B]">
                        <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 truncate">{user.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="py-1">
                        <button onClick={() => { navigate(dashboardPath); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-slate-100 transition-colors">
                          <LayoutDashboard className="w-4 h-4" /> Dashboard
                        </button>
                        <button onClick={() => { navigate('/settings/profile'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-slate-100 transition-colors">
                          <User className="w-4 h-4" /> Profile
                        </button>
                        <button onClick={() => { navigate('/settings'); setProfileOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-[#0F172A] dark:hover:text-slate-100 transition-colors">
                          <Settings className="w-4 h-4" /> Settings
                        </button>
                        <div className="divider my-1" />
                        <button
                          onClick={async () => { await logout(); navigate('/'); setProfileOpen(false); }}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        >
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                  Log In
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate('/signup')}>
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden btn-ghost p-2"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle mobile menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B1220] animate-slide-up">
          <div className="page-container py-4 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="block px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {!user && (
              <div className="flex gap-2 pt-3">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => { navigate('/login'); setMobileOpen(false); }}>
                  Log In
                </Button>
                <Button variant="primary" size="sm" className="flex-1" onClick={() => { navigate('/signup'); setMobileOpen(false); }}>
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
