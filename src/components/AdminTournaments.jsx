import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import TopNav from './TopNav';
import { TournamentDetail } from './Tournaments';
import { fetchProfile } from '../lib/profile';
import {
  fetchTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
  isDemoCreated,
  joinTournament,
  leaveTournament,
  subscribeTournaments,
  formatCountdown,
  formatDateTime,
} from '../lib/tournaments';
import {
  LIMITS,
  TIME_PRESETS,
  PLAYER_PRESETS,
  emptyForm,
  formFromTournament,
  validateTournament,
  estimateEnd,
  estimateRoundMinutes,
  plannedRounds,
} from '../lib/tournamentForm';
import { maxRounds } from '../../supabase/functions/_shared/swiss.js';

const inputCls =
  'w-full bg-obsidian border rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-gold';

export default function AdminTournaments({ user, onNavigate, onEditProfile, onLogout }) {
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [form, setForm] = useState(() => emptyForm());
  const [editing, setEditing] = useState(null); // tournament being edited
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bots, setBots] = useState(8);
  const [list, setList] = useState(null);
  const [lastCreated, setLastCreated] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [now, setNow] = useState(() => Date.now());
  // Tournament detail opened on top of the admin page: { id, view: 'pairings' | 'standings' }
  const [detail, setDetail] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [joinBusy, setJoinBusy] = useState(false);
  const topRef = useRef(null);

  useEffect(() => {
    fetchProfile(user)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
  }, [user]);

  const isAdmin = user.isGuest || !!profile?.is_admin;

  const reload = useCallback(
    () =>
      (setRefreshKey((k) => k + 1), fetchTournaments(user))
        .then((all) => setList(all.filter((t) => t.format === 'swiss')))
        .catch((e) => toast.error(`Gagal memuat turnamen: ${e.message}`)),
    [user],
  );

  useEffect(() => {
    if (!isAdmin) return undefined;
    reload();
    // Live registration counts / status changes
    return subscribeTournaments(user, reload);
  }, [isAdmin, user, reload]);

  useEffect(() => {
    // Tick every second while a detail is open (live countdown), otherwise every 30 s.
    const id = setInterval(() => setNow(Date.now()), detail ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [detail]);

  const detailT = detail ? (list || []).find((t) => t.id === detail.id) : null;
  const openDetail = (id, view) => setDetail({ id, view });
  const closeDetail = useCallback(() => setDetail(null), []);

  async function toggleJoin(t) {
    setJoinBusy(true);
    try {
      if (t.joined) await leaveTournament(user, t);
      else await joinTournament(user, t);
      toast.success(t.joined ? `Batal ikut ${t.name}` : `Terdaftar di ${t.name}`);
      await reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setJoinBusy(false);
    }
  }

  const statusCounts = useMemo(() => {
    const c = { all: 0, upcoming: 0, running: 0, finished: 0 };
    for (const t of list || []) {
      c.all += 1;
      c[t.status] = (c[t.status] || 0) + 1;
    }
    return c;
  }, [list]);

  const manageList = useMemo(() => {
    const order = { running: 0, upcoming: 1, finished: 2 };
    return (list || [])
      .filter((t) => statusFilter === 'all' || t.status === statusFilter)
      .sort(
        (a, b) =>
          order[a.status] - order[b.status] ||
          (a.status === 'finished'
            ? new Date(b.starts_at) - new Date(a.starts_at)
            : new Date(a.starts_at) - new Date(b.starts_at)),
      );
  }, [list, statusFilter]);

  const totalRegistered = useMemo(
    () => (list || []).filter((t) => t.status !== 'finished').reduce((n, t) => n + (t.player_count || 0), 0),
    [list],
  );

  const registered = editing?.player_count ?? 0;
  const errors = useMemo(() => validateTournament(form, { minPlayers: registered }), [form, registered]);
  const show = (field) => (submitted || touched[field]) && errors[field];

  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));
  const touch = (field) => () => setTouched((t) => ({ ...t, [field]: true }));

  const fieldSize = Math.max(2, Number(form.max_players) || 2);
  const endEstimate = estimateEnd(form.starts_at, form.time_control, form.rounds, fieldSize);
  const perRound = estimateRoundMinutes(form.time_control);

  function resetForm() {
    setForm(emptyForm());
    setEditing(null);
    setTouched({});
    setSubmitted(false);
  }

  function startEdit(t) {
    setEditing(t);
    setForm(formFromTournament(t));
    setTouched({});
    setSubmitted(false);
    setLastCreated(null);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      toast.error('Periksa kembali isian yang ditandai merah.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateTournament(user, editing, form);
        toast.success(`Perubahan "${form.name.trim()}" disimpan.`);
        resetForm();
      } else {
        const t = await createTournament(user, form, { bots: user.isGuest ? bots : 0 });
        toast.success(`Turnamen "${t.name}" dibuat.`);
        setLastCreated(t);
        resetForm();
      }
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!profileLoaded) {
    return <Shell {...{ user, profile, onNavigate, onEditProfile, onLogout }}><div className="text-gray-400 text-center py-16">Memuat...</div></Shell>;
  }

  if (!isAdmin) {
    return (
      <Shell {...{ user, profile, onNavigate, onEditProfile, onLogout }}>
        <div className="max-w-xl mx-auto bg-graphite border border-crimson/50 rounded-xl p-6 text-center">
          <div className="text-4xl mb-2">🔒</div>
          <h1 className="text-2xl font-cinzel font-bold text-gold mb-2">Khusus Admin</h1>
          <p className="text-gray-300 mb-4">Halaman ini hanya untuk admin turnamen.</p>
          <p className="text-sm text-gray-500">
            Pemilik proyek dapat menjadikan akun admin lewat Supabase SQL Editor:
          </p>
          <code className="block mt-2 bg-obsidian rounded p-2 text-xs text-champagne text-left overflow-x-auto">
            update profiles set is_admin = true where username = &apos;{profile?.username || 'nama_anda'}&apos;;
          </code>
          <button onClick={() => onNavigate('tournaments')} className="mt-5 px-4 py-2 bg-gold text-obsidian font-bold rounded">
            Ke Tournaments
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell {...{ user, profile, onNavigate, onEditProfile, onLogout }} isAdmin>
      <div ref={topRef} className="max-w-7xl mx-auto space-y-6 scroll-mt-6">
        <div>
          <h1 className="text-4xl font-cinzel font-bold text-gold mb-2">🛠 Admin Turnamen</h1>
          <p className="text-gray-400">
            Buat turnamen Swiss baru. Pemain bisa mendaftar sampai waktu mulai; setelah Anda menekan Mulai, ronde 1 dan
            seterusnya dipasangkan otomatis.
          </p>
          {user.isGuest && (
            <p className="mt-2 text-xs text-amber">
              Mode tamu — turnamen disimpan di browser ini dan diisi pemain contoh agar bisa langsung dicoba.
            </p>
          )}
        </div>

        {lastCreated && (
          <div
            className="bg-emerald/10 border border-emerald/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3"
            data-testid="created-banner"
          >
            <div className="flex-1 text-sm text-gray-200">
              <span className="font-bold text-emerald">✓ {lastCreated.name}</span> dibuat · mulai{' '}
              {formatDateTime(lastCreated.starts_at)}. Pendaftaran sudah dibuka.
            </div>
            <button
              onClick={() => openDetail(lastCreated.id, 'standings')}
              className="px-4 py-2 bg-emerald text-obsidian font-bold rounded whitespace-nowrap"
            >
              Lihat Turnamen →
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* ---------------- Form ---------------- */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="lg:col-span-2 bg-graphite border border-gold/20 rounded-xl p-6 space-y-5"
            aria-label={editing ? 'Ubah turnamen' : 'Buat turnamen Swiss'}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-white">
                {editing ? `✏️ Ubah: ${editing.name}` : '＋ Turnamen Swiss Baru'}
              </h2>
              {editing && (
                <button type="button" onClick={resetForm} className="text-sm text-gray-400 hover:text-white">
                  Batal ubah
                </button>
              )}
            </div>

            <Field label="Nama turnamen" error={show('name')} counter={`${form.name.length}/${LIMITS.nameMax}`}>
              <input
                className={`${inputCls} ${show('name') ? 'border-crimson' : 'border-gray-700'}`}
                value={form.name}
                maxLength={LIMITS.nameMax}
                onChange={(e) => set('name')(e.target.value)}
                onBlur={touch('name')}
                placeholder="mis. Depok Rapid Swiss #1"
                name="name"
              />
            </Field>

            <Field
              label="Deskripsi"
              optional
              error={show('description')}
              counter={`${form.description.length}/${LIMITS.descriptionMax}`}
            >
              <textarea
                className={`${inputCls} ${show('description') ? 'border-crimson' : 'border-gray-700'} min-h-[80px]`}
                value={form.description}
                maxLength={LIMITS.descriptionMax}
                onChange={(e) => set('description')(e.target.value)}
                onBlur={touch('description')}
                placeholder="Aturan singkat, siapa yang boleh ikut, dsb."
                name="description"
              />
            </Field>

            <Field label="Kontrol waktu (menit + detik increment)" error={show('time_control')}>
              <div className="flex flex-wrap gap-2 mb-2">
                {TIME_PRESETS.map((p) => (
                  <Chip key={p.value} active={form.time_control === p.value} onClick={() => set('time_control')(p.value)}>
                    {p.label}
                  </Chip>
                ))}
              </div>
              <input
                className={`${inputCls} ${show('time_control') ? 'border-crimson' : 'border-gray-700'} font-mono max-w-[10rem]`}
                value={form.time_control}
                onChange={(e) => set('time_control')(e.target.value.replace(/\s/g, ''))}
                onBlur={touch('time_control')}
                placeholder="10+5"
                name="time_control"
                aria-label="Kontrol waktu kustom"
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Kuota pemain" error={show('max_players')}>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PLAYER_PRESETS.map((n) => (
                    <Chip key={n} active={Number(form.max_players) === n} onClick={() => set('max_players')(n)}>
                      {n}
                    </Chip>
                  ))}
                </div>
                <input
                  type="number"
                  min={Math.max(LIMITS.playersMin, registered)}
                  max={LIMITS.playersMax}
                  className={`${inputCls} ${show('max_players') ? 'border-crimson' : 'border-gray-700'} max-w-[10rem]`}
                  value={form.max_players}
                  onChange={(e) => set('max_players')(e.target.value === '' ? '' : Number(e.target.value))}
                  onBlur={touch('max_players')}
                  name="max_players"
                  aria-label="Kuota pemain"
                />
                {editing && registered > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{registered} pemain sudah terdaftar.</p>
                )}
              </Field>

              <Field label="Jumlah ronde" error={show('rounds')}>
                <div className="flex gap-2 mb-2">
                  <Chip active={form.rounds === null} onClick={() => set('rounds')(null)}>
                    Otomatis
                  </Chip>
                  <Chip
                    active={form.rounds !== null}
                    onClick={() => set('rounds')(form.rounds ?? plannedRounds(null, fieldSize))}
                  >
                    Tentukan
                  </Chip>
                </div>
                {form.rounds !== null ? (
                  <Stepper
                    value={form.rounds}
                    min={LIMITS.roundsMin}
                    max={Math.min(LIMITS.roundsMax, maxRounds(fieldSize))}
                    onChange={(v) => {
                      set('rounds')(v);
                      touch('rounds')();
                    }}
                  />
                ) : (
                  <p className="text-sm text-gray-300">
                    ⌈log₂ pemain⌉ — untuk {fieldSize} pemain: <b className="text-gold">{plannedRounds(null, fieldSize)} ronde</b>
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Maks. {maxRounds(fieldSize)} ronde untuk {fieldSize} pemain. Bila yang ikut lebih sedikit, ronde dipotong
                  otomatis agar tidak ada pertemuan ulang.
                </p>
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <Field label="Waktu mulai" error={show('starts_at')}>
                <input
                  type="datetime-local"
                  className={`${inputCls} ${show('starts_at') ? 'border-crimson' : 'border-gray-700'} [color-scheme:dark]`}
                  value={form.starts_at}
                  onChange={(e) => set('starts_at')(e.target.value)}
                  onBlur={touch('starts_at')}
                  name="starts_at"
                />
              </Field>
              <Field label="Perkiraan selesai" optional error={show('ends_at')}>
                <input
                  type="datetime-local"
                  className={`${inputCls} ${show('ends_at') ? 'border-crimson' : 'border-gray-700'} [color-scheme:dark]`}
                  value={form.ends_at}
                  onChange={(e) => set('ends_at')(e.target.value)}
                  onBlur={touch('ends_at')}
                  name="ends_at"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {form.ends_at ? (
                    <button type="button" className="text-gold hover:underline" onClick={() => set('ends_at')('')}>
                      Hitung otomatis
                    </button>
                  ) : endEstimate ? (
                    <>
                      Otomatis: <span className="text-gray-300">{formatDateTime(endEstimate)}</span> (±{perRound} mnt/ronde)
                    </>
                  ) : (
                    'Dihitung dari kontrol waktu × ronde.'
                  )}
                </p>
              </Field>
            </div>

            <Field label="Hadiah" optional error={show('prize_pool')} counter={`${form.prize_pool.length}/${LIMITS.prizeMax}`}>
              <input
                className={`${inputCls} ${show('prize_pool') ? 'border-crimson' : 'border-gray-700'}`}
                value={form.prize_pool}
                maxLength={LIMITS.prizeMax}
                onChange={(e) => set('prize_pool')(e.target.value)}
                onBlur={touch('prize_pool')}
                placeholder="mis. 2.000 Gems"
                name="prize_pool"
              />
            </Field>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                className="mt-1 w-4 h-4 accent-[#D4AF37]"
                checked={form.is_pro_only}
                onChange={(e) => set('is_pro_only')(e.target.checked)}
                name="is_pro_only"
              />
              <span>
                <span className="text-white font-medium">Khusus pemain Pro</span>
                <span className="block text-xs text-gray-500">Hanya akun Pro yang bisa mendaftar.</span>
              </span>
            </label>

            {user.isGuest && !editing && (
              <Field label={`Pemain contoh (demo): ${bots}`}>
                <input
                  type="range"
                  min={0}
                  max={Math.min(32, Math.max(0, fieldSize - 1))}
                  value={Math.min(bots, Math.max(0, fieldSize - 1))}
                  onChange={(e) => setBots(Number(e.target.value))}
                  className="w-full accent-[#D4AF37]"
                  aria-label="Jumlah pemain contoh"
                />
              </Field>
            )}

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-gray-800">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-gray-400 hover:text-white">
                {editing ? 'Batal' : 'Kosongkan'}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-gold text-obsidian font-bold rounded hover:bg-champagne disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Turnamen'}
              </button>
            </div>
          </form>

          {/* ---------------- Preview ---------------- */}
          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="text-xs uppercase tracking-widest text-gray-500">Pratinjau kartu</div>
            <Preview form={form} fieldSize={fieldSize} endEstimate={endEstimate} />
            <div className="bg-graphite border border-gray-800 rounded-xl p-4 text-xs text-gray-400 space-y-1">
              <div className="text-gray-300 font-bold mb-1">Setelah dibuat</div>
              <p>1. Turnamen muncul di tab Akan Datang dan pemain bisa mendaftar.</p>
              <p>2. Buka detailnya lalu tekan ▶ Mulai &amp; Pairing R1 (atau otomatis via cron).</p>
              <p>3. Isi hasil tiap papan; ronde berikutnya dipasangkan otomatis.</p>
              <p className="pt-1 text-gray-500">Turnamen hanya bisa diubah atau dihapus sebelum dimulai.</p>
            </div>
          </aside>
        </div>

        {/* ---------------- Manage list ---------------- */}
        <section className="bg-graphite border border-gold/20 rounded-xl p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Kelola Turnamen Swiss</h2>
              <p className="text-sm text-gray-500">
                Jumlah pendaftar diperbarui otomatis. Ubah atau hapus hanya bisa sebelum turnamen dimulai.
                {list && (
                  <span className="text-gray-400" data-testid="total-registered">
                    {' '}
                    Total {totalRegistered} pendaftar di turnamen aktif.
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter status">
              {[
                { key: 'all', label: 'Semua' },
                { key: 'upcoming', label: 'Akan Datang' },
                { key: 'running', label: 'Berlangsung' },
                { key: 'finished', label: 'Selesai' },
              ].map((f) => (
                <Chip key={f.key} active={statusFilter === f.key} onClick={() => setStatusFilter(f.key)}>
                  {f.label} <span className="opacity-60">({statusCounts[f.key] || 0})</span>
                </Chip>
              ))}
            </div>
          </div>
          {list === null ? (
            <div className="text-gray-400 py-6 text-center">Memuat...</div>
          ) : manageList.length === 0 ? (
            <div className="text-gray-500 py-6 text-center">
              {list.length === 0 ? 'Belum ada. Buat yang pertama di atas.' : 'Tidak ada turnamen dengan status ini.'}
            </div>
          ) : (
            <ul className="divide-y divide-gray-800" data-testid="manage-list">
              {manageList.map((t) => (
                <ManageRow
                  key={t.id}
                  t={t}
                  now={now}
                  editable={t.status === 'upcoming' && (!user.isGuest || isDemoCreated(t))}
                  builtIn={user.isGuest && !isDemoCreated(t) && t.status === 'upcoming'}
                  isEditing={editing?.id === t.id}
                  onEdit={() => startEdit(t)}
                  onOpen={() => openDetail(t.id, 'standings')}
                  onOpenPairings={() => openDetail(t.id, 'pairings')}
                  onDelete={async () => {
                    try {
                      await deleteTournament(user, t);
                      toast.success(`"${t.name}" dihapus.`);
                      if (editing?.id === t.id) resetForm();
                      if (lastCreated?.id === t.id) setLastCreated(null);
                      reload();
                    } catch (e) {
                      toast.error(e.message);
                    }
                  }}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {detailT && (
        <TournamentDetail
          key={`${detailT.id}-${detail.view}`}
          user={user}
          t={detailT}
          now={now}
          isAdmin={isAdmin}
          initialView={detail.view}
          refreshKey={refreshKey}
          onChanged={reload}
          busy={joinBusy}
          onToggleJoin={() => toggleJoin(detailT)}
          onClose={closeDetail}
        />
      )}
    </Shell>
  );
}

function Shell({ user, profile, onNavigate, onEditProfile, onLogout, isAdmin, children }) {
  return (
    <div className="app-page min-h-screen bg-obsidian p-6">
      <TopNav
        active="admin"
        onNavigate={onNavigate}
        profile={profile}
        onEditProfile={onEditProfile}
        onLogout={onLogout}
        isAdmin={isAdmin ?? (user.isGuest || !!profile?.is_admin)}
      />
      {children}
    </div>
  );
}

function Field({ label, optional, error, counter, children }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-sm font-medium text-gray-300">
          {label} {optional && <span className="text-gray-600 font-normal">(opsional)</span>}
        </span>
        {counter && <span className="text-xs text-gray-600 font-mono">{counter}</span>}
      </div>
      {children}
      {error && (
        <p className="text-xs text-crimson mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1 rounded-full text-sm border transition ${
        active ? 'border-gold text-gold bg-gold/10' : 'border-gray-700 text-gray-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function Stepper({ value, min, max, onChange }) {
  const v = Number(value) || min;
  return (
    <div className="inline-flex items-center border border-gray-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, v - 1))}
        disabled={v <= min}
        className="px-3 py-2 bg-obsidian text-gray-300 hover:text-white disabled:opacity-30"
        aria-label="Kurangi ronde"
      >
        −
      </button>
      <span className="px-4 py-2 font-mono text-gold font-bold min-w-[3rem] text-center" data-testid="rounds-value">
        {v}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, v + 1))}
        disabled={v >= max}
        className="px-3 py-2 bg-obsidian text-gray-300 hover:text-white disabled:opacity-30"
        aria-label="Tambah ronde"
      >
        +
      </button>
    </div>
  );
}

function Preview({ form, fieldSize, endEstimate }) {
  const rounds = plannedRounds(form.rounds, fieldSize);
  const start = form.starts_at ? new Date(form.starts_at) : null;
  const end = form.ends_at ? new Date(form.ends_at) : endEstimate;
  return (
    <div className="bg-graphite border border-gold/40 rounded-xl p-5" data-testid="preview-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-lg font-bold text-white leading-snug break-words min-w-0">
          {form.name.trim() || <span className="text-gray-600">Nama turnamen</span>}
        </h3>
        {form.is_pro_only && <span className="px-2 py-0.5 rounded bg-gold text-obsidian text-xs font-bold shrink-0">PRO</span>}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300 mb-3">
        <span className="px-2 py-0.5 rounded border text-xs font-bold bg-azure/15 text-azure border-azure/40">Swiss</span>
        <span>⏱ {form.time_control || '—'}</span>
        <span>{form.rounds === null ? `±${rounds}` : rounds} ronde</span>
      </div>
      {form.description.trim() && <p className="text-sm text-gray-400 mb-2 line-clamp-3 break-words">{form.description}</p>}
      <div className="text-sm text-gray-400">📅 {start && !Number.isNaN(start.getTime()) ? formatDateTime(start) : '—'}</div>
      {end && <div className="text-sm text-gray-500">🏁 {formatDateTime(end)}</div>}
      {form.prize_pool.trim() && <div className="text-sm text-gray-400 mt-1 break-words">🎁 {form.prize_pool}</div>}
      <div className="flex justify-between text-xs text-gray-400 mt-3 mb-1">
        <span>Pemain</span>
        <span>0/{form.max_players || '—'}</span>
      </div>
      <div className="h-2 bg-obsidian rounded-full" />
    </div>
  );
}

const STATUS_BADGE = {
  upcoming: { label: 'Akan Datang', cls: 'bg-gold/15 text-gold border-gold/40' },
  running: { label: 'Berlangsung', cls: 'bg-emerald/15 text-emerald border-emerald/40' },
  finished: { label: 'Selesai', cls: 'bg-gray-700/40 text-gray-400 border-gray-600' },
};

function StatusBadge({ t }) {
  const b = STATUS_BADGE[t.status] || STATUS_BADGE.upcoming;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-xs font-bold ${b.cls}`} data-testid="status-badge">
      {t.status === 'running' && <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />}
      {b.label}
    </span>
  );
}

function statusDetail(t, now) {
  if (t.status === 'upcoming') {
    const ms = new Date(t.starts_at).getTime() - now;
    return ms > 0 ? `Mulai dalam ${formatCountdown(ms)}` : 'Menunggu dimulai admin';
  }
  if (t.status === 'running') return t.rounds ? `Ronde ${t.current_round || 1} dari ${t.rounds}` : 'Sedang berjalan';
  return `Selesai ${formatDateTime(t.ends_at || t.starts_at)}`;
}

function ManageRow({ t, now, editable, builtIn, isEditing, onEdit, onOpen, onOpenPairings, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const count = t.player_count || 0;
  const pct = Math.min(100, Math.round((count / Math.max(1, t.max_players)) * 100));
  const full = count >= t.max_players;
  const barCls = t.status === 'finished' ? 'bg-gray-500' : full ? 'bg-crimson' : pct >= 75 ? 'bg-amber' : 'bg-gold';
  const tooFew = t.status === 'upcoming' && count < 2;

  return (
    <li
      className={`py-4 grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-center gap-3 ${
        isEditing ? 'bg-gold/5 -mx-2 px-2 rounded' : ''
      }`}
      data-testid="manage-row"
    >
      <button onClick={onOpen} className="text-left min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-white font-medium truncate max-w-full">{t.name}</span>
          <StatusBadge t={t} />
          {t.is_pro_only && <span className="px-1.5 py-0.5 rounded bg-gold text-obsidian text-[10px] font-bold">PRO</span>}
        </div>
        <div className="text-xs text-gray-500">
          {statusDetail(t, now)} · 📅 {formatDateTime(t.starts_at)} · ⏱ {t.time_control} ·{' '}
          {t.rounds ? `${t.rounds} ronde` : 'ronde otomatis'}
        </div>
      </button>

      <div data-testid="registrations">
        <div className="flex justify-between items-baseline text-xs mb-1">
          <span className="text-gray-400">{t.status === 'upcoming' ? 'Pendaftar' : 'Peserta'}</span>
          <span className="font-mono">
            <b className={full && t.status !== 'finished' ? 'text-crimson' : 'text-white'}>{count}</b>
            <span className="text-gray-500">/{t.max_players}</span>
            {t.status === 'upcoming' && (
              <span className={`ml-2 ${full ? 'text-crimson font-bold' : 'text-gray-500'}`}>
                {full ? 'Penuh' : `sisa ${t.max_players - count}`}
              </span>
            )}
          </span>
        </div>
        <div className="h-2 bg-obsidian rounded-full overflow-hidden">
          <div className={`h-full ${barCls} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        {tooFew && <div className="text-[11px] text-amber mt-1">Butuh minimal 2 pemain untuk dimulai</div>}
      </div>

      <div className="flex md:justify-end">
        {builtIn ? (
          <span className="text-xs text-gray-600">Contoh bawaan</span>
        ) : !editable ? (
          <button
            onClick={onOpenPairings}
            title="Buka papan pairing turnamen"
            className={`px-3 py-1 rounded border text-sm whitespace-nowrap ${
              t.status === 'running'
                ? 'border-emerald/50 text-emerald hover:bg-emerald/10'
                : 'border-gray-600 text-gray-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.status === 'running' ? '♟ Pantau' : '♟ Lihat hasil'}
          </button>
        ) : confirming ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-gray-300">Hapus{count > 0 ? ` (${count} pendaftar)` : ''}?</span>
            <button
              onClick={async () => {
                setBusy(true);
                await onDelete();
                setBusy(false);
                setConfirming(false);
              }}
              disabled={busy}
              className="px-3 py-1 bg-crimson text-white rounded font-bold disabled:opacity-50"
            >
              {busy ? '...' : 'Ya, hapus'}
            </button>
            <button onClick={() => setConfirming(false)} className="px-3 py-1 text-gray-400 hover:text-white">
              Batal
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={onEdit} className="px-3 py-1 rounded border border-gold/40 text-gold text-sm hover:bg-gold/10">
              Ubah
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="px-3 py-1 rounded border border-crimson/40 text-crimson text-sm hover:bg-crimson/10"
            >
              Hapus
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
