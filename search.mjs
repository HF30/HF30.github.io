// public/search.mjs — GoalieTrack search: one pure function, used by the browser and by Node (the gate imports it).
// index = [{type:'goalie', id, name, team, level} | {type:'team', abbr, name}]  (GET /api/search.json)
// Case- and accent-insensitive substring match on goalie name, team abbr and team name.
// Order: a team whose abbr equals the query, then goalies whose last name starts with the query, then every other match.
// Inside a group: NHL goalies before others, then by name.

const memo = new WeakMap();
export const fold = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ø/gi, 'o').replace(/æ/gi, 'ae').replace(/ß/g, 'ss').toLowerCase().trim();

function prep(e) {
  let p = memo.get(e);
  if (!p) {
    if (e.type === 'team') p = { abbr: fold(e.abbr), hay: [fold(e.abbr), fold(e.name)], last: '' };
    else { const n = fold(e.name); const sp = n.indexOf(' '); p = { abbr: '', hay: [n], last: sp >= 0 ? n.slice(sp + 1) : n }; }
    memo.set(e, p);
  }
  return p;
}

export function search(index, query, limit = 10) {
  const q = fold(query);
  if (!q || !Array.isArray(index)) return [];
  const hits = [];
  for (const e of index) {
    if (!e || typeof e !== 'object') continue;
    const p = prep(e);
    if (!p.hay.some((h) => h.includes(q))) continue;
    let rank = 3;
    if (e.type === 'team' && p.abbr === q) rank = 0;
    else if (e.type === 'goalie' && (p.last.startsWith(q) || p.last.split(/[\s-]/).some((w) => w.startsWith(q)))) rank = 1;
    else if (e.type === 'goalie' && p.hay[0].startsWith(q)) rank = 2;
    hits.push({ e, rank, lvl: e.type === 'goalie' && e.level === 'NHL' ? 0 : 1, name: p.hay[e.type === 'team' ? 1 : 0] });
  }
  hits.sort((a, b) => a.rank - b.rank || a.lvl - b.lvl || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return hits.slice(0, limit).map((h) => h.e);
}

export default search;
