import { describe, expect, it } from 'vitest';
import { productJsonLd } from './jsonld.js';

const serialize = (value) => JSON.stringify(value);

describe('productJsonLd', () => {
  it('creates a product offer using PKR and real stock without invented ratings', () => {
    const schema = productJsonLd({
      slug: 'sample-tee',
      name: 'Sample Tee',
      description: 'A sample product description.',
      sku: 'SAMPLE-TEE',
      basePricePaisa: 250000,
      variants: [{ stockQty: 3 }],
    }, 'https://shop.example.test');

    expect(schema['@type']).toBe('Product');
    expect(schema.offers.priceCurrency).toBe('PKR');
    expect(schema.offers.price).toBe('2500.00');
    expect(schema.offers.availability).toBe('https://schema.org/InStock');
    expect(schema.aggregateRating).toBeUndefined();
    expect(schema.review).toEqual([]);
    expect(serialize(schema)).not.toMatch(/null|NaN|undefined/);
  });

  it('omits availability when no real stock data is available', () => {
    const schema = productJsonLd({
      slug: 'sample-tee',
      name: 'Sample Tee',
      sku: 'SAMPLE-TEE',
      basePricePaisa: 250000,
    }, 'https://shop.example.test');

    expect(schema.offers.availability).toBeUndefined();
    expect(schema.aggregateRating).toBeUndefined();
  });

  it('does not treat a null stock quantity as confirmed out-of-stock inventory', () => {
    const schema = productJsonLd({
      slug: 'sample-tee',
      name: 'Sample Tee',
      sku: 'SAMPLE-TEE',
      basePricePaisa: 250000,
      variants: [{ stockQty: null }],
    }, 'https://shop.example.test');

    expect(schema.offers.availability).toBeUndefined();
  });

  it('adds review markup only from supplied approved database reviews', () => {
    const schema = productJsonLd({
      slug: 'sample-tee',
      name: 'Sample Tee',
      sku: 'SAMPLE-TEE',
      basePricePaisa: 250000,
    }, 'https://shop.example.test', [{
      reviewerName: 'Real Customer',
      rating: 5,
      comment: 'A real approved review.',
      createdAt: '2026-01-15T12:00:00.000Z',
    }], { count: 1, averageRating: 5 });

    expect(schema.aggregateRating.reviewCount).toBe(1);
    expect(schema.review[0].reviewBody).toBe('A real approved review.');
  });
});
