/**
 * verify-razorpay-payment — Supabase Edge Function
 *
 * Verifies the Razorpay HMAC-SHA256 signature returned after checkout
 * and records the payment using _record_payment() (SECURITY DEFINER, no public grant).
 *
 * Uses Web Crypto API (SubtleCrypto) — no external dependencies required.
 * Compatible with Deno Deploy / Supabase Edge Functions natively.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_SECRET  = Deno.env.get('RAZORPAY_KEY_SECRET')       ?? '';
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Compute HMAC-SHA256 using the native SubtleCrypto API.
 * Returns hex-encoded digest.
 */
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Missing Authorization header' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (authError || !user) return json({ success: false, error: 'Unauthorized' }, 401);

    // 2. Parse request
    const body = await req.json().catch(() => ({}));
    const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!booking_id || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return json({ success: false, error: 'Missing required fields' }, 400);
    }

    // 3. Fetch booking — verify caller is the learner
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, learner_id, provider_id, price, status, razorpay_order_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) return json({ success: false, error: 'Booking not found' }, 404);
    if (booking.learner_id !== user.id) return json({ success: false, error: 'Forbidden' }, 403);

    // 4. Verify the stored order_id matches (prevents order substitution attacks)
    if (booking.razorpay_order_id !== razorpay_order_id) {
      return json({ success: false, error: 'Order ID mismatch — possible tampering detected' }, 400);
    }

    // 5. Verify HMAC-SHA256 signature using SubtleCrypto (no external deps)
    //    Razorpay spec: HMAC_SHA256(key=KEY_SECRET, data="order_id|payment_id")
    const expectedSig = await hmacSha256(
      RAZORPAY_KEY_SECRET,
      `${razorpay_order_id}|${razorpay_payment_id}`
    );

    if (expectedSig !== razorpay_signature) {
      console.error('Signature mismatch', {
        expected: expectedSig,
        received: razorpay_signature,
      });
      return json({ success: false, error: 'Payment signature verification failed' }, 400);
    }

    // 6. Record payment via SECURITY DEFINER function (clients cannot call this directly)
    const { error: recordError } = await supabase.rpc('_record_payment', {
      p_booking_id:          booking_id,
      p_learner_id:          booking.learner_id,
      p_provider_id:         booking.provider_id,
      p_amount_paise:        Math.round(booking.price * 100),
      p_razorpay_order_id:   razorpay_order_id,
      p_razorpay_payment_id: razorpay_payment_id,
      p_razorpay_signature:  razorpay_signature,
      p_status:              'captured',
    });

    if (recordError) {
      console.error('_record_payment error:', recordError);
      return json({ success: false, error: 'Could not record payment: ' + recordError.message }, 500);
    }

    console.log(`Payment verified and recorded: ${razorpay_payment_id} for booking ${booking_id}`);
    return json({ success: true, payment_id: razorpay_payment_id });

  } catch (err) {
    console.error('verify-razorpay-payment unhandled error:', err);
    return json({ success: false, error: 'Internal server error' }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
