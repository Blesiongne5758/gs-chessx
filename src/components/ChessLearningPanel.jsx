import { useState } from 'react';
import { STORIES, PUZZLES, QUIZ } from '../lib/chessLearningContent';

const PIECE_GLYPHS = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

const STORY_ARTWORKS = {
  '1851': '/historical-immortal.png',
  '1886': '/historical-steinitz.svg',
  '1927': '/historical-capablanca.svg',
  '1972': '/historical-reykjavik.png',
  '1985': '/historical-kasparov.svg',
  '1997': '/historical-deepblue.svg',
  '2013': '/historical-carlsen.png',
  '2023': '/historical-ding.svg',
};

function ChoiceButton({ letter, text, selected, correct, onClick, disabled }) {
  let style = 'border-white/10 bg-white/[0.03] text-gray-200 hover:border-gold/50 hover:bg-gold/[0.04] hover:text-white';
  let badgeStyle = 'border-white/15 bg-white/10 text-gray-300';

  if (selected) {
    if (correct) {
      style = 'border-emerald/70 bg-emerald/20 text-emerald-100 shadow-lg shadow-emerald/10 ring-1 ring-emerald';
      badgeStyle = 'border-emerald bg-emerald text-obsidian font-extrabold';
    } else {
      style = 'border-rose-500/70 bg-rose-950/40 text-rose-100 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500';
      badgeStyle = 'border-rose-400 bg-rose-500 text-white font-extrabold';
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-center gap-3 rounded-xl border p-3 sm:p-3.5 text-left text-xs sm:text-sm font-medium transition-all ${style} disabled:cursor-default`}
    >
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-xs transition ${badgeStyle}`}>
        {letter}
      </span>
      <span className="flex-1 leading-snug">{text}</span>
      {selected && correct && (
        <span className="shrink-0 text-xs font-bold text-emerald-300">✓ Correct</span>
      )}
      {selected && !correct && (
        <span className="shrink-0 text-xs font-bold text-rose-300">✕ Incorrect</span>
      )}
    </button>
  );
}

