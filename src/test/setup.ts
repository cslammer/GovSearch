import '@testing-library/jest-dom/vitest';

// jsdom doesn't implement matchMedia; stub it for prefers-reduced-motion checks.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

// jsdom lacks IntersectionObserver / requestIdleCallback used by lazy photos.
if (!('IntersectionObserver' in window)) {
  class IO {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  }
  // @ts-expect-error minimal stub
  window.IntersectionObserver = IO;
}
if (!('requestIdleCallback' in window)) {
  // @ts-expect-error minimal stub
  window.requestIdleCallback = (cb: (deadline: { timeRemaining: () => number }) => void) =>
    setTimeout(() => cb({ timeRemaining: () => 50 }), 0) as unknown as number;
  // @ts-expect-error minimal stub
  window.cancelIdleCallback = (id: number) => clearTimeout(id);
}
