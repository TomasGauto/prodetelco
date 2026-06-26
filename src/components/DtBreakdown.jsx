import { getFlag } from '../utils/flags';
import { playerPoints, dtTotal } from '../utils/dtPoints';

const fifaOf = (id) => (id || '').split('_')[0];
const r1 = (n) => Math.round(n * 10) / 10;

const Row = ({ id, playersMap, isCaptain, index, detail }) => {
  const p = playersMap[id] || {};
  const pts = playerPoints(id, index);
  const flag = getFlag(p.country || fifaOf(id));
  const ratings = detail || [];
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-2.5 py-1.5">
      {flag && <img src={flag} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />}
      <div className="flex-1 min-w-0">
        <span className="block text-xs text-gray-700 truncate">{p.name || '—'}</span>
        {ratings.length > 1 && (
          <span className="block text-[10px] text-gray-400 tabular-nums">
            {ratings.length} PJ · {ratings.map((x) => r1(x)).join(' + ')}
          </span>
        )}
      </div>
      {isCaptain && (
        <span className="text-[9px] font-bold bg-yellow-400 text-gray-900 px-1.5 py-0.5 rounded shrink-0">
          C ×2
        </span>
      )}
      <span className="text-xs font-semibold text-gray-600 shrink-0 tabular-nums w-10 text-right">
        {pts === 0 ? '—' : isCaptain ? r1(pts * 2) : r1(pts)}
      </span>
    </div>
  );
};

/**
 * Desglose del equipo DT. Muestra los puntos congelados de fechas ya cerradas
 * (banked) y, debajo, el aporte EN VIVO de cada jugador del XI actual (liveIndex,
 * capitán x2) por los partidos todavía no congelados.
 */
const DtBreakdown = ({ squad, playersMap, liveIndex, liveDetail, banked = 0 }) => {
  if (!playersMap) {
    return <p className="px-5 py-4 text-sm text-gray-400">Cargando desglose...</p>;
  }
  const ids = [
    squad.gk,
    ...(squad.defenders || []),
    ...(squad.midfielders || []),
    ...(squad.forwards || []),
  ].filter(Boolean);
  const scored = ids.filter((id) => playerPoints(id, liveIndex) > 0).length;
  const hasBanked = banked > 0;

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-3 sm:px-4 py-3 space-y-1.5">
      {hasBanked && (
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-lg px-2.5 py-1.5">
          <span className="text-[11px] font-semibold text-indigo-700">
            Fechas cerradas (congelado) 🔒
          </span>
          <span className="text-xs font-bold text-indigo-700 tabular-nums">{r1(banked)} pts</span>
        </div>
      )}
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1">
        {hasBanked ? 'En juego' : 'Desglose'} · {scored}/{ids.length} sumaron
      </p>
      {ids.map((id) => (
        <Row
          key={id}
          id={id}
          playersMap={playersMap}
          isCaptain={id === squad.captainId}
          index={liveIndex}
          detail={liveDetail ? liveDetail.get(id) : null}
        />
      ))}
      <div className="flex justify-end pt-1 px-1">
        <span className="text-xs font-semibold text-gray-600">Total: {dtTotal(squad, liveIndex)} pts</span>
      </div>
    </div>
  );
};

export default DtBreakdown;
