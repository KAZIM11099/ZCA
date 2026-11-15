import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconClose, IconSpark } from './Icons.jsx';

const suggestions = [
  'How do I customize a garment?',
  'How do I ask about my order?',
  'How do I request a quote?',
  'What are the delivery options?',
];

function getReply(message) {
  const text = message.toLowerCase();
  const has = (...terms) => terms.some((term) => text.includes(term));

  if (has('hello', 'hi', 'salam', 'assalam', 'hey')) {
    return {
      text: 'Wa alaikum salam! I can help with products, custom designs, orders, delivery, sizing, and quotes. What would you like to know?',
      links: [],
    };
  }
  if (has('track', 'tracking', 'order status', 'where is my order', 'order kaha', 'order kahan', 'parcel')) {
    return {
      text: 'Online order tracking is not available right now. For an update, contact the studio with your order number.',
      links: [{ label: 'Contact the studio', to: '/contact' }],
    };
  }
  if (has('customize', 'customise', 'design', 'artwork', 'upload', 'text on', 'print')) {
    return {
      text: 'Open Customize, choose a garment, color, and size, then add text or upload artwork. On the preview, drag the design to place it and use its handle to resize. Confirm that you have permission to use the artwork before continuing.',
      links: [{ label: 'Start customizing', to: '/customize' }],
    };
  }
  if (has('quote', 'bulk', 'wholesale', 'uniform', 'team order', 'quantity', 'large order', 'custom order')) {
    return {
      text: 'For bulk orders, uniforms, events, or a project with special requirements, send the studio a quote request. Include the quantity and project details so the team can prepare a suitable proposal.',
      links: [{ label: 'Request a custom quote', to: '/custom-quote' }],
    };
  }
  if (has('size', 'sizing', 'fit', 'measure')) {
    return {
      text: 'Please check the Size guide before ordering. If you need help with a particular fit, contact the studio with the product name and your measurements.',
      links: [
        { label: 'View size guide', to: '/size-guide' },
        { label: 'Contact the studio', to: '/contact' },
      ],
    };
  }
  if (has('delivery', 'shipping', 'deliver', 'ship', 'dispatch', 'courier')) {
    return {
      text: 'ZAVIKOO supports shipping across Pakistan. Production and delivery timing can vary by product and order size; the team confirms the expected timing while reviewing your order. Contact the studio with your order number if you need a delivery update.',
      links: [
        { label: 'Shipping information', to: '/shipping-policy' },
        { label: 'Contact the studio', to: '/contact' },
      ],
    };
  }
  if (has('return', 'refund', 'exchange', 'cancel')) {
    return {
      text: 'Please review the returns and exchanges policy for the applicable terms. For help with a specific order, contact the studio and include your order number.',
      links: [
        { label: 'Returns and exchanges', to: '/returns-exchanges' },
        { label: 'Contact the studio', to: '/contact' },
      ],
    };
  }
  if (has('pay', 'payment', 'cash', 'cod', 'checkout', 'place order', 'order nahi', 'order nahin')) {
    return {
      text: 'Add your product or custom design to the bag, open Checkout, and complete the delivery details. Cash on delivery is currently available. If checkout shows an error, keep your cart and contact the studio with the exact message.',
      links: [
        { label: 'Open my bag', to: '/cart' },
        { label: 'Contact support', to: '/contact' },
      ],
    };
  }
  if (has('account', 'login', 'log in', 'sign in', 'password', 'saved design', 'my design')) {
    return {
      text: 'Sign in from the Account page to manage your profile, saved addresses, orders, and saved designs. If you cannot access your account, contact the studio for help.',
      links: [
        { label: 'Go to account', to: '/account' },
        { label: 'Contact support', to: '/contact' },
      ],
    };
  }
  if (has('contact', 'human', 'person', 'agent', 'support', 'help', 'representative', 'team se')) {
    return {
      text: 'You can send the studio a message from the Contact page. For bulk or made-to-order projects, the Custom quote form is the best place to share your requirements.',
      links: [
        { label: 'Contact the studio', to: '/contact' },
        { label: 'Request a custom quote', to: '/custom-quote' },
      ],
    };
  }
  if (has('product', 'collection', 'shop', 'color', 'colour', 'available')) {
    return {
      text: 'Browse the shop and collections to see available products and options. Product pages show current colors, sizes, prices, and availability.',
      links: [
        { label: 'Browse the shop', to: '/shop' },
        { label: 'Explore collections', to: '/collections' },
      ],
    };
  }

  return {
    text: 'I can help with shopping, custom designs, sizing, delivery, order updates, checkout, and quote requests. I may not have enough information for this question—send it to the studio and a team member can help.',
    links: [{ label: 'Contact the studio', to: '/contact' }],
  };
}

