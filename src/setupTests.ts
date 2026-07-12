import '@testing-library/jest-dom/vitest'

// jsdom doesn't implement these — Radix UI (Tooltip, Dialog, etc.) needs them.
if (!('ResizeObserver' in globalThis)) {
  class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver = MockResizeObserver
}

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
