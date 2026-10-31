import { cleanup } from "@solidjs/testing-library";
import { afterEach, beforeEach, vi } from "vitest";
beforeEach(() => {
  history.replaceState(null, "", "/");
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi
      .fn()
      .mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
  });
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
