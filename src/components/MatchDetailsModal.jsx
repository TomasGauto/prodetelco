import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { getFlag } from '../utils/flags';
import { getRanking } from '../utils/fifaRankings';

const fmtDate = (ts) => {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : ts instanceof Date ? ts : new Date(ts.seconds * 1000);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const RankBadge = ({ fifaCode, name }) => {
  const r = getRanking(fifaCode);
  return (
    <div className="flex-1 text-center py-3">
      {r ? (
        <>
          <p className="text-2xl font-bold text-indigo-600">#{r.rank}</p>
          <p className="text-xs text-gray-400 mt-0.5">{r.points} pts FIFA</p>
        </>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-300">—</p>
          <p className="text-xs text-gray-400 mt-0.5">Sin ranking</p>
        </>
      )}
      <p className="text-xs font-medium text-gray-500 mt-1 truncate">{name}</p>
    </div>
  );
};

const MatchDetailsModal = ({ match, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const homeFifaCode = match.homeTeamId?.split('_')[0];
  const awayFifaCode = match.awayTeamId?.split('_')[0];
  const homeFlagUrl  = getFlag(homeFifaCode);
  const awayFlagUrl  = getFlag(awayFifaCode);
  const dateStr      = fmtDate(match.date);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(query(collection(db, 'predictions'), where('matchId', '==', match.id)));
        let home = 0, draw = 0, away = 0;
        snap.forEach(d => {
          const p = d.data();
          if (p.homeScore == null || p.awayScore == null) return;
          if (p.homeScore > p.awayScore) home++;
          else if (p.homeScore < p.awayScore) away++;
          else draw++;
        });
        setStats({ home, draw, away, total: home + draw + away });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [match.id]);

  const handleEsc = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  const pct = (n) => stats?.total > 0 ? Math.round((n / stats.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 pt-6 pb-10 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-indigo-200 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>

          {/* Teams */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex flex-col items-center gap-1 flex-1">
              {homeFlagUrl && <img src={homeFlagUrl} alt={match.homeTeam} className="w-10 h-7 object-cover rounded shadow" />}
              <span className="text-sm font-semibold text-center leading-tight">{match.homeTeam}</span>
            </div>
            <span className="text-indigo-300 text-xs font-bold shrink-0">vs</span>
            <div className="flex flex-col items-center gap-1 flex-1">
              {awayFlagUrl && <img src={awayFlagUrl} alt={match.awayTeam} className="w-10 h-7 object-cover rounded shadow" />}
              <span className="text-sm font-semibold text-center leading-tight">{match.awayTeam}</span>
            </div>
          </div>

          {/* Match info */}
          <div className="text-center text-indigo-200 text-xs space-y-0.5">
            {match.group && match.round && (
              <p>Grupo {match.group} · Jornada {match.round}</p>
            )}
            {match.venue && <p>{match.venue}</p>}
            {dateStr && <p>{dateStr}</p>}
          </div>
        </div>

        {/* Ranking cards */}
        <div className="relative mx-6 -mt-6 bg-white rounded-xl shadow-md border border-gray-100 flex divide-x divide-gray-100">
          <RankBadge fifaCode={homeFifaCode} name={match.homeTeam} />
          <div className="flex items-center px-3">
            <span className="text-xs text-gray-300 font-semibold">FIFA</span>
          </div>
          <RankBadge fifaCode={awayFifaCode} name={match.awayTeam} />
        </div>

        {/* Community predictions */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Pronosticos de la comunidad
            {stats && stats.total > 0 && (
              <span className="ml-1 font-normal normal-case">({stats.total} {stats.total === 1 ? 'usuario' : 'usuarios'})</span>
            )}
          </p>

          {loading ? (
            <p className="text-sm text-gray-400 text-center py-2">Cargando...</p>
          ) : !stats || stats.total === 0 ? (
            <p className="text-sm text-gray-400 text-center py-2">Todavia sin pronosticos</p>
          ) : (
            <div className="space-y-2">
              {[
                { label: 'Local', value: stats.home, pct: pct(stats.home), color: 'bg-indigo-500' },
                { label: 'Empate', value: stats.draw, pct: pct(stats.draw), color: 'bg-gray-400' },
                { label: 'Visitante', value: stats.away, pct: pct(stats.away), color: 'bg-rose-400' },
              ].map(({ label, pct: p, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-16 shrink-0">{label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${p}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-600 w-8 text-right">{p}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchDetailsModal;
