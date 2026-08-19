/**
 * Hand-rolled rather than Recharts: a sparkline is a polyline with no axes, no
 * tooltip and no legend, and pulling a chart library into every KPI tile would
 * cost far more than it gives.
 */
export function Sparkline({
  values,
  color,
  width = 96,
  height = 28,
  className,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
  className?: string;
}) {
  // One point is not a line. Rendering a lone dot reads as a bug, not as
  // "not enough data yet".
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const flat = max === min;

  // Half the stroke would be clipped at the extremes without this inset.
  const pad = 2;
  const inner = height - pad * 2;
  const step = width / (values.length - 1);

  // A flat series has no range to scale against; pinning it to the middle
  // avoids dividing by zero and writing NaN into the path, which would make the
  // whole SVG vanish silently.
  const y = (value: number) => (flat ? height / 2 : pad + inner - ((value - min) / (max - min)) * inner);

  const points = values.map((value, i) => `${(i * step).toFixed(2)},${y(value).toFixed(2)}`).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
