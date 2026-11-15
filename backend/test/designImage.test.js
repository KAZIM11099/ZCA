import test from 'node:test';
import assert from 'node:assert/strict';
import { isValidDesignImageDataUrl, MAX_DESIGN_IMAGE_BYTES } from '../src/services/designImage.js';

test('accepts design images up to 5 MB', () => {
  const image = Buffer.alloc(MAX_DESIGN_IMAGE_BYTES).toString('base64');
  assert.equal(isValidDesignImageDataUrl(`data:image/png;base64,${image}`), true);
});

test('rejects design images larger than 5 MB and malformed data URLs', () => {
  const oversizedImage = Buffer.alloc(MAX_DESIGN_IMAGE_BYTES + 1).toString('base64');
  assert.equal(isValidDesignImageDataUrl(`data:image/png;base64,${oversizedImage}`), false);
  assert.equal(isValidDesignImageDataUrl('data:image/png;base64,not base64!'), false);
});

