import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Avatar from './Avatar';
import toast from 'react-hot-toast';
import TopNav, { FooterNav } from './TopNav';

const PROFILE_SELECT = 'id, username, avatar_url, rating';
export default function QuickMatch({ user, timeControl, onMatched, onBack, onNavigate, onEditProfile, onLogout }) {
  const [friends, setFriends] = useState([]);
  const [online, setOnline] = useState([]);
  const [incoming, setIncoming] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [error, setError] = useState('');
  const channelRef = useRef(null);
  const profileRef = useRef(null);
  const tcRef = useRef(timeControl);
  const incomingRef = useRef(null);
  const userId = user?.id;
  useEffect(() => { tcRef.current = timeControl; }, [timeControl]);
  useEffect(() => { incomingRef.current = incoming; }, [incoming]);

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
      setFriends((rows || []).map((r) => r.requester_id === userId ? r.addressee : r.requester).filter(Boolean));
      channel = supabase.channel('quick-match-lobby', { config: { private: true, presence: { key: userId }, broadcast: { self: false } } });
      channelRef.current = channel;
      channel.on('presence', { event: 'sync' }, () => {
        const current = channel.presenceState();
        const people = [...new Map(
          Object.values(current)
            .flat()
            .filter((x) => x.id !== userId && x.status === 'available')
            .map((player) => [player.id, player]),
        ).values()];
        if (active) setOnline(people);
      });
      channel.on('broadcast', { event: 'challenge' }, ({ payload }) => {
        if (!active || payload.from === userId || (payload.to && payload.to !== userId)) return;
        setIncoming(payload);
        toast(`${payload.fromName} challenged you to a chess game.`);
      });
      channel.on('broadcast', { event: 'match-response' }, ({ payload }) => {
        if (!active || payload.to !== userId) return;
        if (payload.accepted) onMatched({ roomId: payload.roomId, opponent: payload.player, color: 'white', timeControl: payload.timeControl });
        else { setStatus('searching'); toast(`${payload.player?.username || 'Player'} declined the challenge.`); }
      });
      channel.subscribe(async (state) => {
        if (state !== 'SUBSCRIBED' || !active) return;
        await channel.track({ ...me, id: userId, status: 'available', timeControl: tcRef.current.label, updatedAt: new Date().toISOString() });
        if (active) setStatus('searching');
      });
    }
    initialize();
    return () => { active = false; if (channel) supabase.removeChannel(channel); channelRef.current = null; };
  }, [userId, user?.isGuest, user?.email, onMatched]);

  async function challenge(player) {
    const channel = channelRef.current;
    if (!channel || !profileRef.current) return;
    const payload = { id: crypto.randomUUID(), from: userId, fromName: profileRef.current.username, player: profileRef.current, to: player?.id || null, targetName: player?.username || null, timeControl: tcRef.current, createdAt: Date.now() };
    setStatus(player ? 'inviting' : 'searching');
    const { error: sendError } = await channel.send({ type: 'broadcast', event: 'challenge', payload });
    if (sendError) { toast.error('Could not send challenge.'); setStatus('searching'); }
    else if (player) toast(`Challenge sent to ${player.username}. Waiting for response…`);
    else toast('You are online. Waiting for a Quick Match opponent…');
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
        toast.error(matchError.code === '23505' ? 'This challenge has already been accepted by another player.' : `Could not create match room: ${matchError.message}`);
        return;
      }
      await channelRef.current.send({ type: 'broadcast', event: 'match-response', payload: { to: target.from, accepted: true, roomId, player: profileRef.current, timeControl: target.timeControl } });
      onMatched({ roomId, opponent: target.player, color: 'black', timeControl: target.timeControl });
    } else {
      await channelRef.current.send({ type: 'broadcast', event: 'match-response', payload: { to: target.from, accepted: false, player: profileRef.current } });
    }
  }
  const friendIds = new Set(friends.map((x) => x.id));
  const unavailableMessage = !userId || user.isGuest ? 'Quick Match requires a registered account and Supabase connection.' : '';
  const onlineFriends = online.filter((x) => friendIds.has(x.id));
  const onlineOthers = online.filter((x) => !friendIds.has(x.id));
  const playerCard = (p) => <div key={p.id} className="flex items-center gap-3 rounded-lg bg-slate p-3"><Avatar name={p.username} url={p.avatar_url} size="h-9 w-9 text-sm"/><div className="min-w-0 flex-1"><p className="truncate font-medium">{p.username}</p><p className="text-xs text-gray-400">Rating {p.rating ?? 1200} · Online</p></div><button onClick={() => challenge(p)} className="rounded-lg bg-gold px-3 py-2 text-xs font-bold text-obsidian">Challenge</button></div>;
  return (
    <div className="min-h-screen bg-obsidian text-white flex flex-col">
      <TopNav active="quick-match" onNavigate={onNavigate} profile={{ username: user?.email?.split('@')[0] || 'Player' }} onEditProfile={onEditProfile} onLogout={onLogout} isAdmin={user?.isGuest} />
      <main className="px-4 py-8 pb-24 sm:pb-20 flex-1">
        <div className="mx-auto max-w-4xl">
          <button onClick={onBack} className="mb-5 text-sm text-gray-300 hover:text-white">← Back to Lobby</button>
          <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
            <section className="rounded-2xl border border-gold/30 bg-graphite p-6">
              <p className="text-xs uppercase tracking-[.25em] text-gold">Quick Match</p>
              <h1 className="mt-2 font-cinzel text-3xl text-white">Find Opponent</h1>
              <p className="mt-2 text-sm text-gray-400">While queueing, your status is broadcast to other online players.</p>
              <div className="mt-6 rounded-xl bg-slate p-4">
                <p className="text-xs text-gray-400">TIME CONTROL</p>
                <p className="mt-1 font-bold text-gold">{timeControl?.label || 'Rapid (10+0)'}</p>
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 p-4">
                <span className={`h-3 w-3 rounded-full ${status === 'searching' || status === 'inviting' ? 'animate-pulse bg-emerald-400' : 'bg-gray-500'}`}/>
                <div>
                  <p className="font-semibold">{status === 'connecting' ? 'Connecting…' : status === 'inviting' ? 'Invitation sent' : 'You are online'}</p>
                  <p className="text-xs text-gray-400">{online.length} other players online</p>
                </div>
              </div>
              {(error || unavailableMessage) && <p role="alert" className="mt-3 text-sm text-amber-300">{error || unavailableMessage}</p>}
              <button onClick={() => challenge(null)} disabled={status === 'connecting' || Boolean(unavailableMessage)} className="mt-5 w-full rounded-xl bg-gradient-to-r from-gold to-champagne py-3 font-bold text-obsidian disabled:opacity-50">Find Match Now</button>
              <p className="mt-3 text-xs leading-relaxed text-gray-500">Keep this page open. If Supabase Realtime is not enabled, matchmaking cannot reach other players.</p>
            </section>
            <section className="space-y-5 rounded-2xl border border-gold/20 bg-graphite p-5">
              <h2 className="font-cinzel text-xl text-gold">Online Players</h2>
              {incoming && (
                <div role="dialog" aria-label="Incoming challenge" className="rounded-xl border border-gold bg-gold/10 p-4">
                  <p className="font-semibold">{incoming.fromName} invited you</p>
                  <p className="mt-1 text-xs text-gray-300">{incoming.timeControl?.label}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => answer(true)} className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-obsidian">Accept & Play</button>
                    <button onClick={() => answer(false)} className="rounded-lg bg-slate px-4 py-2 text-sm">Decline</button>
                  </div>
                </div>
              )}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-300">Friends ({onlineFriends.length} online)</h3>
                <div className="space-y-2">{onlineFriends.length ? onlineFriends.map(playerCard) : <p className="rounded-lg bg-slate/50 p-3 text-sm text-gray-500">Online friends will appear here.</p>}</div>
              </div>
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-300">Other Players ({onlineOthers.length})</h3>
                <div className="max-h-64 space-y-2 overflow-y-auto">{onlineOthers.length ? onlineOthers.map(playerCard) : <p className="rounded-lg bg-slate/50 p-3 text-sm text-gray-500">No other players are currently online.</p>}</div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <FooterNav active="quick-match" onNavigate={onNavigate} onEditProfile={onEditProfile} />
    </div>
  );
}
