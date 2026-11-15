import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatPrice, ProductCard } from '../components/ProductCard.jsx';
import { useCart } from '../context/CartContext.jsx';
import { Breadcrumbs } from '../components/PageHead.jsx';
import { IconMinus, IconPlus, IconStar, IconChevronDown } from '../components/Icons.jsx';
import { api, getData } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';
import { Seo } from '../components/Seo.jsx';
import { faqJsonLd, getSiteUrl, productJsonLd } from '../lib/jsonld.js';
import { productImageAlt } from '../components/ImageAlt.jsx';
import { track } from '../lib/analytics.js';

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const showToast = useToast();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewSummary, setReviewSummary] = useState({ count: 0, averageRating: 0 });
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitError, setReviewSubmitError] = useState('');
  const [reviewsLoadError, setReviewsLoadError] = useState('');
  const [reviewForm, setReviewForm] = useState({ reviewerName: '', reviewerEmail: '', rating: 5, comment: '' });
  const [error, setError] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [imageSide, setImageSide] = useState('back');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProduct(null);
    setImageSide('back');
    setError('');
    setReviews([]);
    setReviewPage(1);
    setReviewSummary({ count: 0, averageRating: 0 });
    setReviewsLoading(true);
    setReviewSubmitError('');
    setReviewsLoadError('');
    setReviewForm({ reviewerName: '', reviewerEmail: '', rating: 5, comment: '' });
    getData(`/products/${encodeURIComponent(slug)}`).then(async (currentProduct) => {
      if (!active) return;
      setProduct(currentProduct);
      track('view_item', {
        currency: 'PKR',
        value: ((currentProduct.salePricePaisa || currentProduct.basePricePaisa) || 0) / 100,
        items: [{ item_id: currentProduct.sku, item_name: currentProduct.name }],
      });
      setSelectedColor(currentProduct.colors?.[0] || '');
      setSelectedSize(currentProduct.sizes?.[0] || '');
      getData(`/products/${encodeURIComponent(slug)}/reviews`).then((result) => {
        if (active) {
          setReviews(result.items);
          setReviewSummary(result.summary);
        }
      }).catch(() => {
        if (active) setReviewsLoadError('Reviews could not be loaded. Please refresh to try again.');
      }).finally(() => {
        if (active) setReviewsLoading(false);
      });
      try {
        const recommendations = await getData('/products', { category: currentProduct.category, pageSize: 4 });
        if (active) setRelated(recommendations.items.filter((item) => item.slug !== slug).slice(0, 3));
      } catch {
        if (active) setRelated([]);
      }
    }).catch((requestError) => {
      if (active) setError(requestError.response?.status === 404 ? 'not-found' : 'The product could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const relatedProducts = useMemo(() => related, [related]);
  const reviewPageCount = Math.ceil(reviews.length / 5);
  const visibleReviews = reviews.slice((reviewPage - 1) * 5, reviewPage * 5);

  if (loading) {
    return (
      <section className="page grid gap-12 py-14 lg:grid-cols-[1.15fr_0.85fr]" aria-live="polite" aria-busy="true">
        <div className="skeleton aspect-[4/5]" />
        <div className="space-y-5 pt-6"><div className="skeleton h-5 w-24" /><div className="skeleton h-14 w-4/5" /><div className="skeleton h-6 w-1/3" /><div className="skeleton h-28 w-full" /></div>
      </section>
    );
  }
  if (!product || error) {
    return (
      <section className="page py-16 md:py-24">
        <Seo noindex />
        <div className="border border-dashed border-ink/25 bg-chalk px-6 py-20 text-center">
          <h1 className="display-m">{error === 'not-found' ? 'Product not found' : 'Unable to load product'}</h1>
          {error !== 'not-found' && <p className="mt-4 text-stone">{error}</p>}
          <Link to="/shop" className="btn btn-primary mt-8">Return to shop</Link>
        </div>
      </section>
    );
  }

  const handleAddToCart = () => {
    addItem(product, { color: selectedColor, size: selectedSize }, quantity);
    track('add_to_cart', {
      currency: 'PKR',
      value: ((product.salePricePaisa || product.basePricePaisa) || 0) * quantity / 100,
      items: [{ item_id: product.sku, item_name: product.name, quantity }],
    });
    showToast(`${quantity} ${quantity === 1 ? 'item' : 'items'} added to your bag.`, 'success');
  };
  const submitReview = async (event) => {
    event.preventDefault();
    setReviewSubmitting(true);
    setReviewSubmitError('');
    try {
      await api.post(`/products/${encodeURIComponent(slug)}/reviews`, reviewForm);
      showToast('Review submitted!', 'success');
      setReviewForm({ reviewerName: '', reviewerEmail: '', rating: 5, comment: '' });
    } catch (requestError) {
      const message = requestError.response?.status === 429
        ? 'You have reached the review limit. Please try again tomorrow.'
        : requestError.response?.data?.error?.message || 'Your review could not be submitted. Please try again.';
      setReviewSubmitError(message);
      showToast(message, 'error');
    } finally {
      setReviewSubmitting(false);
    }
  };
  const price = product.salePricePaisa || product.basePricePaisa;
  const onSale = product.salePricePaisa && product.salePricePaisa < product.basePricePaisa;
  const categoryLabel = String(product.category || '').replace(/-/g, ' ');
  const isCustomOrder = Boolean(product.isCustomizable || product.isMadeToOrder);
  const hasAlternateImage = product.images?.length > 1 || (product.imageFront && product.imageBack && product.imageFront !== product.imageBack);
  const accordion = 'group border-t border-ink/15 py-5';
  const accordionSummary = 'flex cursor-pointer list-none items-center justify-between text-[1.0625rem] font-semibold';
  const siteUrl = getSiteUrl();
  const productDescriptionText = product.description?.trim().length >= 80
    ? product.description.trim()
    : `${product.name} is listed in ${categoryLabel} in the ZAVIKOO catalog. Review the current price, listed colours and sizes, and available stock for this item.`;
  const productDescription = [
    productDescriptionText,
    `View the current price, listed colours and sizes, and stock for ${product.name} from ZAVIKOO Custom Atelier.`,
  ].filter(Boolean).join(' ');
  const productFaqs = [
    { question: `What details are listed for ${product.name}?`, answer: productDescriptionText },
    { question: `Which sizes are listed for ${product.name}?`, answer: product.sizes?.length ? `The product page currently lists these sizes: ${product.sizes.join(', ')}.` : 'Check the product page for currently available sizes or contact the studio with your question.' },
    { question: `How can I ask about delivery for ${product.name}?`, answer: 'Confirm delivery coverage, charges, and expected timing for your address with the studio before placing an order.' },
  ];

  return (
    <div>
      <Seo
        title={`${product.name} | ZAVIKOO`}
        description={productDescription}
        image={/^https?:\/\//i.test(product.imageFront || '') ? product.imageFront : undefined}
        jsonLd={[
          productJsonLd({ ...product, description: productDescriptionText }, siteUrl, reviews, reviewSummary),
          faqJsonLd(productFaqs),
        ]}
      />
      <section className="page pb-16 pt-8 md:pt-12">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, { label: product.name }]} />
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="relative bg-[#e0ded5]">
              <img src={imageSide === 'front' ? (product.imageFront || product.image) : (product.imageBack || product.image)} alt={productImageAlt(product, imageSide, selectedColor)} className="aspect-[4/5] w-full object-cover transition-opacity duration-500" />
              {hasAlternateImage && (
                <button type="button" onClick={() => setImageSide((side) => side === 'back' ? 'front' : 'back')} className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center border border-ink/20 bg-chalk/90 text-lg text-cargo shadow-soft transition hover:bg-cargo hover:text-chalk" aria-label={`Show ${imageSide === 'back' ? 'frontside' : 'backside'} image`}>
                  {imageSide === 'back' ? '→' : '←'}
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="text-[0.9375rem] capitalize text-stone">{categoryLabel}</p>
            <h1 className="display-l mt-2">{product.name}</h1>
            <div className="mt-6 flex items-baseline gap-4">
              <span className="price-text text-[1.75rem] tabular-nums text-cargo">{formatPrice(price)}</span>
              {onSale && <span className="price-text-secondary text-[1.0625rem] tabular-nums text-stone line-through">{formatPrice(product.basePricePaisa)}</span>}
            </div>
            <a href="#product-reviews" className="mt-3 inline-flex items-center gap-2 text-[0.9375rem] text-stone transition hover:text-cargo">
              {reviewSummary.count ? (
                <>
                  <span className="flex gap-0.5 text-brass-deep" aria-label={`${reviewSummary.averageRating.toFixed(1)} out of 5 stars`}>
                    {[1, 2, 3, 4, 5].map((n) => <IconStar key={n} className="h-4 w-4" filled={n <= Math.round(reviewSummary.averageRating)} />)}
                  </span>
                  <span>{reviewSummary.averageRating.toFixed(1)}</span>
                </>
              ) : <span>No reviews yet</span>}
              <span>({reviewSummary.count} {reviewSummary.count === 1 ? 'review' : 'reviews'})</span>
            </a>

            <p className="mt-7 max-w-prose text-[1.0625rem] leading-8 text-stone">{productDescriptionText}</p>

            <div className="mt-9 space-y-8 border-t border-ink/15 pt-9">
              <fieldset>
                <legend className="mb-3 text-[0.9375rem] font-semibold">Colour <span className="ml-1 font-normal text-stone">{selectedColor}</span></legend>
                <div className="flex flex-wrap gap-2.5">
                  {product.colors.map((color) => (
                    <button key={color} type="button" aria-pressed={selectedColor === color} onClick={() => setSelectedColor(color)} className="chip">{color}</button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="sr-only">Size</legend>
                <div className="mb-3 flex items-baseline justify-between text-[0.9375rem] font-semibold">
                  <span>Size <span className="ml-1 font-normal text-stone">{selectedSize}</span></span>
                  <Link to="/size-guide" className="text-[0.875rem] font-normal text-stone underline underline-offset-4 hover:text-cargo">Size guide</Link>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {product.sizes.map((size) => (
                    <button key={size} type="button" aria-pressed={selectedSize === size} onClick={() => setSelectedSize(size)} className="chip min-w-[3.25rem]">{size}</button>
                  ))}
                </div>
              </fieldset>

              <div>
                <p className="mb-3 text-[0.9375rem] font-semibold">Quantity</p>
                <div className="inline-flex items-center border border-ink/25">
                  <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="grid h-12 w-12 place-items-center transition hover:bg-cargo hover:text-chalk"><IconMinus /></button>
                  <span className="min-w-[3.25rem] text-center font-semibold tabular-nums" aria-live="polite">{quantity}</span>
                  <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => Math.min(20, value + 1))} className="grid h-12 w-12 place-items-center transition hover:bg-cargo hover:text-chalk"><IconPlus /></button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={handleAddToCart} className="btn btn-primary flex-1">Add to bag</button>
                <Link to="/customize" className="btn btn-secondary flex-1">Customize a piece</Link>
              </div>
            </div>

            <div className="mt-10 border-b border-ink/15">
              <details className={accordion} open>
                <summary className={accordionSummary}>Product details <IconChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
                <dl className="mt-5 grid gap-5 text-[0.9375rem] sm:grid-cols-2">
                  <div><dt className="font-semibold">Material</dt><dd className="mt-1 text-stone">{product.material || 'See product description'}</dd></div>
                  <div><dt className="font-semibold">SKU</dt><dd className="mt-1 text-stone">{product.sku}</dd></div>
                  {product.careInstructions && <div className="sm:col-span-2"><dt className="font-semibold">Care instructions</dt><dd className="mt-1 whitespace-pre-line text-stone">{product.careInstructions}</dd></div>}
                </dl>
              </details>
              <details className={accordion}>
                <summary className={accordionSummary}>Shipping information <IconChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
                <ul className="mt-5 space-y-3 text-[0.9375rem] leading-7 text-stone">
                  <li>Free delivery all over Pakistan, usually in about 5–7 working days after order confirmation. Cash on Delivery is available.</li>
                </ul>
                <Link to="/shipping-policy" className="link-line mt-5">Read our shipping policy</Link>
              </details>
              <p className="border-t border-ink/15 py-5 text-[0.9375rem] leading-7 text-stone">
                {isCustomOrder
                  ? <>Custom items are made for you and cannot be returned or exchanged for change of mind. We correct errors or defects on our side. <Link className="underline underline-offset-4" to="/returns-exchanges">Read the policy</Link></>
                  : <>Exchange within 7 days for size or colour. The customer pays exchange delivery. <Link className="underline underline-offset-4" to="/returns-exchanges">Returns &amp; exchanges</Link></>}
              </p>
            </div>
            <section aria-labelledby="product-questions-title" className="mt-10 border-t border-ink/15 pt-8">
              <h2 id="product-questions-title" className="font-display text-2xl">Questions about this product</h2>
              <div className="mt-3 divide-y divide-ink/15">
                {productFaqs.map(({ question, answer }) => (
                  <details key={question} className="py-4">
                    <summary className="cursor-pointer font-semibold">{question}</summary>
                    <p className="mt-3 max-w-prose leading-7 text-stone">{answer}</p>
                  </details>
                ))}
              </div>
              <nav aria-label="Related product information" className="mt-6 flex flex-wrap gap-x-6 gap-y-3">
                <Link to={`/categories/${product.category}`} className="link-line">Browse {categoryLabel}</Link>
                {product.collections?.map((collection) => <Link key={collection.slug} to={`/collections/${collection.slug}`} className="link-line">Explore {collection.name}</Link>)}
                <Link to="/size-guide" className="link-line">Read the size guide</Link>
                {product.isCustomizable && <Link to="/customize" className="link-line">Customize a garment</Link>}
              </nav>
            </section>
          </div>
        </div>
      </section>

      <section id="product-reviews" className="scroll-mt-28 border-y border-ink/10 bg-chalk" aria-labelledby="product-reviews-title">
        <div className="page grid gap-14 py-16 md:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">
          <div>
            <h2 id="product-reviews-title" className="display-m">Customer reviews</h2>
            <div className="mt-6 flex items-center gap-4">
              <span className="font-display text-[3.5rem] leading-none">{reviewSummary.count ? reviewSummary.averageRating.toFixed(1) : '—'}</span>
              <span className="flex gap-0.5 text-brass-deep" aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <IconStar key={n} className="h-5 w-5" filled={reviewSummary.count > 0 && n <= Math.round(reviewSummary.averageRating)} />)}</span>
            </div>
            <form onSubmit={submitReview} className="mt-8 max-w-xl space-y-4 border border-ink/15 bg-paper p-5 md:p-6">
              <h3 className="font-display text-[1.6rem]">Write a review</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="field-label" htmlFor="review-name">Your name</label>
                  <input id="review-name" autoComplete="name" required minLength={2} maxLength={100} value={reviewForm.reviewerName} onChange={(event) => setReviewForm({ ...reviewForm, reviewerName: event.target.value })} className="field" /></div>
                <div><label className="field-label" htmlFor="review-email">Email <span className="font-normal text-stone">(not shown publicly)</span></label>
                  <input id="review-email" type="email" autoComplete="email" required maxLength={191} value={reviewForm.reviewerEmail} onChange={(event) => setReviewForm({ ...reviewForm, reviewerEmail: event.target.value })} className="field" /></div>
              </div>
              <fieldset>
                <legend className="field-label">Your rating</legend>
                <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Choose a rating from one to five stars">
                  {[1, 2, 3, 4, 5].map((rating) => {
                    const active = reviewForm.rating >= rating;
                    return (
                      <button
                        key={rating}
                        type="button"
                        role="radio"
                        aria-checked={reviewForm.rating === rating}
                        aria-label={`${rating} ${rating === 1 ? 'star' : 'stars'}`}
                        onClick={() => setReviewForm({ ...reviewForm, rating })}
                        className={`grid h-9 w-9 place-items-center rounded-full transition ${active ? 'text-[#c79a35] drop-shadow-[0_0_8px_rgba(199,154,53,0.65)]' : 'text-stone/45 hover:text-[#b98d2f]'}`}
                      >
                        <IconStar className="h-6 w-6" filled={active} />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div><label className="field-label" htmlFor="review-comment">Your review</label>
                <textarea id="review-comment" required minLength={5} maxLength={3000} rows={4} value={reviewForm.comment} onChange={(event) => setReviewForm({ ...reviewForm, comment: event.target.value })} className="field" /></div>
              <button type="submit" disabled={reviewSubmitting} className="btn btn-primary">{reviewSubmitting ? 'Submitting…' : 'Submit review'}</button>
            </form>
          </div>
          <div>
            {reviewsLoading && <p className="text-stone" aria-live="polite">Loading reviews…</p>}
            {!reviewsLoading && reviewsLoadError && <p role="alert" className="notice-error">{reviewsLoadError}</p>}
            {!reviewsLoading && !reviews.length && !reviewsLoadError && <p className="border-t border-ink/15 pt-6 text-stone">Reviews will appear here after they have been approved by our team.</p>}
            <div className="divide-y divide-ink/15 border-t border-ink/15">
              {visibleReviews.map((review) => (
                <article key={review.id} className="py-8">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-body text-[1.0625rem] font-semibold tracking-normal">{review.reviewerName}</h3>
                      <p className="mt-1 text-[0.875rem] text-stone">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className="flex gap-0.5 text-brass-deep" role="img" aria-label={`${review.rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((n) => <IconStar key={n} className="h-4 w-4" filled={n <= review.rating} />)}</span>
                  </div>
                  <p className="mt-4 max-w-prose whitespace-pre-line text-[1rem] leading-7 text-stone">{review.comment}</p>
                </article>
              ))}
            </div>
            {reviewPageCount > 1 && (
              <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Customer reviews pagination">
                <button
                  type="button"
                  disabled={reviewPage === 1}
                  onClick={() => setReviewPage((page) => Math.max(1, page - 1))}
                  className="border border-ink/15 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Previous reviews page"
                >
                  Previous
                </button>
                {Array.from({ length: reviewPageCount }, (_, index) => index + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setReviewPage(page)}
                    className={`min-w-10 border px-3 py-2 text-sm ${reviewPage === page ? 'border-cargo bg-cargo text-sand' : 'border-ink/15'}`}
                    aria-label={`Reviews page ${page}`}
                    aria-current={reviewPage === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={reviewPage === reviewPageCount}
                  onClick={() => setReviewPage((page) => Math.min(reviewPageCount, page + 1))}
                  className="border border-ink/15 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Next reviews page"
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="page py-16 md:py-24">
          <h2 className="display-m mb-10">Related pieces</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6">
            {relatedProducts.map((item) => <ProductCard key={item.slug} product={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
