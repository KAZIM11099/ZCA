import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'zavikoo-wishlist';

export function WishlistProvider({ children }) {
  const [slugs, setSlugs] = useState(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter((slug) => typeof slug === 'string') : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
  }, [slugs]);

  const toggle = (slug) => setSlugs((current) => current.includes(slug)
    ? current.filter((savedSlug) => savedSlug !== slug)
    : [...current, slug]);
  const value = useMemo(() => ({ slugs, toggle }), [slugs]);
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) throw new Error('useWishlist must be used within WishlistProvider');
  return context;
}

