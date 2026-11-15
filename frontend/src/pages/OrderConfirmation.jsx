import { Link, useParams } from 'react-router-dom';

export default function OrderConfirmation() {
  const { orderNumber } = useParams();

  return (
    <section className="page py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <div aria-hidden="true" className="mx-auto mb-8 grid h-14 w-14 place-items-center border border-brass-deep text-brass-deep">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </div>
        <h1 className="display-l">Thank you for your order.</h1>
        <p className="lede mx-auto mt-6">
          Your order number is <span className="font-semibold text-cargo">{orderNumber}</span>. Keep it handy: the studio will be in touch with the next steps.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link to="/shop" className="btn btn-primary">Keep shopping</Link>
          <Link to="/contact" className="btn btn-secondary">Contact the studio</Link>
        </div>
      </div>
    </section>
  );
}
