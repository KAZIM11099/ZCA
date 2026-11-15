import { Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { breadcrumbJsonLd, getSiteUrl, serializeJsonLd } from '../lib/jsonld.js';

/** Small breadcrumb trail: items are [{ label, to? }]; the last item is the current page. */
export function Breadcrumbs({ items, dark = false }) {
  const location = useLocation();
  const siteUrl = getSiteUrl();
  const schema = breadcrumbJsonLd(items.map((item) => ({
    name: item.label,
    path: item.to || location.pathname,
  })), siteUrl);
  return (
    <>
      <nav aria-label="Breadcrumb" className={`mb-8 text-[0.875rem] ${dark ? 'text-sand/70' : 'text-stone'}`}>
        <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          {items.map((item, index) => (
            <li key={item.label} className="flex items-center gap-2.5">
              {index > 0 && <span aria-hidden="true" className="opacity-50">/</span>}
              {item.to && index < items.length - 1
                ? <Link to={item.to} className={`transition-colors ${dark ? 'hover:text-chalk' : 'hover:text-cargo'}`}>{item.label}</Link>
                : <span aria-current={index === items.length - 1 ? 'page' : undefined} className={dark ? 'text-chalk' : 'text-cargo'}>{item.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
      {schema && <Helmet><script type="application/ld+json">{serializeJsonLd(schema)}</script></Helmet>}
    </>
  );
}

/** Shared heading block for inner pages. */
export function PageHead({ title, intro, crumbs, children, className = '' }) {
  return (
    <header className={`page pb-10 pt-10 md:pb-14 md:pt-14 ${className}`}>
      {crumbs && <Breadcrumbs items={crumbs} />}
      <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl">
          <h1 className="display-l">{title}</h1>
          {intro && <p className="lede mt-5">{intro}</p>}
        </div>
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </header>
  );
}
