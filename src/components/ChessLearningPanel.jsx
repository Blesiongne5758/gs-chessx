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

const PIECE_GLYPHS = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

function PuzzleBoard({ position }) {
  return (
    <div className="mx-auto mt-4 max-w-[15rem] overflow-hidden rounded-lg border-2 border-gold/40 shadow-[0_0_22px_rgba(212,175,55,.12)]" role="img" aria-label="Chess puzzle position diagram">
      <div className="grid grid-cols-8">
        {position.flatMap((row, rowIndex) => [...row].map((piece, colIndex) => {
          const light = (rowIndex + colIndex) % 2 === 0;
          return <div key={`${rowIndex}-${colIndex}`} className={`grid aspect-square place-items-center text-[clamp(1.2rem,5vw,2rem)] leading-none ${light ? 'bg-[#d8c18d] text-[#19151a]' : 'bg-[#654936] text-white'} ${piece === '.' ? '' : 'drop-shadow-[0_2px_1px_rgba(0,0,0,.6)]'}`}>{PIECE_GLYPHS[piece] || ''}</div>;
        }))}
      </div>
      <div className="flex justify-between bg-[#171411] px-2 py-1 font-mono text-[9px] text-gold/70"><span>a</span><span>b</span><span>c</span><span>d</span><span>e</span><span>f</span><span>g</span><span>h</span></div>
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
    <section className="rounded-xl border border-gold/25 bg-graphite p-4 shadow-lg shadow-black/10" aria-labelledby="learning-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Academy</p>
          <h3 id="learning-title" className="mt-1 font-cinzel text-lg font-bold text-gold">One Move, One Legacy</h3>
          <p className="mt-1 text-xs text-gray-400">Historical stories, practical strategies, and quick quizzes to sharpen decisions before battle.</p>
        </div>
        <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-1 text-[10px] font-semibold text-gold">Outside Active Games</span>
      </div>

      {mode !== 'story' && <div className="mt-4 grid grid-cols-3 gap-1 rounded-lg border border-white/10 bg-obsidian/60 p-1" role="tablist" aria-label="Chess learning materials">
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
            <span>Chapter {String(storyIndex + 1).padStart(2, '0')} / {String(STORIES.length).padStart(2, '0')}</span>
            <span className="font-mono text-gold">{story.year}</span>
          </div>
          <h4 className="mt-2 text-base font-bold text-white">{story.title}</h4>
          <p className="mt-2 text-xs leading-5 text-gray-300">{story.text}</p>
          <div className="mt-3 rounded-lg border-l-2 border-gold bg-gold/10 px-3 py-2 text-xs leading-5 text-gold/90">{story.lesson}</div>
          <div className="mt-4 flex justify-between gap-2">
            <button type="button" onClick={() => setStoryIndex((index) => (index - 1 + STORIES.length) % STORIES.length)} className="rounded-md border border-white/10 px-3 py-2 text-xs text-gray-300 hover:border-gold/50 hover:text-white">← Previous</button>
            <button type="button" onClick={() => setStoryIndex((index) => (index + 1) % STORIES.length)} className="rounded-md bg-gold px-3 py-2 text-xs font-bold text-obsidian hover:bg-champagne">Next Story →</button>
          </div>
        </div>
      )}

      {activeTab === 'puzzle' && (
        <div className="mt-4" role="tabpanel">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-gray-500">
            <span>Puzzle {puzzleIndex + 1} / {PUZZLES.length}</span>
            <span className="text-emerald">{puzzle.label}</span>
          </div>
          <PuzzleBoard position={puzzle.position} />
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.18em] text-gray-500">Evaluate position before choosing a plan</p>
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
              <strong>{puzzleAnswer === puzzle.answer ? 'Correct.' : 'Not quite.'}</strong> {puzzle.explanation}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={prevPuzzle}
              className="rounded-md border border-white/10 px-3 py-2 text-xs text-gray-300 hover:border-gold/50 hover:text-white"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={nextPuzzle}
              className="rounded-md bg-gold px-4 py-2 text-xs font-bold text-obsidian hover:bg-champagne transition"
            >
              Next Puzzle →
            </button>
          </div>
        </div>
      )}

      {activeTab === 'quiz' && (
        <div className="mt-4" role="tabpanel">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-gray-500">
            <span>Quiz {quizIndex + 1} / {QUIZ.length}</span>
            <span className="font-mono text-gold font-bold">Score {quizScore} / {QUIZ.length}</span>
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
              <strong>{quizAnswer === quiz.answer ? 'Correct.' : 'Review and try again.'}</strong> {quiz.explanation}
            </div>
          )}
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400">
              Question {quizIndex + 1} of {QUIZ.length}
            </span>
            <button
              type="button"
              onClick={nextQuiz}
              disabled={quizAnswer === null}
              className="rounded-md bg-gold px-4 py-2 text-xs font-bold text-obsidian hover:bg-champagne disabled:cursor-not-allowed disabled:opacity-40 transition"
            >
              {quizIndex === QUIZ.length - 1 ? 'Finish & Restart' : 'Next Question →'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
