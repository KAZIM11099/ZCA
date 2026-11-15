import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard.jsx';
import { IconArrow } from '../components/Icons.jsx';
import { productImageAlt } from '../components/ImageAlt.jsx';
import { api, getData } from '../lib/api.js';

const defaultHeroImages = ['/custom-teaser-tshirt.png'];
const heroImage = defaultHeroImages[0];
const collectionImages = ['/custom-teaser-tshirt.png'];
const promises = [
  { title: 'Explore the catalog', copy: 'Review the products and options currently listed in the store.', note: 'Browse available pieces' },
  { title: 'Explore custom design', copy: 'Use the design tool to arrange text or artwork and preview a garment concept.', note: 'Design tool' },
  { title: 'Custom enquiries', copy: 'Share details about a team, event, brand, or other clothing project for review.', note: 'Request a quote' },
];

const steps = [
  { title: 'Choose a blank', copy: 'Start with an oversized graphic T-shirt or a winter pullover hoodie.' },
  { title: 'Add your design', copy: 'Type a phrase or upload a PNG, JPG or WebP image.' },
  { title: 'Place it, then order', copy: 'Preview your layout, add it to your bag, and pay by Cash on Delivery.' },
];

const tees = [
  { name: 'Sand', bg: '#D8C8A4', fg: '#14160F' },
  { name: 'Olive', bg: '#4A5236', fg: '#EEE6D2' },
  { name: 'Cargo', bg: '#1F2219', fg: '#D8C8A4' },
  { name: 'Bone', bg: '#EEEBE2', fg: '#14160F' },
];

function HeroWordmark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 1000 215" preserveAspectRatio="xMidYMax meet" className="block w-full select-none">
      <text x="5" y="205" textAnchor="start" textLength="990" lengthAdjust="spacingAndGlyphs" fill="#232719" fontSize="268" fontFamily="'Saira Stencil One', Impact, 'Arial Black', sans-serif">ZAVIKOO</text>
    </svg>
  );
}

