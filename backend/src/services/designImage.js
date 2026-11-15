export const MAX_DESIGN_IMAGE_BYTES = 5 * 1024 * 1024;

export function isValidDesignImageDataUrl(value) {
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return false;

  const image = Buffer.from(match[2], 'base64');
  return image.length > 0
    && image.length <= MAX_DESIGN_IMAGE_BYTES
    && image.toString('base64') === match[2];
}

