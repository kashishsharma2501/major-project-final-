import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Star, Sparkles, ChevronDown, ChevronUp, CheckCircle, Heart } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { ProviderBadgeChip } from './Badge';
import type { Provider } from '@/types';
import { formatCurrency, formatDistance } from '@/utils/format';

interface ProviderCardProps {
  provider: Provider;
  skillFilter?: string;
  className?: string;
  compact?: boolean;
  isSaved?: boolean;
  onToggleSave?: (providerId: string) => void;
}

// ── Match factor computation ──────────────────────────────────────────────────
// Derives 4 human-readable match factors from the provider's data.
// This is frontend mock logic — the real algorithm lives in the backend/AI layer.

interface MatchFactor {
  label: string;
  score: number;   // 0–100
  reason: string;
}

function computeMatchFactors(provider: Provider, skillFilter?: string): MatchFactor[] {
  const base = provider.matchScore ?? 80;

  // Skill match: exact skill name match → high, same category → medium
  const skillScore = skillFilter
    ? provider.skills.some((s) =>
        s.skillName.toLowerCase().includes(skillFilter.toLowerCase())
      )
      ? Math.min(base + 4, 100)
      : provider.primaryCategory === 'Creative Arts'
      ? Math.max(base - 5, 60)
      : Math.max(base - 12, 55)
    : base;

  // Location match: closer = higher
  const locationScore = provider.distanceKm === null
    ? base
    : provider.distanceKm <= 3
      ? Math.min(base + 2, 100)
      : provider.distanceKm <= 6
      ? base
      : provider.distanceKm <= 10
      ? Math.max(base - 8, 60)
      : Math.max(base - 18, 45);

  // Availability match: more weekend slots = higher
  const weekendDays = provider.availability.filter((a) =>
    a.day === 'saturday' || a.day === 'sunday'
  );
  const totalSlots = provider.availability.reduce((s, a) => s + a.slots.length, 0);
  const availabilityScore =
    weekendDays.length > 0 && totalSlots >= 4
      ? Math.min(base + 1, 100)
      : weekendDays.length > 0
      ? Math.max(base - 4, 65)
      : Math.max(base - 14, 50);

  // Experience match: more years + verified = higher
  const expScore =
    provider.isVerified && provider.yearsTeaching >= 4
      ? Math.min(base + 3, 100)
      : provider.yearsTeaching >= 2
      ? base
      : Math.max(base - 10, 55);

  return [
    {
      label: 'Skill match',
      score: Math.round(skillScore),
      reason:
        skillScore >= base
          ? 'Teaches the skill you searched for'
          : 'Teaches a related skill',
    },
    {
      label: 'Location',
      score: Math.round(locationScore),
      reason:
        provider.distanceKm === null
          ? 'Location distance is not available'
          : provider.distanceKm <= 3
          ? `Only ${provider.distanceKm} km away`
          : provider.distanceKm <= 6
          ? `${provider.distanceKm} km — short commute`
          : `${provider.distanceKm} km from you`,
    },
    {
      label: 'Availability',
      score: Math.round(availabilityScore),
      reason:
        weekendDays.length > 0
          ? `Available on weekends · ${totalSlots} slots/week`
          : `${totalSlots} slot${totalSlots !== 1 ? 's' : ''} available this week`,
    },
    {
      label: 'Experience',
      score: Math.round(expScore),
      reason:
        provider.isVerified && provider.yearsTeaching >= 4
          ? `${provider.yearsTeaching}y teaching · Verified provider`
          : provider.isVerified
          ? `${provider.yearsTeaching}y teaching · Verified`
          : `${provider.yearsTeaching}y teaching experience`,
    },
  ];
}

function scoreColor(score: number) {
  if (score >= 90) return 'bg-green-500 dark:bg-green-400';
  if (score >= 75) return 'bg-teal-500 dark:bg-teal-400';
  if (score >= 60) return 'bg-indigo-500 dark:bg-indigo-400';
  return 'bg-slate-400 dark:bg-slate-500';
}

