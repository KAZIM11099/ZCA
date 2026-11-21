export const customColors = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Black', hex: '#202020' },
  { name: 'Navy', hex: '#26354c' },
  { name: 'Beige', hex: '#d8cbb8' },
  { name: 'Sage', hex: '#87917b' },
  { name: 'Red', hex: '#b6443a' },
  { name: 'Blue', hex: '#6684a1' },
  { name: 'Pink', hex: '#d9a8b2' },
];

export function getGarmentColor(layout = {}) {
  const fallback = customColors.find((entry) => entry.name === layout.color) || customColors[0];
  const hex = /^#[0-9A-Fa-f]{6}$/.test(layout.colorHex || '') ? layout.colorHex : fallback.hex;
  return { name: layout.color || fallback.name, hex };
}

export function getContrastingTextColor(hex) {
  const channels = hex.match(/[0-9A-Fa-f]{2}/g)?.map((channel) => Number.parseInt(channel, 16) / 255);
  if (!channels || channels.length !== 3) return '#202020';
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) > 0.45 ? '#202020' : '#ffffff';
}

export function calculateCustomDesignPricePaisa(basePricePaisa, layout = {}) {
  let surchargePaisa = 0;
  const imageSize = Number(layout.imageSizeInches);
  const textWidth = Number(layout.textWidthInches);

  if (layout.imageData) {
    if (layout.imagePlacement === 'both') {
      surchargePaisa += [16, 18].includes(imageSize) ? 70000 : 50000;
    } else if ([16, 18].includes(imageSize)) {
      surchargePaisa += imageSize === 16 ? 10000 : 30000;
    }
  }

  if (layout.text) {
    if (layout.textPlacement === 'both') {
      surchargePaisa += [6, 7].includes(textWidth) ? 15000 : 10000;
    } else if ([6, 7].includes(textWidth)) {
      surchargePaisa += 5000;
    }
  }

  return Number(basePricePaisa || 0) + surchargePaisa;
}

export const garmentTypes = [
  { value: 'tshirt', label: 'T-shirt' },
  { value: 'drop-shoulder', label: 'Drop shoulder' },
  { value: 'hoodie', label: 'Hoodie' },
  { value: 'sweatshirt', label: 'Sweatshirt' },
  { value: 'long-sleeve', label: 'Long-sleeve tee' },
];

