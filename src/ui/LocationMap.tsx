import { useMemo, useState } from "react";
import type { Campaign } from "../game/campaign";
import { GRID, WEATHER_ICON, WEATHER_LABEL } from "../config";
import { weatherGridForRound, cellKey } from "../systems/weather";
import { MiniJersey } from "./Jersey";

/**
 * Location Map (§11, §21): the grid map (X/Y −10..+10, no 0). Plots every team at
 * its cell; view the whole league or one division; optional weather overlay for
 * the current round (weather is generated on this same grid, §10).
 */
export function LocationMap({ campaign, divisionId, onOpenTeam }: {
  campaign: Campaign;
  divisionId?: string;
  onOpenTeam: (teamId: string) => void;
}) {
  const [scope, setScope] = useState<"league" | "division">("league");
  const [showWeather, setShowWeather] = useState(false);

  // West→east columns and north→south rows (skip 0).
  const cols = useMemo(() => axis(), []);
  const rows = useMemo(() => [...axis()].reverse(), []); // 10 (north) at top

  const cell = 26;
  const pad = 22;
  const w = cols.length * cell + pad * 2;
  const h = rows.length * cell + pad * 2;
  const cx = (x: number) => pad + cols.indexOf(x) * cell + cell / 2;
  const cy = (y: number) => pad + rows.indexOf(y) * cell + cell / 2;

  const teamIds = useMemo(() => {
    if (scope === "division" && divisionId) {
      const div = campaign.league.levels.flatMap((l) => l.divisions).find((d) => d.id === divisionId);
      return div?.teamIds ?? [];
    }
    return Object.keys(campaign.league.teams);
  }, [scope, divisionId, campaign]);

  // Group teams by grid cell so co-located teams (derbies!) can be offset.
  const byCell = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const id of teamIds) {
      const t = campaign.league.teams[id];
      const k = cellKey(t.location.x, t.location.y);
      (map.get(k) ?? map.set(k, []).get(k)!).push(id);
    }
    return map;
  }, [teamIds, campaign]);

  const weather = useMemo(() => {
    if (!showWeather) return null;
    const div = campaign.season.divisions[0];
    const round = Math.max(1, div?.playedRounds ?? 1);
    return weatherGridForRound(campaign.league, campaign.season.seasonNumber, round);
  }, [showWeather, campaign]);

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Location map</h2>
        <div className="row">
          <div className="tabs" style={{ margin: 0 }}>
            <button className={`tab ${scope === "league" ? "active" : ""}`} onClick={() => setScope("league")}>Whole league</button>
            <button className={`tab ${scope === "division" ? "active" : ""}`} disabled={!divisionId} onClick={() => setScope("division")}>This division</button>
          </div>
          <label className="check"><input type="checkbox" checked={showWeather} onChange={(e) => setShowWeather(e.target.checked)} /> Weather</label>
        </div>
      </div>
      <p className="muted" style={{ fontSize: "0.82rem", margin: "0.3rem 0 0.6rem" }}>
        North is up, east is right (−10…+10). Teams in the same cell play a derby. Click a team to open its card.
      </p>

      <div className="table-wrap">
        <svg viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: "100%", height: "auto", minWidth: 420 }} role="img" aria-label="Team location map">
          {/* Grid cells + optional weather overlay */}
          {rows.map((y) =>
            cols.map((x) => {
              const wk = weather?.get(cellKey(x, y));
              return (
                <g key={`${x},${y}`}>
                  <rect x={cx(x) - cell / 2} y={cy(y) - cell / 2} width={cell} height={cell} fill="var(--panel-2)" stroke="var(--line)" strokeWidth={0.5} />
                  {wk && (
                    <text x={cx(x)} y={cy(y) + 5} textAnchor="middle" fontSize={14} opacity={0.5}>
                      <title>{WEATHER_LABEL[wk]}</title>{WEATHER_ICON[wk]}
                    </text>
                  )}
                </g>
              );
            }),
          )}

          {/* Axis labels (every other cell to reduce clutter) */}
          {cols.filter((_, i) => i % 2 === 0).map((x) => (
            <text key={`cx${x}`} x={cx(x)} y={h - 6} textAnchor="middle" fontSize={9} fill="var(--muted)">{x}</text>
          ))}
          {rows.filter((_, i) => i % 2 === 0).map((y) => (
            <text key={`cy${y}`} x={10} y={cy(y) + 3} textAnchor="middle" fontSize={9} fill="var(--muted)">{y}</text>
          ))}

          {/* Team markers */}
          {[...byCell.entries()].flatMap(([, ids]) =>
            ids.map((id, i) => {
              const t = campaign.league.teams[id];
              const off = offset(i, ids.length, cell);
              const px = cx(t.location.x) + off.dx;
              const py = cy(t.location.y) + off.dy;
              const r = ids.length > 1 ? 5 : 7;
              return (
                <circle
                  key={id}
                  cx={px}
                  cy={py}
                  r={r}
                  fill={t.jersey.shirtColors[0] ?? "#888"}
                  stroke={t.jersey.shirtColors[1] ?? "#0b1020"}
                  strokeWidth={1.5}
                  style={{ cursor: "pointer" }}
                  onClick={() => onOpenTeam(id)}
                >
                  <title>{t.name} ({t.location.x}/{t.location.y}){ids.length > 1 ? ` — derby cell (${ids.length} teams)` : ""}</title>
                </circle>
              );
            }),
          )}
        </svg>
      </div>

      <div className="row" style={{ marginTop: "0.6rem", fontSize: "0.82rem" }}>
        <span className="muted">{teamIds.length} teams shown.</span>
        {[...byCell.values()].some((v) => v.length > 1) && <span className="muted">Stacked circles = same cell (derby).</span>}
      </div>

      {/* A small jersey legend for the first few teams to aid recognition. */}
      <div className="row" style={{ marginTop: "0.5rem", flexWrap: "wrap" }}>
        {teamIds.slice(0, 16).map((id) => (
          <button key={id} className="teamline chip" style={{ border: "none" }} onClick={() => onOpenTeam(id)}>
            <MiniJersey jersey={campaign.league.teams[id].jersey} size={13} /> {campaign.league.teams[id].name}
          </button>
        ))}
        {teamIds.length > 16 && <span className="muted">+{teamIds.length - 16} more…</span>}
      </div>
    </div>
  );
}

/** The valid grid coordinates on one axis: −10…−1, 1…10 (no 0). */
function axis(): number[] {
  const out: number[] = [];
  const min: number = GRID.min;
  const max: number = GRID.max;
  for (let v = min; v <= max; v++) if (v !== 0) out.push(v);
  return out;
}

/** Small offset so multiple teams in one cell don't overlap. */
function offset(i: number, count: number, cell: number): { dx: number; dy: number } {
  if (count <= 1) return { dx: 0, dy: 0 };
  const perRow = Math.ceil(Math.sqrt(count));
  const step = (cell - 8) / perRow;
  const col = i % perRow;
  const row = Math.floor(i / perRow);
  const span = (perRow - 1) * step;
  return { dx: col * step - span / 2, dy: row * step - span / 2 };
}