function scoreBadgeColor(score: number) {
  if (score >= 90) return 'text-green-700 dark:text-green-400';
  if (score >= 75) return 'text-teal-700 dark:text-teal-400';
  return 'text-indigo-700 dark:text-indigo-400';
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProviderCard({ provider, skillFilter, className, compact, isSaved, onToggleSave }: ProviderCardProps) {
  const navigate = useNavigate();
  const [showBreakdown, setShowBreakdown] = useState(false);

  const displaySkill =
    provider.skills.find((s) =>
      skillFilter
        ? s.skillName.toLowerCase().includes(skillFilter.toLowerCase())
        : true
    ) || provider.skills[0];

  if (!displaySkill) return null;

  const hasMatchScore = provider.matchScore !== undefined;
  const factors = hasMatchScore ? computeMatchFactors(provider, skillFilter) : [];

  return (
    <div
      className={cn(
        'card-hover p-5 cursor-pointer group',
        className
      )}
      onClick={() => navigate(`/providers/${provider.id}`)}
      role="article"
      aria-label={`${provider.name} — ${displaySkill.skillName}`}
    >
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar src={provider.avatar} name={provider.name} size="lg" online={provider.isOnline} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-[#0F172A] dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                {provider.name}
              </h3>
              {provider.isVerified && (
                <span title="Verified provider" className="shrink-0">
                  <svg
                    className="w-4 h-4 text-indigo-600"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
              {displaySkill.skillName}
            </p>
          </div>
        </div>

        {/* Match score badge + save button */}
        <div className="flex items-center gap-2 shrink-0">
          {onToggleSave && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleSave(provider.id); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label={isSaved ? 'Remove from saved' : 'Save provider'}
            >
              <Heart className={`w-4 h-4 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-slate-400 hover:text-red-400'}`} />
            </button>
          )}
          {hasMatchScore && (
          <div
            className={cn(
              'shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold',
              provider.matchScore! >= 90
                ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900'
                : provider.matchScore! >= 75
                ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400 border border-teal-200 dark:border-teal-900'
                : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900'
            )}
          >
            <Sparkles className="w-3 h-3" />
            {provider.matchScore}% match
          </div>
        )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3 flex-wrap">
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="font-semibold text-[#0F172A] dark:text-slate-200">
            {provider.rating.toFixed(1)}
          </span>
          <span>({provider.reviewCount})</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span>{formatDistance(provider.distanceKm)}</span>
        </div>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>
            {provider.responseTimeMinutes < 60
              ? `Replies ~${provider.responseTimeMinutes}m`
              : `Replies ~${Math.round(provider.responseTimeMinutes / 60)}h`}
          </span>
        </div>
      </div>

      {/* ── Experience + mode chips ── */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="badge bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 capitalize">
          {displaySkill.experienceLevel}
        </span>
        <span className="badge bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-100 dark:border-teal-900 capitalize">
          {displaySkill.learningMode === 'either' ? 'Online / Offline' : displaySkill.learningMode}
        </span>
        {provider.badges.slice(0, 1).map((b) => (
          <ProviderBadgeChip key={b} badge={b} />
        ))}
      </div>

      {/* ── Bio ── */}
      {!compact && (
        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
          {provider.bio}
        </p>
      )}

      {/* ── Match breakdown (toggle) ── */}
      {hasMatchScore && (
        <div
          className="mb-3"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowBreakdown((v) => !v)}
            className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium mb-2"
            aria-expanded={showBreakdown}
          >
            <Sparkles className="w-3 h-3" />
            Why this match?
            {showBreakdown
              ? <ChevronUp className="w-3 h-3 ml-0.5" />
              : <ChevronDown className="w-3 h-3 ml-0.5" />}
          </button>

          {showBreakdown && (
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-[#1E293B] p-3 space-y-2.5 animate-fade-in">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1">
                Mock recommendation logic — actual AI matching in Phase 2.
              </p>
              {factors.map((f) => (
                <div key={f.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="w-3 h-3 text-slate-400 dark:text-slate-500 shrink-0" />
                      <span className="text-xs font-medium text-[#0F172A] dark:text-slate-200">
                        {f.label}
                      </span>
                    </div>
                    <span className={cn('text-xs font-bold tabular-nums', scoreBadgeColor(f.score))}>
                      {f.score}%
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden ml-4">
                    <div
                      className={cn('h-1.5 rounded-full transition-all duration-500', scoreColor(f.score))}
                      style={{ width: `${f.score}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 ml-4 leading-tight">
                    {f.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="flex items-center justify-between mt-1 pt-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
        <div>
          <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
            {formatCurrency(displaySkill.pricePerSession)}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">/session</span>
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Button variant="secondary" size="sm" onClick={() => navigate(`/providers/${provider.id}`)}>
            View Profile
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(`/booking/${provider.id}`)}>
            Book
          </Button>
        </div>
      </div>
    </div>
  );
}
