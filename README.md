# Yaktonian Equity (Cloudflare Workers)
- Website files are in `public/`. Server code is `worker.js` and `src/`.
- Cloudflare settings: Build command empty, Deploy command `npx wrangler deploy`, Path empty.
- After the first deploy, add a SECRET named ADMIN_PASSWORD in the Worker's Settings > Variables and Secrets.
- Open /version.html on your live site to check everything is in place.

## Setup for the new features
- **Enquiry form**: submissions are saved in Admin > Inbox automatically. To also get them by email, add secrets `RESEND_API_KEY` and `CONTACT_TO` (your email) in Settings > Variables and Secrets. A free Resend account can send to your own address without a domain; later add `CONTACT_FROM` once you verify a domain.
- **Articles**: Admin > Articles. Only articles set to "published" are public, at `/articles/<link>`, with their own title, description, canonical link and structured data.
- **Sitemap and robots.txt** are generated at `/sitemap.xml` and `/robots.txt`. Submit the sitemap in Google Search Console.
- **Calculator pages**: `public/tools/*.html`. **Fact sheet**: Profits page, then Print > Save as PDF.
