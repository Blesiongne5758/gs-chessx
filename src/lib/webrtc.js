import { supabase } from './supabaseClient';

const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

let turnNoticeLogged = false;

function logTurnFallback() {
  if (turnNoticeLogged) return;
  turnNoticeLogged = true;
  console.info('[WebRTC] Using fallback STUN/TURN servers.');
}

/** Fetches short-lived TURN credentials from the authenticated Edge Function, or falls back to public STUN/TURN relays. */
export async function getIceServers() {
  if (!navigator.onLine) {
    logTurnFallback();
    return FALLBACK_ICE_SERVERS;
  }
  try {
    const { data, error } = await supabase.functions.invoke('turn-credentials', { method: 'GET' });
    if (error) throw error;
    if (!Array.isArray(data?.iceServers) || data.iceServers.length === 0) {
      logTurnFallback();
      return FALLBACK_ICE_SERVERS;
    }
    if (!data.turnConfigured) {
      // Edge function returned STUN only; merge with fallback TURN relay for firewall traversal
      const turnRelays = FALLBACK_ICE_SERVERS.filter((s) => s.username);
      return [...data.iceServers, ...turnRelays];
    }
    return data.iceServers;
  } catch {
    logTurnFallback();
    return FALLBACK_ICE_SERVERS;
  }
}
