/**
 * Review service — Supabase implementation.
 */
import { supabase } from '@/lib/supabase';
import type { Review } from '@/types';

interface DbReviewRow {
  id: string;
  booking_id: string;
  learner_id: string;
  provider_id: string;
  rating: number;
  comment: string;
  skill_taught: string;
  is_verified: boolean;
  created_at: string;
  learner: { name: string; avatar_url: string | null } | null;
  provider: { profiles: { name: string } | null } | null;
}

function toReview(row: DbReviewRow): Review {
  return {
    id: row.id,
    bookingId: row.booking_id,
    learnerId: row.learner_id,
    learnerName: row.learner?.name ?? 'Unknown',
    learnerAvatar: row.learner?.avatar_url ?? undefined,
    providerId: row.provider_id,
    providerName: row.provider?.profiles?.name ?? 'Unknown',
    rating: row.rating,
    comment: row.comment,
    skillTaught: row.skill_taught,
    createdAt: row.created_at,
    isVerified: row.is_verified,
  };
}

const REVIEW_SELECT = `
  id, booking_id, learner_id, provider_id, rating, comment, skill_taught, is_verified, created_at,
  learner:profiles!reviews_learner_id_fkey(name, avatar_url),
  provider:provider_profiles!reviews_provider_id_fkey(profiles(name))
`.trim();

export async function getReviewsByLearner(learnerId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('learner_id', learnerId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as DbReviewRow[]).map(toReview);
}

export async function getReviewsByProvider(providerProfileId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .eq('provider_id', providerProfileId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as DbReviewRow[]).map(toReview);
}

export async function getAllReviews(): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(REVIEW_SELECT)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as unknown as DbReviewRow[]).map(toReview);
}

export async function submitReview(input: {
  booking_id: string;
  learner_id: string;
  provider_id: string;
  rating: number;
  comment: string;
  skill_taught: string;
}): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .insert(input)
    .select(REVIEW_SELECT)
    .single();
  if (error) throw new Error(error.message);
  return toReview(data as unknown as DbReviewRow);
}

/** Check if a review already exists for a booking */
export async function hasReviewForBooking(bookingId: string): Promise<boolean> {
  const { count } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('booking_id', bookingId);
  return (count ?? 0) > 0;
}
