import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserCheck, CalendarCheck, Video, CheckCircle, Star, ArrowRight } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/Button';

const steps = [
  {
    number: '01',
    icon: <Search className="w-6 h-6" />,
    title: 'Discover Skills',
    description: 'Browse our verified skill catalogue — from photography and coding to music, fitness, and more. Use filters to find skills by category, distance, mode, price, and experience level.',
    color: 'from-indigo-500 to-violet-600',
    shadow: 'shadow-indigo-500/30',
  },
  {
    number: '02',
    icon: <UserCheck className="w-6 h-6" />,
    title: 'Choose a Provider',
    description: 'View detailed provider profiles showing their skills, ratings, reviews, availability, and background. Every provider is a real person in your city.',
    color: 'from-violet-500 to-purple-600',
    shadow: 'shadow-violet-500/30',
  },
  {
    number: '03',
    icon: <CalendarCheck className="w-6 h-6" />,
    title: 'Select a Slot',
    description: 'Pick a date and time that works for you from the provider\'s real availability calendar. Choose in-person or online — wherever you learn best.',
    color: 'from-purple-500 to-pink-600',
    shadow: 'shadow-purple-500/30',
  },
  {
    number: '04',
    icon: <ArrowRight className="w-6 h-6" />,
    title: 'Send a Booking Request',
    description: 'Submit your booking request with any notes for the provider. They\'ll receive a notification and respond to confirm or suggest an alternative.',
    color: 'from-pink-500 to-rose-600',
    shadow: 'shadow-pink-500/30',
  },
  {
    number: '05',
    icon: <Video className="w-6 h-6" />,
    title: 'Attend the Session',
    description: 'Meet your provider in person at an agreed location, or join via video call for online sessions. Learn directly from someone who genuinely knows their craft.',
    color: 'from-amber-500 to-orange-600',
    shadow: 'shadow-amber-500/30',
  },
  {
    number: '06',
    icon: <CheckCircle className="w-6 h-6" />,
    title: 'Confirm Completion',
    description: 'After the session, both you and the provider confirm it\'s complete. This keeps records accurate and unlocks the review feature for your session.',
    color: 'from-teal-500 to-emerald-600',
    shadow: 'shadow-teal-500/30',
  },
  {
    number: '07',
    icon: <Star className="w-6 h-6" />,
    title: 'Leave a Review',
    description: 'Share your experience with the community. Reviews help other learners find the best local teachers and help great providers grow their practice.',
    color: 'from-indigo-500 to-violet-600',
    shadow: 'shadow-indigo-500/30',
  },
];

const faqs = [
  {
    q: 'Is SkillShare Local free to use?',
    a: 'Creating an account and browsing skills is completely free. Providers set their own session prices. There is no platform commission in the current version.',
  },
  {
    q: 'How do I know a provider is trustworthy?',
    a: 'Every provider\'s profile shows their verified reviews, completed session count, years of experience, and response time. Admins can also grant a verified badge after manual review.',
  },
  {
    q: 'What if I need to cancel?',
    a: 'Either party can cancel a pending or accepted booking. Learners cancel from their Bookings page; providers cancel from their Bookings dashboard. Cancellation reasons are logged.',
  },
  {
    q: 'Can I teach multiple skills?',
    a: 'Yes. Providers can list as many skills as they like, each with its own price, duration, experience level, and learning mode.',
  },
  {
    q: 'Is online learning available?',
    a: 'Yes. When you book, choose "Online" and coordinate with your provider for the video call link. Both offline and online sessions are fully supported.',
  },
];

export function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white dark:bg-[#080E1A] py-24">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 dark:from-indigo-950/30 dark:to-violet-950/20 blur-3xl opacity-60" />
          <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-teal-100 to-emerald-100 dark:from-teal-950/20 dark:to-emerald-950/10 blur-3xl opacity-50" />
        </div>
        <div className="page-container relative text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Simple by design</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#0B1220] dark:text-white mb-5 tracking-tight">
            How SkillShare Local{' '}
            <span className="gradient-text">works</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
            Seven steps from finding a skill to leaving a review. No subscriptions, no algorithm — just real people teaching real skills in your city.
          </p>
          <Button variant="primary" size="lg" onClick={() => navigate('/explore')}>
            Find a Skill <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 bg-[#F4F6FB] dark:bg-[#0B1220]">
        <div className="page-container">
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-indigo-500 via-violet-500 to-teal-500 opacity-20 hidden lg:block" />

            <div className="space-y-8">
              {steps.map((step, i) => (
                <div key={step.number} className="flex gap-6 lg:gap-10 group">
                  {/* Icon */}
                  <div className="shrink-0">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} text-white flex items-center justify-center shadow-lg ${step.shadow} group-hover:scale-110 transition-transform duration-300`}>
                      {step.icon}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="card p-6 flex-1 group-hover:-translate-y-0.5 transition-transform duration-300">
                    <div className="flex items-start gap-4">
                      <span className="text-3xl font-black text-slate-100 dark:text-slate-800 select-none">{step.number}</span>
                      <div>
                        <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-100 mb-2">{step.title}</h3>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white dark:bg-[#080E1A]">
        <div className="page-container max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label mb-2">Got questions?</p>
            <h2 className="text-3xl font-bold text-[#0B1220] dark:text-white">Frequently asked</h2>
          </div>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="card p-6">
                <h3 className="font-semibold text-[#0F172A] dark:text-slate-100 mb-2">{q}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-brand" />
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full"><defs><pattern id="cta-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white" /></pattern></defs><rect width="100%" height="100%" fill="url(#cta-dots)" /></svg>
        </div>
        <div className="page-container relative text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to start learning?</h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">Browse skills, find a local teacher, and book your first session today.</p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button variant="secondary" size="lg" onClick={() => navigate('/explore')}>Explore Skills</Button>
            <Button size="lg" className="bg-white/20 hover:bg-white/30 text-white border border-white/30" onClick={() => navigate('/signup')}>Create Account</Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
