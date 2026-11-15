import { Link } from 'react-router-dom';
import { formatPrice } from '../components/ProductCard.jsx';
import { GarmentDesignBoard } from '../components/GarmentDesignPreview.jsx';
import { PageHead } from '../components/PageHead.jsx';
import { EmptyState } from '../components/EmptyState.jsx';
import { IconMinus, IconPlus, IconTrash } from '../components/Icons.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  const continueDesigning = (item) => {
    const editKey = `zavikoo-design-edit:${item.uniqueKey}`;
    window.sessionStorage.setItem(editKey, JSON.stringify(item.design));
    window.location.href = `/customize/${encodeURIComponent(item.customProductId)}?edit=${encodeURIComponent(item.uniqueKey)}`;
  };

  if (items.length === 0) {
    return (
      <>
        <PageHead title="Your bag" crumbs={[{ label: 'Home', to: '/' }, { label: 'Bag' }]} />
        <section className="page pb-24 md:pb-32">
          <EmptyState title="Your bag is empty" action={<><Link to="/shop" className="btn btn-primary">Browse the shop</Link><Link to="/customize" className="btn btn-secondary">Design your own</Link></>}>
            Pick a piece, or start a custom design, and it will appear here.
          </EmptyState>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHead title="Your bag" intro={`${items.length} ${items.length === 1 ? 'item' : 'items'} ready for checkout.`} crumbs={[{ label: 'Home', to: '/' }, { label: 'Bag' }]} />

      <section className="page grid gap-12 pb-24 md:pb-32 lg:grid-cols-[1.5fr_0.7fr] lg:gap-20">
        <ul className="divide-y divide-ink/15 border-y border-ink/15">
          {items.map((item) => (
            <li key={item.uniqueKey} className="flex gap-5 py-7 sm:gap-8">
              {item.design
                ? <GarmentDesignBoard layout={item.design} className="w-28 shrink-0 sm:w-40" />
                : <div className="h-32 w-28 shrink-0 bg-[#e0ded5] sm:h-40 sm:w-32"><img src={item.image} alt={item.name} className="h-full w-full object-cover" /></div>}

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-[1.45rem] leading-tight">{item.name}</h2>
                    <p className="mt-1.5 text-[0.9375rem] text-stone">{item.color}, {item.size}</p>
                    {item.design && <p className="mt-1 text-[0.9375rem] text-stone">{item.design.text ? `Custom text: “${item.design.text}”` : 'Uploaded custom artwork'}, {item.design.textPlacement || item.design.imagePlacement || item.design.placement}</p>}
                  </div>
                  <p className="price-text shrink-0 text-[1.0625rem] tabular-nums">{formatPrice(item.price * item.quantity)}</p>
                </div>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex items-center border border-ink/25" aria-label={`Quantity of ${item.name}`}>
                      <button type="button" aria-label={`Decrease quantity of ${item.name}`} onClick={() => updateQuantity(item.uniqueKey, item.quantity - 1)} className="grid h-11 w-11 place-items-center transition hover:bg-cargo hover:text-chalk"><IconMinus /></button>
                      <span className="min-w-[2.75rem] text-center font-semibold tabular-nums">{item.quantity}</span>
                      <button type="button" aria-label={`Increase quantity of ${item.name}`} disabled={item.quantity >= 20} onClick={() => updateQuantity(item.uniqueKey, item.quantity + 1)} className="grid h-11 w-11 place-items-center transition hover:bg-cargo hover:text-chalk disabled:opacity-40"><IconPlus /></button>
                    </div>
                    {item.design && item.customProductId && <button type="button" onClick={() => continueDesigning(item)} className="border-b border-ink/30 pb-1 text-[0.875rem] font-semibold text-cargo transition hover:border-cargo">Continue designing</button>}
                  </div>
                  <button type="button" aria-label={`Remove ${item.name} from bag`} title="Remove from bag" onClick={() => removeItem(item.uniqueKey)} className="grid h-11 w-11 place-items-center text-stone transition hover:bg-cargo hover:text-chalk"><IconTrash /></button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit border border-ink/15 bg-chalk p-7 md:p-9 lg:sticky lg:top-28">
          <h2 className="font-display text-[1.75rem]">Order summary</h2>
          <dl className="mt-7 space-y-4 text-[1rem] text-stone">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="price-text tabular-nums text-cargo">{formatPrice(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Shipping</dt><dd>Calculated at checkout</dd></div>
            <div className="flex items-baseline justify-between border-t border-ink/15 pt-5 text-cargo"><dt className="font-semibold">Estimated total</dt><dd className="price-text text-[1.5rem] tabular-nums">{formatPrice(subtotal)}</dd></div>
          </dl>
          <Link to="/checkout" className="btn btn-primary mt-8 w-full">Proceed to checkout</Link>
          <p className="mt-5 text-[0.875rem] leading-6 text-stone">Cash on delivery. You pay when your order arrives.</p>
          <Link to="/shop" className="link-line mt-6 text-[0.9375rem]">Continue shopping</Link>
        </aside>
      </section>
    </>
  );
}
