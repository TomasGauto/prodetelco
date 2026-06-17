import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import UserAvatar from './UserAvatar';
import PitchView from './PitchView';
import { squadPoints } from '../utils/dtPoints';

const noop = () => {};

const asArray = (v) => (Array.isArray(v) ? v : []);

// Muestra los equipos DT del resto de los usuarios (solo lectura).
const OtherDTs = ({ playersMap, currentUid, pointsIndex }) => {
  const [squads, setSquads] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [squadsSnap, usersSnap] = await Promise.all([
          getDocs(collection(db, 'dtSquads')),
          getDocs(collection(db, 'users')),
        ]);
        if (!active) return;
        const usersMap = {};
        usersSnap.forEach((d) => { usersMap[d.id] = d.data(); });
        setUsers(usersMap);
        setSquads(squadsSnap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error cargando otros DTs:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const others = useMemo(() => {
    return squads
      .filter((s) => s.uid !== currentUid)
      .map((s) => ({ ...s, dtPts: squadPoints(s, pointsIndex) }))
      .sort((a, b) => {
        const diff = b.dtPts - a.dtPts;
        if (diff !== 0) return diff;
        const an = users[a.uid]?.nickname || '';
        const bn = users[b.uid]?.nickname || '';
        return an.localeCompare(bn);
      });
  }, [squads, users, currentUid, pointsIndex]);

  if (loading) {
    return <p className="text-center text-gray-400 text-sm py-16">Cargando equipos...</p>;
  }

  if (others.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
        <p className="text-4xl mb-3">🧤</p>
        <p className="text-gray-500 text-sm">
          Todavía nadie más armó su equipo. Cuando lo hagan, vas a poder ver sus XI acá.
        </p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {others.map((s) => {
        const u = users[s.uid] || {};
        const captain = s.captainId ? playersMap[s.captainId] : null;
        return (
          <div key={s.uid} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <UserAvatar user={{ displayName: u.nickname }} userData={u} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {u.nickname || 'Jugador'}
                </p>
                <p className="text-[11px] text-gray-400 truncate">
                  {s.formation || '—'} · Capitán: {captain?.name || '—'}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-indigo-600 leading-none">{s.dtPts}</p>
                <p className="text-[10px] text-gray-400">pts</p>
              </div>
            </div>
            <div className="p-3">
              <PitchView
                formation={s.formation || '4-4-2'}
                gk={s.gk || null}
                defenders={asArray(s.defenders)}
                midfielders={asArray(s.midfielders)}
                forwards={asArray(s.forwards)}
                captainId={s.captainId || null}
                playersMap={playersMap}
                onRemove={noop}
                onToggleCaptain={noop}
                locked
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OtherDTs;
