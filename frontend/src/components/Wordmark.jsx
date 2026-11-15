/** Typographic brand lockup in the stencil face; colour follows the surrounding text. */
export function Wordmark({ className = '', size = 'md' }) {
  const sizes = {
    sm: ['text-[1.35rem]', 'text-[0.55rem]'],
    md: ['text-[1.9rem]', 'text-[0.62rem]'],
    lg: ['text-[3rem]', 'text-[0.8rem]'],
  };
  const [main, sub] = sizes[size] || sizes.md;
  return (
    <span className={`inline-flex flex-col leading-none ${className}`} aria-label="ZAVIKOO Custom Atelier">
      <span className={`stencil ${main} tracking-[0.06em]`}>ZAVIKOO</span>
      <span className={`mt-2 font-body ${sub} font-semibold tracking-[0.5em]`}>CUSTOM ATELIER</span>
    </span>
  );
}

export function Monogram({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="ZK">
      <rect width="64" height="64" rx="6" fill="#14160F" />
      <path d="M15 17h34v7L27 41h22v6H15v-7l22-17H15z" fill="#D8C8A4" />
      <path d="M15 31h9v4h-9z" fill="#B59A62" />
    </svg>
  );
}
