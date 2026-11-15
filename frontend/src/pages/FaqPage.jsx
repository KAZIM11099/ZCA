import { Link } from 'react-router-dom';
import { PageHead } from '../components/PageHead.jsx';
import { IconPlus } from '../components/Icons.jsx';
import { Seo } from '../components/Seo.jsx';
import { faqJsonLd } from '../lib/jsonld.js';

export const faqs = [
  {
    category: 'Ordering & custom design',
    question: 'Can I add my own text or artwork to a garment?',
    answer: 'Yes, the custom design tool lets you arrange text or upload artwork on supported garments. Review the preview and displayed price before adding the design to your order. Check the selected product page to confirm customization is available.',
  },
  {
    category: 'Ordering & custom design',
    question: 'Can I request a design that is not shown in the tool?',
    answer: 'Yes, send the studio a custom quote request with your garment idea, artwork, quantity, and preferred timing. The studio can review the brief and confirm what is possible. The form includes space for notes and an optional image.',
  },
  {
    category: 'Ordering & custom design',
    question: 'Can a team or business request a clothing quote?',
    answer: 'Yes, use the custom quote form to share a team, event, brand, or business clothing brief. Include garment types, artwork, quantity, size breakdown, and requested date. A clear quantity and size list helps the studio assess the request.',
  },
  {
    category: 'Ordering & custom design',
    question: 'What should I include in a custom clothing request?',
    answer: 'Include the garment you have in mind, quantity, sizes, colour preference, artwork, print placement, and the date you need the order. The studio can then review the details and ask for anything missing.',
  },
  {
    category: 'Artwork & printing',
    question: 'Which artwork file types can I upload?',
    answer: 'The custom quote form currently accepts PNG, JPG, and WebP image files up to 4 MB. If you have another file format, contact the studio before submitting your project so the team can confirm whether it can be reviewed.',
  },
  {
    category: 'Artwork & printing',
    question: 'What resolution should my artwork have?',
    answer: 'Use the highest-resolution original file available, especially for detailed artwork. Avoid enlarging a small or blurry image, as this can reduce print clarity. If unsure, send the file and intended print size with your request so the studio can check it before you order.',
  },
  {
    category: 'Artwork & printing',
    question: 'Can I send a logo with a transparent background?',
    answer: 'A transparent PNG can be useful when the design should not have a rectangular background. Check the exported image against light and dark colours, then ask the studio whether the file suits the intended garment and print method.',
  },
  {
    category: 'Artwork & printing',
    question: 'Can the studio help me prepare artwork?',
    answer: 'Describe the help you need in the custom quote form or contact message. The studio can confirm whether artwork assistance is available and whether it affects the project quote. Include your deadline and a brief description of the requested help.',
  },
  {
    category: 'Sizing & fit',
    question: 'What sizes do ZAVIKOO T-shirts and hoodies come in?',
    answer: 'Ready-made T-shirts and hoodies are offered in S, M, L, and XL with a relaxed oversized fit. Custom T-shirt designs also allow XS when you provide chest and length measurements in the design tool.',
  },
  {
    category: 'Sizing & fit',
    question: 'How do I choose a size online?',
    answer: 'Measure a garment you already own while it is laid flat, then compare it with measurements supplied for the product. If you cannot find a chart for the item, contact the studio with the product name.',
  },
  {
    category: 'Sizing & fit',
    question: 'Are drop-shoulder and regular T-shirts the same fit?',
    answer: 'They are different garment silhouettes. Review the product description and available measurements for the selected item, and ask the studio if you need help comparing its fit with a garment you own.',
  },
  {
    category: 'Sizing & fit',
    question: 'Can I request custom measurements?',
    answer: 'Ask the studio before placing an order and share the garment and measurements you need. Availability and any price or production implications must be confirmed for your specific request. Confirm the available options before paying.',
  },
  {
    category: 'Production & delivery',
    question: 'How long does delivery take in Pakistan?',
    answer: 'Delivery usually takes about 5–7 working days after your order is confirmed, across Pakistan. Public holidays or courier delays may add time. For a custom design, ask the studio to confirm the expected schedule for your specific order.',
  },
  {
    category: 'Production & delivery',
    question: 'Do you deliver to Karachi or other cities in Pakistan?',
    answer: 'Yes, ZAVIKOO delivers all over Pakistan, including cities outside Karachi. Delivery is free, and parcels usually arrive in about 5–7 working days after order confirmation, subject to public holidays and courier delays.',
  },
  {
    category: 'Production & delivery',
    question: 'How much is delivery?',
    answer: 'Delivery is free across Pakistan, and the checkout shows no delivery charge. Your order total is the product and design price shown before submission. Delivery usually takes about 5–7 working days after confirmation.',
  },
  {
    category: 'Production & delivery',
    question: 'How can I ask about an order I already placed?',
    answer: 'Use the Contact page and include your order number and the email or phone used for the order. Do not send payment details or passwords in a message. Use only the store’s official contact form.',
  },
  {
    category: 'Payment',
    question: 'Which payment methods are available?',
    answer: 'Cash on Delivery is the payment method currently accepted. Pay the courier rider in cash when your parcel arrives. The website does not ask you to enter card details to place an order.',
  },
  {
    category: 'Payment',
    question: 'Will I see the full order amount before submitting?',
    answer: 'Review the product price, selected options, and any delivery amount displayed during checkout. Contact the studio if a charge or order detail is unclear before submission. If anything is missing or unclear, ask the studio before submitting.',
  },
  {
    category: 'Returns & exchanges',
    question: 'Can I return or exchange an item?',
    answer: 'Ready-made items may be exchanged within 7 days of delivery if unworn, unwashed, undamaged, and returned with tags and original packaging. Customised items cannot be exchanged for change of mind. Contact the studio before sending anything back.',
  },
  {
    category: 'Returns & exchanges',
    question: 'What if a custom print arrives with a problem?',
    answer: 'Message the studio with your order number and clear photos of the issue. If the wrong item arrived or there is a production defect, the studio will correct the issue and cover the delivery costs. Contact us before returning the parcel.',
  },
  {
    category: 'Returns & exchanges',
    question: 'Should I ship a return before contacting you?',
    answer: 'No, contact the studio first and wait for instructions. This helps the team review your request and tell you where and how an item should be sent. Wait for the team’s reply before arranging shipment.',
  },
  {
    category: 'Care',
    question: 'How should I wash a printed garment?',
    answer: 'T-shirts use heavyweight cotton and pullover hoodies use thick winter fleece. Follow the item’s care-label instructions first. To help protect printed artwork, avoid ironing directly over the print, and contact the studio if the care label is unclear.',
  },
  {
    category: 'Bulk orders',
    question: 'Can I order custom T-shirts in bulk in Karachi?',
    answer: 'Yes, use the custom quote form to share your garment choice, quantity, size breakdown, artwork, and requested date. Ask the studio to confirm minimum quantities, pricing, production timing, and delivery for your project before approving it.',
  },
  {
    category: 'Artwork & printing',
    question: 'How are custom designs printed?',
    answer: 'Detailed custom artwork is printed using DTF. Selected designs use custom embroidered patches attached with heat. If you have a specific artwork or placement in mind, describe it in your quote request so the studio can confirm suitability.',
  },
  {
    category: 'Ordering & custom design',
    question: 'Can you make Urdu or Arabic calligraphy designs?',
    answer: 'Yes, you can request Urdu or Arabic calligraphy, as well as English text. Share the wording and style you want through the custom quote form; the studio will discuss your design before the order is made.',
  },
  {
    category: 'Returns & exchanges',
    question: 'Who pays the delivery cost for an exchange?',
    answer: 'For a ready-made exchange requested because of size or colour preference, the customer pays the exchange delivery charge. If the issue is the studio’s mistake or a production defect, the studio covers the delivery costs.',
  },
  {
    category: 'Care',
    question: 'Can I iron directly on the print?',
    answer: 'Avoid placing a hot iron directly on artwork unless the care instructions say it is safe. Check the garment label or contact the studio for guidance about the specific product.',
  },
  {
    category: 'Account & support',
    question: 'How do I contact ZAVIKOO Custom Atelier?',
    answer: 'Call or WhatsApp 0335 2794601, or email zavikoocustomatelier@gmail.com. Use the Contact page for a product or order question; use the custom quote form to share a team or larger clothing project.',
  },
  {
    category: 'Account & support',
    question: 'Do I need an account to place an order?',
    answer: 'The current checkout asks customers to sign in before placing an order. Use the account links in the site navigation if you need to create an account or sign in.',
  },
  {
    category: 'Account & support',
    question: 'How can I reset my password?',
    answer: 'Open the sign-in page and choose the password-reset option. Enter the email associated with your account and follow the instructions sent to that address. Use the reset page to request a secure reset link.',
  },
];

