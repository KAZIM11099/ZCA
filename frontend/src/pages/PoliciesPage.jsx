import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/PageHead.jsx';

const policyContent = {
  'size-guide': {
    label: 'Find your fit',
    heading: 'A little help finding your size.',
    intro: 'ZAVIKOO garments have a relaxed oversized streetwear fit. Ready-made pieces are listed in S, M, L, and XL; custom T-shirt orders can also request XS with measurements.',
    highlights: [
      { number: '01', title: 'Start with a favourite', copy: 'Choose a similar item from your wardrobe that already fits the way you like.' },
      { number: '02', title: 'Measure it flat', copy: 'Lay it smooth without stretching. Measure across the chest and from the shoulder to the hem.' },
      { number: '03', title: 'Check the options', copy: 'Ready-made sizes are S, M, L, and XL. Custom T-shirt designs also allow XS when you provide chest and length measurements.' },
    ],
    notes: [
      ['Between sizes?', 'Compare the measurements with a garment that fits you well. Contact the studio if you need help choosing between the listed sizes.'],
      ['Ordering custom XS?', 'For custom T-shirts in XS, provide chest and length measurements in the design tool.'],
      ['Need exact measurements?', 'Ask the studio for measurements for the specific product and size you are considering.'],
    ],
    action: { label: 'Explore the collection', to: '/shop' },
  },
  shipping: {
    label: 'Delivery, thoughtfully handled',
    heading: 'From our studio to your door.',
    intro: 'ZAVIKOO delivers across Pakistan with free delivery. Orders usually arrive in about 5–7 working days after confirmation; public holidays and courier delays may add time.',
    highlights: [
      { number: '01', title: 'Delivery across Pakistan', copy: 'Delivery is free across Pakistan. The estimated delivery time is about 5–7 working days after your order is confirmed.' },
      { number: '02', title: 'Cash on delivery', copy: 'Cash on Delivery is the available payment method. Pay the courier rider in cash when your parcel arrives.' },
      { number: '03', title: 'Confirmation and tracking', copy: 'The studio may contact you by phone or WhatsApp to confirm order details. Tracking details are shared by email or WhatsApp when available.' },
    ],
    notes: [
      ['Custom orders', 'Custom-order production timing can depend on the design. The studio will confirm the expected schedule for your order; no separate production estimate is promised here.'],
      ['Courier delays', 'Public holidays and courier delays may affect the estimated delivery time. Keep your phone available after ordering in case the studio needs to confirm your address.'],
      ['When your parcel arrives', 'Please check the parcel on delivery. A short unboxing video can help the studio review a report about a damaged or incorrect item.'],
    ],
    action: { label: 'Contact the studio', to: '/contact' },
  },
  privacy: {
    label: 'Your information, handled with care',
    heading: 'Your privacy matters.',
    intro: 'This overview explains what information the store asks for and how it is used to support shopping, orders, and customer service.',
    highlights: [
      { number: '01', title: 'Information you share', copy: 'This may include your name, email, phone number, delivery address, account details, and messages you send to our team.' },
      { number: '02', title: 'Why we use it', copy: 'We use relevant details to manage your account, confirm and deliver orders, respond to enquiries, and maintain store operations.' },
      { number: '03', title: 'Your choices', copy: 'You can review and update profile details in your account. Contact us for help with information linked to an order or enquiry.' },
    ],
    notes: [
      ['Order fulfilment', 'Details submitted during an order or enquiry are used to respond to that request and support store operations.'],
      ['Website analytics', 'Google Analytics 4 is used to understand website visits and interactions such as product views, cart activity, checkout starts, and enquiries. Store analytics events are configured not to send names, email addresses, phone numbers, or delivery addresses. Google may process browser, device, and usage data under its own privacy terms.'],
      ['Keeping information safe', 'No online service can promise absolute security. Review the privacy policy and contact the studio with questions about your information.'],
      ['Questions or requests', 'Contact the studio to ask about personal information associated with your account, order, or message. We may need to verify your identity before acting on a request.'],
    ],
    action: { label: 'Contact us about privacy', to: '/contact' },
  },
  returns: {
    label: 'Returns & exchanges',
    heading: 'If something isn’t right, let’s talk.',
    intro: 'Customised items cannot be returned or exchanged for change of mind. Ready-made items may be exchanged within 7 days of delivery. If an item is wrong or defective, contact the studio so the issue can be put right.',
    highlights: [
      { number: '01', title: 'Customised items', copy: 'Custom-designed items are made for you and cannot be returned or exchanged for a change of mind, size preference, colour preference, or unwanted design.' },
      { number: '02', title: 'Ready-made items', copy: 'Request an exchange within 7 days of delivery. The item must be unworn, unwashed, undamaged, and returned with tags and original packaging.' },
      { number: '03', title: 'Our mistake or a defect', copy: 'If you receive the wrong item or there is a production defect, contact us with your order number and clear photos. We will correct an issue that is our responsibility without charging you delivery.' },
    ],
    notes: [
      ['What counts as customised?', 'Items made through the Customize tool, custom quote requests, custom names, or customer-provided text, pictures, or artwork count as customised.'],
      ['Exchange delivery', 'For a ready-made exchange requested because of size or colour preference, the customer pays the exchange delivery charge.'],
      ['How to request help', 'Email zavikoocustomatelier@gmail.com or WhatsApp 0335 2794601 with your order number and a short description. Please do not send a parcel back until we confirm instructions.'],
      ['What is not covered?', 'We cannot correct spelling or artwork that matches the design you approved, customer-supplied measurements, screen-to-fabric colour differences, or damage caused by wear or care contrary to the garment instructions.'],
      ['Your legal rights', 'Nothing on this page limits your rights under applicable Pakistani consumer protection law.'],
    ],
    action: { label: 'Ask about a return', to: '/contact' },
  },
  terms: {
    label: 'Terms & conditions',
    heading: 'The details behind every order.',
    intro: 'Review product details, selected options, and the final amount before submitting an order or a custom design request.',
    highlights: [
      { number: '01', title: 'Product details', copy: 'Review the product description, available options, and price shown on the product page before ordering. Contact the studio if something is unclear.' },
      { number: '02', title: 'Order processing', copy: 'Review the payment and delivery information presented for your order before you submit it.' },
      { number: '03', title: 'Custom designs', copy: 'When submitting a custom design, you confirm you have the rights to use the content. Designs may be reviewed before production.' },
    ],
    notes: [
      ['Pricing and availability', 'Product prices are shown in PKR. Product options and availability can vary; the details displayed for the selected item apply to your order request.'],
      ['Delivery', 'Confirm delivery coverage, charges, and expected timing with the studio before ordering.'],
      ['Returns and privacy', 'Review the returns page before sending an item back. See the privacy policy for information about details shared with the store.'],
    ],
    action: { label: 'Contact the studio', to: '/contact' },
  },
};

