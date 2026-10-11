// Serves everything in /public and adds a few security headers.
// Add your own routes here (e.g. /api/scores) before the asset fallthrough.
export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    return new Response(res.body, { status: res.status, headers });
  },
};
