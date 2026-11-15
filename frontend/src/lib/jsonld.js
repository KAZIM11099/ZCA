import { businessFacts, canonicalDescription, canonicalSiteUrl } from '../content/businessFacts.js';

export function getSiteUrl() {
  return (import.meta.env.VITE_SITE_URL || canonicalSiteUrl).replace(/\/+$/, '');
}

function withoutUnknownValues(value) {
  if (Array.isArray(value)) {
    return value.map(withoutUnknownValues).filter((entry) => entry !== undefined);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, entry]) => [key, withoutUnknownValues(entry)])
        .filter(([, entry]) => entry !== undefined),
    );
  }
  return value === null || value === undefined || value === '' ? undefined : value;
}

export function serializeJsonLd(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');
}

export function organizationJsonLd(siteUrl) {
  const sameAs = [businessFacts.instagramUrl, businessFacts.tiktokUrl, businessFacts.facebookUrl].filter(Boolean);
  return withoutUnknownValues({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: businessFacts.brandName || 'ZAVIKOO Custom Atelier',
    legalName: businessFacts.legalName,
    url: siteUrl,
    description: canonicalDescription,
    sameAs,
    areaServed: businessFacts.serviceArea || businessFacts.country,
    contactPoint: businessFacts.email || businessFacts.phone || businessFacts.whatsapp
      ? {
        '@type': 'ContactPoint',
        email: businessFacts.email,
        telephone: businessFacts.phone || businessFacts.whatsapp,
        availableLanguage: ['English', 'Urdu'],
      }
      : undefined,
  });
}

export function websiteJsonLd(siteUrl) {
  if (!siteUrl) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: businessFacts.brandName || 'ZAVIKOO Custom Atelier',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/shop?search={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items, siteUrl) {
  if (!siteUrl || !items?.length) return null;
  return withoutUnknownValues({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.path, siteUrl).href,
    })),
  });
}

export function productJsonLd(product, siteUrl, approvedReviews = [], reviewSummary = { count: 0, averageRating: 0 }) {
  if (!product || !siteUrl) return null;
  const pricePaisa = product.salePricePaisa ?? product.basePricePaisa;
  if (!Number.isFinite(pricePaisa) || pricePaisa < 0) return null;
  const hasStockData = Array.isArray(product.variants)
    && product.variants.length > 0
    && product.variants.every((variant) => (
      variant.stockQty !== null
      && variant.stockQty !== undefined
      && variant.stockQty !== ''
      && Number.isFinite(Number(variant.stockQty))
    ));
  const stockCount = hasStockData
    ? product.variants.reduce((total, variant) => total + Math.max(0, Number(variant.stockQty)), 0)
    : undefined;
  const image = [product.imageFront, product.imageBack, ...(product.images || []).map((entry) => entry.url || entry.storageKey)]
    .filter((url) => typeof url === 'string' && /^https?:\/\//i.test(url));
  return withoutUnknownValues({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    sku: product.sku,
    image,
    brand: { '@type': 'Brand', name: businessFacts.brandName || 'ZAVIKOO Custom Atelier' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'PKR',
      price: (pricePaisa / 100).toFixed(2),
      availability: stockCount === undefined
        ? undefined
        : stockCount > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: new URL(`/product/${encodeURIComponent(product.slug)}`, siteUrl).href,
      itemCondition: 'https://schema.org/NewCondition',
    },
    aggregateRating: reviewSummary.count > 0 && Number.isFinite(reviewSummary.averageRating)
      ? {
        '@type': 'AggregateRating',
        ratingValue: reviewSummary.averageRating,
        reviewCount: reviewSummary.count,
        bestRating: 5,
        worstRating: 1,
      }
      : undefined,
    review: approvedReviews.map((review) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: review.reviewerName },
      datePublished: review.createdAt,
      reviewBody: review.comment,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
    })),
  });
}

export function faqJsonLd(faqs) {
  if (!Array.isArray(faqs) || !faqs.length) return null;
  return withoutUnknownValues({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  });
}

export function articleJsonLd(article, siteUrl) {
  if (!article || !siteUrl) return null;
  return withoutUnknownValues({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt || article.publishedAt,
    author: {
      '@type': 'Organization',
      name: article.author || 'ZAVIKOO Studio Team',
    },
    publisher: organizationJsonLd(siteUrl),
    mainEntityOfPage: new URL(`/guides/${article.slug}`, siteUrl).href,
  });
}

export function collectionJsonLd(collection, products, siteUrl) {
  if (!siteUrl) return null;
  return withoutUnknownValues({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: collection?.name || 'Shop clothing',
    description: collection?.description,
    url: collection?.path
      ? new URL(collection.path, siteUrl).href
      : collection?.slug
        ? new URL(`/collections/${encodeURIComponent(collection.slug)}`, siteUrl).href
        : new URL('/collections', siteUrl).href,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: (products || []).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        url: new URL(`/product/${encodeURIComponent(product.slug)}`, siteUrl).href,
        name: product.name,
      })),
    },
  });
}
