import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard.jsx';
import { PageHead } from '../components/PageHead.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { getData } from '../lib/api.js';
import { scrollToTop } from '../lib/smoothScroll.js';

function AtelierDropdown({ id, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    const close = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={wrapperRef} className="shop-filter-control">
      <span className="shop-filter-label">{label}</span>
      <div className="atelier-dropdown">
        <button
          id={id}
          type="button"
          className={`atelier-dropdown__trigger ${open ? 'is-open' : ''}`}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{selectedOption.label}</span>
          <span className="atelier-dropdown__chevron" aria-hidden="true">⌄</span>
        </button>
        {open && (
          <div className="atelier-dropdown__menu" role="listbox" aria-label={label}>
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`atelier-dropdown__option ${option.value === value ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {option.value === value && <span aria-hidden="true">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const selectedCategory = searchParams.get('category') || 'all';
  const selectedCollection = searchParams.get('collection') || 'all';
  const search = searchParams.get('search') || '';
  const sort = searchParams.get('sort') || 'featured';
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
  const pageSize = 12;

  useEffect(() => {
    Promise.all([getData('/categories'), getData('/collections')])
      .then(([availableCategories, availableCollections]) => {
        setCategories(availableCategories);
        setCollections(availableCollections);
      })
      .catch(() => setError('Shop filters could not be loaded.'));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    getData('/products', {
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      collection: selectedCollection === 'all' ? undefined : selectedCollection,
      search: search || undefined,
      sort,
      page,
      pageSize,
    }).then((result) => {
      if (!active) return;
      setItems(result.items);
      setTotal(result.total);
    }).catch(() => {
      if (active) setError('Products could not be loaded. Check your connection and try again.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page, search, selectedCategory, selectedCollection, sort, retry]);

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const totalPages = Math.ceil(total / pageSize);
  const changePage = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    const next = new URLSearchParams(searchParams);
    if (nextPage === 1) next.delete('page');
    else next.set('page', String(nextPage));
    setSearchParams(next);
    scrollToTop();
  };

  return (
    <>
      <PageHead
        title="The shop"
        intro="Considered everyday pieces, ready to wear or ready to make your own."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Shop' }]}
      />

      <section className="page pb-24 md:pb-32">
        <div className="shop-filters border-y border-ink/15 py-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.25fr_1fr] lg:items-end">
            <AtelierDropdown
              id="shop-category"
              label="Category"
              value={selectedCategory}
              onChange={(value) => updateParam('category', value)}
              options={[{ value: 'all', label: 'All categories' }, ...categories.map((category) => ({ value: category.slug, label: category.name }))]}
            />
            <AtelierDropdown
              id="shop-collection"
              label="Collection"
              value={selectedCollection}
              onChange={(value) => updateParam('collection', value)}
              options={[{ value: 'all', label: 'All collections' }, ...collections.map((collection) => ({ value: collection.slug, label: collection.name }))]}
            />
            <label className="shop-filter-control">
              <span className="shop-filter-label">Search the atelier</span>
              <input id="shop-search" type="search" value={search} onChange={(event) => updateParam('search', event.target.value)} placeholder="Search a tee, hoodie or drop" className="field shop-search-field" />
            </label>
            <AtelierDropdown
              id="shop-sort"
              label="Sort by"
              value={sort}
              onChange={(value) => updateParam('sort', value)}
              options={[
                { value: 'featured', label: 'Featured' },
                { value: 'newest', label: 'Newest' },
                { value: 'price-asc', label: 'Price: low to high' },
                { value: 'price-desc', label: 'Price: high to low' },
                { value: 'name', label: 'Name' },
              ]}
            />
          </div>
        </div>

        <div className="flex items-center justify-between py-6 text-[0.9375rem] text-stone">
          <p aria-live="polite">{loading ? 'Loading pieces…' : `${total} ${total === 1 ? 'piece' : 'pieces'}`}</p>
        </div>

        {error && (
          <div role="alert" className="notice-error mb-8">
            {error} <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-2 font-semibold underline underline-offset-2">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map((key) => <div key={key}><div className="skeleton aspect-[4/5]" /><div className="skeleton mt-5 h-5 w-2/3" /><div className="skeleton mt-3 h-4 w-1/3" /></div>)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState title="No matches found" action={<button type="button" onClick={() => setSearchParams({})} className="btn btn-secondary">Clear filters</button>}>
            Try a different keyword, category or collection.
          </EmptyState>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((product) => <ProductCard key={product.slug} product={product} />)}
            </div>
            {totalPages > 1 && (
              <nav className="shop-pagination" aria-label="Shop products pagination">
                <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)} className="shop-pagination__arrow" aria-label="Previous products page">←</button>
                <div className="shop-pagination__pages">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => (
                    <button key={value} type="button" onClick={() => changePage(value)} className={`shop-pagination__page ${page === value ? 'is-active' : ''}`} aria-current={page === value ? 'page' : undefined}>{String(value).padStart(2, '0')}</button>
                  ))}
                </div>
                <button type="button" disabled={page === totalPages} onClick={() => changePage(page + 1)} className="shop-pagination__arrow" aria-label="Next products page">→</button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
