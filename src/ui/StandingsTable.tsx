import { useState } from "react";
import type { Campaign } from "../game/campaign";
import { computeTable, computeFormTable, orderTable, goalDiff } from "../league/standings";
import { thresholdLabelForPosition } from "../league/summary";
import { MiniJersey } from "./Jersey";
import { PositionChart } from "./PositionChart";

type Venue = "all" | "home" | "away" | "form";
const LAST_N = 5;

/** Division standings (§21): jersey, name, P, W-D-L, GF-GA, GD, points, movement,
 *  threshold pill, corruption/crowd markers; Home/Away sub-views; position chart. */
export function StandingsTable({
  campaign,
  divisionId,
  onOpenTeam,
}: {
  campaign: Campaign;
  divisionId: string;
  onOpenTeam: (teamId: string) => void;
}) {
  const [venue, setVenue] = useState<Venue>("all");
  const [chartTeam, setChartTeam] = useState<string | null>(null);
  const div = campaign.season.divisions.find((d) => d.divisionId === divisionId);
  if (!div) return null;
  const model = campaign.league.levels.flatMap((l) => l.divisions).find((d) => d.id === divisionId)!;
  const rules = { ...campaign.league.rules, ...(model.rulesOverride ?? {}) };

  const rows =
    venue === "all"
      ? div.table
      : venue === "form"
        ? orderTable(computeFormTable(div.teamIds, div.schedule, rules, LAST_N), div.schedule, rules)
        : orderTable(computeTable(div.teamIds, div.schedule, rules, div.startingPoints, venue), div.schedule, rules);

  const markerFor = (teamId: string) => div.markers?.filter((m) => m.teamId === teamId) ?? [];
  const teamName = (id: string) => campaign.league.teams[id].name;

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{div.name}</h2>
        <div className="tabs" style={{ margin: 0 }}>
          {(["all", "home", "away", "form"] as Venue[]).map((v) => (
            <button key={v} className={`tab ${venue === v ? "active" : ""}`} onClick={() => setVenue(v)}>
              {v === "all" ? "Overall" : v === "form" ? `Last ${LAST_N}` : v[0].toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="muted" style={{ fontSize: "0.82rem", marginBottom: "0.5rem" }}>
        Round {div.playedRounds} / {div.totalRounds}
      </div>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Team</th>
              <th className="num">P</th>
              <th>W-D-L</th>
              <th className="num">GF</th>
              <th className="num">GA</th>
              <th className="num">GD</th>
              <th className="num">Pts</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const pos = i + 1;
              const label = venue === "all" ? thresholdLabelForPosition(campaign.league, divisionId, pos) : undefined;
              const move = movement(r.positionHistory);
              const markers = markerFor(r.teamId);
              return (
                <tr key={r.teamId}>
                  <td className="num pos">{pos}</td>
                  <td>
                    <span className="teamline">
                      <MiniJersey jersey={campaign.league.teams[r.teamId].jersey} />
                      <button className="btn ghost sm" style={{ padding: 0, border: "none", background: "none" }} onClick={() => onOpenTeam(r.teamId)}>
                        <span className="name">{teamName(r.teamId)}</span>
                      </button>
                      {venue === "all" && move !== 0 && <span className={move < 0 ? "up" : "down"}>{move < 0 ? "▲" : "▼"}</span>}
                      {markers.map((m, mi) => (
                        <span key={mi} className="marker" title={`${m.kind === "corruption" ? "Corruption" : "Crowd incident"}: ${m.reason}${m.pointsLost ? ` (${m.pointsLost} pts)` : ""}`}>
                          {m.kind === "corruption" ? "⚖️" : "🚨"}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="num">{r.played}</td>
                  <td>{r.won}-{r.drawn}-{r.lost}</td>
                  <td className="num">{r.goalsFor}</td>
                  <td className="num">{r.goalsAgainst}</td>
                  <td className="num">{goalDiff(r) > 0 ? "+" : ""}{goalDiff(r)}</td>
                  <td className="num pts">{r.points}</td>
                  <td>{label && <span className={`pill ${pillClass(label)}`}>{label}</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {venue === "all" && div.playedRounds > 0 && (
        <div style={{ marginTop: "0.8rem" }}>
          <div className="row">
            <span className="muted" style={{ fontSize: "0.82rem" }}>Position chart:</span>
            <select value={chartTeam ?? rows[0]?.teamId} onChange={(e) => setChartTeam(e.target.value)}>
              {rows.map((r) => <option key={r.teamId} value={r.teamId}>{teamName(r.teamId)}</option>)}
            </select>
          </div>
          <PositionChart
            positions={(rows.find((r) => r.teamId === (chartTeam ?? rows[0]?.teamId))?.positionHistory) ?? []}
            teamCount={rows.length}
          />
        </div>
      )}
    </div>
  );
}

function movement(history: number[]): number {
  if (history.length < 2) return 0;
  return history[history.length - 1] - history[history.length - 2];
}
function pillClass(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("champion")) return "champion";
  if (l.includes("promot")) return "promoted";
  if (l.includes("relegat")) return "relegated";
  return "qualification";
}
