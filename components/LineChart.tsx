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
  const startTs = timestamps[0] ? new Date(timestamps[0]) : null;
  const endTs = timestamps[timestamps.length - 1] ? new Date(timestamps[timestamps.length - 1]) : null;
  const midTs = timestamps[Math.floor(timestamps.length / 2)]
    ? new Date(timestamps[Math.floor(timestamps.length / 2)])
    : null;
  const showDate = !!(startTs && endTs && endTs.getTime() - startTs.getTime() >= 24 * 60 * 60 * 1000);
  const formatLabel = (value: Date | null) => {
    if (!value) return "—";
    return value.toLocaleString([], {
      month: showDate ? "short" : undefined,
      day: showDate ? "2-digit" : undefined,
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  const labelStart = formatLabel(startTs);
  const labelMid = formatLabel(midTs);
  const labelEnd = formatLabel(endTs);
  const maxValue = Math.max(0, ...series.flatMap((line) => line.data));

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
          <span className="legend-chip">Max: {maxValue}</span>
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
        <span>Start: {labelStart}</span>
        <span>Mid: {labelMid}</span>
        <span>End: {labelEnd}</span>
      </div>
    </div>
  );
}
