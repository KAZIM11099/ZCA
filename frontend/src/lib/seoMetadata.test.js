import { describe, expect, it } from 'vitest';
import { normalizeDescription, normalizeTitle, pageMetadata, privateRoute } from './seoMetadata.js';

describe('SEO route metadata', () => {
  it('keeps every default title and description within search snippet limits', () => {
    const titles = pageMetadata.map(({ title }) => normalizeTitle(title.replaceAll('{slug}', 'Sample Item')));

    expect(new Set(titles).size).toBe(titles.length);
    for (const { description } of pageMetadata) {
      const normalized = normalizeDescription(description.replaceAll('{slug}', 'Sample Item'));
      expect(normalized.length).toBeGreaterThanOrEqual(140);
      expect(normalized.length).toBeLessThanOrEqual(160);
    }
    expect(titles.every((title) => title.length <= 60)).toBe(true);
  });

  it('marks private routes and descendants as private', () => {
    for (const path of ['/cart', '/checkout', '/account/orders', '/admin/products', '/order-confirmation/123']) {
      expect(privateRoute.test(path)).toBe(true);
    }
  });
});
