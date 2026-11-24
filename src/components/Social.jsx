import { useEffect, useRef, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import Avatar from './Avatar';
import TopNav, { FooterNav } from './TopNav';
import { fetchProfile } from '../lib/profile';
import { getIceServers } from '../lib/webrtc';

export default function Social({ user, profile, onNavigate, onEditProfile, onLogout }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [ownProfile, setOwnProfile] = useState(profile || null);

  // WebRTC Call State
  const [mediaOpen, setMediaOpen] = useState(false);
  const [callType, setCallType] = useState('video'); // 'voice' | 'video'
  const [callMinimized, setCallMinimized] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [mediaError, setMediaError] = useState('');
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaRef = useRef(null);
  const peerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const activeRef = useRef(active);
  activeRef.current = active;

  const name = ownProfile?.username || user.email?.split('@')[0] || 'Player';

  useEffect(() => {
    if (profile) setOwnProfile(profile);
    else fetchProfile(user).then(setOwnProfile).catch(() => {});
  }, [profile, user]);

  async function loadFriends() {
    if (!user || user.isGuest) return;
    const { data, error } = await supabase
      .from('friendships')
      .select(`id, status, requester_id, addressee_id, requester:profiles!requester_id(id, username, avatar_url, rating), addressee:profiles!addressee_id(id, username, avatar_url, rating)`)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const rows = data || [];
    setFriends(rows.filter((f) => f.status === 'accepted').map((f) => ({ friendshipId: f.id, ...(f.requester_id === user.id ? f.addressee : f.requester) })));
    setRequests(rows.filter((f) => f.status === 'pending').map((f) => ({ ...f, other: f.requester_id === user.id ? f.addressee : f.requester, incoming: f.addressee_id === user.id })));
    setLoading(false);
  }

  useEffect(() => { loadFriends(); }, [user]);

  // Call duration counter
  useEffect(() => {
    let interval = null;
    if (callStatus === 'Terhubung') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callStatus]);

  function formatDuration(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // Peer Connection Factory
  const makePeer = useCallback(async (targetUserId, stream) => {
    const iceServers = await getIceServers();
    const peer = new RTCPeerConnection({ iceServers });
    peerRef.current = peer;

    if (stream) {
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    }

    peer.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setCallStatus('Connected');
      } else if (peer.connectionState === 'failed') {
        setCallStatus('Connection failed');
        setMediaError('WebRTC connection failed. Check your network or device permissions.');
      } else if (peer.connectionState === 'disconnected' || peer.connectionState === 'closed') {
        setCallStatus('Disconnected');
      }
    };

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        supabase.from('call_signals').insert({
          sender_id: user.id,
          recipient_id: targetUserId,
          kind: 'candidate',
          payload: candidate.toJSON()
        }).then(() => {}).catch(console.warn);
      }
    };

    return peer;
  }, [user?.id]);

  const endCall = useCallback((notifyPeer = true) => {
    const targetId = activeRef.current?.id || incomingOffer?.sender_id;
    if (notifyPeer && targetId && (peerRef.current || incomingOffer)) {
      supabase.from('call_signals').insert({
        sender_id: user.id,
        recipient_id: targetId,
        kind: 'hangup',
        payload: null
      }).then(() => {}).catch(console.warn);
    }
    peerRef.current?.close();
    peerRef.current = null;
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
    setRemoteStream(null);
    setIncomingOffer(null);
    setCallStatus('');
    setMediaOpen(false);
    setCallMinimized(false);
    setMicMuted(false);
    setCameraOff(false);
    setCallDuration(0);
    pendingCandidatesRef.current = [];
  }, [user?.id, incomingOffer]);

  // Global Call Signal Receiver (handles incoming calls regardless of active chat selection)
  useEffect(() => {
    if (!user || user.isGuest) return undefined;

    async function handleSignal(row) {
      if (row.recipient_id !== user.id) return;

      if (row.kind === 'offer') {
        // Find caller info
        let caller = friends.find((f) => f.id === row.sender_id);
        if (!caller) {
          const { data } = await supabase.from('profiles').select('id, username, avatar_url, rating').eq('id', row.sender_id).single();
          caller = data || { id: row.sender_id, username: 'Player' };
        }
        setIncomingOffer({ ...row, caller });
        setCallType(row.payload?.callType || 'video');
        setCallStatus('Incoming call');
        return;
      }

      if (row.kind === 'answer') {
        if (peerRef.current) {
          const sdpData = row.payload?.sdp || row.payload;
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(sdpData));
          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift();
            await peerRef.current.addIceCandidate(candidate).catch(console.warn);
          }
          setCallStatus('Connected');
        }
        return;
      }

      if (row.kind === 'candidate') {
        if (row.payload) {
          const candidate = new RTCIceCandidate(row.payload);
          if (peerRef.current?.remoteDescription?.type) {
            await peerRef.current.addIceCandidate(candidate).catch(console.warn);
          } else {
            pendingCandidatesRef.current.push(candidate);
          }
        }
        return;
      }

      if (row.kind === 'hangup') {
        endCall(false);
        toast('Call ended by peer');
      }
    }

    const channel = supabase
      .channel(`user_calls:${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_signals', filter: `recipient_id=eq.${user.id}` }, ({ new: row }) => {
        handleSignal(row).catch((err) => setMediaError(err.message));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, friends, endCall]);

  // Messages & active chat loader
  useEffect(() => {
    if (!active) { setMessages([]); return undefined; }
    let alive = true;
    async function loadMessages() {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id, sender_id, recipient_id, body, created_at')
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100);
      if (!alive) return;
      if (error) toast.error(`Chat is not ready: ${error.message}`);
      setMessages(data || []);
    }
    loadMessages();

    const channel = supabase.channel(`chat:${[user.id, active.id].sort().join(':')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const row = payload.new;
        if ((row.sender_id === user.id && row.recipient_id === active.id) || (row.sender_id === active.id && row.recipient_id === user.id)) {
          setMessages((old) => old.some((m) => m.id === row.id) ? old : [...old, row]);
        }
      })
      .subscribe();

    return () => { alive = false; supabase.removeChannel(channel); };
  }, [active?.id, user?.id]);

  // Video element binding
  useEffect(() => {
    if (!mediaOpen) return;
    if (videoRef.current && mediaRef.current) {
      videoRef.current.srcObject = mediaRef.current;
      videoRef.current.play().catch(() => {});
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [mediaOpen, remoteStream, callMinimized, callType]);

  useEffect(() => () => {
    peerRef.current?.close();
    mediaRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  async function searchPlayers(e) {
    e?.preventDefault();
    const term = query.trim();
    if (term.length < 3) { setResults([]); return; }
    const { data, error } = await supabase.from('profiles').select('id, username, avatar_url, rating').ilike('username', `%${term}%`).neq('id', user.id).limit(10);
    if (error) toast.error(error.message);
    setResults(data || []);
  }

  async function sendRequest(player) {
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: player.id });
    if (error) toast.error(error.code === '23505' ? 'Friend request already sent.' : error.message);
    else { toast.success(`Request sent to ${player.username}`); loadFriends(); }
  }

  async function respond(request, status) {
    const { error } = await supabase.from('friendships').update({ status }).eq('id', request.id).eq('addressee_id', user.id);
    if (error) toast.error(error.message); else loadFriends();
  }

  async function sendMessage(e) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !active) return;
    setDraft('');
    const { data, error } = await supabase.from('chat_messages').insert({ sender_id: user.id, recipient_id: active.id, body }).select('id, sender_id, recipient_id, body, created_at').single();
    if (error) { setDraft(body); toast.error(error.message); return; }
    setMessages((old) => old.some((m) => m.id === data.id) ? old : [...old, data]);
  }

  // Start Call (Voice Talk or Video Talk)
  async function startCall(type = 'video') {
    if (!active) {
      toast.error('Please select a friend first to start a call');
      return;
    }
    setMediaError('');
    setCallType(type);
    setCallMinimized(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support camera/microphone access. Make sure HTTPS is used.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      mediaRef.current = stream;
      setMicMuted(false);
      setCameraOff(type === 'voice');
      setMediaOpen(true);
      setCallStatus('Calling…');

      const peer = await makePeer(active.id, stream);
      const offer = await peer.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: type === 'video'
      });
      await peer.setLocalDescription(offer);

      const { error } = await supabase.from('call_signals').insert({
        sender_id: user.id,
        recipient_id: active.id,
        kind: 'offer',
        payload: {
          type: offer.type,
          sdp: offer.sdp,
          callType: type
        }
      });
      if (error) throw error;
    } catch (error) {
      setMediaError(error.message);
      toast.error(error.message || 'Failed to start call');
    }
  }

  // Accept Incoming Call
  async function acceptCall() {
    if (!incomingOffer) return;
    const callerId = incomingOffer.sender_id;
    const type = incomingOffer.payload?.callType || 'video';
    setCallType(type);
    setCallStatus('Connecting…');
    setCallMinimized(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support media access.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
      });
      mediaRef.current = stream;
      setMicMuted(false);
      setCameraOff(type === 'voice');
      setMediaOpen(true);

      // Switch active chat to caller if needed
      if (!active || active.id !== callerId) {
        const callerFriend = friends.find((f) => f.id === callerId) || incomingOffer.caller;
        if (callerFriend) setActive(callerFriend);
      }

      const peer = await makePeer(callerId, stream);
      const offerData = incomingOffer.payload?.sdp ? incomingOffer.payload : incomingOffer.payload;
      await peer.setRemoteDescription(new RTCSessionDescription(offerData));

      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        await peer.addIceCandidate(candidate).catch(console.warn);
      }

      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      const { error } = await supabase.from('call_signals').insert({
        sender_id: user.id,
        recipient_id: callerId,
        kind: 'answer',
        payload: {
          type: answer.type,
          sdp: answer.sdp,
          callType: type
        }
      });
      if (error) throw error;
      setIncomingOffer(null);
    } catch (error) {
      setMediaError(error.message);
      toast.error(error.message || 'Failed to accept call');
    }
  }

  // Reject Incoming Call
  async function rejectCall() {
    if (incomingOffer) {
      await supabase.from('call_signals').insert({
        sender_id: user.id,
        recipient_id: incomingOffer.sender_id,
        kind: 'hangup',
        payload: null
      }).catch(console.warn);
      setIncomingOffer(null);
      setCallStatus('');
      toast('Call declined');
    }
  }

  function toggleMicrophone() {
    const nextMuted = !micMuted;
    mediaRef.current?.getAudioTracks().forEach((track) => { track.enabled = !nextMuted; });
    setMicMuted(nextMuted);
  }

  function toggleCamera() {
    const nextOff = !cameraOff;
    mediaRef.current?.getVideoTracks().forEach((track) => { track.enabled = !nextOff; });
    setCameraOff(nextOff);
  }

  if (user?.isGuest) {
    return (
      <div className="flex min-h-screen flex-col bg-[#08090d] text-white">
        <TopNav active="social" onNavigate={onNavigate} profile={{ username: 'Guest' }} onEditProfile={onEditProfile} onLogout={onLogout} isAdmin />
        <main className="mx-auto flex-1 w-full max-w-xl px-4 py-12 text-center">
          <button onClick={() => onNavigate('lobby')} className="text-gold text-sm hover:underline">← Lobby</button>
          <div className="mt-8 rounded-2xl border border-gold/30 bg-graphite p-8 text-center shadow-xl">
            <h1 className="font-cinzel text-3xl text-gold">Friends & chat</h1>
            <p className="mt-3 text-gray-300">Sign in with a registered account to use friends list and chat.</p>
          </div>
        </main>
        <FooterNav active="social" onNavigate={onNavigate} onEditProfile={onEditProfile} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#08090d] text-white">
      <TopNav active="social" onNavigate={onNavigate} profile={{ username: name, avatar_url: ownProfile?.avatar_url }} onEditProfile={onEditProfile} onLogout={onLogout} />

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 pb-24 sm:pb-20 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[.25em] text-gold/70">GS-ChessX / Community</p>
            <h1 className="mt-2 font-cinzel text-3xl font-bold text-gold">Friends & messages</h1>
            <p className="mt-1 text-sm text-gray-400">Find opponents, accept requests, and chat in real-time with voice & video talk.</p>
          </div>
          <span className="rounded-full border border-emerald/30 bg-emerald/10 px-3 py-1 text-xs text-emerald">Connected</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={`space-y-5 ${active ? 'hidden lg:block' : 'block'}`}>
            <section className="rounded-2xl border border-gold/20 bg-graphite p-5">
              <h2 className="mb-3 font-semibold text-white">Find Players</h2>
              <form onSubmit={searchPlayers} className="flex gap-2">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Username…" className="min-w-0 flex-1 rounded-lg border border-slate bg-obsidian px-3 py-2 text-sm text-white outline-none focus:border-gold"/>
                <button type="submit" className="rounded-lg bg-gold px-3 font-semibold text-obsidian hover:bg-champagne transition">Search</button>
              </form>
              <div className="mt-3 space-y-2">
                {results.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 rounded-lg bg-slate/70 p-2">
                    <Avatar name={p.username} url={p.avatar_url} size="w-9 h-9 text-sm"/>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.username}</div>
                      <div className="text-xs text-gray-400">{p.rating} rating</div>
                    </div>
                    <button type="button" onClick={() => sendRequest(p)} className="text-sm font-semibold text-gold hover:text-champagne">+ Add</button>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gold/20 bg-graphite p-5">
              <h2 className="mb-3 font-semibold text-white">Requests <span className="text-xs text-gray-400">({requests.length})</span></h2>
              {requests.length === 0 && <p className="text-sm text-gray-500">No pending requests.</p>}
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg bg-slate/70 p-2">
                    <Avatar name={r.other?.username} url={r.other?.avatar_url} size="w-8 h-8 text-xs"/>
                    <span className="min-w-0 flex-1 truncate text-sm">{r.other?.username}</span>
                    {r.incoming ? (
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => respond(r, 'accepted')} aria-label="Accept" className="rounded bg-emerald/20 px-2 py-0.5 text-xs font-bold text-emerald hover:bg-emerald/30">✓</button>
                        <button type="button" onClick={() => respond(r, 'blocked')} aria-label="Decline" className="rounded bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-400 hover:bg-rose-500/30">×</button>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-300">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gold/20 bg-graphite p-5">
              <h2 className="mb-3 font-semibold text-white">Friends <span className="text-xs text-gray-400">({friends.length})</span></h2>
              {loading && <p className="text-sm text-gray-500">Loading…</p>}
              {!loading && !friends.length && <p className="text-sm text-gray-500">No friends yet. Search players to connect.</p>}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {friends.map((f) => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => setActive(f)}
                    className={`flex w-full items-center gap-2 rounded-lg p-2.5 text-left transition ${active?.id === f.id ? 'bg-gold/15 ring-1 ring-gold/50' : 'bg-slate/70 hover:bg-slate'}`}
                  >
                    <Avatar name={f.username} url={f.avatar_url} size="w-9 h-9 text-sm"/>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.username}</span>
                    <span className="text-xs font-bold text-gold">{f.rating}</span>
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <section className={`flex flex-col h-[580px] sm:h-[640px] overflow-hidden rounded-2xl border border-gold/20 bg-graphite shadow-xl ${!active ? 'hidden lg:flex' : 'flex'}`}>
            {active ? (
              <>
                <header className="flex items-center justify-between border-b border-white/5 bg-slate/20 p-3.5 sm:p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setActive(null)}
                      className="lg:hidden rounded-lg border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold hover:bg-gold hover:text-obsidian transition"
                    >
                      ← Friends
                    </button>
                    <Avatar name={active.username} url={active.avatar_url} size="w-10 h-10"/>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-white">{active.username}</h2>
                      <p className="text-xs text-gray-400">Rating {active.rating} · Friend</p>
                    </div>
                  </div>

                  {/* Dual Voice Talk & Video Talk Selection Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startCall('voice')}
                      title="Start Voice Talk"
                      className="flex items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2 text-xs sm:text-sm font-semibold text-gold hover:bg-gold hover:text-obsidian transition shadow-sm"
                    >
                      <span>📞</span>
                      <span className="hidden sm:inline">Voice Talk</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startCall('video')}
                      title="Start Video Talk"
                      className="flex items-center gap-1.5 rounded-xl border border-gold/40 bg-gold/20 px-3 py-2 text-xs sm:text-sm font-semibold text-gold hover:bg-gold hover:text-obsidian transition shadow-sm"
                    >
                      <span>📹</span>
                      <span className="hidden sm:inline">Video Talk</span>
                    </button>
                  </div>
                </header>

                <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">
                  {messages.length === 0 && <div className="mt-20 text-center text-sm text-gray-500">No messages yet. Say hello!</div>}
                  {messages.map((m) => (
                    <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.sender_id === user.id ? 'rounded-br-sm bg-gold text-obsidian font-medium' : 'rounded-bl-sm bg-slate text-gray-100'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <time className={`mt-1 block text-right text-[10px] ${m.sender_id === user.id ? 'text-obsidian/60' : 'text-gray-400'}`}>
                          {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 bg-graphite/95 p-3 sm:p-4">
                  <input
                    value={draft}
                    maxLength={2000}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Message ${active.username}…`}
                    className="min-w-0 flex-1 rounded-xl border border-slate bg-obsidian px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-gold"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim()}
                    className="shrink-0 rounded-xl bg-gold px-5 py-3 font-semibold text-obsidian hover:bg-champagne transition disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-8 text-center">
                <div>
                  <div className="text-5xl text-gold/30">♟</div>
                  <h2 className="mt-4 font-cinzel text-2xl text-gold">Select a friend to begin</h2>
                  <p className="mt-2 text-sm text-gray-400">Select a friend from the contact list to open chat, voice talk, or video talk.</p>
                </div>
              </div>
            )}
            {mediaError && <p role="alert" className="px-4 pb-3 text-sm text-rose-300">{mediaError}</p>}
          </section>
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <FooterNav active="social" onNavigate={onNavigate} onEditProfile={onEditProfile} />

      {/* Incoming Call Notification Popup */}
      {incomingOffer && (
        <aside aria-label="Incoming call notification" className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-3.5 rounded-2xl border border-gold/50 bg-[#0e111a]/95 p-4 shadow-2xl backdrop-blur-2xl ring-1 ring-white/15 max-w-sm">
          <div className="relative">
            <Avatar name={incomingOffer.caller?.username || 'Friend'} url={incomingOffer.caller?.avatar_url} size="w-12 h-12" />
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald ring-2 ring-[#0e111a] animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-white">{incomingOffer.caller?.username || 'Friend'}</h3>
            <p className="text-xs text-gold flex items-center gap-1">
              <span>{incomingOffer.payload?.callType === 'voice' ? '📞 Incoming Voice Call' : '📹 Incoming Video Call'}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={acceptCall}
              className="rounded-xl bg-emerald px-3.5 py-1.5 text-xs font-bold text-obsidian hover:bg-emerald/80 transition shadow-md"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={rejectCall}
              className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition"
            >
              Decline
            </button>
          </div>
        </aside>
      )}

      {/* Floating Call Widget / Screen (Minimizable) */}
      {mediaOpen && (
        <>
          {callMinimized ? (
            /* Minimized Floating Status Pill */
            <aside aria-label="Floating call status" className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 flex items-center gap-3 rounded-full border border-gold/50 bg-[#0e111a]/95 px-4 py-2.5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/15">
              <div className="relative">
                <Avatar name={active?.username} url={active?.avatar_url} size="w-8 h-8 text-xs" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald ring-2 ring-[#0e111a] animate-pulse" />
              </div>
              <div className="min-w-0 pr-1">
                <p className="max-w-[100px] sm:max-w-[140px] truncate text-xs font-semibold text-white">{active?.username}</p>
                <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                  <span>{callType === 'voice' ? '📞 Voice' : '📹 Video'}</span>
                  <span>•</span>
                  <span>{callStatus === 'Connected' ? formatDuration(callDuration) : (callStatus || 'Active')}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={toggleMicrophone}
                aria-label={micMuted ? 'Unmute microphone' : 'Mute microphone'}
                className={`rounded-full p-2 text-xs transition ${micMuted ? 'bg-rose-600 text-white' : 'bg-white/10 text-gray-200 hover:text-white'}`}
                title={micMuted ? 'Unmute' : 'Mute'}
              >
                {micMuted ? '🔇' : '🎙️'}
              </button>
              <button
                type="button"
                onClick={() => setCallMinimized(false)}
                aria-label="Expand call screen"
                className="rounded-full bg-gold/20 p-2 text-xs text-gold hover:bg-gold/30 transition font-bold"
                title="Expand call screen"
              >
                ⛶
              </button>
              <button
                type="button"
                onClick={() => endCall()}
                aria-label="End call"
                className="rounded-full bg-rose-600 p-2 text-xs text-white hover:bg-rose-700 transition"
                title="End Call"
              >
                ✕
              </button>
            </aside>
          ) : (
            /* Expanded Floating Call Screen */
            <aside aria-label="Floating call screen" className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 z-50 w-[94vw] sm:w-[440px] md:w-[480px] max-h-[85vh] rounded-3xl border border-gold/40 bg-[#0c0e16]/95 p-4 sm:p-5 shadow-2xl backdrop-blur-2xl ring-1 ring-white/10 overflow-hidden flex flex-col">
              {/* Floating Header */}
              <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={active?.username} url={active?.avatar_url} size="w-10 h-10" />
                  <div className="min-w-0">
                    <h3 className="truncate font-cinzel text-base font-bold text-gold">{active?.username}</h3>
                    <p className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald animate-pulse" />
                      <span>{callType === 'voice' ? 'Voice Talk' : 'Video Talk'}</span>
                      <span>·</span>
                      <span className="font-mono">{callStatus === 'Connected' ? formatDuration(callDuration) : (callStatus || 'Connecting…')}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCallMinimized(true)}
                    aria-label="Minimize call status screen"
                    className="rounded-xl border border-white/10 bg-white/5 p-2 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition"
                    title="Minimize Call Screen"
                  >
                    🗕
                  </button>
                  <button
                    type="button"
                    onClick={() => endCall()}
                    aria-label="End call"
                    className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-300 hover:bg-rose-500 hover:text-white transition"
                    title="End Call"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Media Display Area */}
              <div className="relative flex-1 min-h-[220px] sm:min-h-[260px] rounded-2xl bg-black/80 overflow-hidden border border-white/5 flex items-center justify-center">
                {callType === 'video' ? (
                  <>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    {/* Local PIP Preview */}
                    <div className="absolute bottom-3 right-3 w-28 sm:w-36 aspect-video rounded-xl border border-gold/40 shadow-2xl overflow-hidden bg-black/90">
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                      />
                      {cameraOff && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-[10px] text-gray-400">
                          Camera Off
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  /* Voice Talk Visualizer */
                  <div className="flex flex-col items-center justify-center p-6 text-center">
                    <div className="relative">
                      <div className="absolute -inset-4 rounded-full bg-gold/20 blur-md animate-pulse" />
                      <div className="absolute -inset-8 rounded-full border border-gold/20 animate-ping opacity-25" />
                      <Avatar name={active?.username} url={active?.avatar_url} size="w-24 h-24 text-2xl ring-4 ring-gold/40" />
                    </div>
                    <h4 className="mt-4 font-semibold text-white">{active?.username}</h4>
                    <p className="mt-1 text-xs text-emerald-400 font-mono">
                      {callStatus === 'Connected' ? `2-Way Voice Active (${formatDuration(callDuration)})` : (callStatus || 'Connecting voice…')}
                    </p>
                    <div className="mt-4 flex items-center gap-1">
                      <span className="h-3 w-1 bg-gold/60 rounded-full animate-pulse" />
                      <span className="h-6 w-1 bg-gold rounded-full animate-pulse" />
                      <span className="h-8 w-1 bg-gold rounded-full animate-pulse" />
                      <span className="h-5 w-1 bg-gold rounded-full animate-pulse" />
                      <span className="h-3 w-1 bg-gold/60 rounded-full animate-pulse" />
                    </div>
                    {/* Hidden video element to play incoming audio stream */}
                    <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
                  </div>
                )}
              </div>

              {/* Controls Footer */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={toggleMicrophone}
                  aria-pressed={micMuted}
                  className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                    micMuted ? 'bg-rose-600 text-white' : 'bg-slate text-white hover:bg-slate/80'
                  }`}
                >
                  <span>{micMuted ? '🔇' : '🎙️'}</span>
                  <span>{micMuted ? 'Unmute Mic' : 'Mute Mic'}</span>
                </button>
                {callType === 'video' && (
                  <button
                    type="button"
                    onClick={toggleCamera}
                    aria-pressed={cameraOff}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                      cameraOff ? 'bg-amber-500 text-obsidian' : 'bg-slate text-white hover:bg-slate/80'
                    }`}
                  >
                    <span>{cameraOff ? '📷' : '📹'}</span>
                    <span>{cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCallMinimized(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white transition"
                >
                  <span>🗕</span>
                  <span>Minimize</span>
                </button>
                <button
                  type="button"
                  onClick={() => endCall()}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition shadow-lg shadow-rose-900/30"
                >
                  <span>📞</span>
                  <span>End Call</span>
                </button>
              </div>
            </aside>
          )}
        </>
      )}
    </div>
  );
}
