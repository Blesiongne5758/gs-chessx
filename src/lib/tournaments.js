import { supabase } from './supabaseClient';
import { loadGuestProfile } from './profile';

export const FORMAT_LABEL = { swiss: 'Swiss', knockout: 'Knockout', arena: 'Arena' };
export const FORMAT_DESC = {
  swiss: 'Lawan dipasangkan berdasarkan skor setiap ronde.',
  knockout: 'Sistem gugur — kalah sekali langsung tersingkir.',
  arena: 'Main sebanyak mungkin dalam waktu yang ditentukan.',
};

// ---------------- Demo data (guest mode / Supabase not configured) ----------------
const DEMO_KEY = 'gs-chessx-demo-tournaments-joined';
const DEMO_NAMES = [
  'ChessKing99', 'QueenSlayer', 'KudaHitam', 'BentengDepok', 'PionRebel', 'GM_Nusantara',
  'SkakMatLuh', 'BishopBandung', 'Garuda_Rook', 'AnarchyKnight', 'HolyPaladin', 'Rapid_Rina',
];
const t0 = Date.now();
const H = 3600_000;

function demoPlayers(n, seed, withScores) {
  return Array.from({ length: n }, (_, i) => {
    const name = DEMO_NAMES[(i + seed) % DEMO_NAMES.length] + (i >= DEMO_NAMES.length ? `_${i}` : '');
    const games = withScores ? 3 + ((i * 7 + seed) % 4) : 0;
    const wins = withScores ? Math.max(0, games - ((i + seed) % 4)) : 0;
    const draws = withScores ? (i % 2) : 0;
    const losses = Math.max(0, games - wins - draws);
    return {
      player: { id: `demo-${seed}-${i}`, username: name, avatar_url: null, rating: 2400 - i * 37 - seed * 11 },
      score: wins + draws * 0.5,
      wins,
      draws,
      losses,
      joined_at: new Date(t0 - (n - i) * 60_000).toISOString(),
    };
  });
}

const DEMO = [
  {
    id: 'demo-1', name: 'Holy Kingdom Blitz Arena', format: 'arena', status: 'upcoming', time_control: '3+2',
    max_players: 128, rounds: null, prize_pool: '5.000 Gems', is_pro_only: false,
    description: 'Arena 60 menit — main sebanyak mungkin, setiap kemenangan beruntun dapat bonus poin.',
    starts_at: new Date(t0 + 2.25 * H).toISOString(), ends_at: new Date(t0 + 3.25 * H).toISOString(),
    _players: demoPlayers(12, 0, false),
  },
  {
    id: 'demo-2', name: 'Anarchy Rebellion Swiss', format: 'swiss', status: 'upcoming', time_control: '10+0',
    max_players: 64, rounds: 7, prize_pool: 'Skin Eksklusif + 3.000 Gems', is_pro_only: false,
    description: 'Swiss 7 ronde untuk semua level. Pasangan ditentukan berdasarkan skor.',
    starts_at: new Date(t0 + 24 * H).toISOString(), ends_at: new Date(t0 + 28 * H).toISOString(),
    _players: demoPlayers(8, 3, false),
  },
  {
    id: 'demo-3', name: 'Grandmaster Knockout', format: 'knockout', status: 'upcoming', time_control: '5+3',
    max_players: 32, rounds: 5, prize_pool: 'Pro 1 Tahun', is_pro_only: true,
    description: 'Sistem gugur 32 pemain. Kalah sekali langsung tersingkir.',
    starts_at: new Date(t0 + 72 * H).toISOString(), ends_at: new Date(t0 + 77 * H).toISOString(),
    _players: demoPlayers(5, 5, false),
  },
  {
    id: 'demo-4', name: 'Bullet Mayhem', format: 'arena', status: 'running', time_control: '1+0',
    max_players: 256, rounds: null, prize_pool: '1.000 Gems', is_pro_only: false,
    description: 'Arena bullet 30 menit. Cepat, brutal, menyenangkan.',
    starts_at: new Date(t0 - 10 * 60_000).toISOString(), ends_at: new Date(t0 + 20 * 60_000).toISOString(),
    _players: demoPlayers(12, 1, true),
  },
  {
    id: 'demo-5', name: 'Weekly Rapid Swiss #47', format: 'swiss', status: 'finished', time_control: '10+5',
    max_players: 64, rounds: 5, prize_pool: '2.000 Gems', is_pro_only: false,
    description: 'Swiss mingguan 5 ronde.',
    starts_at: new Date(t0 - 72 * H).toISOString(), ends_at: new Date(t0 - 69 * H).toISOString(),
    _players: demoPlayers(10, 2, true),
  },
];

