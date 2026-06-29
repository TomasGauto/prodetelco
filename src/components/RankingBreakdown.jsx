import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getFlag } from '../utils/flags';
import { scoreBreakdown, breakdownLabel } from '../utils/scoring';

const fifaOf = (teamId) => (teamId || '').split('_')[0];

const Flag = ({ teamId, alt }) => {
  const url = getFlag(fifaOf(teamId));
  if (!url) return null;
  return <img src={url} alt={alt || ''} className="w-5 h-3.5 object-cover rounded-sm shrink-0" />;
};

/**
 * Desglose de puntos de un usuario: por cada partido jugado que pronostico,
 * muestra su pronostico, el resultado real y cuantos puntos sumo.
 */
const RankingBreakdown = ({ uid, matchesMap, matchFilter }) => {
  const [preds, setPreds] = useState(null);

  useEffect(() => {
    let active = true;
    setPreds(null);
    (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, 'predictions'), where('userId', '==', uid))
        );
        if (!active) return;
        const list = [];
        snap.forEach((d) => list.push(d.data()));
        setPreds(list);
      } catch (err) {
        console.error('Error cargando desglose:', err);
        if (active) setPreds([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  const items = useMemo(() => {
    if (!preds || !matchesMap) return null;
    const rows = [];
    for (const p of preds) {
      const m = matchesMap[p.matchId];
      if (!m) continue;
      if (matchFilter && !matchFilter(m)) continue;
      const b = scoreBreakdown(p, m);
      if (!b) continue; // partido sin resultado o prediccion incompleta
      rows.push({ id: p.matchId, m, p, b });
    }
    rows.sort((a, z) => (a.m.date?.seconds || 0) - (z.m.date?.seconds || 0));
    return rows;
  }, [preds, matchesMap, matchFilter]);

  if (!items) {
    return <p className="px-5 py-4 text-sm text-gray-400">Cargando desglose...</p>;
  }
  if (items.length === 0) {
    return (
      <p className="px-5 py-4 text-sm text-gray-400">
        Todavía no hay partidos jugados con su pronóstico.
      </p>
    );
  }

  const total = items.reduce((s, r) => s + r.b.points, 0);
  const scored = items.filter((r) => r.b.points > 0).length;

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-3 sm:px-4 py-3 space-y-2">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1">
        Desglose · {scored}/{items.length} acertados
      </p>

      {items.map(({ id, m, p, b }) => {
        const lbl = breakdownLabel(b);
        return (
          <div
            key={id}
            className="flex items-center gap-2 sm:gap-3 bg-white rounded-lg border border-gray-100 px-2.5 py-2"
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Flag teamId={m.homeTeamId} alt={m.homeTeam} />
              <span className="text-xs text-gray-600 truncate">{m.homeTeam}</span>
              <span className="text-[10px] text-gray-300 px-0.5 shrink-0">vs</span>
              <span className="text-xs text-gray-600 truncate">{m.awayTeam}</span>
              <Flag teamId={m.awayTeamId} alt={m.awayTeam} />
            </div>

            <div className="text-[11px] text-gray-500 shrink-0 text-right leading-tight">
              <div>
                Pron.: <span className="font-semibold text-gray-700">{p.homeScore}-{p.awayScore}</span>
              </div>
              <div>
                Real: <span className="font-semibold text-gray-700">{m.homeScore}-{m.awayScore}</span>
              </div>
            </div>

            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${lbl.cls}`}
            >
              +{b.points} · {lbl.text}
            </span>
          </div>
        );
      })}

      <div className="flex justify-end pt-1 px-1">
        <span className="text-xs font-semibold text-gray-600">Total: {total} pts</span>
      </div>
    </div>
  );
};

export default RankingBreakdown;
