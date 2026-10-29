/**
 * Payment service — Razorpay Test Mode via Supabase Edge Functions.
 *
 * Flow:
 *   1. createRazorpayOrder()  → calls Edge Function → gets order_id
 *   2. openRazorpayCheckout() → opens Razorpay modal with test card
 *   3. verifyPayment()        → calls Edge Function → verifies HMAC signature
 *                               → records payment in DB via _record_payment()
 *                               → booking.payment_status = 'captured'
 *
 * The Key Secret never leaves the Edge Function.
 * Payment success cannot be faked — signature verification is server-side.
 */

import { supabase } from '@/lib/supabase';

const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL;
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

export interface PaymentResult {
  success: boolean;
  error?: string;
  payment_id?: string;
}

/** Load Razorpay checkout script from CDN if not already present. */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/** Step 1 — Ask Edge Function to create a Razorpay order. */
async function createRazorpayOrder(bookingId: string): Promise<{
  order_id: string;
  amount: number;
  currency: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${FUNCTIONS_URL}/create-razorpay-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ booking_id: bookingId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Could not create payment order');
  }

  return res.json();
}

/** Step 3 — Ask Edge Function to verify signature and record payment. */
async function verifyPayment(params: {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ success: boolean; payment_id?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch(`${FUNCTIONS_URL}/verify-razorpay-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(params),
  });

  return res.json();
}

/**
 * Full payment flow: create order → open checkout → verify → return result.
 *
 * @param bookingId  The booking being paid for
 * @param amount     Amount in rupees (displayed to user)
 * @param providerName  Shown in checkout modal
 * @param skillName     Shown in checkout modal
 * @param userEmail  Pre-filled in checkout
 * @param userName   Pre-filled in checkout
 */
export async function initiatePayment(params: {
  bookingId: string;
  amount: number;
  providerName: string;
  skillName: string;
  userEmail: string;
  userName: string;
}): Promise<PaymentResult> {
  // 1. Load Razorpay SDK
  const sdkLoaded = await loadRazorpayScript();
  if (!sdkLoaded) {
    return { success: false, error: 'Could not load Razorpay checkout. Check your internet connection.' };
  }

  if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.startsWith('PASTE_')) {
    return { success: false, error: 'Razorpay Key ID not configured. Add VITE_RAZORPAY_KEY_ID to .env.local.' };
  }

  // 2. Create order via Edge Function
  let order: { order_id: string; amount: number; currency: string };
  try {
    order = await createRazorpayOrder(params.bookingId);
  } catch (e: any) {
    return { success: false, error: e.message ?? 'Could not create payment order' };
  }

  // 3. Open Razorpay checkout — returns a Promise resolved by handler or rejected by dismiss
  return new Promise((resolve) => {
    const rzp = new window.Razorpay({
      key: RAZORPAY_KEY_ID,
      amount: order.amount,        // paise (set by Edge Function)
      currency: order.currency,
      order_id: order.order_id,
      name: 'SkillShare Local',
      description: `${params.skillName} with ${params.providerName}`,
      prefill: {
        name: params.userName,
        email: params.userEmail,
      },
      theme: { color: '#4F46E5' },
      modal: {
        ondismiss: () => resolve({ success: false, error: 'Payment cancelled by user' }),
      },
      handler: async (response) => {
        // 4. Verify signature server-side
        try {
          const result = await verifyPayment({
            booking_id: params.bookingId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (result.success) {
            resolve({ success: true, payment_id: result.payment_id });
          } else {
            resolve({ success: false, error: result.error ?? 'Payment verification failed' });
          }
        } catch (e: any) {
          resolve({ success: false, error: e.message ?? 'Verification error' });
        }
      },
    });

    rzp.open();
  });
}

/** Fetch payment record for a booking (for status display). */
export async function getPaymentForBooking(bookingId: string) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, status, amount_paise, razorpay_payment_id, is_test_mode, captured_at, created_at')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** Submit a refund request (learner-initiated, goes to admin queue). */
export async function requestRefund(params: {
  payment_id: string;
  booking_id: string;
  requested_by: string;
  reason: string;
  amount_paise: number;
}) {
  const { error } = await supabase
    .from('refund_requests')
    .insert(params);
  if (error) throw new Error(error.message);
}

/** Admin: get all refund requests. */
export async function getAllRefundRequests() {
  const { data, error } = await supabase
    .from('refund_requests')
    .select('*, payments(razorpay_payment_id, amount_paise), bookings(skill_name, booking_date)')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
