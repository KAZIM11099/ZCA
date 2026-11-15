import { rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadEnv } from 'vite';
import { guides } from '../src/content/guides/index.js';
import { businessFacts, canonicalDescription, canonicalSiteUrl } from '../src/content/businessFacts.js';

const AI_CRAWLER_POLICY = 'allow';
const buildEnv = loadEnv('production', process.cwd(), '');
const siteUrl = (process.env.VITE_SITE_URL || buildEnv.VITE_SITE_URL || canonicalSiteUrl).trim().replace(/\/+$/, '');
const publicDirectory = resolve('public');
const publicPaths = [
  '/',
  '/shop',
  '/collections',
  '/customize',
  '/custom-quote',
  '/about',
  '/contact',
  '/faq',
  '/sitemap',
  '/size-guide',
  '/shipping-policy',
  '/returns-exchanges',
  '/privacy-policy',
  '/terms-and-conditions',
  '/guides',
  ...guides.map((guide) => `/guides/${guide.slug}`),
];

const robotsGroups = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /admin',
  'Disallow: /account',
  'Disallow: /cart',
  'Disallow: /checkout',
  'Disallow: /login',
  'Disallow: /register',
  'Disallow: /forgot-password',
  'Disallow: /reset-password',
  'Disallow: /wishlist',
  'Disallow: /order-confirmation',
  'Disallow: /api',
  'Disallow: /*?search=',
  'Disallow: /*&search=',
  'Disallow: /*?sort=',
  'Disallow: /*&sort=',
  '',
  '# GPTBot is associated with model training; OAI-SearchBot is used for search retrieval.',
  '# Google-Extended controls certain training uses; Googlebot handles Search indexing.',
  '# Anthropic, Perplexity, Common Crawl, and ByteDance publish crawler names/policies that may change.',
];
const aiCrawlers = ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'Bytespider'];
for (const crawler of aiCrawlers) {
  robotsGroups.push(`User-agent: ${crawler}`);
  robotsGroups.push(AI_CRAWLER_POLICY === 'allow' ? 'Allow: /' : 'Disallow: /');
  robotsGroups.push('Disallow: /admin', 'Disallow: /account', 'Disallow: /cart', 'Disallow: /checkout', 'Disallow: /login', 'Disallow: /register', 'Disallow: /forgot-password', 'Disallow: /reset-password', 'Disallow: /wishlist', 'Disallow: /order-confirmation', 'Disallow: /api', '');
}
if (siteUrl) robotsGroups.push(`Sitemap: ${siteUrl}/sitemap.xml`);
await writeFile(resolve(publicDirectory, 'robots.txt'), `${robotsGroups.join('\n')}\n`, 'utf8');

const knownFacts = Object.entries(businessFacts)
  .filter(([, value]) => value !== null && value !== undefined)
  .map(([key, value]) => `- ${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
const links = publicPaths.map((path) => `- [${path === '/' ? 'Home' : path.slice(1).replaceAll('/', ' — ')}](${siteUrl}${path})`);
const summary = [
  '# ZAVIKOO Custom Atelier',
  '',
  `> ${canonicalDescription}`,
  '',
  '## Confirmed business facts',
  '',
  ...(knownFacts.length ? knownFacts : ['- Business details are being confirmed; consult the site for current product information.']),
  '',
  '## Pages',
  '',
  ...links,
  '',
].join('\n');
await writeFile(resolve(publicDirectory, 'llms.txt'), summary, 'utf8');

const guideText = guides.flatMap((guide) => [
  `## ${guide.title}`,
  '',
  guide.description,
  '',
  ...guide.sections.flatMap((section) => [`### ${section.heading}`, '', ...section.paragraphs, '']),
  `Read more: ${siteUrl}/guides/${guide.slug}`,
  '',
]);
await writeFile(resolve(publicDirectory, 'llms-full.txt'), `${summary}\n${guideText.join('\n')}`, 'utf8');

if (siteUrl) {
  const xmlEscape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');
  const pagePaths = publicPaths.filter((path) => !path.startsWith('/guides/'));
  const entries = pagePaths.map((path) => `  <url><loc>${xmlEscape(`${siteUrl}${path}`)}</loc></url>`).join('\n');
  await writeFile(resolve(publicDirectory, 'sitemap-pages.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`, 'utf8');
  const sitemapFiles = ['sitemap-pages.xml', 'sitemap-products.xml', 'sitemap-collections.xml', 'sitemap-guides.xml'];
  const sitemapEntries = sitemapFiles.map((file) => `  <sitemap><loc>${xmlEscape(`${siteUrl}/${file}`)}</loc></sitemap>`).join('\n');
  await writeFile(resolve(publicDirectory, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</sitemapindex>\n`, 'utf8');
} else {
  await Promise.all([
    rm(resolve(publicDirectory, 'sitemap-pages.xml'), { force: true }),
    rm(resolve(publicDirectory, 'sitemap.xml'), { force: true }),
  ]);
}