const categories = [...new Set(faqs.map((faq) => faq.category))];

export default function FaqPage() {
  return (
    <>
      <Seo jsonLd={[faqJsonLd(faqs)]} />
      <PageHead title="Frequently asked questions" intro="Useful details about custom pieces, orders, delivery, and getting in touch with our atelier." crumbs={[{ label: 'Home', to: '/' }, { label: 'FAQ' }]}>
        <Link to="/contact" className="link-line">Still have a question? Contact us</Link>
      </PageHead>

      <div className="page grid gap-12 pb-24 md:pb-32 lg:grid-cols-[14rem_1fr] lg:gap-24">
        <aside className="h-fit lg:sticky lg:top-28">
          <p className="text-[0.9375rem] font-semibold">On this page</p>
          <nav className="mt-4 flex flex-wrap gap-x-6 gap-y-2 lg:flex-col lg:gap-3" aria-label="FAQ categories">
            {categories.map((category, index) => (
              <a key={category} href={`#faq-${index}`} className="text-[0.9375rem] text-stone transition hover:text-cargo">{category}</a>
            ))}
          </nav>
        </aside>

        <div className="space-y-16">
          {categories.map((category, index) => (
            <section key={category} id={`faq-${index}`} className="scroll-mt-32">
              <h2 className="display-m border-b border-ink/20 pb-5">{category}</h2>
              <div className="divide-y divide-ink/15">
                {faqs.filter((faq) => faq.category === category).map((faq) => (
                  <details key={faq.question} className="group py-6">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[1.125rem] font-medium">
                      {faq.question}
                      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center border border-ink/25 transition duration-base group-open:rotate-45 group-open:bg-cargo group-open:text-chalk"><IconPlus /></span>
                    </summary>
                    <p className="max-w-2xl pr-12 pt-4 text-[1rem] leading-8 text-stone">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
