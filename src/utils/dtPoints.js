// Cálculo de puntos del DT a partir de los puntajes (vengan de Firestore o del
// JSON bundleado). El cruce es por player_id (ID real de la colección players),
// el mismo que guardan los dtSquads. Cero ambigüedad de nombres.

// Índice player_id -> suma de ratings en todos los partidos.
export const buildPointsIndex = (matches) => {
  const idx = new Map();
  (matches || []).forEach((match) => {
    (match?.dt_stats?.players_performance || []).forEach((p) => {
      if (!p.player_id || typeof p.rating !== 'number') return;
      idx.set(p.player_id, (idx.get(p.player_id) || 0) + p.rating);
    });
  });
  return idx;
};

// Puntos de un equipo DT: suma del XI, capitán x2. Redondeado a 1 decimal.
export const squadPoints = (squad, index) => {
  if (!squad || !index) return 0;
  const ids = [
    squad.gk,
    ...(squad.defenders || []),
    ...(squad.midfielders || []),
    ...(squad.forwards || []),
  ].filter(Boolean);

  let total = 0;
  ids.forEach((id) => {
    const pts = index.get(id) || 0;
    total += pts;
    if (id === squad.captainId) total += pts; // capitán cuenta doble
  });
  return Math.round(total * 10) / 10;
};

// Puntos de un solo jugador (para desgloses).
export const playerPoints = (playerId, index) => (index ? index.get(playerId) || 0 : 0);
