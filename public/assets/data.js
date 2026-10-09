// Live saving API: GET reads the site data, POST checks the admin password, PUT saves.
// Needs: a Worker secret named ADMIN_PASSWORD and a KV binding named YQ.
const J = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

function check(request, env) {
  const want = String(env.ADMIN_PASSWORD == null ? '' : env.ADMIN_PASSWORD).trim();
  if (!want) return J({ error: 'ADMIN_PASSWORD secret is not set on this Worker' }, 500);
  const got = String(request.headers.get('x-admin-password') || '').trim();
  if (got !== want) return J({ error: 'Wrong password' }, 401);
  return null;
}

export async function onRequestGet({ env }) {
  if (!env.YQ) return J({ error: 'KV not configured' }, 404);
  const v = await env.YQ.get('data');
  return new Response(v || 'null', { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  const bad = check(request, env);
  if (bad) return bad;
  return J({ ok: true });
}

export async function onRequestPut({ request, env }) {
  const bad = check(request, env);
  if (bad) return bad;
  if (!env.YQ) return J({ error: 'KV not configured' }, 404);
  const body = await request.text();
  try { JSON.parse(body); } catch (e) { return J({ error: 'Bad JSON' }, 400); }
  await env.YQ.put('data', body);
  return J({ ok: true });
}
