import { Link, useParams } from 'react-router-dom';
import { Breadcrumbs, PageHead } from '../components/PageHead.jsx';
import { Seo } from '../components/Seo.jsx';
import { guides, guideAuthor } from '../content/guides/index.js';
import { articleJsonLd, getSiteUrl } from '../lib/jsonld.js';

const updatedLabel = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString('en-PK', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function GuidesPage() {
  const { slug } = useParams();
  const siteUrl = getSiteUrl();
  const guide = guides.find((item) => item.slug === slug);

  if (slug && !guide) {
    return (
      <>
        <Seo noindex />
        <PageHead title="Guide not found" intro="This guide could not be found. Browse the available guides or get in touch with the studio." crumbs={[{ label: 'Home', to: '/' }, { label: 'Guides', to: '/guides' }, { label: 'Not found' }]} />
        <section className="page pb-20"><Link className="link-line" to="/guides">Browse all guides</Link></section>
      </>
    );
  }

  if (!guide) {
    return (
      <>
        <PageHead title="Clothing guides" intro="Practical checklists for garment fit, artwork preparation, care, and planning a custom clothing enquiry." crumbs={[{ label: 'Home', to: '/' }, { label: 'Guides' }]} />
        <section className="page grid gap-5 pb-24 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((item) => (
            <article key={item.slug} className="border-t border-ink/20 py-6">
              <p className="kicker">{item.category}</p>
              <h2 className="mt-3 font-display text-2xl leading-tight"><Link to={`/guides/${item.slug}`} className="hover:text-brass-deep">{item.title}</Link></h2>
              <p className="mt-3 leading-7 text-stone">{item.description}</p>
              <Link to={`/guides/${item.slug}`} className="link-line mt-5">Read this guide</Link>
            </article>
          ))}
        </section>
      </>
    );
  }

  const article = {
    ...guide,
    publishedAt: guide.updatedAt,
    updatedAt: guide.updatedAt,
    author: guideAuthor,
  };
  return (
    <article>
      <Seo
        title={`${guide.title.slice(0, 43)} | ZAVIKOO`}
        description={guide.description}
        type="article"
        jsonLd={[articleJsonLd(article, siteUrl)]}
      />
      <header className="page py-12 md:py-20">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Guides', to: '/guides' }, { label: guide.title }]} />
        <p className="kicker">{guide.category}</p>
        <h1 className="display-l mt-3 max-w-4xl">{guide.title}</h1>
        <p className="lede mt-6 max-w-3xl">{guide.description}</p>
        <p className="mt-5 text-sm text-stone">By {guideAuthor} · Last updated {updatedLabel(guide.updatedAt)}</p>
      </header>
      <div className="page grid gap-12 pb-24 lg:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="max-w-3xl">
          <section aria-label="Key takeaways" className="border-y border-ink/20 bg-chalk px-6 py-6">
            <h2 className="font-display text-2xl">Key takeaways</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 leading-7 text-stone">
              {guide.takeaways.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
          <div className="mt-10 space-y-10">
            {guide.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="display-m">{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-[1.0625rem] leading-8 text-stone">{paragraph}</p>)}
              </section>
            ))}
          </div>
          <nav aria-label="Related information" className="mt-12 border-t border-ink/20 pt-6">
            <h2 className="font-display text-2xl">Related pages</h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              <li><Link className="link-line" to="/shop">Browse the clothing catalog</Link></li>
              <li><Link className="link-line" to="/size-guide">Read the size guide</Link></li>
              <li><Link className="link-line" to="/custom-quote">Request a custom or bulk quote</Link></li>
              <li><Link className="link-line" to="/contact">Contact the studio</Link></li>
            </ul>
          </nav>
        </div>
        <aside className="h-fit border-l-2 border-brass pl-6">
          <p className="font-semibold">Need help with a project?</p>
          <p className="mt-3 leading-7 text-stone">Send the studio your garment, artwork, and quantity questions.</p>
          <Link className="btn btn-primary mt-5" to="/custom-quote">Request a quote</Link>
        </aside>
      </div>
    </article>
  );
}
