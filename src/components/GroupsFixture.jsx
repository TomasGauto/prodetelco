import { useState, useEffect } from 'react';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getFlag } from '../utils/flags';

const fmtDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

// Las apuestas se cierran 1 hora antes del inicio de cada partido.
const LOCK_MS = 60 * 60 * 1000;

// Devuelve el kickoff en ms, soportando Timestamp de Firestore o Date.
const getKickoffMs = (date) => {
  if (!date) return null;
  if (typeof date.toDate === 'function') return date.toDate().getTime();
  if (date instanceof Date) return date.getTime();
  if (typeof date.seconds === 'number') return date.seconds * 1000;
  return null;
};

// Doble check verde estilo "guardado" para partidos ya pronosticados.
const SavedCheck = () => (
  <svg
    viewBox="0 0 24 24"
    className="w-3.5 h-3.5 text-green-500 shrink-0"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    role="img"
    aria-label="Pronóstico guardado"
  >
    <path d="M18 6 7 17l-5-5" />
    <path d="m22 10-7.5 7.5L13 16" />
  </svg>
);

const GroupsFixture = ({ group, matches, onMatchClick, showGroupBadge = false }) => {
  const { currentUser } = useAuth();
  const [predictions, setPredictions] = useState({});
  const [savedIds, setSavedIds] = useState({});
  const [saving, setSaving] = useState(null);
  const [saved, setSaved] = useState({});
  const [now, setNow] = useState(() => Date.now());

  // Refresca el "ahora" cada 30s para que el cierre se active sin recargar.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!currentUser || !matches.length) return;
    const load = async () => {
      const preds = {};
      const persisted = {};
      await Promise.all(matches.map(async m => {
        const ref = doc(db, 'predictions', `${currentUser.uid}_${m.id}`);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          preds[m.id] = snap.data();
          persisted[m.id] = true;
        }
      }));
      setPredictions(preds);
      setSavedIds(persisted);
    };
    load();
  }, [currentUser, matches]);

  const handleChange = (matchId, field, value) => {
    setPredictions(prev => ({
      ...prev,
      [matchId]: { ...(prev[matchId] || {}), [field]: value === '' ? '' : Number(value) }
    }));
  };

  const handleSave = async (match) => {
    const pred = predictions[match.id];
    if (!currentUser || pred?.homeScore === '' || pred?.awayScore === '' || pred?.homeScore == null || pred?.awayScore == null) return;
    // Cierre: no se puede guardar a menos de 1h del inicio del partido.
    const kickoffMs = getKickoffMs(match.date);
    if (kickoffMs != null && Date.now() >= kickoffMs - LOCK_MS) return;
    setSaving(match.id);
    try {
      const batch = writeBatch(db);
      const ref = doc(db, 'predictions', `${currentUser.uid}_${match.id}`);
      batch.set(ref, {
        userId: currentUser.uid,
        matchId: match.id,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        updatedAt: new Date(),
      }, { merge: true });
      await batch.commit();
      setSavedIds(prev => ({ ...prev, [match.id]: true }));
      setSaved(prev => ({ ...prev, [match.id]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [match.id]: false })), 2000);
    } finally {
      setSaving(null);
    }
  };

  const sorted = [...matches].sort((a, b) => {
    const ta = a.date?.seconds || 0, tb = b.date?.seconds || 0;
    return ta - tb || a.round - b.round;
  });

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mis predicciones</h4>
      {sorted.map(match => {
        const pred = predictions[match.id] || {};
        const isSaving = saving === match.id;
        const isSaved = saved[match.id];
        const isPersisted = savedIds[match.id];
        const kickoffMs = getKickoffMs(match.date);
        const isLocked = kickoffMs != null && now >= kickoffMs - LOCK_MS;
        const homeFifaCode = match.homeTeamId?.split('_')[0];
        const awayFifaCode = match.awayTeamId?.split('_')[0];
        const homeFlagUrl = getFlag(homeFifaCode);
        const awayFlagUrl = getFlag(awayFifaCode);
        return (
          <div key={match.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  {showGroupBadge && (
                    <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">
                      {match.group}
                    </span>
                  )}
                  J{match.round} · {match.venue}
                  {isPersisted && <SavedCheck />}
                  {isLocked && (
                    <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                      🔒 Cerrado
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{fmtDate(match.date)}</p>
              </div>
              {onMatchClick && (
                <button
                  onClick={e => { e.stopPropagation(); onMatchClick(match); }}
                  className="text-indigo-400 hover:text-indigo-600 transition-colors text-base leading-none ml-2"
                  title="Ver detalles del partido"
                >
                  ℹ
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-xs text-right text-gray-700 font-medium truncate flex items-center justify-end gap-1">
                {homeFlagUrl && <img src={homeFlagUrl} alt={match.homeTeam} className="w-5 h-4 object-cover rounded-sm" />}
                {match.homeTeam}
              </span>
              <input
                type="number" min="0" max="20"
                value={pred.homeScore ?? ''}
                onChange={e => handleChange(match.id, 'homeScore', e.target.value)}
                disabled={isLocked}
                className="w-10 text-center border border-gray-300 rounded py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                placeholder="–"
              />
              <span className="text-gray-400 text-xs">vs</span>
              <input
                type="number" min="0" max="20"
                value={pred.awayScore ?? ''}
                onChange={e => handleChange(match.id, 'awayScore', e.target.value)}
                disabled={isLocked}
                className="w-10 text-center border border-gray-300 rounded py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                placeholder="–"
              />
              <span className="flex-1 text-xs text-left text-gray-700 font-medium truncate flex items-center gap-1">
                {awayFlagUrl && <img src={awayFlagUrl} alt={match.awayTeam} className="w-5 h-4 object-cover rounded-sm" />}
                {match.awayTeam}
              </span>
              <button
                onClick={() => handleSave(match)}
                disabled={isLocked || isSaving || pred.homeScore == null || pred.awayScore == null || pred.homeScore === '' || pred.awayScore === ''}
                title={isLocked ? 'Cerrado: faltan menos de 60 min para el partido' : undefined}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  isLocked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : isSaved
                    ? 'bg-green-100 text-green-700'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40'
                }`}
              >
                {isLocked ? '🔒' : isSaved ? '✓' : isSaving ? '...' : 'OK'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GroupsFixture;