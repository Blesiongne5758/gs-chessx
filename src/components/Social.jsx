import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabaseClient';
import Avatar from './Avatar';
import TopNav from './TopNav';
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
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [incomingOffer, setIncomingOffer] = useState(null);
  const [callStatus, setCallStatus] = useState('');
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const videoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const mediaRef = useRef(null);
  const peerRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const name = ownProfile?.username || user.email?.split('@')[0] || 'Player';

  useEffect(() => {
    if (profile) setOwnProfile(profile);
    else fetchProfile(user).then(setOwnProfile).catch(() => {});
  }, [profile, user]);

  async function loadFriends() {
    if (!user || user.isGuest) return;
    const { data, error } = await supabase.from('friendships').select(`id, status, requester_id, addressee_id, requester:profiles!requester_id(id, username, avatar_url, rating), addressee:profiles!addressee_id(id, username, avatar_url, rating)`).or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).order('created_at', { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const rows = data || [];
    setFriends(rows.filter((f) => f.status === 'accepted').map((f) => ({ friendshipId: f.id, ...(f.requester_id === user.id ? f.addressee : f.requester) })));
    setRequests(rows.filter((f) => f.status === 'pending').map((f) => ({ ...f, other: f.requester_id === user.id ? f.addressee : f.requester, incoming: f.addressee_id === user.id })));
    setLoading(false);
  }
  useEffect(() => { loadFriends(); }, [user]);

  useEffect(() => {
    if (!active) { setMessages([]); return undefined; }
    let alive = true;
    async function loadMessages() {
      const { data, error } = await supabase.from('chat_messages').select('id, sender_id, recipient_id, body, created_at').or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${user.id})`).order('created_at', { ascending: true }).limit(100);
      if (!alive) return;
      if (error) toast.error(`Chat belum siap: ${error.message}`);
      setMessages(data || []);
    }
    loadMessages();
    async function receiveSignal(row) {
      if (row.recipient_id !== user.id || row.sender_id !== active.id) return;
      if (row.kind === 'offer') { setIncomingOffer(row); setCallStatus('Panggilan masuk'); setMediaOpen(true); return; }
      if (row.kind === 'answer' && peerRef.current) {
        await peerRef.current.setRemoteDescription(row.payload);
        for (const candidate of pendingCandidatesRef.current) await peerRef.current.addIceCandidate(candidate);
        pendingCandidatesRef.current = [];
        setCallStatus('Menyambungkan media…');
      }
      if (row.kind === 'candidate' && row.payload) {
        const candidate = new RTCIceCandidate(row.payload);
        if (peerRef.current?.remoteDescription) await peerRef.current.addIceCandidate(candidate);
        else pendingCandidatesRef.current.push(candidate);
      }
      if (row.kind === 'hangup') endCall(false);
    }
    const channel = supabase.channel(`chat:${[user.id, active.id].sort().join(':')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const row = payload.new;
        if ((row.sender_id === user.id && row.recipient_id === active.id) || (row.sender_id === active.id && row.recipient_id === user.id)) {
          setMessages((old) => old.some((m) => m.id === row.id) ? old : [...old, row]);
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_signals' }, ({ new: row }) => { receiveSignal(row).catch((error) => setMediaError(error.message)); })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(channel); };
  }, [active?.id, user?.id]);

  useEffect(() => {
    if (!mediaOpen || !videoRef.current || !mediaRef.current) return;
    videoRef.current.srcObject = mediaRef.current;
    return undefined;
  }, [mediaOpen, callStatus]);
  useEffect(() => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream, mediaOpen]);
  useEffect(() => () => { peerRef.current?.close(); mediaRef.current?.getTracks().forEach((track) => track.stop()); }, []);

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
    if (error) toast.error(error.code === '23505' ? 'Permintaan pertemanan sudah ada.' : error.message);
    else { toast.success(`Permintaan dikirim ke ${player.username}`); loadFriends(); }
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
  async function makePeer(friendId, stream) {
    const peer = new RTCPeerConnection({ iceServers: await getIceServers() });
    peerRef.current = peer;
    stream.getTracks().forEach((track) => peer.addTrack(track, stream));
    peer.ontrack = (event) => setRemoteStream(event.streams[0]);
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') setCallStatus('Terhubung');
      else if (peer.connectionState === 'failed') {
        setCallStatus('Koneksi gagal');
        setMediaError('Koneksi gagal. Pastikan TURN server dan firewall mengizinkan relay.');
      }
    };
    peer.onicecandidate = ({ candidate }) => {
      if (candidate) supabase.from('call_signals').insert({ sender_id: user.id, recipient_id: friendId, kind: 'candidate', payload: candidate.toJSON() });
    };
    return peer;
  }
  async function openMedia() {
    setMediaError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Browser ini tidak mendukung akses kamera/mikrofon. Gunakan HTTPS dan periksa izin perangkat.');
      mediaRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMicMuted(false);
      setCameraOff(false);
      setMediaOpen(true);
      const peer = await makePeer(active.id, mediaRef.current);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const { error } = await supabase.from('call_signals').insert({ sender_id: user.id, recipient_id: active.id, kind: 'offer', payload: peer.localDescription.toJSON() });
      if (error) throw error;
      setCallStatus('Memanggil…');
    } catch (error) { setMediaError(error.message); }
  }
  async function acceptCall() {
    if (!incomingOffer || !active) return;
    try {
      mediaRef.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setMicMuted(false);
      setCameraOff(false);
      setMediaOpen(true);
      const peer = await makePeer(active.id, mediaRef.current);
      await peer.setRemoteDescription(incomingOffer.payload);
      for (const candidate of pendingCandidatesRef.current) await peer.addIceCandidate(candidate);
      pendingCandidatesRef.current = [];
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      const { error } = await supabase.from('call_signals').insert({ sender_id: user.id, recipient_id: active.id, kind: 'answer', payload: peer.localDescription.toJSON() });
      if (error) throw error;
      setIncomingOffer(null);
      setCallStatus('Menghubungkan…');
    } catch (error) { setMediaError(error.message); }
  }
  function endCall(notifyPeer = true) {
    if (notifyPeer && active && peerRef.current) supabase.from('call_signals').insert({ sender_id: user.id, recipient_id: active.id, kind: 'hangup', payload: null });
    peerRef.current?.close();
    peerRef.current = null;
    mediaRef.current?.getTracks().forEach((track) => track.stop());
    mediaRef.current = null;
    setRemoteStream(null);
    setIncomingOffer(null);
    setCallStatus('');
    setMediaOpen(false);
    setMicMuted(false);
    setCameraOff(false);
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

  if (user?.isGuest) return <div className="app-page min-h-screen bg-obsidian p-6 text-white"><TopNav active="social" onNavigate={onNavigate} profile={{ username: 'Guest' }} onEditProfile={onEditProfile} onLogout={onLogout} isAdmin /><button onClick={() => onNavigate('lobby')} className="text-gold">← Lobby</button><div className="mx-auto mt-20 max-w-xl rounded-2xl border border-gold/30 bg-graphite p-8 text-center"><h1 className="font-cinzel text-3xl text-gold">Friends & chat</h1><p className="mt-3 text-gray-300">Masuk dengan akun Supabase untuk menggunakan kontak pertemanan dan chat.</p></div></div>;
  return (
    <div className="app-page min-h-screen bg-obsidian p-6 text-white">
      <TopNav active="social" onNavigate={onNavigate} profile={{ username: name, avatar_url: ownProfile?.avatar_url }} onEditProfile={onEditProfile} onLogout={onLogout} />
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-[.25em] text-gold/70">GS-ChessX / Community</p><h1 className="mt-2 font-cinzel text-3xl text-gold">Friends & messages</h1><p className="mt-1 text-sm text-gray-400">Temukan lawan, terima permintaan, dan ngobrol langsung.</p></div><span className="rounded-full border border-emerald/30 bg-emerald/10 px-3 py-1 text-xs text-emerald">Akun terhubung</span></div>
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="rounded-2xl border border-gold/20 bg-graphite p-5"><h2 className="mb-3 font-semibold text-white">Cari pemain</h2><form onSubmit={searchPlayers} className="flex gap-2"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Username…" className="min-w-0 flex-1 rounded-lg border border-slate bg-obsidian px-3 py-2 text-sm outline-none focus:border-gold"/><button className="rounded-lg bg-gold px-3 font-semibold text-obsidian">Cari</button></form><div className="mt-3 space-y-2">{results.map((p) => <div key={p.id} className="flex items-center gap-2 rounded-lg bg-slate/70 p-2"><Avatar name={p.username} url={p.avatar_url} size="w-9 h-9 text-sm"/><div className="min-w-0 flex-1"><div className="truncate text-sm">{p.username}</div><div className="text-xs text-gray-400">{p.rating} rating</div></div><button onClick={() => sendRequest(p)} className="text-sm font-semibold text-gold">+ Add</button></div>)}</div></section>
            <section className="rounded-2xl border border-gold/20 bg-graphite p-5"><h2 className="mb-3 font-semibold text-white">Permintaan <span className="text-xs text-gray-400">{requests.length}</span></h2>{requests.length === 0 && <p className="text-sm text-gray-500">Belum ada permintaan.</p>}<div className="space-y-2">{requests.map((r) => <div key={r.id} className="flex items-center gap-2 rounded-lg bg-slate/70 p-2"><Avatar name={r.other?.username} url={r.other?.avatar_url} size="w-8 h-8 text-xs"/><span className="min-w-0 flex-1 truncate text-sm">{r.other?.username}</span>{r.incoming ? <><button onClick={() => respond(r, 'accepted')} aria-label="Accept" className="text-emerald">✓</button><button onClick={() => respond(r, 'blocked')} aria-label="Decline" className="text-rose-400">×</button></> : <span className="text-xs text-amber-300">Menunggu</span>}</div>)}</div></section>
            <section className="rounded-2xl border border-gold/20 bg-graphite p-5"><h2 className="mb-3 font-semibold">Kontak teman <span className="text-xs text-gray-400">{friends.length}</span></h2>{loading && <p className="text-sm text-gray-500">Memuat…</p>}{!loading && !friends.length && <p className="text-sm text-gray-500">Belum ada teman. Cari pemain untuk memulai.</p>}<div className="space-y-2">{friends.map((f) => <button key={f.id} onClick={() => setActive(f)} className={`flex w-full items-center gap-2 rounded-lg p-2 text-left ${active?.id === f.id ? 'bg-gold/15 ring-1 ring-gold/50' : 'bg-slate/70 hover:bg-slate'}`}><Avatar name={f.username} url={f.avatar_url} size="w-9 h-9 text-sm"/><span className="min-w-0 flex-1 truncate text-sm">{f.username}</span><span className="text-xs text-gold">{f.rating}</span></button>)}</div></section>
          </aside>
          <section className="flex min-h-[640px] flex-col overflow-hidden rounded-2xl border border-gold/20 bg-graphite">
            {active ? <><header className="flex items-center justify-between border-b border-white/5 p-4"><div className="flex items-center gap-3"><Avatar name={active.username} url={active.avatar_url} size="w-10 h-10"/><div><h2 className="font-semibold">{active.username}</h2><p className="text-xs text-gray-400">Rating {active.rating} · kontak teman</p></div></div><button onClick={openMedia} className="rounded-lg border border-gold/30 px-3 py-2 text-sm text-gold hover:bg-gold/10">Video / voice</button></header><div className="flex-1 space-y-3 overflow-y-auto p-5">{messages.length === 0 && <div className="mt-20 text-center text-sm text-gray-500">Belum ada pesan. Sapa temanmu!</div>}{messages.map((m) => <div key={m.id} className={`flex ${m.sender_id === user.id ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${m.sender_id === user.id ? 'rounded-br-sm bg-gold text-obsidian' : 'rounded-bl-sm bg-slate text-gray-100'}`}><p className="whitespace-pre-wrap break-words">{m.body}</p><time className={`mt-1 block text-right text-[10px] ${m.sender_id === user.id ? 'text-obsidian/60' : 'text-gray-400'}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div></div>)}</div><form onSubmit={sendMessage} className="flex gap-2 border-t border-white/5 p-4"><input value={draft} maxLength={2000} onChange={(e) => setDraft(e.target.value)} placeholder={`Pesan untuk ${active.username}…`} className="min-w-0 flex-1 rounded-xl border border-slate bg-obsidian px-4 py-3 text-sm outline-none focus:border-gold"/><button disabled={!draft.trim()} className="rounded-xl bg-gold px-5 font-semibold text-obsidian disabled:opacity-40">Kirim</button></form></> : <div className="grid flex-1 place-items-center p-8 text-center"><div><div className="text-5xl text-gold/30">♟</div><h2 className="mt-4 font-cinzel text-2xl text-gold">Pilih teman untuk memulai</h2><p className="mt-2 text-sm text-gray-400">Chat terenkripsi oleh aturan akses akun dan pertemanan database.</p></div></div>}
            {mediaError && <p role="alert" className="px-4 pb-3 text-sm text-rose-300">{mediaError}</p>}
          </section>
        </div>
      </div>
      {mediaOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"><div className="w-full max-w-3xl rounded-2xl border border-gold/30 bg-graphite p-5"><div className="mb-3 flex items-start justify-between"><div><h2 className="font-cinzel text-xl text-gold">Panggilan dengan {active?.username}</h2><p className="mt-1 text-xs text-emerald-300">{callStatus || 'Menyiapkan media…'} · WebRTC peer-to-peer</p></div><button onClick={() => endCall()} aria-label="Akhiri panggilan" className="text-gray-400">✕</button></div><div className="grid gap-3 sm:grid-cols-2"><video ref={remoteVideoRef} autoPlay playsInline className="aspect-video w-full rounded-xl bg-black object-cover"/><video ref={videoRef} autoPlay muted playsInline className="aspect-video w-full rounded-xl bg-black object-cover"/></div>{incomingOffer && <div className="mt-3 flex items-center justify-between rounded-lg bg-slate p-3"><span className="text-sm">{active?.username} menelepon Anda.</span><button onClick={acceptCall} className="rounded-lg bg-emerald px-4 py-2 font-semibold text-obsidian">Terima</button></div>}<div className="mt-4 flex flex-wrap justify-center gap-3">{mediaRef.current && <><button onClick={toggleMicrophone} aria-pressed={micMuted} className={`rounded-lg px-4 py-2 font-semibold ${micMuted ? 'bg-rose-600 text-white' : 'bg-slate text-white'}`}>{micMuted ? 'Unmute microphone' : 'Mute microphone'}</button><button onClick={toggleCamera} aria-pressed={cameraOff} className={`rounded-lg px-4 py-2 font-semibold ${cameraOff ? 'bg-amber-500 text-obsidian' : 'bg-slate text-white'}`}>{cameraOff ? 'Turn camera on' : 'Turn camera off'}</button></>}<button onClick={() => endCall()} className="rounded-lg bg-rose-600 px-4 py-2 font-semibold text-white">Akhiri panggilan</button></div></div></div>}
    </div>
  );
}
