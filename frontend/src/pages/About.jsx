import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/PageHead.jsx';
import { Seo } from '../components/Seo.jsx';
import { canonicalDescription } from '../content/businessFacts.js';

export default function About() {
  return (
    <div>
      <Seo title="About ZAVIKOO Custom Atelier — Clothing Studio" description={`${canonicalDescription} Explore the catalog, read practical clothing guides, or share a custom project enquiry with the studio.`} />
      <section className="on-dark relative isolate overflow-hidden bg-cargo text-sand">
        <div className="page pb-20 pt-10 md:pb-32 md:pt-14">
          <Breadcrumbs dark items={[{ label: 'Home', to: '/' }, { label: 'Our story' }]} />
          <h1 className="display-xl max-w-4xl text-chalk">ZAVIKOO Custom Atelier, Karachi.</h1>
          <div className="mt-12 grid gap-8 md:grid-cols-2 md:gap-16">
            <p className="text-[1.1875rem] leading-9 text-sand/85">
              {canonicalDescription}
            </p>
            <p className="text-[1.0625rem] leading-8 text-sand/65">
              The collection includes oversized drop-shoulder graphic T-shirts in heavyweight cotton and winter pullover hoodies in thick fleece. Customers can also request personal text, pictures, car artwork, or calligraphy on supported designs.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap gap-4">
            <Link to="/shop" className="btn btn-sand">Explore the collection</Link>
            <Link to="/customize" className="btn btn-outline-light">Create something personal</Link>
          </div>
        </div>
        <div aria-hidden="true" className="stencil pointer-events-none absolute -bottom-[0.2em] right-[-0.04em] -z-10 select-none text-[clamp(8rem,26vw,26rem)] leading-none text-[#232719]">ZK</div>
      </section>

      <section className="page grid gap-12 py-20 md:grid-cols-[0.8fr_1.2fr] md:gap-24 md:py-28">
        <h2 className="display-l max-w-md">Garments and custom details.</h2>
        <div className="divide-y divide-ink/15 border-y border-ink/15">
          <article className="py-8">
            <h3 className="font-display text-[1.75rem]">Relaxed streetwear fit</h3>
            <p className="mt-3 max-w-xl text-[1.0625rem] leading-8 text-stone">Ready-made sizes are S, M, L, and XL. Custom T-shirt designs also allow XS when chest and length measurements are supplied.</p>
          </article>
          <article className="py-8">
            <h3 className="font-display text-[1.75rem]">DTF and heat-applied patches</h3>
            <p className="mt-3 max-w-xl text-[1.0625rem] leading-8 text-stone">Detailed graphic artwork is printed using DTF. Selected designs use embroidered patches attached with heat.</p>
          </article>
          <article className="py-8">
            <h3 className="font-display text-[1.75rem]">Made personal</h3>
            <p className="mt-3 max-w-xl text-[1.0625rem] leading-8 text-stone">Use the design tool for available custom garments, or send a quote request for a personal name, picture, car artwork, or Arabic, Urdu, or English calligraphy.</p>
          </article>
        </div>
      </section>

      <section className="border-y border-ink/10 bg-chalk">
        <div className="page grid gap-12 py-20 md:grid-cols-[1fr_1fr] md:gap-24 md:py-28">
          <div>
            <h2 className="display-l max-w-lg">From Karachi, delivered across Pakistan.</h2>
            <p className="lede mt-6">Delivery is free across Pakistan and usually takes about 5–7 working days after order confirmation. Cash on Delivery is the available payment method.</p>
            <Link to="/customize" className="btn btn-primary mt-10">Make it personal</Link>
          </div>
          <div className="self-start border-y border-ink/15">
            <article className="border-b border-ink/15 py-8">
              <h3 className="font-body text-[1.125rem] font-semibold tracking-normal">Browse or design</h3>
              <p className="mt-2 text-[1rem] leading-7 text-stone">Choose a listed ready-made graphic tee or hoodie, or open the design tool for available custom garments.</p>
            </article>
            <article className="border-b border-ink/15 py-8">
              <h3 className="font-body text-[1.125rem] font-semibold tracking-normal">Review your order</h3>
              <p className="mt-2 text-[1rem] leading-7 text-stone">Check the item, size, design, and total shown before submitting. For a quote, share your artwork, quantity, and requested timing.</p>
            </article>
            <article className="py-8">
              <h3 className="font-body text-[1.125rem] font-semibold tracking-normal">Receive by courier</h3>
              <p className="mt-2 text-[1rem] leading-7 text-stone">Pay by Cash on Delivery when the parcel arrives. Delivery is free across Pakistan and usually takes about 5–7 working days after confirmation.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="on-dark bg-olive text-sand">
        <div className="page flex flex-col gap-8 py-20 md:flex-row md:items-center md:justify-between md:py-28">
          <div>
            <h2 className="display-l max-w-2xl text-chalk">Find your fit. Then make it yours.</h2>
            <p className="mt-5 max-w-md text-[1.0625rem] leading-8 text-sand/80">Explore the latest edit or tell us what you would love to create.</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link to="/shop" className="btn btn-sand">Shop the collection</Link>
            <Link to="/custom-quote" className="btn btn-outline-light">Talk to the atelier</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
