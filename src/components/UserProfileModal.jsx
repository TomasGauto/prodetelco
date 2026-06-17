import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import UserAvatar from './UserAvatar';

const FLAGS = {
  MEX: '🇲🇽', RSA: '🇿🇦', KOR: '🇰🇷', CZE: '🇨🇿',
  CAN: '🇨🇦', BIH: '🇧🇦', QAT: '🇶🇦', SUI: '🇨🇭',
  BRA: '🇧🇷', MAR: '🇲🇦', HAI: '🇭🇹', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  USA: '🇺🇸', PAR: '🇵🇾', AUS: '🇦🇺', TUR: '🇹🇷',
  GER: '🇩🇪', CUW: '🇨🇼', CIV: '🇨🇮', ECU: '🇪🇨',
  NED: '🇳🇱', JPN: '🇯🇵', SWE: '🇸🇪', TUN: '🇹🇳',
  BEL: '🇧🇪', EGY: '🇪🇬', IRN: '🇮🇷', NZL: '🇳🇿',
  ESP: '🇪🇸', CPV: '🇨🇻', KSA: '🇸🇦', URU: '🇺🇾',
  FRA: '🇫🇷', SEN: '🇸🇳', IRQ: '🇮🇶', NOR: '🇳🇴',
  ARG: '🇦🇷', ALG: '🇩🇿', AUT: '🇦🇹', JOR: '🇯🇴',
  POR: '🇵🇹', COD: '🇨🇩', UZB: '🇺🇿', COL: '🇨🇴',
  ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', CRO: '🇭🇷', GHA: '🇬🇭', PAN: '🇵🇦',
};
const flag = (id) => FLAGS[id?.split('_')[0]] || '';

// ── UserProfileModal ──────────────────────────────────────────────────────────
// Props:
//   userId   – UID del usuario a mostrar
//   userData – datos del usuario ya cargados (de la colección users)
//   user     – objeto { displayName, email, photoURL }
//   onClose  – función para cerrar el modal

const UserProfileModal = ({ userId, userData = {}, user = {}, onClose }) => {
  const [predictions, setPredictions] = useState([]);
  const [matches, setMatches]         = useState({});
  const [loading, setLoading]         = useState(true);

  const name = userData.nickname || 'Jugador';

  useEffect(() => {
    const load = async () => {
      const [predsSnap, matchesSnap] = await Promise.all([
        getDocs(query(collection(db, 'predictions'), where('userId', '==', userId))),
        getDocs(collection(db, 'matches')),
      ]);

      const matchMap = {};
      matchesSnap.forEach(d => { matchMap[d.id] = d.data(); });
      setMatches(matchMap);

      const preds = [];
      predsSnap.forEach(d => preds.push({ id: d.id, ...d.data() }));
      // Ordenar por updatedAt desc, tomar las últimas 5
      preds.sort((a, b) => {
        const ta = a.updatedAt?.seconds || 0;
        const tb = b.updatedAt?.seconds || 0;
        return tb - ta;
      });
      setPredictions(preds);
      setLoading(false);
    };
    load();
  }, [userId]);

  const handleEsc = useCallback((e) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden z-10"
        onClick={e => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 px-6 pt-6 pb-10 text-white text-center relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-indigo-200 hover:text-white transition-colors text-lg leading-none"
          >
            ✕
          </button>
          <div className="flex justify-center mb-3">
            <UserAvatar user={user} userData={userData} size="xl" />
          </div>
          <h2 className="text-xl font-bold">{name}</h2>
        </div>

        {/* Stats — superpuestas sobre el borde del header */}
        <div className="mx-6 -mt-6 bg-white rounded-xl shadow-md border border-gray-100 flex divide-x divide-gray-100">
          <div className="flex-1 py-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {loading ? '…' : predictions.length}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">predicciones</p>
          </div>
          <div className="flex-1 py-3 text-center">
            <p className="text-2xl font-bold text-indigo-600">
              {userData.totalPoints ?? 0}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">puntos</p>
          </div>
        </div>

        {/* Últimas predicciones */}
        <div className="px-6 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Últimas predicciones
          </p>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Cargando…</p>
          ) : predictions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin predicciones todavía</p>
          ) : (
            <div className="space-y-2">
              {predictions.slice(0, 5).map(p => {
                const m = matches[p.matchId] || {};
                return (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 truncate flex-1">
                      {flag(m.homeTeamId)}&thinsp;{m.homeTeam || '?'}
                    </span>
                    <span className="mx-3 font-bold text-indigo-600 tabular-nums shrink-0">
                      {p.homeScore}–{p.awayScore}
                    </span>
                    <span className="text-gray-600 truncate flex-1 text-right">
                      {m.awayTeam || '?'}&thinsp;{flag(m.awayTeamId)}
                    </span>
                  </div>
                );
              })}
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

export default UserProfileModal;
