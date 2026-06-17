import { useEffect, useMemo, useState } from 'react';
import { useDtPuntajes } from '../hooks/useDtPuntajes';
import {
  collection, getDocs, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import PitchView from '../components/PitchView';
import PlayerSearch from '../components/PlayerSearch';
import OtherDTs from '../components/OtherDTs';

// Cierre para armar/editar el DT. Extendido 24hs (originalmente 2026-06-11T06:00Z).
const KICKOFF = new Date('2026-06-12T00:00:00-06:00');

const FORMATIONS = {
  '4-4-2': { gk: 1, def: 4, mid: 4, fwd: 2 },
  '4-3-3': { gk: 1, def: 4, mid: 3, fwd: 3 },
  '3-5-2': { gk: 1, def: 3, mid: 5, fwd: 2 },
};

const POSITION_KEY = { GK: 'gk', DEF: 'defenders', MID: 'midfielders', FWD: 'forwards' };

const makeEmpty = (formation) => ({
  gk: null,
  defenders: Array(FORMATIONS[formation].def).fill(null),
  midfielders: Array(FORMATIONS[formation].mid).fill(null),
  forwards: Array(FORMATIONS[formation].fwd).fill(null),
});

const fitFormation = (squad, fromFormation, toFormation) => {
  // Mantener jugadores que entran en la nueva formación, descartar el resto.
  const next = makeEmpty(toFormation);
  next.gk = squad.gk;
  next.defenders = squad.defenders
    .filter(Boolean)
    .slice(0, FORMATIONS[toFormation].def);
  next.midfielders = squad.midfielders
    .filter(Boolean)
    .slice(0, FORMATIONS[toFormation].mid);
  next.forwards = squad.forwards
    .filter(Boolean)
    .slice(0, FORMATIONS[toFormation].fwd);
  while (next.defenders.length < FORMATIONS[toFormation].def) next.defenders.push(null);
  while (next.midfielders.length < FORMATIONS[toFormation].mid) next.midfielders.push(null);
  while (next.forwards.length < FORMATIONS[toFormation].fwd) next.forwards.push(null);
  return next;
};

const DT = () => {
  const { currentUser } = useAuth();
  const { matches: puntajesData, index: dtIndex } = useDtPuntajes();
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formation, setFormation] = useState('4-4-2');
  const [squad, setSquad] = useState(makeEmpty('4-4-2'));
  const [captainId, setCaptainId] = useState(null);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  const [now, setNow] = useState(Date.now());
  const locked = now >= KICKOFF.getTime();

  const [view, setView] = useState('mine'); // 'mine' | 'others' | 'scores'
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  // Carga players y squad existente en paralelo
  useEffect(() => {
    const load = async () => {
      try {
        const [playersSnap, squadSnap] = await Promise.all([
          getDocs(collection(db, 'players')),
          getDoc(doc(db, 'dtSquads', currentUser.uid)),
        ]);

        const list = playersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPlayers(list);

        if (squadSnap.exists()) {
          const data = squadSnap.data();
          setFormation(data.formation || '4-4-2');
          setSquad({
            gk: data.gk || null,
            defenders: Array.isArray(data.defenders) ? data.defenders : [],
            midfielders: Array.isArray(data.midfielders) ? data.midfielders : [],
            forwards: Array.isArray(data.forwards) ? data.forwards : [],
          });
          setCaptainId(data.captainId || null);
        }
      } catch (err) {
        console.error('Error cargando DT:', err);
        setError('No se pudo cargar tu equipo.');
      } finally {
        setLoading(false);
      }
    };
    if (currentUser) load();
  }, [currentUser]);

  const playersMap = useMemo(() => {
    const m = {};
    players.forEach((p) => { m[p.id] = p; });
    return m;
  }, [players]);

  const pickedIds = useMemo(() => {
    const set = new Set();
    if (squad.gk) set.add(squad.gk);
    squad.defenders.forEach((id) => id && set.add(id));
    squad.midfielders.forEach((id) => id && set.add(id));
    squad.forwards.forEach((id) => id && set.add(id));
    return set;
  }, [squad]);

  const countryCounts = useMemo(() => {
    const counts = {};
    pickedIds.forEach((id) => {
      const p = playersMap[id];
      if (p) counts[p.country] = (counts[p.country] || 0) + 1;
    });
    return counts;
  }, [pickedIds, playersMap]);

  const filledCount = pickedIds.size;
  const totalSlots = 11;

  const handleChangeFormation = (next) => {
    if (next === formation || locked) return;
    setSquad((s) => fitFormation(s, formation, next));
    setFormation(next);
    setSavedAt(null);
  };

  const handleAdd = (player) => {
    if (locked || pickedIds.has(player.id)) return;
    if ((countryCounts[player.country] || 0) >= 3) {
      setError('Ya tenés 3 jugadores de ese país.');
      return;
    }
    setError('');

    const key = POSITION_KEY[player.position];
    setSquad((s) => {
      if (key === 'gk') {
        if (s.gk) {
          setError('Ya tenés un arquero. Quitalo primero.');
          return s;
        }
        return { ...s, gk: player.id };
      }
      const arr = [...s[key]];
      const idx = arr.findIndex((slot) => slot === null);
      if (idx === -1) {
        setError(`Ya tenés todos los ${POSITION_KEY[player.position]} cubiertos.`);
        return s;
      }
      arr[idx] = player.id;
      return { ...s, [key]: arr };
    });
    setSavedAt(null);
  };

  const handleRemove = (key, index) => {
    if (locked) return;
    setError('');
    setSquad((s) => {
      if (key === 'gk') {
        if (s.gk === captainId) setCaptainId(null);
        return { ...s, gk: null };
      }
      const arr = [...s[key]];
      if (arr[index] === captainId) setCaptainId(null);
      arr[index] = null;
      return { ...s, [key]: arr };
    });
    setSavedAt(null);
  };

  const handleToggleCaptain = (playerId) => {
    if (locked || !playerId) return;
    setCaptainId((c) => (c === playerId ? null : playerId));
    setSavedAt(null);
  };

  const handleSave = async () => {
    if (locked) return;
    if (filledCount < totalSlots) {
      setError(`Te faltan ${totalSlots - filledCount} jugadores.`);
      return;
    }
    if (!captainId) {
      setError('Elegí un capitán antes de guardar.');
      return;
    }
    if (!pickedIds.has(captainId)) {
      setError('El capitán no está en el XI.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await setDoc(
        doc(db, 'dtSquads', currentUser.uid),
        {
          formation,
          gk: squad.gk,
          defenders: squad.defenders,
          midfielders: squad.midfielders,
          forwards: squad.forwards,
          captainId,
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
      setSavedAt(Date.now());
    } catch (err) {
      console.error('Error guardando DT:', err);
      setError('No se pudo guardar tu equipo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando jugadores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <header className="mb-6">
          <p className="text-indigo-500 text-xs font-semibold tracking-[0.18em] uppercase mb-2">
            Armá tu equipo
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-gray-900">
            EL DT SOS VOS
          </h1>
          <p className="text-gray-500 text-sm mt-2 max-w-2xl">
            Elegí 11 jugadores (1 arquero + tu formación), marcá un capitán y vas
            sumando puntos según cómo jueguen en el Mundial. Máx 3 jugadores por país.
          </p>
        </header>

        {/* Tabs: Mi equipo / Otros DTs */}
        <div className="inline-flex bg-gray-100 rounded-xl p-1 mb-5">
          <button
            type="button"
            onClick={() => setView('mine')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              view === 'mine' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mi equipo
          </button>
          <button
            type="button"
            onClick={() => setView('others')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              view === 'others' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Otros DTs
          </button>
          <button
            type="button"
            onClick={() => setView('scores')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              view === 'scores' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Puntajes
          </button>
        </div>

        {view === 'scores' ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900">Puntajes de Partidos</h2>
              {puntajesData.length > 1 && (
                <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                  <button
                    onClick={() => setCurrentMatchIdx(prev => Math.max(0, prev - 1))}
                    disabled={currentMatchIdx === 0}
                    className="p-1.5 rounded-full hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm font-semibold text-gray-600 min-w-[3rem] text-center">
                    {currentMatchIdx + 1} / {puntajesData.length}
                  </span>
                  <button
                    onClick={() => setCurrentMatchIdx(prev => Math.min(puntajesData.length - 1, prev + 1))}
                    disabled={currentMatchIdx === puntajesData.length - 1}
                    className="p-1.5 rounded-full hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              )}
            </div>

            {puntajesData.length > 0 && (() => {
              const match = puntajesData[currentMatchIdx];
              // Group players by team (assuming first team is home, second is away in the json)
              const teams = [...new Set(match.dt_stats.players_performance.map(p => p.team))];
              const homeTeamCode = teams[0];
              const awayTeamCode = teams[1];
              
              const homePlayers = match.dt_stats.players_performance.filter(p => p.team === homeTeamCode);
              const awayPlayers = match.dt_stats.players_performance.filter(p => p.team === awayTeamCode);

              return (
                <div key={match.match_id} className="animate-in fade-in slide-in-from-bottom-2 duration-300 mb-8">
                  <h3 className="text-lg font-semibold bg-gray-100 p-3 rounded-lg text-gray-800 text-center">
                    {match.home_team} <span className="text-indigo-600 mx-2">{match.score}</span> {match.away_team}
                  </h3>
                  <p className="text-sm text-gray-600 mt-3 mb-6 px-2 text-center">{match.dt_stats.tactical_analysis}</p>
                  
                  <div className="grid lg:grid-cols-2 gap-6">
                    {/* Home Team */}
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                        <h4 className="font-bold text-gray-800">{match.home_team}</h4>
                        <span className="text-xs font-semibold text-gray-500">{homeTeamCode}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-white border-b">
                            <tr>
                              <th scope="col" className="px-4 py-2 text-gray-500 uppercase tracking-wider font-semibold text-xs">Jugador</th>
                              <th scope="col" className="px-4 py-2 text-gray-500 uppercase tracking-wider font-semibold text-xs text-right">Puntaje</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {homePlayers.map((p, i) => {
                              const official = playersMap[p.player_id] || Object.values(playersMap).find(op => op.name.toLowerCase() === p.name.toLowerCase());
                              const displayName = official ? official.name : p.name;
                              const displayPos = official ? official.position : p.position;
                              return (
                              <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-normal">
                                  <div className="font-semibold text-gray-800">{displayName} <span className="text-[10px] font-normal text-gray-500 ml-1">{displayPos}</span></div>
                                  <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{p.highlight}</div>
                                  {p.is_mvp && <span className="mt-1.5 inline-block bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold">MVP</span>}
                                </td>
                                <td className="px-4 py-3 font-bold text-indigo-600 align-top text-right text-lg">{p.rating.toFixed(1)}</td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Away Team */}
                    <div className="border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                        <h4 className="font-bold text-gray-800">{match.away_team}</h4>
                        <span className="text-xs font-semibold text-gray-500">{awayTeamCode}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-white border-b">
                            <tr>
                              <th scope="col" className="px-4 py-2 text-gray-500 uppercase tracking-wider font-semibold text-xs">Jugador</th>
                              <th scope="col" className="px-4 py-2 text-gray-500 uppercase tracking-wider font-semibold text-xs text-right">Puntaje</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {awayPlayers.map((p, i) => {
                              const official = playersMap[p.player_id] || Object.values(playersMap).find(op => op.name.toLowerCase() === p.name.toLowerCase());
                              const displayName = official ? official.name : p.name;
                              const displayPos = official ? official.position : p.position;
                              return (
                              <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-normal">
                                  <div className="font-semibold text-gray-800">{displayName} <span className="text-[10px] font-normal text-gray-500 ml-1">{displayPos}</span></div>
                                  <div className="text-[11px] text-gray-500 mt-0.5 leading-tight">{p.highlight}</div>
                                  {p.is_mvp && <span className="mt-1.5 inline-block bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold">MVP</span>}
                                </td>
                                <td className="px-4 py-3 font-bold text-indigo-600 align-top text-right text-lg">{p.rating.toFixed(1)}</td>
                              </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : view === 'others' ? (
          <OtherDTs playersMap={playersMap} currentUid={currentUser.uid} pointsIndex={dtIndex} />
        ) : (
        <>
        {/* Status bar */}
        <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3 mb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Formación</p>
              <div className="flex gap-1 mt-1">
                {Object.keys(FORMATIONS).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => handleChangeFormation(f)}
                    disabled={locked}
                    className={`px-3 py-1 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
                      formation === f
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Cubiertos</p>
              <p className="font-display text-2xl text-gray-900 tabular-nums">
                {filledCount}/{totalSlots}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Capitán</p>
              <p className="text-sm font-semibold text-gray-800 max-w-[160px] truncate">
                {captainId ? playersMap[captainId]?.name || '—' : 'sin elegir'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {locked ? (
              <p className="text-xs text-red-600 font-semibold">
                Equipo cerrado
              </p>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || filledCount < totalSlots || !captainId}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar equipo'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg px-3 py-2 mb-4">
            {error}
          </div>
        )}
        {savedAt && !error && (
          <div className="bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg px-3 py-2 mb-4">
            Equipo guardado. Podés volver a editar hasta el cierre del DT.
          </div>
        )}

        {/* Layout: Pitch + Search */}
        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <PitchView
              formation={formation}
              gk={squad.gk}
              defenders={squad.defenders}
              midfielders={squad.midfielders}
              forwards={squad.forwards}
              captainId={captainId}
              playersMap={playersMap}
              onRemove={handleRemove}
              onToggleCaptain={handleToggleCaptain}
              locked={locked}
            />
          </div>
          <div>
            {locked ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
                <p className="font-display text-2xl text-gray-900 mb-2">
                  Equipo cerrado
                </p>
                <p className="text-sm text-gray-500">
                  El armado del DT ya se cerró. Vas a ver los puntos
                  acumulados de tu XI a medida que se jueguen los partidos.
                </p>
              </div>
            ) : (
              <PlayerSearch
                players={players}
                pickedIds={pickedIds}
                countryCounts={countryCounts}
                onAdd={handleAdd}
                disabled={locked}
              />
            )}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default DT;
