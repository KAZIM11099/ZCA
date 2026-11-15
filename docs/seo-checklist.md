# SEO launch checklist

- [ ] Set `VITE_SITE_URL` to the final canonical HTTPS origin.
- [ ] Confirm every business fact in `frontend/src/content/businessFacts.js`; keep unknowns unset.
- [ ] Confirm checkout, shipping, COD, and return settings match public copy.
- [ ] Verify canonical, title, description, Open Graph, and robots metadata on each public and private route.
- [ ] Confirm unknown URLs return an HTTP 404 after SSR/prerendering is deployed.
- [ ] Check `/robots.txt`, `/sitemap.xml`, and `/llms.txt` in the deployed environment.
- [ ] Validate JSON-LD with Schema.org Validator and Google Rich Results Test.
- [ ] Submit the sitemap to Google Search Console and Bing Webmaster Tools.
- [ ] Inspect at least 10 key URLs in Search Console and monitor indexing/canonical selection.
- [ ] Test Home, Shop, Product, FAQ, and policy layouts on desktop and mobile.
- [ ] Check Core Web Vitals and image alternatives on real devices.
- [ ] Review candidate keywords weekly after launch; refresh useful content monthly.
- [ ] Add analytics IDs only after consent/privacy requirements are decided.
