import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'zavikoo-cart';

function designFingerprint(design) {
  const serialized = JSON.stringify(design);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < serialized.length; index += 1) {
    const code = serialized.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${serialized.length}-${(first >>> 0).toString(36)}-${(second >>> 0).toString(36)}`;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (product, variant = {}, quantity = 1) => {
    const design = variant.design || null;
    const key = `${product.sku || product.slug}-${variant.color || 'default'}-${variant.size || 'onesize'}-${design ? designFingerprint(design) : 'standard'}`;
    setItems((current) => {
      const existing = current.find((item) => item.uniqueKey === key);
      if (existing) {
        return current.map((item) => (item.uniqueKey === key ? { ...item, quantity: item.quantity + quantity } : item));
      }

      return [
        ...current,
        {
          uniqueKey: key,
          id: product.id,
          customProductId: product.isCustomProduct ? product.id : undefined,
          slug: product.slug,
          sku: product.sku,
          name: product.name,
          image: product.image,
          price: variant.unitPricePaisa ?? product.salePricePaisa ?? product.basePricePaisa,
          color: variant.color || product.colors?.[0] || 'Default',
          size: variant.size || product.sizes?.[0] || 'One size',
          design,
          quantity,
        },
      ];
    });
  };

  const updateQuantity = (uniqueKey, quantity) => {
    setItems((current) => {
      if (quantity <= 0) {
        return current.filter((item) => item.uniqueKey !== uniqueKey);
      }

      return current.map((item) => (item.uniqueKey === uniqueKey ? { ...item, quantity } : item));
    });
  };

  const removeItem = (uniqueKey) => {
    setItems((current) => current.filter((item) => item.uniqueKey !== uniqueKey));
  };

  const replaceItem = (uniqueKey, product, variant = {}) => {
    const design = variant.design || null;
    const replacementKey = `${product.sku || product.slug}-${variant.color || 'default'}-${variant.size || 'onesize'}-${design ? designFingerprint(design) : 'standard'}`;
    setItems((current) => current.map((item) => (
      item.uniqueKey === uniqueKey
        ? {
          ...item,
          uniqueKey: replacementKey,
          id: product.id,
          customProductId: product.isCustomProduct ? product.id : undefined,
          slug: product.slug,
          sku: product.sku,
          name: product.name,
          image: product.image,
          price: variant.unitPricePaisa ?? product.salePricePaisa ?? product.basePricePaisa,
          color: variant.color || product.colors?.[0] || 'Default',
          size: variant.size || product.sizes?.[0] || 'One size',
          design,
        }
        : item
    )));
  };

  const clearCart = () => setItems([]);

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((total, item) => total + item.price * item.quantity, 0), [items]);

  const value = { items, addItem, updateQuantity, removeItem, replaceItem, clearCart, itemCount, subtotal };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}

