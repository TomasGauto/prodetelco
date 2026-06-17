import { getFlag } from '../utils/flags';
import { playerPoints, squadPoints } from '../utils/dtPoints';

const fifaOf = (id) => (id || '').split('_')[0];
const r1 = (n) => Math.round(n * 10) / 10;

const Row = ({ id, playersMap, isCaptain, index }) => {
  const p = playersMap[id] || {};
  const pts = playerPoints(id, index);
  const flag = getFlag(p.country || fifaOf(id));
  return (
    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-100 px-2.5 py-1.5">
      {flag && <img src={flag} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />}
      <span className="text-xs text-gray-700 truncate flex-1">{p.name || '—'}</span>
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
 * Desglose del equipo DT: cuánto aporta cada jugador del XI (capitán x2).
 */
const DtBreakdown = ({ squad, playersMap, index }) => {
  if (!playersMap) {
    return <p className="px-5 py-4 text-sm text-gray-400">Cargando desglose...</p>;
  }
  const ids = [
    squad.gk,
    ...(squad.defenders || []),
    ...(squad.midfielders || []),
    ...(squad.forwards || []),
  ].filter(Boolean);
  const scored = ids.filter((id) => playerPoints(id, index) > 0).length;

  return (
    <div className="bg-gray-50 border-t border-gray-100 px-3 sm:px-4 py-3 space-y-1.5">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1">
        Desglose · {scored}/{ids.length} sumaron
      </p>
      {ids.map((id) => (
        <Row key={id} id={id} playersMap={playersMap} isCaptain={id === squad.captainId} index={index} />
      ))}
      <div className="flex justify-end pt-1 px-1">
        <span className="text-xs font-semibold text-gray-600">Total: {squadPoints(squad, index)} pts</span>
      </div>
    </div>
  );
};

export default DtBreakdown;
