// public/app.mjs — GoalieTrack client: search dropdown (the same search() the server ships), client-side tabs,
// shot-map / clip filters, team level tabs, and a "recent goalies" list kept in this browser only.
import { search } from '/search.mjs';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ---------------------------------------------------------------- search
let INDEX = null;
const loadIndex = () => (INDEX ||= fetch('/api/search.json').then((r) => r.json()).catch(() => []));
const teamName = (idx, a) => (idx.find((e) => e.type === 'team' && e.abbr === a) || {}).name || a;
function hl(name, q) {
  const f = fold(name), i = f.indexOf(fold(q).trim());
  if (i < 0 || !q.trim()) return esc(name);
  const L = q.trim().length;
  return `${esc(name.slice(0, i))}<mark>${esc(name.slice(i, i + L))}</mark>${esc(name.slice(i + L))}`;
}
const hrefOf = (e) => (e.type === 'team' ? `/team/${e.abbr}` : `/goalie/${encodeURIComponent(e.id)}`);
async function render(inp) {
  const dd = inp.closest('.search').querySelector('.dd');
  const q = inp.value;
  if (!q.trim()) { dd.hidden = true; dd.innerHTML = ''; return; }
  const idx = await loadIndex();
  const hits = search(idx, q, 12);
  const gs = hits.filter((e) => e.type === 'goalie'), ts = hits.filter((e) => e.type === 'team');
  let h = '';
  if (ts.length && ts[0].abbr.toLowerCase() === q.trim().toLowerCase()) h += '<div class="dh">Teams · goalie org page</div>' + ts.map((t) => `<a href="${hrefOf(t)}"><span class="tm">${esc(t.abbr)}</span><span>${hl(t.name, q)}</span><em>all goalies in the org</em></a>`).join('');
  if (gs.length) h += '<div class="dh">Goalies</div>' + gs.map((g) => `<a href="${hrefOf(g)}"><span class="tm">${esc(g.team)}</span><span>${hl(g.name, q)}</span><em>${esc(teamName(idx, g.team))} · ${esc(g.level)}</em></a>`).join('');
  if (ts.length && !(ts[0].abbr.toLowerCase() === q.trim().toLowerCase())) h += '<div class="dh">Teams · goalie org page</div>' + ts.map((t) => `<a href="${hrefOf(t)}"><span class="tm">${esc(t.abbr)}</span><span>${hl(t.name, q)}</span><em>all goalies in the org</em></a>`).join('');
  if (!h) h = '<div class="dh">No goalie or team matches</div>';
  dd.innerHTML = h; dd.hidden = false;
  const first = dd.querySelector('a'); if (first) first.classList.add('hi');
}
for (const inp of $$('.search .q')) {
  inp.addEventListener('input', () => render(inp));
  inp.addEventListener('focus', () => { loadIndex(); if (inp.value) render(inp); });
  inp.addEventListener('keydown', (e) => {
    const dd = inp.closest('.search').querySelector('.dd'); const as = $$('a', dd); const i = as.findIndex((a) => a.classList.contains('hi'));
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!as.length) return; as.forEach((a) => a.classList.remove('hi')); const j = e.key === 'ArrowDown' ? Math.min(as.length - 1, i + 1) : Math.max(0, i - 1); as[j].classList.add('hi'); as[j].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { const a = as[i >= 0 ? i : 0]; if (a) location.href = a.getAttribute('href'); }
    else if (e.key === 'Escape') { dd.hidden = true; inp.blur(); }
  });
}
document.addEventListener('click', (e) => { for (const s of $$('.search')) if (!s.contains(e.target)) { const dd = $('.dd', s); if (dd) dd.hidden = true; } });
document.addEventListener('keydown', (e) => {
  if (e.key !== '/' || /^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  const inp = $('#q') || $$('.search .q').find((i) => i.offsetParent !== null);
  if (inp) { e.preventDefault(); inp.focus(); }
});

// ---------------------------------------------------------------- goalie tabs
const TABS = $$('section.tab[data-tab]');
function showTab(k) {
  if (!TABS.length) return;
  if (!TABS.some((t) => t.dataset.tab === k)) k = TABS[0].dataset.tab; // first tab present (a light page may have no Overview)
  TABS.forEach((t) => t.classList.toggle('on', t.dataset.tab === k));
  $$('.tabs a[data-go]').forEach((a) => a.classList.toggle('on', a.dataset.go === k));
}
if (TABS.length) {
  addEventListener('hashchange', () => showTab(location.hash.slice(1)));
  showTab(location.hash.slice(1));
}

// ---------------------------------------------------------------- filters (shot map + clips)
for (const box of $$('[data-filters]')) {
  const scope = box.dataset.filters;
  const items = () => (scope === 'map' ? $$('[data-map="shots"] [data-k]') : $$('[data-clips] [data-k]'));
  const apply = () => {
    const on = (f) => $$(`.f.on[data-f="${f}"]`, box).map((c) => c.dataset.v);
    const kinds = on('k'), pts = on('pt'), pers = on('per'), dgs = on('dg');
    for (const el of items()) {
      const k = el.dataset.k;
      let ok = kinds.includes(k);
      if (ok && pts.length) ok = k === 'g' && (el.dataset.pt || '').split(' · ').some((l) => pts.includes(l));
      if (ok && pers.length) ok = k !== 'l' && pers.includes(el.dataset.per);
      if (ok && dgs.length) ok = dgs.includes(el.dataset.danger);
      if (el instanceof SVGElement) el.classList.toggle('off', !ok); else el.style.display = ok ? '' : 'none';
    }
  };
  box.addEventListener('click', (e) => { const c = e.target.closest('.f[data-f]'); if (!c) return; c.classList.toggle('on'); apply(); });
}

// ---------------------------------------------------------------- team level tabs
const lt = $('[data-lvltabs]');
if (lt) lt.addEventListener('click', (e) => {
  const a = e.target.closest('[data-lvl-go]'); if (!a) return;
  const v = a.dataset.lvlGo;
  $$('[data-lvl-go]', lt).forEach((x) => x.classList.toggle('on', x === a));
  const ov = $('[data-lvl-overview]'); if (ov) ov.style.display = v === 'all' ? '' : 'none';
  $$('.lvl[data-lvl]').forEach((s) => { s.style.display = v === 'all' || s.dataset.lvl === v ? '' : 'none'; });
});

// ---------------------------------------------------------------- recent goalies (this browser only)
// The Recent block does not exist in the page; it is built here only when this browser has something to list.
const KEY = 'goalietrack.recent';
let recent = [];
try { recent = JSON.parse(localStorage.getItem(KEY) || '[]').map((r) => ({ id: String(r.id), name: r.name })); } catch { recent = []; }
const gid = document.body.dataset.goalie;
if (gid) {
  recent = [{ id: String(gid), name: document.body.dataset.goalieName }, ...recent.filter((r) => r.id !== String(gid))].slice(0, 6);
  try { localStorage.setItem(KEY, JSON.stringify(recent)); } catch { /* private mode */ }
}
const links = (cls) => recent.map((r) => `<a${cls ? ` class="${cls}"` : ''} href="/goalie/${encodeURIComponent(r.id)}">${esc(r.name)}</a>`).join('');
if (recent.length) {
  const side = document.body.classList.contains('ice') ? null : $('.side'); // the landing's top bar carries no Recent list
  if (side) { const d = document.createElement('div'); d.className = 'recent'; d.innerHTML = `<div class="mh">Recent</div><nav data-recent>${links('')}</nav>`; side.appendChild(d); }
  const blk = $('[data-recent-block]');
  if (blk) { blk.innerHTML = `<div class="t5h" style="margin-top:16px">Recent</div><div data-recent-pills>${links('pill')}</div>`; blk.hidden = false; }
}

// ---------------------------------------------------------------- landing: panel tabs + season
// Tabs switch panes inside ONE panel ([data-lt-go] -> sibling .lt[data-lt]). The season select shows the [data-season] blocks
// for that season; tabs whose data is current-season only (data-cur-only) hide on an earlier season and fall back to the first tab.
function ltShow(panel, k) {
  $$('[data-lt-go]', panel).forEach((b) => { const on = b.dataset.ltGo === k; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
  $$('.lt[data-lt]', panel).forEach((p) => { const on = p.dataset.lt === k; p.classList.toggle('on', on); p.hidden = !on; });
}
for (const bar of $$('.ltabs')) bar.addEventListener('click', (e) => { const b = e.target.closest('[data-lt-go]'); if (b) ltShow(bar.closest('.dp'), b.dataset.ltGo); });
const ssel = $('[data-season-select]');
if (ssel) ssel.addEventListener('change', () => {
  const v = ssel.value; const cur = ssel.options[0] && ssel.options[0].value;
  $$('[data-season]').forEach((el) => { el.hidden = el.dataset.season !== v; });
  for (const b of $$('[data-cur-only]')) {
    b.hidden = v !== cur;
    if (b.hidden && b.classList.contains('on')) { const p = b.closest('.dp'); const f = $('[data-lt-go]:not([hidden])', p); if (f) ltShow(p, f.dataset.ltGo); }
  }
  // goals-only launch: a panel whose every tab is current-season only (Leaders once GSAx/dSV% are held back) has nothing to show on an earlier season
  for (const dp of $$('.dp')) { const tabs = $$('[data-lt-go]', dp); if (tabs.length && tabs.every((b) => b.hasAttribute('data-cur-only'))) dp.hidden = v !== cur; }
});

// ---------------------------------------------------------------- goalie page: season dropdown
// One season for the whole page. The server renders every season, each block tagged data-gs="<season>" (non-default ones also data-gs-off, so no-JS
// shows the current season); changing the select flips data-gs-off on every [data-gs] block, shows [data-gs-other] notes on the other seasons,
// recounts the Goals/Saves filter chips for the chosen season, and hides an Advanced box when none of its season blocks is showing. Client-side, no reload.
const gsel = $('[data-gt-season-select]');
const gsSeasonOf = (el) => { const h = el.closest('[data-gs]'); return h ? h.dataset.gs : ''; };
function applySeason(v) {
  $$('[data-gs]').forEach((el) => el.toggleAttribute('data-gs-off', el.dataset.gs !== v));
  $$('[data-gs-other]').forEach((el) => el.toggleAttribute('data-gs-off', el.dataset.gsOther === v));
  for (const box of $$('[data-filters]')) {
    const items = box.dataset.filters === 'map' ? $$('[data-map="shots"] [data-k]') : $$('[data-clips] [data-k]');
    for (const chip of $$('.f[data-f="k"]', box)) { const sm = $('small', chip); if (sm) sm.textContent = String(items.filter((el) => el.dataset.k === chip.dataset.v && gsSeasonOf(el) === v).length); }
  }
  for (const b of $$('.box:has([data-parity], .advseason)')) b.toggleAttribute('data-gs-off', !$$('[data-gs]', b).some((el) => !el.hasAttribute('data-gs-off')));
}
if (gsel) { gsel.addEventListener('change', () => applySeason(gsel.value)); applySeason(gsel.value); }

// ---------------------------------------------------------------- shots coming soon: "Get early access" scrolls to the pre-launch waitlist form
// Not a hash link on purpose: a hash that is not a tab name would switch the goalie page back to its first tab.
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-early-access]'); if (!a) return;
  const t = $('#gt-early-access'); if (!t) return;
  e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const i = $('input[type=email]', t); if (i) i.focus({ preventScroll: true });
});
