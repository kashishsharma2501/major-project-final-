import React, { useState, useEffect, useCallback } from 'react';
import { Clock, Plus, Trash2, Save, Info, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase';
import { getOrCreateProviderProfile } from '@/services/providerSkillsService';
import type { Availability } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type DayKey = Availability['day'];

const ALL_DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'monday',    label: 'Monday',    short: 'Mon' },
  { key: 'tuesday',  label: 'Tuesday',   short: 'Tue' },
  { key: 'wednesday',label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday',  short: 'Thu' },
  { key: 'friday',   label: 'Friday',    short: 'Fri' },
  { key: 'saturday', label: 'Saturday',  short: 'Sat' },
  { key: 'sunday',   label: 'Sunday',    short: 'Sun' },
];

const SUGGESTED_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
];

function formatSlot(slot: string): string {
  const [h, m] = slot.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
}

// ── DayRow sub-component ──────────────────────────────────────────────────────

interface DayRowProps {
  day: { key: DayKey; label: string; short: string };
  slots: string[];
  enabled: boolean;
  onToggle: () => void;
  onAddSlot: (slot: string) => void;
  onRemoveSlot: (slot: string) => void;
}

function DayRow({ day, slots, enabled, onToggle, onAddSlot, onRemoveSlot }: DayRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const remaining = SUGGESTED_SLOTS.filter(s => !slots.includes(s));

  return (
    <div className={cn(
      'rounded-xl border transition-colors',
      enabled
        ? 'border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/10'
        : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827]'
    )}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          className={cn(
            'relative shrink-0 w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30',
            enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
          )}
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${day.label}`}
        >
          <span className={cn(
            'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
            enabled && 'translate-x-5'
          )} />
        </button>

        <span className={cn(
          'text-sm font-semibold w-24 shrink-0',
          enabled ? 'text-[#0F172A] dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'
        )}>
          {day.label}
        </span>

        {enabled && (
          <div className="flex items-center gap-2 flex-wrap flex-1">
            {slots.length === 0 && (
              <span className="text-xs text-slate-400 italic">No slots added</span>
            )}
            {slots.sort().map(slot => (
              <span key={slot} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                <Clock className="w-3 h-3" />
                {formatSlot(slot)}
                <button
                  onClick={() => onRemoveSlot(slot)}
                  className="ml-0.5 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  aria-label={`Remove ${formatSlot(slot)}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {!enabled && (
          <span className="text-xs text-slate-400 dark:text-slate-500 italic">Unavailable</span>
        )}

        {enabled && (
          <div className="relative shrink-0 ml-auto">
            <Button
              size="xs"
              variant="outline"
              leftIcon={<Plus className="w-3 h-3" />}
              onClick={() => setPickerOpen(!pickerOpen)}
              disabled={remaining.length === 0}
            >
              Add slot
            </Button>
            {pickerOpen && remaining.length > 0 && (
              <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#1E293B] rounded-xl shadow-elevated p-2 grid grid-cols-3 gap-1 w-44">
                {remaining.map(slot => (
                  <button
                    key={slot}
                    onClick={() => { onAddSlot(slot); setPickerOpen(false); }}
                    className="px-2 py-1.5 text-xs font-medium rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-600 dark:text-slate-400 transition-colors text-center"
                  >
                    {formatSlot(slot)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const EMPTY_SCHEDULE: Record<DayKey, string[]> = {
  monday: [], tuesday: [], wednesday: [], thursday: [],
  friday: [], saturday: [], sunday: [],
};

export function ProviderAvailabilityPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [schedule, setSchedule] = useState<Record<DayKey, string[]>>(EMPTY_SCHEDULE);
  const [enabledDays, setEnabledDays] = useState<Set<DayKey>>(new Set());

  // ── Load ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const pid = await getOrCreateProviderProfile(user.id, user.city);
      if (!pid) throw new Error('Could not initialise provider profile.');
      setProviderId(pid);

      const { data, error } = await supabase
        .from('provider_availability')
        .select('day, slots')
        .eq('provider_id', pid);

      if (error) throw new Error(error.message);

      const newSchedule = { ...EMPTY_SCHEDULE };
      const newEnabled = new Set<DayKey>();
      (data ?? []).forEach((row: { day: DayKey; slots: string[] }) => {
        newSchedule[row.day] = row.slots ?? [];
        if ((row.slots ?? []).length > 0) newEnabled.add(row.day);
      });
      setSchedule(newSchedule);
      setEnabledDays(newEnabled);
    } catch (e: any) {
      setLoadError(e.message ?? 'Failed to load availability.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.city]);

  useEffect(() => { load(); }, [load]);

  // ── Slot helpers ──────────────────────────────────────────────────────
  const toggleDay = (day: DayKey) => {
    setEnabledDays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const addSlot = (day: DayKey, slot: string) =>
    setSchedule(prev => ({ ...prev, [day]: [...prev[day], slot].sort() }));

  const removeSlot = (day: DayKey, slot: string) =>
    setSchedule(prev => ({ ...prev, [day]: prev[day].filter(s => s !== slot) }));

  const totalSlots = Array.from(enabledDays).reduce((sum, day) => sum + schedule[day].length, 0);

  // ── Save ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!providerId) return;
    setSaving(true);
    try {
      const rows = ALL_DAYS.map(({ key }) => ({
        provider_id: providerId,
        day: key,
        slots: enabledDays.has(key) ? schedule[key] : [],
      }));
      const { error } = await supabase
        .from('provider_availability')
        .upsert(rows, { onConflict: 'provider_id,day' });
      if (error) throw new Error(error.message);
      toast('success', 'Availability saved', 'Learners can now book on your available days.');
    } catch (e: any) {
      toast('error', 'Save failed', e.message);
    } finally {
      setSaving(false);
    }
  };

  const clearAll = () => {
    setEnabledDays(new Set());
    setSchedule({ ...EMPTY_SCHEDULE });
    toast('info', 'Schedule cleared — save to persist.');
  };

  const applyPreset = (preset: 'weekdays' | 'weekends' | 'evenings') => {
    const defaultSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    const eveningSlots = ['17:00', '18:00', '19:00', '20:00'];
    const weekdayKeys: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekendKeys: DayKey[] = ['saturday', 'sunday'];

    if (preset === 'weekdays') {
      setEnabledDays(new Set(weekdayKeys));
      setSchedule(prev => { const n = { ...prev }; weekdayKeys.forEach(d => { n[d] = [...defaultSlots]; }); return n; });
    } else if (preset === 'weekends') {
      setEnabledDays(new Set(weekendKeys));
      setSchedule(prev => { const n = { ...prev }; weekendKeys.forEach(d => { n[d] = [...defaultSlots]; }); return n; });
    } else {
      const all = [...weekdayKeys, ...weekendKeys];
      setEnabledDays(new Set(all));
      setSchedule(prev => { const n = { ...prev }; all.forEach(d => { n[d] = [...eveningSlots]; }); return n; });
    }
    toast('info', 'Preset applied — save to persist.');
  };

  // ── Render ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout title="Availability" subtitle="Set the days and times you're available to teach">
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (loadError) {
    return (
      <DashboardLayout title="Availability" subtitle="Set the days and times you're available to teach">
        <EmptyState
          icon={<RefreshCw className="w-6 h-6" />}
          title="Could not load availability"
          description={loadError}
          action={{ label: 'Try Again', onClick: load }}
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Availability"
      subtitle="Set the days and times you're available to teach"
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
            {totalSlots} slot{totalSlots !== 1 ? 's' : ''} set
          </span>
          <Button variant="primary" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave} loading={saving}>
            {!saving && 'Save Availability'}
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl space-y-5">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            <Button size="xs" variant="secondary" onClick={() => applyPreset('weekdays')}>Weekdays</Button>
            <Button size="xs" variant="secondary" onClick={() => applyPreset('weekends')}>Weekends</Button>
            <Button size="xs" variant="secondary" onClick={() => applyPreset('evenings')}>Evenings only</Button>
            <Button size="xs" variant="danger" leftIcon={<Trash2 className="w-3 h-3" />} onClick={clearAll}>Clear all</Button>
          </div>
        </div>

        <div className="space-y-2">
          {ALL_DAYS.map(day => (
            <DayRow
              key={day.key}
              day={day}
              slots={schedule[day.key]}
              enabled={enabledDays.has(day.key)}
              onToggle={() => toggleDay(day.key)}
              onAddSlot={slot => addSlot(day.key, slot)}
              onRemoveSlot={slot => removeSlot(day.key, slot)}
            />
          ))}
        </div>

        <div className="card p-4 flex gap-3">
          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-semibold text-[#0F172A] dark:text-slate-100 mb-2">Tips for setting availability</h3>
            <ul className="space-y-1 text-xs text-slate-500 dark:text-slate-400 list-disc pl-4">
              <li>Add at least 4–6 slots per week to maximise bookings.</li>
              <li>Weekend slots tend to fill up first — add extra buffer.</li>
              <li>Evening slots (5–8 PM) are popular with working learners.</li>
              <li>Keep your schedule updated — outdated availability reduces trust.</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
