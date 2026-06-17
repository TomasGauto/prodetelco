import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import GroupStandings from '../components/GroupStandings';
import GroupsFixture from '../components/GroupsFixture';
import MatchDetailsModal from '../components/MatchDetailsModal';

const Groups = () => {
  const [groupsData, setGroupsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [viewMode, setViewMode] = useState('groups'); // 'groups' | 'chrono'

  useEffect(() => {
    let matchesLoaded = false;
    let teamsLoaded = false;

    const checkDone = () => {
      if (matchesLoaded && teamsLoaded) setLoading(false);
    };

    const unsubMatches = onSnapshot(collection(db, 'matches'), (snap) => {
      setGroupsData(prev => {
        const next = { ...prev };
        snap.forEach((d) => {
          const m = { id: d.id, ...d.data() };
          if (!next[m.group]) next[m.group] = { matches: [], teams: [] };
          if (!next[m.group].matches.find(x => x.id === m.id)) {
            next[m.group].matches.push(m);
          }
        });
        return next;
      });
      matchesLoaded = true;
      checkDone();
    });

    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setGroupsData(prev => {
        const next = { ...prev };
        snap.forEach((d) => {
          const t = { id: d.id, ...d.data() };
          if (!next[t.group]) next[t.group] = { matches: [], teams: [] };
          next[t.group].teams = [...(next[t.group].teams || []).filter(x => x.id !== t.id), t];
        });
        return next;
      });
      teamsLoaded = true;
      checkDone();
    });

    return () => { unsubMatches(); unsubTeams(); };
  }, []);

  const sortedGroups = Object.keys(groupsData).sort();

  // Todos los partidos en una sola lista (memoizado para no recargar predicciones
  // en cada render). GroupsFixture los ordena por fecha internamente.
  const allMatches = useMemo(
    () => sortedGroups.flatMap((g) => groupsData[g].matches || []),
    [groupsData] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando grupos...</p>
      </div>
    );
  }

  if (sortedGroups.length === 0) {
    // Show sample data for development
    const sampleData = {
      A: {
        teams: [
          { id: 'MEX_A', name: 'México', fifaCode: 'MEX', group: 'A' },
          { id: 'RSA_A', name: 'Sudáfrica', fifaCode: 'RSA', group: 'A' },
          { id: 'KOR_A', name: 'Corea del Sur', fifaCode: 'KOR', group: 'A' },
          { id: 'CZE_A', name: 'Chequia', fifaCode: 'CZE', group: 'A' },
        ],
        matches: [
          {
            id: 'sample_1',
            group: 'A',
            homeTeamId: 'MEX_A',
            awayTeamId: 'RSA_A',
            homeTeam: 'México',
            awayTeam: 'Sudáfrica',
            date: new Date('2026-06-11T16:00:00'),
            homeScore: null,
            awayScore: null,
            round: 1,
            venue: 'Ciudad de México'
          },
          {
            id: 'sample_2',
            group: 'A',
            homeTeamId: 'KOR_A',
            awayTeamId: 'CZE_A',
            homeTeam: 'Corea del Sur',
            awayTeam: 'Chequia',
            date: new Date('2026-06-11T23:00:00'),
            homeScore: null,
            awayScore: null,
            round: 1,
            venue: 'Guadalajara'
          }
        ]
      }
    };

    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Datos de ejemplo:</strong> No hay datos en Firestore.
                Ejecutá <code className="bg-yellow-100 px-1 rounded">node initData.js</code> para cargar los partidos reales.
              </p>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Fase de Grupos</h1>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Object.keys(sampleData).map((group) => (
                <div key={group} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-indigo-600">
                    <h2 className="text-base font-bold text-white">Grupo {group}</h2>
                  </div>
                  <div className="p-4">
                    <GroupStandings
                      teams={sampleData[group].teams}
                      matches={sampleData[group].matches}
                    />
                    <GroupsFixture
                      group={group}
                      matches={sampleData[group].matches}
                      onMatchClick={setSelectedMatch}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {selectedMatch && (
          <MatchDetailsModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Fase de Grupos</h1>
            <div className="inline-flex bg-gray-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('groups')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  viewMode === 'groups' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Por grupo
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chrono')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  viewMode === 'chrono' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Cronológico
              </button>
            </div>
          </div>

          {viewMode === 'chrono' ? (
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <GroupsFixture
                matches={allMatches}
                onMatchClick={setSelectedMatch}
                showGroupBadge
              />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sortedGroups.map((group) => (
                <div key={group} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 bg-indigo-600">
                    <h2 className="text-base font-bold text-white">Grupo {group}</h2>
                  </div>
                  <div className="p-4">
                    <GroupStandings
                      teams={groupsData[group].teams || []}
                      matches={groupsData[group].matches || []}
                    />
                    <GroupsFixture
                      group={group}
                      matches={groupsData[group].matches || []}
                      onMatchClick={setSelectedMatch}
                    />
                  </div>
                </div>
              ))}
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

export default Groups;
