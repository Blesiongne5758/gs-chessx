import { useState } from 'react';
import { STORIES, PUZZLES, QUIZ } from '../lib/chessLearningContent';

function ChoiceButton({ selected, correct, children, onClick, disabled }) {
  const tone = selected
    ? correct ? 'border-emerald bg-emerald/15 text-emerald-100' : 'border-crimson bg-crimson/15 text-red-100'
    : 'border-white/10 bg-obsidian/50 text-gray-300 hover:border-gold/50 hover:text-white';
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`w-full rounded-lg border px-3 py-2 text-left text-xs transition ${tone} disabled:cursor-default`}>
      {children}
    </button>
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
    <section className="rounded-xl border border-gold/25 bg-graphite p-4 shadow-lg shadow-black/10" aria-labelledby="learning-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Ruang belajar</p>
          <h3 id="learning-title" className="mt-1 font-cinzel text-lg font-bold text-gold">Satu langkah, satu warisan</h3>
          <p className="mt-1 text-xs text-gray-400">Cerita sejarah, strategi praktis, dan quiz singkat untuk menemani pertandingan.</p>
        </div>
        <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-1 text-[10px] font-semibold text-gold">Selalu aktif saat masuk</span>
      </div>

      {mode !== 'story' && <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-obsidian/60 p-1" role="tablist" aria-label="Materi belajar catur">
        {[
          ['story', '📜 Story'],
          ['puzzle', '♞ Puzzle'],
          ['quiz', '✦ Quiz'],
        ].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)} className={`rounded-md px-2 py-2 text-[11px] font-semibold transition ${activeTab === key ? 'bg-gold text-obsidian' : 'text-gray-400 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>}

      {activeTab === 'story' && (
        <div className="mt-4" role="tabpanel">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-gray-500">
            <span>Bab {String(storyIndex + 1).padStart(2, '0')} / {String(STORIES.length).padStart(2, '0')}</span>
            <span className="font-mono text-gold">{story.year}</span>
          </div>
          <h4 className="mt-2 text-base font-bold text-white">{story.title}</h4>
          <p className="mt-2 text-xs leading-5 text-gray-300">{story.text}</p>
          <div className="mt-3 rounded-lg border-l-2 border-gold bg-gold/10 px-3 py-2 text-xs leading-5 text-gold/90">{story.lesson}</div>
          <div className="mt-4 flex justify-between gap-2">
            <button type="button" onClick={() => setStoryIndex((index) => (index - 1 + STORIES.length) % STORIES.length)} className="rounded-md border border-white/10 px-3 py-2 text-xs text-gray-300 hover:border-gold/50 hover:text-white">← Sebelumnya</button>
            <button type="button" onClick={() => setStoryIndex((index) => (index + 1) % STORIES.length)} className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-obsidian hover:bg-champagne">Lanjut cerita →</button>
          </div>
        </div>
      )}

      {activeTab === 'puzzle' && (
        <div className="mt-4" role="tabpanel">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-gray-500">
            <span>Puzzle {puzzleIndex + 1} / {PUZZLES.length}</span>
            <span className="text-emerald">{puzzle.label}</span>
          </div>
          <h4 className="mt-2 text-sm font-bold leading-5 text-white">{puzzle.prompt}</h4>
          <div className="mt-3 space-y-2">
            {puzzle.options.map((option, index) => (
              <ChoiceButton key={option} selected={puzzleAnswer === index} correct={index === puzzle.answer} disabled={puzzleAnswer !== null} onClick={() => selectPuzzle(index)}>
                <span className="mr-2 font-mono text-gold">{String.fromCharCode(65 + index)}.</span>{option}
              </ChoiceButton>
            ))}
          </div>
          {puzzleAnswer !== null && (
            <div className={`mt-3 rounded-lg border p-3 text-xs leading-5 ${puzzleAnswer === puzzle.answer ? 'border-emerald/50 bg-emerald/10 text-emerald-100' : 'border-crimson/50 bg-crimson/10 text-red-100'}`} role="status">
              <strong>{puzzleAnswer === puzzle.answer ? 'Tepat.' : 'Belum tepat.'}</strong> {puzzle.explanation}
            </div>
          )}
          <button type="button" onClick={nextPuzzle} disabled={puzzleAnswer === null} className="mt-4 w-full rounded-md border border-gold/40 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40">Puzzle berikutnya</button>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="mt-4" role="tabpanel">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-gray-500">
            <span>Quiz {quizIndex + 1} / {QUIZ.length}</span>
            <span className="font-mono text-gold">Skor {quizScore}</span>
          </div>
          <h4 className="mt-2 text-sm font-bold leading-5 text-white">{quiz.question}</h4>
          <div className="mt-3 space-y-2">
            {quiz.options.map((option, index) => (
              <ChoiceButton key={option} selected={quizAnswer === index} correct={index === quiz.answer} disabled={quizAnswer !== null} onClick={() => selectQuiz(index)}>
                <span className="mr-2 font-mono text-gold">{String.fromCharCode(65 + index)}.</span>{option}
              </ChoiceButton>
            ))}
          </div>
          {quizAnswer !== null && (
            <div className={`mt-3 rounded-lg border p-3 text-xs leading-5 ${quizAnswer === quiz.answer ? 'border-emerald/50 bg-emerald/10 text-emerald-100' : 'border-crimson/50 bg-crimson/10 text-red-100'}`} role="status">
              <strong>{quizAnswer === quiz.answer ? 'Benar.' : 'Coba ingat lagi.'}</strong> {quiz.explanation}
            </div>
          )}
          <button type="button" onClick={nextQuiz} disabled={quizAnswer === null} className="mt-4 w-full rounded-md border border-gold/40 px-3 py-2 text-xs font-semibold text-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-40">{quizIndex === QUIZ.length - 1 ? 'Ulangi quiz' : 'Pertanyaan berikutnya'}</button>
        </div>
      )}
    </section>
  );
}
