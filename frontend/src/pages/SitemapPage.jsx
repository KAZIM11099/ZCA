import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHead } from '../components/PageHead.jsx';
import { getData } from '../lib/api.js';

const sitemapGroups = [
  {
    title: 'Shop & discover',
    links: [
      ['Shop all pieces', '/shop'],
      ['All collections', '/collections'],
      ['Customize a piece', '/customize'],
      ['Request a custom quote', '/custom-quote'],
      ['Clothing guides', '/guides'],
    ],
  },
  {
    title: 'The studio',
    links: [
      ['About ZAVIKOO', '/about'],
      ['Contact the studio', '/contact'],
      ['Frequently asked questions', '/faq'],
    ],
  },
  {
    title: 'Customer care',
    links: [
      ['Size guide', '/size-guide'],
      ['Shipping information', '/shipping-policy'],
      ['Returns & exchanges', '/returns-exchanges'],
    ],
  },
  {
    title: 'Your account & policies',
    links: [
      ['Privacy policy', '/privacy-policy'],
      ['Terms & conditions', '/terms-and-conditions'],
    ],
  },
];

export default function SitemapPage() {
  const [categories, setCategories] = useState([]);
  const [collections, setCollections] = useState([]);
  useEffect(() => {
    let active = true;
    Promise.all([getData('/categories'), getData('/collections')])
      .then(([categoryRows, collectionRows]) => {
        if (!active) return;
        setCategories(categoryRows);
        setCollections(collectionRows);
      })
      .catch(() => {
        if (active) {
          setCategories([]);
          setCollections([]);
        }
      });
    return () => { active = false; };
  }, []);

  const groups = [
    ...sitemapGroups,
    {
      title: 'Categories',
      links: categories.map((item) => [item.name, `/categories/${item.slug}`]),
    },
    {
      title: 'Collections',
      links: collections.map((item) => [item.name, `/collections/${item.slug}`]),
    },
  ];

  return (
    <>
      <PageHead title="Site map" intro="Browse the ZAVIKOO atelier, explore our collections, or find the help and information you need." crumbs={[{ label: 'Home', to: '/' }, { label: 'Site map' }]} />
      <div className="page grid gap-x-10 gap-y-14 pb-24 sm:grid-cols-2 md:pb-32 lg:grid-cols-4">
        {groups.filter((group) => group.links.length > 0).map((group) => (
          <section key={group.title} className="border-t border-ink/25 pt-6">
            <h2 className="font-display text-[1.6rem]">{group.title}</h2>
            <ul className="mt-6 space-y-3.5">
              {group.links.map(([label, to]) => (
                <li key={to}><Link to={to} className="text-[1rem] text-stone transition-colors hover:text-cargo">{label}</Link></li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
