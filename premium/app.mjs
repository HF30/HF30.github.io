const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

function activateTab(name, focus = false) {
  const tab = $(`[data-tab="${name}"]`);
  if (!tab) return;
  for (const t of $$('[data-tab]')) { const active = t === tab; t.setAttribute('aria-selected', String(active)); t.tabIndex = active ? 0 : -1; }
  for (const panel of $$('.tab-panel')) panel.hidden = panel.id !== `panel-${name}`;
  if (focus) tab.focus();
}
for (const tab of $$('[data-tab]')) tab.addEventListener('click', () => { activateTab(tab.dataset.tab); history.replaceState(null, '', `#${tab.dataset.tab}`); });
for (const link of $$('[data-tab-link]')) link.addEventListener('click', (e) => { e.preventDefault(); activateTab(link.dataset.tabLink); history.replaceState(null, '', `#${link.dataset.tabLink}`); $('.profile-nav')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
$('.tab-list')?.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
  const tabs = $$('[data-tab]'), i = tabs.indexOf(document.activeElement); if (i < 0) return;
  e.preventDefault(); const n = e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  activateTab(tabs[n].dataset.tab, true); history.replaceState(null, '', `#${tabs[n].dataset.tab}`);
});
if (location.hash) activateTab(location.hash.slice(1));
else activateTab('overview');
window.addEventListener('hashchange', () => activateTab(location.hash.slice(1) || 'overview'));
for (const button of $$('[data-print], #print-report')) button.addEventListener('click', () => { document.body.classList.add('print-all'); window.print(); });
window.addEventListener('afterprint', () => document.body.classList.remove('print-all'));

function filterGoalies() {
  const query = ($('#goalie-search')?.value || '').toLowerCase().trim(), team = $('#team-filter')?.value || '', league = $('#league-filter')?.value || '', season = $('#season-filter')?.value || '';
  let n = 0;
  for (const row of $$('[data-goalie-row]')) {
    let lines = []; try { lines = JSON.parse(row.dataset.lines || '[]'); } catch {}
    const line = lines.find(x => (!league || x.league === league) && (!season || x.season === season));
    row.hidden = !(line && row.dataset.name.includes(query) && (!team || row.dataset.team === team));
    if (line) {
      $('[data-row-gp]', row).textContent = line.gp ?? '—';
      $('[data-row-svp]', row).textContent = Number.isFinite(line.svp) ? line.svp.toFixed(3).replace(/^0/, '') : '—';
      $('[data-row-gaa]', row).textContent = Number.isFinite(line.gaa) ? line.gaa.toFixed(2) : '—';
      $('[data-row-league]', row).textContent = line.league || 'NO CURRENT RECORD';
      row.dataset.svp = line.svp ?? -1; row.dataset.gp = line.gp ?? 0;
    }
    if (!row.hidden) n++;
  }
  if ($('#directory-count')) $('#directory-count').textContent = `${n} goalie profile${n === 1 ? '' : 's'}`;
  if ($('#directory-empty')) $('#directory-empty').hidden = n > 0;
  sortGoalies();
}
function sortGoalies() {
  const sort = $('#sort-goalies')?.value || 'name', rows = $$('[data-goalie-row]');
  rows.sort((a,b) => sort === 'name' ? a.dataset.name.localeCompare(b.dataset.name) : Number(b.dataset[sort])-Number(a.dataset[sort]) || a.dataset.name.localeCompare(b.dataset.name));
  for (const row of rows) $('#goalie-rows').append(row);
}
$('#goalie-search')?.addEventListener('input', filterGoalies);
for (const id of ['team-filter','league-filter','season-filter']) $('#'+id)?.addEventListener('change', filterGoalies);
$('#sort-goalies')?.addEventListener('change', sortGoalies);
if ($('#goalie-rows')) filterGoalies();
for (const button of $$('[data-zone-mode]')) button.addEventListener('click', () => {
  const scope = button.closest('.shot-profile'), mode = button.dataset.zoneMode;
  for (const b of $$('[data-zone-mode]', scope)) { b.classList.toggle('active',b===button); b.setAttribute('aria-pressed',String(b===button)); }
  for (const label of $$('[data-zone-value]', scope)) { const v = label.dataset[mode]; label.textContent = v === '' ? '—' : mode === 'svp' ? `${(Number(v)*100).toFixed(1)}%` : Number(v).toLocaleString(); }
});
document.addEventListener('keydown', (e) => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && $('#goalie-search')) { e.preventDefault(); $('#goalie-search').focus(); } });

function selectZone(zone, scope) {
  for (const row of $$('[data-zone-row]', scope)) row.classList.toggle('active', row.dataset.zoneRow === zone);
  for (const shape of $$('[data-zone]', scope)) shape.classList.toggle('active', shape.dataset.zone === zone);
}
for (const section of $$('.shot-profile')) {
  for (const row of $$('[data-zone-row]', section)) row.addEventListener('click', () => selectZone(row.dataset.zoneRow, section));
  for (const shape of $$('[data-zone]', section)) {
    shape.addEventListener('click', () => selectZone(shape.dataset.zone, section));
    shape.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectZone(shape.dataset.zone, section); } });
  }
}
$('#film-search')?.addEventListener('input', (e) => { const q = e.target.value.toLowerCase().trim(); for (const card of $$('#panel-film .film-card')) card.hidden = !card.textContent.toLowerCase().includes(q); });
for (const img of $$('img')) img.addEventListener('error', () => { img.hidden = true; });
