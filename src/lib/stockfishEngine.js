/**
 * Stockfish.js Chess Engine Service
 * Provides client-side AI calculation using official Stockfish compiled to JS/WASM.
 * Calibrated across 10 progressive difficulty levels from Beginner to Grandmaster.
 */

export const AI_LEVEL_PROFILES = {
  1: { level: 1, title: 'Casual Novice', elo: 800, skillLevel: 0, depth: 1, movetime: 250, errorChance: 0.5 },
  2: { level: 2, title: 'Amateur', elo: 1000, skillLevel: 2, depth: 2, movetime: 300, errorChance: 0.35 },
  3: { level: 3, title: 'Club Apprentice', elo: 1200, skillLevel: 4, depth: 3, movetime: 400, errorChance: 0.2 },
  4: { level: 4, title: 'Club Intermediate', elo: 1400, skillLevel: 6, depth: 4, movetime: 500, errorChance: 0.1 },
  5: { level: 5, title: 'Tournament Player', elo: 1600, skillLevel: 9, depth: 6, movetime: 600, errorChance: 0.05 },
  6: { level: 6, title: 'Strong Candidate', elo: 1800, skillLevel: 12, depth: 8, movetime: 700, errorChance: 0 },
  7: { level: 7, title: 'National Master', elo: 2000, skillLevel: 14, depth: 10, movetime: 800, errorChance: 0 },
  8: { level: 8, title: 'FIDE Master', elo: 2200, skillLevel: 16, depth: 12, movetime: 950, errorChance: 0 },
  9: { level: 9, title: 'International Master', elo: 2400, skillLevel: 18, depth: 15, movetime: 1100, errorChance: 0 },
  10: { level: 10, title: 'Grandmaster (Stockfish Max)', elo: 2600, skillLevel: 20, depth: 18, movetime: 1300, errorChance: 0 },
};

/**
 * Parses UCI move string (e.g., 'e2e4', 'e7e8q') into chess.js move object.
 */
export function parseUciMove(uci) {
  if (!uci || typeof uci !== 'string' || uci.length < 4) return null;
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci[4].toLowerCase() : undefined;
  return { from, to, ...(promotion ? { promotion } : {}) };
}

/**
 * Parses UCI engine info line into depth, score, and evaluation data.
 */
export function parseUciInfo(line) {
  if (!line || typeof line !== 'string') return null;
  const depthMatch = line.match(/\bdepth\s+(\d+)\b/);
  const scoreCpMatch = line.match(/\bscore\s+cp\s+(-?\d+)\b/);
  const scoreMateMatch = line.match(/\bscore\s+mate\s+(-?\d+)\b/);
  const pvMatch = line.match(/\bpv\s+(.+)$/);

  const depth = depthMatch ? parseInt(depthMatch[1], 10) : null;
  const pv = pvMatch ? pvMatch[1].trim() : null;

  if (scoreMateMatch) {
    const mateMoves = parseInt(scoreMateMatch[1], 10);
    return {
      depth,
      type: 'mate',
      value: mateMoves,
      label: `M${mateMoves > 0 ? '+' : ''}${mateMoves}`,
      pv,
    };
  }

  if (scoreCpMatch) {
    const cp = parseInt(scoreCpMatch[1], 10);
    const pawns = (cp / 100).toFixed(2);
    return {
      depth,
      type: 'cp',
      value: cp,
      label: cp > 0 ? `+${pawns}` : `${pawns}`,
      pv,
    };
  }

  return depth !== null ? { depth, pv } : null;
}

/**
 * Fast positional & heuristic move selector fallback if web worker fails.
 */
const PIECE_VALS = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

export function chooseFallbackMove(chessInstance, level = 10) {
  const moves = chessInstance.moves({ verbose: true });
  if (!moves || !moves.length) return null;

  const profile = AI_LEVEL_PROFILES[level] || AI_LEVEL_PROFILES[10];
  let best = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    const captureVal = PIECE_VALS[move.captured] || 0;
    const checkBonus = move.san?.includes('+') ? 50 : 0;
    const promotionBonus = move.promotion ? 800 : 0;
    const centerControl = ['d4', 'd5', 'e4', 'e5'].includes(move.to) ? 25 : 0;
    const noise = Math.random() * Math.max(0, 11 - profile.level) * 30;

    const score = captureVal + checkBonus + promotionBonus + centerControl + noise;
    if (score > bestScore) {
      best = move;
      bestScore = score;
    }
  }

  return { from: best.from, to: best.to, promotion: best.promotion || 'q' };
}

