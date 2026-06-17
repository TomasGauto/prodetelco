// Reglamento de puntaje de la fase de grupos del PRODE.
// ESPEJO de la logica de scoreData.js (la fuente de verdad del backend):
//   Resultado exacto          -> 3 pts
//   Acierto 1X2 (signo)       -> 1 pt
//   Diferencia de gol exacta  -> +1 pt  (implica acertar el signo)
// Mantener ambos en sync si se cambia el reglamento.

export const PTS_EXACT = 3;
export const PTS_OUTCOME = 1;
export const PTS_GOAL_DIFF = 1;

const isNum = (v) => typeof v === 'number' && !Number.isNaN(v);

/**
 * Calcula el desglose de puntos de una prediccion contra el resultado real.
 * @returns {null | { points: number, exact: boolean, outcome: boolean, goalDiff: boolean }}
 *          null si falta algun dato (partido sin resultado o prediccion incompleta).
 */
export const scoreBreakdown = (pred, match) => {
  const ph = pred?.homeScore;
  const pa = pred?.awayScore;
  const rh = match?.homeScore;
  const ra = match?.awayScore;
  if (![ph, pa, rh, ra].every(isNum)) return null;

  if (ph === rh && pa === ra) {
    return { points: PTS_EXACT, exact: true, outcome: true, goalDiff: true };
  }

  let points = 0;
  let outcome = false;
  let goalDiff = false;
  if (Math.sign(ph - pa) === Math.sign(rh - ra)) {
    points += PTS_OUTCOME;
    outcome = true;
  }
  if (ph - pa === rh - ra) {
    points += PTS_GOAL_DIFF;
    goalDiff = true;
  }
  return { points, exact: false, outcome, goalDiff };
};

/**
 * Etiqueta legible para mostrar el tipo de acierto de un desglose.
 * @param {{ points: number }} breakdown
 */
export const breakdownLabel = (breakdown) => {
  switch (breakdown.points) {
    case 3:
      return { text: 'Exacto', cls: 'bg-emerald-100 text-emerald-700' };
    case 2:
      return { text: 'Resultado + dif.', cls: 'bg-indigo-100 text-indigo-700' };
    case 1:
      return { text: 'Acierto 1X2', cls: 'bg-amber-100 text-amber-700' };
    default:
      return { text: 'Sin puntos', cls: 'bg-gray-100 text-gray-400' };
  }
};
