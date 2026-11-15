import { Router } from 'express';
import { env } from '../config/env.js';
import { prisma } from '../db.js';

const router = Router();
const SITE_URL = (env.SITE_URL || env.CLIENT_ORIGIN).replace(/\/+$/, '');
const STATIC_PAGES = [
  '/',
  '/shop',
  '/collections',
  '/customize',
  '/custom-quote',
  '/about',
  '/contact',
  '/faq',
  '/size-guide',
  '/shipping-policy',
  '/returns-exchanges',
  '/privacy-policy',
  '/terms-and-conditions',
  '/guides',
];
const GUIDE_PATHS = [
  '/guides/artwork-preparation',
  '/guides/printing-methods',
  '/guides/garment-fit',
  '/guides/fabric-guide',
  '/guides/bulk-ordering',
  '/guides/team-event-shirts',
  '/guides/printed-garment-care',
  '/guides/cash-on-delivery',
];
const sitemapCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

async function getCachedXml(key, load) {
  const cached = sitemapCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.content;
  const content = await load();
  sitemapCache.set(key, { content, expiresAt: Date.now() + CACHE_TTL_MS });
  return content;
}

function xmlEscape(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function sendXml(res, content) {
  res.set({
    'Content-Type': 'application/xml; charset=utf-8',
    'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  return res.send(content);
}

function urlSet(entries) {
  const urls = entries.map(({ path, updatedAt }) => {
    const lastmod = updatedAt ? `<lastmod>${new Date(updatedAt).toISOString()}</lastmod>` : '';
    return `<url><loc>${xmlEscape(new URL(path, SITE_URL).href)}</loc>${lastmod}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`;
}

router.get('/sitemap.xml', (req, res) => sendXml(res, `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['sitemap-pages.xml', 'sitemap-products.xml', 'sitemap-collections.xml', 'sitemap-guides.xml'].map((path) => `<sitemap><loc>${xmlEscape(new URL(`/${path}`, SITE_URL).href)}</loc></sitemap>`).join('')}</sitemapindex>`));

router.get('/sitemap-pages.xml', (req, res) => sendXml(res, urlSet(STATIC_PAGES.map((path) => ({ path })))));
router.get('/sitemap-guides.xml', (req, res) => sendXml(res, urlSet(GUIDE_PATHS.map((path) => ({ path })))));

router.get('/sitemap-products.xml', async (req, res, next) => {
  try {
    const xml = await getCachedXml('products', async () => {
      const products = await prisma.product.findMany({
        where: { status: 'PUBLISHED' },
        select: { slug: true, updatedAt: true },
        orderBy: { id: 'asc' },
        take: 50_000,
      });
      return urlSet(products.map((product) => ({
        path: `/product/${encodeURIComponent(product.slug)}`,
        updatedAt: product.updatedAt,
      })));
    });
    return sendXml(res, xml);
  } catch (error) {
    return next(error);
  }
});

router.get('/sitemap-collections.xml', async (req, res, next) => {
  try {
    const xml = await getCachedXml('collections', async () => {
      const [collections, categories] = await Promise.all([
        prisma.collection.findMany({
          where: { isActive: true },
          select: { slug: true },
          orderBy: { id: 'asc' },
          take: 50_000,
        }),
        prisma.category.findMany({
          where: { isActive: true },
          select: { slug: true },
          orderBy: { sortOrder: 'asc' },
          take: 50_000,
        }),
      ]);
      return urlSet([
        ...collections.map(({ slug }) => ({ path: `/collections/${encodeURIComponent(slug)}` })),
        ...categories.map(({ slug }) => ({ path: `/categories/${encodeURIComponent(slug)}` })),
      ]);
    });
    return sendXml(res, xml);
  } catch (error) {
    return next(error);
  }
});

export default router;
