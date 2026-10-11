// Server-rendered pages for search engines: /articles/<slug>, /sitemap.xml and /robots.txt.
import { esc, mdr } from './md.js';
import { CALCS } from './calcs.js';

const PAGES = ['', 'daily', 'performance', 'portfolio', 'trades', 'tools', 'articles', 'updates', 'why-invest', 'invest', 'trust'];
const NAV = [['/', 'Home'], ['/daily', 'Daily gains'], ['/performance', 'Profits'], ['/portfolio', 'Portfolio'], ['/trades', 'Trades'], ['/tools', 'Tools'], ['/articles', 'Articles'], ['/updates', 'Updates'], ['/why-invest', 'Why invest'], ['/invest', 'Invest']];
const getData = async env => { try { return JSON.parse(await env.YQ.get('data')) || {}; } catch (e) { return {}; } };
const html = (b, s = 200) => new Response(b, { status: s, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });

function article(D, a, origin) {
  const firm = D.firm || 'Yaktonian Equity', url = origin + '/articles/' + a.slug;
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.desc, datePublished: a.date, dateModified: a.updated || a.date, author: { '@type': 'Organization', name: firm }, mainEntityOfPage: url }).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(a.title)} · ${esc(firm)}</title><meta name="description" content="${esc(a.desc)}"><link rel="canonical" href="${url}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(a.title)}"><meta property="og:description" content="${esc(a.desc)}"><meta property="og:url" content="${url}">
<script type="application/ld+json">${ld}</script>
<script>try{document.documentElement.dataset.theme=localStorage.getItem('yq-theme')||'light'}catch(e){}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css?v=9"></head><body>
<header><div class="wrap"><a class="logo" href="/"><span class="mark">${esc(firm[0])}</span>${esc(firm)}</a><nav>${NAV.map(n => `<a href="${n[0]}" class="${n[0] === '/articles' ? 'on' : ''} ${n[0] === '/invest' ? 'cta' : ''}">${n[1]}</a>`).join('')}</nav></div></header>
<main><div class="wrap"><article class="art"><p class="stamp">${esc(a.date)}${a.tags ? ' · ' + esc(a.tags) : ''}</p><h1>${esc(a.title)}</h1>${mdr(a.body)}<p class="note">Past performance does not guarantee future results. Investing involves risk, including loss of principal. Nothing here is investment advice.</p></article><p><a href="/articles">All articles</a></p></div></main>
<footer><div class="wrap">Past performance does not guarantee future results. <a href="/trust">Trust and data</a></div></footer></body></html>`;
}

export async function handle(request, env) {
  const u = new URL(request.url), p = u.pathname.replace(/\/+$/, ''), o = u.origin;
  if (p === '/robots.txt')
    return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin.html\nDisallow: /api/\nDisallow: /version\nDisallow: /version.html\n\nSitemap: ${o}/sitemap.xml\n`, { headers: { 'content-type': 'text/plain' } });
  if (p === '/sitemap.xml') {
    const D = env.YQ ? await getData(env) : {};
    const urls = PAGES.map(x => [o + '/' + x, '']).concat(CALCS.map(c => [o + '/tools/' + c[0], '']))
      .concat((D.articles || []).filter(a => a.status === 'published').map(a => [o + '/articles/' + a.slug, a.updated || a.date || '']));
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([l, m]) => `<url><loc>${esc(l)}</loc>${m ? `<lastmod>${esc(m)}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`, { headers: { 'content-type': 'application/xml' } });
  }
  const m = p.match(/^\/articles\/([a-z0-9-]+)$/);
  if (m && env.YQ) {
    const D = await getData(env), a = (D.articles || []).find(x => x.slug === m[1] && x.status === 'published');
    if (a) return html(article(D, a, o));
  }
  return null;
}
