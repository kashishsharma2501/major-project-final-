import React, { useState, useEffect, useCallback } from 'react';
import { HelpCircle, Plus, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { getMyTickets, createTicket, type SupportTicket, type TicketCategory } from '@/services/supportService';
import { formatRelativeTime } from '@/utils/format';
import { cn } from '@/utils/cn';

const faqs = [
  { q: 'How do I cancel a booking?', a: 'Go to My Bookings, find the booking, and click Cancel. You can cancel any pending or accepted booking.' },
  { q: 'What happens after I cancel?', a: 'The booking status changes to Cancelled and the provider is notified. No payments are processed by the platform.' },
  { q: 'How do I mark a session as complete?', a: 'After attending, go to My Bookings → the session → click "Mark Complete". The provider must also confirm.' },
  { q: 'When can I leave a review?', a: 'Only after both you and the provider have confirmed the session is complete.' },
  { q: 'How does the booking request work?', a: 'You send a request; the provider accepts or declines. You\'ll get a notification either way.' },
  { q: 'What if a provider doesn\'t respond?', a: 'If your request isn\'t accepted within a reasonable time, cancel it and try another provider.' },
  { q: 'How do I message a provider?', a: 'Messaging is available after a booking is accepted. Go to Messages in the dashboard.' },
  { q: 'Can I request a reschedule?', a: 'Yes — open a support ticket with category "Cancellation" and describe the new preferred slot.' },
];

const categoryLabels: Record<TicketCategory, string> = {
  booking_issue: 'Booking issue',
  account: 'Account & profile',
  payment: 'Payment query',
  provider_issue: 'Provider issue',
  technical: 'Technical problem',
  cancellation: 'Cancellation / reschedule',
  refund: 'Refund enquiry',
  other: 'Other',
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open:        { label: 'Open',        color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400',  icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'In progress', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',      icon: <AlertCircle className="w-3 h-3" /> },
  resolved:    { label: 'Resolved',    color: 'text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
  closed:      { label: 'Closed',      color: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',    icon: <CheckCircle className="w-3 h-3" /> },
};

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card overflow-hidden">
      <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setOpen(o => !o)}>
        <span className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">{q}</span>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-t border-[#E2E8F0] dark:border-[#1E293B] pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export function SupportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ category: 'other' as TicketCategory, subject: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getMyTickets(user.id);
      setTickets(data);
    } catch { /* non-critical */ }
    finally { setLoading(false); }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim()) e.subject = 'Subject is required.';
    if (form.description.trim().length < 20) e.description = 'Please describe the issue in at least 20 characters.';
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    if (!user?.id) return;
    setSubmitting(true);
    try {
      const ticket = await createTicket({ user_id: user.id, category: form.category, subject: form.subject.trim(), description: form.description.trim() });
      setTickets(prev => [ticket, ...prev]);
      setModalOpen(false);
      setForm({ category: 'other', subject: '', description: '' });
      toast('success', 'Ticket submitted', 'We\'ll get back to you shortly.');
    } catch (e: any) {
      toast('error', 'Could not submit ticket', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openTickets  = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const closedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  return (
    <DashboardLayout title="Support" subtitle="Get help, manage tickets, and find answers">
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left — FAQs + tickets */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <div className="card p-5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-[#0F172A] dark:text-slate-100">Can't find an answer?</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Open a support ticket and we'll respond within 2 business days.</p>
            </div>
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setModalOpen(true)}>
              New Ticket
            </Button>
          </div>

          {/* My tickets */}
          {!loading && tickets.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-3">
                My Tickets {openTickets.length > 0 && <span className="ml-2 text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 px-2 py-0.5 rounded-full">{openTickets.length} open</span>}
              </h2>
              <div className="space-y-3">
                {tickets.map(t => {
                  const cfg = statusConfig[t.status] ?? statusConfig.open;
                  return (
                    <div key={t.id} className="card p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-[#0F172A] dark:text-slate-100 truncate">{t.subject}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{categoryLabels[t.category]} · {formatRelativeTime(t.created_at)}</p>
                          {t.admin_note && (
                            <div className="mt-2 p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900">
                              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-400 mb-0.5">Admin response</p>
                              <p className="text-xs text-indigo-600 dark:text-indigo-400">{t.admin_note}</p>
                            </div>
                          )}
                        </div>
                        <span className={cn('badge shrink-0 flex items-center gap-1', cfg.color)}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* FAQs */}
          <section>
            <h2 className="text-base font-semibold text-[#0F172A] dark:text-slate-100 mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              Frequently asked questions
            </h2>
            <div className="space-y-2">
              {faqs.map(f => <FaqItem key={f.q} q={f.q} a={f.a} />)}
            </div>
          </section>
        </div>

        {/* Right — contact info */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold text-[#0F172A] dark:text-slate-100 mb-3">Response times</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Normal tickets', time: '2 business days' },
                { label: 'Booking issues', time: '1 business day' },
                { label: 'Urgent / safety', time: 'Same day' },
              ].map(r => (
                <div key={r.label} className="flex justify-between items-center py-1.5 border-b border-[#E2E8F0] dark:border-[#1E293B] last:border-0">
                  <span className="text-slate-500 dark:text-slate-400">{r.label}</span>
                  <span className="text-xs font-semibold text-[#0F172A] dark:text-slate-100">{r.time}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-[#0F172A] dark:text-slate-100 mb-2">Academic project</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              SkillShare Local is a B.Tech final-year project. Support is on a best-effort basis. No payment processing or refunds are implemented.
            </p>
          </div>
        </div>
      </div>

      {/* New ticket modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Open a Support Ticket" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as TicketCategory }))}
              className="input-base appearance-none">
              {(Object.entries(categoryLabels) as [TicketCategory, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <Input label="Subject *" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Brief description of the issue" error={errors.subject} />
          <Textarea label="Description *" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Describe your issue in detail. Include booking IDs, dates, or provider names if relevant." rows={5} error={errors.description} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              Submit Ticket
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
