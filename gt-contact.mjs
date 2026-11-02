// GoalieTrack coach / team contact form.
// Same drop-in + backend pattern as gt-waitlist.mjs: <div data-gt-contact data-source="contact"></div> + <script type="module" src="/gt-contact.mjs">.
// Posts the contact form to the hosted contact endpoint. Importable in Node with no DOM.

export const DEFAULT_ENDPOINT = 'https://aeidfmtbkzisksnfzlwp.supabase.co/functions/v1/gt-contact';
export const ROLES = [
  ['pro-team', 'Pro team'],
  ['college', 'College'],
  ['junior', 'Junior'],
  ['goalie-coach', 'Goalie coach'],
  ['agent', 'Agent'],
  ['other', 'Other'],
];
const COPY = {
  done: 'Thanks. We got your message and will be in touch.',
  error: 'Something went wrong. Please check your details and try again.',
  rate: 'Too many messages from this connection. Please try again in a few minutes.',
  need: 'Please add your name, a valid email and your role.',
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function buildPayload(f, source = 'contact') {
  return {
    name: String(f.name || '').trim(),
    email: String(f.email || '').trim(),
    org: String(f.org || '').trim() || null,
    role: String(f.role || ''),
    level: String(f.level || '').trim() || null,
    message: String(f.message || '').trim() || null,
    source,
    website: String(f.website || ''),
  };
}
export function validate(p) {
  return !!p.name && EMAIL_RE.test(p.email) && ROLES.some(([v]) => v === p.role);
}

const CSS = `
[data-gt-contact] form{display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:44rem}
[data-gt-contact] label{display:flex;flex-direction:column;gap:5px;font:600 12px var(--body,system-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--muted,#8FA6C0)}
[data-gt-contact] label.wide,[data-gt-contact] button,[data-gt-contact] [data-gt-contact-status]{grid-column:1 / -1}
[data-gt-contact] input,[data-gt-contact] select,[data-gt-contact] textarea{font:400 15px var(--body,system-ui);text-transform:none;letter-spacing:0;padding:10px 12px;box-sizing:border-box;width:100%;color:var(--ink,#E3F2FD);background:var(--surface-deep,#0E141C);border:1px solid var(--line,#243142);border-radius:8px}
[data-gt-contact] input:focus,[data-gt-contact] select:focus,[data-gt-contact] textarea:focus{outline:2px solid var(--accent,#89CFF0);outline-offset:1px}
[data-gt-contact] button{cursor:pointer;font:700 14px var(--body,system-ui);padding:12px 22px;border:0;border-radius:999px;background:var(--accent,#89CFF0);color:var(--on-accent,#080C12);justify-self:start}
[data-gt-contact] button[disabled]{opacity:.6;cursor:progress}
[data-gt-contact] [data-gt-contact-status]{min-height:1.2em;margin:0;color:var(--muted,#8FA6C0)}
[data-gt-contact][data-state="error"] [data-gt-contact-status]{color:var(--bad-text,#EB8A83)}
[data-gt-contact][data-state="done"] [data-gt-contact-status]{color:var(--accent,#89CFF0)}
@media (max-width:560px){[data-gt-contact] form{grid-template-columns:1fr}}
`;

function injectStyles(doc) {
  if (doc.getElementById('gt-contact-style')) return;
  const st = doc.createElement('style');
  st.id = 'gt-contact-style';
  st.textContent = CSS;
  (doc.head || doc.documentElement).appendChild(st);
}
function el(doc, tag, attrs = {}, text) {
  const e = doc.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text !== undefined) e.textContent = text;
  return e;
}
function field(doc, label, input, wide) {
  const l = el(doc, 'label', wide ? { class: 'wide' } : {});
  l.append(doc.createTextNode(label), input);
  return l;
}

export function mountContact(root, opts = {}) {
  const doc = root.ownerDocument;
  if (root.dataset.gtContactMounted === '1') return root;
  root.dataset.gtContactMounted = '1';
  injectStyles(doc);
  const endpoint = root.dataset.endpoint || opts.endpoint || DEFAULT_ENDPOINT;
  const source = root.dataset.source || 'contact';

  const form = el(doc, 'form');
  const name = el(doc, 'input', { type: 'text', name: 'name', required: '', maxlength: '120', autocomplete: 'name' });
  const email = el(doc, 'input', { type: 'email', name: 'email', required: '', autocomplete: 'email' });
  const org = el(doc, 'input', { type: 'text', name: 'org', maxlength: '200', autocomplete: 'organization' });
  const role = el(doc, 'select', { name: 'role', required: '' });
  role.append(el(doc, 'option', { value: '' }, 'Select your role'));
  for (const [v, t] of ROLES) role.append(el(doc, 'option', { value: v }, t));
  const level = el(doc, 'input', { type: 'text', name: 'level', maxlength: '120', placeholder: 'e.g. NHL, AHL, U18 AAA, NCAA D1' });
  const message = el(doc, 'textarea', { name: 'message', maxlength: '2000', rows: '4', placeholder: 'What would you like to use GoalieTrack for?' });
  const hpBox = el(doc, 'div', { style: 'display:none', 'aria-hidden': 'true' });
  const hp = el(doc, 'input', { type: 'text', name: 'website', tabindex: '-1', autocomplete: 'off' });
  hpBox.append(hp);
  const btn = el(doc, 'button', { type: 'submit' }, 'Send');
  const status = el(doc, 'p', { 'data-gt-contact-status': '', role: 'status', 'aria-live': 'polite' });

  form.append(field(doc, 'Name', name), field(doc, 'Email', email), field(doc, 'Organisation', org), field(doc, 'Role', role),
    field(doc, 'Level', level, true), field(doc, 'Message', message, true), hpBox, btn, status);
  root.replaceChildren(form);
  root.dataset.state = 'idle';

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (btn.disabled) return;
    const payload = buildPayload({ name: name.value, email: email.value, org: org.value, role: role.value, level: level.value, message: message.value, website: hp.value }, source);
    if (!validate(payload)) { status.textContent = COPY.need; root.dataset.state = 'error'; return; }
    btn.disabled = true;
    let ok = false; let rate = false;
    try {
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      rate = res.status === 429;
      let j = null; try { j = await res.json(); } catch { j = null; }
      ok = res.ok && !!j && j.ok === true;
    } catch { ok = false; }
    btn.disabled = false;
    status.textContent = ok ? COPY.done : rate ? COPY.rate : COPY.error;
    root.dataset.state = ok ? 'done' : 'error';
    if (ok) form.reset();
  });
  return root;
}

export function mountAll(doc = globalThis.document) {
  if (!doc) return [];
  return [...doc.querySelectorAll('[data-gt-contact]')].map((r) => mountContact(r));
}

if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mountAll());
  else mountAll();
}
