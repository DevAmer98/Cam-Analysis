type Bar = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  title: string;
  subtitle?: string;
  bars: Bar[];
};

export function BarChart({ title, subtitle, bars }: Props) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  const width = Math.max(320, bars.length * 72);
  const height = 220;
  const chartTop = 20;
  const baselineY = 170;
  const barWidth = 36;
  const slotWidth = width / Math.max(1, bars.length);

  return (
    <div className="bar-card">
      <div className="pie-title">
        <h4>{title}</h4>
        {subtitle && <span className="small">{subtitle}</span>}
      </div>
      <div className="bar-plot-wrap">
        <svg viewBox={`0 0 ${width} ${height}`} className="bar-svg" role="img">
          <path className="chart-gridline" d={`M0 ${baselineY} H${width}`} />
          {bars.map((bar, index) => {
            const x = index * slotWidth + (slotWidth - barWidth) / 2;
            const barHeight = ((baselineY - chartTop) * bar.value) / max;
            const y = baselineY - barHeight;
            return (
              <g key={bar.label}>
                <rect x={x} y={y} width={barWidth} height={barHeight} rx={8} fill={bar.color} />
                <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" className="bar-value">
                  {bar.value}
                </text>
                <text
                  x={x + barWidth / 2}
                  y={baselineY + 20}
                  textAnchor="middle"
                  className="bar-label-text"
                >
                  {bar.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="bar-grid">
        {bars.map((bar) => (
          <div key={bar.label} className="bar-row">
            <span className="dot" style={{ background: bar.color }} />
            <div className="bar-label small">{bar.label}</div>
            <strong>{bar.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
