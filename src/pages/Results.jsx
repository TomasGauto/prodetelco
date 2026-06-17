import { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const Results = () => {
  const { currentUser, userData } = useAuth();
  const [matches, setMatches] = useState([]);
  const [editing, setEditing] = useState(null); // match id
  const [scores, setScores] = useState({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'matches'), (snap) => {
      const data = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() }));
      data.sort((a,b) => (a.date?.seconds || 0) - (b.date?.seconds || 0));
      setMatches(data);
    });
    return () => unsub();
  }, []);

  const canEdit = !!userData?.isAdmin;

  const startEdit = (m) => {
    setEditing(m.id);
    setScores({ score1: m.homeScore ?? '', score2: m.awayScore ?? '' });
  };

  const cancelEdit = () => { setEditing(null); setScores({}); };

  const saveResult = async (matchId) => {
    const s1 = scores.score1 === '' ? null : parseInt(scores.score1);
    const s2 = scores.score2 === '' ? null : parseInt(scores.score2);
    try {
      await updateDoc(doc(db, 'matches', matchId), { homeScore: s1, awayScore: s2 });
      setEditing(null);
    } catch (err) {
      console.error('Error saving result', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Resultados</h1>

        {!canEdit && (
          <p className="text-sm text-gray-500 mb-4">Solo administradores pueden editar resultados. Aquí se muestran los resultados oficiales.</p>
        )}

        <div className="space-y-3">
          {matches.map(m => (
            <div key={m.id} className="bg-white p-4 rounded-lg shadow-sm flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-800">{m.homeTeam} <span className="text-gray-400">vs</span> {m.awayTeam}</div>
                <div className="text-sm text-gray-500">{m.group} • {m.date ? new Date(m.date.seconds * 1000).toLocaleString() : 'Fecha pendiente'}</div>
              </div>
              <div className="flex items-center gap-4">
                {editing === m.id ? (
                  <>
                    <input type="number" min="0" value={scores.score1} onChange={(e)=>setScores(s=>({...s, score1: e.target.value}))} className="w-14 p-1 border rounded" />
                    <span className="text-gray-600">-</span>
                    <input type="number" min="0" value={scores.score2} onChange={(e)=>setScores(s=>({...s, score2: e.target.value}))} className="w-14 p-1 border rounded" />
                    <button onClick={()=>saveResult(m.id)} className="ml-2 px-3 py-1 bg-indigo-600 text-white rounded">Guardar</button>
                    <button onClick={cancelEdit} className="ml-2 px-3 py-1 bg-gray-100 rounded">Cancelar</button>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-semibold">{m.homeScore ?? '-'} <span className="text-gray-500">-</span> {m.awayScore ?? '-'}</div>
                    {canEdit && <button onClick={()=>startEdit(m)} className="ml-4 px-3 py-1 bg-indigo-50 text-indigo-700 rounded">Editar</button>}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Results;
