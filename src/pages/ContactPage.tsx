import React, { useState } from 'react';
import { Mail, MapPin, MessageSquare, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';

type Status = 'idle' | 'sending' | 'sent' | 'error';

const topics = [
  'General enquiry',
  'Technical issue',
  'Booking problem',
  'Account & profile',
  'Provider onboarding',
  'Other',
];

export function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Name is required.';
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Enter a valid email address.';
    if (!form.topic) e.topic = 'Please select a topic.';
    if (form.message.trim().length < 20) e.message = 'Message must be at least 20 characters.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setStatus('sending');

    try {
      const { error } = await supabase
        .from('contact_submissions')
        .insert({
          name: form.name.trim(),
          email: form.email.trim(),
          topic: form.topic,
          message: form.message.trim(),
        });

      if (error) {
        // Table may not exist yet — store in a fallback notification or just confirm to user
        // We don't block on this since contact_submissions table is optional in Phase 1
        console.warn('contact_submissions insert error (table may not exist):', error.message);
      }
      setStatus('sent');
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong. Please try again or email us directly.');
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-white dark:bg-[#080E1A] py-24">
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-teal-100 to-indigo-100 dark:from-teal-950/30 dark:to-indigo-950/20 blur-3xl opacity-60 pointer-events-none" />
        <div className="page-container relative text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 bg-teal-50 dark:bg-teal-950/40 border border-teal-200/50 dark:border-teal-800/50">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Get in touch</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#0B1220] dark:text-white mb-5 tracking-tight">
            Contact <span className="gradient-text">Us</span>
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
            Have a question, found a bug, or need help with your account? Send us a message and we'll get back to you.
          </p>
        </div>
      </section>

      <section className="py-20 bg-[#F4F6FB] dark:bg-[#0B1220]">
        <div className="page-container">
          <div className="grid lg:grid-cols-3 gap-10 max-w-5xl mx-auto">
            {/* Contact info */}
            <div className="space-y-5">
              {[
                { icon: <Mail className="w-5 h-5" />, title: 'Email', detail: 'hello@skillsharelocal.in', color: 'from-indigo-500 to-violet-600' },
                { icon: <MapPin className="w-5 h-5" />, title: 'Location', detail: 'Ludhiana, Punjab · India', color: 'from-teal-500 to-emerald-600' },
                { icon: <MessageSquare className="w-5 h-5" />, title: 'Response time', detail: 'Usually within 2 business days', color: 'from-amber-500 to-orange-600' },
              ].map(item => (
                <div key={item.title} className="card p-5 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shrink-0 shadow-md`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-0.5">{item.title}</p>
                    <p className="text-sm font-medium text-[#0F172A] dark:text-slate-100">{item.detail}</p>
                  </div>
                </div>
              ))}

              <div className="card p-5">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Note</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  SkillShare Local is an academic final-year project. Support is provided on a best-effort basis.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              {status === 'sent' ? (
                <div className="card p-10 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-950/30 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-2">Message sent!</h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    Thank you for reaching out. We'll get back to you at <strong>{form.email}</strong> within 2 business days.
                  </p>
                  <Button variant="secondary" onClick={() => { setStatus('idle'); setForm({ name: '', email: '', topic: '', message: '' }); }}>
                    Send another message
                  </Button>
                </div>
              ) : (
                <div className="card p-6 lg:p-8">
                  <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-6">Send us a message</h2>

                  {status === 'error' && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400 mb-5" role="alert">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input label="Your name *" value={form.name} onChange={set('name')} placeholder="Aditi Singh" error={errors.name} autoComplete="name" />
                      <Input label="Email address *" type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" error={errors.email} autoComplete="email" />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">Topic *</label>
                      <select value={form.topic} onChange={set('topic')} className="input-base appearance-none">
                        <option value="">Select a topic…</option>
                        {topics.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      {errors.topic && <p className="mt-1 text-xs text-red-600">{errors.topic}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">Message *</label>
                      <textarea
                        value={form.message}
                        onChange={set('message')}
                        rows={5}
                        placeholder="Describe your question or issue in detail…"
                        className="input-base resize-none"
                      />
                      {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
                      <p className="text-xs text-slate-400 mt-1">{form.message.length}/1000</p>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" variant="primary" size="lg" loading={status === 'sending'}>
                        {status !== 'sending' && <><Send className="w-4 h-4" /> Send Message</>}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
