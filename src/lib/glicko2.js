/**
 * GS-ChessX — Glicko-2 Rating System
 * Implementation of Mark Glickman's Glicko-2 rating system.
 * Reference: http://www.glicko.net/glicko/glicko2.pdf
 */

export const GLICKO2_DEFAULTS = {
  rating: 1200,
  rd: 350,
  vol: 0.06,
  tau: 0.5,
  scale: 173.7178,
};

/**
 * Calculates updated Glicko-2 rating, rating deviation (RD), and rating volatility.
 * @param {Object} player - Current player stats { rating, rd, vol }
 * @param {Object} opponent - Opponent stats { rating, rd }
 * @param {number} score - Game result from player perspective: 1.0 (win), 0.5 (draw), 0.0 (loss)
 * @returns {Object} { newRating, newRd, newVol, delta, rdDelta }
 */
export function calculateGlicko2(player = {}, opponent = {}, score = 0.5) {
  const r1 = Number(player.rating ?? GLICKO2_DEFAULTS.rating);
  const rd1 = Number(player.rd ?? GLICKO2_DEFAULTS.rd);
  const v1 = Number(player.vol ?? GLICKO2_DEFAULTS.vol);

  const r2 = Number(opponent.rating ?? GLICKO2_DEFAULTS.rating);
  const rd2 = Number(opponent.rd ?? GLICKO2_DEFAULTS.rd);

  const TAU = GLICKO2_DEFAULTS.tau;
  const SCALE = GLICKO2_DEFAULTS.scale;

  // Step 1: Convert to Glicko-2 scale
  const mu1 = (r1 - 1500) / SCALE;
  const phi1 = rd1 / SCALE;
  const mu2 = (r2 - 1500) / SCALE;
  const phi2 = rd2 / SCALE;

  // Step 2: g(phi) function
  const g2 = 1 / Math.sqrt(1 + (3 * phi2 * phi2) / (Math.PI * Math.PI));

  // Step 3: Expected outcome E(mu, mu2, phi2)
  const E = 1 / (1 + Math.exp(-g2 * (mu1 - mu2)));

  // Step 4: Estimated variance v
  const v = 1 / (g2 * g2 * E * (1 - E));

  // Step 5: Estimated improvement delta
  const delta = v * g2 * (score - E);

  // Step 6: Determine new volatility sigma' using Illinois bisection
  const a = Math.log(v1 * v1);
  const f = (x) => {
    const ex = Math.exp(x);
    const d2 = delta * delta;
    const p2 = phi1 * phi1;
    const num1 = ex * (d2 - p2 - v - ex);
    const den1 = 2 * (p2 + v + ex) * (p2 + v + ex);
    const term2 = (x - a) / (TAU * TAU);
    return num1 / den1 - term2;
  };

  let A = a;
  let B;
  if (delta * delta > phi1 * phi1 + v) {
    B = Math.log(delta * delta - phi1 * phi1 - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) {
      k += 1;
    }
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);
  let iterations = 0;
  while (Math.abs(B - A) > 1e-6 && iterations < 50) {
    iterations += 1;
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }

  const newVol = Math.exp(A / 2);

  // Step 7: Update rating deviation to pre-rating period value
  const phiStar = Math.sqrt(phi1 * phi1 + newVol * newVol);

  // Step 8: Update rating and RD to new values
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu1 + newPhi * newPhi * g2 * (score - E);

  // Step 9: Convert back to original Glicko scale
  const newRating = Math.max(100, Math.round(newMu * SCALE + 1500));
  const newRd = Math.max(30, Math.round(newPhi * SCALE));
  const ratingDelta = newRating - r1;
  const rdDelta = newRd - rd1;

  return {
    newRating,
    newRd,
    newVol: Number(newVol.toFixed(6)),
    delta: ratingDelta,
    rdDelta,
  };
}

/**
 * Returns rank tier based on Glicko-2 rating.
 */
export function getRankTier(rating = 1200) {
  if (rating >= 2400) return { title: 'Grandmaster', badge: '👑', color: 'text-amber-300' };
  if (rating >= 2200) return { title: 'Master', badge: '⭐', color: 'text-purple-300' };
  if (rating >= 2000) return { title: 'Expert', badge: '🔷', color: 'text-cyan-300' };
  if (rating >= 1800) return { title: 'Advanced', badge: '⚔️', color: 'text-emerald-300' };
  if (rating >= 1500) return { title: 'Club Player', badge: '🛡️', color: 'text-blue-300' };
  return { title: 'Apprentice', badge: '♟', color: 'text-gray-300' };
}
