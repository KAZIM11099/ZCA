export const pageMetadata = [
  { pattern: /^\/$/, title: 'Custom Clothing & Design | ZAVIKOO', description: 'Explore clothing and custom garment design from ZAVIKOO Custom Atelier. Browse available pieces, review product details, or share an idea for a custom order.' },
  { pattern: /^\/shop$/, title: 'Shop T-Shirts, Hoodies & Sweats | ZAVIKOO', description: 'Browse the ZAVIKOO clothing catalog, compare available styles and product details, and choose a piece to explore or customize.' },
  { pattern: /^\/collections$/, title: 'Clothing Collections | ZAVIKOO', description: 'Explore ZAVIKOO collections and browse clothing grouped by the edits available in the catalog.' },
  { pattern: /^\/collections\/([^/]+)$/, title: '{slug} Collection | ZAVIKOO', description: 'Browse the {slug} collection from ZAVIKOO. View available products, compare details, and find a piece that suits your preferences.' },
  { pattern: /^\/categories\/([^/]+)$/, title: '{slug} Clothing | ZAVIKOO', description: 'Browse {slug} clothing in the ZAVIKOO catalog. Review current product details, available sizes, colours, and prices before choosing a piece.' },
  { pattern: /^\/product\/([^/]+)$/, title: '{slug} Product | ZAVIKOO', description: 'Review this ZAVIKOO product’s current description, price, available options, and stock before deciding whether it is right for you.' },
  { pattern: /^\/customize$/, title: 'Design a Custom Garment | ZAVIKOO', description: 'Use the ZAVIKOO design tool to explore garment options, arrange text or artwork, preview your idea, and review the current price before ordering.' },
  { pattern: /^\/customize\/([^/]+)$/, title: 'Customize {slug} | ZAVIKOO', description: 'Use the ZAVIKOO design tool to explore garment options, arrange text or artwork, preview your idea, and review the current price before ordering.' },
  { pattern: /^\/custom-quote$/, title: 'Custom & Bulk Clothing Quote | ZAVIKOO', description: 'Share your requirements for a team, event, brand, or custom clothing project. ZAVIKOO will review the brief and prepare a response.' },
  { pattern: /^\/about$/, title: 'About ZAVIKOO Custom Atelier', description: 'Learn about ZAVIKOO Custom Atelier, browse the clothing catalog, and see how to get in touch about a garment or custom project.' },
  { pattern: /^\/contact$/, title: 'Contact ZAVIKOO Custom Atelier', description: 'Contact ZAVIKOO Custom Atelier with a question about a product, order, custom garment, or bulk project using the available enquiry form.' },
  { pattern: /^\/faq$/, title: 'Custom Clothing FAQs | ZAVIKOO', description: 'Find answers to common questions about browsing ZAVIKOO products, custom design requests, sizing information, orders, and customer support.' },
  { pattern: /^\/sitemap$/, title: 'Site Map | ZAVIKOO', description: 'Browse links to ZAVIKOO shop pages, clothing collections, customer information, and studio contact options.' },
  { pattern: /^\/size-guide$/, title: 'Clothing Size Guide | ZAVIKOO', description: 'Use the ZAVIKOO size guide to compare a garment you already own with product information and choose a starting point for fit.' },
  { pattern: /^\/shipping-policy$/, title: 'Shipping Information | ZAVIKOO', description: 'Read the available ZAVIKOO shipping information and contact the studio if you need help with delivery details for an order.' },
  { pattern: /^\/returns-exchanges$/, title: 'Returns & Exchanges | ZAVIKOO', description: 'Read ZAVIKOO returns and exchange guidance, then contact the studio before sending a product back for review.' },
  { pattern: /^\/privacy-policy$/, title: 'Privacy Policy | ZAVIKOO', description: 'Learn what details the ZAVIKOO store may request to support accounts, orders, customer enquiries, and store operations.' },
  { pattern: /^\/terms-and-conditions$/, title: 'Terms & Conditions | ZAVIKOO', description: 'Review the store terms for product details, order requests, custom designs, and the information shown during checkout.' },
  { pattern: /^\/guides$/, title: 'Clothing Guides | ZAVIKOO', description: 'Read practical guides to garment sizing, artwork preparation, printed-clothing care, and planning a custom clothing enquiry.' },
  { pattern: /^\/guides\/([^/]+)$/, title: '{slug} Guide | ZAVIKOO', description: 'Read a practical ZAVIKOO guide with garment and artwork considerations, useful checklists, and links to relevant store information.' },
];

export const privateRoute = /^\/(?:admin(?:\/|$)|account(?:\/|$)|cart(?:\/|$)|checkout(?:\/|$)|login$|register$|forgot-password$|reset-password$|wishlist$|order-confirmation(?:\/|$))/;

export function formatSlug(value) {
  return decodeURIComponent(value || '')
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

export function normalizeTitle(value) {
  return value.length > 60 ? `${value.slice(0, 57).trimEnd()}...` : value;
}

export function normalizeDescription(value) {
  const withMinimumLength = value.length < 140
    ? `${value} Review the information shown on this page and contact the studio with any questions.`
    : value;
  return withMinimumLength.length > 160
    ? `${withMinimumLength.slice(0, 157).trimEnd()}...`
    : withMinimumLength;
}

export function getPageMetadata(pathname) {
  const metadata = pageMetadata.find(({ pattern }) => pattern.test(pathname));
  const slug = pathname.split('/').filter(Boolean).at(-1);
  return {
    metadata,
    title: metadata?.title.replaceAll('{slug}', formatSlug(slug)) || 'Page not found | ZAVIKOO',
    description: metadata?.description.replaceAll('{slug}', formatSlug(slug))
      || 'This ZAVIKOO page could not be found. Browse the shop, collections, or contact the studio for help.',
  };
}
