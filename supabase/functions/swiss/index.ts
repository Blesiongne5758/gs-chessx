// GS-ChessX — Edge Function: automatic Swiss pairing.
//
// Deploy:  supabase functions deploy swiss
//
// POST /functions/v1/swiss  (Authorization: Bearer <user JWT> or service role key)
//   { "action": "start",  "tournament_id": "..." }                 admin  — close registration, pair round 1
//   { "action": "report", "pairing_id": "...", "result": "1-0" }    admin  — record / correct a result;
//                                                                            auto-pairs the next round or
//                                                                            finishes the tournament
//   { "action": "tick" }                                            cron   — start due Swiss tournaments
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { planStart, planAdvance, validateReport } from '../_shared/swiss.js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// ------------------------------------------------------------------ data access

async function loadState(db: SupabaseClient, tournamentId: string) {
  const [t, parts, pairs] = await Promise.all([
    db.from('tournaments').select('*').eq('id', tournamentId).single(),
    db
      .from('tournament_participants')
      .select('player_id, withdrawn, profile:profiles(rating)')
      .eq('tournament_id', tournamentId),
    db.from('tournament_pairings').select('*').eq('tournament_id', tournamentId),
  ]);
  if (t.error) throw new HttpError(404, 'Turnamen tidak ditemukan.');
  if (parts.error) throw parts.error;
  if (pairs.error) throw pairs.error;
  const participants = (parts.data ?? []).map((p: any) => ({
    player_id: p.player_id,
    withdrawn: p.withdrawn,
    rating: p.profile?.rating ?? 1200,
  }));
  return { tournament: t.data, participants, pairings: pairs.data ?? [] };
}

async function writeStats(db: SupabaseClient, tournamentId: string, stats: any[]) {
  // Per-row UPDATE (not upsert): an upsert would fire the registration trigger.
  const results = await Promise.all(
    stats.map(({ player_id, ...s }) =>
      db.from('tournament_participants').update(s).eq('tournament_id', tournamentId).eq('player_id', player_id),
    ),
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Insert next-round pairings, guarded so concurrent calls can't pair a round twice. */
async function insertRound(db: SupabaseClient, tournamentId: string, rows: any[]) {
  if (rows.length === 0) return true;
  const { error } = await db
    .from('tournament_pairings')
    .insert(rows.map((r) => ({ ...r, tournament_id: tournamentId })));
  if (error) {
    if (error.code === '23505') return false; // another request already paired this round
    throw error;
  }
  return true;
}

// ------------------------------------------------------------------ actions

async function startTournament(db: SupabaseClient, tournamentId: string) {
  const { tournament, participants } = await loadState(db, tournamentId);
  let plan;
  try {
    plan = planStart(tournament, participants);
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }

  // Flip status first, conditionally — closes registration and wins the race against a 2nd start.
  const { data: flipped, error } = await db
    .from('tournaments')
    .update(plan.tournamentPatch)
    .eq('id', tournamentId)
    .eq('status', 'upcoming')
    .select('id');
  if (error) throw error;
  if (!flipped?.length) throw new HttpError(409, 'Turnamen sudah dimulai.');

  // Re-read participants after registration closed so late joiners are included.
  const fresh = await loadState(db, tournamentId);
  const finalPlan = planStart({ ...fresh.tournament, status: 'upcoming' }, fresh.participants);
  if (finalPlan.tournamentPatch.rounds !== plan.tournamentPatch.rounds) {
    await db.from('tournaments').update({ rounds: finalPlan.tournamentPatch.rounds }).eq('id', tournamentId);
  }
  await insertRound(db, tournamentId, finalPlan.newPairings);
  await writeStats(db, tournamentId, finalPlan.participantStats);
  return { round: 1, boards: finalPlan.newPairings.length };
}

async function reportResult(db: SupabaseClient, pairingId: string, result: string) {
  const { data: pairing, error } = await db.from('tournament_pairings').select('*').eq('id', pairingId).single();
  if (error || !pairing) throw new HttpError(404, 'Pairing tidak ditemukan.');

  const { tournament } = await loadState(db, pairing.tournament_id);
  try {
    validateReport(tournament, pairing, result);
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }

  const upd = await db.from('tournament_pairings').update({ result }).eq('id', pairingId);
  if (upd.error) throw upd.error;

  return advance(db, pairing.tournament_id);
}

/** Recompute stats; if the round is complete, pair the next one or finish. */
async function advance(db: SupabaseClient, tournamentId: string) {
  const state = await loadState(db, tournamentId);
  const plan = planAdvance(state.tournament, state.participants, state.pairings);
  let paired = false;

  if (plan.newPairings.length > 0) {
    paired = await insertRound(db, tournamentId, plan.newPairings);
    if (paired) {
      await db
        .from('tournaments')
        .update(plan.tournamentPatch)
        .eq('id', tournamentId)
        .eq('current_round', state.tournament.current_round);
    }
  } else if (plan.tournamentPatch?.status === 'finished') {
    await db
      .from('tournaments')
      .update({ ...plan.tournamentPatch, ends_at: state.tournament.ends_at ?? new Date().toISOString() })
      .eq('id', tournamentId)
      .eq('status', 'running');
  }

  // If another request won the race, its stats write supersedes ours; recompute from DB to be safe.
  const stats = paired || plan.newPairings.length === 0
    ? plan.participantStats
    : planAdvance({ ...state.tournament, status: 'finished' }, state.participants, (await loadState(db, tournamentId)).pairings).participantStats;
  await writeStats(db, tournamentId, stats);

  return {
    round: paired ? state.tournament.current_round + 1 : state.tournament.current_round,
    newRound: paired,
    finished: plan.tournamentPatch?.status === 'finished',
  };
}

async function tick(db: SupabaseClient) {
  const { data, error } = await db
    .from('tournaments')
    .select('id')
    .eq('format', 'swiss')
    .eq('status', 'upcoming')
    .lte('starts_at', new Date().toISOString());
  if (error) throw error;
  const started: string[] = [];
  const skipped: { id: string; reason: string }[] = [];
  for (const { id } of data ?? []) {
    try {
      await startTournament(db, id);
      started.push(id);
    } catch (e) {
      skipped.push({ id, reason: (e as Error).message });
    }
  }
  return { started, skipped };
}

// ------------------------------------------------------------------ auth + router

async function requireAdmin(req: Request, db: SupabaseClient) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Harus login.');
  if (token === SERVICE_ROLE_KEY) return { service: true };

  const userClient = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await userClient.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sesi tidak valid.');

  const { data: profile } = await db.from('profiles').select('is_admin').eq('id', data.user.id).single();
  if (!profile?.is_admin) throw new HttpError(403, 'Hanya admin turnamen yang boleh melakukan ini.');
  return { service: false };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  try {
    const body = await req.json().catch(() => ({}));
    const caller = await requireAdmin(req, db);

    switch (body.action) {
      case 'start':
        if (!body.tournament_id) throw new HttpError(400, 'tournament_id wajib diisi.');
        return json(await startTournament(db, body.tournament_id));
      case 'report':
        if (!body.pairing_id || !body.result) throw new HttpError(400, 'pairing_id dan result wajib diisi.');
        return json(await reportResult(db, body.pairing_id, body.result));
      case 'tick':
        if (!caller.service) throw new HttpError(403, 'Hanya untuk cron (service role).');
        return json(await tick(db));
      default:
        throw new HttpError(400, 'Action tidak dikenal.');
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    console.error(e);
    return json({ error: (e as Error).message ?? 'Internal error' }, status);
  }
});
