// gt-embed.mjs - fills every [data-embed-slot] with the hosted clip for its key.
// Reads /media.json once. Wide screens get the B-169 render, phones (max-width 600px) the A-916 render.
// A goal with no still and no clip keeps one placeholder; a still published after the last deploy arrives via same-origin /live/stills.json.
// Free layer only: the manifest carries no tags, notes or reads.

export function pickMedia(manifest, key, narrow) {
  if (!key || !manifest || !Array.isArray(manifest.items)) return null;
  const item = manifest.items.find((i) => i && i.key === key);
  const f = item && item.formats && item.formats[narrow ? 'A-916' : 'B-169'];
  if (!f || !f.url) return null;
  return { src: f.url, poster: (f.poster && f.poster.url) || '' };
}
const IMG_STYLE = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover';
function ph(thumb) {
  if (!thumb || thumb.querySelector('img.still') || thumb.querySelector('.gt-ph')) return;
  const d = document.createElement('div'); d.className = 'gt-ph'; d.setAttribute('data-still-ph', '');
  const i = document.createElement('img'); i.src = '/brand/butterfly.svg'; i.alt = ''; i.setAttribute('aria-hidden', 'true');
  const s = document.createElement('span'); s.textContent = 'GRAPHIC COMING SOON';
  d.append(i, s); const slot = thumb.querySelector('[data-embed-slot]'); thumb.insertBefore(d, slot || null);
}
const unph = (thumb) => { if (thumb) thumb.querySelectorAll('.gt-ph').forEach((n) => n.remove()); };
async function hostUp(base) {
  if (!base) return false;
  try {
    const ac = typeof AbortController === 'function' ? new AbortController() : null;
    const t = ac ? setTimeout(() => ac.abort(), 4000) : null;
    await fetch(base, { method: 'HEAD', mode: 'no-cors', signal: ac ? ac.signal : undefined });
    if (t) clearTimeout(t);
    return true;
  } catch { return false; }
}
async function getJson(u) { try { const r = await fetch(u); return r.ok ? await r.json() : null; } catch { return null; } }
async function fill() {
  try {
    for (const im of document.querySelectorAll('.thumb img.still')) {
      const t = im.closest('.thumb'); const dead = () => { im.remove(); ph(t); };
      if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) dead();
      else if (!im.complete) im.addEventListener('error', dead);
    }
    const live = await getJson('/live/stills.json');
    const items = live && live.items && typeof live.items === 'object' ? live.items : {};
    for (const c of document.querySelectorAll('.clip[data-clip-key]')) {
      const t = c.querySelector('.thumb'); const it = items[c.getAttribute('data-clip-key')];
      if (!t || t.querySelector('img.still') || !it) continue;
      const b = it['B-169'], a = it['A-916'];
      if (!/^https:\/\//.test(b || '') || !/^https:\/\//.test(a || '')) continue;
      const img = document.createElement('img'); img.className = 'still'; img.src = b; img.setAttribute('data-still-916', a); img.alt = ''; img.loading = 'lazy'; img.setAttribute('style', IMG_STYLE);
      img.addEventListener('load', () => unph(t)); img.addEventListener('error', () => { img.remove(); ph(t); });
      const ev = t.querySelector('.ev'); t.insertBefore(img, ev ? ev.nextSibling : t.firstChild);
    }
    const slots = [...document.querySelectorAll('[data-embed-slot]')];
    if (!slots.length) return;
    const manifest = await getJson('/media.json');
    const up = manifest ? await hostUp(manifest.base_url) : false;
    const narrow = typeof matchMedia === 'function' && matchMedia('(max-width: 600px)').matches;
    for (const slot of slots) {
      const key = slot.getAttribute('data-embed-key') || ''; const t = slot.closest('.thumb');
      if (!key) { const card = slot.closest('.clip[data-k="l"]'); if (card) { card.style.display = 'none'; continue; } }
      const m = up ? pickMedia(manifest, key, narrow) : null;
      slot.textContent = '';
      if (m) {
        const v = document.createElement('video'); v.setAttribute('controls', ''); v.setAttribute('playsinline', ''); v.setAttribute('preload', 'none');
        if (m.poster) v.setAttribute('poster', m.poster);
        v.addEventListener('error', () => { v.remove(); ph(t); });
        v.setAttribute('src', m.src); slot.appendChild(v); unph(t);
      } else ph(t);
    }
  } finally { document.documentElement.setAttribute('data-embed-done', '1'); }
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
  else fill();
}
