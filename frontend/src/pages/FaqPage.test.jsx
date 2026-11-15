import { describe, expect, it } from 'vitest';
import { faqs } from './FaqPage.jsx';

describe('FAQ content', () => {
  it('keeps the FAQ between 25 and 30 complete answers', () => {
    expect(faqs.length).toBeGreaterThanOrEqual(25);
    expect(faqs.length).toBeLessThanOrEqual(30);
    expect(faqs.every(({ question, answer }) => question && answer)).toBe(true);
  });

  it('keeps each answer between 30 and 80 words', () => {
    for (const { answer } of faqs) {
      const wordCount = answer.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(30);
      expect(wordCount).toBeLessThanOrEqual(80);
    }
  });
});
