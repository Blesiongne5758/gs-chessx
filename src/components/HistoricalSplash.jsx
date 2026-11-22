import { useState } from 'react';

const MOMENTS = [
  {
    id: 'immortal', year: '1851', kicker: 'The Immortal Game', title: 'Anderssen menyalakan api pengorbanan',
    text: 'Adolf Anderssen dan Lionel Kieseritzky memainkan partai legendaris di London. Pengorbanan beberapa bidak berat membuka jalan menuju serangan yang tak terlupakan.',
    lesson: 'Pengorbanan hanya epik jika membuka garis, tempo, atau mat yang benar-benar terhitung.',
  },
  {
    id: 'steinitz', year: '1886', kicker: 'The First World Championship', title: 'Steinitz mengubah seni bertahan',
    text: 'Dalam duel Steinitz–Zukertort, keunggulan kecil mulai dihargai sebagai fondasi serangan besar dan lahirlah kejuaraan dunia resmi pertama.',
    lesson: 'Bangun tekanan perlahan: ruang, struktur, lalu taktik.',
  },
  {
    id: 'capablanca', year: '1921', kicker: 'The Cuban Crystal', title: 'Capablanca merebut mahkota dengan kejernihan',
    text: 'José Raúl Capablanca menaklukkan Lasker dalam pertandingan yang memperlihatkan kekuatan endgame, kesederhanaan, dan teknik nyaris tanpa cela.',
    lesson: 'Posisi yang bersih membuat rencana terbaik lebih mudah terlihat.',
  },
  {
    id: 'reykjavik', year: '1972', kicker: 'The Match of the Century', title: 'Reykjavík menyalakan papan dunia',
    text: 'Bobby Fischer dan Boris Spassky menjadikan setiap langkah terasa seperti duel keberanian, persiapan, dan ketahanan mental.',
    lesson: 'Mainkan posisi dengan kepala dingin sebelum mengejar momen epik.',
  },
  {
    id: 'kasparov', year: '1985', kicker: 'The Youngest World Champion', title: 'Kasparov menembus badai Karpov',
    text: 'Garry Kasparov merebut gelar dari Anatoly Karpov dalam duel panjang yang menguji energi, teori pembukaan, dan keberanian bermain aktif.',
    lesson: 'Aktivitas bidak sering lebih berharga daripada keunggulan materi yang pasif.',
  },
  {
    id: 'deepblue', year: '1997', kicker: 'Human vs Machine', title: 'Deep Blue menantang intuisi manusia',
    text: 'Kasparov melawan mesin yang menghitung jutaan variasi, menandai babak baru hubungan manusia dan teknologi catur.',
    lesson: 'Pilih kandidat utama, hitung konkret, lalu percaya pada evaluasi posisi.',
  },
  {
    id: 'carlsen', year: '2013', kicker: 'The Universal Champion', title: 'Carlsen membuat endgame terasa hidup',
    text: 'Magnus Carlsen mengalahkan Viswanathan Anand dengan tekanan panjang, fleksibilitas, dan kemampuan mengubah posisi kecil menjadi kemenangan.',
    lesson: 'Jangan buru-buru menyerah pada posisi yang tampak datar; cari target baru.',
  },
  {
    id: 'ding', year: '2023', kicker: 'A New Crown', title: 'Ding Liren menulis babak baru',
    text: 'Ding Liren menjadi juara dunia catur klasik putra pertama dari Tiongkok setelah duel dramatis melawan Ian Nepomniachtchi.',
    lesson: 'Ketahanan mental dan keberanian mengambil keputusan menentukan akhir pertandingan besar.',
  },
];