function SimplePolicy({ content }) {
  return (
    <section className="page py-12 md:py-20">
      <h1 className="display-l">{content.heading}</h1>
      <p className="lede mt-6">{content.body}</p>
    </section>
  );
}

const goodToKnow = {
  'size-guide': 'Relaxed oversized fit · S–XL ready-made · custom tee XS by measurement.',
  shipping: 'Free delivery across Pakistan · about 5–7 working days · Cash on Delivery.',
  privacy: 'Only share the details needed for your request.',
  returns: 'Ready-made exchange: 7 days · custom change-of-mind returns: not accepted.',
  terms: 'Review the item details before you place an order.',
};
const sectionTitle = {
  'size-guide': 'Choose a fit that feels like you.',
  shipping: 'The journey, step by step.',
  returns: 'A simple way to get help.',
  terms: 'What to expect when shopping.',
  privacy: 'From your details to your choices.',
};
const notesTitle = {
  'size-guide': 'Still deciding?',
  shipping: 'Before your order arrives.',
  returns: 'A few things to know.',
  terms: 'Other important details.',
  privacy: 'Your questions are welcome.',
};

export default function PoliciesPage({ type = 'shipping' }) {
  const content = policyContent[type];
  if (!content) return <SimplePolicy content={{ heading: 'Store information', body: 'Please contact our studio if you have questions about shopping with ZAVIKOO.' }} />;

  return (
    <div>
      <header className="page pb-12 pt-10 md:pb-20 md:pt-14">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: content.label }]} />
        <div className="grid items-end gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-20">
          <div>
            <h1 className="display-l max-w-3xl">{content.heading}</h1>
            <p className="lede mt-6">{content.intro}</p>
          </div>
          <div className="border-l-2 border-brass py-1 pl-7">
            <p className="font-display text-[1.75rem] leading-snug">{goodToKnow[type]}</p>
          </div>
        </div>
      </header>

      <section className="border-y border-ink/10 bg-chalk">
        <div className="page grid gap-10 py-16 md:grid-cols-[0.8fr_1.2fr] md:gap-20 md:py-24">
          <h2 className="display-m max-w-md">{sectionTitle[type]}</h2>
          <ol className="divide-y divide-ink/15 border-y border-ink/15">
            {content.highlights.map((item, index) => (
              <li key={item.title} className="grid gap-3 py-7 sm:grid-cols-[3rem_1fr] sm:gap-6">
                <span className="font-display text-[1.6rem] leading-none text-brass-deep">{index + 1}</span>
                <div>
                  <h3 className="font-body text-[1.0625rem] font-semibold tracking-normal">{item.title}</h3>
                  <p className="mt-2 max-w-xl text-[1rem] leading-7 text-stone">{item.copy}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="page grid gap-10 py-16 md:grid-cols-[0.8fr_1.2fr] md:gap-20 md:py-24">
        <h2 className="display-m max-w-md">{notesTitle[type]}</h2>
        <div className="divide-y divide-ink/15 border-y border-ink/15">
          {content.notes.map(([title, copy]) => (
            <article key={title} className="py-7">
              <h3 className="font-body text-[1.0625rem] font-semibold tracking-normal">{title}</h3>
              <p className="mt-2 max-w-2xl text-[1rem] leading-7 text-stone">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="on-dark bg-olive text-sand">
        <div className="page flex flex-col gap-8 py-16 sm:flex-row sm:items-center sm:justify-between md:py-20">
          <div>
            <h2 className="display-m text-chalk">Let’s find the right answer.</h2>
            <p className="mt-4 max-w-xl leading-7 text-sand/70">Our studio team can help with product questions, delivery details, or information about your account.</p>
          </div>
          <Link to={content.action.to} className="btn btn-sand shrink-0">{content.action.label}</Link>
        </div>
      </section>
    </div>
  );
}
