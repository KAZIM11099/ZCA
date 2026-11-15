import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard.jsx';
import { PageHead } from '../components/PageHead.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { getData } from '../lib/api.js';
import { Seo } from '../components/Seo.jsx';
import { collectionJsonLd, getSiteUrl } from '../lib/jsonld.js';

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [filtered, setFiltered] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([getData('/categories'), getData('/products', { category: slug, pageSize: 48 })])
      .then(([categories, result]) => {
        setCategory(categories.find((entry) => entry.slug === slug));
        setFiltered(result.items);
        setError('');
      })
      .catch(() => setError('This category could not be loaded.'));
  }, [slug]);

  const name = category ? category.name : 'Category';
  const categoryDescription = category?.description
    || `Browse ${name.toLowerCase()} currently listed in the ZAVIKOO catalog. Review each product page for the details and options available for that item.`;

  return (
    <>
      {category && <Seo title={`${category.name} Clothing | ZAVIKOO`} description={`${categoryDescription} Browse the size guide or custom design tool for related information.`} jsonLd={[collectionJsonLd({ name: category.name, slug: category.slug, path: `/categories/${encodeURIComponent(category.slug)}`, description: categoryDescription }, filtered, getSiteUrl())]} />}
      <PageHead title={name} intro={categoryDescription} crumbs={[{ label: 'Home', to: '/' }, { label: 'Shop', to: '/shop' }, { label: name }]} />
      <section className="page pb-24 md:pb-32">
        {error ? <p role="alert" className="notice-error">{error}</p> : filtered.length === 0 ? (
          <EmptyState title="Nothing here yet" action={<Link to="/shop" className="btn btn-secondary">Browse all pieces</Link>}>No products in this category yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => <ProductCard key={product.slug} product={product} />)}
          </div>
        )}
        <section className="mt-16 border-t border-ink/15 pt-8" aria-labelledby="category-guide-title">
          <h2 id="category-guide-title" className="display-m">Explore this category</h2>
          <p className="mt-4 max-w-2xl leading-7 text-stone">Compare product details and ask the studio if you need help choosing an item or planning a custom request.</p>
          <nav aria-label="Related shopping information" className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <Link to="/size-guide" className="link-line">Read the size guide</Link>
            <Link to="/customize" className="link-line">Explore the custom design tool</Link>
            <Link to="/custom-quote" className="link-line">Request a custom quote</Link>
            <Link to="/guides/garment-fit" className="link-line">Read the garment fit guide</Link>
          </nav>
        </section>
      </section>
    </>
  );
}
