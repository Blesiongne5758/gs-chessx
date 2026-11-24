import { useState } from 'react';

const MOMENTS = [
  {
    id: 'immortal', year: '1851', kicker: 'The Immortal Game', title: 'Anderssen sparks the sacrifice flame',
    text: 'Adolf Anderssen and Lionel Kieseritzky played a legendary game in London. Sacrificing multiple major pieces paved the way for an unforgettable king hunt.',
    lesson: 'Sacrifices are only glorious when they open lines, gain tempo, or deliver a calculated mate.',
  },
  {
    id: 'steinitz', year: '1886', kicker: 'The First World Championship', title: 'Steinitz transforms defensive art',
    text: 'In the Steinitz–Zukertort match, small advantages were first valued as the foundation for larger attacks, establishing the first official World Championship.',
    lesson: 'Build pressure systematically: space, structure, then tactics.',
  },
  {
    id: 'capablanca', year: '1921', kicker: 'The Cuban Crystal', title: 'Capablanca claims the crown with clarity',
    text: 'José Raúl Capablanca dethroned Lasker in a contest showcasing endgame mastery, simplicity, and near-flawless technique.',
    lesson: 'Clean positions make the best plans crystal clear.',
  },
  {
    id: 'reykjavik', year: '1972', kicker: 'The Match of the Century', title: 'Reykjavík ignites the world chess stage',
    text: 'Bobby Fischer and Boris Spassky turned every move into a duel of courage, deep preparation, and psychological stamina.',
    lesson: 'Play the position with composure before hunting for dramatic brilliance.',
  },
  {
    id: 'kasparov', year: '1985', kicker: 'The Youngest World Champion', title: 'Kasparov breaks through the Karpov storm',
    text: 'Garry Kasparov captured the title from Anatoly Karpov in an epic clash testing energy, opening theory, and fearless dynamic initiative.',
    lesson: 'Active piece play is often more valuable than passive material advantage.',
  },
  {
    id: 'deepblue', year: '1997', kicker: 'Human vs Machine', title: 'Deep Blue challenges human intuition',
    text: 'Kasparov faced a machine calculating millions of variations per second, marking a new chapter in chess and technology.',
    lesson: 'Identify key candidate moves, calculate concrete lines, and trust positional evaluation.',
  },
  {
    id: 'carlsen', year: '2013', kicker: 'The Universal Champion', title: 'Carlsen brings the endgame to life',
    text: 'Magnus Carlsen defeated Viswanathan Anand with relentless pressure, flexibility, and the ability to squeeze wins from tiny edges.',
    lesson: 'Never give up on seemingly equal positions; keep creating new problems.',
  },
  {
    id: 'ding', year: '2023', kicker: 'A New Crown', title: 'Ding Liren scripts a historic chapter',
    text: 'Ding Liren became the first classical World Chess Champion from China following a dramatic duel against Ian Nepomniachtchi.',
    lesson: 'Mental resilience and courage under pressure decide the greatest contests.',
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
        <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.3em] text-gold/80">Historical opening · random moment</p><p className="mt-1 font-mono text-xs text-gray-500">ARCHIVE {moment.year}</p></div><button type="button" onClick={onContinue} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 hover:border-gold/50 hover:text-white">Skip</button></div>
        <HistoricalVisual id={moment.id} />
        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{moment.kicker}</p><h2 id="historical-splash-title" className="mt-2 font-cinzel text-2xl font-bold leading-tight text-white sm:text-3xl">{moment.title}</h2><p className="mt-3 text-sm leading-6 text-gray-300">{moment.text}</p><p className="mt-3 border-l-2 border-gold pl-3 text-xs leading-5 text-gold/90">{moment.lesson}</p></div><button type="button" onClick={onContinue} className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-obsidian transition hover:bg-champagne">Enter the Board →</button></div>
      </div>
    </div>
  );
}
