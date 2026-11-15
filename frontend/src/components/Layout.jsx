import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { Wordmark } from './Wordmark.jsx';
import { SocialLinks } from './SocialLinks.jsx';
import { getData } from '../lib/api.js';
import { NewsletterForm } from './NewsletterSignup.jsx';
import CustomerSupportChat from './CustomerSupportChat.jsx';
import { IconArrow, IconBag, IconChevronDown, IconClose, IconHeart, IconMenu, IconPlus, IconMinus, IconUser } from './Icons.jsx';
import { canonicalDescription } from '../content/businessFacts.js';

const genderSlugs = ['men', 'women', 'kids'];
const defaultHeaderAnnouncements = [
  { id: 'default-studio', text: 'Explore the ZAVIKOO collection' },
];

const footerGroups = [
  {
    title: 'Shop',
    links: [
      { label: 'All pieces', to: '/shop' },
      { label: 'Collections', to: '/collections' },
      { label: 'Customize a piece', to: '/customize' },
      { label: 'Custom quote', to: '/custom-quote' },
      { label: 'Size guide', to: '/size-guide' },
      { label: 'Guides', to: '/guides' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQ', to: '/faq' },
      { label: 'Shipping', to: '/shipping-policy' },
      { label: 'Returns and exchanges', to: '/returns-exchanges' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'The atelier',
    links: [
      { label: 'Our story', to: '/about' },
      { label: 'Account', to: '/account' },
      { label: 'Site map', to: '/sitemap' },
      { label: 'Privacy', to: '/privacy-policy' },
    ],
  },
];

function useCollections() {
  const [collections, setCollections] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getData('/collections')
      .then((rows) => {
        if (active) setCollections(rows.filter((c) => genderSlugs.includes(c.slug)).sort((a, b) => genderSlugs.indexOf(a.slug) - genderSlugs.indexOf(b.slug)));
      })
      .catch(() => { if (active) setError('Collections are temporarily unavailable.'); });
    return () => { active = false; };
  }, []);
  return { collections, error };
}

function DesktopLink({ to, children }) {
  return (
    <NavLink to={to} className={({ isActive }) => `nav-link ${isActive ? 'is-active' : ''}`}>
      {children}
    </NavLink>
  );
}

function CollectionsMenu({ collections, error }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const active = location.pathname.startsWith('/collections');

  const show = () => { window.clearTimeout(timer.current); setOpen(true); };
  const hide = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), 160); };
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div onMouseEnter={show} onMouseLeave={hide} onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onFocus={show}
        className={`nav-link inline-flex items-center gap-1.5 ${active || open ? 'is-active' : ''}`}
      >
        Collections <IconChevronDown className={`h-3 w-3 transition-transform duration-base ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full border-b border-ink/10 bg-chalk shadow-soft" onFocus={show}>
          <div className="page grid gap-10 py-12 lg:grid-cols-[0.8fr_1.6fr]">
            <div>
              <p className="display-m">The edits</p>
              <p className="mt-4 max-w-xs text-[0.9375rem] leading-7 text-stone">Considered pieces, grouped by who they are cut for.</p>
              <Link to="/collections" onClick={() => setOpen(false)} className="link-line mt-8">All collections <IconArrow /></Link>
            </div>
            <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-3">
              {collections.map((collection) => (
                <li key={collection.id}>
                  <Link to={`/collections/${collection.slug}`} onClick={() => setOpen(false)} className="group block border-t border-ink/15 py-5">
                    <span className="flex items-center justify-between font-display text-[2rem] leading-none">
                      {collection.name}
                      <IconArrow className="h-5 w-5 -translate-x-2 opacity-0 transition duration-base group-hover:translate-x-0 group-hover:opacity-100" />
                    </span>
                    {collection.description && <span className="mt-3 line-clamp-2 block text-[0.875rem] leading-6 text-stone">{collection.description}</span>}
                  </Link>
                </li>
              ))}
              {error && <li role="status" className="col-span-3 text-sm text-stone">{error}</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function getRevealVariant(target, sectionIndex) {
  if (
    target.matches('main > section')
    && (sectionIndex === 0 || target.querySelector(':scope > .photo'))
  ) return 'hero';
  if (target.matches('article')) return 'card';
  if (target.matches('.runway-carousel')) return 'cinematic';
  if (target.querySelector('form')) return 'form';
  if (target.classList.contains('on-dark')) return 'dark';

  const firstImage = target.querySelector(':scope > .photo, :scope > img, :scope > canvas');
  if (firstImage) return 'image';

  const grid = Array.from(target.querySelectorAll('.grid')).find((candidate) => (
    candidate.children.length > 1 && candidate.children.length <= 8
  ));
  if (grid) return 'editorial';

  return sectionIndex % 2 === 0 ? 'drift-left' : 'drift-right';
}

function Drawer({ open, onClose, collections }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previous; };
  }, [open, onClose]);

  if (!open) return null;
  const linkClass = 'block border-b border-sand/15 py-4 font-subheading text-[2rem] leading-none text-sand transition-colors hover:text-brass';

  return (
    <div className="fixed inset-0 z-drawer xl:hidden" role="dialog" aria-modal="true" aria-label="Site menu">
      <button type="button" aria-label="Close menu" onClick={onClose} className="newsletter-backdrop absolute inset-0 bg-cargo/60 backdrop-blur-sm" />
      <div className="drawer-panel on-dark absolute inset-y-0 left-0 flex w-[min(25rem,90vw)] flex-col overflow-y-auto bg-cargo px-7 pb-8 pt-6 text-sand">
        <div className="mb-8 flex items-center justify-between">
          <Wordmark size="sm" />
          <button type="button" onClick={onClose} aria-label="Close menu" className="-mr-2 grid h-11 w-11 place-items-center text-sand"><IconClose /></button>
        </div>

        <nav aria-label="Mobile navigation" className="flex-1">
          <Link to="/shop" className={linkClass}>Shop</Link>
          <div className="border-b border-sand/15">
            <button type="button" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between py-4 text-left font-subheading text-[2rem] leading-none text-sand transition-colors hover:text-brass">
              Collections {expanded ? <IconMinus className="h-5 w-5" /> : <IconPlus className="h-5 w-5" />}
            </button>
            {expanded && (
              <ul className="pb-4 pl-1">
                {collections.map((c) => (
                  <li key={c.id}><Link to={`/collections/${c.slug}`} className="block py-2.5 text-lg text-sand/80 hover:text-sand">{c.name}</Link></li>
                ))}
                <li><Link to="/collections" className="block py-2.5 text-lg text-sand/80 hover:text-sand">All collections</Link></li>
              </ul>
            )}
          </div>
          <Link to="/customize" className={linkClass}>Customize</Link>
          <Link to="/custom-quote" className={linkClass}>Custom quote</Link>
          <Link to="/about" className={linkClass}>Our story</Link>
          <Link to="/contact" className={linkClass}>Contact</Link>
        </nav>

        <div className="mt-8 flex items-center gap-6 text-[0.9375rem] text-sand/80">
          <Link to="/account" className="hover:text-sand">Account</Link>
          <Link to="/wishlist" className="hover:text-sand">Saved</Link>
          <Link to="/faq" className="hover:text-sand">FAQ</Link>
        </div>
        <SocialLinks tone="dark" className="mt-6" />
      </div>
    </div>
  );
}

export function Layout({ children }) {
  const { itemCount } = useCart();
  const location = useLocation();
  const { collections, error } = useCollections();
  const [headerAnnouncements, setHeaderAnnouncements] = useState(defaultHeaderAnnouncements);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let active = true;
    getData('/header-announcements')
      .then((items) => {
        if (active && Array.isArray(items)) setHeaderAnnouncements(items);
      })
      .catch((requestError) => {
        console.error('Could not load the header announcement; using the default message.', requestError);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const revealSelector = 'main > *, main section, main article';
    const observed = new WeakSet();
    let sectionIndex = 0;
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.setAttribute('data-scroll-visible', 'true');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.01, rootMargin: '0px 0px -24px 0px' })
      : null;

    const observeRevealTargets = (node) => {
      if (!(node instanceof Element)) return;
      const targets = [];
      if (node.matches(revealSelector)) targets.push(node);
      targets.push(...node.querySelectorAll(revealSelector));
      targets.forEach((target) => {
        if (observed.has(target)) return;
        observed.add(target);
        if (target.closest('.review-marquee-track')) return;
        const isSection = target.matches('section');
        const index = isSection ? sectionIndex++ : sectionIndex;
        target.setAttribute('data-scroll-reveal', getRevealVariant(target, index));
        if (observer) observer.observe(target);
        else target.setAttribute('data-scroll-visible', 'true');

        const grid = Array.from(target.querySelectorAll('.grid')).find((candidate) => (
          candidate.children.length > 1 && candidate.children.length <= 8
        ));
        if (!grid) return;
        Array.from(grid.children).forEach((item, itemIndex) => {
          if (observed.has(item)) return;
          observed.add(item);
          item.style.setProperty('--scroll-reveal-delay', `${Math.min(itemIndex, 4) * 90}ms`);
          item.setAttribute('data-scroll-reveal', 'gallery-item');
          if (observer) observer.observe(item);
          else item.setAttribute('data-scroll-visible', 'true');
        });
      });
    };

    observeRevealTargets(main);
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach(observeRevealTargets));
    });
    mutations.observe(main, { childList: true, subtree: true });

    return () => {
      mutations.disconnect();
      observer?.disconnect();
    };
  }, []);

  const iconButton = 'relative grid h-11 w-11 place-items-center text-cargo transition-colors hover:text-brass-deep';
  return (
    <div className="min-h-screen bg-paper text-ink">
      {headerAnnouncements.length > 0 && (
        <div className="announcement-bar on-dark flex min-h-10 items-center justify-center bg-black px-4 py-2.5 text-center text-sand" role="status" aria-live="polite" aria-label="Store announcement">
          <p className="announcement-glow text-[0.8125rem] font-bold uppercase leading-5 tracking-[0.08em] text-sand">
            {headerAnnouncements[0].text}
          </p>
        </div>
      )}

      <header className={`site-header sticky top-0 z-header border-b backdrop-blur-md transition-[background-color,backdrop-filter,box-shadow,border-color] duration-500 ease-out ${scrolled ? 'border-ink/12 bg-white shadow-[0_14px_30px_-24px_rgba(20,22,15,0.5)] backdrop-blur-0' : 'border-ink/10 bg-paper/92'}`}>
        <div className="mx-auto grid max-w-page grid-cols-[1fr_auto_1fr] items-center px-gutter py-2.5 lg:py-3">
          <div className="flex items-center">
            <button type="button" onClick={() => setDrawerOpen(true)} aria-label="Open menu" aria-expanded={drawerOpen} className={`${iconButton} -ml-2.5 xl:hidden`}><IconMenu /></button>
            <nav aria-label="Main navigation" className="hidden items-center gap-9 xl:flex">
              <DesktopLink to="/shop">Shop</DesktopLink>
              <CollectionsMenu collections={collections} error={error} />
              <DesktopLink to="/customize">Customize</DesktopLink>
              <DesktopLink to="/custom-quote">Custom quote</DesktopLink>
            </nav>
          </div>

          <Link to="/" aria-label="ZAVIKOO Custom Atelier, home" className="block px-3">
            <img src="/zavikoo-navbar-logo.png" alt="ZAVIKOO Custom Atelier" className="h-11 w-auto object-contain mix-blend-multiply sm:h-12 lg:h-[3.25rem]" />
          </Link>

          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
            <nav aria-label="Secondary navigation" className="mr-5 hidden items-center gap-8 xl:flex">
              <DesktopLink to="/about">Our story</DesktopLink>
              <DesktopLink to="/contact">Contact</DesktopLink>
            </nav>
            <Link aria-label="Your account" to="/account" className={`${iconButton} hidden sm:grid`}><IconUser /></Link>
            <Link aria-label="Saved pieces" to="/wishlist" className={`${iconButton} hidden sm:grid`}><IconHeart /></Link>
            <Link to="/cart" aria-label={`Shopping bag, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`} className={`${iconButton} -mr-2.5`}>
              <IconBag />
              {itemCount > 0 && (
                <span className="absolute right-0.5 top-1 grid h-[1.15rem] min-w-[1.15rem] place-items-center rounded-full bg-brass px-1 text-[0.6875rem] font-bold leading-none text-cargo">{itemCount}</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} collections={collections} />

      <main>{children}</main>

      <footer className="on-dark bg-cargo text-sand">
        <section className="border-b border-sand/12">
          <div className="mx-auto grid max-w-page gap-10 px-gutter py-16 md:grid-cols-[1fr_1fr] md:items-end md:py-20">
            <div>
              <h2 className="display-m max-w-md text-chalk">Notes from the atelier</h2>
              <p className="mt-4 max-w-md text-[0.9375rem] leading-7 text-sand/70">New pieces, studio updates and the occasional offer. No noise.</p>
            </div>
            <NewsletterForm compact tone="dark" />
          </div>
        </section>

        <div className="mx-auto grid max-w-page gap-12 px-gutter py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark size="md" className="text-chalk" />
            <p className="mt-6 max-w-xs text-[0.9375rem] leading-7 text-sand/70">
              {canonicalDescription}
            </p>
            <p className="mt-3 max-w-xs text-[0.9375rem] leading-7 text-sand/70">
              Cash on delivery all over Pakistan. About 5–7 working days delivery.
            </p>
            <SocialLinks tone="dark" className="mt-7" />
          </div>
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-5 font-body text-[0.9375rem] font-semibold tracking-normal text-chalk">{group.title}</h3>
              <ul className="space-y-3.5 text-[0.9375rem] text-sand/70">
                {group.links.map((link) => (
                  <li key={link.to}><Link to={link.to} className="transition-colors hover:text-chalk">{link.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-sand/12">
          <div className="mx-auto flex max-w-page flex-col gap-3 px-gutter py-6 text-[0.875rem] text-sand/60 md:flex-row md:items-center md:justify-between">
            <p>© 2026 ZAVIKOO Custom Atelier. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/terms-and-conditions" className="hover:text-chalk">Terms</Link>
              <Link to="/privacy-policy" className="hover:text-chalk">Privacy</Link>
              <Link to="/returns-exchanges" className="hover:text-chalk">Returns</Link>
            </div>
          </div>
        </div>
      </footer>
      <CustomerSupportChat />
    </div>
  );
}
