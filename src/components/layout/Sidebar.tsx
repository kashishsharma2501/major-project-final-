import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Compass, CalendarCheck, MessageSquare, Star, User, Settings,
  BookOpen, TrendingUp, Briefcase, Users, BarChart3, ShieldCheck, ChevronLeft, ChevronRight, LogOut, X, Clock, Heart, HelpCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Logo } from './Logo';
import { Avatar } from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
}

const learnerNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Discover', href: '/explore', icon: <Compass className="w-4 h-4" /> },
  { label: 'My Bookings', href: '/dashboard/bookings', icon: <CalendarCheck className="w-4 h-4" /> },
  { label: 'Saved', href: '/dashboard/saved', icon: <Heart className="w-4 h-4" /> },
  { label: 'Messages', href: '/dashboard/messages', icon: <MessageSquare className="w-4 h-4" />, badge: 1 },
  { label: 'Reviews', href: '/dashboard/reviews', icon: <Star className="w-4 h-4" /> },
  { label: 'Profile', href: '/dashboard/profile', icon: <User className="w-4 h-4" /> },
  { label: 'Support', href: '/support', icon: <HelpCircle className="w-4 h-4" /> },
  { label: 'Settings', href: '/settings', icon: <Settings className="w-4 h-4" /> },
];

const providerNav: NavItem[] = [
  { label: 'Overview',      href: '/provider',              icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'My Skills',     href: '/provider/skills',       icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Bookings',      href: '/provider/bookings',     icon: <CalendarCheck className="w-4 h-4" />, badge: 2 },
  { label: 'Availability',  href: '/provider/availability', icon: <Clock className="w-4 h-4" /> },
  { label: 'Messages',      href: '/provider/messages',     icon: <MessageSquare className="w-4 h-4" />, badge: 1 },
  { label: 'Reviews',       href: '/provider/reviews',      icon: <Star className="w-4 h-4" /> },
  { label: 'Earnings',      href: '/provider/earnings',     icon: <TrendingUp className="w-4 h-4" /> },
  { label: 'My Profile',    href: '/provider/questionnaire',icon: <User className="w-4 h-4" /> },
  { label: 'Support',      href: '/support',               icon: <HelpCircle className="w-4 h-4" /> },
  { label: 'Settings',      href: '/settings',              icon: <Settings className="w-4 h-4" /> },
];

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: 'Users', href: '/admin/users', icon: <Users className="w-4 h-4" /> },
  { label: 'Providers', href: '/admin/providers', icon: <Briefcase className="w-4 h-4" /> },
  { label: 'Skills', href: '/admin/skills', icon: <BookOpen className="w-4 h-4" /> },
  { label: 'Bookings', href: '/admin/bookings', icon: <CalendarCheck className="w-4 h-4" /> },
  { label: 'Reviews', href: '/admin/reviews', icon: <Star className="w-4 h-4" /> },
  { label: 'Reports', href: '/admin/reports', icon: <BarChart3 className="w-4 h-4" /> },
  { label: 'Settings', href: '/admin/settings', icon: <ShieldCheck className="w-4 h-4" /> },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const navItems =
    user?.role === 'admin' ? adminNav :
    user?.role === 'provider' ? providerNav :
    learnerNav;

  const sidebarContent = (
    <div className={cn(
      'flex flex-col h-full',
      'bg-white/95 dark:bg-[#080E1A]/95 backdrop-blur-xl border-r border-slate-200/60 dark:border-white/5',
      'transition-all duration-200',
      collapsed ? 'w-16' : 'w-56'
    )}>
      {/* Logo area */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-[#E2E8F0] dark:border-[#1E293B]">
        {!collapsed && <Logo size="sm" />}
        {collapsed && (
          <div className="mx-auto w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
              <circle cx="12" cy="6" r="2.5" fill="white" opacity="0.9" />
              <circle cx="6" cy="17" r="2.5" fill="white" opacity="0.75" />
              <circle cx="18" cy="17" r="2.5" fill="white" opacity="0.75" />
              <line x1="12" y1="8.5" x2="6" y2="14.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
              <line x1="12" y1="8.5" x2="18" y2="14.5" stroke="white" strokeWidth="1.5" strokeOpacity="0.6" strokeLinecap="round" />
            </svg>
          </div>
        )}
        {/* Mobile close */}
        {onMobileClose && (
          <button onClick={onMobileClose} className="btn-ghost p-1.5 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        )}
        {/* Desktop collapse */}
        {!onMobileClose && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn-ghost p-1.5 hidden lg:flex ml-auto"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5" aria-label="Sidebar navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/dashboard' || item.href === '/provider' || item.href === '/admin'}
            className={({ isActive }) =>
              cn('sidebar-link', isActive && 'active', collapsed && 'justify-center px-0')
            }
            title={collapsed ? item.label : undefined}
            onClick={onMobileClose}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <>
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="ml-auto px-1.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300 rounded-full">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      {user && (
        <div className={cn('border-t border-[#E2E8F0] dark:border-[#1E293B] p-3', collapsed && 'flex justify-center')}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <Avatar src={user.avatar} name={user.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 truncate">{user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{user.role}</p>
              </div>
              <button
                onClick={async () => { await logout(); navigate('/'); }}
                className="btn-ghost p-1.5 text-slate-400 hover:text-red-500"
                aria-label="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Avatar src={user.avatar} name={user.name} size="sm" />
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <aside className="relative flex h-full w-56 animate-slide-in-right">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
