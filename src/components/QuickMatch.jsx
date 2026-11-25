import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Avatar from './Avatar';
import toast from 'react-hot-toast';
import TopNav, { FooterNav } from './TopNav';
import { addNotification } from '../lib/notifications';

const PROFILE_SELECT = 'id, username, avatar_url, rating';

export default function QuickMatch({
  user,
  timeControl,
  onMatched,
  onBack,
  onNavigate,
  onEditProfile,
  onLogout,
  onOpenLeaderboard,
  onOpenHistory,
}) {
  const [friends, setFriends] = useState([]);
  const [online, setOnline] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('players'); // 'players' | 'spectate'
  const [liveMatches, setLiveMatches] = useState([]);
  const [autoPairing, setAutoPairing] = useState(false);
  const [queueSeconds, setQueueSeconds] = useState(0);

  const channelRef = useRef(null);
  const profileRef = useRef(null);
  const tcRef = useRef(timeControl);
  const incomingRef = useRef(null);
  const autoPairingRef = useRef(autoPairing);
  const userId = user?.id;

  useEffect(() => { tcRef.current = timeControl; }, [timeControl]);
  useEffect(() => { incomingRef.current = incoming; }, [incoming]);
  useEffect(() => { autoPairingRef.current = autoPairing; }, [autoPairing]);

  // Queue timer
  useEffect(() => {
    if (!autoPairing) {
      setQueueSeconds(0);
      return undefined;
    }
    const interval = setInterval(() => {
      setQueueSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [autoPairing]);

  useEffect(() => {
    if (!userId || user.isGuest) return undefined;
    let active = true;
    let channel;

    async function initialize() {
      const [{ data: p }, { data: rows, error: friendError }] = await Promise.all([
        supabase.from('profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle(),
        supabase.from('friendships').select('requester_id, addressee_id, requester:profiles!requester_id(id, username, avatar_url, rating), addressee:profiles!addressee_id(id, username, avatar_url, rating)').or(`requester_id.eq.${userId},addressee_id.eq.${userId}`).eq('status', 'accepted'),
      ]);
      if (!active) return;
      if (friendError) setError('Could not load friends list. Check database configuration.');
      const me = p || { id: userId, username: user.email?.split('@')[0] || 'Player', avatar_url: null, rating: 1200 };
      profileRef.current = me;
      setFriends((rows || []).map((r) => (r.requester_id === userId ? r.addressee : r.requester)).filter(Boolean));

      channel = supabase.channel('quick-match-lobby', {
        config: { private: true, presence: { key: userId }, broadcast: { self: false } },
      });
      channelRef.current = channel;

      channel.on('presence', { event: 'sync' }, () => {
        const current = channel.presenceState();
        const people = [...new Map(
          Object.values(current)
            .flat()
            .filter((x) => x.id !== userId)
            .map((player) => [player.id, player]),
        ).values()];
        if (active) setOnline(people);

        // Check for Auto-Pairing match
        if (autoPairingRef.current && me) {
          const autoCandidates = people.filter(
            (other) =>
              other.status === 'searching_auto' &&
              other.id !== userId &&
              (other.timeControl === tcRef.current.label || !other.timeControl)
          );

          if (autoCandidates.length > 0) {
            // Sort by closest rating
            autoCandidates.sort((a, b) => Math.abs((a.rating || 1200) - me.rating) - Math.abs((b.rating || 1200) - me.rating));
            const opponent = autoCandidates[0];

            // Deterministic host: lower UUID creates room
            if (userId < opponent.id) {
              const roomId = crypto.randomUUID();
              const isMeWhite = Math.random() < 0.5;
              const whiteId = isMeWhite ? userId : opponent.id;
              const blackId = isMeWhite ? opponent.id : userId;

              supabase.from('quick_matches').insert({
                id: roomId,
                white_id: whiteId,
                black_id: blackId,
                time_control: tcRef.current.label || 'Rapid (10+0)',
              }).then(() => {
                channel.send({
                  type: 'broadcast',
                  event: 'auto-pair-matched',
                  payload: {
                    roomId,
                    whiteId,
                    blackId,
                    whitePlayer: isMeWhite ? me : opponent,
                    blackPlayer: isMeWhite ? opponent : me,
                    timeControl: tcRef.current,
                  },
                });
                onMatched({
                  roomId,
                  opponent,
                  color: isMeWhite ? 'white' : 'black',
                  timeControl: tcRef.current,
                });
              });
            }
          }
        }
      });

      channel.on('broadcast', { event: 'auto-pair-matched' }, ({ payload }) => {
        if (!active || (payload.whiteId !== userId && payload.blackId !== userId)) return;
        const isWhite = payload.whiteId === userId;
        const opp = isWhite ? payload.blackPlayer : payload.whitePlayer;
        toast.success(`Matched with ${opp?.username || 'Opponent'}! Game starting…`);
        onMatched({
          roomId: payload.roomId,
          opponent: opp,
          color: isWhite ? 'white' : 'black',
          timeControl: payload.timeControl,
        });
      });

      channel.on('broadcast', { event: 'challenge' }, ({ payload }) => {
        if (!active || payload.from === userId || (payload.to && payload.to !== userId)) return;
        setIncoming(payload);
        toast(`${payload.fromName} challenged you to a chess game.`);
        addNotification(userId, {
          title: '⚔️ Match Challenge',
          message: `${payload.fromName} challenged you to a ${payload.timeControl?.label || 'chess'} match.`,
          type: 'challenge',
          data: payload,
        });
      });

      channel.on('broadcast', { event: 'match-response' }, ({ payload }) => {
        if (!active || payload.to !== userId) return;
        if (payload.accepted) {
          onMatched({ roomId: payload.roomId, opponent: payload.player, color: 'white', timeControl: payload.timeControl });
        } else {
          setStatus('searching');
          toast(`${payload.player?.username || 'Player'} declined the challenge.`);
        }
      });

      channel.subscribe(async (state) => {
        if (state !== 'SUBSCRIBED' || !active) return;
        await channel.track({
          ...me,
          id: userId,
          status: autoPairingRef.current ? 'searching_auto' : 'available',
          timeControl: tcRef.current.label,
          updatedAt: new Date().toISOString(),
        });
        if (active) setStatus('searching');
      });
    }

    initialize();
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, user?.isGuest, user?.email, onMatched]);

  // Update presence when autoPairing state toggles
  useEffect(() => {
    if (!channelRef.current || !profileRef.current) return;
    channelRef.current.track({
      ...profileRef.current,
      id: userId,
      status: autoPairing ? 'searching_auto' : 'available',
      timeControl: tcRef.current.label,
      updatedAt: new Date().toISOString(),
    });
  }, [autoPairing, userId]);

  // Fetch active matches for spectator mode
  useEffect(() => {
    if (activeTab !== 'spectate') return undefined;
    let alive = true;

    async function loadMatches() {
      const { data } = await supabase
        .from('games')
        .select('id, white_id, black_id, time_control, fen, pgn, status, created_at, white:profiles!white_id(username, avatar_url, rating), black:profiles!black_id(username, avatar_url, rating)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (alive) {
        setLiveMatches(
          (data || []).map((g) => ({
            id: g.id,
            white_name: g.white?.username || 'White',
            black_name: g.black?.username || 'Black',
            white_avatar: g.white?.avatar_url,
            black_avatar: g.black?.avatar_url,
            white_rating: g.white?.rating || 1200,
            black_rating: g.black?.rating || 1200,
            time_control: g.time_control,
          }))
        );
      }
    }

    loadMatches();
    const interval = setInterval(loadMatches, 8000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [activeTab]);

  async function challenge(player) {
    const channel = channelRef.current;
    if (!channel || !profileRef.current) return;
    const payload = {
      id: crypto.randomUUID(),
      from: userId,
      fromName: profileRef.current.username,
      player: profileRef.current,
      to: player?.id || null,
      targetName: player?.username || null,
      timeControl: tcRef.current,
      createdAt: Date.now(),
    };
    setStatus(player ? 'inviting' : 'searching');
    const { error: sendError } = await channel.send({ type: 'broadcast', event: 'challenge', payload });
    if (sendError) {
      toast.error('Could not send challenge.');
      setStatus('searching');
    } else if (player) {
      toast(`Challenge sent to ${player.username}. Waiting for response…`);
    } else {
      toast('You are online. Waiting for a Quick Match opponent…');
    }
  }

  async function answer(accepted) {
    const target = incomingRef.current;
    if (!target || !channelRef.current || !profileRef.current) return;
    setIncoming(null);
    const roomId = target.id;
    if (accepted) {
      const { error: matchError } = await supabase.from('quick_matches').insert({
        id: roomId,
        white_id: target.from,
        black_id: userId,
        time_control: target.timeControl?.label || 'Rapid (10+0)',
      });
      if (matchError) {
        toast.error(
          matchError.code === '23505'
            ? 'This challenge has already been accepted by another player.'
            : `Could not create match room: ${matchError.message}`
        );
        return;
      }
      await channelRef.current.send({
        type: 'broadcast',
        event: 'match-response',
        payload: { to: target.from, accepted: true, roomId, player: profileRef.current, timeControl: target.timeControl },
      });
      onMatched({ roomId, opponent: target.player, color: 'black', timeControl: target.timeControl });
    } else {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'match-response',
        payload: { to: target.from, accepted: false, player: profileRef.current },
      });
    }
  }

  function spectateMatch(match) {
    onMatched({
      roomId: match.id,
      isSpectator: true,
      opponent: { username: match.black_name },
      whitePlayer: match.white_name,
      blackPlayer: match.black_name,
      timeControl: { label: match.time_control || 'Rapid (10+0)' },
    });
  }

  const friendIds = new Set(friends.map((x) => x.id));
  const unavailableMessage = !userId || user.isGuest ? 'Quick Match requires a registered account and Supabase connection.' : '';
  const onlineFriends = online.filter((x) => friendIds.has(x.id));
  const onlineOthers = online.filter((x) => !friendIds.has(x.id));

  const playerCard = (p) => (
    <div key={p.id} className="flex items-center gap-3 rounded-xl bg-slate/80 p-3 hover:bg-slate transition">
      <Avatar name={p.username} url={p.avatar_url} size="h-9 w-9 text-sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">{p.username}</p>
        <p className="text-xs text-gray-400">
          Rating <span className="text-gold font-bold">{p.rating ?? 1200}</span> · {p.status === 'searching_auto' ? '⚡ In Queue' : 'Online'}
        </p>
      </div>
      <button
        onClick={() => challenge(p)}
        className="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-obsidian hover:bg-champagne transition shadow-md shadow-gold/20"
      >
        Challenge
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col">
      <TopNav
        active="quick-match"
        onNavigate={onNavigate}
        profile={{ username: user?.email?.split('@')[0] || 'Player' }}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
        isAdmin={user?.isGuest}
        user={user}
        onOpenLeaderboard={onOpenLeaderboard}
        onOpenHistory={onOpenHistory}
      />

      <main className="px-4 py-8 pb-24 sm:pb-20 flex-1">
        <div className="mx-auto max-w-4xl">
          <button onClick={onBack} className="mb-5 text-sm text-gray-300 hover:text-white transition">
            ← Back to Lobby
          </button>

          <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
            {/* Left: Queue & Auto-Pairing */}
            <section className="rounded-2xl border border-gold/30 bg-graphite p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[.25em] text-gold font-bold">Multiplayer Matchmaking</p>
                  <span className="rounded bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-gold">
                    Glicko-2 Rated
                  </span>
                </div>
                <h1 className="mt-2 font-cinzel text-3xl text-white font-bold">Find Opponent</h1>
                <p className="mt-2 text-sm text-gray-400">
                  Auto-pairing matches you with players near your Glicko-2 rating automatically.
                </p>

                <div className="mt-5 rounded-xl bg-slate p-4 border border-white/5">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Time Control</p>
                  <p className="mt-1 font-bold text-gold text-lg">{timeControl?.label || 'Rapid (10+0)'}</p>
                </div>

                <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 p-4 bg-white/[0.02]">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      autoPairing
                        ? 'bg-emerald-400 animate-ping'
                        : status === 'searching'
                        ? 'bg-amber-400'
                        : 'bg-gray-500'
                    }`}
                  />
                  <div>
                    <p className="font-semibold text-sm">
                      {autoPairing
                        ? `Auto-Pairing Active (${queueSeconds}s)`
                        : status === 'connecting'
                        ? 'Connecting…'
                        : status === 'inviting'
                        ? 'Invitation sent'
                        : 'Lobby Connected'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {autoPairing
                        ? `Searching for ±${Math.min(350, 150 + Math.floor(queueSeconds / 5) * 50)} ELO match…`
                        : `${online.length} other players online`}
                    </p>
                  </div>
                </div>

                {(error || unavailableMessage) && (
                  <p role="alert" className="mt-3 text-sm text-amber-300">
                    {error || unavailableMessage}
                  </p>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {/* Auto-Pair Primary Button */}
                <button
                  onClick={() => setAutoPairing((prev) => !prev)}
                  disabled={status === 'connecting' || Boolean(unavailableMessage)}
                  className={`w-full rounded-xl py-3.5 font-bold text-sm transition shadow-lg ${
                    autoPairing
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/30'
                      : 'bg-gradient-to-r from-gold via-champagne to-gold text-obsidian shadow-gold/20 hover:brightness-110'
                  }`}
                >
                  {autoPairing ? '✕ Cancel Auto-Pairing' : '⚡ Auto-Pair (Competitive Queue)'}
                </button>

                {/* Broadcast Challenge Button */}
                {!autoPairing && (
                  <button
                    onClick={() => challenge(null)}
                    disabled={status === 'connecting' || Boolean(unavailableMessage)}
                    className="w-full rounded-xl border border-gold/40 bg-white/5 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition"
                  >
                    Broadcast Open Challenge to Lobby
                  </button>
                )}
              </div>
            </section>

            {/* Right: Tabs (Online Players & Spectator Mode) */}
            <section className="space-y-4 rounded-2xl border border-gold/20 bg-graphite p-5 flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('players')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      activeTab === 'players'
                        ? 'bg-gold text-obsidian'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    👥 Online Players ({online.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('spectate')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 ${
                      activeTab === 'spectate'
                        ? 'bg-gold text-obsidian'
                        : 'bg-white/5 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>👁️ Watch Live</span>
                    {liveMatches.length > 0 && (
                      <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] text-white">
                        {liveMatches.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {incoming && (
                <div role="dialog" aria-label="Incoming challenge" className="rounded-xl border border-gold bg-gold/10 p-4 animate-bounce-once">
                  <p className="font-semibold text-gold">⚔️ {incoming.fromName} challenged you!</p>
                  <p className="mt-1 text-xs text-gray-300">Time control: {incoming.timeControl?.label || 'Rapid (10+0)'}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => answer(true)}
                      className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-obsidian hover:bg-champagne transition shadow-md shadow-gold/25"
                    >
                      Accept &amp; Play
                    </button>
                    <button
                      onClick={() => answer(false)}
                      className="rounded-lg bg-slate px-4 py-2 text-sm hover:bg-slate/80 transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'players' ? (
                <div className="space-y-4 flex-1 overflow-y-auto">
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Friends ({onlineFriends.length})
                    </h3>
                    <div className="space-y-2">
                      {onlineFriends.length ? (
                        onlineFriends.map(playerCard)
                      ) : (
                        <p className="rounded-xl bg-slate/40 p-3 text-xs text-gray-500">
                          Online friends will appear here.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Community Players ({onlineOthers.length})
                    </h3>
                    <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {onlineOthers.length ? (
                        onlineOthers.map(playerCard)
                      ) : (
                        <p className="rounded-xl bg-slate/40 p-3 text-xs text-gray-500">
                          No other players currently searching. Start auto-pairing to match!
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Spectator Tab */
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between text-xs text-gray-400 pb-2">
                    <span>Live matches currently ongoing</span>
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Live Feed
                    </span>
                  </div>

                  {liveMatches.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-400">
                      <span className="text-3xl block mb-2 opacity-50">♟️</span>
                      No active multiplayer games to spectate right now.
                    </div>
                  ) : (
                    liveMatches.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate/80 border border-white/5 hover:border-gold/40 transition"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <span>♔ {m.white_name}</span>
                            <span className="text-xs text-gold">vs</span>
                            <span>♚ {m.black_name}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {m.time_control || 'Rapid (10+0)'} · {m.white_rating} vs {m.black_rating} ELO
                          </div>
                        </div>

                        <button
                          onClick={() => spectateMatch(m)}
                          className="rounded-lg bg-gold/15 border border-gold/40 px-3 py-1.5 text-xs font-bold text-gold hover:bg-gold hover:text-obsidian transition flex items-center gap-1"
                        >
                          <span>👁️</span> Spectate
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <FooterNav active="quick-match" onNavigate={onNavigate} onEditProfile={onEditProfile} />
    </div>
  );
}
