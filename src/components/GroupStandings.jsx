import { getFlag } from '../utils/flags';

const calcStandings = (teams, matches) => {
  const s = Object.fromEntries(teams.map(t => [t.id, {
    ...t, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0
  }]));

  matches.forEach(m => {
    if (m.homeScore === null || m.awayScore === null) return;
    const h = s[m.homeTeamId], a = s[m.awayTeamId];
    if (!h || !a) return;
    h.played++; a.played++;
    h.gf += m.homeScore; h.ga += m.awayScore;
    a.gf += m.awayScore; a.ga += m.homeScore;
    h.gd = h.gf - h.ga; a.gd = a.gf - a.ga;
    if (m.homeScore > m.awayScore)      { h.won++; a.lost++; h.pts += 3; }
    else if (m.homeScore < m.awayScore) { a.won++; h.lost++; a.pts += 3; }
    else                                { h.drawn++; a.drawn++; h.pts++; a.pts++; }
  });

  return Object.values(s).sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.id.localeCompare(b.id)
  );
};

const cols = [
  { key: 'pos',    label: '#',  fn: (_, i) => i + 1 },
  { key: 'name',   label: 'Equipo', fn: t => {
    const flagUrl = getFlag(t.fifaCode);
    return (
      <span className="flex items-center gap-1">
        {flagUrl && <img src={flagUrl} alt={t.name} className="w-5 h-4 object-cover rounded-sm" />}
        <span>{t.name}</span>
      </span>
    );
  }},
  { key: 'played', label: 'PJ', fn: t => t.played },
  { key: 'won',    label: 'G',  fn: t => t.won },
  { key: 'drawn',  label: 'E',  fn: t => t.drawn },
  { key: 'lost',   label: 'P',  fn: t => t.lost },
  { key: 'gf',     label: 'GF', fn: t => t.gf },
  { key: 'ga',     label: 'GC', fn: t => t.ga },
  { key: 'gd',     label: 'DG', fn: t => t.gd > 0 ? `+${t.gd}` : t.gd },
  { key: 'pts',    label: 'Pts', fn: t => t.pts },
];

const GroupStandings = ({ teams, matches }) => {
  if (!teams.length) return null;
  const standings = calcStandings(teams, matches);

  return (
    <div className="mb-4 overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-gray-200">
            {cols.map(c => (
              <th key={c.key} className={`py-1 px-1 text-gray-400 font-medium uppercase tracking-wide ${c.key === 'name' ? 'text-left' : 'text-center'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map((team, i) => (
            <tr key={team.id} className={`border-b border-gray-100 ${i < 2 ? 'font-medium' : ''}`}>
              {cols.map(c => (
                <td key={c.key} className={`py-1.5 px-1 ${c.key === 'name' ? 'text-left text-gray-800' : 'text-center text-gray-600'} ${c.key === 'pts' ? 'font-bold text-indigo-700' : ''}`}>
                  {c.fn(team, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-1">Los 2 primeros clasifican directamente</p>
    </div>
  );
};

export default GroupStandings;