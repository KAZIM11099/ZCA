import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard.jsx';
import { Breadcrumbs, PageHead } from '../components/PageHead.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { IconArrow } from '../components/Icons.jsx';
import { api, getData } from '../lib/api.js';
import { Seo } from '../components/Seo.jsx';
import { collectionJsonLd, getSiteUrl } from '../lib/jsonld.js';
import { productImageAlt } from '../components/ImageAlt.jsx';

const collectionImages = ['/custom-teaser-tshirt.png'];
const genderImages = {
  men: '/custom-teaser-tshirt.png',
  women: '/custom-teaser-tshirt.png',
  kids: '/custom-teaser-tshirt.png',
};

function getSlidePositions(length, activeIndex = 0) {
  return Array.from({ length }, (_, index) => {
    let position = index - activeIndex;
    if (position > length / 2) position -= length;
    if (position < -(length / 2)) position += length;
    return position;
  });
}

function CollectionRunwayCarousel({ collectionName, collectionSlug, carouselItems = [] }) {
  const slides = carouselItems.slice(0, 10).map((item) => ({
    id: `carousel-${item.id}`,
    image: item.modelImage,
    product: {
      id: item.id,
      productId: item.productId,
      image: item.productImage,
      slug: item.product?.slug || item.productSlug,
      name: item.title,
      category: item.detail,
      description: item.title,
    },
    title: item.title,
    detail: item.detail || collectionName,
  }));
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [slidePositions, setSlidePositions] = useState(() => getSlidePositions(slides.length));
  const [isAnimating, setIsAnimating] = useState(false);
  const [transitionsEnabled, setTransitionsEnabled] = useState(true);

  useEffect(() => {
    setActiveIndex(0);
    setSlidePositions(getSlidePositions(slides.length));
    setSelectedProduct(null);
    setPaused(false);
  }, [slides.length, carouselItems.length, collectionSlug]);

  useEffect(() => {
    if (paused || slides.length < 2 || isAnimating) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => {
        const nextIndex = (current + 1) % slides.length;
        setSlidePositions(getSlidePositions(slides.length, nextIndex));
        return nextIndex;
      });
      setIsAnimating(true);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [activeIndex, isAnimating, paused, slides.length]);

  useEffect(() => {
    if (!isAnimating) return undefined;
    const timer = window.setTimeout(() => {
      setTransitionsEnabled(false);
      requestAnimationFrame(() => {
        setTransitionsEnabled(true);
        setIsAnimating(false);
      });
    }, 720);
    return () => window.clearTimeout(timer);
  }, [activeIndex, isAnimating, slides.length]);

  const move = (offset) => {
    if (isAnimating) return;
    const nextIndex = (activeIndex + offset + slides.length) % slides.length;
    setActiveIndex(nextIndex);
    setSlidePositions(getSlidePositions(slides.length, nextIndex));
    setIsAnimating(true);
  };

  const goTo = (index) => {
    const rawOffset = index - activeIndex;
    const offset = rawOffset > slides.length / 2
      ? rawOffset - slides.length
      : rawOffset < -(slides.length / 2)
        ? rawOffset + slides.length
        : rawOffset;
    if (offset) move(offset);
  };

  const selectSlide = (slide, index) => {
    if ((slidePositions[index] || 0) !== 0) {
      goTo(index);
      return;
    }
    if (!slide.product) return;
    setSelectedProduct(slide.product);
    setPaused(true);
  };

  return (
    <section className="runway-carousel border-t-[10px] border-paper bg-paper pb-6 pt-[60px] text-ink md:pb-8 md:pt-[60px]" aria-label={`${collectionName} runway collection`}>
      <div className="page">
        <div className="mb-[5px] flex items-end justify-between gap-4 md:mb-[5px]">
          <div>
            <p className="kicker">{collectionName} edit</p>
            <h2 className="mt-2 text-4xl text-ink md:text-5xl">Try the look.</h2>
            <p className="mt-3 text-sm text-ink/65">{slides.length} {slides.length === 1 ? 'look' : 'looks'}, styled head to toe. Tap a pin to see the piece.</p>
          </div>
          <button type="button" onClick={() => setPaused((current) => !current)} className="border border-ink/35 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-ink/80 transition hover:border-ink hover:text-ink" aria-label={paused ? 'Play runway carousel' : 'Pause runway carousel'}>
            {paused ? 'Play' : 'Pause'}
          </button>
        </div>

        <div className="relative">
          <div className="runway-carousel__viewport relative h-[40rem] overflow-hidden sm:h-[50rem]" style={{ perspective: '1000px' }}>
            <div className="pointer-events-none absolute inset-x-0 bottom-8 h-px bg-ink/20" />
            <div className={`runway-carousel__track absolute inset-0 transition-opacity duration-700 ${selectedProduct ? 'pointer-events-none opacity-100' : 'opacity-100'}`} style={{ transformStyle: 'preserve-3d' }}>
              {slides.map((slide, index) => (
                <button
                  type="button"
                  key={slide.id}
                  onClick={() => selectSlide(slide, index)}
                  className={`runway-carousel__slide group absolute left-1/2 top-1/2 w-[18rem] -translate-x-1/2 -translate-y-1/2 text-left ${transitionsEnabled ? 'transition-all duration-700' : 'transition-none'} sm:w-[25rem]`}
                  style={{
                    transform: (() => {
                      const position = slidePositions[index] || 0;
                      const angle = position * 28;
                      const radians = (angle * Math.PI) / 180;
                      const radius = 38;
                      const depth = Math.cos(radians) * radius - radius;
                      const x = Math.sin(radians) * radius;
                      const scale = position === 0 ? 1 : Math.max(0.58, 0.84 - Math.abs(position) * 0.08);
                      const spotlightShift = selectedProduct && (slidePositions[index] || 0) === 0 ? -16 : 0;
                      const spotlightScale = selectedProduct && (slidePositions[index] || 0) === 0 ? 1.12 : scale;
                      return `translate(-50%, -50%) translateX(${x + spotlightShift}rem) translateY(-4.5rem) translateZ(${depth}rem) rotateY(${-angle}deg) scale(${spotlightScale})`;
                    })(),
                    zIndex: slides.length - Math.abs(slidePositions[index] || 0),
                    opacity: selectedProduct
                      ? selectedProduct.id === slide.product?.id ? 1 : 0
                      : Math.abs(slidePositions[index] || 0) > 2 ? 0 : (slidePositions[index] || 0) === 0 ? 1 : Math.abs(slidePositions[index] || 0) >= 2 ? 0.28 : 0.58,
                    filter: (slidePositions[index] || 0) === 0 ? 'none' : Math.abs(slidePositions[index] || 0) >= 2 ? 'blur(5px)' : 'blur(1.5px)',
                  }}
                  aria-label={`Show ${slide.title}`}
                >
                  <div
                    className={`runway-image relative aspect-[3/4] ${(slidePositions[index] || 0) === 0 ? 'runway-image--spotlight' : ''}`}
                  >
                    <img src={slide.image} alt={productImageAlt(slide.product)} className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_1.25rem_0.9rem_rgb(20_22_15_/_0.2)] transition duration-700 group-hover:scale-105" />
                    {(slidePositions[index] || 0) === 0 && (
                      <span
                        className="runway-image__shine"
                        aria-hidden="true"
                        style={{
                          WebkitMaskImage: `url("${slide.image}")`,
                          maskImage: `url("${slide.image}")`,
                          WebkitMaskPosition: 'center',
                          maskPosition: 'center',
                          WebkitMaskRepeat: 'no-repeat',
                          maskRepeat: 'no-repeat',
                          WebkitMaskSize: 'contain',
                          maskSize: 'contain',
                        }}
                      />
                    )}
                  </div>
                  <div
                    className={`-mt-10 pt-1 text-center transition-all duration-700 ease-out sm:-mt-16 sm:pt-1 ${transitionsEnabled ? '' : 'transition-none'}`}
                    style={{
                      opacity: selectedProduct
                        ? selectedProduct.id === slide.product?.id ? 1 : 0
                        : (slidePositions[index] || 0) === 0 ? 1 : 0,
                      transform: (slidePositions[index] || 0) === 0 ? 'translateY(0)' : 'translateY(0.5rem)',
                    }}
                  >
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-brass-deep">{slide.detail}</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{slide.title}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className={`absolute right-4 top-1/2 z-30 h-[600px] w-[min(34rem,calc(100%-2rem))] -translate-y-1/2 bg-chalk p-4 text-ink shadow-lift transition-all duration-700 sm:right-8 sm:p-5 ${selectedProduct ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-[120%] opacity-0'}`}>
              {selectedProduct && (
                <>
                  <button type="button" onClick={() => { setSelectedProduct(null); setPaused(false); }} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center border border-ink/25 bg-paper text-2xl font-semibold leading-none text-ink shadow-soft transition hover:bg-ink hover:text-chalk" aria-label="Close product spotlight">×</button>
                  <div className="h-[360px] overflow-hidden bg-chalk sm:h-[380px]">
                    <img src={selectedProduct.image} alt={productImageAlt(selectedProduct)} className="h-full w-full object-contain p-2" />
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-brass-deep">{selectedProduct.category || 'Menswear'}</p>
                  <h3 className="mt-1 font-display text-2xl leading-tight">{selectedProduct.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-stone">{selectedProduct.description || 'A considered piece from the mens edit, made for everyday wear.'}</p>
                  {selectedProduct.slug ? (
                    <Link to={`/product/${selectedProduct.slug}`} className="btn btn-primary mt-3 w-full">Shop now</Link>
                  ) : (
                    <span className="mt-3 block w-full cursor-not-allowed bg-ink/15 px-4 py-3 text-center text-sm font-bold text-ink/50">Product link unavailable</span>
                  )}
                </>
              )}
            </div>
          </div>
          <div className={`transition-opacity duration-500 ${selectedProduct ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
            {slides.length > 1 && (
              <>
                <button type="button" onClick={() => move(-1)} className="absolute left-0 top-1/2 z-20 -translate-y-1/2 border border-ink/40 bg-paper/80 p-3 text-xl text-ink transition hover:border-ink" aria-label="Previous runway look">←</button>
                <button type="button" onClick={() => move(1)} className="absolute right-0 top-1/2 z-20 -translate-y-1/2 border border-ink/40 bg-paper/80 p-3 text-xl text-ink transition hover:border-ink" aria-label="Next runway look">→</button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          {slides.map((slide, index) => (
            <button type="button" key={slide.id} onClick={() => goTo(index)} className={`h-1 transition-all duration-500 ${index === activeIndex ? 'w-10 bg-brass-deep' : 'w-5 bg-ink/30 hover:bg-ink/70'}`} aria-label={`Go to runway look ${index + 1}`} />
          ))}
          <span className="ml-auto text-xs font-bold tracking-[0.18em] text-ink/60">{String(activeIndex + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}</span>
        </div>
      </div>
    </section>
  );
}

export default function CollectionsPage() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [carouselItems, setCarouselItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const collection = collections.find((entry) => entry.slug === slug);
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'featured';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const requests = [getData('/collections')];
    if (slug) {
      requests.push(getData('/products', { collection: slug, pageSize: 48 }));
      requests.push(getData('/carousel-images', { collection: slug }));
    }
    Promise.all(requests).then(([available, result, runwayItems]) => {
      if (!active) return;
      setCollections(available);
      setProducts(result?.items || []);
      setCarouselItems(runwayItems || []);
    }).catch(() => {
      if (active) {
        setCarouselItems([]);
        setError('Collections could not be loaded. Please try again.');
      }
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [slug]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value) next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = products.filter((product) => !query || [
      product.name, product.description, product.category, product.sku,
    ].some((field) => String(field || '').toLowerCase().includes(query)));
    return filtered.sort((first, second) => {
      if (sort === 'newest') return new Date(second.createdAt || 0) - new Date(first.createdAt || 0);
      if (sort === 'price-asc') return (first.salePricePaisa || first.basePricePaisa) - (second.salePricePaisa || second.basePricePaisa);
      if (sort === 'price-desc') return (second.salePricePaisa || second.basePricePaisa) - (first.salePricePaisa || first.basePricePaisa);
      if (sort === 'name') return first.name.localeCompare(second.name);
      return Number(second.isFeatured) - Number(first.isFeatured);
    });
  }, [products, search, sort]);

  const collectionIndex = collections.findIndex((entry) => entry.slug === slug);
  const heroImage = collection?.bannerImageUrl
    ? `${api.defaults.baseURL.replace(/\/$/, '')}${collection.bannerImageUrl}`
    : genderImages[slug] || collectionImages[(Math.max(collectionIndex, 0)) % collectionImages.length];
  const showCollectionShopGrid = false;

  return (
    <>
      <Seo
        title={collection ? `${collection.name} Collection | ZAVIKOO` : undefined}
        description={collection?.description || undefined}
        jsonLd={slug && collection ? [collectionJsonLd(collection, products, getSiteUrl())] : []}
      />
      {collection ? (
        <section className="on-dark relative isolate bg-cargo text-chalk">
          <div className="photo absolute inset-0 -z-10"><img src={heroImage} alt="" aria-hidden="true" className="absolute inset-0" /></div>
          <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-cargo/85 via-cargo/45 to-cargo/10" />
          <div className="page flex min-h-[26rem] flex-col justify-between pb-12 pt-10 md:min-h-[34rem] md:pb-16 md:pt-14">
            <Breadcrumbs dark items={[{ label: 'Home', to: '/' }, { label: 'Collections', to: '/collections' }, { label: collection.name }]} />
            <div className="max-w-2xl">
              <h1 className="display-xl text-chalk">{collection.name}</h1>
              <p className="mt-6 max-w-lg text-[1.0625rem] leading-8 text-chalk/85">{collection.description}</p>
              <p className="mt-6 text-[0.9375rem] text-sand/80">{loading ? 'Loading pieces…' : `${products.length} ${products.length === 1 ? 'piece' : 'pieces'}`}</p>
            </div>
          </div>
        </section>
      ) : (
        <PageHead
          title="The collections"
          intro="Distinct edits for different people and moods. Explore the stories, then find your piece."
          crumbs={[{ label: 'Home', to: '/' }, { label: 'Collections' }]}
        >
          <Link to="/shop" className="btn btn-secondary">Shop all pieces</Link>
        </PageHead>
      )}

      {slug && collection && (
        carouselItems.length > 0 ? (
          <CollectionRunwayCarousel carouselItems={carouselItems} collectionName={collection.name} collectionSlug={collection.slug} />
        ) : (
          <section className="launching-soon border-t-[10px] border-paper bg-paper px-6 py-24 text-center text-ink md:py-32" aria-label={`${collection.name} collection launching soon`}>
            <p className="launching-soon__title font-display text-5xl leading-none tracking-tight md:text-7xl">
              Launching Soon
              <span className="launching-soon__dots ml-2 inline-flex w-[1.4em] align-baseline text-left" aria-hidden="true">
                <span>.</span>
                <span>.</span>
                <span>.</span>
              </span>
            </p>
          </section>
        )
      )}

      <section className="page pb-24 pt-10 md:pb-32 md:pt-14">
        {error && <p role="alert" className="notice-error mb-8">{error}</p>}

        {slug && !loading && !collection && !error && (
          <EmptyState title="Collection not found" action={<Link to="/collections" className="btn btn-secondary">Browse all collections</Link>}>
            This collection may have moved or is not currently available.
          </EmptyState>
        )}

        {!slug && !loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((entry, index) => (
              <Link key={entry.slug} to={`/collections/${entry.slug}`} className="group relative block">
                <div className="photo aspect-[3/4]">
                  <img src={entry.bannerImageUrl ? `${api.defaults.baseURL.replace(/\/$/, '')}${entry.bannerImageUrl}` : genderImages[entry.slug] || collectionImages[index % collectionImages.length]} alt={productImageAlt({ name: `${entry.name} collection preview` })} loading="lazy" className="absolute inset-0" />
                  <div aria-hidden="true" className="absolute inset-0 z-10 bg-gradient-to-t from-cargo/80 via-cargo/10 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 z-20 p-6 text-chalk sm:p-8">
                  <h2 className="font-display text-[2.4rem] leading-none text-chalk sm:text-[2.9rem]">{entry.name}</h2>
                  {entry.description && <p className="mt-3 max-w-xs text-[0.9375rem] leading-6 text-chalk/80">{entry.description}</p>}
                  <span className="mt-5 inline-flex items-center gap-2 border-b border-chalk/60 pb-1 text-[0.9375rem] font-medium transition-all duration-base group-hover:gap-3.5 group-hover:border-chalk">Explore collection <IconArrow /></span>
                </div>
              </Link>
            ))}
            {!collections.length && <p className="text-stone">No collections are available yet.</p>}
          </div>
        )}

        {slug && collection && showCollectionShopGrid && (
          <>
            <div className="flex flex-col gap-4 border-y border-ink/12 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[0.9375rem] text-stone" aria-live="polite">{loading ? 'Loading pieces…' : `${visibleProducts.length} ${visibleProducts.length === 1 ? 'piece' : 'pieces'} in this edit`}</p>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <label className="sr-only" htmlFor="collection-search">Search this collection</label>
                <input id="collection-search" type="search" value={search} onChange={(event) => updateParam('search', event.target.value)} placeholder="Search this collection" className="field min-h-11 sm:w-64" />
                <label className="sr-only" htmlFor="collection-sort">Sort collection products</label>
                <select id="collection-sort" value={sort} onChange={(event) => updateParam('sort', event.target.value)} className="field min-h-11 sm:w-52">
                  <option value="featured">Featured</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                  <option value="name">Name</option>
                </select>
              </div>
            </div>
            <div className="mt-10">
              {loading ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="skeleton aspect-[4/5]" />)}</div>
              ) : visibleProducts.length ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">{visibleProducts.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
              ) : (
                <EmptyState title="No pieces found" action={<button type="button" onClick={() => updateParam('search', '')} className="btn btn-secondary">Clear search</button>}>
                  Try another search or explore the full shop.
                </EmptyState>
              )}
            </div>
          </>
        )}
      </section>
    </>
  );
}
