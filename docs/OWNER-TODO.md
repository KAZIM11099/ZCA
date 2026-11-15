# Owner facts and launch checks

The source of truth for confirmed business details is [`frontend/src/content/businessFacts.js`](../frontend/src/content/businessFacts.js). Confirmed facts from the owner are reflected there. Do not fill remaining unknowns by guessing.

## Confirmed by the owner

- Public brand: ZAVIKOO Custom Atelier; later mentions may use ZAVIKOO.
- Website: `https://zavikoocustomatelier.com`.
- Location and service area: Karachi, Pakistan; delivery across Pakistan.
- Contact: `zavikoocustomatelier@gmail.com`, `0335 2794601` / `+92 335 2794601`.
- Instagram and TikTok URLs in `businessFacts.js` are official.
- Oversized graphic tees use heavyweight cotton; winter pullover hoodies use thick fleece. GSM and fibre composition were not supplied.
- DTF printing and heat-applied embroidered patches on selected designs are offered. Do not claim DTG or sewn embroidery.
- Sizes: ready-made S–XL; custom T-shirts also permit XS with measurements.
- Delivery is free across Pakistan and usually takes about 5–7 working days after order confirmation. Payment is Cash on Delivery only.
- Ready-made exchange requests are accepted within 7 days; customised items are not returned/exchanged for change of mind; studio errors/defects are corrected without delivery cost.
- GA4 Measurement ID supplied: `G-5ZW05H955R`. Events are enabled without a cookie banner at the owner's instruction; analytics events are filtered to avoid customer-identifying fields.
- The owner does not want stock availability mentioned in the returns policy or refunds included in its published wording.

## Business details still unknown

- [ ] Legal business name, tagline, founding year, public street address, opening hours, and Facebook URL.
- [ ] Size-chart measurements for each garment: chest, length, sleeve, and shoulder in inches and centimetres.
- [ ] Fabric GSM and composition.
- [ ] Custom and bulk production-time estimates; no custom-order timing beyond the general delivery estimate is promised.
- [ ] Courier partner names, COD fee (if any), and exact bulk minimums/discounts.
- [ ] DTF/patch minimum quantities and durability claims.
- [ ] Artwork minimum DPI and approved preparation tips.
- [ ] Founder/team biographies, awards, and press mentions (or confirmation that none should be published).
- [ ] Whether to publish a specific defect-report deadline. The previously suggested 48-hour deadline was marked assumed and is not included.
- [ ] Refund method or timing. Owner asked not to include refund information in the published returns policy; do not add it without renewed approval.
- [ ] Whether the custom order delivery estimate should be a separate number. The page currently says the overall 5–7 working day estimate and advises customers to confirm custom timing.

## Deployment and legal launch requirements

- [ ] Set `VITE_SITE_URL=https://zavikoocustomatelier.com` in the Vercel frontend project's production environment.
- [ ] Set `VITE_GA4_ID=G-5ZW05H955R` in the Vercel frontend project and verify events in GA4 DebugView/Realtime after deployment.
- [ ] Configure the frontend API URL and same-domain rewrites for `/api/v1/*` and backend `/sitemap*.xml` endpoints.
- [ ] Choose the third-party MySQL provider and verify its production availability, backups, TLS, connection limits, and Prisma compatibility. Vercel does not itself provide this project's MySQL database.
- [ ] The backend currently starts as a persistent Express server (`backend/src/server.js`) and this workspace has no Vercel function adapter or `vercel.json`. Adapt and test it for Vercel serverless deployment or host the Node API separately before launch.
- [ ] Review privacy policy and terms with a qualified Pakistan legal professional. Analytics loading follows the owner's no-banner instruction, but legal/privacy requirements should be checked for the actual deployment and visitors.
- [ ] Prerender/SSR or hosting fallback must return an origin-level HTTP 404 for unknown paths; the current frontend is a client-rendered SPA.
- [ ] Confirm permission/licensing for all anime, film/monster, vehicle-brand, and other third-party character/logo artwork before selling or promoting those designs. Prefer original or licensed artwork.
- [ ] Validate search candidates in Search Console/Keyword Planner; no search volume is assumed.
- [ ] Expand the eight initial guide drafts to the requested 800–1,400 words, with factual review and useful internal links, before treating them as launch-ready articles.
- [ ] Submit and verify the sitemap, canonical URLs, structured data, and Core Web Vitals after deployment.