function HeroImageShift({ images }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let frame = 0;
    let active = 0;
    let transitionStarted = 0;
    let previousImage = null;
    let nextImage = null;
    let running = true;
    let firstFrame = true;

    const loadImage = (source) => new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = source;
    });

    const ease = (value) => {
      const clamped = Math.max(0, Math.min(1, value));
      return clamped * clamped * (3 - 2 * clamped);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      draw(performance.now());
    };

    const crop = (image) => {
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = width / height;
      if (sourceRatio > targetRatio) {
        const sourceWidth = image.naturalHeight * targetRatio;
        return { x: (image.naturalWidth - sourceWidth) / 2, y: 0, w: sourceWidth, h: image.naturalHeight };
      }
      const sourceHeight = image.naturalWidth / targetRatio;
      return { x: 0, y: (image.naturalHeight - sourceHeight) / 2, w: image.naturalWidth, h: sourceHeight };
    };

    const drawWaveTile = (image, column, row, columns, rows, progress) => {
      const source = crop(image);
      const tileWidth = width / columns;
      const tileHeight = height / rows;
      const left = column * tileWidth;
      const top = row * tileHeight;
      const centerX = left + tileWidth / 2;
      const centerY = top + tileHeight / 2;
      const wave = Math.sin(progress * Math.PI);
      const gap = 0.8;

      context.save();
      context.translate(centerX, centerY);
      context.rotate((column + row) % 2 ? wave * 0.24 : -wave * 0.24);
      context.scale(1 + Math.sin(progress * Math.PI) * 0.12, 1 + Math.sin(progress * Math.PI) * 0.12);
      context.translate(-centerX, -centerY);
      context.shadowColor = `rgba(10, 12, 8, ${wave * 0.32})`;
      context.shadowBlur = wave * 16;
      context.shadowOffsetY = wave * 10;
      context.drawImage(
        image,
        source.x + source.w * column / columns,
        source.y + source.h * row / rows,
        source.w / columns,
        source.h / rows,
        left - gap / 2,
        top - gap / 2,
        tileWidth + gap,
        tileHeight + gap,
      );
      context.restore();
    };

    const draw = (now) => {
      if (!width || !height || !previousImage || !nextImage) return;
      context.clearRect(0, 0, width, height);
      context.drawImage(previousImage, ...Object.values(crop(previousImage)), 0, 0, width, height);

      if (firstFrame || media.matches || awaitableImages.length < 2) {
        context.drawImage(previousImage, ...Object.values(crop(previousImage)), 0, 0, width, height);
        return;
      }

      if (!transitionStarted) transitionStarted = now;
      const elapsed = now - transitionStarted;
      const cycle = Math.min(1, elapsed / 2200);
      const columns = width < 600 ? 21 : 30;
      const rows = width < 600 ? 27 : 30;

      context.drawImage(nextImage, ...Object.values(crop(nextImage)), 0, 0, width, height);

      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const horizontalPosition = column / Math.max(1, columns - 1);
          const rowWave = Math.sin(row / Math.max(1, rows - 1) * Math.PI) * 0.055;
          const localProgress = ease((cycle - horizontalPosition * 0.72 - rowWave) / 0.28);
          if (localProgress >= 1) continue;
          context.save();
          context.globalAlpha = 1 - localProgress;
          drawWaveTile(previousImage, column, row, columns, rows, localProgress);
          context.restore();
        }
      }

      if (cycle >= 1) {
        previousImage = nextImage;
        active = (active + 1) % awaitableImages.length;
        nextImage = awaitableImages[(active + 1) % awaitableImages.length];
        transitionStarted = now + 3200;
      }
    };

    let awaitableImages = [];
    Promise.all(images.map((source) => loadImage(source).catch((imageError) => {
      console.error('Could not load a homepage hero image.', imageError);
      return null;
    }))).then((loadedImages) => {
      awaitableImages = loadedImages.filter(Boolean);
      if (!running || !awaitableImages.length) return;
      previousImage = awaitableImages[0];
      nextImage = awaitableImages[1] || awaitableImages[0];
      resize();
      firstFrame = false;
      const animate = (now) => {
        if (!running) return;
        draw(now);
        frame = window.requestAnimationFrame(animate);
      };
      frame = window.requestAnimationFrame(animate);
    }).catch(() => undefined);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    window.addEventListener('resize', resize);
    return () => {
      running = false;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    };
  }, [images]);

  return <canvas ref={canvasRef} className="hero-image-shift absolute inset-0 h-full w-full" aria-hidden="true" />;
}

