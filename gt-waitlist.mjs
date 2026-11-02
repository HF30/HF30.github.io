// GoalieTrack waitlist form.
// Drop-in: <div data-gt-waitlist data-source="home"></div> + <script type="module" src="/gt-waitlist.mjs">.
// Importable in Node with no DOM: nothing touches `document` until mountWaitlist / auto-mount runs.

export const DEFAULT_ENDPOINT = 'https://aeidfmtbkzisksnfzlwp.supabase.co/functions/v1/gt-waitlist';
export const TIERS = ['free', 'all-goals', 'pro', 'all-shots'];

const TIER_LABELS = {
  'free': 'Free',
  'all-goals': 'All goals',
  'pro': 'Pro',
  'all-shots': 'All shots (league-wide)',
};
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
const COPY = {
  done: "You're on the list. We'll be in touch.",
  error: 'Something went wrong. Please check your email and try again.',
};

export function goalieIdFromPath(p) {
  const m = /^\/goalie\/(\d+)(?:\/(?:index\.html)?|\.html)?$/.exec(String(p ?? ''));
  return m ? m[1] : null;
}

export function utmFromSearch(s) {
  const params = new URLSearchParams(String(s ?? ''));
  const out = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    out[k] = v === null ? null : v.slice(0, 200);
  }
  return out;
}

const CSS = `
[data-gt-waitlist] form{display:flex;flex-direction:column;gap:.5rem;max-width:28rem}
[data-gt-waitlist] input,[data-gt-waitlist] select,[data-gt-waitlist] textarea,[data-gt-waitlist] button{font:inherit;padding:.5rem .6rem;box-sizing:border-box;width:100%}
[data-gt-waitlist] button{cursor:pointer}
[data-gt-waitlist] button[disabled]{opacity:.6;cursor:progress}
[data-gt-waitlist] [data-gt-waitlist-status]{min-height:1.2em;margin:.25rem 0 0}
[data-gt-waitlist][data-state="error"] [data-gt-waitlist-status]{color:var(--bad-text,#b00020)}
[data-gt-waitlist] input,[data-gt-waitlist] select,[data-gt-waitlist] textarea{color:var(--ink,inherit);background:var(--surface-deep,Field);border:1px solid var(--line,#767676);border-radius:8px}
[data-gt-waitlist] button{font-weight:700;border:0;border-radius:999px;background:var(--accent,ButtonFace);color:var(--on-accent,ButtonText)}
[data-gt-waitlist][data-state="done"] [data-gt-waitlist-status]{color:var(--accent,inherit)}
`;

function injectStyles(doc) {
  if (doc.getElementById('gt-waitlist-style')) return;
  const st = doc.createElement('style');
  st.id = 'gt-waitlist-style';
  st.textContent = CSS;
  (doc.head || doc.documentElement).appendChild(st);
}

function el(doc, tag, attrs = {}) {
  const e = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function mountWaitlist(root, opts = {}) {
  const doc = root.ownerDocument;
  const loc = opts.location || doc.defaultView.location;
  if (root.dataset.gtWaitlistMounted === '1') return root;
  root.dataset.gtWaitlistMounted = '1';
  injectStyles(doc);

  const endpoint = root.dataset.endpoint || opts.endpoint || DEFAULT_ENDPOINT;
  const source = root.dataset.source || 'home';
  const startTier = TIERS.includes(root.dataset.tier) ? root.dataset.tier : 'free';
  const team = root.dataset.team || null;
  const goalieId = root.dataset.goalieId || goalieIdFromPath(loc.pathname);

  const form = el(doc, 'form', { novalidate: '' });
  form.noValidate = false;
  form.removeAttribute('novalidate');

  const email = el(doc, 'input', { type: 'email', name: 'email', required: '', placeholder: 'Email address', autocomplete: 'email', 'aria-label': 'Email address' });
  const tier = el(doc, 'select', { name: 'tier', 'aria-label': 'Which tier are you interested in?' });
  for (const t of TIERS) {
    const o = el(doc, 'option', { value: t });
    o.textContent = TIER_LABELS[t];
    tier.appendChild(o);
  }
  tier.value = startTier;
  // a mount with data-hide-tier (the shots early-access CTA) fixes the tier and shows no picker.
  if (root.dataset.hideTier !== undefined) tier.style.display = 'none';

  const shotsBox = el(doc, 'div', { 'data-gt-waitlist-shots': '' });
  const org = el(doc, 'input', { type: 'text', name: 'org', placeholder: 'Organization (optional)', maxlength: '200', 'aria-label': 'Organization' });
  const message = el(doc, 'textarea', { name: 'message', placeholder: 'Tell us what you need (optional)', maxlength: '2000', rows: '3', 'aria-label': 'Message' });
  shotsBox.append(org, message);

  // Honeypot: display:none (not off-screen) so it is invisible to every assistive and automated reader.
  const hpBox = el(doc, 'div', { style: 'display:none', 'aria-hidden': 'true' });
  const hp = el(doc, 'input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off' });
  hpBox.appendChild(hp);

  const btn = el(doc, 'button', { type: 'submit' });
  btn.textContent = root.dataset.cta || 'Join the waitlist';
  const status = el(doc, 'p', { 'data-gt-waitlist-status': '', role: 'status', 'aria-live': 'polite' });

  form.append(email, tier, shotsBox, hpBox, btn);
  root.replaceChildren(form, status);

  const syncShots = () => { shotsBox.style.display = tier.value === 'all-shots' ? '' : 'none'; };
  tier.addEventListener('change', syncShots);
  syncShots();
  root.dataset.state = 'idle';

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (btn.disabled) return;
    const shots = tier.value === 'all-shots';
    const payload = {
      email: email.value.trim(),
      tier: tier.value,
      goalie_id: goalieId,
      team,
      source,
      ...utmFromSearch(loc.search),
      website: hp.value,
      org: shots ? (org.value.trim() || null) : null,
      message: shots ? (message.value.trim() || null) : null,
    };
    btn.disabled = true;
    let ok = false;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let j = null;
      try { j = await res.json(); } catch { j = null; }
      ok = res.ok && !!j && j.ok === true;
    } catch { ok = false; }
    btn.disabled = false;
    status.textContent = ok ? COPY.done : COPY.error;
    root.dataset.state = ok ? 'done' : 'error';
  });
  return root;
}

export function mountAll(doc = globalThis.document) {
  if (!doc) return [];
  return [...doc.querySelectorAll('[data-gt-waitlist]')].map((r) => mountWaitlist(r));
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountAll());
  else mountAll();
}
