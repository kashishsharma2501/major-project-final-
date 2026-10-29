import React from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'teal' | 'outline';
type Size = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary: [
    'bg-gradient-to-r from-indigo-600 to-violet-600',
    'hover:from-indigo-500 hover:to-violet-500',
    'text-white font-semibold',
    'shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35',
    'hover:-translate-y-0.5 active:scale-95',
    'focus:ring-indigo-500/40',
  ].join(' '),
  secondary: [
    'bg-white dark:bg-[#1E293B]',
    'hover:bg-slate-50 dark:hover:bg-[#253347]',
    'text-[#0F172A] dark:text-slate-100',
    'border border-[#E2E8F0] dark:border-slate-700',
    'shadow-sm hover:shadow hover:-translate-y-px',
    'focus:ring-indigo-500/20',
  ].join(' '),
  ghost: [
    'text-slate-600 dark:text-slate-400',
    'hover:text-[#0F172A] dark:hover:text-slate-100',
    'hover:bg-slate-100 dark:hover:bg-slate-800',
    'focus:ring-indigo-500/20',
  ].join(' '),
  danger: [
    'bg-red-600 hover:bg-red-700 text-white',
    'shadow-sm shadow-red-500/20 hover:shadow-md hover:shadow-red-500/30',
    'hover:-translate-y-px active:scale-95',
    'focus:ring-red-500/40',
  ].join(' '),
  teal: [
    'bg-gradient-to-r from-teal-600 to-emerald-600',
    'hover:from-teal-500 hover:to-emerald-500',
    'text-white font-semibold',
    'shadow-md shadow-teal-500/25 hover:shadow-lg hover:shadow-teal-500/35',
    'hover:-translate-y-0.5 active:scale-95',
    'focus:ring-teal-500/40',
  ].join(' '),
  outline: [
    'border border-indigo-500 dark:border-indigo-500',
    'text-indigo-600 dark:text-indigo-400',
    'hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
    'hover:-translate-y-px',
    'focus:ring-indigo-500/20',
  ].join(' '),
};

const sizeClasses: Record<Size, string> = {
  xs: 'px-2.5 py-1.5 text-xs gap-1 rounded-lg',
  sm: 'px-3.5 py-2 text-sm gap-1.5 rounded-xl',
  md: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-6 py-3 text-base gap-2 rounded-xl',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leftIcon, rightIcon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium',
          'transition-all duration-200',
          'focus:outline-none focus:ring-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : leftIcon ? (
          leftIcon
        ) : null}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
