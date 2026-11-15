import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard.jsx';
import { PageHead } from '../components/PageHead.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { useWishlist } from '../context/WishlistContext.jsx';
import { getData } from '../lib/api.js';

export default function WishlistPage() {
  const { slugs } = useWishlist();
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getData('/products', { pageSize: 48 }).then((result) => setProducts(result.items)).catch(() => setError('Products could not be loaded.'));
  }, []);
  const saved = products.filter((product) => slugs.includes(product.slug));

  return (
    <>
      <PageHead title="Saved pieces" intro="The pieces you have kept for later." crumbs={[{ label: 'Home', to: '/' }, { label: 'Saved' }]} />
      <section className="page pb-24 md:pb-32">
        {error ? <p role="alert" className="notice-error">{error}</p>
          : saved.length ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
              {saved.map((product) => <ProductCard key={product.slug} product={product} />)}
            </div>
          ) : (
            <EmptyState title="Nothing saved yet" action={<Link to="/shop" className="btn btn-primary">Explore the shop</Link>}>
              Tap the heart on any piece to keep it here.
            </EmptyState>
          )}
      </section>
    </>
  );
}
