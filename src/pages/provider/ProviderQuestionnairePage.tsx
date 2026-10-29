import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, ArrowLeft, User, MapPin, BookOpen, Clock, Globe } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { supabase } from '@/lib/supabase';
import { getOrCreateProviderProfile } from '@/services/providerSkillsService';
import { cn } from '@/utils/cn';

const TOTAL_STEPS = 5;

const indianCities = [
  'Ludhiana', 'Chandigarh', 'Amritsar', 'Jalandhar', 'Delhi',
  'Patiala', 'Mohali', 'Gurugram', 'Noida', 'Jaipur',
];

const teachingStyles = [
  { value: 'practical', label: '🛠️ Practical / hands-on', desc: 'Learn by doing projects and exercises' },
  { value: 'theory-first', label: '📖 Theory first', desc: 'Understand concepts deeply before practising' },
  { value: 'mixed', label: '⚖️ Mixed approach', desc: 'Balance theory with practical work' },
  { value: 'adaptive', label: '🎯 Adaptive', desc: 'Adjusts to each learner\'s needs' },
];

const sessionFormats = [
  { value: 'one-on-one', label: '👤 One-on-one' },
  { value: 'group', label: '👥 Small group (2–5)' },
  { value: 'workshop', label: '🏛️ Workshop' },
];

const languageOptions = [
  'Hindi', 'Punjabi', 'English', 'Urdu', 'Bengali', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam',
];

interface FormData {
  bio: string;
  location: string;
  city: string;
  teaching_style: string;
  qualifications: string;
  years_teaching: number;
  session_formats: string[];
  languages: string[];
}

const BLANK: FormData = {
  bio: '', location: '', city: 'Ludhiana',
  teaching_style: '', qualifications: '',
  years_teaching: 1, session_formats: [], languages: ['Hindi', 'English'],
};

function StepDot({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn(
          'h-1.5 rounded-full transition-all duration-300',
          i < current ? 'bg-indigo-600 w-6' : i === current ? 'bg-indigo-400 w-4' : 'bg-slate-200 dark:bg-slate-700 w-2'
        )} />
      ))}
    </div>
  );
}

