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

const VISUAL_ASSETS = {
  immortal: '/historical-immortal.png',
  steinitz: '/historical-steinitz.svg',
  capablanca: '/historical-capablanca.svg',
  reykjavik: '/historical-reykjavik.png',
  kasparov: '/historical-kasparov.svg',
  deepblue: '/historical-deepblue.svg',
  carlsen: '/historical-carlsen.png',
  ding: '/historical-ding.svg',
};

function HistoricalVisual({ id }) {
  return (
    <div className="relative h-48 overflow-hidden rounded-2xl border border-gold/30 bg-obsidian shadow-[0_0_45px_rgba(212,175,55,.24)] sm:h-60">
      <img src={VISUAL_ASSETS[id]} alt="" className="h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/20" />
      <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/75">historical archive</span>
        <span className="rounded border border-white/25 bg-black/25 px-2 py-1 font-mono text-[10px] text-white/80">GS·CHESSX</span>
      </div>
    </div>
  );
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
