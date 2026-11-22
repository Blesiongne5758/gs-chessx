import { useState } from 'react';

const MOMENTS = [
  {
    id: 'reykjavik',
    year: '1972',
    kicker: 'The Match of the Century',
    title: 'Reykjavík menyalakan papan dunia',
    text: 'Bobby Fischer dan Boris Spassky menjadikan setiap langkah terasa seperti duel keberanian, persiapan, dan ketahanan mental.',
    lesson: 'Mainkan posisi dengan kepala dingin sebelum mengejar momen epik.',
  },
  {
    id: 'steinitz',
    year: '1886',
    kicker: 'The First World Championship',
    title: 'Steinitz mengubah seni bertahan',
    text: 'Dalam duel Steinitz–Zukertort, keunggulan kecil mulai dihargai sebagai fondasi serangan besar.',
    lesson: 'Bangun tekanan perlahan: ruang, struktur, lalu taktik.',
  },
  {
    id: 'deepblue',
    year: '1997',
    kicker: 'Human vs Machine',
    title: 'Deep Blue menantang intuisi manusia',
    text: 'Kasparov melawan mesin yang menghitung jutaan variasi, menandai babak baru hubungan manusia dan teknologi catur.',
    lesson: 'Pilih kandidat utama, hitung konkret, lalu percaya pada evaluasi posisi.',
  },
];

function HistoricalVisual({ id }) {
  if (id === 'deepblue') {
    return (
      <div className="relative h-48 overflow-hidden rounded-2xl border border-cyan-300/30 bg-[#071827] shadow-[0_0_45px_rgba(34,211,238,.2)] sm:h-60">
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,.28) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.28) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="absolute inset-x-10 top-8 h-px bg-cyan-200/70 shadow-[0_0_14px_4px_rgba(34,211,238,.5)]" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl text-cyan-100 drop-shadow-[0_0_18px_rgba(34,211,238,.75)]">♞</div>
        <div className="absolute bottom-4 left-5 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-200/70">calculate · evaluate · play</div>
        <div className="absolute right-5 top-5 rounded border border-cyan-200/30 px-2 py-1 font-mono text-[10px] text-cyan-200">IBM / 97</div>
      </div>
    );
  }

  if (id === 'steinitz') {
    return (
      <div className="relative h-48 overflow-hidden rounded-2xl border border-amber-200/30 bg-gradient-to-br from-[#3a2316] via-[#704326] to-[#12100f] shadow-[0_0_45px_rgba(245,158,11,.2)] sm:h-60">
        <div className="absolute -left-10 -top-16 h-48 w-48 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-black/30" />
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-end gap-4 text-6xl text-amber-100 drop-shadow-[0_8px_10px_rgba(0,0,0,.7)]"><span>♜</span><span className="-translate-y-4 text-8xl text-amber-50">♔</span><span>♜</span></div>
        <div className="absolute right-5 top-5 rounded border border-amber-100/30 px-2 py-1 font-mono text-[10px] text-amber-100">LONDON / 86</div>
        <div className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.3em] text-amber-100/70">positional fire</div>
      </div>
    );
  }

  return (
    <div className="relative h-48 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-[#101827] via-[#332b32] to-[#120e16] shadow-[0_0_45px_rgba(212,175,55,.24)] sm:h-60">
      <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(135deg, transparent 45%, rgba(212,175,55,.22) 46%, transparent 48%), linear-gradient(45deg, transparent 45%, rgba(212,175,55,.18) 46%, transparent 48%)', backgroundSize: '46px 46px' }} />
      <div className="absolute -bottom-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" />
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-3 text-7xl drop-shadow-[0_9px_9px_rgba(0,0,0,.75)]"><span className="text-white">♔</span><span className="-translate-y-6 text-8xl text-gold">♚</span></div>
      <div className="absolute right-5 top-5 rounded border border-gold/30 px-2 py-1 font-mono text-[10px] text-gold">REYKJAVÍK / 72</div>
      <div className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.3em] text-gold/80">courage under pressure</div>
    </div>
  );
}

export default function HistoricalSplash({ onContinue }) {
  const [moment] = useState(() => MOMENTS[Math.floor(Math.random() * MOMENTS.length)]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#07090d]/95 p-4 backdrop-blur-md sm:p-8" role="dialog" aria-modal="true" aria-labelledby="historical-splash-title">
      <div className="my-auto w-full max-w-2xl rounded-3xl border border-gold/35 bg-[#11141c] p-4 shadow-[0_25px_100px_rgba(0,0,0,.65)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold/80">Historical opening · random moment</p>
            <p className="mt-1 font-mono text-xs text-gray-500">ARCHIVE {moment.year}</p>
          </div>
          <button type="button" onClick={onContinue} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:border-gold/50 hover:text-white">Lewati</button>
        </div>
        <HistoricalVisual id={moment.id} />
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{moment.kicker}</p>
            <h2 id="historical-splash-title" className="mt-2 font-cinzel text-2xl font-bold leading-tight text-white sm:text-3xl">{moment.title}</h2>
            <p className="mt-3 text-sm leading-6 text-gray-300">{moment.text}</p>
            <p className="mt-3 border-l-2 border-gold pl-3 text-xs leading-5 text-gold/90">{moment.lesson}</p>
          </div>
          <button type="button" onClick={onContinue} className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-obsidian transition hover:bg-champagne">Masuk ke papan →</button>
        </div>
      </div>
    </div>
  );
}
