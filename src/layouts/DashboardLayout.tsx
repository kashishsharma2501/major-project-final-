import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Menu, Bell, Sun, Moon, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Sidebar } from '@/components/layout/Sidebar';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function DashboardLayout({ children, title, subtitle, actions }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const unreadCount = useUnreadNotifications();

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-[#F4F6FB] dark:bg-[#080E1A] overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white dark:bg-[#111827] border-b border-[#E2E8F0] dark:border-[#1E293B] flex items-center gap-3 px-4 lg:px-6 shrink-0">
          {/* Mobile menu button */}
          <button
            className="lg:hidden btn-ghost p-2"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="search"
                placeholder="Search skills, providers…"
                className="input-base pl-9 py-2 text-sm h-9"
              />
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="btn-ghost p-2"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            <button className="btn-ghost p-2 relative" aria-label="Notifications" onClick={() => navigate('/notifications')}>
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full" />
              )}
            </button>

            <Avatar src={user.avatar} name={user.name} size="sm" className="cursor-pointer" />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {(title || subtitle || actions) && (
            <div className="px-4 lg:px-6 pt-6 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {title && (
                    <h1 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300">
                      {title}
                    </h1>
                  )}
                  {subtitle && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
                  )}
                </div>
                {actions && <div className="shrink-0">{actions}</div>}
              </div>
            </div>
          )}
          <div className={cn('px-4 lg:px-6 pb-8', title ? '' : 'pt-6')}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
