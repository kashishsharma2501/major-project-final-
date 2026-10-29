import { supabase } from '@/lib/supabase';

export type TicketCategory = 'booking_issue' | 'account' | 'payment' | 'provider_issue' | 'technical' | 'cancellation' | 'refund' | 'other';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportTicket {
  id: string;
  user_id: string;
  booking_id: string | null;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: string;
  admin_note: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RescheduleRequest {
  id: string;
  booking_id: string;
  requested_by: string;
  proposed_date: string;
  proposed_time: string;
  reason: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  created_at: string;
}

export async function getMyTickets(userId: string): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportTicket[];
}

export async function createTicket(input: {
  user_id: string;
  booking_id?: string;
  category: TicketCategory;
  subject: string;
  description: string;
}): Promise<SupportTicket> {
  const { data, error } = await supabase
    .from('support_tickets')
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as SupportTicket;
}

export async function getAllTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SupportTicket[];
}

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
  adminNote?: string
): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (adminNote !== undefined) update.admin_note = adminNote;
  if (status === 'resolved') update.resolved_at = new Date().toISOString();
  const { error } = await supabase
    .from('support_tickets')
    .update(update)
    .eq('id', ticketId);
  if (error) throw new Error(error.message);
}

export async function createRescheduleRequest(input: {
  booking_id: string;
  requested_by: string;
  proposed_date: string;
  proposed_time: string;
  reason?: string;
}): Promise<RescheduleRequest> {
  const { data, error } = await supabase
    .from('reschedule_requests')
    .insert(input)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RescheduleRequest;
}

export async function getRescheduleRequests(bookingId: string): Promise<RescheduleRequest[]> {
  const { data, error } = await supabase
    .from('reschedule_requests')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as RescheduleRequest[];
}

export async function respondReschedule(
  requestId: string,
  status: 'accepted' | 'rejected'
): Promise<void> {
  const { error } = await supabase
    .from('reschedule_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw new Error(error.message);
}

export async function getBookingStatusHistory(bookingId: string) {
  const { data, error } = await supabase
    .from('booking_status_history')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
