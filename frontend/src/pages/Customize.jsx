import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, getData } from '../lib/api.js';
import { useCart } from '../context/CartContext.jsx';
import { calculateCustomDesignPricePaisa, customColors } from '../lib/customDesign.js';
import { GarmentDesignPreview } from '../components/GarmentDesignPreview.jsx';
import { PageHead } from '../components/PageHead.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { publicFonts } from '../data/publicFonts.js';
import { track } from '../lib/analytics.js';

const teeGarmentTypes = ['tshirt', 'drop-shoulder', 'long-sleeve'];
const sizes = ['XS', 'S', 'M', 'L', 'XL'];
const hoodieSizes = ['S', 'M', 'L', 'XL'];
const availableSizes = (garmentType) => teeGarmentTypes.includes(garmentType) ? sizes : hoodieSizes;
const normalizeFontFamily = (fontFamily) => String(fontFamily || 'Hanken Grotesk').trim();
const popularFonts = [
  'Hanken Grotesk', 'Roboto', 'Open Sans', 'Montserrat', 'Poppins', 'Inter', 'Lato',
  'DM Sans', 'Manrope', 'Oswald', 'Raleway', 'Nunito', 'Ubuntu', 'Fira Sans',
  'Work Sans', 'Source Sans 3', 'Noto Sans', 'Outfit', 'Rubik', 'Space Grotesk',
  'Playfair Display', 'Merriweather', 'Lora', 'Libre Baskerville', 'Cormorant Garamond',
  'DM Serif Display', 'Roboto Serif', 'Roboto Slab', 'Bebas Neue', 'Anton', 'Oswald',
  'Barlow', 'Archivo', 'Josefin Sans', 'Quicksand', 'Pacifico', 'Dancing Script',
  'Great Vibes', 'IBM Plex Sans', 'Roboto Mono', 'Bitter', 'Cabin', 'Karla',
];
const locations = [
  ['front', 'Front'],
  ['back', 'Back'],
  ['both', 'Both sides'],
];

