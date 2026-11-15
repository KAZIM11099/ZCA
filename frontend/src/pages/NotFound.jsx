import { Link } from 'react-router-dom';
import { Seo } from '../components/Seo.jsx';

export default function NotFound() {
  return (
    <>
      <Seo noindex />
      {/* SSR/prerender must set 404. */}
      <section className="on-dark bg-cargo text-sand">
        <div className="page flex min-h-[60vh] flex-col items-start justify-center py-20">
          <p className="stencil text-[clamp(5rem,18vw,13rem)] leading-none text-olive">404</p>
          <h1 className="display-l mt-4 text-chalk">This page is not here.</h1>
          <p className="lede mt-5 text-sand/70">The link may have moved, or the piece is no longer available.</p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/" className="btn btn-sand">Back home</Link>
            <Link to="/shop" className="btn btn-outline-light">Browse the shop</Link>
            <Link to="/contact" className="btn btn-outline-light">Contact the studio</Link>
          </div>
        </div>
      </section>
    </>
  );
}
