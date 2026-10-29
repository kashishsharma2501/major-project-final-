/**
 * create-razorpay-order — Supabase Edge Function
 *
 * Creates a Razorpay order and records the order ID on the booking row.
 * The Razorpay KEY_SECRET is read from Supabase Edge Function secrets
 * (set via: supabase secrets set RAZORPAY_KEY_SECRET=rzp_test_xxx)
 * and never exposed to the browser.
 *
 * Request (POST, authenticated):
 *   { booking_id: string }
 *
 * Response:
 *   { order_id: string; amount: number; currency: string; key_id: string }
 *
 * Security:
 *   - Caller must be authenticated (JWT validated by Supabase)
 *   - Caller must be the learner on the booking
 *   - Booking must be in 'pending' or 'accepted' status
 *   - order_id is recorded on the booking row (idempotent upsert)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const RAZORPAY_KEY_ID     = Deno.env.get('RAZORPAY_KEY_ID')     ?? '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') ?? '';
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')        ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);

    // 2. Parse and validate request body
    const body = await req.json().catch(() => ({}));
    const { booking_id } = body;
    if (!booking_id) return json({ error: 'booking_id is required' }, 400);

    // 3. Fetch booking — verify caller is the learner
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, learner_id, provider_id, price, status, razorpay_order_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) return json({ error: 'Booking not found' }, 404);
    if (booking.learner_id !== user.id) return json({ error: 'Forbidden: not your booking' }, 403);
    if (!['pending', 'accepted'].includes(booking.status)) {
      return json({ error: `Cannot pay for a booking with status: ${booking.status}` }, 400);
    }

    // 4. Idempotency: return existing order if already created
    if (booking.razorpay_order_id) {
      return json({
        order_id: booking.razorpay_order_id,
        amount: Math.round(booking.price * 100),
        currency: 'INR',
        key_id: RAZORPAY_KEY_ID,
      });
    }

    // 5. Create Razorpay order via REST API (no SDK needed)
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const razorpayRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(booking.price * 100),  // paise
        currency: 'INR',
        receipt: `ssl_${booking_id.slice(0, 20)}`,
        notes: {
          booking_id,
          learner_id: user.id,
          provider_id: booking.provider_id,
        },
      }),
    });

    if (!razorpayRes.ok) {
      const errBody = await razorpayRes.text();
      console.error('Razorpay error:', errBody);
      return json({ error: 'Could not create Razorpay order', detail: errBody }, 502);
    }

    const order = await razorpayRes.json();

    // 6. Persist order_id on booking row (idempotent)
    await supabase
      .from('bookings')
      .update({ razorpay_order_id: order.id, payment_required: true })
      .eq('id', booking_id);

    return json({
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID,
    });

  } catch (err) {
    console.error('create-razorpay-order error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