/**
 * Stockfish Engine Controller
 * Manages background Web Worker lifecycle, UCI command sequencing, and move promises.
 */
class StockfishEngineController {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.pendingResolve = null;
    this.currentLevel = 10;
    this.lastEval = null;
    this.onEvalUpdate = null;
  }

  isSupported() {
    return typeof window !== 'undefined' && typeof window.Worker !== 'undefined';
  }

  init() {
    if (!this.isSupported() || this.worker) return;

    try {
      // Prefer WASM if supported, fallback to JS
      const wasmSupported = typeof WebAssembly === 'object' &&
        typeof WebAssembly.validate === 'function' &&
        WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));

      const workerPath = wasmSupported ? '/stockfish.wasm.js' : '/stockfish.js';
      this.worker = new Worker(workerPath);

      this.worker.onmessage = (event) => {
        this.handleMessage(typeof event.data === 'string' ? event.data : '');
      };

      this.worker.onerror = (err) => {
        console.warn('[Stockfish Engine] Worker error, falling back:', err);
        this.isReady = false;
        if (this.pendingResolve) {
          const resolve = this.pendingResolve;
          this.pendingResolve = null;
          resolve(null);
        }
      };

      this.send('uci');
      this.send('isready');
    } catch (e) {
      console.warn('[Stockfish Engine] Failed to initialize worker:', e);
      this.worker = null;
      this.isReady = false;
    }
  }

  send(command) {
    if (this.worker) {
      try {
        this.worker.postMessage(command);
      } catch (err) {
        console.warn('[Stockfish Engine] Error posting message:', err);
      }
    }
  }

  handleMessage(line) {
    if (!line) return;

    if (line === 'uciok') {
      this.isReady = true;
    }

    if (line.startsWith('info ')) {
      const parsed = parseUciInfo(line);
      if (parsed && (parsed.type === 'cp' || parsed.type === 'mate')) {
        this.lastEval = parsed;
        if (typeof this.onEvalUpdate === 'function') {
          this.onEvalUpdate(parsed);
        }
      }
    }

    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const bestMoveStr = parts[1];
      const parsedMove = parseUciMove(bestMoveStr);

      if (this.pendingResolve) {
        const resolve = this.pendingResolve;
        this.pendingResolve = null;
        resolve({
          move: parsedMove,
          raw: bestMoveStr,
          eval: this.lastEval,
        });
      }
    }
  }

  /**
   * Request next best move for the given board position FEN.
   */
  async requestMove(fen, level = 10, chessInstance = null) {
    const profile = AI_LEVEL_PROFILES[level] || AI_LEVEL_PROFILES[10];

    // Check if worker is active
    if (!this.worker) {
      this.init();
    }

    if (!this.worker) {
      return chessInstance ? chooseFallbackMove(chessInstance, level) : null;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        console.warn('[Stockfish Engine] Move search timeout, using fallback');
        this.send('stop');
        this.pendingResolve = null;
        resolve(chessInstance ? chooseFallbackMove(chessInstance, level) : null);
      }, (profile.movetime || 1000) + 3500);

      this.pendingResolve = (result) => {
        clearTimeout(timeoutId);
        if (result && result.move) {
          // If profile has errorChance (levels 1-3), occasionally introduce human-like inaccuracy
          if (profile.errorChance > 0 && Math.random() < profile.errorChance && chessInstance) {
            const allMoves = chessInstance.moves({ verbose: true });
            if (allMoves.length > 1) {
              const alternative = allMoves[Math.floor(Math.random() * allMoves.length)];
              resolve({ from: alternative.from, to: alternative.to, promotion: alternative.promotion || 'q' });
              return;
            }
          }
          resolve(result.move);
        } else {
          resolve(chessInstance ? chooseFallbackMove(chessInstance, level) : null);
        }
      };

      // Set engine options for this level
      this.send(`setoption name Skill Level value ${profile.skillLevel}`);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${profile.depth} movetime ${profile.movetime}`);
    });
  }

  terminate() {
    if (this.worker) {
      try {
        this.send('quit');
        this.worker.terminate();
      } catch (err) {
        // ignore
      }
      this.worker = null;
      this.isReady = false;
      this.pendingResolve = null;
    }
  }
}

export const stockfishEngine = new StockfishEngineController();