function HistoricalVisual({ id }) {
  if (id === 'deepblue') {
    return <div className="relative h-48 overflow-hidden rounded-2xl border border-cyan-300/30 bg-[#071827] shadow-[0_0_45px_rgba(34,211,238,.2)] sm:h-60"><div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(34,211,238,.28) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.28) 1px, transparent 1px)', backgroundSize: '22px 22px' }} /><div className="absolute inset-x-10 top-8 h-px bg-cyan-200/70 shadow-[0_0_14px_4px_rgba(34,211,238,.5)]" /><div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-7xl text-cyan-100 drop-shadow-[0_0_18px_rgba(34,211,238,.75)]">♞</div><div className="absolute bottom-4 left-5 font-mono text-[10px] uppercase tracking-[0.3em] text-cyan-200/70">calculate · evaluate · play</div><div className="absolute right-5 top-5 rounded border border-cyan-200/30 px-2 py-1 font-mono text-[10px] text-cyan-200">IBM / 97</div></div>;
  }

  if (id === 'immortal') {
    return <div className="relative h-48 overflow-hidden rounded-2xl border border-red-300/30 bg-gradient-to-br from-[#210b13] via-[#7f1d1d] to-[#090a10] shadow-[0_0_45px_rgba(239,68,68,.26)] sm:h-60"><div className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-red-400/25 blur-3xl" /><div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-2 text-7xl text-red-100 drop-shadow-[0_8px_9px_rgba(0,0,0,.8)]"><span className="-rotate-12 text-5xl">♕</span><span className="-translate-y-7 text-8xl text-amber-200">♔</span><span className="rotate-12 text-5xl">♜</span></div><div className="absolute left-5 top-5 rounded border border-red-200/30 px-2 py-1 font-mono text-[10px] text-red-100">LONDON / 51</div><div className="absolute bottom-4 right-5 text-[10px] uppercase tracking-[0.3em] text-red-200/80">sacrifice · attack</div></div>;
  }

  if (id === 'steinitz') {
    return <div className="relative h-48 overflow-hidden rounded-2xl border border-amber-200/30 bg-gradient-to-br from-[#3a2316] via-[#704326] to-[#12100f] shadow-[0_0_45px_rgba(245,158,11,.2)] sm:h-60"><div className="absolute -left-10 -top-16 h-48 w-48 rounded-full bg-amber-200/20 blur-3xl" /><div className="absolute bottom-0 left-0 right-0 h-16 bg-black/30" /><div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-end gap-4 text-6xl text-amber-100 drop-shadow-[0_8px_10px_rgba(0,0,0,.7)]"><span>♜</span><span className="-translate-y-4 text-8xl text-amber-50">♔</span><span>♜</span></div><div className="absolute right-5 top-5 rounded border border-amber-100/30 px-2 py-1 font-mono text-[10px] text-amber-100">LONDON / 86</div><div className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.3em] text-amber-100/70">positional fire</div></div>;
  }

  if (id === 'capablanca') {
    return <div className="relative h-48 overflow-hidden rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-[#052e2b] via-[#0f766e] to-[#08151a] shadow-[0_0_45px_rgba(16,185,129,.22)] sm:h-60"><div className="absolute inset-x-0 bottom-0 h-24 bg-emerald-950/50" /><div className="absolute left-10 top-7 text-6xl text-emerald-100/80">♗</div><div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-8xl text-white drop-shadow-[0_8px_9px_rgba(0,0,0,.7)]">♔</div><div className="absolute right-5 top-5 rounded border border-emerald-100/30 px-2 py-1 font-mono text-[10px] text-emerald-100">HAVANA / 21</div><div className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.3em] text-emerald-100/80">clarity · technique</div></div>;
  }

  if (id === 'kasparov') {
    return <div className="relative h-48 overflow-hidden rounded-2xl border border-fuchsia-300/30 bg-gradient-to-br from-[#1e103b] via-[#6b21a8] to-[#090914] shadow-[0_0_45px_rgba(217,70,239,.24)] sm:h-60"><div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(120deg, transparent 48%, rgba(244,114,182,.55) 49%, transparent 51%), linear-gradient(60deg, transparent 48%, rgba(192,132,252,.4) 49%, transparent 51%)', backgroundSize: '40px 40px' }} /><div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-end gap-3 text-7xl text-fuchsia-100 drop-shadow-[0_0_16px_rgba(244,114,182,.7)]"><span>♞</span><span className="-translate-y-6 text-8xl text-fuchsia-300">♔</span></div><div className="absolute right-5 top-5 rounded border border-fuchsia-200/30 px-2 py-1 font-mono text-[10px] text-fuchsia-100">MOSCOW / 85</div><div className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.3em] text-fuchsia-100/80">active initiative</div></div>;
  }

  if (id === 'carlsen') {
    return <div className="relative h-48 overflow-hidden rounded-2xl border border-sky-200/30 bg-gradient-to-br from-[#082f49] via-[#0369a1] to-[#07111d] shadow-[0_0_45px_rgba(56,189,248,.24)] sm:h-60"><div className="absolute inset-x-0 bottom-0 h-20 bg-sky-950/60" /><div className="absolute left-8 top-8 h-20 w-20 rounded-full bg-sky-200/30 blur-2xl" /><div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-end gap-6 text-7xl text-sky-50 drop-shadow-[0_8px_9px_rgba(0,0,0,.8)]"><span>♙</span><span className="-translate-y-5 text-8xl text-white">♔</span><span>♙</span></div><div className="absolute right-5 top-5 rounded border border-sky-100/30 px-2 py-1 font-mono text-[10px] text-sky-100">CHENNAI / 13</div><div className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.3em] text-sky-100/80">endgame pressure</div></div>;
  }

  if (id === 'ding') {
    return <div className="relative h-48 overflow-hidden rounded-2xl border border-rose-200/30 bg-gradient-to-br from-[#3b0a22] via-[#9f1239] to-[#140911] shadow-[0_0_45px_rgba(244,63,94,.22)] sm:h-60"><div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rose-200/20 bg-rose-200/10 shadow-[0_0_30px_rgba(251,113,133,.3)]" /><div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-8xl text-rose-50 drop-shadow-[0_8px_9px_rgba(0,0,0,.8)]">♚</div><div className="absolute left-6 top-5 text-3xl text-amber-200/80">✦</div><div className="absolute right-5 top-5 rounded border border-rose-100/30 px-2 py-1 font-mono text-[10px] text-rose-100">ASTANA / 23</div><div className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.3em] text-rose-100/80">a new crown</div></div>;
  }

  return <div className="relative h-48 overflow-hidden rounded-2xl border border-gold/30 bg-gradient-to-br from-[#101827] via-[#332b32] to-[#120e16] shadow-[0_0_45px_rgba(212,175,55,.24)] sm:h-60"><div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'linear-gradient(135deg, transparent 45%, rgba(212,175,55,.22) 46%, transparent 48%), linear-gradient(45deg, transparent 45%, rgba(212,175,55,.18) 46%, transparent 48%)', backgroundSize: '46px 46px' }} /><div className="absolute -bottom-10 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-gold/20 blur-3xl" /><div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-end gap-3 text-7xl drop-shadow-[0_9px_9px_rgba(0,0,0,.75)]"><span className="text-white">♔</span><span className="-translate-y-6 text-8xl text-gold">♚</span></div><div className="absolute right-5 top-5 rounded border border-gold/30 px-2 py-1 font-mono text-[10px] text-gold">REYKJAVÍK / 72</div><div className="absolute bottom-4 left-5 text-[10px] uppercase tracking-[0.3em] text-gold/80">courage under pressure</div></div>;
}

