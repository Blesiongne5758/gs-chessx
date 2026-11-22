import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store, max-age=0',
};
const stunServers = [{ urls: 'stun:stun.l.google.com:19302' }];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const authorization = request.headers.get('Authorization');
  const jwt = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY');
  if (!jwt || !supabaseUrl || !anonKey) return json({ error: 'Authentication required' }, 401);

  const supabase = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return json({ error: 'Invalid or expired session' }, 401);

  const urls = (Deno.env.get('TURN_URLS') || '')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => /^(turn|turns):/i.test(url));
  const sharedSecret = Deno.env.get('TURN_SHARED_SECRET');
  const iceServers: RTCIceServer[] = [...stunServers];
  let expiresAt: number | null = null;

  if (urls.length && sharedSecret) {
    expiresAt = Math.floor(Date.now() / 1000) + 60 * 60;
    const username = `${expiresAt}:${user.id}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(sharedSecret),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(username));
    const credential = btoa(String.fromCharCode(...new Uint8Array(signature)));
    iceServers.push({ urls, username, credential, credentialType: 'password' });
  }

  return json({ iceServers, turnConfigured: Boolean(urls.length && sharedSecret), expiresAt });
});
