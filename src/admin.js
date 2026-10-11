// Cloudflare Pages Function: admin accounts, roles, sign-in and the audit log.
// Uses the same KV binding (YQ) and ADMIN_PASSWORD secret as data.js.
//
// Roles
//   owner  - everything, plus Team and Audit log
//   editor - edit returns, holdings, trades, news, FAQ, benchmark (no team, no audit log, no mass deletes)
//   viewer - can open the admin panel and look, cannot change anything
// The ADMIN_PASSWORD secret always works as an Owner when the username is left blank ("master").

const J = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
export const ROLES = ['owner', 'editor', 'viewer'];

async function pbkdf2(pw, salt) {
  const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode(salt), iterations: 100000 }, k, 256));
}
function same(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
const rd = async (env, k, d) => JSON.parse((await env.YQ.get(k)) || JSON.stringify(d));

// Append one line to the audit log (newest first, last 1000 kept). Never throws.
export async function audit(env, request, who, a, s) {
  try {
    const log = await rd(env, 'audit', []);
    log.unshift({ t: new Date().toISOString(), u: (who && who.u) || '?', r: (who && who.r) || '', ip: request.headers.get('cf-connecting-ip') || '', a, s: String(s || '').slice(0, 600) });
    await env.YQ.put('audit', JSON.stringify(log.slice(0, 1000)));
  } catch (e) {}
}

// Who is calling? Looks up the session token, then re-checks the account so a
// removed user or a changed role takes effect immediately.
export async function auth(request, env) {
  if (!env.YQ) return null;
  const t = request.headers.get('x-admin-token');
  if (!t) return null;
  const v = await env.YQ.get('asess:' + t, 'json');
  if (!v) return null;
  if (v.u === 'master') return { u: 'master', r: 'owner' };
  const us = await rd(env, 'admins', {});
  return us[v.u] ? { u: v.u, r: us[v.u].r } : null;
}

// POST /api/data lands here (see data.js). Headers: x-admin-user (blank = master), x-admin-password.
export async function login(request, env) {
  if (!env.YQ) return J({ error: 'KV not configured' }, 404);
  const h = request.headers, ip = h.get('cf-connecting-ip') || 'noip';
  const u = String(h.get('x-admin-user') || '').trim().toLowerCase(), pw = String(h.get('x-admin-password') || '');
  // Failed attempts are counted per username AND per visitor address, so one person
  // mistyping can never lock out anyone else (or a different account).
  const rl = 'rl:' + (u || 'master') + ':' + ip;
  const tries = +((await env.YQ.get(rl)) || 0);
  if (tries >= 10) return J({ error: 'Too many wrong attempts from this device. Wait 15 minutes and try again.' }, 429);
  let who = null;
  if (!u) {
    const want = String(env.ADMIN_PASSWORD == null ? '' : env.ADMIN_PASSWORD).trim();
    if (!want) return J({ error: 'ADMIN_PASSWORD secret is not set on this Worker' }, 500);
    if (same(pw.trim(), want)) who = { u: 'master', r: 'owner' };
  } else {
    const us = await rd(env, 'admins', {}), a = us[u];
    if (a && same(await pbkdf2(pw, a.s), a.h)) { who = { u, r: a.r }; a.l = new Date().toISOString(); await env.YQ.put('admins', JSON.stringify(us)); }
  }
  if (!who) {
    await env.YQ.put(rl, String(tries + 1), { expirationTtl: 900 });
    await audit(env, request, { u: u || 'master', r: '' }, 'login-failed', 'Wrong ' + (u ? 'username or ' : '') + 'password');
    return J({ error: 'Wrong username or password.' }, 401);
  }
  await env.YQ.delete(rl);
  const tok = crypto.randomUUID() + crypto.randomUUID();
  await env.YQ.put('asess:' + tok, JSON.stringify(who), { expirationTtl: 43200 });
  await audit(env, request, who, 'login', 'Signed in');
  return J({ ok: true, token: tok, user: who.u, role: who.r });
}

export async function onRequest({ request, env }) {
  if (!env.YQ) return J({ error: 'KV not configured' }, 404);
  const who = await auth(request, env);
  if (!who) return J({ error: 'Please sign in again.' }, 401);
  const url = new URL(request.url);

  if (request.method === 'GET') {
    if (url.searchParams.get('inbox') && who.r !== 'viewer') return J({ inbox: await rd(env, 'inbox', []) });
    if (who.r !== 'owner') return J({ error: 'Owners only.' }, 403);
    if (url.searchParams.get('audit')) return J({ audit: await rd(env, 'audit', []) });
    if (url.searchParams.get('users')) {
      const us = await rd(env, 'admins', {});
      return J({ users: Object.keys(us).sort().map(u => ({ u, r: us[u].r, c: us[u].c, l: us[u].l || '' })) });
    }
    return J({ error: 'Not found.' }, 404);
  }
  if (request.method !== 'POST') return J({ error: 'Bad method' }, 405);

  let o; try { o = await request.json(); } catch (e) { return J({ error: 'Bad request' }, 400); }
  if (o.a === 'logout') {
    await env.YQ.delete('asess:' + request.headers.get('x-admin-token'));
    await audit(env, request, who, 'logout', 'Signed out');
    return J({ ok: 1 });
  }
  if (o.a === 'inbox-del' && who.r !== 'viewer') {
    await env.YQ.put('inbox', JSON.stringify((await rd(env, 'inbox', [])).filter(x => x.id !== o.id)));
    await audit(env, request, who, 'inbox-delete', 'Deleted an enquiry');
    return J({ ok: 1 });
  }
  if (who.r !== 'owner') return J({ error: 'Owners only.' }, 403);

  const us = await rd(env, 'admins', {}), u = String(o.u || '').trim().toLowerCase();
  if (o.a === 'user-add') {
    const pw = String(o.p || '');
    if (!/^[a-z0-9_.-]{3,24}$/.test(u) || u === 'master') return J({ error: 'Username: 3-24 letters, numbers, . _ or -.' }, 400);
    if (pw.length < 10) return J({ error: 'Password must be 10+ characters.' }, 400);
    if (!ROLES.includes(o.role)) return J({ error: 'Pick a role.' }, 400);
    if (us[u]) return J({ error: 'That username already exists.' }, 409);
    const s = crypto.randomUUID();
    us[u] = { s, h: await pbkdf2(pw, s), r: o.role, c: new Date().toISOString() };
    await env.YQ.put('admins', JSON.stringify(us));
    await audit(env, request, who, 'user-add', 'Added ' + u + ' as ' + o.role);
    return J({ ok: 1 });
  }
  if (!us[u]) return J({ error: 'No such user.' }, 404);
  if (o.a === 'user-role') {
    if (!ROLES.includes(o.role)) return J({ error: 'Pick a role.' }, 400);
    if (u === who.u) return J({ error: 'You cannot change your own role.' }, 400);
    const was = us[u].r; us[u].r = o.role;
    await env.YQ.put('admins', JSON.stringify(us));
    await audit(env, request, who, 'user-role', u + ': ' + was + ' to ' + o.role);
    return J({ ok: 1 });
  }
  if (o.a === 'user-password') {
    const pw = String(o.p || '');
    if (pw.length < 10) return J({ error: 'Password must be 10+ characters.' }, 400);
    const s = crypto.randomUUID(); us[u].s = s; us[u].h = await pbkdf2(pw, s);
    await env.YQ.put('admins', JSON.stringify(us));
    await audit(env, request, who, 'user-password', 'Reset password for ' + u);
    return J({ ok: 1 });
  }
  if (o.a === 'user-delete') {
    if (u === who.u) return J({ error: 'You cannot remove yourself.' }, 400);
    delete us[u];
    await env.YQ.put('admins', JSON.stringify(us));
    await audit(env, request, who, 'user-delete', 'Removed ' + u);
    return J({ ok: 1 });
  }
  return J({ error: 'Unknown action.' }, 400);
}
