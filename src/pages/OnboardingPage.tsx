import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { getCatalogueSkills } from '@/services/catalogueService';
import { useAuth } from '@/context/AuthContext';
import type { CatalogueSkill } from '@/data/skillCatalogue';
import type { OnboardingData, ExperienceLevel, LearningMode } from '@/types';

const TOTAL_STEPS = 7;

const intentOptions = [
  { value: 'learn', label: 'Learn a skill', icon: '📚', desc: 'Find local teachers and book sessions' },
  { value: 'teach', label: 'Teach a skill', icon: '🎓', desc: 'Share your expertise with local learners' },
  { value: 'both', label: 'Both', icon: '🤝', desc: 'Learn and teach in your community' },
] as const;

const experienceOptions: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Beginner', desc: 'I have little or no experience with this skill' },
  { value: 'intermediate', label: 'Intermediate', desc: 'I have some experience and want to improve' },
  { value: 'advanced', label: 'Advanced', desc: 'I have solid experience and want to refine' },
];

const modeOptions: { value: LearningMode; label: string; icon: string; desc: string }[] = [
  { value: 'offline', label: 'In Person', icon: '🏠', desc: 'Meet locally — at home, café, or studio' },
  { value: 'online', label: 'Online', icon: '💻', desc: 'Video calls — flexible location' },
  { value: 'either', label: 'Either works', icon: '✨', desc: 'I\'m open to both formats' },
];

