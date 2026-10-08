// Cloudflare Pages Function: live storage for the admin panel.
// Needs a KV binding named YQ and an environment variable ADMIN_PASSWORD.
const J = { 'content-type': 'application/json', 'cache-control': 'no-store' };
export async function onRequestGet({ env }) {
  if (!env.YQ) return new Response('{"error":"KV not configured"}', { status: 404, headers: J });
  return new Response((await env.YQ.get('data')) || 'null', { headers: J });
}
// POST = check password only
export async function onRequestPost({ request, env }) {
  return new Response(env.ADMIN_PASSWORD && request.headers.get('x-admin-password') === env.ADMIN_PASSWORD ? 'ok' : 'no', { status: env.ADMIN_PASSWORD && request.headers.get('x-admin-password') === env.ADMIN_PASSWORD ? 200 : 401 });
}
// PUT = save data (password required)
export async function onRequestPut({ request, env }) {
  if (!env.YQ || !env.ADMIN_PASSWORD) return new Response('not configured', { status: 501 });
  if (request.headers.get('x-admin-password') !== env.ADMIN_PASSWORD) return new Response('unauthorized', { status: 401 });
  const body = await request.text();
  if (body.length > 5e6) return new Response('too large', { status: 413 });
  try { JSON.parse(body); } catch (e) { return new Response('bad json', { status: 400 }); }
  await env.YQ.put('data', body);
  return new Response('ok');
}
