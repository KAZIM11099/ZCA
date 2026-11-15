import { businessFacts } from '../content/businessFacts.js';

const socialLinks = [
  {
    name: 'Instagram',
    href: businessFacts.instagramUrl,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.15rem] w-[1.15rem]" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.7" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'TikTok',
    href: businessFacts.tiktokUrl,
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[1.15rem] w-[1.15rem]" fill="currentColor">
        <path d="M19.6 7.6a6.5 6.5 0 0 1-4.1-1.5v8.2a5.7 5.7 0 1 1-5.7-5.7c.4 0 .8 0 1.2.1v3.2a2.5 2.5 0 1 0 1.3 2.2V2.8h3.2c.2 2 1.8 3.6 4.1 3.8v3.3Z" />
      </svg>
    ),
  },
];

/** `tone="dark"` is for use on cargo-black surfaces. */
export function SocialLinks({ className = '', tone = 'light' }) {
  const palette = tone === 'dark'
    ? 'border-sand/30 text-sand hover:border-sand hover:bg-sand hover:text-cargo'
    : 'border-ink/25 text-ink hover:border-ink hover:bg-ink hover:text-chalk';
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {socialLinks.filter(({ href }) => href).map(({ name, href, icon }) => (
        <a key={name} href={href} target="_blank" rel="noreferrer" aria-label={`Follow ZAVIKOO on ${name}`} className={`inline-flex h-11 w-11 items-center justify-center border transition duration-base ${palette}`}>
          {icon}
        </a>
      ))}
    </div>
  );
}
