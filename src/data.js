// Cloudflare Pages Function: live storage for the site data + admin sign-in.
// Needs a KV binding named YQ and an environment variable ADMIN_PASSWORD.
// GET  = public site data
// POST = sign in (see admin.js), returns a session token
// PUT  = save data (needs a signed-in Owner or Editor), every change goes in the audit log
import { auth, login, audit } from './admin.js';

const J = { 'content-type': 'application/json', 'cache-control': 'no-store' };
const out = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: J });

// Which lists are compared, and what identifies one item in each.
const LISTS = {
  days: x => x.d,
  holdings: x => x.t || x.n,
  trades: x => [x.d, x.t, x.side, x.sh, x.px].join('|'),
  orders: x => [x.d, x.t, x.side, x.type, x.sh].join('|'),
  flows: x => [x.d, x.type, x.amt].join('|'),
  updates: x => x.d + '|' + x.t,
  faq: x => x.q,
  articles: x => x.slug,
};
const short = a => a.slice(0, 3).join(', ') + (a.length > 3 ? ' +' + (a.length - 3) + ' more' : '');

// Plain-English summary of what changed between two versions of the data.
function diff(o, n) {
  o = o || {}; n = n || {};
  const parts = []; let removed = 0, emptied = false;
  for (const k of Object.keys(LISTS)) {
    const a = Array.isArray(o[k]) ? o[k] : [], b = Array.isArray(n[k]) ? n[k] : [], key = LISTS[k];
    const A = new Map(a.map(x => [String(key(x)), JSON.stringify(x)])), B = new Map(b.map(x => [String(key(x)), JSON.stringify(x)]));
    const add = [...B.keys()].filter(x => !A.has(x)), rem = [...A.keys()].filter(x => !B.has(x)), ed = [...B.keys()].filter(x => A.has(x) && A.get(x) !== B.get(x));
    removed += rem.length; if (a.length && !b.length) emptied = true;
    const bits = [];
    if (add.length) bits.push(add.length + ' added (' + short(add) + ')');
    if (ed.length) bits.push(ed.length + ' edited (' + short(ed) + ')');
    if (rem.length) bits.push(rem.length + ' removed (' + short(rem) + ')');
    if (bits.length) parts.push(k + ': ' + bits.join(', '));
  }
  const ob = o.bench || {}, nb = n.bench || {};
  const bm = x => new Map((x.months || []).map(m => [m.k, m.p]));
  const OM = bm(ob), NM = bm(nb);
  const bch = [...NM.keys()].filter(k => !OM.has(k) || OM.get(k) !== NM.get(k)).length + [...OM.keys()].filter(k => !NM.has(k)).length;
  if (bch || (ob.name || '') !== (nb.name || '')) parts.push('benchmark: ' + (bch ? bch + ' month(s) changed' : 'renamed'));
  const skip = new Set([...Object.keys(LISTS), 'bench', 'updated', 'adminPass']);
  const ch = [...new Set([...Object.keys(o), ...Object.keys(n)])].filter(k => !skip.has(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
  if (ch.length) parts.push('settings: ' + ch.join(', '));
  return { text: parts.join('; '), removed, emptied };
}

export async function onRequestGet({ request, env }) {
  if (!env.YQ) return out({ error: 'KV not configured' }, 404);
  const raw = (await env.YQ.get('data')) || 'null';
  // Draft articles are only sent to a signed-in admin.
  if (!raw.includes('"status":"draft"') || (await auth(request, env))) return new Response(raw, { headers: J });
  const d = JSON.parse(raw);
  d.articles = (d.articles || []).filter(a => a.status === 'published');
  return out(d);
}

export async function onRequestPost({ request, env }) {
  return login(request, env);
}

export async function onRequestPut({ request, env }) {
  if (!env.YQ) return out({ error: 'KV not configured' }, 404);
  const who = await auth(request, env);
  if (!who) return out({ error: 'Please sign in again.' }, 401);
  if (who.r === 'viewer') return out({ error: 'Viewers can look but not change anything.' }, 403);
  const body = await request.text();
  if (body.length > 5e6) return out({ error: 'Too large' }, 413);
  let nw; try { nw = JSON.parse(body); } catch (e) { return out({ error: 'Bad JSON' }, 400); }
  let old = null; try { old = JSON.parse((await env.YQ.get('data')) || 'null'); } catch (e) {}
  const d = old ? diff(old, nw) : { text: 'First live save: all site data stored', removed: 0, emptied: false };
  if (who.r !== 'owner' && (d.emptied || d.removed > 10))
    return out({ error: 'Only an Owner can delete that much at once. Nothing was saved.' }, 403);
  await env.YQ.put('data', body);
  if (d.text) await audit(env, request, who, 'save', d.text);
  return out({ ok: true });
}