const distanceOptions = [
  { value: 2, label: '2 km', desc: 'Walking distance' },
  { value: 5, label: '5 km', desc: 'Short commute' },
  { value: 10, label: '10 km', desc: 'Within the city' },
  { value: 25, label: '25 km', desc: 'Wider area' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeSlots = ['Morning (8–12)', 'Afternoon (12–5)', 'Evening (5–9)'];

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-full transition-all duration-300',
            i < current ? 'w-6 h-1.5 bg-indigo-600' : i === current ? 'w-6 h-1.5 bg-indigo-600' : 'w-2 h-1.5 bg-slate-200 dark:bg-slate-700'
          )}
        />
      ))}
    </div>
  );
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    intent: null,
    selectedSkills: [],
    experienceLevel: null,
    learningMode: null,
    preferredDistance: null,
    availability: [],
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [skills, setSkills] = useState<CatalogueSkill[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);

  useEffect(() => {
    getCatalogueSkills().then(setSkills).finally(() => setSkillsLoading(false));
  }, []);

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const toggleSkill = (name: string) => {
    setData((d) => ({
      ...d,
      selectedSkills: d.selectedSkills.includes(name)
        ? d.selectedSkills.filter((s) => s !== name)
        : d.selectedSkills.length < 5 ? [...d.selectedSkills, name] : d.selectedSkills,
    }));
  };

  const toggleDay = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const canNext = () => {
    if (step === 0) return !!data.intent;
    if (step === 1) return data.selectedSkills.length > 0;
    if (step === 2) return !!data.experienceLevel;
    if (step === 3) return !!data.learningMode;
    if (step === 4) return !!data.preferredDistance;
    if (step === 5) return selectedDays.length > 0;
    return true;
  };

  const finish = async () => {
    // Persist onboarding completion to the database.
    // We save the selected skills as languages (repurposed as interests for now)
    // and mark the profile as onboarding-complete.
    try {
      await updateProfile({
        onboarding_complete: true,
        // Store selected skill interests in the languages array until a
        // dedicated skill_interests column is added in a future migration.
        ...(data.selectedSkills.length > 0 && { languages: data.selectedSkills }),
      });
    } catch {
      // Non-critical — navigate regardless so the user isn't stuck
    }
    const dest = data.intent === 'teach' ? '/provider' : '/dashboard';
    navigate(dest, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0B1220]">
        <Logo size="sm" />
        <div className="flex items-center gap-4">
          <StepIndicator current={step} total={TOTAL_STEPS} />
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          Skip for now
        </button>
      </header>

      {/* Step content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg animate-fade-in" key={step}>

          {/* Step 0 — Intent */}
          {step === 0 && (
            <div>
              <p className="section-label mb-2">Step 1</p>
              <h2 className="text-display text-[#0B1220] dark:text-white mb-2">What do you want to do?</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">You can always change this later from your settings.</p>
              <div className="space-y-3">
                {intentOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setData((d) => ({ ...d, intent: opt.value }))}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                      data.intent === opt.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
                        : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-[#111827]'
                    )}
                  >
                    <span className="text-3xl shrink-0">{opt.icon}</span>
                    <div>
                      <p className={cn('font-semibold', data.intent === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-[#0F172A] dark:text-slate-100')}>
                        {opt.label}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </div>
                    {data.intent === opt.value && (
                      <div className="ml-auto w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1 — Skills */}
          {step === 1 && (
            <div>
              <p className="section-label mb-2">Step 2</p>
              <h2 className="text-display text-[#0B1220] dark:text-white mb-2">
                {data.intent === 'teach' ? 'What skills can you teach?' : 'What do you want to learn?'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-2">Pick up to 5 skills.</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
                {data.selectedSkills.length}/5 selected
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-1">
                {skillsLoading ? <p className="col-span-2 text-sm text-slate-400">Loading skills…</p> : skills.map((skill) => {
                  const selected = data.selectedSkills.includes(skill.name);
                  return (
                    <button
                      key={skill.id}
                      onClick={() => toggleSkill(skill.name)}
                      disabled={!selected && data.selectedSkills.length >= 5}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all',
                        selected
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
                          : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] hover:border-slate-300',
                        !selected && data.selectedSkills.length >= 5 && 'opacity-40 cursor-not-allowed'
                      )}
                    >
                      <span className="text-xl shrink-0">{skill.icon}</span>
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium truncate', selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-[#0F172A] dark:text-slate-100')}>
                          {skill.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{skill.category}</p>
                      </div>
                      {selected && <Check className="w-4 h-4 text-indigo-600 ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2 — Experience */}
          {step === 2 && (
            <div>
              <p className="section-label mb-2">Step 3</p>
              <h2 className="text-display text-[#0B1220] dark:text-white mb-2">What's your experience level?</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">For <span className="font-medium text-[#0F172A] dark:text-slate-100">{data.selectedSkills[0] || 'your selected skill'}</span>.</p>
              <div className="space-y-3">
                {experienceOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setData((d) => ({ ...d, experienceLevel: opt.value }))}
                    className={cn(
                      'w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all',
                      data.experienceLevel === opt.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
                        : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] hover:border-slate-300'
                    )}
                  >
                    <div>
                      <p className={cn('font-semibold capitalize', data.experienceLevel === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-[#0F172A] dark:text-slate-100')}>
                        {opt.label}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </div>
                    {data.experienceLevel === opt.value && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Learning mode */}
          {step === 3 && (
            <div>
              <p className="section-label mb-2">Step 4</p>
              <h2 className="text-display text-[#0B1220] dark:text-white mb-2">How do you prefer to learn?</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">This helps us surface the right providers.</p>
              <div className="space-y-3">
                {modeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setData((d) => ({ ...d, learningMode: opt.value }))}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                      data.learningMode === opt.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
                        : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] hover:border-slate-300'
                    )}
                  >
                    <span className="text-2xl shrink-0">{opt.icon}</span>
                    <div>
                      <p className={cn('font-semibold', data.learningMode === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-[#0F172A] dark:text-slate-100')}>
                        {opt.label}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{opt.desc}</p>
                    </div>
                    {data.learningMode === opt.value && (
                      <div className="ml-auto w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4 — Distance */}
          {step === 4 && (
            <div>
              <p className="section-label mb-2">Step 5</p>
              <h2 className="text-display text-[#0B1220] dark:text-white mb-2">How far are you willing to travel?</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">For in-person sessions. Online sessions have no distance limit.</p>
              <div className="grid grid-cols-2 gap-3">
                {distanceOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setData((d) => ({ ...d, preferredDistance: opt.value }))}
                    className={cn(
                      'p-5 rounded-xl border-2 text-center transition-all',
                      data.preferredDistance === opt.value
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
                        : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] hover:border-slate-300'
                    )}
                  >
                    <p className={cn('text-2xl font-bold', data.preferredDistance === opt.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-[#0F172A] dark:text-slate-100')}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5 — Availability */}
          {step === 5 && (
            <div>
              <p className="section-label mb-2">Step 6</p>
              <h2 className="text-display text-[#0B1220] dark:text-white mb-2">When are you available?</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8">Select the days and times that work for you.</p>

              <div className="mb-6">
                <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mb-3">Days</p>
                <div className="flex flex-wrap gap-2">
                  {days.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                        selectedDays.includes(day)
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-[#E2E8F0] dark:border-[#1E293B] text-slate-600 dark:text-slate-400 bg-white dark:bg-[#111827] hover:border-indigo-300'
                      )}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100 mb-3">Preferred time</p>
                <div className="space-y-2">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot}
                      onClick={() =>
                        setSelectedTimes((prev) =>
                          prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
                        )
                      }
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left',
                        selectedTimes.includes(slot)
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                          : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#111827] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      )}
                    >
                      <span className="text-sm font-medium">{slot}</span>
                      {selectedTimes.includes(slot) && <Check className="w-4 h-4 text-indigo-600" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 6 — Completion */}
          {step === 6 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-9 h-9 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-3xl font-bold text-[#0B1220] dark:text-white mb-3">You're all set.</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">
                Let's find the right people for you.
              </p>

              {/* Summary */}
              <div className="card p-5 text-left mb-8 space-y-3">
                {data.intent && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Goal</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100 capitalize">{data.intent === 'both' ? 'Learn & teach' : data.intent}</span>
                  </div>
                )}
                {data.selectedSkills.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Skills</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100">{data.selectedSkills.join(', ')}</span>
                  </div>
                )}
                {data.experienceLevel && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Level</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100 capitalize">{data.experienceLevel}</span>
                  </div>
                )}
                {data.learningMode && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Mode</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100 capitalize">{data.learningMode === 'either' ? 'Online / Offline' : data.learningMode}</span>
                  </div>
                )}
                {data.preferredDistance && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Distance</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100">Within {data.preferredDistance} km</span>
                  </div>
                )}
                {selectedDays.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Available</span>
                    <span className="font-medium text-[#0F172A] dark:text-slate-100">{selectedDays.map((d) => d.slice(0, 3)).join(', ')}</span>
                  </div>
                )}
              </div>

              <Button variant="primary" size="lg" className="w-full" onClick={finish}>
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Navigation */}
          {step < 6 && (
            <div className="flex items-center justify-between mt-8">
              <Button variant="ghost" size="sm" onClick={back} disabled={step === 0} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
              <Button variant="primary" size="md" onClick={next} disabled={!canNext()} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Continue
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
