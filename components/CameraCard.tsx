import { CameraStat } from "../lib/mockData";

type Props = {
  camera: CameraStat;
};

const toPercent = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 100);

export function CameraCard({ camera }: Props) {
  const total = camera.totalCount || 1;
  const malePct = toPercent(camera.male, total);
  const femalePct = toPercent(camera.female, total);
  const unknownPct = Math.max(0, 100 - malePct - femalePct);

  return (
    <div className="camera-card">
      <div className="camera-header">
        <div>
          <div className="camera-name">{camera.name}</div>
          <div className="small">{camera.location}</div>
        </div>
        <span className={`tag ${camera.offline ? "offline" : ""}`}>
          <span
            className="dot"
            style={{
              background: camera.offline ? "var(--danger)" : "var(--accent)"
            }}
          />
          {camera.offline ? "Offline" : "Live"}
        </span>
      </div>

      <div className="small">{camera.lastEvent}</div>

      <div className="progress" title="Activity level today">
        <span style={{ width: `${camera.activityPercent}%` }} />
      </div>

      <div className="mini-grid">
        <div className="mini">
          <h5>People</h5>
          <div className="value">{camera.totalCount}</div>
        </div>
        <div className="mini">
          <h5>Tags</h5>
          <div className="value">{camera.tags.join(", ") || "—"}</div>
        </div>
        <div className="mini">
          <h5>Activity</h5>
          <div className="value">{camera.activityPercent}%</div>
        </div>
      </div>

      <div className="legend">
        <span className="status">
          <span className="dot" style={{ background: "var(--accent-2)" }} />
          Male {malePct}%
        </span>
        <span className="status">
          <span className="dot" style={{ background: "var(--danger)" }} />
          Female {femalePct}%
        </span>
        <span className="status">
          <span className="dot" style={{ background: "var(--accent)" }} />
          Unknown {unknownPct}%
        </span>
      </div>

      <div className="bar stacked">
        <span
          style={{
            width: `${malePct}%`,
            background: "linear-gradient(90deg, var(--accent-2), #4f836f)"
          }}
        />
        <span
          style={{
            width: `${femalePct}%`,
            background: "linear-gradient(90deg, var(--danger), #d83d4a)"
          }}
        />
        <span
          style={{
            width: `${unknownPct}%`,
            background: "linear-gradient(90deg, var(--accent), #b8924d)"
          }}
        />
      </div>
    </div>
  );
}
