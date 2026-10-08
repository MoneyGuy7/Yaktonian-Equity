// Serves the website files and the two small APIs (live saving + updates feed).
import * as data from './src/data.js';
import { onRequest as feed } from './src/feed.js';

export default {
  async fetch(request, env, ctx) {
    const path = new URL(request.url).pathname.replace(/\/+$/, '');
    if (path === '/api/data') {
      const h = { GET: data.onRequestGet, POST: data.onRequestPost, PUT: data.onRequestPut }[request.method];
      return h ? h({ request, env, ctx }) : new Response('Method not allowed', { status: 405 });
    }
    if (path === '/api/feed') return feed({ request, env, ctx });
    return env.ASSETS.fetch(request);
  }
};