function PuzzleBoard({ position }) {
  return (
    <div
      className="w-full max-w-[340px] sm:max-w-[380px] rounded-2xl border-4 border-[#3e2e21] bg-[#1e1712] p-2 sm:p-2.5 shadow-2xl shadow-black/80"
      role="img"
      aria-label="Chess puzzle position diagram"
    >
      <div className="grid grid-cols-[1.25rem_1fr] items-center">
        {/* Left Rank Coordinates (8 to 1) */}
        <div className="grid grid-rows-8 h-full text-[10px] font-mono font-bold text-gold/75 select-none py-1">
          {RANKS.map((r) => (
            <div key={r} className="grid place-items-center">{r}</div>
          ))}
        </div>

        {/* 8x8 Board Grid */}
        <div className="grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden border border-black/50 shadow-inner">
          {position.flatMap((row, rowIndex) =>
            [...row].map((piece, colIndex) => {
              const isLight = (rowIndex + colIndex) % 2 === 0;
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`grid aspect-square place-items-center text-2xl sm:text-3xl leading-none select-none transition-colors ${
                    isLight ? 'bg-[#dfcbb1] text-[#1e1b18]' : 'bg-[#7c5339] text-[#f7ecd9]'
                  } ${piece === '.' ? '' : 'drop-shadow-[0_2px_2px_rgba(0,0,0,0.65)]'}`}
                >
                  {PIECE_GLYPHS[piece] || ''}
                </div>
              );
            })
          )}
        </div>

        {/* Empty corner */}
        <div />

        {/* Bottom File Coordinates (a to h) */}
        <div className="grid grid-cols-8 text-[10px] font-mono font-bold text-gold/75 select-none pt-1">
          {FILES.map((f) => (
            <div key={f} className="text-center">{f}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChessLearningPanel({ mode = 'all' }) {
  const [activeTab, setActiveTab] = useState('story');
  const [storyIndex, setStoryIndex] = useState(0);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [puzzleAnswer, setPuzzleAnswer] = useState(null);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState(null);
  const [quizScore, setQuizScore] = useState(0);

  const story = STORIES[storyIndex];
  const puzzle = PUZZLES[puzzleIndex];
  const quiz = QUIZ[quizIndex];

  function selectPuzzle(answer) {
    if (puzzleAnswer !== null) return;
    setPuzzleAnswer(answer);
  }

  function nextPuzzle() {
    setPuzzleIndex((index) => (index + 1) % PUZZLES.length);
    setPuzzleAnswer(null);
  }

  function prevPuzzle() {
    setPuzzleIndex((index) => (index - 1 + PUZZLES.length) % PUZZLES.length);
    setPuzzleAnswer(null);
  }

  function selectQuiz(answer) {
    if (quizAnswer !== null) return;
    setQuizAnswer(answer);
    if (answer === quiz.answer) setQuizScore((score) => score + 1);
  }

  function nextQuiz() {
    if (quizIndex === QUIZ.length - 1) {
      setQuizIndex(0);
      setQuizAnswer(null);
      setQuizScore(0);
      return;
    }
    setQuizIndex((index) => index + 1);
    setQuizAnswer(null);
  }

  return (
    <section className="rounded-2xl border border-gold/30 bg-[#10121a]/95 p-5 sm:p-7 shadow-2xl shadow-black/40 backdrop-blur-md" aria-labelledby="learning-title">
      {/* Top Header & Section Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Mastery Library</span>
            <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-bold text-gold">
              English Edition
            </span>
          </div>
          <h2 id="learning-title" className="mt-1 font-cinzel text-xl sm:text-2xl font-bold text-white tracking-wide">
            One Move, One Legacy
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-gray-300 max-w-2xl">
            Interactive curriculum featuring grandmaster history, tactical pattern recognition, and competitive chess strategy.
          </p>
        </div>

        {/* Tab Switcher */}
        {mode !== 'story' && (
          <div className="flex shrink-0 rounded-xl border border-white/15 bg-black/50 p-1.5 shadow-inner" role="tablist" aria-label="Chess learning materials">
            {[
              ['story', '📜 Stories', STORIES.length],
              ['puzzle', '♞ Puzzles', PUZZLES.length],
              ['quiz', '✦ Quiz', QUIZ.length],
            ].map(([key, label, count]) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs sm:text-sm font-bold transition-all ${
                    active
                      ? 'bg-gradient-to-r from-gold to-champagne text-obsidian shadow-md shadow-gold/20'
                      : 'text-gray-400 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                      active ? 'bg-obsidian/25 text-obsidian' : 'bg-white/10 text-gray-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= TAB 1: HISTORICAL STORIES ================= */}
      {activeTab === 'story' && (
        <div className="mt-6" role="tabpanel">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Desktop Left Sidebar: Chapter List (12 Chapters) */}
            <aside className="lg:col-span-4 rounded-xl border border-white/10 bg-black/40 p-3 sm:p-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-gold">Timeline Index</span>
                <span className="text-[10px] text-gray-400">1851 – 2023</span>
              </div>
              <div className="mt-3 space-y-1 max-h-[460px] overflow-y-auto pr-1">
                {STORIES.map((s, idx) => {
                  const isCurrent = storyIndex === idx;
                  return (
                    <button
                      key={s.year + s.title}
                      type="button"
                      onClick={() => setStoryIndex(idx)}
                      className={`w-full flex items-center justify-between gap-2.5 rounded-lg p-2.5 text-left text-xs transition ${
                        isCurrent
                          ? 'border border-gold/50 bg-gold/15 text-white font-bold shadow-md shadow-gold/10'
                          : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`font-mono text-[11px] shrink-0 ${isCurrent ? 'text-gold font-bold' : 'text-gray-400'}`}>
                          {s.year}
                        </span>
                        <span className="truncate">{s.title}</span>
                      </div>
                      {isCurrent && <span className="text-gold text-xs shrink-0">●</span>}
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Desktop Right Column: Main Reading Frame */}
            <article className="lg:col-span-8 flex flex-col justify-between rounded-xl border border-gold/25 bg-graphite/60 p-5 sm:p-7 shadow-xl">
              <div>
                {/* Meta header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gold/20 border border-gold/40 px-2.5 py-0.5 text-[11px] font-bold text-gold">
                      Chapter {String(storyIndex + 1).padStart(2, '0')} of {String(STORIES.length).padStart(2, '0')}
                    </span>
                    <span className="text-xs text-gray-400">Historical Masterpiece</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-gold">Anno {story.year}</span>
                </div>

                {/* Hero Artwork if available */}
                {STORY_ARTWORKS[story.year] && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-gold/30 bg-black/60 shadow-lg">
                    <img
                      src={STORY_ARTWORKS[story.year]}
                      alt={story.title}
                      className="w-full h-44 sm:h-56 object-cover object-center filter brightness-95 hover:brightness-105 transition"
                    />
                  </div>
                )}

                {/* Story Heading */}
                <h3 className="mt-5 font-cinzel text-xl sm:text-2xl font-bold text-white tracking-wide">
                  {story.title}
                </h3>

                {/* Story Text */}
                <p className="mt-3 text-sm sm:text-base leading-relaxed text-gray-200">
                  {story.text}
                </p>

                {/* Key Takeaway / Lesson Callout */}
                <div className="mt-5 rounded-xl border-l-4 border-gold bg-gold/[0.08] p-4 text-xs sm:text-sm leading-relaxed text-gold shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <span className="text-xl leading-none text-gold select-none">❝</span>
                    <div className="font-medium text-gold/95">
                      {story.lesson}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Navigation */}
              <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setStoryIndex((index) => (index - 1 + STORIES.length) % STORIES.length)}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-200 hover:border-gold/50 hover:bg-white/10 hover:text-white transition"
                >
                  <span>←</span> Previous Chapter
                </button>

                <div className="text-xs text-gray-400 hidden sm:block">
                  {storyIndex + 1} / {STORIES.length} Chapters
                </div>

                <button
                  type="button"
                  onClick={() => setStoryIndex((index) => (index + 1) % STORIES.length)}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-champagne px-5 py-2.5 text-xs sm:text-sm font-extrabold text-obsidian shadow-md shadow-gold/25 hover:shadow-gold/40 transition"
                >
                  Next Chapter <span>→</span>
                </button>
              </div>
            </article>
          </div>
        </div>
      )}

      {/* ================= TAB 2: TACTICAL PUZZLES ================= */}
      {activeTab === 'puzzle' && (
        <div className="mt-6" role="tabpanel">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Desktop Left: Chess Board Frame */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full flex items-center justify-between mb-3 px-1">
                <span className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
                  <span className="h-2.5 w-2.5 rounded-full bg-white ring-2 ring-gold/40" />
                  White to move
                </span>
                <span className="rounded-full bg-emerald/20 border border-emerald/40 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                  {puzzle.label}
                </span>
              </div>

              <PuzzleBoard position={puzzle.position} />

              <p className="mt-3 text-center text-xs text-gray-400 flex items-center gap-1.5">
                <span>💡</span> Look for forcing moves: checks, captures, and unstoppable threats.
              </p>
            </div>

            {/* Desktop Right: Puzzle Objective, Choices & Explanation */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-gold/25 bg-graphite/60 p-5 sm:p-6 shadow-xl">
              <div>
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-gold/15 border border-gold/30 px-2.5 py-0.5 text-xs font-bold text-gold">
                      Puzzle {puzzleIndex + 1} of {PUZZLES.length}
                    </span>
                    <span className="text-xs text-gray-400">Tactics Trainer</span>
                  </div>

                  {/* Puzzle Dots */}
                  <div className="flex items-center gap-1">
                    {PUZZLES.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`Jump to puzzle ${i + 1}`}
                        onClick={() => { setPuzzleIndex(i); setPuzzleAnswer(null); }}
                        className={`h-2 rounded-full transition-all ${
                          puzzleIndex === i ? 'w-5 bg-gold' : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <h3 className="mt-4 font-semibold text-base sm:text-lg text-white leading-snug">
                  {puzzle.prompt}
                </h3>

                {/* Choices List */}
                <div className="mt-4 space-y-2.5">
                  {puzzle.options.map((option, index) => (
                    <ChoiceButton
                      key={option}
                      letter={String.fromCharCode(65 + index)}
                      text={option}
                      selected={puzzleAnswer === index}
                      correct={index === puzzle.answer}
                      disabled={puzzleAnswer !== null}
                      onClick={() => selectPuzzle(index)}
                    />
                  ))}
                </div>

                {/* Feedback & Explanation Card */}
                {puzzleAnswer !== null && (
                  <div
                    className={`mt-4 rounded-xl border p-4 text-xs sm:text-sm leading-relaxed ${
                      puzzleAnswer === puzzle.answer
                        ? 'border-emerald/60 bg-emerald/15 text-emerald-100'
                        : 'border-rose-500/60 bg-rose-950/40 text-rose-100'
                    }`}
                    role="status"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-lg">
                        {puzzleAnswer === puzzle.answer ? '🎉' : '⚠️'}
                      </span>
                      <div>
                        <strong className="block text-sm font-bold mb-1">
                          {puzzleAnswer === puzzle.answer ? 'Correct Solution!' : 'Not Quite Right'}
                        </strong>
                        <p>{puzzle.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Puzzle Navigation */}
              <div className="mt-8 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={prevPuzzle}
                  className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-200 hover:border-gold/50 hover:bg-white/10 hover:text-white transition"
                >
                  <span>←</span> Previous Puzzle
                </button>

                <button
                  type="button"
                  onClick={nextPuzzle}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold to-champagne px-5 py-2.5 text-xs sm:text-sm font-extrabold text-obsidian shadow-md shadow-gold/25 hover:shadow-gold/40 transition"
                >
                  Next Puzzle <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: CHESS QUIZ ================= */}
      {activeTab === 'quiz' && (
        <div className="mt-6" role="tabpanel">
          <div className="rounded-xl border border-gold/25 bg-graphite/60 p-5 sm:p-7 shadow-xl">
            {/* Quiz Progress & Score Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="rounded-full bg-gold/15 border border-gold/30 px-3 py-1 text-xs font-bold text-gold">
                  Question {quizIndex + 1} of {QUIZ.length}
                </span>
                <span className="text-xs text-gray-400">Theory & Strategy Test</span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-1 text-xs">
                  <span className="text-gray-400">Live Score:</span>
                  <span className="font-mono font-bold text-gold">{quizScore} / {QUIZ.length}</span>
                </div>
              </div>
            </div>

            {/* Quiz Progress Bar */}
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-gradient-to-r from-gold via-champagne to-emerald transition-all duration-300"
                style={{ width: `${Math.round(((quizIndex + 1) / QUIZ.length) * 100)}%` }}
              />
            </div>

            {/* Question Heading */}
            <h3 className="mt-6 font-cinzel text-lg sm:text-xl font-bold text-white leading-snug">
              {quiz.question}
            </h3>

            {/* Options Grid — 2 columns on desktop for balanced layout */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {quiz.options.map((option, index) => (
                <ChoiceButton
                  key={option}
                  letter={String.fromCharCode(65 + index)}
                  text={option}
                  selected={quizAnswer === index}
                  correct={index === quiz.answer}
                  disabled={quizAnswer !== null}
                  onClick={() => selectQuiz(index)}
                />
              ))}
            </div>

            {/* Feedback & Explanation Card */}
            {quizAnswer !== null && (
              <div
                className={`mt-5 rounded-xl border p-4 text-xs sm:text-sm leading-relaxed ${
                  quizAnswer === quiz.answer
                    ? 'border-emerald/60 bg-emerald/15 text-emerald-100'
                    : 'border-rose-500/60 bg-rose-950/40 text-rose-100'
                }`}
                role="status"
              >
                <div className="flex items-start gap-2.5">
                  <span className="text-lg">
                    {quizAnswer === quiz.answer ? '🎯' : '📖'}
                  </span>
                  <div>
                    <strong className="block text-sm font-bold mb-1">
                      {quizAnswer === quiz.answer ? 'Excellent Calculation!' : 'Strategic Review Needed'}
                    </strong>
                    <p>{quiz.explanation}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
              <span className="text-xs text-gray-400">
                {quizAnswer === null
                  ? 'Select an option to evaluate your answer.'
                  : quizIndex === QUIZ.length - 1
                  ? 'Final question completed!'
                  : 'Ready for the next question.'}
              </span>

              <button
                type="button"
                onClick={nextQuiz}
                disabled={quizAnswer === null}
                className="rounded-xl bg-gradient-to-r from-gold to-champagne px-6 py-2.5 text-xs sm:text-sm font-extrabold text-obsidian shadow-md shadow-gold/25 hover:shadow-gold/40 disabled:cursor-not-allowed disabled:opacity-40 transition"
              >
                {quizIndex === QUIZ.length - 1 ? 'Finish & Restart Quiz ↺' : 'Next Question →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