export default function Customize() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addItem, replaceItem } = useCart();
  const showToast = useToast();
  const customizeStarted = useRef(false);
  const [searchParams] = useSearchParams();
  const editKey = searchParams.get('edit');
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [selection, setSelection] = useState({ color: 'White', size: 'M' });
  const [xsMeasurements, setXsMeasurements] = useState({ length: '', chest: '' });
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [design, setDesign] = useState({
    text: '',
    textPlacement: 'front',
    imagePlacement: 'back',
    textSize: 22,
    textFont: 'Hanken Grotesk',
    textColorMode: 'solid',
    textColor: '#202020',
    textGradientStart: '#F59E0B',
    textGradientEnd: '#EF4444',
    textGradientAngle: 90,
    imageScale: 1,
    imageSizeInches: 14,
    textWidthInches: 5,
    textPositions: {
      front: { x: 50, y: 47, width: 46, height: 14 },
      back: { x: 50, y: 47, width: 46, height: 14 },
    },
    imagePositions: {
      front: { x: 50, y: 43, width: 24, height: 24 },
      back: { x: 50, y: 43, width: 24, height: 24 },
    },
    imageData: '',
  });
  const [previewSide, setPreviewSide] = useState('front');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loginRequired, setLoginRequired] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!customizeStarted.current) {
      customizeStarted.current = true;
      track('customize_start');
    }
  }, []);

  useEffect(() => {
    const fontId = 'zavikoo-popular-fonts';
    if (document.getElementById(fontId)) return undefined;
    const families = [...new Set(popularFonts.filter((font) => publicFonts.includes(font)))]
      .map((font) => `family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@400;500;600;700`)
      .join('&');
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
    return undefined;
  }, []);

  useEffect(() => {
    const fontFamily = normalizeFontFamily(design.textFont);
    if (!publicFonts.includes(fontFamily)) return undefined;
    const fontId = `zavikoo-font-${encodeURIComponent(fontFamily)}`;
    if (document.getElementById(fontId)) return undefined;
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, '+')}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
    return undefined;
  }, [design.textFont]);

  useEffect(() => {
    getData('/custom-products')
      .then((items) => {
        setProducts(items);
        const initial = items.find((item) => String(item.id) === productId || item.slug === productId) || items[0] || null;
        setProduct(initial);
      })
      .catch(() => setError('Custom garments could not be loaded. Please try again.'));
  }, [productId]);

  useEffect(() => {
    if (!product || !editKey) return;
    const storageKey = `zavikoo-design-edit:${editKey}`;
    try {
      const savedDesign = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null');
      if (!savedDesign) return;
      setDesign((current) => ({ ...current, ...savedDesign }));
      setSelection((current) => ({
        ...current,
        color: savedDesign.color || current.color,
        size: availableSizes(product.garmentType).includes(savedDesign.size)
          ? savedDesign.size
          : 'M',
      }));
      setXsMeasurements({
        length: savedDesign.xsMeasurements?.length != null ? String(savedDesign.xsMeasurements.length) : '',
        chest: savedDesign.xsMeasurements?.chest != null ? String(savedDesign.xsMeasurements.chest) : '',
      });
      setRightsConfirmed(Boolean(savedDesign.rightsConfirmed));
      setPreviewSide(savedDesign.imagePlacement === 'front' || savedDesign.textPlacement === 'back' ? 'back' : 'front');
    } catch {
      setError('This saved design could not be loaded. Please start a new design.');
    }
  }, [product, editKey]);

  const selectedColor = customColors.find((color) => color.name === selection.color) || customColors[0];
  const currentLayout = useMemo(() => ({
    ...design,
    ...selection,
    garmentName: product?.name,
    garmentType: product?.garmentType,
  }), [design, product, selection]);
  const finalPricePaisa = product
    ? calculateCustomDesignPricePaisa(product.basePricePaisa, currentLayout)
    : 0;
  const designSurchargePaisa = finalPricePaisa - (product?.basePricePaisa || 0);

  const selectProduct = (id) => {
    const selected = products.find((item) => String(item.id) === id);
    setProduct(selected || null);
    setSelection((current) => ({
      ...current,
      size: selected && availableSizes(selected.garmentType).includes(current.size)
        ? current.size
        : 'M',
    }));
    setNotice('');
    setError('');
  };

  const updatePosition = (field, side, position) => {
    setDesign((current) => ({
      ...current,
      [field]: {
        ...current[field],
        [side]: position,
      },
    }));
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extensionAllowed = /\.(jpe?g|png|webp)$/i.test(file.name);
    const typeAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    if (!extensionAllowed || !typeAllowed) {
      setError('Please upload a JPG, PNG or WebP image only.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Your design image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setDesign((current) => ({ ...current, imageData: String(reader.result || ''), imagePlacement: 'back' }));
      setPreviewSide('back');
      setError('');
      setNotice('');
    };
    reader.onerror = () => {
      const message = 'We could not read this image. Please choose another file.';
      setError(message);
      showToast(message, 'error');
    };
    reader.readAsDataURL(file);
  };

  const designPayload = () => ({
    schemaVersion: 1,
    ...design,
    ...selection,
    ...(selection.size === 'XS' && teeGarmentTypes.includes(product.garmentType)
      ? { xsMeasurements: { length: Number(xsMeasurements.length), chest: Number(xsMeasurements.chest) } }
      : {}),
    garmentName: product.name,
    garmentType: product.garmentType,
    rightsConfirmed: true,
  });

  const validateDesign = () => {
    setError('');
    setNotice('');
    setLoginRequired(false);
    if (!design.text.trim() && !design.imageData) {
      const message = 'Add design text or upload an image before continuing.';
      setError(message);
      showToast(message, 'error');
      return false;
    }
    if (!rightsConfirmed) {
      const message = 'Please confirm that you have permission to use this design.';
      setError(message);
      showToast(message, 'error');
      return false;
    }
    if (selection.size === 'XS' && teeGarmentTypes.includes(product?.garmentType)) {
      const length = Number(xsMeasurements.length);
      const chest = Number(xsMeasurements.chest);
      if (!Number.isFinite(length) || length <= 0 || !Number.isFinite(chest) || chest <= 0) {
        const message = 'Enter your length and chest measurements for XS size.';
        setError(message);
        showToast(message, 'error');
        return false;
      }
    }
    return true;
  };

  const saveDesign = async () => {
    if (!validateDesign()) return;
    setBusy(true);
    try {
      await api.post('/account/designs', { customProductId: product.id, design: designPayload() });
      setNotice('Design saved to your account. You can find it under My designs.');
    } catch (requestError) {
      if (requestError.response?.status === 401) {
        setLoginRequired(true);
        const message = 'Sign in to save this design to your account.';
        setError(message);
        showToast(message, 'error');
      } else {
        const message = requestError.response?.data?.error?.message || 'Unable to save this design.';
        setError(message);
        showToast(message, 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  const addDesignToCart = () => {
    if (!validateDesign()) return;
    const cartProduct = {
      ...product,
      isCustomProduct: true,
      colors: [selection.color],
      sizes: [selection.size],
    };
    const variant = { ...selection, unitPricePaisa: calculateCustomDesignPricePaisa(product.basePricePaisa, designPayload()), design: designPayload() };
    track('customize_complete', {
      currency: 'PKR',
      value: variant.unitPricePaisa / 100,
      items: [{ item_id: product.sku || product.slug, item_name: product.name, quantity: 1 }],
    });
    if (editKey) {
      replaceItem(editKey, cartProduct, variant);
      window.sessionStorage.removeItem(`zavikoo-design-edit:${editKey}`);
    } else {
      addItem(cartProduct, variant);
    }
    showToast(editKey ? 'Your custom design was updated in the bag.' : 'Your custom design was added to the bag.', 'success');
    navigate('/cart');
  };

  return (
    <>
      <PageHead
        title="Customize your garment"
        intro="Choose a blank fit, colour and size, then preview your text or artwork on the front and back."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Customize' }]}
      />

      <section className="page pb-24 md:pb-32">
        {loginRequired && (
          <div className="mb-6 flex flex-wrap items-center gap-3 text-[0.9375rem]">
            <Link to="/login?returnTo=%2Fcustomize" className="font-semibold underline underline-offset-4">Sign in</Link>
            <span className="text-stone">or</span>
            <Link to="/register?returnTo=%2Fcustomize" className="font-semibold underline underline-offset-4">Create an account</Link>
          </div>
        )}

        {!product ? (
          <div className="border border-dashed border-ink/25 bg-chalk p-10 text-stone">
            {products.length ? 'Choose a garment to begin.' : 'Custom garments are not available yet.'}
            <Link to="/shop" className="ml-2 font-semibold text-cargo underline underline-offset-4">Browse the shop</Link>
          </div>
        ) : (
          <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <section className="border border-ink/15 bg-chalk p-4 md:p-7 lg:sticky lg:top-28" aria-label="Garment design preview">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-[1.6rem]">{product.name}</h2>
                <div className="inline-flex border border-ink/25" role="group" aria-label="Preview side">
                  {['front', 'back'].map((side) => (
                    <button key={side} type="button" aria-pressed={previewSide === side} onClick={() => setPreviewSide(side)} className={`min-h-10 px-5 text-[0.9375rem] font-medium capitalize transition ${previewSide === side ? 'bg-cargo text-chalk' : 'text-stone hover:text-cargo'}`}>{side}</button>
                  ))}
                </div>
              </div>
              <div className="flex min-h-[380px] items-center justify-center bg-[#e4e1d6] p-4">
                <GarmentDesignPreview layout={currentLayout} side={previewSide} onPositionChange={updatePosition} className="flex min-h-[380px] items-center justify-center" />
              </div>
              <p className="mt-4 text-[0.875rem] leading-6 text-stone">Drag text or artwork to position it, then drag its brass corner handle to resize. Use arrow keys to move or resize the selected item.</p>
            </section>

            <div className="space-y-9 border border-ink/15 bg-chalk p-6 md:p-9">
              <div>
                <label htmlFor="custom-product" className="field-label">Blank garment</label>
                <select id="custom-product" value={product.id} onChange={(event) => selectProduct(event.target.value)} className="field">
                  {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <p className="price-text mt-2 text-[1.0625rem] tabular-nums">PKR {(finalPricePaisa / 100).toLocaleString('en-PK')}</p>
                {designSurchargePaisa > 0 && <p className="price-text-secondary mt-1 text-xs text-orange">Includes PKR {(designSurchargePaisa / 100).toLocaleString('en-PK')} design size charge</p>}
              </div>

              <fieldset>
                <legend className="mb-3 text-[0.9375rem] font-semibold">Colour <span className="ml-1 font-normal text-stone">{selectedColor.name}</span></legend>
                <div className="flex flex-wrap gap-3">
                  {customColors.map((color) => (
                    <button key={color.name} type="button" title={color.name} aria-label={`${color.name} colour`} aria-pressed={selection.color === color.name} onClick={() => setSelection((current) => ({ ...current, color: color.name }))} className={`h-10 w-10 border border-ink/25 transition ${selection.color === color.name ? 'ring-2 ring-cargo ring-offset-2 ring-offset-chalk' : 'hover:border-cargo'}`} style={{ backgroundColor: color.hex }} />
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="mb-3 text-[0.9375rem] font-semibold">Size</legend>
                <div className="flex flex-wrap gap-2">
                  {availableSizes(product?.garmentType).map((size) => <button key={size} type="button" aria-pressed={selection.size === size} onClick={() => setSelection((current) => ({ ...current, size }))} className="chip min-w-[3.25rem]">{size}</button>)}
                </div>
              </fieldset>

              {selection.size === 'XS' && teeGarmentTypes.includes(product?.garmentType) && (
                <fieldset className="grid gap-4 sm:grid-cols-2">
                  <legend className="mb-3 text-[0.9375rem] font-semibold">XS measurements</legend>
                  <div>
                    <label htmlFor="xs-length" className="field-label">Length <span className="text-stone">(inches)</span></label>
                    <input id="xs-length" type="number" min="1" step="0.1" required value={xsMeasurements.length} onChange={(event) => setXsMeasurements((current) => ({ ...current, length: event.target.value }))} className="field" placeholder="e.g. 24" />
                  </div>
                  <div>
                    <label htmlFor="xs-chest" className="field-label">Chest <span className="text-stone">(inches)</span></label>
                    <input id="xs-chest" type="number" min="1" step="0.1" required value={xsMeasurements.chest} onChange={(event) => setXsMeasurements((current) => ({ ...current, chest: event.target.value }))} className="field" placeholder="e.g. 34" />
                  </div>
                </fieldset>
              )}

              <div>
                <label htmlFor="custom-text" className="field-label">Design text</label>
                <input id="custom-text" maxLength="80" value={design.text} onChange={(event) => setDesign((current) => ({ ...current, text: event.target.value }))} placeholder="Add a name, phrase or message" className="field" />
              </div>

              <fieldset>
                <legend className="mb-3 text-[0.9375rem] font-semibold">Text placement</legend>
                <div className="flex flex-wrap gap-2">
                  {locations.map(([value, label]) => <button key={value} type="button" aria-pressed={design.textPlacement === value} onClick={() => { setDesign((current) => ({ ...current, textPlacement: value })); setPreviewSide(value === 'back' ? 'back' : 'front'); }} className="chip">{label}</button>)}
                </div>
              </fieldset>

              <div className="relative">
                <span id="text-font-label" className="field-label">Font family</span>
                <button
                  id="text-font"
                  type="button"
                  onClick={() => setFontMenuOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') setFontMenuOpen(false);
                  }}
                  className="field flex w-full items-center justify-between pr-10 text-left"
                  style={{ fontFamily: `'${design.textFont}', sans-serif` }}
                  aria-labelledby="text-font-label text-font"
                  aria-haspopup="listbox"
                  aria-expanded={fontMenuOpen}
                  aria-controls="public-font-list"
                >
                  <span>{design.textFont}</span>
                  <span className={`absolute right-4 transition-transform ${fontMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true">⌄</span>
                </button>
                {fontMenuOpen && (
                  <div id="public-font-list" role="listbox" aria-label="Popular font families" className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto border border-ink/20 bg-chalk shadow-soft">
                    {[...new Set(popularFonts.filter((font) => publicFonts.includes(font)))].map((font) => (
                      <button
                        key={font}
                        type="button"
                        role="option"
                        aria-selected={design.textFont === font}
                        onClick={() => {
                          setDesign((current) => ({ ...current, textFont: font }));
                          setFontMenuOpen(false);
                        }}
                        className={`block w-full border-b border-ink/10 px-4 py-3 text-left text-[0.9375rem] transition hover:bg-cargo hover:text-chalk ${design.textFont === font ? 'bg-paper font-semibold' : ''}`}
                        style={{ fontFamily: `'${font}', sans-serif` }}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <fieldset>
                <legend className="mb-3 text-[0.9375rem] font-semibold">Text color</legend>
                <div className="flex gap-2">
                  {[
                    ['solid', 'Solid color'],
                    ['gradient', 'Gradient'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={design.textColorMode === value}
                      onClick={() => setDesign((current) => ({ ...current, textColorMode: value }))}
                      className="chip"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {design.textColorMode === 'gradient' ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="field-label">
                      Start color
                      <input type="color" value={design.textGradientStart} onChange={(event) => setDesign((current) => ({ ...current, textGradientStart: event.target.value }))} className="mt-2 block h-12 w-full cursor-pointer rounded-none border border-ink/20 bg-white p-1" />
                    </label>
                    <label className="field-label">
                      End color
                      <input type="color" value={design.textGradientEnd} onChange={(event) => setDesign((current) => ({ ...current, textGradientEnd: event.target.value }))} className="mt-2 block h-12 w-full cursor-pointer rounded-none border border-ink/20 bg-white p-1" />
                    </label>
                    <label htmlFor="text-gradient-angle" className="col-span-2 text-[0.9375rem] font-semibold">
                      Direction <span className="ml-2 font-normal text-stone">{design.textGradientAngle}°</span>
                      <input id="text-gradient-angle" type="range" min="0" max="360" value={design.textGradientAngle} onChange={(event) => setDesign((current) => ({ ...current, textGradientAngle: Number(event.target.value) }))} className="mt-3 block w-full accent-[#14160F]" />
                    </label>
                  </div>
                ) : (
                  <label className="field-label mt-3 block">
                    Choose color
                    <input type="color" value={design.textColor} onChange={(event) => setDesign((current) => ({ ...current, textColor: event.target.value }))} className="mt-2 block h-12 w-full cursor-pointer rounded-none border border-ink/20 bg-white p-1" />
                  </label>
                )}
              </fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label htmlFor="text-width" className="block text-[0.9375rem] font-semibold">
                  Text width
                  <select id="text-width" value={design.textWidthInches} onChange={(event) => setDesign((current) => ({ ...current, textWidthInches: Number(event.target.value) }))} className="field mt-2">
                    {[3, 4, 5, 6, 7].map((width) => <option key={width} value={width}>{width} inches</option>)}
                  </select>
                </label>
                <label htmlFor="text-size" className="block text-[0.9375rem] font-semibold">
                  Font size <span className="ml-2 font-normal text-stone">{design.textSize}px</span>
                  <input id="text-size" type="range" min="12" max="32" value={design.textSize} onChange={(event) => setDesign((current) => ({ ...current, textSize: Number(event.target.value) }))} className="mt-3 block w-full accent-[#14160F]" />
                </label>
              </div>

              <div>
                <label htmlFor="design-image" className="field-label">Or upload your design</label>
                <input id="design-image" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handleImage} className="block w-full text-[0.9375rem] file:mr-4 file:cursor-pointer file:border-0 file:bg-cargo file:px-5 file:py-3 file:text-[0.9375rem] file:font-medium file:text-chalk hover:file:bg-olive" />
                <p className="field-hint">Allowed formats: JPG, JPEG, PNG, WebP. Maximum file size: 5 MB.</p>
                {design.imageData && <button type="button" onClick={() => setDesign((current) => ({ ...current, imageData: '' }))} className="mt-2 text-[0.875rem] font-semibold text-[#8a2a1f] underline underline-offset-4">Remove uploaded image</button>}
              </div>

              {design.imageData && (
                <fieldset>
                  <legend className="mb-3 text-[0.9375rem] font-semibold">Image placement</legend>
                  <div className="flex flex-wrap gap-2">
                    {locations.map(([value, label]) => <button key={value} type="button" aria-pressed={design.imagePlacement === value} onClick={() => { setDesign((current) => ({ ...current, imagePlacement: value })); setPreviewSide(value === 'front' ? 'front' : 'back'); }} className="chip">{label}</button>)}
                  </div>
                  <label htmlFor="image-size" className="field-label mt-4 block">
                    Image length
                    <select id="image-size" value={design.imageSizeInches} onChange={(event) => setDesign((current) => ({ ...current, imageSizeInches: Number(event.target.value) }))} className="field mt-2">
                      {[10, 12, 14, 16, 18].map((size) => <option key={size} value={size}>{size} inches</option>)}
                    </select>
                  </label>
                </fieldset>
              )}

              <label className="flex cursor-pointer items-start gap-3 border-t border-ink/15 pt-6 text-[0.9375rem] leading-6 text-stone">
                <input type="checkbox" checked={rightsConfirmed} onChange={(event) => setRightsConfirmed(event.target.checked)} className="check mt-1" />
                <span>I confirm that I have permission to use this text and artwork. Submitted designs may be reviewed before production.</span>
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" disabled={busy} onClick={saveDesign} className="btn btn-secondary flex-1">{busy ? 'Saving…' : 'Save this design'}</button>
                <button type="button" onClick={addDesignToCart} className="btn btn-primary flex-1">Add to bag</button>
              </div>
            </div>
          </div>
        )}
        <section className="mt-16 border-t border-ink/15 pt-10" aria-labelledby="custom-design-information">
          <h2 id="custom-design-information" className="display-m">Custom design details</h2>
          <p className="mt-4 max-w-3xl leading-7 text-stone">
            The collection features oversized drop-shoulder graphic T-shirts and winter pullover hoodies. Use the design editor with a product marked as customizable; listed colours and sizes depend on that product.
          </p>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">Garment options</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-stone">
                <li>Ready-made sizes are S, M, L, and XL. Custom T-shirt designs also allow XS when you provide chest and length measurements.</li>
                <li>Editor colours: {customColors.map((color) => color.name).join(', ')}. Product availability may differ.</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Artwork and placement</h3>
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-7 text-stone">
                <li>Upload JPG, JPEG, PNG, or WebP artwork up to 5 MB.</li>
                <li>Place text or artwork on the front, back, or both sides. Text width options range from 3 to 7 inches; image length options range from 10 to 18 inches.</li>
                <li>The editor displays the current design charge with the garment price before you add a design to your bag.</li>
              </ul>
            </div>
            <div className="md:col-span-2">
              <h3 className="font-semibold">Design size charges</h3>
              <p className="mt-3 max-w-4xl leading-7 text-stone">
                Any additional custom-design charges are shown in the editor with the garment price before you add the design to your bag.
              </p>
            </div>
            <div className="md:col-span-2">
              <h3 className="font-semibold">Artwork rights</h3>
              <p className="mt-3 max-w-4xl leading-7 text-stone">
                Before adding a design to your bag, confirm that you have permission to use its text and artwork. Submitted designs may be reviewed before production.
              </p>
            </div>
          </div>
        </section>
      </section>
    </>
  );
}
