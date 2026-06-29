import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import GroupsFixture from '../components/GroupsFixture';
import MatchDetailsModal from '../components/MatchDetailsModal';

// Un partido es de eliminatorias si su round no es numerico (ej. "R32") o no
// tiene group (los de grupos siempre tienen letra de grupo).
const isKnockout = (m) => (m.round != null && Number.isNaN(Number(m.round))) || !m.group;

const Knockout = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'matches'), (snap) => {
      const ko = [];
      snap.forEach((d) => {
        const m = { id: d.id, ...d.data() };
        if (isKnockout(m)) ko.push(m);
      });
      setMatches(ko);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando eliminatorias...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <p className="text-indigo-500 text-xs font-semibold tracking-[0.2em] uppercase mb-2">
            Eliminatorias
          </p>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wide text-gray-900 mb-2">
            MANO A MANO
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Pronosticá el marcador de cada cruce. Se cierra 1 hora antes de cada partido.
          </p>

          {matches.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center">
              <p className="text-gray-500 text-sm">
                Cuando se definan los cruces vas a poder pronosticarlos acá.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <GroupsFixture matches={matches} onMatchClick={setSelectedMatch} />
            </div>
          )}
        </div>
      </div>
      {selectedMatch && (
        <MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      )}
    </>
  );
};

export default Knockout;