const escapeXml = (value) => String(value || '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

const garmentPaths = {
  tshirt: 'M100 60 72 76 28 121 65 164 91 142 91 320 209 320 209 142 235 164 272 121 228 76 200 60Q177 78 150 78 123 78 100 60Z',
  'drop-shoulder': 'M98 58 68 74 18 112 57 166 91 144 91 320 209 320 209 144 243 166 282 112 232 74 202 58Q178 78 150 78 122 78 98 58Z',
  hoodie: 'M96 63 67 78 22 119 60 166 91 143 91 320 209 320 209 143 240 166 278 119 233 78 204 63Q180 80 150 80 120 80 96 63Z',
  sweatshirt: 'M98 60 69 76 25 118 62 163 91 141 91 320 209 320 209 141 238 163 275 118 231 76 202 60Q178 79 150 79 122 79 98 60Z',
  'long-sleeve': 'M100 60 73 76 15 115 44 172 91 148 91 320 209 320 209 148 256 172 285 115 227 76 200 60Q178 78 150 78 122 78 100 60Z',
};

function dataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function renderGarment(layout, side, sharedImage = false) {
  const { hex: color } = getGarmentColor(layout);
  const shape = garmentPaths[layout.garmentType] || garmentPaths.tshirt;
  const textPlacement = layout.textPlacement || (layout.placement === 'back' ? 'back' : 'front');
  const imagePlacement = layout.imagePlacement || 'back';
  const showText = layout.text && (textPlacement === side || textPlacement === 'both');
  const showImage = layout.imageData && (imagePlacement === side || imagePlacement === 'both');
  const textY = side === 'back' ? 176 : 188;
  const textSize = Math.min(32, Math.max(12, Number(layout.textSize) || 22));
  const imageScale = layout.imageSizeInches
    ? Math.min(2, Math.max(0.7, Number(layout.imageSizeInches) / 14))
    : Math.min(2, Math.max(0.5, Number(layout.imageScale) || 1));
  const imageWidth = 52 * imageScale;
  const imageHeight = 58 * imageScale;
  const imageX = 150 - imageWidth / 2;
  const imageY = (side === 'back' ? 157 : 166) - imageHeight / 2;
  const textColor = getContrastingTextColor(color);
  const gradientAngle = Math.min(360, Math.max(0, Number(layout.textGradientAngle) || 90));
  const radians = gradientAngle * Math.PI / 180;
  const gradientX = 50 + Math.cos(radians) * 50;
  const gradientY = 50 + Math.sin(radians) * 50;
  const textGradient = layout.textColorMode === 'gradient'
    ? `<linearGradient id="design-text-gradient" x1="${100 - gradientX}%" y1="${100 - gradientY}%" x2="${gradientX}%" y2="${gradientY}%"><stop offset="0%" stop-color="${escapeXml(layout.textGradientStart || '#F59E0B')}"/><stop offset="100%" stop-color="${escapeXml(layout.textGradientEnd || '#EF4444')}"/></linearGradient>`
    : '';
  const textFill = layout.textColorMode === 'gradient' ? 'url(#design-text-gradient)' : escapeXml(layout.textColor || textColor);
  const hoodie = layout.garmentType === 'hoodie'
    ? `<path d="M117 74Q119 30 150 28 181 30 183 74L171 99 150 88 129 99Z" fill="${color}" stroke="#756f66" stroke-width="2"/><path d="M135 52Q150 42 165 52" fill="none" stroke="#a49b8f" stroke-width="2"/>`
    : '';
  const collar = layout.garmentType === 'hoodie'
    ? '<path d="M129 99 150 88 171 99" fill="none" stroke="#756f66" stroke-width="2"/>'
    : '<path d="M125 65Q150 92 175 65" fill="none" stroke="#756f66" stroke-width="3"/>';
  const drawText = showText
    ? `<text x="150" y="${textY}" text-anchor="middle" dominant-baseline="middle" font-family="${escapeXml(layout.textFont || 'Arial')},sans-serif" font-size="${textSize}" font-weight="700" fill="${textFill}">${escapeXml(layout.text)}</text>`
    : '';
  const drawImage = showImage
    ? sharedImage
      ? `<use href="#design-artwork" transform="translate(${imageX} ${imageY}) scale(${imageScale})"/>`
      : `<image href="${layout.imageData}" x="${imageX}" y="${imageY}" width="${imageWidth}" height="${imageHeight}" preserveAspectRatio="xMidYMid meet"/>`
    : '';
  return `<defs>${textGradient}</defs><rect width="300" height="360" rx="24" fill="#f4f0e9"/><ellipse cx="150" cy="330" rx="94" ry="12" fill="#d7d0c6"/><g stroke-linejoin="round"><path d="${shape}" fill="${color}" stroke="#756f66" stroke-width="3"/>${collar}${hoodie}${side === 'back' ? '<path d="M112 110Q150 120 188 110" fill="none" stroke="#ddd6cb" stroke-width="2"/>' : ''}${drawImage}${drawText}</g><text x="150" y="348" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="2" fill="#6b665e">${side.toUpperCase()} VIEW</text>`;
}

export function makeDesignPreview(layout, view = 'front') {
  const side = view === 'back' ? 'back' : 'front';
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="360" viewBox="0 0 300 360">${renderGarment(layout, side)}</svg>`);
}

export function makeDesignBoard(layout) {
  const definitions = layout.imageData
    ? `<defs><image id="design-artwork" href="${layout.imageData}" x="0" y="0" width="52" height="58" preserveAspectRatio="xMidYMid meet"/></defs>`
    : '';
  return dataUri(`<svg xmlns="http://www.w3.org/2000/svg" width="620" height="390" viewBox="0 0 620 390">${definitions}<svg x="5" y="10" width="300" height="360" viewBox="0 0 300 360">${renderGarment(layout, 'front', true)}</svg><svg x="315" y="10" width="300" height="360" viewBox="0 0 300 360">${renderGarment(layout, 'back', true)}</svg></svg>`);
}
