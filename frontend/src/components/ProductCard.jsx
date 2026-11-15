import { Link } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { IconHeart } from './Icons.jsx';
import { productImageAlt } from './ImageAlt.jsx';

export function formatPrice(paisa) {
  return `PKR ${((paisa || 0) / 100).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
}

const prettyCategory = (value) => String(value || '').replace(/-/g, ' ');

export function ProductCard({ product }) {
  const { slugs, toggle } = useWishlist();
  const showToast = useToast();
  if (!product) return null;
  const isSaved = slugs.includes(product.slug);
  const price = product.salePricePaisa || product.basePricePaisa;
  const onSale = product.salePricePaisa && product.salePricePaisa < product.basePricePaisa;
  const colourCount = product.colors?.length || 0;
  const sizeCount = product.sizes?.length || 0;

  return (
    <article className="group min-w-0">
      <div className="relative">
        <Link to={`/product/${product.slug}`} className="block" aria-label={`View ${product.name}`}>
          <div className="plate relative aspect-[4/5] overflow-hidden bg-[#e0ded5]">
            <img src={product.imageBack || product.image} alt={productImageAlt(product, 'back')} loading="lazy" className="h-full w-full object-cover transition duration-[1100ms] ease-luxe group-hover:scale-[1.04] group-hover:opacity-0" />
            <img src={product.imageFront || product.imageBack || product.image} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-[1100ms] ease-luxe group-hover:scale-[1.04] group-hover:opacity-100" />
          </div>
        </Link>
        {product.isFeatured && (
          <span className="pointer-events-none absolute left-0 top-5 bg-cargo px-3.5 py-1.5 text-[0.8125rem] font-medium text-sand">Studio pick</span>
        )}
        {onSale && (
          <span className="pointer-events-none absolute bottom-0 left-0 bg-brass px-3.5 py-1.5 text-[0.8125rem] font-semibold text-cargo">Sale</span>
        )}
        <button
          type="button"
          aria-label={`${isSaved ? 'Remove' : 'Add'} ${product.name} ${isSaved ? 'from' : 'to'} wishlist`}
          aria-pressed={isSaved}
          onClick={() => {
            const willSave = !isSaved;
            toggle(product.slug);
            showToast(willSave ? `${product.name} added to your wishlist.` : `${product.name} removed from your wishlist.`, 'success');
          }}
          className="absolute right-3 top-3 grid h-10 w-10 place-items-center bg-chalk/90 text-cargo backdrop-blur transition hover:bg-cargo hover:text-sand"
        >
          <IconHeart filled={isSaved} className="h-[1.15rem] w-[1.15rem]" />
        </button>
      </div>

      <div className="flex flex-col gap-1.5 pt-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:pt-5">
        <div className="min-w-0">
          <p className="text-[0.8125rem] capitalize text-stone">{prettyCategory(product.category)}</p>
          <Link to={`/product/${product.slug}`} className="mt-1 block font-display text-[1.2rem] leading-tight text-cargo transition-colors group-hover:text-brass-deep sm:text-[1.45rem]">
            {product.name}
          </Link>
        </div>
        <div className="flex shrink-0 items-baseline gap-2 sm:block sm:pt-[1.35rem] sm:text-right">
          <p className="price-text text-[0.9375rem] tabular-nums text-cargo">{formatPrice(price)}</p>
          {onSale && <p className="price-text-secondary text-[0.8125rem] tabular-nums text-stone line-through">{formatPrice(product.basePricePaisa)}</p>}
        </div>
      </div>
      <p className="mt-2 text-[0.875rem] text-stone">
        {colourCount} {colourCount === 1 ? 'colour' : 'colours'}, {sizeCount} {sizeCount === 1 ? 'size' : 'sizes'}
      </p>
    </article>
  );
}