export default function CustomerSupportChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi! I’m the ZAVIKOO support assistant. Ask me about shopping, custom designs, delivery, orders, or quotes.',
      links: [],
    },
  ]);
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const nextId = useRef(2);

  useEffect(() => {
    if (open) {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [messages, open]);

  const sendMessage = (value = input) => {
    const text = value.trim();
    if (!text || busy) return;

    setInput('');
    setBusy(true);
    setMessages((current) => [...current, { id: nextId.current++, sender: 'customer', text, links: [] }]);
    window.setTimeout(() => {
      setMessages((current) => [...current, { id: nextId.current++, sender: 'bot', ...getReply(text) }]);
      setBusy(false);
    }, 350);
  };

  return (
    <div className="customer-chat fixed bottom-4 right-4 z-[45] sm:bottom-6 sm:right-6">
      {open && (
        <section aria-label="ZAVIKOO customer support chat" className="on-dark mb-3 flex h-[min(34rem,calc(100dvh-7rem))] w-[min(23.5rem,calc(100vw-2rem))] flex-col overflow-hidden border border-ink/20 bg-chalk text-ink shadow-lift">
          <header className="flex items-center justify-between bg-cargo px-5 py-4 text-sand">
            <div>
              <p className="font-display text-xl leading-none text-chalk">ZAVIKOO Support</p>
              <p className="mt-1.5 text-[0.8125rem] text-sand/70">Ask us how we can help</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support chat" className="-mr-2 grid h-10 w-10 place-items-center text-sand/80 transition hover:text-sand"><IconClose className="h-5 w-5" /></button>
          </header>

          <div ref={listRef} role="log" aria-live="polite" aria-relevant="additions" className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-paper p-5">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[88%] px-4 py-3 text-[0.9375rem] leading-6 ${message.sender === 'customer' ? 'bg-cargo text-chalk' : 'border border-ink/12 bg-chalk text-ink'}`}>
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.links.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {message.links.map((link) => (
                        <Link key={link.to} onClick={() => setOpen(false)} to={link.to} className="border border-ink/25 px-3 py-1.5 text-[0.8125rem] font-semibold text-ink transition hover:bg-cargo hover:text-chalk">
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && <p className="text-[0.8125rem] text-stone" role="status">Finding a helpful answer…</p>}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" onClick={() => sendMessage(suggestion)} className="border border-ink/20 bg-chalk px-3.5 py-2.5 text-left text-[0.8125rem] font-medium text-stone transition hover:border-ink hover:text-cargo">
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={(event) => { event.preventDefault(); sendMessage(); }} className="flex gap-2 border-t border-ink/12 bg-chalk p-3">
            <label className="sr-only" htmlFor="support-chat-message">Your message</label>
            <input
              ref={inputRef}
              id="support-chat-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={500}
              placeholder="Type your question…"
              className="min-w-0 flex-1 border border-ink/20 bg-chalk px-4 py-2.5 text-[0.9375rem] focus:border-ink focus:outline-none focus:ring-2 focus:ring-brass/40"
            />
            <button type="submit" disabled={!input.trim() || busy} className="bg-cargo px-5 py-2 text-[0.9375rem] font-medium text-chalk transition hover:bg-brass-deep disabled:cursor-not-allowed disabled:opacity-50">
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close customer support chat' : 'Open customer support chat'}
        onClick={() => setOpen((current) => !current)}
        className="on-dark ml-auto flex min-h-[3.25rem] items-center gap-2.5 bg-cargo px-4 sm:px-5 text-[0.9375rem] font-medium text-sand shadow-lift transition duration-base hover:bg-olive"
      >
        {open ? <IconClose className="h-[1.1rem] w-[1.1rem]" /> : <IconSpark className="h-[1.1rem] w-[1.1rem] text-brass" />}
        <span className={open ? '' : 'hidden sm:inline'}>{open ? 'Close' : 'Need help?'}</span>
      </button>
    </div>
  );
}
