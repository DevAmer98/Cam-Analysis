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

function buildConic(slices: Slice[]) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  let start = 0;
  const stops = slices.map((slice) => {
    const pct = (slice.value / total) * 100;
    const end = start + pct;
    const entry = `${slice.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
    start = end;
    return entry;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function PieChart({ title, subtitle, slices }: Props) {
  return (
    <div className="pie-card">
      <div className="pie-title">
        <h4>{title}</h4>
        {subtitle && <span className="small">{subtitle}</span>}
      </div>
      <div className="pie" style={{ background: buildConic(slices) }} />
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
