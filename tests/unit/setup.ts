import '@testing-library/jest-dom/vitest';

/**
 * jsdom has no ResizeObserver at all, and Recharts 2.15's ResponsiveContainer
 * calls `new ResizeObserver(...)` unconditionally in its mount effect — with no
 * feature check. Without this stub every test that renders a Recharts chart
 * throws `ReferenceError: ResizeObserver is not defined` before any assertion
 * runs, even ones (like the ScansArea metric toggle) that never touch the SVG.
 *
 * This is NOT the "force the chart to render" shim the task briefs warn
 * against: jsdom's `getBoundingClientRect()` still reports 0x0, so
 * ResponsiveContainer still measures nothing and the SVG still does not draw.
 * This stub only stops the constructor call from crashing the render.
 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).ResizeObserver ??= ResizeObserverStub;
