import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, IndianRupee, Clock, Star, BookOpen, Users, ArrowRight, Sparkles } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/Button';

const benefits = [
  { icon: <IndianRupee className="w-5 h-5" />, title: 'Set your own price', description: 'You decide what to charge per session. No commission taken by the platform in the current version.', color: 'from-green-500 to-emerald-600' },
  { icon: <Clock className="w-5 h-5" />, title: 'Your schedule', description: 'Set the days and time slots you\'re available. Accept only the bookings that work for you.', color: 'from-indigo-500 to-violet-600' },
  { icon: <Users className="w-5 h-5" />, title: 'Reach local learners', description: 'Learners in your city actively search for what you know. Your skills have a ready audience.', color: 'from-violet-500 to-purple-600' },
  { icon: <Star className="w-5 h-5" />, title: 'Build your reputation', description: 'Every completed session earns you a verified review, building trust that attracts more students.', color: 'from-amber-500 to-orange-600' },
  { icon: <BookOpen className="w-5 h-5" />, title: 'Verified skills catalogue', description: 'Your skills appear alongside market-researched evidence, giving learners confidence in what you offer.', color: 'from-teal-500 to-emerald-600' },
  { icon: <Sparkles className="w-5 h-5" />, title: 'Simple onboarding', description: 'Set up your profile, add skills, set availability, and start accepting bookings — all in under 10 minutes.', color: 'from-pink-500 to-rose-600' },
];

const steps = [
  { step: '1', title: 'Sign up', detail: 'Create your account and select "Teach a skill" during registration.' },
  { step: '2', title: 'Complete onboarding', detail: 'Tell us about your background, preferred teaching style, and city.' },
  { step: '3', title: 'Add your skills', detail: 'List each skill with a description, price, duration, and learning mode.' },
  { step: '4', title: 'Set availability', detail: 'Mark the days and time slots when you can take sessions.' },
  { step: '5', title: 'Start receiving bookings', detail: 'Learners find your profile and send booking requests. You accept or decline.' },
];

const requirements = [
  'Genuine knowledge or experience in the skill you want to teach',
  'Reliable internet connection for online sessions (or a suitable meeting location)',
  'Ability to communicate clearly in at least one shared language with your learners',
  'Commitment to responding to booking requests within a reasonable time',
  'Respect for learners and a professional approach to teaching',
];

export function BecomeProviderPage() {
  const navigate = useNavigate();
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 bg-white dark:bg-[#080E1A]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full bg-gradient-to-bl from-violet-100 to-indigo-100 dark:from-violet-950/30 dark:to-indigo-950/20 blur-3xl opacity-70" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-teal-100 to-emerald-100 dark:from-teal-950/20 dark:to-emerald-950/10 blur-3xl opacity-50" />
        </div>
        <div className="page-container relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/60 dark:to-violet-950/40 border border-indigo-200/50 dark:border-indigo-800/50">
              <span className="w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-pulse" />
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-widest">Become a provider</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-[#0B1220] dark:text-white mb-5 tracking-tight">
              Teach what you know.{' '}
              <span className="gradient-text">Earn doing it.</span>
            </h1>
            <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
              Share your skills with learners in your city. Set your own price, schedule, and pace. No platform commission. No gatekeeping.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button variant="primary" size="lg" onClick={() => navigate('/signup?role=provider')}>
                Start Teaching <ArrowRight className="w-4 h-4" />
              </Button>
              <Button variant="secondary" size="lg" onClick={() => navigate('/login')}>
                Already have an account?
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-[#F4F6FB] dark:bg-[#0B1220]">
        <div className="page-container">
          <div className="text-center mb-12">
            <p className="section-label mb-2">Why teach here</p>
            <h2 className="text-3xl font-bold text-[#0B1220] dark:text-white">Everything you need to get started</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map(b => (
              <div key={b.title} className="card-hover p-6">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${b.color} text-white flex items-center justify-center mb-4 shadow-md`}>
                  {b.icon}
                </div>
                <h3 className="font-bold text-[#0F172A] dark:text-slate-100 mb-2">{b.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to get started */}
      <section className="py-20 bg-white dark:bg-[#080E1A]">
        <div className="page-container max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label mb-2">Get up and running</p>
            <h2 className="text-3xl font-bold text-[#0B1220] dark:text-white">Five steps to your first booking</h2>
          </div>
          <div className="space-y-4">
            {steps.map((s) => (
              <div key={s.step} className="card p-5 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/30">
                  {s.step}
                </div>
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-slate-100">{s.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-20 bg-[#F4F6FB] dark:bg-[#0B1220]">
        <div className="page-container max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <p className="section-label mb-2">What we expect</p>
            <h2 className="text-3xl font-bold text-[#0B1220] dark:text-white">Provider requirements</h2>
          </div>
          <div className="card p-6 space-y-3">
            {requirements.map(r => (
              <div key={r} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-brand" />
        <div className="absolute inset-0 opacity-10"><svg className="w-full h-full"><defs><pattern id="bp-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white" /></pattern></defs><rect width="100%" height="100%" fill="url(#bp-dots)" /></svg></div>
        <div className="page-container relative text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to share your skills?</h2>
          <p className="text-white/70 mb-8">Join SkillShare Local and connect with learners in your city today.</p>
          <Button variant="secondary" size="lg" onClick={() => navigate('/signup?role=provider')}>
            Create Provider Account <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
