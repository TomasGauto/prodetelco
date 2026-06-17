import { useMemo, useState } from 'react';
import { getFlag } from '../utils/flags';

const POSITIONS = ['ALL', 'GK', 'DEF', 'MID', 'FWD'];

const POSITION_LABEL = {
  GK: 'Arquero',
  DEF: 'Defensor',
  MID: 'Mediocampista',
  FWD: 'Delantero',
};

const normalize = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

const PlayerSearch = ({
  players,
  pickedIds,
  countryCounts,
  onAdd,
  disabled,
}) => {
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('ALL');
  const [country, setCountry] = useState('ALL');

  const countries = useMemo(() => {
    const set = new Set(players.map((p) => p.country));
    return Array.from(set).sort();
  }, [players]);

  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return players
      .filter((p) => {
        if (position !== 'ALL' && p.position !== position) return false;
        if (country !== 'ALL' && p.country !== country) return false;
        if (term && !normalize(p.name).includes(term)) return false;
        return true;
      })
      .slice(0, 80);
  }, [players, search, position, country]);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-full">
      <div className="p-3 border-b border-gray-100 space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar jugador..."
          className="w-full text-sm px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-indigo-500"
        />
        <div className="flex gap-2">
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            className="text-sm px-2 py-1.5 rounded-lg border border-gray-200 bg-white flex-1"
          >
            {POSITIONS.map((p) => (
              <option key={p} value={p}>
                {p === 'ALL' ? 'Todas las posiciones' : POSITION_LABEL[p]}
              </option>
            ))}
          </select>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="text-sm px-2 py-1.5 rounded-lg border border-gray-200 bg-white flex-1"
          >
            <option value="ALL">Todos los países</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1 min-h-[300px] max-h-[60vh]">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No hay jugadores con esos filtros.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((p) => {
              const picked = pickedIds.has(p.id);
              const countryFull = (countryCounts[p.country] || 0) >= 3 && !picked;
              const flag = getFlag(p.country);

              return (
                <li
                  key={p.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50"
                >
                  {flag ? (
                    <img
                      src={flag}
                      alt={p.country}
                      className="w-7 h-5 object-cover rounded-sm shrink-0"
                    />
                  ) : (
                    <span className="w-7 h-5 inline-block bg-gray-200 rounded-sm" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {p.country} · {POSITION_LABEL[p.position]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAdd(p)}
                    disabled={disabled || picked || countryFull}
                    title={
                      picked
                        ? 'Ya está en el equipo'
                        : countryFull
                          ? 'Ya tenés 3 jugadores de este país'
                          : 'Agregar'
                    }
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shrink-0 ${
                      picked
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : countryFull
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50'
                    }`}
                  >
                    {picked ? '✓ En XI' : '+ Agregar'}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="px-3 py-2 text-[11px] text-gray-400 border-t border-gray-100">
        Mostrando {filtered.length} de {players.length}. Máx 3 jugadores por país.
      </p>
    </div>
  );
};

export default PlayerSearch;
