import { supabase } from './supabaseClient';
import toast from 'react-hot-toast';

const FALLBACK_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
];
let turnWarningShown = false;

function warnTurnUnavailable() {
  if (turnWarningShown) return;
  turnWarningShown = true;
  toast('Server TURN belum dikonfigurasi. Panggilan mungkin gagal pada NAT/firewall ketat.');
}

/** Fetches short-lived TURN credentials from the authenticated Edge Function. */
export async function getIceServers() {
  if (!navigator.onLine) { warnTurnUnavailable(); return FALLBACK_ICE_SERVERS; }
  try {
    const { data, error } = await supabase.functions.invoke('turn-credentials', { method: 'GET' });
    if (error) throw error;
    if (!Array.isArray(data?.iceServers) || data.iceServers.length === 0) { warnTurnUnavailable(); return FALLBACK_ICE_SERVERS; }
    if (!data.turnConfigured) warnTurnUnavailable();
    return data.iceServers;
  } catch {
    // Calls can still succeed peer-to-peer using STUN when TURN has not been
    // configured; restrictive NAT/firewalls require a deployed TURN relay.
    warnTurnUnavailable();
    return FALLBACK_ICE_SERVERS;
  }
}
