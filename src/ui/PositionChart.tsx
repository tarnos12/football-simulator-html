// PositionChart — inline-SVG league-position-over-rounds charts (§21).
// Pure, deterministic, stateless. jsx: "react-jsx" — no React import needed.

const PAD_X = 18;
const PAD_Y = 12;
const DOT_R = 2;
const LABEL_FONT = 9;

/** Clamp team count so we never divide by zero and always have a valid range. */
function safeTeamCount(teamCount: number): number {
  return Math.max(2, Math.floor(teamCount) || 2);
}

/** Map a 1-indexed position (1 = top) to a Y pixel (position 1 -> top). */
function positionToY(position: number, teamCount: number, height: number): number {
  const tc = safeTeamCount(teamCount);
  const usable = height - PAD_Y * 2;
  const t = (position - 1) / (tc - 1); // 0 at top position, 1 at bottom position
  return PAD_Y + t * usable;
}

/** Evenly space round index i (0-based) across the plot width. */
function roundToX(i: number, count: number, width: number): number {
  const usable = width - PAD_X * 2;
  if (count <= 1) return PAD_X + usable / 2;
  return PAD_X + (i / (count - 1)) * usable;
}

function buildPoints(
  positions: number[],
  teamCount: number,
  width: number,
  height: number,
): { x: number; y: number; pos: number }[] {
  return positions.map((pos, i) => ({
    x: roundToX(i, positions.length, width),
    y: positionToY(pos, teamCount, height),
    pos,
  }));
}

export function PositionChart({
  positions,
  teamCount,
  width = 260,
  height = 90,
}: {
  positions: number[];
  teamCount: number;
  width?: number;
  height?: number;
}) {
  if (positions.length === 0) {
    return <div className="muted">No games yet</div>;
  }

  const pts = buildPoints(positions, teamCount, width, height);
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const first = positions[0];
  const last = positions[positions.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ maxWidth: "100%", height: "auto" }}
      role="img"
      aria-label="League position after each round"
    >
      {/* grid baseline: top (best) and bottom (worst) reference lines */}
      <line
        x1={PAD_X}
        y1={PAD_Y}
        x2={width - PAD_X}
        y2={PAD_Y}
        stroke="var(--line)"
        strokeWidth={1}
      />
      <line
        x1={PAD_X}
        y1={height - PAD_Y}
        x2={width - PAD_X}
        y2={height - PAD_Y}
        stroke="var(--line)"
        strokeWidth={1}
      />
      <polyline
        points={polyline}
        fill="none"
        stroke="var(--accent-2)"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <circle key={`dot-${i}`} cx={p.x} cy={p.y} r={DOT_R} fill="var(--accent-2)" />
      ))}
      <text
        x={PAD_X}
        y={pts[0].y - 4}
        fill="var(--muted)"
        fontSize={LABEL_FONT}
        textAnchor="start"
      >
        {first}
      </text>
      <text
        x={width - PAD_X}
        y={pts[pts.length - 1].y - 4}
        fill="var(--muted)"
        fontSize={LABEL_FONT}
        textAnchor="end"
      >
        {last}
      </text>
    </svg>
  );
}

export function MultiPositionChart({
  series,
  teamCount,
  width = 520,
  height = 220,
}: {
  series: { label: string; color: string; positions: number[] }[];
  teamCount: number;
  width?: number;
  height?: number;
}) {
  const nonEmpty = series.filter((s) => s.positions.length > 0);
  if (nonEmpty.length === 0) {
    return <div className="muted">No games yet</div>;
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          marginBottom: 6,
          fontSize: LABEL_FONT,
          color: "var(--muted)",
        }}
      >
        {series.map((s, i) => (
          <span
            key={`legend-${i}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
          >
            <span
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 2,
                background: s.color,
              }}
            />
            {s.label}
          </span>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ maxWidth: "100%", height: "auto" }}
        role="img"
        aria-label="League position after each round for multiple teams"
      >
        <line
          x1={PAD_X}
          y1={PAD_Y}
          x2={width - PAD_X}
          y2={PAD_Y}
          stroke="var(--line)"
          strokeWidth={1}
        />
        <line
          x1={PAD_X}
          y1={height - PAD_Y}
          x2={width - PAD_X}
          y2={height - PAD_Y}
          stroke="var(--line)"
          strokeWidth={1}
        />
        {series.map((s, si) => {
          if (s.positions.length === 0) return null;
          const pts = buildPoints(s.positions, teamCount, width, height);
          const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
          return (
            <g key={`series-${si}`}>
              <polyline
                points={polyline}
                fill="none"
                stroke={s.color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {pts.map((p, i) => (
                <circle
                  key={`dot-${si}-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={DOT_R}
                  fill={s.color}
                />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
