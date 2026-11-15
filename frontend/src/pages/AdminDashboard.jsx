import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, getData } from '../lib/api.js';
import { Wordmark } from '../components/Wordmark.jsx';
import { GarmentDesignBoard } from '../components/GarmentDesignPreview.jsx';
import { garmentTypes } from '../lib/customDesign.js';
import { useToast } from '../context/ToastContext.jsx';

const navItems = [
  ['Overview', '/admin'],
  ['Hero', '/admin/hero'],
  ['Products', '/admin/products'],
  ['Collections', '/admin/collections'],
  ['Product reviews', '/admin/reviews'],
  ['Categories', '/admin/categories'],
  ['Orders', '/admin/orders'],
  ['Custom products', '/admin/custom-products'],
  ['Customers', '/admin/customers'],
  ['Quotes', '/admin/quotes'],
  ['Contact inbox', '/admin/contact-messages'],
  ['Newsletter subscribers', '/admin/newsletter-subscribers'],
  ['Security', '/admin/security'],
  ['Audit log', '/admin/audit-logs'],
];

const orderStatuses = ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

function Panel({ title, children, actions }) {
  return (
    <section className="rounded-card border-2 border-ink bg-cream p-5 shadow-soft md:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}

function DataTable({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead><tr className="border-b-2 border-ink/20 text-xs uppercase tracking-wider text-charcoal">{headers.map((header) => <th key={header} className="px-3 py-3">{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function money(paisa) {
  return `PKR ${(Number(paisa || 0) / 100).toLocaleString('en-PK', { maximumFractionDigits: 2 })}`;
}

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function Pagination({ data, page, onChange }) {
  const totalPages = Math.ceil((data?.total || 0) / (data?.pageSize || 1));
  if (totalPages <= 1) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      <button type="button" disabled={page <= 1} onClick={() => onChange(page - 1)} className="rounded-full border-2 border-ink/20 px-3 py-1 text-sm font-bold disabled:opacity-40">←</button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
        <button key={value} type="button" onClick={() => onChange(value)} className={`h-8 min-w-8 rounded-full border-2 px-2 text-sm font-bold ${page === value ? 'border-cargo bg-cargo text-chalk' : 'border-ink/20 bg-chalk hover:border-cargo'}`}>{value}</button>
      ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onChange(page + 1)} className="rounded-full border-2 border-ink/20 px-3 py-1 text-sm font-bold disabled:opacity-40">→</button>
    </div>
  );
}

function AnimatedMetric({ label, value, format = (amount) => amount.toLocaleString() }) {
  const target = Number(value || 0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame;
    const startedAt = performance.now();
    const duration = 850;
    const animate = (now) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target]);

  return (
    <div className="rounded-card border-2 border-ink bg-lime p-5 shadow-soft">
      <p className="text-xs font-black uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-3 text-3xl font-display">{format(displayValue)}</p>
    </div>
  );
}

function AnimatedLineChart({ items }) {
  const width = 900;
  const height = 300;
  const padding = { top: 28, right: 28, bottom: 52, left: 28 };
  const maximum = Math.max(...items.map(([, value]) => value), 1);
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const points = items.map(([label, value], index) => ({
    label,
    value,
    x: padding.left + (chartWidth * index) / Math.max(items.length - 1, 1),
    y: padding.top + chartHeight - (value / maximum) * chartHeight,
  }));
  const pointString = points.map(({ x, y }) => `${x},${y}`).join(' ');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, [items]);

  return (
    <div className="overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Overview entity trend chart">
        <g className="stroke-ink/15" strokeWidth="1">
          {Array.from({ length: 6 }, (_, index) => {
            const y = padding.top + (chartHeight * index) / 5;
            return <line key={`horizontal-${y}`} x1={padding.left} y1={y} x2={width - padding.right} y2={y} />;
          })}
          {points.map(({ x }) => <line key={`vertical-${x}`} x1={x} y1={padding.top} x2={x} y2={height - padding.bottom} />)}
        </g>
        <line x1={padding.left} y1={height - padding.bottom} x2={width - padding.right} y2={height - padding.bottom} className="stroke-ink/35" strokeWidth="1.5" />
        <polyline
          points={pointString}
          fill="none"
          className="stroke-brass-deep transition-[stroke-dashoffset] duration-1000 ease-out"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength="1"
          strokeDasharray="1"
          strokeDashoffset={visible ? 0 : 1}
        />
        {points.map(({ label, value, x, y }) => (
          <g key={label}>
            <circle cx={x} cy={y} r="4" className="fill-cargo stroke-chalk" strokeWidth="2" />
            <text x={x} y={Math.max(y - 12, 14)} textAnchor="middle" className="fill-cargo text-[12px] font-bold">{value.toLocaleString()}</text>
            <text x={x} y={height - 20} textAnchor="middle" className="fill-stone text-[11px] font-bold uppercase tracking-[0.08em]">{label}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

function slugFromName(value) {
  const slug = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180)
    .replace(/-+$/g, '');
  return slug || 'custom-garment';
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.size) return resolve('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      reject(new Error('Choose a JPG, PNG, or WebP image up to 5 MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('The selected image could not be read.'));
    reader.readAsDataURL(file);
  });
}

async function postCarouselImageWithRetry(payload, attempts = 2) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await api.post('/admin/carousel-images', payload);
    } catch (requestError) {
      if (requestError.response?.status !== 503 || attempt === attempts) throw requestError;
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
}

export default function AdminDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const showToast = useToast();
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [subscriberPage, setSubscriberPage] = useState(1);
  const [listPages, setListPages] = useState({});
  const [reviewStatusFilter, setReviewStatusFilter] = useState('');
  const [productTab, setProductTab] = useState('add');
  const [collectionTab, setCollectionTab] = useState('add');
  const [editingCarousel, setEditingCarousel] = useState(null);
  const [carouselDraftCategory, setCarouselDraftCategory] = useState('');
  const [carouselDraftProduct, setCarouselDraftProduct] = useState('');
  const [carouselDraftDescription, setCarouselDraftDescription] = useState('');
  const [selectedCarouselCollectionId, setSelectedCarouselCollectionId] = useState(null);
  const [collectionProductPage, setCollectionProductPage] = useState(1);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [customProductTab, setCustomProductTab] = useState('add');
  const [heroFilePreview, setHeroFilePreview] = useState('');
  const [collectionBannerPreview, setCollectionBannerPreview] = useState('');
  const [headerAnnouncementText, setHeaderAnnouncementText] = useState('');
  const [heroTab, setHeroTab] = useState('images');
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [selectedContactMessage, setSelectedContactMessage] = useState(null);
  const [replyQuote, setReplyQuote] = useState(null);
  const requestSequence = useRef(0);

  const section = location.pathname.replace(/\/+$/, '').split('/')[2] || 'overview';
  const collections = section === 'collections'
    ? [...(data?.items || [])].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    : [];
  const collectionProducts = section === 'collections' ? (data?.products || []) : [];
  const pageSizes = { products: 12, reviews: 10, categories: 10, orders: 10, 'custom-products': 7, customers: 10, 'contact-messages': 10, 'newsletter-subscribers': 10, quotes: 2, 'audit-logs': 15 };
  const currentPage = section === 'newsletter-subscribers' ? subscriberPage : (listPages[section] || 1);
  const setCurrentPage = (page) => section === 'newsletter-subscribers'
    ? setSubscriberPage(page)
    : setListPages((pages) => ({ ...pages, [section]: page }));
  const collectionProductPageCount = Math.max(1, Math.ceil(collectionProducts.length / 8));
  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    setError('');
    try {
      const current = await getData('/auth/me');
      if (sequence !== requestSequence.current) return;
      setUser(current.user);
      const supportedSections = ['products', 'collections', 'reviews', 'categories', 'orders', 'custom-products', 'customers', 'custom-designs', 'quotes', 'contact-messages', 'newsletter-subscribers', 'audit-logs'];
      if (section === 'inventory') {
        navigate('/admin', { replace: true });
        return;
      }
      const payload = section === 'overview'
        ? await getData('/admin/dashboard')
        : section === 'hero'
          ? await Promise.all([
            getData('/admin/hero-images'),
            getData('/admin/header-announcements'),
          ]).then(([images, announcements]) => ({ images, announcements }))
        : supportedSections.includes(section)
          ? await getData(`/admin/${section}`, {
            search: search || undefined,
            page: currentPage,
            pageSize: pageSizes[section] || 50,
            ...(section === 'reviews' && reviewStatusFilter ? { status: reviewStatusFilter } : {}),
          })
          : [];
      if (sequence !== requestSequence.current) return;
      setData(payload);
      if (section === 'hero') {
        setHeaderAnnouncementText(payload.announcements?.[0]?.text || '');
      }
    } catch (requestError) {
      if (sequence !== requestSequence.current) return;
      if (requestError.response?.status === 401) {
        navigate('/admin/login', { replace: true });
        return;
      }
      setError(requestError.response?.data?.error?.message || 'Could not load admin data.');
    }
  }, [currentPage, navigate, reviewStatusFilter, search, section]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => {
    if (heroFilePreview) URL.revokeObjectURL(heroFilePreview);
  }, [heroFilePreview]);

  useEffect(() => () => {
    if (collectionBannerPreview) URL.revokeObjectURL(collectionBannerPreview);
  }, [collectionBannerPreview]);

  useEffect(() => {
    if (notice) showToast(notice, 'success');
  }, [notice, showToast]);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error, showToast]);

  useEffect(() => {
    if (section !== 'collections' || !collections.length) {
      setSelectedCollectionId(null);
      setSelectedCarouselCollectionId(null);
      return;
    }
    if (!collections.some((collection) => collection.id === selectedCollectionId)) {
      setSelectedCollectionId(collections[0].id);
    }
    if (!collections.some((collection) => collection.id === selectedCarouselCollectionId)) {
      setSelectedCarouselCollectionId(collections[0].id);
    }
  }, [section, collections, selectedCollectionId, selectedCarouselCollectionId]);

  useEffect(() => {
    setCollectionProductPage((page) => Math.min(page, collectionProductPageCount));
  }, [collectionProductPageCount]);

  const act = async (operation, successMessage) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await operation();
      setNotice(successMessage);
      await load();
      return true;
    } catch (requestError) {
      const status = requestError.response?.status;
      setError(status === 503
        ? 'The database is temporarily unavailable. Please try again in a moment.'
        : requestError.response?.data?.error?.message || 'The operation failed. Please try again.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      navigate('/admin/login', { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Could not sign out.');
    }
  };

  const addProduct = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const sizes = String(form.get('sizes')).split(',').map((value) => value.trim()).filter(Boolean);
    const colors = String(form.get('colors')).split(',').map((value) => value.trim()).filter(Boolean);
    const variants = colors.flatMap((color) => sizes.map((size) => ({
      sku: `variant-${color.replace(/[^a-z0-9]/gi, '').toUpperCase()}-${size}`,
      color,
      size,
      stockQty: editingProduct?.variants?.find((variant) => variant.color === color && variant.size === size)?.stockQty ?? 999999,
      lowStockAt: 5,
      priceDeltaPaisa: 0,
    })));
    let imageBack = '';
    let imageFront = '';
    try {
      imageBack = await readImageFile(form.get('imageBackFile'));
      imageFront = await readImageFile(form.get('imageFrontFile'));
    } catch (imageError) {
      setError(imageError.message);
      return;
    }
    const payload = {
      name: form.get('name'),
      slug: form.get('slug'),
      description: form.get('description'),
      material: form.get('material'),
      basePricePaisa: Math.round(Number(form.get('basePrice')) * 100),
      salePricePaisa: form.get('salePrice') ? Math.round(Number(form.get('salePrice')) * 100) : null,
      categoryId: Number(form.get('categoryId')),
      status: form.get('status'),
      isFeatured: form.get('isFeatured') === 'on',
      isCustomizable: form.get('isCustomizable') === 'on',
      isMadeToOrder: form.get('isMadeToOrder') === 'on',
      ...(imageBack ? { imageBack } : {}),
      ...(imageFront ? { imageFront } : {}),
      variants,
      collectionIds: form.getAll('collectionIds').map(Number),
    };
    const success = await act(
      () => editingProduct
        ? api.patch(`/admin/products/${editingProduct.id}`, payload)
        : api.post('/admin/products', payload),
      editingProduct ? 'Product updated.' : 'Product added.',
    );
    if (success) {
      formElement.reset();
      setEditingProduct(null);
      setProductTab('manage');
    }
  };

  const startEditingProduct = (product) => {
    setEditingProduct(product);
    setProductTab('add');
    setError('');
    setNotice('');
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProduct) return;
    const success = await act(() => api.delete(`/admin/products/${deleteProduct.id}`), 'Product deleted.');
    if (success) setDeleteProduct(null);
  };

  const addCategory = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    await act(() => api.post('/admin/categories', { name: form.get('name'), slug: form.get('slug') }), 'Category added.');
    formElement.reset();
  };

  const addCollection = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    let bannerImageData = '';
    try {
      bannerImageData = await readImageFile(form.get('bannerImageFile'));
    } catch (imageError) {
      setError(imageError.message);
      return;
    }
    const success = await act(() => api.post('/admin/collections', {
      name: form.get('name'),
      slug: form.get('slug'),
      description: form.get('description'),
      isActive: true,
      productIds: form.getAll('productIds').map(Number),
      ...(bannerImageData ? { bannerImageData } : {}),
    }), 'Collection created.');
    if (success) {
      formElement.reset();
      setCollectionBannerPreview('');
      setCollectionTab('manage');
    }
  };

  const saveCarouselImage = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    let modelImage = '';
    let productImage = '';
    try {
      modelImage = await readImageFile(form.get('modelImageFile'));
      productImage = await readImageFile(form.get('productImageFile'));
    } catch (imageError) {
      setError(imageError.message);
      return;
    }
    if (!editingCarousel && (!modelImage || !productImage)) {
      setError('Choose both a model image and a product image.');
      return;
    }
    const payload = {
      collectionId: Number(form.get('collectionId')),
      categoryId: Number(form.get('categoryId')),
      productId: Number(form.get('productId')),
      description: String(form.get('description') || '').trim(),
      ...(modelImage ? { modelImage } : {}),
      ...(productImage ? { productImage } : {}),
    };
    const success = await act(
      () => editingCarousel
        ? api.patch(`/admin/carousel-images/${editingCarousel.id}`, payload)
        : postCarouselImageWithRetry(payload),
      editingCarousel ? 'Carousel image updated.' : 'Carousel image created.',
    );
    if (success) {
      formElement.reset();
      setEditingCarousel(null);
      setCarouselDraftCategory('');
      setCarouselDraftProduct('');
      setCarouselDraftDescription('');
      setCollectionTab('carousel-manage');
    }
  };

  const startEditingCarousel = (item) => {
    setEditingCarousel(item);
    setCarouselDraftCategory(String(item.categoryId));
    setCarouselDraftProduct(String(item.productId || ''));
    setCarouselDraftDescription(item.description);
    setCollectionTab('carousel-add');
  };

  const deleteCarouselImage = async (item) => {
    const success = await act(() => api.delete(`/admin/carousel-images/${item.id}`), 'Carousel image deleted.');
    if (success && editingCarousel?.id === item.id) {
      setEditingCarousel(null);
      setCarouselDraftProduct('');
      setCollectionTab('carousel-manage');
    }
  };

  const addCustomProduct = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const saved = await act(() => api.post('/admin/custom-products', {
      name: form.get('name'),
      slug: slugFromName(form.get('name')),
      garmentType: form.get('garmentType'),
      description: form.get('description'),
      basePricePaisa: Math.round(Number(form.get('basePrice')) * 100),
      isActive: form.get('isActive') === 'on',
    }), 'Custom garment added.');
    if (saved) {
      formElement.reset();
      setCustomProductTab('manage');
    }
  };

  const uploadHeroImage = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const file = new FormData(formElement).get('imageFile');
    let imageData;
    try {
      imageData = await readImageFile(file);
    } catch (imageError) {
      setError(imageError.message);
      return;
    }
    if (!imageData) {
      setError('Choose a hero image to upload.');
      return;
    }
    const saved = await act(() => api.post('/admin/hero-images', { imageData }), 'Hero image uploaded.');
    if (saved) {
      formElement.reset();
      setHeroFilePreview('');
    }
  };

  const deleteHeroImage = async (image) => {
    const removed = await act(() => api.delete(`/admin/hero-images/${image.id}`), 'Hero image removed.');
    if (removed) setHeroFilePreview('');
  };

  const saveHeaderAnnouncement = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const text = String(form.get('text') || '').trim();
    if (!text) {
      setError('Enter header announcement text.');
      return;
    }
    const saved = await act(
      () => api.put('/admin/header-announcements', { text }),
      'Header announcement saved.',
    );
    if (saved) setHeaderAnnouncementText(text);
  };

  const changePassword = async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    if (form.get('newPassword') !== form.get('confirmPassword')) {
      setError('New passwords do not match.');
      return;
    }
    await act(() => api.post('/auth/change-password', {
      currentPassword: form.get('currentPassword'),
      newPassword: form.get('newPassword'),
    }), 'Password changed. Other active sessions were signed out.');
    formElement.reset();
  };

  const content = () => {
    if (section === 'hero') {
      const items = data?.images || [];
      const announcements = data?.announcements || [];
      return (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b-2 border-ink/15 pb-3">
            {[
              ['images', 'Images'],
              ['header', 'Header'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setHeroTab(value)}
                className={`rounded-full border-2 px-5 py-2 text-sm font-bold transition ${heroTab === value ? 'border-cargo bg-cargo text-chalk' : 'border-ink/20 bg-chalk hover:border-cargo'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {heroTab === 'images' ? <>
          <Panel title="Homepage hero images">
            <p className="mb-5 max-w-3xl text-sm leading-6 text-charcoal">
              Upload up to 5 images. They appear in order in the homepage hero’s rotating grid transition. JPG, PNG, and WebP files up to 5 MB are supported.
            </p>
            <form onSubmit={uploadHeroImage} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="grid gap-2 text-sm font-bold">
                <span className="text-sm font-semibold">Recommended image size: 1400 × 2000 px</span>
                Add an image ({items.length} / 5)
                <input
                  name="imageFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  required
                  disabled={busy || items.length >= 5}
                  onChange={(event) => {
                    if (heroFilePreview) URL.revokeObjectURL(heroFilePreview);
                    const file = event.target.files?.[0];
                    setHeroFilePreview(file ? URL.createObjectURL(file) : '');
                  }}
                  className="admin-input"
                />
              </label>
              <button type="submit" disabled={busy || items.length >= 5} className="btn btn-primary w-fit">
                {busy ? 'Uploading…' : 'Upload image'}
              </button>
            </form>
            {heroFilePreview && (
              <div className="mt-5 max-w-xs">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-charcoal">Selected preview</p>
                <img src={heroFilePreview} alt="Selected homepage hero preview" className="aspect-[4/5] w-full border border-ink/15 object-cover" />
              </div>
            )}
          </Panel>
          <Panel title={`Uploaded images (${items.length} / 5)`}>
            {items.length ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((image, index) => (
                  <article key={image.id} className="overflow-hidden border border-ink/15 bg-chalk">
                    <img
                      src={`${api.defaults.baseURL.replace(/\/$/, '')}/hero-images/${image.id}/image`}
                      alt={`Homepage hero image ${index + 1}`}
                      className="aspect-[4/5] w-full object-cover"
                    />
                    <div className="flex items-center justify-between gap-3 p-3">
                      <p className="text-sm font-bold">Image {index + 1}</p>
                      <button type="button" disabled={busy} onClick={() => deleteHeroImage(image)} className="text-sm font-bold text-red-700 underline underline-offset-2">
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="py-5 text-sm text-charcoal">No custom hero images yet. The homepage will use its default images until you upload one.</p>
            )}
          </Panel>
          </> : (
            <div className="space-y-6">
              <Panel title="Announcement bar">
                <p className="mb-5 max-w-3xl text-sm leading-6 text-charcoal">
                  Set the single message shown in the centered, glowing black bar above the main navigation.
                </p>
                <form onSubmit={saveHeaderAnnouncement} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="grid gap-2 text-sm font-bold">
                    Header text ({headerAnnouncementText.length} / 250)
                    <input
                      name="text"
                      type="text"
                      maxLength={250}
                      required
                      disabled={busy}
                      value={headerAnnouncementText}
                      onChange={(event) => setHeaderAnnouncementText(event.target.value)}
                      placeholder="Enter the message shown on the website"
                      className="admin-input"
                    />
                  </label>
                  <button type="submit" disabled={busy || !headerAnnouncementText.trim()} className="btn btn-primary w-fit">
                    {busy ? 'Saving…' : 'Save message'}
                  </button>
                </form>
              </Panel>
              <Panel title="Website preview">
                <div className="flex min-h-10 items-center justify-center bg-black px-4 py-2.5 text-center text-sand">
                  <p className="announcement-glow text-[0.8125rem] font-bold uppercase leading-5 tracking-[0.08em] text-sand">
                    {headerAnnouncementText || announcements[0]?.text || 'Your announcement will appear here'}
                  </p>
                </div>
              </Panel>
            </div>
          )}
        </div>
      );
    }

    if (section === 'overview') {
      const stats = data?.stats || {};
      return (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <AnimatedMetric label="Products" value={stats.products} />
            <AnimatedMetric label="Orders" value={stats.orders} />
            <AnimatedMetric label="Customers" value={stats.customers} />
            <AnimatedMetric label="Open quotes" value={stats.openQuotes} />
            <AnimatedMetric label="Active order value" value={stats.revenuePaisa} format={(value) => money(value)} />
          </div>
          <Panel title="Store snapshot">
            <AnimatedLineChart items={[
              ['Products', Number(stats.products || 0)],
              ['Orders', Number(stats.orders || 0)],
              ['Customers', Number(stats.customers || 0)],
              ['Quotes', Number(stats.openQuotes || 0)],
            ]} />
          </Panel>
          <Panel title="Recent orders" actions={<Link to="/admin/orders" className="text-sm font-bold text-orange underline underline-offset-4">View all orders</Link>}>
            <DataTable headers={['Order', 'Customer', 'Status', 'Total', 'Created']}>
              {(data?.recentOrders || []).map((order) => <tr key={order.id} className="border-b border-ink/10"><td className="px-3 py-3 font-bold">{order.orderNumber}</td><td className="px-3 py-3">{order.email}</td><td className="px-3 py-3">{order.status}</td><td className="price-text px-3 py-3">{money(order.totalPaisa)}</td><td className="px-3 py-3">{new Date(order.createdAt).toLocaleDateString()}</td></tr>)}
            </DataTable>
            {!data?.recentOrders?.length && <p className="py-8 text-center text-sm text-charcoal">No orders yet.</p>}
          </Panel>
        </div>
      );
    }

    if (section === 'products') {
      const items = data?.items || [];
      return (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b-2 border-ink/15 pb-3">
            {[['add', editingProduct ? 'Edit product' : 'Add product'], ['manage', 'Manage products']].map(([value, label]) => (
              <button key={value} type="button" onClick={() => { setProductTab(value); if (value === 'manage') setEditingProduct(null); }} className={`rounded-full border-2 px-5 py-2 text-sm font-bold transition ${productTab === value ? 'border-cargo bg-cargo text-chalk' : 'border-ink/20 bg-chalk hover:border-cargo'}`}>{label}</button>
            ))}
          </div>
          {productTab === 'add' ? (
          <Panel title={editingProduct ? 'Edit product' : 'Add product'}>
            <form key={editingProduct?.id || 'new-product'} onSubmit={addProduct} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <input name="name" required defaultValue={editingProduct?.name || ''} placeholder="Product name" className="admin-input" />
              <input name="slug" required defaultValue={editingProduct?.slug || ''} placeholder="product-slug" className="admin-input" />
              <select name="categoryId" required defaultValue={editingProduct?.categoryId || ''} className="admin-input"><option value="">Choose category</option>{(data?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <input name="basePrice" type="number" min="0.01" step="0.01" required defaultValue={editingProduct ? editingProduct.basePricePaisa / 100 : ''} placeholder="Price (PKR)" className="admin-input" />
              <input name="salePrice" type="number" min="0.01" step="0.01" defaultValue={editingProduct?.salePricePaisa ? editingProduct.salePricePaisa / 100 : ''} placeholder="Sale price (optional)" className="admin-input" />
              <input name="material" defaultValue={editingProduct?.material || ''} placeholder="Material" className="admin-input" />
              <label className="grid gap-1 text-sm font-bold">Backside image<input name="imageBackFile" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" required={!editingProduct} className="admin-input px-2 py-2 text-sm font-normal" /><span className="text-xs font-normal text-charcoal">Shown by default on product cards. JPG, PNG, or WebP up to 5 MB.</span>{editingProduct?.imageBack && <img src={editingProduct.imageBack} alt="Current backside" className="h-24 w-20 object-contain" />}</label>
              <label className="grid gap-1 text-sm font-bold">Frontside image<input name="imageFrontFile" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" required={!editingProduct} className="admin-input px-2 py-2 text-sm font-normal" /><span className="text-xs font-normal text-charcoal">Shown on hover and product detail switch. JPG, PNG, or WebP up to 5 MB.</span>{editingProduct?.imageFront && <img src={editingProduct.imageFront} alt="Current frontside" className="h-24 w-20 object-contain" />}</label>
              <input name="sizes" required defaultValue={editingProduct?.sizes?.join(',') || ''} placeholder="Sizes, comma-separated (S,M,L)" className="admin-input" />
              <input name="colors" required defaultValue={editingProduct?.colors?.join(',') || ''} placeholder="Colors, comma-separated" className="admin-input" />
              <select name="status" defaultValue={editingProduct?.status || 'DRAFT'} className="admin-input"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select>
              <textarea name="description" defaultValue={editingProduct?.description || ''} placeholder="Description" className="admin-input sm:col-span-2 xl:col-span-3" />
              {(data?.collections || []).length > 0 && <fieldset className="rounded-card border border-ink/10 p-4 sm:col-span-2 xl:col-span-3"><legend className="px-2 text-sm font-semibold">Gender collections</legend><div className="flex flex-wrap gap-x-5 gap-y-2">{data.collections.map((collection) => <label key={collection.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="collectionIds" value={collection.id} />{collection.name}</label>)}</div></fieldset>}
              <label className="flex items-center gap-2 text-sm"><input name="isFeatured" type="checkbox" defaultChecked={editingProduct?.isFeatured || false} /> Featured</label>
              <label className="flex items-center gap-2 text-sm"><input name="isCustomizable" type="checkbox" defaultChecked={editingProduct?.isCustomizable || false} /> Customizable</label>
              <label className="flex items-center gap-2 text-sm"><input name="isMadeToOrder" type="checkbox" defaultChecked={editingProduct?.isMadeToOrder || false} /> Made to order</label>
              <div className="flex flex-wrap gap-3 sm:col-span-2 xl:col-span-3"><button disabled={busy || !(data?.categories || []).length} className="btn btn-primary">{busy ? 'Saving…' : editingProduct ? 'Save changes' : 'Create product'}</button>{editingProduct && <button type="button" onClick={() => setEditingProduct(null)} className="btn btn-secondary">Cancel edit</button>}</div>
            </form>
          </Panel>
          ) : (
          <Panel title="Manage products">
            <DataTable headers={['Product', 'SKU', 'Category', 'Price', 'Status', 'Action']}>
              {items.map((item) => <tr key={item.id} className="border-b border-ink/10"><td className="px-3 py-3 font-bold">{item.name}</td><td className="px-3 py-3">{item.sku}</td><td className="px-3 py-3">{item.categoryName}</td><td className="price-text px-3 py-3">{money(item.salePricePaisa || item.basePricePaisa)}</td><td className="px-3 py-3"><span className={`inline-flex px-2 py-1 text-xs font-bold uppercase tracking-wide ${item.status === 'PUBLISHED' ? 'bg-olive text-chalk' : 'bg-sand text-cargo'}`}>{item.status}</span></td><td className="px-3 py-3"><div className="flex flex-wrap gap-3"><button disabled={busy} onClick={() => startEditingProduct(item)} className="font-bold text-orange">Edit</button><button disabled={busy} onClick={() => act(() => api.patch(`/admin/products/${item.id}`, { status: item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }), 'Product status updated.')} className="font-bold text-orange">{item.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}</button><button disabled={busy} onClick={() => setDeleteProduct(item)} className="font-bold text-red-700">Delete</button></div></td></tr>)}
            </DataTable>
            {!items.length && <p className="py-6 text-charcoal">No products found.</p>}
            <Pagination data={data} page={currentPage} onChange={setCurrentPage} />
          </Panel>
          )}
        </div>
      );
    }

    if (section === 'reviews') {
      return <Panel title="Product review moderation" actions={<div className="flex flex-wrap items-center gap-3"><span className="text-xs font-semibold text-charcoal">{data?.pendingCount || 0} awaiting review</span><select aria-label="Filter product reviews by status" value={reviewStatusFilter} onChange={(event) => setReviewStatusFilter(event.target.value)} className="admin-input"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></div>}>
        <DataTable headers={['Product', 'Customer', 'Review', 'Status', 'Moderation']}>
          {(data?.items || []).map((review) => <ProductReviewRow key={review.id} review={review} busy={busy} act={act} />)}
        </DataTable>
        {!data?.items?.length && <p className="py-8 text-center text-sm text-charcoal">No product reviews found.</p>}
        <Pagination data={data} page={currentPage} onChange={setCurrentPage} />
      </Panel>;
    }

    if (section === 'categories') {
      return (
        <Panel title="Categories">
          <form onSubmit={addCategory} className="mb-6 flex flex-wrap gap-3">
            <input name="name" required placeholder="Category name" className="admin-input flex-1" />
            <input name="slug" required placeholder="category-slug" className="admin-input flex-1" />
            <button disabled={busy} className="btn btn-primary">Add category</button>
          </form>
          <DataTable headers={['Name', 'Slug', 'Products']}>
            {(data?.items || []).map((item) => <tr key={item.id} className="border-b border-ink/10"><td className="px-3 py-3 font-bold">{item.name}</td><td className="px-3 py-3">{item.slug}</td><td className="px-3 py-3">{item._count.products}</td></tr>)}
          </DataTable>
          <Pagination data={data} page={currentPage} onChange={setCurrentPage} />
        </Panel>
      );
    }

    if (section === 'collections') {
      return <div className="space-y-6">
        <div className="flex flex-wrap gap-2 border-b-2 border-ink/15 pb-3">
          {[['add', 'Create collection'], ['manage', 'Manage collections'], ['carousel-add', 'Add carousel image'], ['carousel-manage', 'Manage carousel']].map(([value, label]) => (
            <button key={value} type="button" onClick={() => setCollectionTab(value)} className={`rounded-full border-2 px-5 py-2 text-sm font-bold transition ${collectionTab === value ? 'border-cargo bg-cargo text-chalk' : 'border-ink/20 bg-chalk hover:border-cargo'}`}>{label}</button>
          ))}
        </div>
        {collectionTab === 'carousel-add' || collectionTab === 'carousel-manage' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-charcoal">
                Carousel images: {(data?.carouselCountByCollection || {})[Number(selectedCarouselCollectionId)] || 0} / {data?.carouselLimit || 10}
              </p>
              {editingCarousel && <button type="button" onClick={() => { setEditingCarousel(null); setCarouselDraftCategory(''); setCarouselDraftProduct(''); setCarouselDraftDescription(''); setCollectionTab('carousel-manage'); }} className="btn btn-secondary btn-sm">Cancel edit</button>}
            </div>
            {collectionTab === 'carousel-add' ? (
              <Panel title={editingCarousel ? 'Edit carousel image' : 'Add carousel image'}>
                <form onSubmit={saveCarouselImage} className="grid gap-5 lg:grid-cols-2">
                  <fieldset className="space-y-3 rounded-card border-2 border-ink/10 p-4">
                    <legend className="px-2 text-sm font-bold">Carousel model image</legend>
                    <label className="field-label" htmlFor="carousel-collection">Collection</label>
                    <select id="carousel-collection" name="collectionId" required value={editingCarousel?.collectionId || selectedCarouselCollectionId || ''} onChange={(event) => setSelectedCarouselCollectionId(Number(event.target.value))} className="admin-input">
                      <option value="">Select collection</option>
                      {(collections || []).map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
                    </select>
                    <label className="field-label" htmlFor="carousel-category">Category</label>
                    <select id="carousel-category" name="categoryId" required value={carouselDraftCategory} onChange={(event) => setCarouselDraftCategory(event.target.value)} className="admin-input">
                      <option value="">Select category</option>
                      {(data?.categories || []).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <label className="field-label" htmlFor="carousel-product">Product</label>
                    <select id="carousel-product" name="productId" required value={carouselDraftProduct} onChange={(event) => setCarouselDraftProduct(event.target.value)} className="admin-input">
                      <option value="">Select product</option>
                      {(data?.products || []).map((product) => <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>)}
                    </select>
                    <p className="text-xs text-charcoal">Shop now will open this product's detail page.</p>
                    <label className="field-label" htmlFor="carousel-description">Description <span className="font-normal text-charcoal">(max 50 characters)</span></label>
                    <input id="carousel-description" name="description" required maxLength={50} value={carouselDraftDescription} onChange={(event) => setCarouselDraftDescription(event.target.value)} className="admin-input" placeholder="Short runway description" />
                    <label className="field-label" htmlFor="carousel-model-image">Model image</label>
                    <input id="carousel-model-image" name="modelImageFile" type="file" accept="image/png,image/jpeg,image/webp" required={!editingCarousel} className="admin-input" />
                    {editingCarousel?.modelImage && <img src={editingCarousel.modelImage} alt="Current model carousel" className="mt-2 h-24 w-24 object-contain" />}
                  </fieldset>
                  <fieldset className="space-y-3 rounded-card border-2 border-ink/10 p-4">
                    <legend className="px-2 text-sm font-bold">Carousel product image</legend>
                    <p className="text-sm text-charcoal">Category and description are copied from the model image form.</p>
                    <label className="field-label" htmlFor="carousel-product-category">Category</label>
                    <input id="carousel-product-category" value={(data?.categories || []).find((category) => String(category.id) === carouselDraftCategory)?.name || ''} readOnly className="admin-input bg-lime" />
                    <label className="field-label" htmlFor="carousel-product-description">Description</label>
                    <input id="carousel-product-description" value={carouselDraftDescription} readOnly className="admin-input bg-lime" />
                    <label className="field-label" htmlFor="carousel-product-image">Product image</label>
                    <input id="carousel-product-image" name="productImageFile" type="file" accept="image/png,image/jpeg,image/webp" required={!editingCarousel} className="admin-input" />
                    {editingCarousel?.productImage && <img src={editingCarousel.productImage} alt="Current product carousel" className="mt-2 h-24 w-24 object-contain" />}
                  </fieldset>
                  <button disabled={busy || (!editingCarousel && Number((data?.carouselCountByCollection || {})[Number(selectedCarouselCollectionId)] || 0) >= 10)} className="btn btn-primary w-fit lg:col-span-2">{busy ? 'Saving…' : editingCarousel ? 'Update carousel image' : 'Create carousel image'}</button>
                </form>
              </Panel>
            ) : (
              <Panel title="Manage carousel">
                <div className="mb-5 flex flex-wrap gap-2 border-b border-ink/15 pb-4">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => setSelectedCarouselCollectionId(collection.id)}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${selectedCarouselCollectionId === collection.id ? 'border-cargo bg-cargo text-chalk' : 'border-ink/20 bg-chalk hover:border-cargo'}`}
                    >
                      {collection.name}
                    </button>
                  ))}
                </div>
                <DataTable headers={['Images', 'Collection', 'Category', 'Description', 'Actions']}>
                  {(data?.carouselImages || []).filter((item) => item.collectionId === Number(selectedCarouselCollectionId)).map((item) => (
                    <tr key={item.id} className="border-b border-ink/10 align-top">
                      <td className="flex gap-2 px-3 py-3"><img src={item.modelImage} alt="" className="h-16 w-12 object-contain" /><img src={item.productImage} alt="" className="h-16 w-12 object-contain" /></td>
                      <td className="px-3 py-3">{item.collection?.name}</td>
                      <td className="px-3 py-3">{item.category?.name}</td>
                      <td className="px-3 py-3">{item.description}</td>
                      <td className="px-3 py-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => startEditingCarousel(item)} className="btn btn-secondary btn-sm">Edit</button><button type="button" onClick={() => deleteCarouselImage(item)} disabled={busy} className="btn btn-sm border-red-700 text-red-700 hover:bg-red-700 hover:text-white">Delete</button></div></td>
                    </tr>
                  ))}
                </DataTable>
                {!(data?.carouselImages || []).some((item) => item.collectionId === Number(selectedCarouselCollectionId)) && <p className="py-8 text-center text-sm text-charcoal">No carousel images have been created for this collection yet.</p>}
              </Panel>
            )}
          </div>
        ) : collectionTab === 'add' ? (
        <Panel title="Create collection">
          <form onSubmit={addCollection} className="grid gap-3 sm:grid-cols-2">
            <input name="name" required minLength="2" maxLength="191" placeholder="Collection name (e.g. Men)" className="admin-input" />
            <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength="191" placeholder="URL slug (e.g. men)" className="admin-input" />
            <label className="grid gap-1 sm:col-span-2">
              <span className="text-sm font-semibold">Collection description</span>
              <textarea name="description" required minLength={80} maxLength="2000" placeholder="Write at least 80 characters describing this collection." className="admin-input" />
              <span className="text-xs text-charcoal">Use at least 80 characters so customers have useful context on the collection page.</span>
            </label>
            <label className="grid gap-2 text-sm font-bold sm:col-span-2">
              Collection banner image
              <span className="text-xs font-normal text-charcoal">Recommended: landscape image, 1600 × 900 px. JPG, PNG, or WebP up to 5 MB.</span>
              <input
                name="bannerImageFile"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  if (collectionBannerPreview) URL.revokeObjectURL(collectionBannerPreview);
                  const file = event.target.files?.[0];
                  setCollectionBannerPreview(file ? URL.createObjectURL(file) : '');
                }}
                className="admin-input"
              />
              {collectionBannerPreview && (
                <img src={collectionBannerPreview} alt="Collection banner preview" className="mt-1 aspect-[16/7] w-full max-w-2xl border border-ink/10 object-cover" />
              )}
            </label>
            <fieldset className="rounded-card border border-ink/10 p-4 sm:col-span-2">
              <legend className="px-2 text-sm font-semibold">Add products</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {collectionProducts.slice((collectionProductPage - 1) * 8, collectionProductPage * 8).map((product) => <label key={product.id} className="flex items-center gap-2 text-sm"><input type="checkbox" name="productIds" value={product.id} /><span>{product.name} <span className="text-xs text-charcoal">({product.status})</span></span></label>)}
              </div>
              {!collectionProducts.length && <p className="text-sm text-charcoal">Create products before assigning them to a collection.</p>}
              {collectionProducts.length > 8 && (
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="Product pages">
                  <button type="button" disabled={collectionProductPage === 1} onClick={() => setCollectionProductPage((page) => page - 1)} className="rounded-full border-2 border-ink/20 px-3 py-1 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous products page">←</button>
                  {Array.from({ length: collectionProductPageCount }, (_, index) => index + 1).map((page) => (
                    <button key={page} type="button" onClick={() => setCollectionProductPage(page)} className={`h-8 min-w-8 rounded-full border-2 px-2 text-sm font-bold ${collectionProductPage === page ? 'border-cargo bg-cargo text-chalk' : 'border-ink/20 bg-chalk hover:border-cargo'}`} aria-label={`Products page ${page}`}>{page}</button>
                  ))}
                  <button type="button" disabled={collectionProductPage === collectionProductPageCount} onClick={() => setCollectionProductPage((page) => page + 1)} className="rounded-full border-2 border-ink/20 px-3 py-1 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next products page">→</button>
                </div>
              )}
            </fieldset>
            <button disabled={busy} className="btn btn-primary w-fit">{busy ? 'Saving…' : 'Create collection'}</button>
          </form>
        </Panel>
        ) : (
        <Panel title="Manage collections">
          <div className="space-y-5">
            {collections.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2 border-b border-ink/15 pb-4">
                  {collections.map((collection) => (
                    <button
                      key={collection.id}
                      type="button"
                      onClick={() => setSelectedCollectionId(collection.id)}
                      className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${selectedCollectionId === collection.id ? 'border-cargo bg-cargo text-chalk' : 'border-ink/20 bg-chalk hover:border-cargo'}`}
                    >
                      {collection.name}
                    </button>
                  ))}
                </div>
                {collections
                  .filter((collection) => collection.id === selectedCollectionId)
                  .map((collection) => <CollectionRow key={collection.id} collection={collection} products={data?.products || []} busy={busy} act={act} setError={setError} />)}
              </>
            ) : <p className="py-6 text-sm text-charcoal">No collections have been created yet.</p>}
          </div>
        </Panel>
        )}
      </div>;
    }

    if (section === 'orders') {
      return <>
        <Panel title="Orders"><DataTable headers={['Order', 'Customer', 'Items', 'Total', 'Status', 'Update']}>
          {(data?.items || []).map((order) => <OrderRow key={order.id} order={order} busy={busy} act={act} onViewDetails={setSelectedOrder} />)}
        </DataTable><Pagination data={data} page={currentPage} onChange={setCurrentPage} /></Panel>
        {selectedOrder && <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
      </>;
    }

    if (section === 'custom-products') {
      return (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2 border-b-2 border-ink/15 pb-3">
            {[['add', 'Add Custom Products'], ['manage', 'Manage Custom Products']].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setCustomProductTab(value)}
                className={`rounded-full border-2 px-5 py-2 text-sm font-bold transition ${customProductTab === value ? 'border-cargo bg-cargo text-chalk' : 'border-ink/20 bg-chalk hover:border-cargo'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {customProductTab === 'add' && <Panel title="Add a custom product">
            <form onSubmit={addCustomProduct} className="grid gap-3 sm:grid-cols-2">
              <input name="name" required minLength="2" maxLength="191" placeholder="Garment name (e.g. Classic T-shirt)" className="admin-input" />
              <select name="garmentType" required className="admin-input"><option value="">Choose 2D garment model</option>{garmentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
              <input name="basePrice" type="number" min="0.01" step="0.01" required placeholder="Price (PKR)" className="admin-input" />
              <textarea name="description" maxLength="5000" placeholder="Optional description" className="admin-input sm:col-span-2" />
              <label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked /> Available in customizer</label>
              <div className="sm:col-span-2"><button disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Add custom product'}</button></div>
            </form>
          </Panel>}
          {customProductTab === 'manage' && <Panel title="Manage custom products">
            <div className="space-y-4">
              {(data?.items || []).map((item) => <CustomProductRow key={item.id} item={item} busy={busy} act={act} />)}
              {!data?.items?.length && <p className="py-6 text-sm text-charcoal">No custom garments have been added yet.</p>}
              <Pagination data={data} page={currentPage} onChange={setCurrentPage} />
            </div>
          </Panel>}
        </div>
      );
    }

    if (section === 'customers') {
      return <Panel title="Customers"><DataTable headers={['Name', 'Email', 'Phone', 'Orders', 'Joined', 'Action']}>
        {(data?.items || []).map((item) => <CustomerRow key={item.id} customer={item} busy={busy} act={act} />)}
      </DataTable><Pagination data={data} page={currentPage} onChange={setCurrentPage} /></Panel>;
    }

    if (section === 'custom-designs') {
      return <Panel title="Custom design review"><DataTable headers={['Product', 'Order', 'Submitted design', 'Rights', 'Status', 'Review']}>
        {asList(data).map((design) => <DesignRow key={design.id} design={design} busy={busy} act={act} />)}
      </DataTable></Panel>;
    }

    if (section === 'quotes') {
      return <>
        <Panel title="Custom quote requests">
          <div className="hidden md:block">
            <DataTable headers={['Customer', 'Project', 'Quantity', 'Details', 'Status', 'Quote (PKR)', 'Save', 'Reply']}>
              {(data?.items || []).map((quote) => <QuoteRow key={quote.id} quote={quote} busy={busy} act={act} onReadMore={setSelectedQuote} onReply={setReplyQuote} />)}
            </DataTable>
          </div>
          <div className="grid gap-4 md:hidden">
            {(data?.items || []).map((quote) => <QuoteCard key={quote.id} quote={quote} busy={busy} act={act} onReadMore={setSelectedQuote} onReply={setReplyQuote} />)}
            {!data?.items?.length && <p className="py-8 text-center text-sm text-charcoal">No custom quote requests yet.</p>}
          </div>
        </Panel>
        {selectedQuote && <QuoteDetailsModal quote={selectedQuote} onClose={() => setSelectedQuote(null)} />}
        {replyQuote && <QuoteReplyModal quote={replyQuote} busy={busy} act={act} onClose={() => setReplyQuote(null)} />}
        <Pagination data={data} page={currentPage} onChange={setCurrentPage} />
      </>;
    }

    if (section === 'contact-messages') {
      return <Panel title="Contact inbox" actions={data?.unreadCount > 0 && <span className="text-xs font-semibold text-charcoal">{data.unreadCount} new</span>}>
        <DataTable headers={['Received', 'Customer', 'Topic & message', 'Status', 'Action']}>
          {(data?.items || []).map((message) => <ContactMessageRow key={message.id} message={message} busy={busy} act={act} onReadMore={setSelectedContactMessage} />)}
        </DataTable>
        {!data?.items?.length && <p className="py-8 text-center text-sm text-charcoal">No contact messages yet.</p>}
        <Pagination data={data} page={currentPage} onChange={setCurrentPage} />
        {selectedContactMessage && <ContactMessageModal message={selectedContactMessage} onClose={() => setSelectedContactMessage(null)} />}
      </Panel>;
    }

    if (section === 'newsletter-subscribers') {
      return <Panel title="Newsletter subscribers" actions={<span className="text-xs font-semibold text-charcoal">{data?.total || 0} total</span>}>
        <DataTable headers={['Email address', 'Subscribed']}>
          {(data?.items || []).map((subscriber) => (
            <tr key={subscriber.id} className="border-b border-ink/10">
              <td className="px-3 py-3 font-semibold"><a href={`mailto:${subscriber.email}`} className="text-orange underline underline-offset-2">{subscriber.email}</a></td>
              <td className="px-3 py-3">{new Date(subscriber.consentedAt).toLocaleDateString()} · {new Date(subscriber.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </DataTable>
        {!data?.items?.length && <p className="py-8 text-center text-sm text-charcoal">No newsletter subscribers yet.</p>}
        <Pagination data={data} page={currentPage} onChange={setCurrentPage} />
      </Panel>;
    }

    if (section === 'audit-logs') {
      return <Panel title="Recent administrator activity"><DataTable headers={['When', 'Administrator', 'Action', 'Target']}>
        {(data?.items || []).map((entry) => <tr key={entry.id} className="border-b border-ink/10"><td className="px-3 py-3">{new Date(entry.createdAt).toLocaleString()}</td><td className="px-3 py-3">{entry.actor?.email || 'Unknown'}</td><td className="px-3 py-3">{entry.action}</td><td className="px-3 py-3">{entry.targetType} #{entry.targetId}</td></tr>)}
      </DataTable><Pagination data={data} page={currentPage} onChange={setCurrentPage} /></Panel>;
    }

    if (section === 'security') {
      return <Panel title="Change administrator password">
        <p className="mb-5 max-w-2xl text-charcoal">Use a unique password with at least 12 characters. Passwords are hashed before storage. This will sign out other active sessions.</p>
        <form onSubmit={changePassword} className="grid max-w-xl gap-4">
          <label className="grid gap-2 text-sm font-bold">Current password<input name="currentPassword" type="password" autoComplete="current-password" minLength="1" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">New password<input name="newPassword" type="password" autoComplete="new-password" minLength="12" required className="admin-input" /></label>
          <label className="grid gap-2 text-sm font-bold">Confirm new password<input name="confirmPassword" type="password" autoComplete="new-password" minLength="12" required className="admin-input" /></label>
          <button disabled={busy} className="btn btn-primary w-fit">{busy ? 'Updating…' : 'Update password'}</button>
        </form>
      </Panel>;
    }

    return <Panel title="Coming soon"><p className="text-charcoal">This module is not available yet.</p></Panel>;
  };

  return (
    <div className="admin-shell min-h-screen bg-paper text-ink">
      <header className="admin-header on-dark border-b border-ink/15 bg-cargo text-sand">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link to="/admin" aria-label="Admin overview"><Wordmark /></Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-sand/70 sm:inline">{user ? `${user.fullName} · ${user.role}` : 'Loading account…'}</span>
            <Link to="/" className="font-medium text-brass underline-offset-4 hover:underline">View store</Link>
            <button onClick={logout} className="border border-sand/40 px-4 py-2 font-medium text-sand transition hover:bg-sand hover:text-cargo">Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1440px] gap-7 px-4 py-7 md:px-8 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Admin navigation" className="admin-sidebar flex gap-2 overflow-x-auto lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
          {navItems.map(([label, path]) => <Link key={path} to={path} className={`shrink-0 border px-4 py-2.5 text-sm font-medium transition ${location.pathname === path ? 'border-cargo bg-cargo text-chalk' : 'border-ink/15 bg-chalk hover:border-ink/40'}`}>{label}</Link>)}
        </nav>
        <main className="min-w-0 space-y-6 lg:col-start-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div><p className="text-sm font-semibold text-brass-deep">Studio workspace</p><h1 className="mt-1 text-4xl capitalize">{section.replaceAll('-', ' ')}</h1></div>
            {!['overview', 'hero', 'audit-logs', 'categories'].includes(section) && <input aria-label="Search admin records" value={search} onChange={(event) => { setSearch(event.target.value); if (section === 'newsletter-subscribers') setSubscriberPage(1); }} placeholder="Search…" className="admin-input w-full max-w-xs" />}
          </div>
          {!data && !error ? <p className="rounded-card border-2 border-ink bg-cream p-6">Loading admin data…</p> : content()}
        </main>
      </div>
      {deleteProduct && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-cargo/60 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-product-title">
          <div className="w-full max-w-md rounded-card border-2 border-ink bg-cream p-6 shadow-soft">
            <h2 id="delete-product-title" className="text-2xl">Delete product?</h2>
            <p className="mt-3 text-charcoal">Are you sure you want to delete <strong>{deleteProduct.name}</strong>? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={busy} onClick={() => setDeleteProduct(null)} className="btn btn-secondary">Cancel</button>
              <button type="button" disabled={busy} onClick={confirmDeleteProduct} className="btn bg-red-700 text-white hover:bg-red-800">{busy ? 'Deleting…' : 'Delete product'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function useQuoteFields({ quote, busy, act, onReadMore, onReply }) {
  const [status, setStatus] = useState(quote.status);
  const [price, setPrice] = useState(quote.quotedPricePaisa ? String(quote.quotedPricePaisa / 100) : '');
  const [notes, setNotes] = useState(quote.internalNotes || '');
  const designImageUrl = `${api.defaults.baseURL}/admin/quotes/${quote.id}/design-image`;
  const preview = quote.details.length > 180 ? `${quote.details.slice(0, 180).trim()}…` : quote.details;
  return {
    customer: <><strong>{quote.name}</strong><br />{quote.email}</>,
    project: quote.projectType,
    quantity: quote.quantity ?? 1,
    details: <div className="min-w-0">
      <p className="whitespace-pre-wrap break-words">{preview}</p>
      {quote.details.length > 180 && <button type="button" onClick={() => onReadMore(quote)} className="mt-2 font-bold text-orange underline underline-offset-2">Read more</button>}
      {quote.designImage && <a href={designImageUrl} target="_blank" rel="noreferrer" className="mt-3 block w-fit"><img src={designImageUrl} alt={`Design image attached to quote from ${quote.name}`} loading="lazy" className="h-28 w-28 rounded-card border border-ink/10 object-cover" /><span className="mt-1 block text-xs font-semibold text-orange underline">View design image</span></a>}
      <textarea aria-label={`Internal notes for quote ${quote.id}`} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Internal notes" className="admin-input mt-2 w-full" />
    </div>,
    status: <select value={status} onChange={(event) => setStatus(event.target.value)} className="admin-input">{['NEW', 'REVIEWING', 'QUOTED', 'ACCEPTED', 'DECLINED', 'COMPLETED'].map((value) => <option key={value}>{value}</option>)}</select>,
    price: <input type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} className="admin-input w-32" />,
    save: <button disabled={busy} onClick={() => act(() => api.patch(`/admin/quotes/${quote.id}`, { status, quotedPricePaisa: price ? Math.round(Number(price) * 100) : null, internalNotes: notes }), 'Quote updated.')} className="font-bold text-orange">Save</button>,
    reply: <button type="button" disabled={busy} onClick={() => onReply(quote)} className="font-bold text-orange underline underline-offset-2">Reply</button>,
  };
}

function QuoteRow({ quote, busy, act, onReadMore, onReply }) {
  const fields = useQuoteFields({ quote, busy, act, onReadMore, onReply });
  return (
    <tr className="border-b border-ink/10 align-top">
      <td className="px-3 py-3">{fields.customer}</td><td className="px-3 py-3">{fields.project}</td><td className="px-3 py-3 font-semibold">{fields.quantity}</td><td className="max-w-xs px-3 py-3">{fields.details}</td><td className="px-3 py-3">{fields.status}</td><td className="px-3 py-3">{fields.price}</td><td className="px-3 py-3">{fields.save}</td><td className="px-3 py-3">{fields.reply}</td>
    </tr>
  );
}

function QuoteCard({ quote, busy, act, onReadMore, onReply }) {
  const fields = useQuoteFields({ quote, busy, act, onReadMore, onReply });
  return <article className="rounded-card border border-ink/15 bg-chalk p-4 shadow-sm">
    <div className="flex flex-wrap justify-between gap-3"><div><p className="font-bold">{quote.name}</p><p className="break-all text-sm text-charcoal">{quote.email}</p></div><span className="text-sm font-semibold">Qty: {fields.quantity}</span></div>
    <dl className="mt-4 grid gap-3 text-sm"><div><dt className="font-bold">Project</dt><dd>{fields.project}</dd></div><div><dt className="font-bold">Details</dt><dd>{fields.details}</dd></div><div><dt className="font-bold">Status</dt><dd>{fields.status}</dd></div><div><dt className="font-bold">Quote (PKR)</dt><dd>{fields.price}</dd></div></dl>
    <div className="mt-4 flex flex-wrap items-center gap-4">{fields.save}{fields.reply}</div>
  </article>;
}

function QuoteDetailsModal({ quote, onClose }) {
  const designImageUrl = `${api.defaults.baseURL}/admin/quotes/${quote.id}/design-image`;
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-cargo/70 p-4" role="dialog" aria-modal="true" aria-labelledby="quote-details-title">
    <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-card border-2 border-ink bg-cream p-5 shadow-soft md:max-h-[calc(100vh-4rem)] md:p-7">
      <div className="flex items-start justify-between gap-4"><h2 id="quote-details-title" className="text-2xl">Quote request details</h2><button type="button" onClick={onClose} className="text-2xl font-bold leading-none" aria-label="Close quote details">×</button></div>
      <div className="mt-5 grid gap-4 text-sm"><p><strong>Customer:</strong> {quote.name} · <a href={`mailto:${quote.email}`} className="text-orange underline">{quote.email}</a></p><p><strong>Project:</strong> {quote.projectType} · <strong>Quantity:</strong> {quote.quantity ?? 1}</p><div><h3 className="font-bold">Full message</h3><p className="mt-2 whitespace-pre-wrap break-words rounded-card border border-ink/10 bg-chalk p-4">{quote.details}</p></div>{quote.designImage && <a href={designImageUrl} target="_blank" rel="noreferrer" className="block w-fit"><img src={designImageUrl} alt={`Full design image attached to quote from ${quote.name}`} className="max-h-80 max-w-full rounded-card border border-ink/10 object-contain" /><span className="mt-1 block font-semibold text-orange underline">Open design image</span></a>}</div>
    </div>
  </div>;
}

function QuoteReplyModal({ quote, busy, act, onClose }) {
  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sent = await act(() => api.post(`/admin/quotes/${quote.id}/reply`, {
      subject: form.get('subject'),
      message: form.get('message'),
    }), 'Reply sent successfully.');
    if (sent) onClose();
  };
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-cargo/70 p-4" role="dialog" aria-modal="true" aria-labelledby="quote-reply-title">
    <form onSubmit={submit} className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-card border-2 border-ink bg-cream p-5 shadow-soft md:max-h-[calc(100vh-4rem)] md:p-7">
      <div className="flex items-start justify-between gap-4"><h2 id="quote-reply-title" className="text-2xl">Reply to quote request</h2><button type="button" onClick={onClose} className="text-2xl font-bold leading-none" aria-label="Close reply modal">×</button></div>
      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-bold">To<input value={quote.email} readOnly className="admin-input bg-ink/5" /></label>
        <label className="grid gap-2 text-sm font-bold">Subject<input name="subject" required maxLength="191" defaultValue={`Re: Your ZAVIKOO quote request`} className="admin-input" /></label>
        <label className="grid gap-2 text-sm font-bold">Message<textarea name="message" required maxLength="20000" rows="10" placeholder="Write your reply…" className="admin-input min-h-48 resize-y" /></label>
        <div className="flex justify-end gap-3"><button type="button" disabled={busy} onClick={onClose} className="btn btn-secondary">Cancel</button><button type="submit" disabled={busy} className="btn btn-primary">{busy ? 'Sending…' : 'Send email'}</button></div>
      </div>
    </form>
  </div>;
}

function CollectionRow({ collection, products, busy, act, setError }) {
  const [name, setName] = useState(collection.name);
  const [slug, setSlug] = useState(collection.slug);
  const [description, setDescription] = useState(collection.description || '');
  const [isActive, setIsActive] = useState(collection.isActive);
  const [productIds, setProductIds] = useState(collection.items.map((item) => item.productId));
  const [productPage, setProductPage] = useState(1);
  const [bannerPreview, setBannerPreview] = useState('');
  const productPageCount = Math.max(1, Math.ceil(products.length / 8));

  const toggleProduct = (id) => {
    setProductIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  useEffect(() => {
    setProductPage((page) => Math.min(page, productPageCount));
  }, [productPageCount]);

  useEffect(() => () => {
    if (bannerPreview) URL.revokeObjectURL(bannerPreview);
  }, [bannerPreview]);

  const saveCollection = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let bannerImageData = '';
    try {
      bannerImageData = await readImageFile(form.get('bannerImageFile'));
    } catch (imageError) {
      setError(imageError.message);
      return;
    }
    const saved = await act(() => api.patch(`/admin/collections/${collection.id}`, {
      name,
      slug,
      description,
      isActive,
      productIds,
      ...(bannerImageData ? { bannerImageData } : {}),
    }), 'Collection and product assignments saved.');
    if (saved) setBannerPreview('');
  };

  return (
    <form onSubmit={saveCollection} className="rounded-card border border-ink/10 p-4 md:p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold">Collection name<input required minLength="2" maxLength="191" value={name} onChange={(event) => setName(event.target.value)} className="admin-input" /></label>
        <label className="grid gap-1 text-sm font-semibold">URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength="191" value={slug} onChange={(event) => setSlug(event.target.value)} className="admin-input" /></label>
        <label className="grid gap-1 text-sm font-semibold md:col-span-2">Description<textarea required minLength={80} maxLength="2000" value={description} onChange={(event) => setDescription(event.target.value)} className="admin-input min-h-20" /><span className="text-xs font-normal text-charcoal">Use at least 80 characters so customers have useful context on the collection page.</span></label>
      </div>
      <label className="mt-4 grid gap-2 text-sm font-semibold">
        Collection banner image
        <span className="text-xs font-normal text-charcoal">Upload or replace the banner shown on this collection’s storefront page. JPG, PNG, or WebP up to 5 MB.</span>
        <input
          name="bannerImageFile"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(event) => {
            if (bannerPreview) URL.revokeObjectURL(bannerPreview);
            const file = event.target.files?.[0];
            setBannerPreview(file ? URL.createObjectURL(file) : '');
          }}
          className="admin-input"
        />
        {(bannerPreview || collection.bannerImageMimeType) && (
          <img
            src={bannerPreview || `${api.defaults.baseURL.replace(/\/$/, '')}/collections/${collection.id}/banner-image`}
            alt={`${collection.name} banner preview`}
            className="mt-1 aspect-[16/7] w-full max-w-2xl border border-ink/10 object-cover"
          />
        )}
      </label>
      <fieldset className="mt-4 rounded-card border border-ink/10 p-3">
        <legend className="px-2 text-sm font-semibold">Products in this collection ({productIds.length})</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice((productPage - 1) * 8, productPage * 8).map((product) => <label key={product.id} className="flex items-start gap-2 text-sm"><input type="checkbox" checked={productIds.includes(product.id)} onChange={() => toggleProduct(product.id)} /><span>{product.name}<span className="block text-xs text-charcoal">{product.status}</span></span></label>)}
          {!products.length && <p className="text-sm text-charcoal">No products available.</p>}
        </div>
        {products.length > 8 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2" aria-label="Collection product pages">
            <button type="button" disabled={productPage === 1} onClick={() => setProductPage((page) => page - 1)} className="rounded-full border-2 border-ink/20 px-3 py-1 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40" aria-label="Previous collection products page">←</button>
            {Array.from({ length: productPageCount }, (_, index) => index + 1).map((page) => (
              <button key={page} type="button" onClick={() => setProductPage(page)} className={`h-8 min-w-8 rounded-full border-2 px-2 text-sm font-bold ${productPage === page ? 'border-cargo bg-cargo text-chalk' : 'border-ink/20 bg-chalk hover:border-cargo'}`} aria-label={`Collection products page ${page}`}>{page}</button>
            ))}
            <button type="button" disabled={productPage === productPageCount} onClick={() => setProductPage((page) => page + 1)} className="rounded-full border-2 border-ink/20 px-3 py-1 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40" aria-label="Next collection products page">→</button>
          </div>
        )}
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />Visible in storefront</label>
        <button disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save collection'}</button>
      </div>
    </form>
  );
}

function ProductReviewRow({ review, busy, act }) {
  const [status, setStatus] = useState(review.status);
  return (
    <tr className="border-b border-ink/10 align-top">
      <td className="px-3 py-3"><Link to={`/product/${review.product.slug}`} className="font-semibold text-orange underline">{review.product.name}</Link><p className="mt-1 text-xs text-charcoal">{new Date(review.createdAt).toLocaleDateString()}</p></td>
      <td className="px-3 py-3"><strong>{review.reviewerName}</strong><br /><a className="text-xs text-orange underline" href={`mailto:${review.reviewerEmail}`}>{review.reviewerEmail}</a></td>
      <td className="max-w-md px-3 py-3"><span className="text-amber-600" aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><p className="mt-2 whitespace-pre-wrap">{review.comment}</p></td>
      <td className="px-3 py-3">{review.status}</td>
      <td className="px-3 py-3"><div className="flex min-w-48 gap-2"><select aria-label={`Moderation status for review by ${review.reviewerName}`} value={status} onChange={(event) => setStatus(event.target.value)} className="admin-input min-w-0"><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select><button disabled={busy || status === review.status} onClick={() => act(() => api.patch(`/admin/reviews/${review.id}`, { status }), 'Review moderation updated.')} className="font-bold text-orange disabled:text-charcoal/50">Save</button></div></td>
    </tr>
  );
}

function ContactMessageRow({ message, busy, act, onReadMore }) {
  const [status, setStatus] = useState(message.status);
  const isLong = message.message.length > 180;
  const preview = isLong ? `${message.message.slice(0, 180).trim()}…` : message.message;
  return (
    <tr className="border-b border-ink/10 align-top">
      <td className="whitespace-nowrap px-3 py-3 text-xs">{new Date(message.createdAt).toLocaleString()}</td>
      <td className="px-3 py-3"><strong>{message.name}</strong><br /><a className="text-orange underline" href={`mailto:${message.email}`}>{message.email}</a>{message.phone && <><br /><a href={`tel:${message.phone}`}>{message.phone}</a></>}</td>
      <td className="max-w-md px-3 py-3"><strong>{message.subject}</strong><p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-charcoal">{preview}</p>{isLong && <button type="button" onClick={() => onReadMore(message)} className="mt-2 font-semibold text-orange underline underline-offset-2">Read more</button>}</td>
      <td className="px-3 py-3"><select aria-label={`Status for contact message ${message.id}`} value={status} onChange={(event) => setStatus(event.target.value)} className="admin-input">{['NEW', 'READ', 'REPLIED', 'ARCHIVED'].map((value) => <option key={value} value={value}>{value}</option>)}</select></td>
      <td className="px-3 py-3"><button disabled={busy || status === message.status} onClick={() => act(() => api.patch(`/admin/contact-messages/${message.id}`, { status }), 'Contact message updated.')} className="font-semibold text-orange disabled:text-charcoal/50">{busy ? 'Saving…' : 'Save'}</button></td>
    </tr>
  );
}

function ContactMessageModal({ message, onClose }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cargo/70 p-4 md:p-8" role="dialog" aria-modal="true" aria-labelledby="contact-message-title">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-card border-2 border-ink bg-cream p-5 shadow-soft md:max-h-[calc(100vh-4rem)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink/15 pb-4">
          <div>
            <h2 id="contact-message-title" className="text-2xl">Contact message</h2>
            <p className="mt-1 text-sm text-charcoal">{message.subject}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close contact message" className="grid h-10 w-10 place-items-center border border-ink/20 text-xl hover:bg-cargo hover:text-chalk">×</button>
        </div>
        <div className="mt-5 grid gap-3 text-sm">
          <p><strong>From:</strong> {message.name} · <a className="text-orange underline" href={`mailto:${message.email}`}>{message.email}</a></p>
          {message.phone && <p><strong>Phone:</strong> <a href={`tel:${message.phone}`}>{message.phone}</a></p>}
          <div>
            <h3 className="font-bold">Full message</h3>
            <div className="mt-2 max-h-[50vh] overflow-y-auto whitespace-pre-wrap break-words rounded-card border border-ink/10 bg-chalk p-4">{message.message}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderRow({ order, busy, act, onViewDetails }) {
  const nextStatuses = orderStatuses;
  return (
    <tr className="border-b border-ink/10 align-top">
      <td className="px-3 py-3 font-bold">{order.orderNumber}<p className="font-normal text-charcoal">{new Date(order.createdAt).toLocaleString()}</p></td>
      <td className="px-3 py-3">{order.email}<br />{order.phone}</td>
      <td className="px-3 py-3">{order.items.map((item) => `${item.nameSnapshot} / ${item.size} / ${item.color} × ${item.qty}${item.design ? ` / Custom: ${item.design.layoutJson.text}` : ''}`).join(', ')}</td>
      <td className="price-text px-3 py-3">{money(order.totalPaisa)}</td>
      <td className="px-3 py-3">{order.status}</td>
      <td className="px-3 py-3"><div className="flex flex-col items-start gap-3"><button type="button" disabled={busy} onClick={() => onViewDetails(order)} className="font-bold text-orange underline underline-offset-4">View details</button><select aria-label={`Update ${order.orderNumber}`} value={order.status} disabled={busy || !nextStatuses.length} className="admin-input min-w-44" onChange={(event) => act(() => api.patch(`/admin/orders/${order.id}`, { status: event.target.value }), 'Order status updated.')}>{Array.from(new Set([order.status, ...nextStatuses])).map((status) => <option key={status}>{status}</option>)}</select></div></td>
    </tr>
  );
}

function OrderDetailsModal({ order, onClose }) {
  const [preview, setPreview] = useState(null);
  const inStockItems = order.items.filter((item) => !item.design);
  const customItems = order.items.filter((item) => item.design);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-cargo/60 p-4 md:p-8" role="dialog" aria-modal="true" aria-labelledby="order-details-title">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-card border-2 border-ink bg-cream p-5 shadow-soft md:max-h-[calc(100vh-4rem)] md:p-7">
        <div className="flex items-start justify-between gap-4 border-b-2 border-ink/15 pb-4">
          <div>
            <h2 id="order-details-title" className="text-2xl">Order details</h2>
            <p className="mt-1 text-sm text-charcoal">{order.orderNumber}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close order details" className="grid h-10 w-10 place-items-center border border-ink/20 text-xl hover:bg-cargo hover:text-chalk">×</button>
        </div>

        <section className="mt-6">
          <h3 className="text-xl">In Stock</h3>
          {inStockItems.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {inStockItems.map((item) => (
                <OrderItemCard key={item.id} item={item} onPreview={setPreview} />
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-charcoal">No in-stock products in this order.</p>}
        </section>

        <section className="mt-8 border-t-2 border-ink/15 pt-6">
          <h3 className="text-xl">Custom</h3>
          {customItems.length ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {customItems.map((item) => (
                <OrderItemCard key={item.id} item={item} onPreview={setPreview} />
              ))}
            </div>
          ) : <p className="mt-3 text-sm text-charcoal">No custom designs in this order.</p>}
        </section>
      </div>

      {preview && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-cargo/80 p-4" role="dialog" aria-modal="true" aria-label="Item preview">
          <div className="relative max-h-[calc(100vh-2rem)] w-[min(90vw,900px)] overflow-y-auto rounded-card border-2 border-ink bg-cream p-4 shadow-soft">
            <button type="button" onClick={() => setPreview(null)} aria-label="Close preview" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center bg-cargo text-2xl text-chalk hover:bg-olive">×</button>
            {preview.design
              ? <GarmentDesignBoard layout={preview.design.layoutJson || {}} className="h-auto max-h-[80vh] w-full object-contain" />
              : <img src={preview.image} alt={preview.name} className="h-auto max-h-[80vh] w-full object-contain" />}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderItemCard({ item, onPreview }) {
  const image = item.variant?.product?.images?.[0]?.storageKey || '';
  const design = item.design?.layoutJson;
  return (
    <article className="flex gap-4 rounded-card border border-ink/15 bg-white p-3">
      <button type="button" onClick={() => onPreview({ ...item, image })} className="h-24 w-24 shrink-0 overflow-hidden border border-ink/15 bg-[#e0ded5] hover:border-cargo" aria-label={`Preview ${item.nameSnapshot}`}>
        {design ? <GarmentDesignBoard layout={design} className="h-full w-full object-cover" /> : image ? <img src={image} alt={item.nameSnapshot} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center px-2 text-center text-xs text-charcoal">No image</span>}
      </button>
      <div className="space-y-1 text-sm">
        <h4 className="font-bold">{item.nameSnapshot}</h4>
        <p>Quantity: {item.qty}</p>
        <p>Size: {item.size}</p>
        <p>Color: {item.color}</p>
        {design?.text && <p className="max-w-xs truncate">Text: {design.text}</p>}
        {design?.imageData && Number.isFinite(Number(design.imageSizeInches)) && (
          <p>Image length: {Number(design.imageSizeInches)} inches</p>
        )}
        {design?.text && Number.isFinite(Number(design.textWidthInches)) && (
          <p>Text width: {Number(design.textWidthInches)} inches</p>
        )}
        {String(item.size).toUpperCase() === 'XS' && design?.xsMeasurements && (
          <div className="mt-2 rounded border border-ink/15 bg-[#f4f0e9] px-3 py-2 text-xs leading-relaxed">
            <p className="font-bold text-ink">XS Measurements</p>
            <p>Length: {design.xsMeasurements.length} in</p>
            <p>Chest: {design.xsMeasurements.chest} in</p>
          </div>
        )}
      </div>
    </article>
  );
}

function CustomerRow({ customer, busy, act }) {
  const toggleStatus = () => {
    const action = customer.isActive ? 'block' : 'unblock';
    if (window.confirm(`Are you sure you want to ${action} ${customer.fullName}?`)) {
      act(() => api.patch(`/admin/customers/${customer.id}`, { isActive: !customer.isActive }), `Customer ${action}ed.`);
    }
  };
  const remove = () => {
    if (window.confirm(`Delete ${customer.fullName}? This cannot be undone.`)) {
      act(() => api.delete(`/admin/customers/${customer.id}`), 'Customer deleted.');
    }
  };
  return (
    <tr className="border-b border-ink/10 align-top">
      <td className="px-3 py-3 font-bold">{customer.fullName}<span className={`mt-1 block text-xs font-semibold ${customer.isActive ? 'text-green-700' : 'text-red-700'}`}>{customer.isActive ? 'Active' : 'Blocked'}</span></td>
      <td className="break-all px-3 py-3">{customer.email}</td>
      <td className="px-3 py-3">{customer.phone || '—'}</td>
      <td className="px-3 py-3">{customer._count.orders}</td>
      <td className="px-3 py-3">{new Date(customer.createdAt).toLocaleDateString()}</td>
      <td className="px-3 py-3"><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={toggleStatus} className="font-bold text-orange">{customer.isActive ? 'Block' : 'Unblock'}</button><button type="button" disabled={busy} onClick={remove} className="font-bold text-red-700">Delete</button></div></td>
    </tr>
  );
}

function DesignRow({ design, busy, act }) {
  const [status, setStatus] = useState(design.status);
  const [showPreview, setShowPreview] = useState(false);
  const layout = design.layoutJson || {};
  return (
    <>
      <tr className="border-b border-ink/10 align-top">
        <td className="px-3 py-3 font-bold">{design.customProduct?.name || design.product?.name || layout.garmentName || 'Custom garment'}<p className="font-normal">{design.customProduct?.sku || design.product?.sku || 'Custom design'}</p></td>
        <td className="px-3 py-3">{design.orderItems.map((item) => item.order.orderNumber).join(', ') || '—'}</td>
        <td className="px-3 py-3">
          <button type="button" onClick={() => setShowPreview(true)} title="Open full design preview" className="mb-2 block w-32 border border-ink/10 bg-[#f4f0e9]">
            <GarmentDesignBoard layout={layout} className="w-full" />
          </button>
          <span>{layout.text || (layout.imageData ? 'Uploaded design' : 'No text')}</span>
          <p className="text-charcoal">{layout.color || 'White'} · {layout.size || '—'} · {layout.textPlacement || layout.placement || 'front'}</p>
        </td>
        <td className="px-3 py-3">{design.rightsConfirmed ? 'Confirmed' : 'Not confirmed'}</td>
        <td className="px-3 py-3"><select value={status} onChange={(event) => setStatus(event.target.value)} className="admin-input">{['DRAFT', 'SUBMITTED', 'APPROVED', 'REVISION_REQUESTED', 'REJECTED'].map((value) => <option key={value}>{value}</option>)}</select></td>
        <td className="px-3 py-3"><button disabled={busy} onClick={() => act(() => api.patch(`/admin/custom-designs/${design.id}`, { status }), 'Design review saved.')} className="font-bold text-orange">Save</button></td>
      </tr>
      {showPreview && (
        <tr className="border-b border-ink/10">
          <td colSpan="6" className="bg-[#f4f0e9] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-semibold">{layout.garmentName || 'Custom garment'} — front and back</h3>
              <button type="button" onClick={() => setShowPreview(false)} className="font-semibold text-orange underline">Close preview</button>
            </div>
            <GarmentDesignBoard layout={layout} className="mx-auto max-w-3xl" />
          </td>
        </tr>
      )}
    </>
  );
}

function CustomProductRow({ item, busy, act }) {
  const [editing, setEditing] = useState(false);
  const garment = garmentTypes.find((type) => type.value === item.garmentType) || garmentTypes[0];
  const save = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const success = await act(() => api.patch(`/admin/custom-products/${item.id}`, {
      name: form.get('name'),
      slug: slugFromName(form.get('name')),
      garmentType: form.get('garmentType'),
      description: form.get('description'),
      basePricePaisa: Math.round(Number(form.get('basePrice')) * 100),
      isActive: form.get('isActive') === 'on',
    }), 'Custom garment updated.');
    if (success) {
      setEditing(false);
    }
  };
  const remove = () => {
    if (window.confirm(`Delete ${item.name}? Existing orders and saved design previews will remain.`)) {
      act(() => api.delete(`/admin/custom-products/${item.id}`), 'Custom garment deleted.');
    }
  };

  return (
    <article className="rounded-card border border-ink/10 p-4">
      {editing ? (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <input name="name" required defaultValue={item.name} className="admin-input" aria-label="Custom garment name" />
          <select name="garmentType" defaultValue={item.garmentType} className="admin-input" aria-label="Garment model">{garmentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
          <input name="basePrice" type="number" min="0.01" step="0.01" required defaultValue={(item.basePricePaisa / 100).toFixed(2)} className="admin-input" aria-label="Price in PKR" />
          <textarea name="description" maxLength="5000" defaultValue={item.description || ''} className="admin-input sm:col-span-2" aria-label="Description" />
          <label className="flex items-center gap-2 text-sm"><input name="isActive" type="checkbox" defaultChecked={item.isActive} />Available in customizer</label>
          <div className="flex gap-3 sm:col-span-2"><button disabled={busy} className="btn btn-primary">Save changes</button><button type="button" onClick={() => setEditing(false)} className="btn btn-secondary">Cancel</button></div>
        </form>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold">{item.name}</h3>
            <p className="mt-1 text-xs text-charcoal">{garment.label} · {item.sku} · <span className="price-text">PKR {(item.basePricePaisa / 100).toLocaleString('en-PK')}</span></p>
            <span className={`mt-2 inline-flex text-[10px] font-semibold uppercase tracking-[0.12em] ${item.isActive ? 'text-green-800' : 'text-charcoal'}`}>{item.isActive ? 'Available' : 'Hidden'}</span>
          </div>
          <div className="flex gap-3"><button disabled={busy} type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-orange underline">Edit</button><button disabled={busy} type="button" onClick={remove} className="text-sm font-semibold text-red-700 underline">Delete</button></div>
        </div>
      )}
    </article>
  );
}
