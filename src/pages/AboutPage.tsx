import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Users, BookOpen, Shield, Heart, Zap, ArrowRight, CheckCircle, Star, Globe, Clock } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/Button';

const values = [
  {
    icon: <MapPin className="w-5 h-5" />,
    title: 'Hyperlocal first',
    description: 'The best learning happens close to home. We connect you with skilled people in your own neighbourhood, not strangers on the other side of the world.',
    color: 'from-indigo-500 to-violet-600',
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: 'Evidence-backed skills',
    description: 'Every skill in our catalogue is supported by verified market research — real job data, training providers, and measurable local demand.',
    color: 'from-violet-500 to-purple-600',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Community-driven',
    description: 'Learners and providers build the community together. Reviews, completed sessions, and honest feedback create a platform you can trust.',
    color: 'from-teal-500 to-emerald-600',
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    title: 'Skills that matter',
    description: 'We focus on skills with real-world value — things that are employable, creative, and in demand in Indian cities right now.',
    color: 'from-amber-500 to-orange-600',
  },
  {
    icon: <Heart className="w-5 h-5" />,
    title: 'Fair and accessible',
    description: 'No subscriptions, no hidden platform fees. Providers set their own prices. You pay only for the sessions you actually book.',
    color: 'from-pink-500 to-rose-600',
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: 'Simple by design',
    description: 'Discover a skill, find a local teacher, book a slot, attend, confirm, review. Seven steps — nothing more than what you actually need.',
    color: 'from-emerald-500 to-teal-600',
  },
];

const howItHelps = [
  {
    who: 'For Learners',
    icon: '📚',
    points: [
      'Discover verified skills with market evidence',
      'Browse and filter local teachers by price, rating, and availability',
      'Book sessions in person or online',
      'Build a track record of completed learning',
      'Leave honest, verified reviews after each session',
    ],
    color: 'from-indigo-500 to-violet-600',
  },
  {
    who: 'For Providers',
    icon: '🎓',
    points: [
      'List your skills with your own prices and schedule',
      'Reach learners actively looking for what you know',
      'Accept or decline booking requests on your terms',
      'Build a verified review profile over time',
      'Teach in person, online, or both',
    ],
    color: 'from-teal-500 to-emerald-600',
  },
];

