// POST /api/contact: saves the enquiry in KV (shown in Admin > Inbox) and emails it if configured.
// Optional email: set secrets RESEND_API_KEY and CONTACT_TO (and CONTACT_FROM once you verify a domain in Resend).
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function mail(env, r) {
  if (!env.RESEND_API_KEY || !env.CONTACT_TO) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: env.CONTACT_FROM || 'Yaktonian Equity <onboarding@resend.dev>', to: [env.CONTACT_TO], reply_to: r.email,
        subject: 'New enquiry from ' + r.name,
        text: `Name: ${r.name}\nEmail: ${r.email}\nPhone: ${r.phone}\nAmount: ${r.amount}\n\n${r.message}`,
      }),
    });
  } catch (e) {}
}

export async function onRequest({ request, env, ctx }) {
  if (request.method !== 'POST') return J({ error: 'Method not allowed' }, 405);
  if (!env.YQ) return J({ error: 'KV not configured' }, 404);
  let o; try { o = await request.json(); } catch (e) { return J({ error: 'Bad request' }, 400); }
  if (o.website) return J({ ok: true }); // honeypot: bots fill this hidden field
  const c = (k, n = 200) => String(o[k] || '').trim().slice(0, n);
  const r = { id: crypto.randomUUID().slice(0, 8), t: new Date().toISOString(), name: c('name'), email: c('email'), phone: c('phone'), amount: c('amount'), message: c('message', 4000) };
  if (!r.name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email)) return J({ error: 'A name and valid email are required.' }, 400);
  const rk = 'cf:' + (request.headers.get('cf-connecting-ip') || 'x'), n = +((await env.YQ.get(rk)) || 0);
  if (n >= 5) return J({ error: 'Too many messages. Please try again later.' }, 429);
  await env.YQ.put(rk, String(n + 1), { expirationTtl: 3600 });
  const box = JSON.parse((await env.YQ.get('inbox')) || '[]');
  box.unshift(r);
  await env.YQ.put('inbox', JSON.stringify(box.slice(0, 500)));
  ctx.waitUntil(mail(env, r));
  return J({ ok: true });
}
