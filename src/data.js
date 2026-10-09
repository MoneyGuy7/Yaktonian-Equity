// Live saving API: GET reads the site data, POST checks the admin password, PUT saves.
// Needs: a Worker secret named ADMIN_PASSWORD and a KV binding named YQ.
const J = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const clean = (v) => {
  let s = String(v == null ? '' : v).trim();
  if (s.length > 1 && ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'")))) s = s.slice(1, -1).trim();
  return s;
};

// Finds the secret even if its name has different capitals, spaces or underscores.
function findSecret(env) {
  const key = Object.keys(env).find((k) => k.replace(/[^a-z0-9]/gi, '').toUpperCase() === 'ADMINPASSWORD' && typeof env[k] === 'string');
  return key ? clean(env[key]) : '';
}

function check(request, env) {
  const want = findSecret(env);
  if (!want) {
    const names = Object.keys(env).filter((k) => k !== 'ASSETS');
    return J({ error: 'ADMIN_PASSWORD secret is not set on the Worker that is running this site.', settingsThisWorkerCanSee: names }, 500);
  }
  const got = clean(request.headers.get('x-admin-password'));
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
