type Slice = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  title: string;
  subtitle?: string;
  slices: Slice[];
};

function buildConic(slices: Slice[], total: number) {
  let start = 0;
  const stops = slices.map((slice) => {
    const pct = total ? (slice.value / total) * 100 : 0;
    const end = start + pct;
    const entry = `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return entry;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function PieChart({ title, subtitle, slices }: Props) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  let running = 0;
  const labels = slices
    .map((slice) => {
      const pct = total ? (slice.value / total) * 100 : 0;
      const start = running;
      const end = running + pct;
      running = end;
      return {
        label: slice.label,
        pct,
        color: slice.color,
        mid: start + pct / 2
      };
    })
    .filter((slice) => slice.pct >= 5);

  const center = 100;
  const outerRadius = 80;
  const lineStart = outerRadius + 4;
  const lineEnd = outerRadius + 18;
  const labelRadius = outerRadius + 34;

  return (
    <div className="pie-card">
      <div className="pie-title">
        <h4>{title}</h4>
        {subtitle && <span className="small">{subtitle}</span>}
      </div>
      <div className="pie-wrap">
        <div className="pie" style={{ background: buildConic(slices, total) }} />
        <svg className="pie-overlay" viewBox="0 0 200 200" aria-hidden="true">
          {labels.map((slice) => {
            const angle = slice.mid * 3.6 - 90;
            const radians = (angle * Math.PI) / 180;
            const x1 = center + Math.cos(radians) * lineStart;
            const y1 = center + Math.sin(radians) * lineStart;
            const x2 = center + Math.cos(radians) * lineEnd;
            const y2 = center + Math.sin(radians) * lineEnd;
            const x3 = center + Math.cos(radians) * labelRadius;
            const y3 = center + Math.sin(radians) * labelRadius;
            const anchor =
              angle > 90 && angle < 270 ? "end" : angle === 90 || angle === 270 ? "middle" : "start";
            return (
              <g key={`${slice.label}-label`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={slice.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <text
                  x={x3}
                  y={y3}
                  fill={slice.color}
                  fontSize="12"
                  fontWeight="700"
                  textAnchor={anchor}
                  dominantBaseline="middle"
                >
                  {Math.round(slice.pct)}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="legend-grid">
        {slices.map((slice) => (
          <div key={slice.label} className="legend-item">
            <span className="dot" style={{ background: slice.color }} />
            <span>{slice.label}</span>
            <strong>{slice.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
