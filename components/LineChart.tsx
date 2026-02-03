import { useState, type MouseEvent } from "react";

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
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
  const horizontalGuides = [height * 0.33, height * 0.66];
  const verticalGuides = [width * 0.33, width * 0.66];
  const pointCount = Math.max(timestamps.length, ...series.map((line) => line.data.length), 0);
  const step = pointCount > 1 ? width / (pointCount - 1) : 0;
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
  const hoverLabel =
    hoverIndex === null
      ? null
      : timestamps[hoverIndex]
        ? formatLabel(new Date(timestamps[hoverIndex]))
        : `Point ${hoverIndex + 1}`;

  const getPointY = (line: LineSeries, index: number) => {
    const value = line.data[index] ?? 0;
    const max = Math.max(1, ...line.data);
    return height - (value / max) * height;
  };

  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    if (pointCount === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const x = ((event.clientX - rect.left) / rect.width) * width;
    const clamped = Math.max(0, Math.min(width, x));
    const index = pointCount > 1 ? Math.round(clamped / step) : 0;
    setHoverIndex(index);
    setHoverPosition({
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top))
    });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setHoverPosition(null);
  };

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
      <div className="chart-plot">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="chart-svg"
          role="img"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {horizontalGuides.map((y) => (
            <path key={`h-${y}`} className="chart-gridline" d={`M0 ${y} H${width}`} />
          ))}
          {verticalGuides.map((x) => (
            <path key={`v-${x}`} className="chart-gridline" d={`M${x} 0 V${height}`} />
          ))}
          {hoverIndex !== null && (
            <path className="chart-hover-guide" d={`M${hoverIndex * step} 0 V${height}`} />
          )}
          {series.map((line) => (
            <path
              key={line.label}
              d={buildPath(line.data, width, height)}
              fill="none"
              stroke={line.color}
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {hoverIndex !== null &&
            series.map((line) => (
              <circle
                key={`${line.label}-marker`}
                cx={hoverIndex * step}
                cy={getPointY(line, hoverIndex)}
                r="2"
                fill={line.color}
                stroke="var(--surface)"
                strokeWidth="1"
              />
            ))}
        </svg>
        {hoverIndex !== null && (
          <div
            className="chart-tooltip small"
            style={{
              left: `${hoverPosition?.x ?? 0}px`,
              top: `${hoverPosition?.y ?? 0}px`
            }}
          >
            <div className="chart-tooltip-title">{hoverLabel}</div>
            {series.map((line) => (
              <div key={`${line.label}-value`} className="chart-tooltip-row">
                <span className="dot" style={{ background: line.color }} />
                {line.label}: {line.data[hoverIndex] ?? 0}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="chart-footer small">
        <span>Start: {labelStart}</span>
        <span>Mid: {labelMid}</span>
        <span>End: {labelEnd}</span>
      </div>
    </div>
  );
}
