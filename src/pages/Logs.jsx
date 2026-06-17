import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection, onSnapshot, query, orderBy, limit, getDocs, where,
} from 'firebase/firestore';
import { db } from '../firebase';
import UserAvatar from '../components/UserAvatar';
import UserProfileModal from '../components/UserProfileModal';
import { getFlag } from '../utils/flags';

const fmtTime = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const UserChip = ({ userId, userData, children, onOpenProfile }) => (
  <button
    onClick={() => onOpenProfile(userId, userData)}
    className="hover:underline decoration-indigo-400 decoration-dotted underline-offset-2 transition-colors hover:text-indigo-700 focus:outline-none"
  >
    {children}
  </button>
);

const Logs = () => {
  const [logs, setLogs]       = useState([]);
  const [users, setUsers]     = useState({});
  const [matches, setMatches] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [matchFilter, setMatchFilter] = useState('');     // matchId, '' = todos
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filterLoading, setFilterLoading] = useState(false);

  const openProfile = useCallback((userId, userData) => {
    setSelected({
      userId,
      userData,
      user: { displayName: userData.nickname, photoURL: userData.photoURL },
    });
  }, []);

  useEffect(() => {
    let logsReady = false, staticReady = false;
    const tryDone = () => { if (logsReady && staticReady) setLoading(false); };

    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      const m = {};
      snap.forEach(d => { m[d.id] = d.data(); });
      setUsers(m);
    });

    getDocs(collection(db, 'matches')).then(snap => {
      const m = {};
      snap.forEach(d => { m[d.id] = d.data(); });
      setMatches(m);
      staticReady = true;
      tryDone();
    });

    const q = query(collection(db, 'predictions'), orderBy('updatedAt', 'desc'), limit(200));
    const unsubLogs = onSnapshot(q, snap => {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      setLogs(items);
      logsReady = true;
      tryDone();
    });

    return () => { unsubUsers(); unsubLogs(); };
  }, []);

  // Al filtrar por partido, traemos TODAS sus predicciones (no solo las 200 recientes).
  useEffect(() => {
    if (!matchFilter) { setFilteredLogs([]); return; }
    let active = true;
    setFilterLoading(true);
    getDocs(query(collection(db, 'predictions'), where('matchId', '==', matchFilter)))
      .then(snap => {
        if (!active) return;
        const items = [];
        snap.forEach(d => items.push({ id: d.id, ...d.data() }));
        items.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
        setFilteredLogs(items);
      })
      .finally(() => { if (active) setFilterLoading(false); });
    return () => { active = false; };
  }, [matchFilter]);

  // Partidos para el selector, agrupados por grupo y ordenados por jornada.
  const matchOptions = useMemo(() => {
    const byGroup = {};
    Object.entries(matches).forEach(([id, m]) => {
      const g = m.group || '—';
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push({ id, ...m });
    });
    Object.values(byGroup).forEach(list =>
      list.sort((a, b) => (a.round - b.round) || (a.homeTeam || '').localeCompare(b.homeTeam || ''))
    );
    return Object.keys(byGroup).sort().map(g => ({ group: g, matches: byGroup[g] }));
  }, [matches]);

  const displayLogs = matchFilter ? filteredLogs : logs;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando actividad...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="font-display text-5xl tracking-wide text-gray-900 mb-5">ACTIVIDAD</h1>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col" style={{ height: 'calc(100vh - 140px)', minHeight: '500px' }}>
          <div className="px-4 py-3 border-b border-gray-100 shrink-0 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              📋 Predicciones
              <span className="text-xs font-normal text-gray-400">
                {displayLogs.length} {matchFilter ? 'en este partido' : 'registradas'}
              </span>
            </h2>
            <select
              value={matchFilter}
              onChange={e => setMatchFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[60%] sm:max-w-xs"
            >
              <option value="">Todos los partidos</option>
              {matchOptions.map(({ group, matches: ms }) => (
                <optgroup key={group} label={`Grupo ${group}`}>
                  {ms.map(m => (
                    <option key={m.id} value={m.id}>
                      J{m.round} · {m.homeTeam} vs {m.awayTeam}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3">
            {filterLoading ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-sm">Cargando predicciones...</p>
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm">
                  {matchFilter
                    ? 'Nadie predijo este partido todavía'
                    : 'No hay predicciones registradas aún'}
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {displayLogs.map(log => {
                  const u     = users[log.userId] || {};
                  const match = matches[log.matchId] || {};
                  const name  = u.nickname || 'Jugador';
                  const homeFlagUrl = getFlag(match.homeTeamId?.split('_')[0]);
                  const awayFlagUrl = getFlag(match.awayTeamId?.split('_')[0]);
                  return (
                    <div key={log.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => openProfile(log.userId, u)}
                        className="shrink-0 hover:opacity-80 transition-opacity focus:outline-none"
                      >
                        <UserAvatar
                          user={{ displayName: u.nickname, photoURL: u.photoURL }}
                          userData={u}
                          size="sm"
                        />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 leading-snug">
                          <UserChip userId={log.userId} userData={u} onOpenProfile={openProfile}>
                            <span className="font-semibold text-gray-900">{name}</span>
                          </UserChip>
                          {' predijo '}
                          <span className="font-medium">
                            {homeFlagUrl && <img src={homeFlagUrl} alt={match.homeTeam || ''} className="inline-block w-4 h-3 mr-1" />}
                            {match.homeTeam || '—'}
                            <span className="mx-1.5 text-indigo-600 font-bold tabular-nums">
                              {log.homeScore}–{log.awayScore}
                            </span>
                            {match.awayTeam || '—'}
                            {awayFlagUrl && <img src={awayFlagUrl} alt={match.awayTeam || ''} className="inline-block w-4 h-3 ml-1" />}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtTime(log.updatedAt)}</p>
                      </div>
                      <span className="text-xs text-gray-300 shrink-0">J{match.round}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <UserProfileModal
          userId={selected.userId}
          userData={selected.userData}
          user={selected.user}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default Logs;