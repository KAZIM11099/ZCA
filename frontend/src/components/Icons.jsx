/** Thin-stroke icon set shared across the storefront (inherits currentColor). */
const base = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
};

export function IconHeart({ filled = false, className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 20.2s-7.6-4.6-7.6-10.3A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.6 2.6c0 5.7-7.6 10.3-7.6 10.3Z" />
    </svg>
  );
}
export function IconBag({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className}>
      <path d="M5.2 8.2h13.6l.9 11.3H4.3L5.2 8.2Z" />
      <path d="M8.6 10.2V7.4a3.4 3.4 0 0 1 6.8 0v2.8" />
    </svg>
  );
}
export function IconUser({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8.4" r="3.7" />
      <path d="M4.6 20c.6-3.7 3.8-5.8 7.4-5.8s6.8 2.1 7.4 5.8" />
    </svg>
  );
}
export function IconMenu({ className = 'h-6 w-6' }) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 8h17M3.5 16h11" />
    </svg>
  );
}
export function IconClose({ className = 'h-6 w-6' }) {
  return (
    <svg {...base} className={className}>
      <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
    </svg>
  );
}
export function IconArrow({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className}>
      <path d="M3.5 12h16M14 6.5 19.5 12 14 17.5" />
    </svg>
  );
}
export function IconArrowUpRight({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className}>
      <path d="M7 17 17 7M8.5 7H17v8.5" />
    </svg>
  );
}
export function IconPlus({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
export function IconMinus({ className = 'h-4 w-4' }) {
  return (
    <svg {...base} className={className}>
      <path d="M5 12h14" />
    </svg>
  );
}
export function IconTrash({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className}>
      <path d="M4.5 7.5h15M9 7.5V5h6v2.5M7 7.5l.8 12h8.4l.8-12M10 11v5.5M14 11v5.5" />
    </svg>
  );
}
export function IconChevronDown({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg {...base} className={className}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}
export function IconStar({ className = 'h-4 w-4', filled = true }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
      <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 17l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8L12 3.6Z" />
    </svg>
  );
}
export function IconSpark({ className = 'h-5 w-5' }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5c.7 4.6 3.9 7.8 8.5 8.5-4.6.7-7.8 3.9-8.5 8.5-.7-4.6-3.9-7.8-8.5-8.5 4.6-.7 7.8-3.9 8.5-8.5Z" />
    </svg>
  );
}
