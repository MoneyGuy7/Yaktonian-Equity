# Yaktonian Equity (Cloudflare Workers)
- Website files are in `public/`. Server code is `worker.js` and `src/`.
- Cloudflare settings: Build command empty, Deploy command `npx wrangler deploy`, Path empty.
- After the first deploy, add a SECRET named ADMIN_PASSWORD in the Worker's Settings > Variables and Secrets.
- Open /version.html on your live site to check everything is in place.
