import { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import UserAvatar from '../components/UserAvatar';
import { getFlag } from '../utils/flags';

const COLORS = [
  '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6',
  '#22c55e', '#84cc16', '#eab308', '#f97316',
  '#ef4444', '#ec4899', '#a855f7', '#6b7280',
  '#1e40af', '#065f46', '#7c2d12', '#581c87',
];

const EMOJIS = [
  '⚽', '🏆', '🥅', '🎯', '🏅', '🥇', '🎮', '🎲',
  '🦁', '🐯', '🐻', '🐺', '🦅', '🦈', '🐉', '🦊',
  '😎', '🤩', '🥳', '😈', '🤖', '👑', '💪', '🔥',
  '⭐', '🌟', '💥', '🚀', '🎸', '🎵', '🍕', '🌮',
  '🐬', '🦋', '🌊', '⚡', '❄️', '🌈', '💎', '🎃',
  '🦄', '🐲', '🌙', '☀️', '🎭', '🎨', '🧩', '🎪',
];

const fmtDate = (ts) => {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000);
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const toSortableTime = (ts) => {
  if (!ts) return 0;
  if (typeof ts.seconds === 'number') return ts.seconds;
  if (ts.toDate) return Math.floor(ts.toDate().getTime() / 1000);
  if (ts instanceof Date) return Math.floor(ts.getTime() / 1000);
  return 0;
};

const Profile = () => {
  const { currentUser, userData } = useAuth();
  const [color, setColor] = useState('#6366f1');
  const [emoji, setEmoji] = useState('⚽');
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [matchesById, setMatchesById] = useState({});
  const [userPredictions, setUserPredictions] = useState([]);
  const [editablePredictions, setEditablePredictions] = useState({});
  const [savingPrediction, setSavingPrediction] = useState(null);
  const [savedPrediction, setSavedPrediction] = useState({});

  useEffect(() => {
    if (userData?.avatarColor) setColor(userData.avatarColor);
    if (userData?.avatarEmoji) setEmoji(userData.avatarEmoji);
    if (userData?.nickname) setNickname(userData.nickname);
  }, [userData]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'matches'), (snap) => {
      const next = {};
      snap.forEach((d) => {
        next[d.id] = { id: d.id, ...d.data() };
      });
      setMatchesById(next);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setUserPredictions([]);
      setEditablePredictions({});
      return;
    }

    const q = query(collection(db, 'predictions'), where('userId', '==', currentUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      const editable = {};

      snap.forEach((d) => {
        const p = { id: d.id, ...d.data() };
        list.push(p);

        if (p.matchId && p.homeScore != null && p.awayScore != null) {
          editable[p.matchId] = {
            homeScore: p.homeScore,
            awayScore: p.awayScore,
          };
        }
      });

      setUserPredictions(list);
      setEditablePredictions(editable);
    });

    return () => unsub();
  }, [currentUser]);

  const predictionsDone = useMemo(() => {
    return userPredictions
      .map((p) => ({ ...p, match: matchesById[p.matchId] }))
      .filter((p) => p.match && p.homeScore != null && p.awayScore != null)
      .sort((a, b) => {
        const bTime = toSortableTime(b.updatedAt || b.match?.date);
        const aTime = toSortableTime(a.updatedAt || a.match?.date);
        return bTime - aTime;
      });
  }, [userPredictions, matchesById]);

  const handleSave = async () => {
    if (!currentUser) return;

    setSaving(true);
    await setDoc(doc(db, 'users', currentUser.uid), {
      avatarColor: color,
      avatarEmoji: emoji,
      nickname: nickname || '',
    }, { merge: true });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handlePredictionChange = (matchId, field, value) => {
    setEditablePredictions((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || {}),
        [field]: value === '' ? '' : Number(value),
      },
    }));
  };

  const handlePredictionSave = async (matchId) => {
    if (!currentUser) return;
    const pred = editablePredictions[matchId];
    if (!pred) return;
    if (pred.homeScore === '' || pred.awayScore === '') return;
    if (pred.homeScore == null || pred.awayScore == null) return;

    setSavingPrediction(matchId);
    try {
      const batch = writeBatch(db);
      const ref = doc(db, 'predictions', `${currentUser.uid}_${matchId}`);
      batch.set(ref, {
        userId: currentUser.uid,
        matchId,
        homeScore: pred.homeScore,
        awayScore: pred.awayScore,
        updatedAt: new Date(),
      }, { merge: true });
      await batch.commit();

      setSavedPrediction((prev) => ({ ...prev, [matchId]: true }));
      setTimeout(() => {
        setSavedPrediction((prev) => ({ ...prev, [matchId]: false }));
      }, 1800);
    } finally {
      setSavingPrediction(null);
    }
  };

  const previewData = { avatarColor: color, avatarEmoji: emoji };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Mi perfil</h1>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
              <UserAvatar user={currentUser} userData={userData} size="lg" />
              <div>
                <p className="font-semibold text-gray-800 text-lg">
                  {userData?.nickname || 'Jugador'}
                </p>
                <p className="text-xs text-gray-400">Tu identidad pública</p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-700 mb-4">Informacion publica</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Nickname</label>
                  <input
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Tu apodo publico"
                    maxLength={30}
                    className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="font-semibold text-gray-700 mb-5">Personalizar avatar</h2>

              <div className="flex justify-center mb-6">
                <div className="flex flex-col items-center gap-2">
                  <UserAvatar user={currentUser} userData={previewData} size="xl" />
                  <p className="text-xs text-gray-400">Vista previa</p>
                </div>
              </div>

              <div className="mb-5">
                <p className="text-sm font-medium text-gray-600 mb-3">Color de fondo</p>
                <div className="grid grid-cols-8 gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      title={c}
                      className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                        color === c ? 'ring-2 ring-offset-2 ring-gray-700 scale-110' : ''
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-gray-600 mb-3">Icono</p>
                <div className="grid grid-cols-8 gap-1">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmoji(e)}
                      className={`h-9 w-9 text-lg rounded-lg flex items-center justify-center transition-colors ${
                        emoji === e ? 'bg-indigo-100 ring-2 ring-indigo-500' : 'hover:bg-gray-100'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  saved
                    ? 'bg-green-500 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
                }`}
              >
                {saved ? 'Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:sticky lg:top-20">
              <div className="px-4 py-3 border-b border-gray-100 bg-indigo-600">
                <h2 className="text-sm font-semibold text-white">Predicciones hechas</h2>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-3 space-y-3">
                {predictionsDone.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Todavia no tenes predicciones guardadas.</p>
                ) : (
                  predictionsDone.map((p) => {
                    const match = p.match;
                    const draft = editablePredictions[match.id] || {};
                    const isSaving = savingPrediction === match.id;
                    const isSaved = !!savedPrediction[match.id];
                    const homeFlag = getFlag(match.homeTeamId?.split('_')[0]);
                    const awayFlag = getFlag(match.awayTeamId?.split('_')[0]);

                    return (
                      <div key={p.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                        <p className="text-[11px] text-gray-500 mb-2">
                          {match.group ? `Grupo ${match.group}` : 'Partido'} - {fmtDate(match.date || p.updatedAt)}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="flex-1 text-xs text-right text-gray-700 font-medium truncate flex items-center justify-end gap-1">
                            {homeFlag && <img src={homeFlag} alt={match.homeTeam} className="w-5 h-4 object-cover rounded-sm" />}
                            {match.homeTeam}
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={draft.homeScore ?? ''}
                            onChange={(e) => handlePredictionChange(match.id, 'homeScore', e.target.value)}
                            className="w-10 text-center border border-gray-300 rounded py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="text-gray-400 text-xs">vs</span>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={draft.awayScore ?? ''}
                            onChange={(e) => handlePredictionChange(match.id, 'awayScore', e.target.value)}
                            className="w-10 text-center border border-gray-300 rounded py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <span className="flex-1 text-xs text-left text-gray-700 font-medium truncate flex items-center gap-1">
                            {awayFlag && <img src={awayFlag} alt={match.awayTeam} className="w-5 h-4 object-cover rounded-sm" />}
                            {match.awayTeam}
                          </span>
                          <button
                            onClick={() => handlePredictionSave(match.id)}
                            disabled={isSaving || draft.homeScore === '' || draft.awayScore === '' || draft.homeScore == null || draft.awayScore == null}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              isSaved
                                ? 'bg-green-100 text-green-700'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40'
                            }`}
                          >
                            {isSaved ? 'OK' : isSaving ? '...' : 'Guardar'}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Profile;
