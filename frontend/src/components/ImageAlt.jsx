export function productImageAlt(product, view = 'front', color) {
  const productName = product?.name || 'Garment';
  const selectedColor = color || product?.colors?.[0];
  return `${productName}${selectedColor ? ` ${selectedColor}` : ''} ${view} view — ZAVIKOO`;
}
