/**
 * Booking service — Supabase implementation.
 *
 * All DB bookings are joined with profiles so the UI gets
 * learner/provider names and avatars without extra queries.
 */
import { supabase } from '@/lib/supabase';
import type { Booking, BookingStatus } from '@/types';

// ── Shape returned by Supabase join ──────────────────────────────────────────
interface DbBookingRow {
  id: string;
  learner_id: string;
  provider_id: string;
  skill_name: string;
  skill_category: string;
  booking_date: string;
  booking_time: string;
  duration_minutes: number;
  mode: string;
  location: string | null;
  price: number;
  status: string;
  notes: string | null;
  learner_confirmed: boolean;
  provider_confirmed: boolean;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  learner: { name: string; avatar_url: string | null } | null;
  provider: { user_id: string; profiles: { name: string; avatar_url: string | null } | null } | null;
}

function toBooking(row: DbBookingRow): Booking {
  return {
    id: row.id,
    learnerId: row.learner_id,
    learnerName: row.learner?.name ?? 'Unknown',
    learnerAvatar: row.learner?.avatar_url ?? undefined,
    providerId: row.provider_id,
    providerName: row.provider?.profiles?.name ?? 'Unknown',
    providerAvatar: row.provider?.profiles?.avatar_url ?? undefined,
    skill: row.skill_name,
    skillCategory: row.skill_category,
    date: row.booking_date,
    time: row.booking_time.slice(0, 5), // HH:MM
    durationMinutes: row.duration_minutes,
    mode: row.mode as Booking['mode'],
    location: row.location ?? undefined,
    price: row.price,
    status: row.status as BookingStatus,
    notes: row.notes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BOOKING_SELECT = `
  id, learner_id, provider_id, skill_name, skill_category,
  booking_date, booking_time, duration_minutes, mode, location,
  price, status, notes, learner_confirmed, provider_confirmed,
  cancelled_by, cancel_reason, created_at, updated_at,
  learner:profiles!bookings_learner_id_fkey(name, avatar_url),
  provider:provider_profiles!bookings_provider_id_fkey(
    user_id,
    profiles(name, avatar_url)
  )
`.trim();

export async function getBookingsByLearner(learnerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('learner_id', learnerId)
    .order('booking_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as DbBookingRow[]).map(toBooking);
}

export async function getBookingsByProvider(providerProfileId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('provider_id', providerProfileId)
    .order('booking_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data as unknown as DbBookingRow[]).map(toBooking);
}

export async function getAllBookings(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .order('booking_date', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as DbBookingRow[]).map(toBooking);
}

export interface CreateBookingInput {
  learner_id: string;
  provider_id: string;  // provider_profiles.id
  provider_skill_id: string;
  skill_name: string;
  skill_category: string;
  booking_date: string;  // YYYY-MM-DD
  booking_time: string;  // HH:MM
  duration_minutes: number;
  mode: 'offline' | 'online' | 'either';
  location?: string;
  price: number;
  notes?: string;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      learner_id: input.learner_id,
      provider_id: input.provider_id,
      provider_skill_id: input.provider_skill_id,
      skill_name: input.skill_name,
      skill_category: input.skill_category,
      booking_date: input.booking_date,
      booking_time: input.booking_time,
      duration_minutes: input.duration_minutes,
      mode: input.mode,
      location: input.location ?? null,
      price: input.price,
      notes: input.notes ?? null,
    })
    .select(BOOKING_SELECT)
    .single();

  if (error) throw new Error(error.message);
  return toBooking(data as unknown as DbBookingRow);
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  extra?: { cancel_reason?: string; cancelled_by?: string }
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (extra?.cancel_reason) update.cancel_reason = extra.cancel_reason;
  if (extra?.cancelled_by) update.cancelled_by = extra.cancelled_by;

  const { error } = await supabase
    .from('bookings')
    .update(update)
    .eq('id', bookingId);

  if (error) throw new Error(error.message);
}

/** Provider or learner marks their side of the session as complete */
export async function confirmCompletion(
  bookingId: string,
  role: 'learner' | 'provider'
): Promise<void> {
  const field = role === 'learner' ? 'learner_confirmed' : 'provider_confirmed';
  const { error } = await supabase
    .from('bookings')
    .update({ [field]: true })
    .eq('id', bookingId);

  if (error) throw new Error(error.message);
}
