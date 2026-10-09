// Posts feed API: public posts by the admin, with likes, accounts and replies.
// Needs: the KV binding named YQ and the ADMIN_PASSWORD secret (same as live saving).
const J = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const clean = (v) => {
  let s = String(v == null ? '' : v).trim();
  if (s.length > 1 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")))) s = s.slice(1, -1).trim();
  return s;
};
function findSecret(env) {
  const key = Object.keys(env).find((k) => k.replace(/[^a-z0-9]/gi, '').toUpperCase() === 'ADMINPASSWORD' && typeof env[k] === 'string');
  return key ? clean(env[key]) : '';
}
const isAdmin = (request, env) => {
  const want = findSecret(env);
  return !!want && clean(request.headers.get('x-admin-password')) === want;
};

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hashPw(pw, saltHex) {
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, key, 256));
}
const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12);

async function getPosts(env) {
  try { return JSON.parse((await env.YQ.get('feed:posts')) || '[]'); } catch (e) { return []; }
}
const putPosts = (env, posts) => env.YQ.put('feed:posts', JSON.stringify(posts));

async function who(request, env) {
  const tok = request.headers.get('x-token') || '';
  if (!tok) return '';
  return (await env.YQ.get('feed:tok:' + tok)) || '';
}
async function newToken(env, user) {
  const tok = crypto.randomUUID() + crypto.randomUUID();
  await env.YQ.put('feed:tok:' + tok, user, { expirationTtl: 60 * 60 * 24 * 30 });
  return tok;
}

export async function onRequest({ request, env }) {
  if (!env.YQ) return new Response('KV not configured', { status: 404 });
  const me = await who(request, env);
  const voter = me ? 'u:' + me : 'a:' + (request.headers.get('x-anon') || 'none');

  if (request.method === 'GET') {
    const posts = (await getPosts(env)).slice().sort((a, b) => (a.d < b.d ? 1 : -1));
    return J({
      me,
      posts: posts.map((p) => ({
        id: p.id, d: p.d, t: p.t || '', b: p.b, n: (p.likes || []).length, y: (p.likes || []).includes(voter),
        r: (p.r || []).map((x) => ({ id: x.id, u: x.u, d: x.d, b: x.b, n: (x.likes || []).length, y: (x.likes || []).includes(voter) })),
      })),
    });
  }
  if (request.method !== 'POST') return J({ error: 'Method not allowed' }, 405);

  let o;
  try { o = await request.json(); } catch (e) { return J({ error: 'Bad request' }, 400); }
  const a = o && o.a;

  if (a === 'signup' || a === 'login') {
    const u = String(o.u || '').trim().toLowerCase(), p = String(o.p || '');
    if (!/^[a-z0-9_]{3,20}$/.test(u)) return J({ error: 'Username must be 3 to 20 letters, numbers or underscores.' }, 400);
    if (p.length < 6) return J({ error: 'Password must be at least 6 characters.' }, 400);
    const key = 'feed:user:' + u, rec = JSON.parse((await env.YQ.get(key)) || 'null');
    if (a === 'signup') {
      if (rec) return J({ error: 'That username is taken.' }, 400);
      const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
      await env.YQ.put(key, JSON.stringify({ u, salt, hash: await hashPw(p, salt) }));
      return J({ token: await newToken(env, u) });
    }
    if (!rec || (await hashPw(p, rec.salt)) !== rec.hash) return J({ error: 'Wrong username or password.' }, 401);
    return J({ token: await newToken(env, u) });
  }

  const posts = await getPosts(env);

  if (a === 'post') {
    if (!isAdmin(request, env)) return J({ error: 'Only the admin can post. Sign in at admin.html first.' }, 403);
    const b = String(o.b || '').trim().slice(0, 4000);
    if (!b) return J({ error: 'Write a message first.' }, 400);
    posts.push({ id: newId(), d: new Date().toISOString(), t: String(o.t || '').trim().slice(0, 200), b, likes: [], r: [] });
    await putPosts(env, posts);
    return J({ ok: true });
  }

  const post = posts.find((x) => x.id === o.id);
  if (!post) return J({ error: 'That post was not found.' }, 404);

  if (a === 'like') {
    const target = o.rid ? (post.r || []).find((x) => x.id === o.rid) : post;
    if (!target) return J({ error: 'Not found.' }, 404);
    target.likes = target.likes || [];
    const i = target.likes.indexOf(voter);
    if (i >= 0) target.likes.splice(i, 1); else target.likes.push(voter);
    await putPosts(env, posts);
    return J({ ok: true });
  }
  if (a === 'reply') {
    if (!me) return J({ error: 'Log in to reply.' }, 401);
    const b = String(o.b || '').trim().slice(0, 1500);
    if (!b) return J({ error: 'Write a reply first.' }, 400);
    post.r = post.r || [];
    post.r.push({ id: newId(), u: me, d: new Date().toISOString(), b, likes: [] });
    await putPosts(env, posts);
    return J({ ok: true });
  }
  if (a === 'del') {
    if (!isAdmin(request, env)) return J({ error: 'Only the admin can delete.' }, 403);
    if (o.rid) post.r = (post.r || []).filter((x) => x.id !== o.rid);
    else posts.splice(posts.indexOf(post), 1);
    await putPosts(env, posts);
    return J({ ok: true });
  }
  return J({ error: 'Unknown action.' }, 400);
}
