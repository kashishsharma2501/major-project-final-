import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, Clock, MapPin, CheckCircle, ArrowLeft, ArrowRight, CreditCard, BookOpen, IndianRupee, AlertCircle, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { getProviderById } from '@/services/providerService';
import type { Provider } from '@/types';
import { formatCurrency, formatDuration, capitalise } from '@/utils/format';
import { cn } from '@/utils/cn';
import { useAuth } from '@/context/AuthContext';
import { createBooking } from '@/services/bookingService';
import { getOrCreateProviderProfile } from '@/services/providerSkillsService';
import { initiatePayment } from '@/services/paymentService';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_OF_WEEK = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function generateCalendarDays(year: number, month: number) {
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(first).fill(null);
  for (let d = 1; d <= total; d++) days.push(d);
  return days;
}

const STEPS = ['Choose Skill', 'Pick Date', 'Pick Time', 'Review', 'Confirm'];

export function BookingPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerLoading, setProviderLoading] = useState(true);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [selectedSkillIndex, setSelectedSkillIndex] = useState(0);
  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(searchParams.get('time'));
  const [mode, setMode] = useState<'offline' | 'online'>('offline');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [bookingStatus] = useState<'pending' | 'accepted'>('pending');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    getProviderById(id).then(result => {
      if (!cancelled) setProvider(result);
    }).catch(error => {
      if (!cancelled) setProviderError(error instanceof Error ? error.message : 'Could not load provider.');
    }).finally(() => {
      if (!cancelled) setProviderLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  if (providerLoading) {
    return <PublicLayout><div className="page-container py-20 text-center" role="status">Loading booking details…</div></PublicLayout>;
  }

  if (!provider) {
    return (
      <PublicLayout>
        <div className="page-container py-20">
          <EmptyState title={providerError ? 'Could not load provider' : 'Provider not found'} description={providerError ?? undefined} action={{ label: 'Browse Providers', onClick: () => navigate('/explore') }} />
        </div>
      </PublicLayout>
    );
  }

  const skill = provider.skills[selectedSkillIndex];
  const calDays = generateCalendarDays(calYear, calMonth);

  // Available slots for selected day
  const selectedDayName = selectedDate
    ? ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][new Date(calYear, calMonth, selectedDate).getDay()]
    : null;
  const availableSlots = selectedDayName
    ? provider.availability.find((a) => a.day === selectedDayName)?.slots || []
    : [];

  const handleConfirm = async () => {
    if (!provider || !selectedDate || !selectedTime || !user?.id) return;
    setSubmitting(true);
    setPaymentError(null);
    try {
      // 1. Look up provider_profiles.id
      const providerProfileId = await getOrCreateProviderProfile(provider.userId, provider.city);
      if (!providerProfileId) throw new Error('Provider profile not found.');

      const skill = provider.skills[selectedSkillIndex];
      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(selectedDate).padStart(2, '0')}`;

      // 2. Create the booking record (status = 'pending' initially)
      const booking = await createBooking({
        learner_id: user.id,
        provider_id: providerProfileId,
        provider_skill_id: skill.skillId,
        skill_name: skill.skillName,
        skill_category: skill.category,
        booking_date: dateStr,
        booking_time: selectedTime,
        duration_minutes: skill.sessionDurationMinutes,
        mode,
        location: mode === 'offline' ? provider.location : undefined,
        price: skill.pricePerSession,
        notes: notes.trim() || undefined,
      });

      setSubmitting(false);

      // 3. Open Razorpay checkout — booking is only confirmed after payment
      const paymentResult = await initiatePayment({
        bookingId: booking.id,
        amount: skill.pricePerSession,
        providerName: provider.name,
        skillName: skill.skillName,
        userEmail: user.email,
        userName: user.name,
      });

      if (paymentResult.success) {
        setPaymentId(paymentResult.payment_id ?? null);
        setConfirmed(true);
      } else {
        // Payment failed or was cancelled — show error, booking remains pending
        setPaymentError(paymentResult.error ?? 'Payment was not completed.');
      }
    } catch (e: any) {
      setSubmitting(false);
      setPaymentError(e.message ?? 'Something went wrong. Please try again.');
    }
  };

  const canNext = () => {
    if (step === 0) return true;
    if (step === 1) return !!selectedDate;
    if (step === 2) return !!selectedTime;
    if (step === 3) return true;
    return false;
  };

  if (confirmed) {
    return (
      <PublicLayout>
        <div className="min-h-screen bg-[#F4F6FB] dark:bg-[#080E1A] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            {/* Success icon */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100 mb-2">
              Payment Confirmed! 🎉
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mb-2">
              Your payment was successful. Your booking request has been sent to{' '}
              <strong>{provider.name}</strong>. You'll be notified when they accept.
            </p>

            {/* Payment ID badge */}
            {paymentId && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-xs text-green-700 dark:text-green-400 mb-5 font-mono">
                <ShieldCheck className="w-3.5 h-3.5" />
                Payment ID: {paymentId}
              </div>
            )}

            {/* Booking summary */}
            <div className="card p-5 text-left mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={provider.avatar} name={provider.name} size="md" />
                <div>
                  <p className="font-semibold text-[#0F172A] dark:text-slate-100">{provider.name}</p>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400">{skill.skillName}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium text-[#0F172A] dark:text-slate-100">
                    {selectedDate ? `${selectedDate} ${MONTHS[calMonth]} ${calYear}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time</span>
                  <span className="font-medium text-[#0F172A] dark:text-slate-100">{selectedTime || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-medium text-[#0F172A] dark:text-slate-100">{formatDuration(skill.sessionDurationMinutes)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mode</span>
                  <span className="font-medium text-[#0F172A] dark:text-slate-100 capitalize">{mode}</span>
                </div>
                <div className="flex justify-between border-t border-[#E2E8F0] dark:border-[#1E293B] pt-2 mt-2">
                  <span className="font-semibold text-[#0F172A] dark:text-slate-100">Total</span>
                  <span className="font-bold text-lg text-[#0F172A] dark:text-slate-100">{formatCurrency(skill.pricePerSession)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => navigate('/dashboard/bookings')}>
                View Bookings
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => navigate(`/dashboard/messages?providerId=${provider.id}&skill=${encodeURIComponent(skill.skillName)}`)}>
                Message Provider
              </Button>
            </div>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B1220]">
        <div className="page-container py-8">
          <button onClick={() => step > 0 ? setStep(s => s - 1) : navigate(`/providers/${id}`)}
            className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-slate-100 mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="max-w-2xl mx-auto">
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-8">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors',
                      i < step ? 'bg-indigo-600 text-white' :
                      i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/50' :
                      'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    )}>
                      {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                    </div>
                    <span className={cn('text-[10px] font-medium hidden sm:block', i === step ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400')}>
                      {s}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn('flex-1 h-0.5 mx-1 transition-colors', i < step ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700')} />
                  )}
                </React.Fragment>
              ))}
            </div>

            <div className="card p-6 animate-fade-in" key={step}>
              {/* Step 0 — Choose Skill */}
              {step === 0 && (
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Choose what to learn</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">with {provider.name}</p>
                  <div className="space-y-3">
                    {provider.skills.map((s, i) => (
                      <button key={s.skillId} onClick={() => setSelectedSkillIndex(i)}
                        className={cn(
                          'w-full flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all',
                          selectedSkillIndex === i
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30'
                            : 'border-[#E2E8F0] dark:border-[#1E293B] hover:border-slate-300'
                        )}>
                        <div>
                          <p className={cn('font-semibold', selectedSkillIndex === i ? 'text-indigo-700 dark:text-indigo-300' : 'text-[#0F172A] dark:text-slate-100')}>
                            {s.skillName}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="slate">{capitalise(s.experienceLevel)}</Badge>
                            <Badge variant="slate">{formatDuration(s.sessionDurationMinutes)}</Badge>
                            <Badge variant="slate">{capitalise(s.learningMode === 'either' ? 'Online/Offline' : s.learningMode)}</Badge>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-[#0F172A] dark:text-slate-100 shrink-0 ml-4">
                          {formatCurrency(s.pricePerSession)}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Mode selection */}
                  {skill.learningMode === 'either' && (
                    <div className="mt-5">
                      <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-200 mb-2">Preferred mode</p>
                      <div className="flex gap-3">
                        {(['offline', 'online'] as const).map((m) => (
                          <button key={m} onClick={() => setMode(m)}
                            className={cn('flex-1 py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all',
                              mode === m ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' : 'border-[#E2E8F0] dark:border-[#1E293B] text-slate-600 dark:text-slate-400 hover:border-slate-300')}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1 — Date */}
              {step === 1 && (
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-4">Pick a date</h2>
                  <div className="flex items-center justify-between mb-4">
                    <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                      className="btn-ghost p-2 text-sm">‹</button>
                    <p className="text-sm font-semibold text-[#0F172A] dark:text-slate-100">{MONTHS[calMonth]} {calYear}</p>
                    <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                      className="btn-ghost p-2 text-sm">›</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAYS_OF_WEEK.map(d => <div key={d} className="text-center text-xs text-slate-400 py-1">{d}</div>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {calDays.map((day, i) => {
                      if (!day) return <div key={`empty-${i}`} />;
                      const date = new Date(calYear, calMonth, day);
                      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getDay()];
                      const hasSlots = provider.availability.some(a => a.day === dayName && a.slots.length > 0);
                      return (
                        <button key={day} disabled={isPast || !hasSlots}
                          onClick={() => { setSelectedDate(day); setSelectedTime(null); }}
                          className={cn(
                            'aspect-square rounded-xl text-sm font-medium transition-all',
                            selectedDate === day ? 'bg-indigo-600 text-white' :
                            isPast ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' :
                            !hasSlots ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' :
                            'hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-[#0F172A] dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400'
                          )}>
                          {day}
                          {!isPast && hasSlots && selectedDate !== day && (
                            <span className="block w-1 h-1 bg-indigo-400 rounded-full mx-auto mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {selectedDate && (
                    <p className="text-center text-xs text-indigo-600 dark:text-indigo-400 mt-3 font-medium">
                      {selectedDate} {MONTHS[calMonth]} selected · {availableSlots.length} slots available
                    </p>
                  )}
                </div>
              )}

              {/* Step 2 — Time */}
              {step === 2 && (
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-1">Choose a time</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-5">
                    {selectedDate} {MONTHS[calMonth]} · {capitalise(selectedDayName || '')}
                  </p>
                  {availableSlots.length === 0 ? (
                    <p className="text-sm text-slate-500">No available slots for this day. Please choose a different date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {availableSlots.map((slot) => {
                        const [h] = slot.split(':').map(Number);
                        const display = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;
                        return (
                          <button key={slot} onClick={() => setSelectedTime(slot)}
                            className={cn(
                              'py-3 rounded-xl border-2 text-sm font-medium transition-all',
                              selectedTime === slot
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-[#E2E8F0] dark:border-[#1E293B] text-slate-600 dark:text-slate-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                            )}>
                            {display}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Review */}
              {step === 3 && (
                <div>
                  <h2 className="text-xl font-bold text-[#0F172A] dark:text-slate-100 mb-5">Review booking</h2>
                  <div className="flex items-center gap-3 mb-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <Avatar src={provider.avatar} name={provider.name} size="lg" />
                    <div>
                      <p className="font-semibold text-[#0F172A] dark:text-slate-100">{provider.name}</p>
                      <p className="text-sm text-indigo-600 dark:text-indigo-400">{skill.skillName}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{provider.city}</p>
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    {[
                      { icon: <BookOpen className="w-4 h-4 text-indigo-500" />, label: 'Skill', value: skill.skillName },
                      { icon: <Calendar className="w-4 h-4 text-teal-500" />, label: 'Date', value: `${selectedDate} ${MONTHS[calMonth]} ${calYear}` },
                      { icon: <Clock className="w-4 h-4 text-amber-500" />, label: 'Time', value: selectedTime ? `${selectedTime} · ${formatDuration(skill.sessionDurationMinutes)}` : '—' },
                      { icon: <MapPin className="w-4 h-4 text-slate-500" />, label: 'Mode', value: capitalise(mode) + (mode === 'offline' ? ` · ${provider.location}` : ' · Video call') },
                      { icon: <CreditCard className="w-4 h-4 text-green-500" />, label: 'Price', value: formatCurrency(skill.pricePerSession) },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">{icon}</div>
                        <div className="flex-1 flex justify-between">
                          <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
                          <span className="text-sm font-medium text-[#0F172A] dark:text-slate-100">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#0F172A] dark:text-slate-200 mb-1.5">
                      Notes for provider <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="E.g. I'm a complete beginner. I have a DSLR camera."
                      rows={3}
                      className="input-base resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="flex flex-col gap-3 mt-5">
              {/* Payment error */}
              {paymentError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-400" role="alert">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Payment not completed</p>
                    <p className="text-xs mt-0.5">{paymentError}</p>
                    <p className="text-xs mt-1 text-red-500 dark:text-red-500">Your booking request has been created but will remain pending until payment is made.</p>
                  </div>
                </div>
              )}

              {/* Test mode notice on review step */}
              {step === 3 && !paymentError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-400">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span><strong>Test Mode:</strong> Use card <code className="bg-indigo-100 dark:bg-indigo-950/60 px-1 rounded">4111 1111 1111 1111</code>, any future expiry, any CVV. OTP: <code className="bg-indigo-100 dark:bg-indigo-950/60 px-1 rounded">1234</code>.</span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button variant="ghost" leftIcon={<ArrowLeft className="w-4 h-4" />}
                  onClick={() => step > 0 ? setStep(s => s - 1) : navigate(`/providers/${id}`)}>
                  Back
                </Button>
                {step < 3 ? (
                  <Button variant="primary" rightIcon={<ArrowRight className="w-4 h-4" />}
                    disabled={!canNext()} onClick={() => setStep(s => s + 1)}>
                    Continue
                  </Button>
                ) : (
                  <Button variant="primary" size="lg" loading={submitting} onClick={handleConfirm}>
                    {!submitting && <><IndianRupee className="w-4 h-4" /> Pay {provider && formatCurrency(provider.skills[selectedSkillIndex]?.pricePerSession ?? 0)} & Request</>}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