export function AboutPage() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white dark:bg-[#080E1A] py-24">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-40 right-0 w-[600px] h-[600px] rounded-full bg-gradient-to-bl from-indigo-100 to-violet-100 dark:from-indigo-950/30 dark:to-violet-950/20 blur-3xl opacity-60" />
          <div className="absolute bottom-0 -left-20 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-teal-100 to-emerald-100 dark:from-teal-950/20 dark:to-emerald-950/10 blur-3xl opacity-50" />
        </div>
        <div className="page-container relative max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50">
            <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">About us</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#0B1220] dark:text-white mb-5 tracking-tight">
            Learn from people{' '}
            <span className="gradient-text">near you.</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            SkillShare Local is a hyperlocal marketplace where anyone can teach or learn skills within their own city — in person or online, at prices set by real people in the community.
          </p>
        </div>
      </section>

      {/* What it is */}
      <section className="py-20 bg-[#F4F6FB] dark:bg-[#0B1220]">
        <div className="page-container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label mb-3">What SkillShare Local does</p>
              <h2 className="text-3xl font-bold text-[#0B1220] dark:text-white mb-5">
                Real skills. Real people. Your neighbourhood.
              </h2>
              <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  SkillShare Local connects people who want to learn with people nearby who can teach. Whether you want to learn photography, web development, guitar, cooking, or tailoring — there are people in your city who already know how and are willing to share that knowledge.
                </p>
                <p>
                  Providers set their own prices, manage their own availability, and accept or decline bookings on their terms. Learners browse a verified skill catalogue, filter by distance, price, and schedule, then book sessions directly.
                </p>
                <p>
                  After a session, both parties confirm it's complete and the learner can leave a verified review. This creates a trusted, community-built reputation for every provider on the platform.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { emoji: '🗺️', stat: 'Hyperlocal', label: 'Find teachers in your city' },
                { emoji: '📚', stat: '42+', label: 'Evidence-backed skills' },
                { emoji: '⭐', stat: 'Verified', label: 'Reviews after real sessions' },
                { emoji: '🔒', stat: 'Secure', label: 'Row-level data security' },
              ].map(item => (
                <div key={item.label} className="card p-5 text-center hover:shadow-card transition-shadow">
                  <div className="text-3xl mb-2">{item.emoji}</div>
                  <div className="text-lg font-bold text-[#0F172A] dark:text-slate-100">{item.stat}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it helps learners and providers */}
      <section className="py-20 bg-white dark:bg-[#080E1A]">
        <div className="page-container">
          <div className="text-center mb-12">
            <p className="section-label mb-2">Built for both sides</p>
            <h2 className="text-3xl font-bold text-[#0B1220] dark:text-white">Who SkillShare Local is for</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {howItHelps.map(group => (
              <div key={group.who} className="card p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${group.color} text-white flex items-center justify-center text-xl shadow-md`}>
                    {group.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#0F172A] dark:text-slate-100">{group.who}</h3>
                </div>
                <ul className="space-y-2.5">
                  {group.points.map(point => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                      <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-[#F4F6FB] dark:bg-[#0B1220]">
        <div className="page-container">
          <div className="text-center mb-12">
            <p className="section-label mb-2">What drives us</p>
            <h2 className="text-3xl font-bold text-[#0B1220] dark:text-white">Our principles</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {values.map((v) => (
              <div key={v.title} className="card-hover p-6">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${v.color} text-white flex items-center justify-center mb-4 shadow-md`}>
                  {v.icon}
                </div>
                <h3 className="font-bold text-[#0F172A] dark:text-slate-100 mb-2">{v.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{v.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform approach */}
      <section className="py-20 bg-white dark:bg-[#080E1A]">
        <div className="page-container max-w-3xl mx-auto">
          <div className="card p-8">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0 shadow-md">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Our approach to quality</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">How we keep the community trustworthy</p>
              </div>
            </div>
            <div className="space-y-4 text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
              <p>
                Every skill in the SkillShare Local catalogue is backed by real evidence — LinkedIn India job data, SWAYAM Plus training programmes, NIELIT courses, and industry research. We don't list skills without checking there's genuine demand for them.
              </p>
              <p>
                Provider approvals go through a review process. Providers complete a questionnaire about their experience, teaching style, and qualifications before appearing in search results. This isn't automated — a real person reviews each application.
              </p>
              <p>
                Reviews are only unlocked after both parties confirm a session is complete. You can't leave a review for a session that didn't happen. This keeps feedback honest and meaningful.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#E2E8F0] dark:border-[#1E293B]">
              {[
                { icon: <Clock className="w-4 h-4" />, label: 'Real availability', desc: 'Providers set actual slots' },
                { icon: <Shield className="w-4 h-4" />, label: 'Verified reviews', desc: 'After confirmed sessions only' },
                { icon: <MapPin className="w-4 h-4" />, label: 'Local by default', desc: 'Your city, your community' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0F172A] dark:text-slate-100">{item.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 gradient-brand" />
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <svg className="w-full h-full">
            <defs><pattern id="about-dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.5" fill="white" /></pattern></defs>
            <rect width="100%" height="100%" fill="url(#about-dots)" />
          </svg>
        </div>
        <div className="page-container relative text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to start?</h2>
          <p className="text-white/70 mb-8 max-w-md mx-auto">
            Browse our skill catalogue, find a teacher near you, and book your first session.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Button variant="secondary" size="lg" onClick={() => navigate('/explore')}>
              Explore Skills <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
              onClick={() => navigate('/become-a-provider')}>
              Become a Provider
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
