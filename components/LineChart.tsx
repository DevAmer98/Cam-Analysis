type LineSeries = {
  label: string;
  color: string;
  data: number[];
};

type Props = {
  title: string;
  subtitle?: string;
  timestamps: string[];
  series: LineSeries[];
};

function buildPath(data: number[], width: number, height: number) {
  if (data.length === 0) return "";
  const max = Math.max(1, ...data);
  const step = data.length > 1 ? width / (data.length - 1) : 0;
  return data
    .map((value, index) => {
      const x = index * step;
      const y = height - (value / max) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function LineChart({ title, subtitle, timestamps, series }: Props) {
  const width = 320;
  const height = 120;
  const labelStart = timestamps[0]
    ? new Date(timestamps[0]).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";
  const labelEnd = timestamps[timestamps.length - 1]
    ? new Date(timestamps[timestamps.length - 1]).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "—";

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div>
          <h4>{title}</h4>
          {subtitle && <span className="small">{subtitle}</span>}
        </div>
        <div className="chart-legend">
          {series.map((line) => (
            <span key={line.label} className="legend-chip">
              <span className="dot" style={{ background: line.color }} />
              {line.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg" role="img">
        <path className="chart-gridline" d={`M0 ${height} H${width}`} />
        <path className="chart-gridline" d={`M0 ${height * 0.66} H${width}`} />
        <path className="chart-gridline" d={`M0 ${height * 0.33} H${width}`} />
        {series.map((line) => (
          <path
            key={line.label}
            d={buildPath(line.data, width, height)}
            fill="none"
            stroke={line.color}
            strokeWidth="2"
          />
        ))}
      </svg>
      <div className="chart-footer small">
        <span>{labelStart}</span>
        <span>{labelEnd}</span>
      </div>
    </div>
  );
}