export function ProviderQuestionnairePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(BLANK);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      getOrCreateProviderProfile(user.id, user.city).then(setProviderId);
      // Pre-fill city from profile
      setForm(f => ({ ...f, city: user.city || 'Ludhiana' }));
    }
  }, [user?.id, user?.city]);

  const set = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const toggleFormat = (val: string) => {
    setForm(f => ({
      ...f,
      session_formats: f.session_formats.includes(val)
        ? f.session_formats.filter(x => x !== val)
        : [...f.session_formats, val],
    }));
  };

  const toggleLanguage = (lang: string) => {
    setForm(f => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter(x => x !== lang)
        : [...f.languages, lang],
    }));
  };

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.bio.trim() || form.bio.trim().length < 30) e.bio = 'Bio must be at least 30 characters.';
      if (!form.location.trim()) e.location = 'Your teaching location is required.';
    }
    if (step === 1) {
      if (!form.teaching_style) e.teaching_style = 'Please select your teaching style.';
    }
    if (step === 2) {
      if (!form.qualifications.trim() || form.qualifications.trim().length < 20) e.qualifications = 'Please describe your experience (at least 20 characters).';
    }
    if (step === 3) {
      if (form.session_formats.length === 0) e.session_formats = 'Select at least one session format.';
      if (form.languages.length === 0) e.languages = 'Select at least one language.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => setStep(s => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (!validateStep() || !providerId || !user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('provider_profiles')
        .update({
          bio: form.bio.trim(),
          location: form.location.trim(),
          city: form.city,
          teaching_style: form.teaching_style,
          qualifications: form.qualifications.trim(),
          years_teaching: form.years_teaching,
          session_format: form.session_formats,
          languages: form.languages,
          questionnaire_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', providerId);

      if (error) throw new Error(error.message);

      navigate('/provider?submitted=true', { replace: true });
    } catch (e: any) {
      toast('error', 'Could not save profile', e.message);
    } finally {
      setSaving(false);
    }
  };

  const stepContent = [
    // Step 0 — About you
    <div key="0" className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Tell us about yourself</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">This appears on your public profile. Be genuine and specific.</p>
      </div>
      <Textarea label="Bio *" value={form.bio} onChange={set('bio')}
        placeholder="Describe your background, passion for teaching, and what learners can expect from a session with you. Be specific about your experience."
        rows={5} error={errors.bio} />
      <p className="text-xs text-slate-400 -mt-3">{form.bio.length}/500</p>
      <Input label="Teaching location *" value={form.location} onChange={set('location')}
        placeholder="e.g. Model Town, Ludhiana" leftIcon={<MapPin className="w-4 h-4" />} error={errors.location} />
      <div>
        <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">City *</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <select value={form.city} onChange={set('city')} className="input-base pl-10 appearance-none">
            {indianCities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
    </div>,

    // Step 1 — Teaching style
    <div key="1" className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">How do you teach?</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Choose the style that best describes your approach.</p>
      </div>
      <div className="space-y-3">
        {teachingStyles.map(ts => (
          <button key={ts.value} type="button" onClick={() => setForm(f => ({ ...f, teaching_style: ts.value }))}
            className={cn('w-full text-left p-4 rounded-2xl border-2 transition-all duration-200',
              form.teaching_style === ts.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                : 'border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F1929] hover:border-indigo-200'
            )}>
            <p className={cn('font-semibold text-sm', form.teaching_style === ts.value ? 'text-indigo-700 dark:text-indigo-300' : 'text-[#0F172A] dark:text-slate-100')}>
              {ts.label}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ts.desc}</p>
          </button>
        ))}
      </div>
      {errors.teaching_style && <p className="text-xs text-red-600">{errors.teaching_style}</p>}
    </div>,

    // Step 2 — Qualifications
    <div key="2" className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Your background</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Describe your experience, training, or credentials. Learners rely on this to make booking decisions.</p>
      </div>
      <Textarea label="Experience & qualifications *" value={form.qualifications} onChange={set('qualifications')}
        placeholder="e.g. 5 years professional photographer, Adobe Certified. Taught 50+ students. Self-taught guitarist with Grade 8 theory certificate."
        rows={5} error={errors.qualifications} />
      <div>
        <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">
          Years of teaching experience
        </label>
        <input type="range" min={0} max={30} value={form.years_teaching}
          onChange={e => setForm(f => ({ ...f, years_teaching: Number(e.target.value) }))}
          className="w-full accent-indigo-600" />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0 (just starting)</span>
          <span className="font-semibold text-indigo-600">{form.years_teaching} year{form.years_teaching !== 1 ? 's' : ''}</span>
          <span>30+</span>
        </div>
      </div>
    </div>,

    // Step 3 — Format & languages
    <div key="3" className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Session format & languages</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">How will you run sessions, and in which languages?</p>
      </div>
      <div>
        <p className="text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-3">Session formats *</p>
        <div className="flex flex-wrap gap-2">
          {sessionFormats.map(sf => (
            <button key={sf.value} type="button" onClick={() => toggleFormat(sf.value)}
              className={cn('px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                form.session_formats.includes(sf.value)
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300'
                  : 'border-[#E2E8F0] dark:border-[#1E293B] text-slate-600 dark:text-slate-400 hover:border-indigo-200'
              )}>
              {sf.label}
            </button>
          ))}
        </div>
        {errors.session_formats && <p className="text-xs text-red-600 mt-1">{errors.session_formats}</p>}
      </div>
      <div>
        <p className="text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-3">Teaching languages *</p>
        <div className="flex flex-wrap gap-2">
          {languageOptions.map(lang => (
            <button key={lang} type="button" onClick={() => toggleLanguage(lang)}
              className={cn('px-3 py-1.5 rounded-full border text-xs font-semibold transition-all',
                form.languages.includes(lang)
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300'
                  : 'border-[#E2E8F0] dark:border-[#1E293B] text-slate-500 hover:border-teal-300'
              )}>
              {lang}
            </button>
          ))}
        </div>
        {errors.languages && <p className="text-xs text-red-600 mt-1">{errors.languages}</p>}
      </div>
    </div>,

    // Step 4 — Review & submit
    <div key="4" className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Review your profile</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Your profile will be submitted for admin review before appearing publicly.</p>
      </div>
      <div className="card p-5 space-y-3">
        <div className="flex gap-3">
          <User className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Bio</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{form.bio || '—'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <MapPin className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Location</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{form.location}, {form.city}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <BookOpen className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Teaching style</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{teachingStyles.find(t => t.value === form.teaching_style)?.label || '—'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Experience</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{form.years_teaching} year{form.years_teaching !== 1 ? 's' : ''} teaching · {form.qualifications.slice(0, 80)}{form.qualifications.length > 80 ? '…' : ''}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Globe className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold mb-0.5">Languages</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{form.languages.join(', ')}</p>
          </div>
        </div>
      </div>
      <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300 font-semibold mb-1">What happens next?</p>
        <p className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
          Your profile will be reviewed by an admin and approved before appearing in search results. You can still add skills and set availability while waiting for approval.
        </p>
      </div>
    </div>,
  ];

  return (
    <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#080E1A] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Logo size="sm" />
          <div className="text-right">
            <StepDot current={step} total={TOTAL_STEPS} />
            <p className="text-xs text-slate-400 mt-1">Step {step + 1} of {TOTAL_STEPS}</p>
          </div>
        </div>

        {/* Card */}
        <div className="card p-6 lg:p-8">
          {stepContent[step]}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-[#E2E8F0] dark:border-[#1E293B]">
            {step > 0 ? (
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => navigate('/provider')}>
                Skip for now
              </Button>
            )}

            {step < TOTAL_STEPS - 1 ? (
              <Button variant="primary" onClick={next}>
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button variant="primary" onClick={handleSubmit} loading={saving}>
                {!saving && <><CheckCircle className="w-4 h-4" /> Submit Profile</>}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
