import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { getSiteUrl, organizationJsonLd, serializeJsonLd, websiteJsonLd } from '../lib/jsonld.js';
import { getPageMetadata, normalizeDescription, normalizeTitle, pageMetadata, privateRoute } from '../lib/seoMetadata.js';

export { pageMetadata };

export function Seo({
  title,
  description,
  path,
  image,
  type = 'website',
  noindex,
  jsonLd = [],
}) {
  const location = useLocation();
  const canonicalBase = getSiteUrl();
  const pathname = (path || location.pathname || '/').replace(/\/+$/, '') || '/';
  const params = new URLSearchParams(location.search);
  const isPrivate = privateRoute.test(pathname);
  const hasSearchOrSort = pathname === '/shop' && (params.has('search') || params.has('sort'));
  const { metadata, title: defaultTitle, description: defaultDescription } = getPageMetadata(pathname);
  const pageTitle = normalizeTitle(title || defaultTitle);
  const pageDescription = normalizeDescription(description || defaultDescription);
  const pageNumber = Number(params.get('page'));
  const canonicalPath = pathname === '/shop' && !hasSearchOrSort && pageNumber > 1
    ? `/shop?page=${encodeURIComponent(String(pageNumber))}`
    : pathname;
  const canonicalUrl = canonicalBase ? `${canonicalBase}${canonicalPath}` : undefined;
  const siteUrl = canonicalBase;
  const structuredData = [
    organizationJsonLd(siteUrl),
    pathname === '/' ? websiteJsonLd(siteUrl) : null,
    ...jsonLd,
  ].filter(Boolean);

  return (
    <Helmet>
      <html lang="en-PK" />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      {import.meta.env.VITE_GOOGLE_SITE_VERIFICATION && <meta name="google-site-verification" content={import.meta.env.VITE_GOOGLE_SITE_VERIFICATION} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="ZAVIKOO Custom Atelier" />
      <meta property="og:locale" content="en_PK" />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content={image ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      {image && <meta name="twitter:image" content={image} />}
      {(noindex || isPrivate || hasSearchOrSort || !metadata) && <meta name="robots" content="noindex,nofollow" />}
      {structuredData.map((schema, index) => (
        <script key={`${schema['@type']}-${index}`} type="application/ld+json">
          {serializeJsonLd(schema)}
        </script>
      ))}
    </Helmet>
  );
}