export default function HistoricalSplash({ onContinue }) {
  const [moment] = useState(() => MOMENTS[Math.floor(Math.random() * MOMENTS.length)]);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#07090d]/95 p-4 backdrop-blur-md sm:p-8" role="dialog" aria-modal="true" aria-labelledby="historical-splash-title">
      <div className="my-auto w-full max-w-2xl rounded-3xl border border-gold/35 bg-[#11141c] p-4 shadow-[0_25px_100px_rgba(0,0,0,.65)] sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.3em] text-gold/80">Historical opening · random moment</p><p className="mt-1 font-mono text-xs text-gray-500">ARCHIVE {moment.year}</p></div><button type="button" onClick={onContinue} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:border-gold/50 hover:text-white">Lewati</button></div>
        <HistoricalVisual id={moment.id} />
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{moment.kicker}</p><h2 id="historical-splash-title" className="mt-2 font-cinzel text-2xl font-bold leading-tight text-white sm:text-3xl">{moment.title}</h2><p className="mt-3 text-sm leading-6 text-gray-300">{moment.text}</p><p className="mt-3 border-l-2 border-gold pl-3 text-xs leading-5 text-gold/90">{moment.lesson}</p></div><button type="button" onClick={onContinue} className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-obsidian transition hover:bg-champagne">Masuk ke papan →</button></div>
      </div>
    </div>
  );
}
