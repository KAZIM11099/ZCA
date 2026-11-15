let lenisInstance = null;

export function setSmoothScrollInstance(instance) {
  lenisInstance = instance;
}

export function scrollToTop({ immediate = false } = {}) {
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { immediate });
    return;
  }

  window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
}

