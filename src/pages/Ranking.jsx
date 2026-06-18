import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import UserAvatar from '../components/UserAvatar';
import RankingBreakdown from '../components/RankingBreakdown';
import DtBreakdown from '../components/DtBreakdown';
import { dtTotal } from '../utils/dtPoints';
import { useDtPuntajes } from '../hooks/useDtPuntajes';
import playersData from '../data/players.json';

const medal = (i) => ['🥇', '🥈', '🥉'][i] ?? null;

const displayName = (u) => u?.nickname || 'Jugador';

const Ranking = () => {
  const [tab, setTab] = useState('prode');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dtSquads, setDtSquads] = useState([]);
  const [dtLoaded, setDtLoaded] = useState(false);
  const [dtLoading, setDtLoading] = useState(false);

  const [matchesMap, setMatchesMap] = useState(null);
  const [expandedUid, setExpandedUid] = useState(null);
  const [dtPlayersMap, setDtPlayersMap] = useState(null);
  const [dtExpandedUid, setDtExpandedUid] = useState(null);

  const { liveIndex: dtLiveIndex } = useDtPuntajes();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const data = [];
      snap.forEach((d) => data.push({ id: d.id, ...d.data() }));
      setUsers(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Partidos en tiempo real para calcular el desglose de puntos al desplegar.
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'matches'), (snap) => {
      const m = {};
      snap.forEach((d) => { m[d.id] = d.data(); });
      setMatchesMap(m);
    });
    return () => unsub();
  }, []);

  const toggleExpand = (uid) =>
    setExpandedUid((cur) => (cur === uid ? null : uid));

  useEffect(() => {
    if (tab !== 'dt' || dtLoaded) return;
    const load = async () => {
      setDtLoading(true);
      try {
        // Planteles estáticos desde el bundle (0 lecturas); solo leemos dtSquads.
        const squadsSnap = await getDocs(collection(db, 'dtSquads'));
        const squads = squadsSnap.docs.map((d) => ({ uid: d.id, ...d.data() }));

        const pMap = {};
        playersData.forEach((p) => { pMap[p.id] = p; });

        squads.forEach((s) => {
          const captain = pMap[s.captainId];
          s.captainName = captain?.name || '—';
          s.captainCountry = captain?.country || null;
        });
        setDtPlayersMap(pMap);
        setDtSquads(squads);
        setDtLoaded(true);
      } catch (err) {
        console.error('Error cargando DT ranking:', err);
      } finally {
        setDtLoading(false);
      }
    };
    load();
  }, [tab, dtLoaded]);

  const usersMap = useMemo(() => {
    const m = {};
    users.forEach((u) => { m[u.id] = u; });
    return m;
  }, [users]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
  }, [users]);

  const sortedDt = useMemo(() => {
    return [...dtSquads]
      .map((s) => ({ ...s, dtPts: dtTotal(s, dtLiveIndex) }))
      .sort((a, b) => {
        const diff = b.dtPts - a.dtPts;
        if (diff !== 0) return diff;
        const an = displayName(usersMap[a.uid]);
        const bn = displayName(usersMap[b.uid]);
        return an.localeCompare(bn);
      });
  }, [dtSquads, usersMap, dtLiveIndex]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando ranking...</p>
      </div>
    );
  }

  const podium = sortedUsers.slice(0, 3);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="font-display text-5xl tracking-wide text-gray-900 mb-4">
          RANKING
        </h1>

        {/* Tabs */}
        <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setTab('prode')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'prode'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Prode
          </button>
          <button
            type="button"
            onClick={() => setTab('dt')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'dt'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            DT
          </button>
        </div>

        {tab === 'prode' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Podio</h2>
              </div>

              {podium.length === 0 ? (
                <p className="px-5 py-8 text-center text-gray-400">No hay usuarios para mostrar.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4">
                  {podium.map((u, i) => (
                    <div key={u.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                      <p className="text-2xl mb-1">{medal(i)}</p>
                      <div className="flex justify-center mb-2">
                        <UserAvatar
                          user={{ displayName: u.nickname }}
                          userData={u}
                          size="lg"
                        />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{displayName(u)}</p>
                      <p className="text-xl font-bold text-indigo-600 mt-1">{u.totalPoints || 0}</p>
                      <p className="text-[11px] text-gray-400">pts</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-5">
              <div className="px-5 py-3 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Posiciones</h2>
              </div>

              <div className="divide-y divide-gray-100">
                {sortedUsers.map((u, i) => {
                  const isOpen = expandedUid === u.id;
                  return (
                    <div key={u.id}>
                      <button
                        type="button"
                        onClick={() => toggleExpand(u.id)}
                        aria-expanded={isOpen}
                        className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${
                          isOpen ? 'bg-indigo-50' : 'hover:bg-indigo-50'
                        }`}
                      >
                        <div className="w-7 shrink-0 text-center">
                          {medal(i)
                            ? <span className="text-lg">{medal(i)}</span>
                            : <span className="text-sm font-semibold text-gray-400">{i + 1}</span>}
                        </div>
                        <UserAvatar
                          user={{ displayName: u.nickname }}
                          userData={u}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{displayName(u)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-indigo-600">{u.totalPoints || 0}</p>
                          <p className="text-xs text-gray-400">pts</p>
                        </div>
                        <svg
                          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {isOpen && <RankingBreakdown uid={u.id} matchesMap={matchesMap} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {tab === 'dt' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                Tabla DT
              </h2>
              <p className="text-[11px] text-gray-400">
                Suma de tu XI · capitán x2
              </p>
            </div>

            {dtLoading ? (
              <p className="px-5 py-8 text-center text-gray-400 text-sm">Cargando equipos...</p>
            ) : sortedDt.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-gray-400 text-sm mb-3">
                  Todavía nadie armó su equipo.
                </p>
                <a
                  href="/dt"
                  className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  Armá el tuyo →
                </a>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {sortedDt.map((s, i) => {
                  const u = usersMap[s.uid] || {};
                  const isOpen = dtExpandedUid === s.uid;
                  return (
                    <div key={s.uid}>
                      <button
                        type="button"
                        onClick={() => setDtExpandedUid((cur) => (cur === s.uid ? null : s.uid))}
                        aria-expanded={isOpen}
                        className={`w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors ${
                          isOpen ? 'bg-indigo-50' : 'hover:bg-indigo-50'
                        }`}
                      >
                        <div className="w-7 shrink-0 text-center">
                          {medal(i)
                            ? <span className="text-lg">{medal(i)}</span>
                            : <span className="text-sm font-semibold text-gray-400">{i + 1}</span>}
                        </div>
                        <UserAvatar
                          user={{ displayName: u.nickname }}
                          userData={u}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {displayName(u)}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {s.formation || '—'} · Capitán: {s.captainName}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-indigo-600">{s.dtPts}</p>
                          <p className="text-xs text-gray-400">pts</p>
                        </div>
                        <svg
                          className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {isOpen && <DtBreakdown squad={s} playersMap={dtPlayersMap} liveIndex={dtLiveIndex} banked={s.bankedPoints || 0} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Ranking;