function demoJoined() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DEMO_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveDemoJoined(set) {
  localStorage.setItem(DEMO_KEY, JSON.stringify([...set]));
}

function sortStandings(rows) {
  return [...rows].sort((a, b) => b.score - a.score || (b.player?.rating ?? 0) - (a.player?.rating ?? 0));
}

// ---------------- Public API ----------------

/** Returns tournaments with `player_count` and `joined` (whether the current user is registered). */
export async function fetchTournaments(user) {
  if (user.isGuest) {
    const joined = demoJoined();
    return DEMO.map(({ _players, ...t }) => ({
      ...t,
      player_count: _players.length + (joined.has(t.id) ? 1 : 0),
      joined: joined.has(t.id),
    }));
  }

  const [{ data, error }, { data: mine, error: mineErr }] = await Promise.all([
    supabase.from('tournaments').select('*, tournament_participants(count)').order('starts_at', { ascending: true }),
    supabase.from('tournament_participants').select('tournament_id').eq('player_id', user.id),
  ]);
  if (error) throw error;
  if (mineErr) throw mineErr;

  const joined = new Set((mine || []).map((r) => r.tournament_id));
  return (data || []).map(({ tournament_participants: tp, ...t }) => ({
    ...t,
    player_count: tp?.[0]?.count ?? 0,
    joined: joined.has(t.id),
  }));
}

export async function fetchStandings(user, tournamentId) {
  if (user.isGuest) {
    const t = DEMO.find((d) => d.id === tournamentId);
    if (!t) return [];
    const rows = [...t._players];
    if (demoJoined().has(tournamentId)) {
      const g = loadGuestProfile();
      rows.push({
        player: { id: 'guest', username: g.username, avatar_url: g.avatar_url, rating: g.rating },
        score: 0, wins: 0, draws: 0, losses: 0, joined_at: new Date().toISOString(),
      });
    }
    return sortStandings(rows);
  }

  const { data, error } = await supabase
    .from('tournament_participants')
    .select('score, wins, draws, losses, joined_at, player:profiles(id, username, avatar_url, rating)')
    .eq('tournament_id', tournamentId);
  if (error) throw error;
  return sortStandings(data || []);
}

export async function joinTournament(user, tournament) {
  if (tournament.status !== 'upcoming') throw new Error('Pendaftaran sudah ditutup.');
  if (tournament.player_count >= tournament.max_players) throw new Error('Turnamen sudah penuh.');

  if (user.isGuest) {
    if (tournament.is_pro_only) throw new Error('Turnamen ini khusus pemain Pro.');
    const set = demoJoined();
    set.add(tournament.id);
    saveDemoJoined(set);
    return;
  }

  const { error } = await supabase
    .from('tournament_participants')
    .insert({ tournament_id: tournament.id, player_id: user.id });
  if (error) {
    if (error.code === '23505') throw new Error('Anda sudah terdaftar di turnamen ini.');
    throw new Error(error.message);
  }
}

export async function leaveTournament(user, tournament) {
  if (tournament.status !== 'upcoming') throw new Error('Tidak bisa batal setelah turnamen dimulai.');

  if (user.isGuest) {
    const set = demoJoined();
    set.delete(tournament.id);
    saveDemoJoined(set);
    return;
  }

  const { error } = await supabase
    .from('tournament_participants')
    .delete()
    .eq('tournament_id', tournament.id)
    .eq('player_id', user.id);
  if (error) throw new Error(error.message);
}

/** Subscribe to participant/tournament changes. Returns an unsubscribe function. */
export function subscribeTournaments(user, onChange) {
  if (user.isGuest) return () => {};
  const channel = supabase
    .channel('tournaments-page')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_participants' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, onChange)
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ---------------- Formatting helpers ----------------
export function formatCountdown(ms) {
  if (ms <= 0) return 'Segera dimulai';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} hari ${h} jam`;
  if (h > 0) return `${h} jam ${m} mnt`;
  return `${m} mnt ${sec} dtk`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('id-ID', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}
