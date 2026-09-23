import '@testing-library/jest-dom/vitest';

// Recharts' ResponsiveContainer calls `new ResizeObserver(...)` on mount, and
// jsdom has none. The chart components are lazy-loaded (next/dynamic, ssr:false)
// so they can mount on a LATER tick — after a per-file stub would have been torn
// down by its afterAll — which would otherwise throw "ResizeObserver is not
// defined" from a stray async mount and flake whichever test file happened to be
// running. A stable global stub makes the constructor a harmless no-op whenever
// it fires. It measures nothing (jsdom reports 0x0), so it does not make a chart
// actually draw; it only stops the constructor from throwing.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