function DesignStudioTeaser() {
  const [tee, setTee] = useState(tees[0]);
  const [text, setText] = useState('');
  const [manualText, setManualText] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const phrases = ['YOUR NAME', 'YOUR IDEA'];
  const shown = (text.trim() ? text : 'YOUR NAME').toUpperCase();
  const mockupImage = '/custom-teaser-tshirt.png';
  const mask = { WebkitMaskImage: `url(${mockupImage})`, maskImage: `url(${mockupImage})`, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' };

  useEffect(() => {
    if (manualText || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const phrase = phrases[phraseIndex];
    let timer;

    if (!deleting && text === phrase) {
      timer = window.setTimeout(() => setDeleting(true), 1000);
    } else if (deleting && !text) {
      timer = window.setTimeout(() => {
        setPhraseIndex((index) => (index + 1) % phrases.length);
        setDeleting(false);
      }, 250);
    } else {
      timer = window.setTimeout(() => {
        setText((current) => deleting ? current.slice(0, -1) : phrase.slice(0, current.length + 1));
      }, deleting ? 65 : 115);
    }

    return () => window.clearTimeout(timer);
  }, [deleting, manualText, phraseIndex, text]);

  return (
    <div className="relative border border-sand/15 bg-olive-deep p-5 sm:p-8">
      <div className="relative mx-auto aspect-[768/1063] w-full max-w-[26rem]" style={{ filter: 'drop-shadow(0 28px 26px rgba(0,0,0,0.45))' }}>
        <div className="absolute inset-0 transition-colors duration-slow" style={{ ...mask, backgroundColor: tee.bg }} />
        <img src={mockupImage} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-contain mix-blend-multiply" />
        <div className="absolute left-1/2 top-[38%] w-[46%] -translate-x-1/2 border border-dashed border-brass/80 px-2 py-3 text-center transition-colors duration-slow" style={{ color: tee.fg }}>
          <span className="teaser-typing stencil block break-words text-[clamp(1.1rem,3.2vw,1.85rem)] leading-[1.05]">{shown}</span>
          <span aria-hidden="true" className="absolute -bottom-1.5 -right-1.5 h-3 w-3 bg-brass" />
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <label htmlFor="teaser-text" className="mb-2 block text-[0.875rem] font-semibold text-sand">Try your own text</label>
          <input id="teaser-text" value={manualText ? text : ''} maxLength={12} onChange={(event) => { setManualText(true); setText(event.target.value); }} className="min-h-12 w-full border border-sand/30 bg-transparent px-4 text-base text-chalk placeholder:text-sand/40 focus:border-sand focus:outline-none focus:ring-2 focus:ring-brass/50" placeholder="YOUR NAME" />
        </div>
        <div role="group" aria-label="Garment colour" className="flex items-center gap-2.5">
          {tees.map((option) => (
            <button key={option.name} type="button" title={option.name} aria-label={`${option.name} colour`} aria-pressed={tee.name === option.name} onClick={() => setTee(option)} className={`h-10 w-10 border border-sand/30 transition ${tee.name === option.name ? 'ring-2 ring-brass ring-offset-2 ring-offset-olive-deep' : 'hover:border-sand'}`} style={{ backgroundColor: option.bg }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [heroSlides, setHeroSlides] = useState(defaultHeroImages);
  const [reviewIndex, setReviewIndex] = useState(0);
  const featuredCollections = [...collections]
    .sort((first, second) => first.id - second.id)
    .slice(0, 3);

  useEffect(() => {
    Promise.all([getData('/products', { featured: true, pageSize: 4 }), getData('/collections'), getData('/reviews')])
      .then(([featured, availableCollections, approvedReviews]) => {
        setFeaturedProducts(featured.items);
        setCollections(availableCollections);
        setReviews(Array.isArray(approvedReviews) ? approvedReviews : []);
      })
      .catch(() => setCatalogError('The latest collection is temporarily unavailable.'))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    let active = true;
    getData('/hero-images')
      .then((items) => {
        if (!active || !Array.isArray(items) || !items.length) return;
        const baseUrl = api.defaults.baseURL.replace(/\/$/, '');
        setHeroSlides(items.map((item) => `${baseUrl}${item.src}`));
      })
      .catch((requestError) => {
        console.error('Could not load homepage hero images; using the default images.', requestError);
      });
    return () => { active = false; };
  }, []);
  return (
    <>
      {/* Hero */}
      <section className="on-dark relative isolate overflow-hidden bg-cargo text-sand">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 translate-y-[6%] px-[1vw]">
          <HeroWordmark />
        </div>

        <div className="page grid items-center gap-12 pb-28 pt-12 sm:pb-36 md:pt-16 lg:grid-cols-12 lg:gap-10 lg:pb-[15vw] lg:pt-16 xl:pb-[13rem]">
          <div className="lg:col-span-6 lg:pr-6">
            <h1 className="hero-in text-[clamp(2.7rem,5.6vw,5.6rem)] leading-[0.98] tracking-[-0.025em] text-chalk" style={{ '--d': '120ms' }}>Oversized graphic tees and custom hoodies from Karachi.</h1>
            <p className="lede hero-in mt-8 text-sand/75" style={{ '--d': '300ms' }}>
              Shop relaxed streetwear, personalize a T-shirt or hoodie, and get free Cash on Delivery shipping across Pakistan.
            </p>
            <div className="hero-in mt-10 flex flex-wrap items-center gap-4" style={{ '--d': '460ms' }}>
              <Link to="/shop" className="btn btn-sand">Shop the collection</Link>
              <Link to="/customize" className="btn btn-outline-light">Design your own</Link>
            </div>
          </div>

          <div className="hero-fade relative lg:col-span-6 lg:col-start-7" style={{ '--d': '350ms' }}>
            <div aria-hidden="true" className="absolute -bottom-4 -right-4 hidden h-full w-full border border-brass/60 sm:block" />
            <div className="photo hero-photo relative aspect-[4/5] w-full overflow-hidden sm:aspect-[5/6] lg:aspect-auto lg:h-[min(62vh,38rem)]">
              <img src={heroSlides[0] || heroImage} alt={productImageAlt({ name: 'T-shirt mock-up' }, 'front')} fetchpriority="high" width="768" height="1063" className="absolute inset-0" />
              <HeroImageShift images={heroSlides} />
            </div>
          </div>
        </div>
      </section>

      {/* Promises */}
      <section className="relative overflow-hidden bg-[#f3efe5] py-16 md:py-24">
        <div aria-hidden="true" className="absolute left-0 top-0 h-full w-16 bg-[repeating-linear-gradient(135deg,transparent,transparent_5px,rgba(126,101,50,0.035)_5px,rgba(126,101,50,0.035)_6px)]" />
        <div className="page relative">
          <div className="mb-10 flex items-end justify-between gap-6 md:mb-12">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-brass-deep">The ZAVIKOO promise</p>
              <p className="mt-3 max-w-xl font-display text-[1.8rem] leading-tight text-cargo sm:text-[2.25rem]">Considered from first stitch to final delivery.</p>
            </div>
            <span aria-hidden="true" className="mb-2 hidden h-px w-24 bg-brass/70 md:block" />
          </div>
          <div className="grid border-y border-ink/15 md:grid-cols-3">
            {promises.map((item, index) => (
              <article key={item.title} className="promise-card group relative overflow-hidden border-b border-ink/15 px-1 py-9 last:border-b-0 md:border-b-0 md:px-9 md:py-12 first:pl-0 last:pr-0 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-ink/15">
                <div className="relative flex items-start justify-between">
                  <div className="grid h-14 w-14 place-items-center rounded-full border border-brass/60 bg-[#f8f5ed] text-cargo shadow-[0_8px_30px_rgba(35,39,25,0.07)] transition-transform duration-slow group-hover:-translate-y-1.5 group-hover:rotate-[-4deg]">
                    {index === 0 && <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-none stroke-current stroke-[1.25]" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v10H3zM14 10h3l3 3v4h-6z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>}
                    {index === 1 && <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-none stroke-current stroke-[1.25]" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.1 4.9L19 10l-4 2.9L13.8 18 12 14.2 9.1 18l-.9-5.1L4 10l4.9-2.1L12 3z"/><path d="M19 4v4M17 6h4"/></svg>}
                    {index === 2 && <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-none stroke-current stroke-[1.25]" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3.5 19c.5-3.7 2.5-5.5 5.5-5.5s5 1.8 5.5 5.5M14 14.5c3.4-.8 6 1.1 6.5 4.5"/></svg>}
                  </div>
                  <span className="font-display text-[2.75rem] leading-none text-ink/8 transition-colors duration-slow group-hover:text-brass/35">0{index + 1}</span>
                </div>
                <p className="mt-8 text-[0.67rem] font-semibold uppercase tracking-[0.19em] text-brass-deep">{item.note}</p>
                <h2 className="mt-3 max-w-[15rem] font-display text-[1.65rem] leading-[1.05] text-cargo sm:text-[1.85rem]">{item.title}</h2>
                <p className="mt-4 max-w-[18rem] text-[0.93rem] leading-7 text-stone">{item.copy}</p>
                <span aria-hidden="true" className="mt-7 block h-px w-9 bg-brass transition-all duration-slow group-hover:w-20" />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Selected pieces */}
      <section className="section">
        <div className="page">
          <div className="mb-12 flex items-end justify-between gap-6">
            <h2 className="display-l max-w-xl">Selected pieces</h2>
            <Link to="/shop" className="link-line hidden shrink-0 sm:inline-flex">View all pieces <IconArrow /></Link>
          </div>
          {catalogError && <p role="status" className="notice-warn mb-6">{catalogError}</p>}
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {!loaded && [1, 2, 3, 4].map((key) => <div key={key}><div className="skeleton aspect-[4/5]" /><div className="skeleton mt-5 h-5 w-2/3" /><div className="skeleton mt-3 h-4 w-1/3" /></div>)}
            {featuredProducts.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>
          <Link to="/shop" className="btn btn-secondary mt-12 w-full sm:hidden">View all pieces</Link>
        </div>
      </section>

      {/* Customise */}
      <section className="on-dark bg-cargo text-sand">
        <div className="page section grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24">
          <DesignStudioTeaser />
          <div>
            <h2 className="display-l text-chalk">Put your name on it.</h2>
            <p className="lede mt-6 text-sand/75">
              Pick a blank, choose a colour and size, then add your text or artwork. See it on the front and back before you order.
            </p>
            <ol className="mt-10 border-t border-sand/15">
              {steps.map((step, index) => (
                <li key={step.title} className="grid grid-cols-[2.25rem_1fr] gap-4 border-b border-sand/15 py-6">
                  <span className="font-display text-[1.5rem] leading-none text-brass">{index + 1}</span>
                  <div>
                    <h3 className="font-body text-[1.0625rem] font-semibold tracking-normal text-chalk">{step.title}</h3>
                    <p className="mt-1.5 text-[0.9375rem] leading-7 text-sand/70">{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link to="/customize" className="btn btn-sand">Start designing</Link>
              <Link to="/custom-quote" className="btn btn-outline-light">Request a quote</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Collections */}
      {collections.length > 0 && (
        <section className="section">
          <div className="page">
            <div className="mb-14 flex flex-wrap items-end justify-between gap-6">
              <div>
                <h2 className="display-l">Collections</h2>
                <p className="lede mt-5">Distinct moods, considered details. Find the edit that is cut for you.</p>
              </div>
              <Link to="/collections" className="link-line hidden shrink-0 sm:inline-flex">All collections <IconArrow /></Link>
            </div>
            <div className="grid items-start gap-5 md:grid-cols-3">
              {featuredCollections.map((collection, index) => (
                <Link key={collection.slug} to={`/collections/${collection.slug}`} className="group relative block md:[&:nth-child(3n+2)]:mt-14 md:[&:nth-child(3n)]:mt-28">
                  <div className="photo aspect-[3/4]">
                    <img src={collection.bannerImageUrl ? `${api.defaults.baseURL.replace(/\/$/, '')}${collection.bannerImageUrl}` : collectionImages[index % collectionImages.length]} alt={productImageAlt({ name: `${collection.name} collection preview` })} loading="lazy" className="absolute inset-0" />
                    <div aria-hidden="true" className="absolute inset-0 z-10 bg-gradient-to-t from-cargo/80 via-cargo/10 to-transparent" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-20 p-6 text-chalk sm:p-8">
                    <h3 className="font-display text-[2.4rem] leading-none text-chalk sm:text-[2.9rem]">{collection.name}</h3>
                    {collection.description && <p className="mt-3 max-w-xs text-[0.9375rem] leading-6 text-chalk/80">{collection.description}</p>}
                    <span className="mt-5 inline-flex items-center gap-2 border-b border-chalk/60 pb-1 text-[0.9375rem] font-medium transition-all duration-base group-hover:gap-3.5 group-hover:border-chalk">Explore <IconArrow /></span>
                  </div>
                </Link>
              ))}
            </div>
            <Link to="/collections" className="btn btn-secondary mt-12 w-full sm:hidden">All collections</Link>
          </div>
        </section>
      )}

      {/* Customer words */}
      <section aria-labelledby="customer-notes-title" className="overflow-hidden border-y border-ink/10 bg-[#f1ede3]">
        <div className="page section">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div>
              <p className="mb-4 text-[0.75rem] font-semibold uppercase tracking-[0.22em] text-brass-deep">From our community</p>
              <h2 id="customer-notes-title" className="display-m max-w-lg">Kind words, honestly shared.</h2>
            </div>
          </div>

          {reviews.length ? (
            <div className="mt-12">
              <div className="review-marquee overflow-hidden">
                <div className="review-marquee-track flex w-max">
                  {[0, 1].map((copy) => (
                    <div key={copy} className="flex shrink-0 gap-5 pr-5" aria-hidden={copy === 1}>
                      {reviews.map((review) => (
                        <article key={`${copy}-${review.id}`} className="relative flex h-[18rem] w-[19rem] shrink-0 flex-col overflow-hidden border border-ink/12 bg-chalk p-6 shadow-[0_18px_45px_rgba(35,39,25,.07)] transition-transform duration-500 hover:-translate-y-2 sm:w-[21rem] sm:p-7">
                          <div aria-hidden="true" className="absolute right-0 top-0 h-16 w-16 border-b border-l border-brass/25" />
                          <div aria-hidden="true" className="absolute right-3 top-3 font-display text-[2rem] leading-none text-brass/25">Z</div>
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex gap-0.5 text-brass-deep" aria-label={`${review.rating} out of 5 stars`}>
                              {Array.from({ length: 5 }, (_, star) => <span key={star} className="text-sm">{star < review.rating ? '★' : '☆'}</span>)}
                            </div>
                            <span className="text-[.58rem] uppercase tracking-[.16em] text-stone">Verified</span>
                          </div>
                          <blockquote className="my-7 flex-1 overflow-hidden font-display text-[1.55rem] leading-[1.18] text-cargo">“{review.comment}”</blockquote>
                          <footer className="border-t border-ink/12 pt-4">
                            <p className="text-[.92rem] font-semibold text-cargo">{review.reviewerName}</p>
                            <p className="mt-1 truncate text-[.72rem] uppercase tracking-[.1em] text-stone">{review.product?.name || 'ZAVIKOO customer'}</p>
                          </footer>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              {reviews.length > 1 && (
                <div className="mt-7 text-center font-display text-[.92rem] tabular-nums text-stone" aria-label={`Review ${reviewIndex + 1} of ${reviews.length}`}>
                  {String(reviewIndex + 1).padStart(2, '0')} <span className="text-brass-deep">/</span> {String(reviews.length).padStart(2, '0')}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-12 border-t border-ink/15 py-8 text-stone">Approved customer stories will appear here.</p>
          )}
        </div>
      </section>

      {/* Closing call */}
      <section className="on-dark bg-olive text-sand">
        <div className="page grid items-end gap-10 py-20 md:grid-cols-[1.3fr_0.7fr] md:py-28">
          <h2 className="display-l max-w-2xl text-chalk">Orders for teams, events and brands.</h2>
          <div>
            <p className="max-w-sm text-[1.0625rem] leading-8 text-sand/80">Tell the studio what you need and how many. We will come back with a proposal.</p>
            <Link to="/custom-quote" className="btn btn-sand mt-8">Request a custom quote</Link>
          </div>
        </div>
      </section>
    </>
  );
}
