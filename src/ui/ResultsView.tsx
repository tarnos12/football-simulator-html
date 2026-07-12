import { useState } from "react";
import type { Campaign } from "../game/campaign";
import { MiniJersey } from "./Jersey";
import { scoreText, weatherIcon, weatherTooltip, numberFmt } from "./format";

/** Round-by-round results (§21): weather icon+tooltip, jersey+name, score, attendance,
 *  derby/motivation/incident/OT markers; ◀ Prev / Next ▶ week navigation. */
export function ResultsView({ campaign, divisionId, onOpenTeam }: {
  campaign: Campaign;
  divisionId: string;
  onOpenTeam: (teamId: string) => void;
}) {
  const groups = campaign.season.divisions.filter((d) => d.sourceDivisionId === divisionId);
  const [groupKey, setGroupKey] = useState<string>(divisionId);
  const div = groups.find((d) => d.divisionId === groupKey) ?? groups.find((d) => d.divisionId === divisionId) ?? groups[0];
  const [round, setRound] = useState(() => Math.max(1, div?.playedRounds ?? 1));
  if (!div) return null;

  const maxRound = Math.max(div.playedRounds, 1);
  const shown = Math.min(Math.max(round, 1), maxRound);
  const matches = div.schedule.filter((m) => m.round === shown && m.result);
  const teamName = (id: string) => campaign.league.teams[id].name;

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{div.name} — Round {shown}</h2>
        <div className="row">
          <button className="btn sm" disabled={shown <= 1} onClick={() => setRound(shown - 1)}>◀ Prev</button>
          <button className="btn sm" disabled={shown >= maxRound} onClick={() => setRound(shown + 1)}>Next ▶</button>
        </div>
      </div>
      {groups.length > 1 && (
        <div className="tabs" style={{ marginTop: "0.4rem" }}>
          {groups.map((g) => (
            <button key={g.divisionId} className={`tab ${div.divisionId === g.divisionId ? "active" : ""}`} onClick={() => { setGroupKey(g.divisionId); setRound(1); }}>
              {g.groupName ?? "Regular season"}
            </button>
          ))}
        </div>
      )}

      {matches.length === 0 ? (
        <p className="muted">No games played in this round yet.</p>
      ) : (
        <div className="result-list" style={{ marginTop: "0.6rem" }}>
          {matches.map((m, i) => {
            const r = m.result!;
            return (
              <div className="result-row" key={i}>
                <span className="marker" title={weatherTooltip(r.weather)}>{weatherIcon(r.weather)}</span>
                <span className="row" style={{ gap: "0.5rem", minWidth: 0 }}>
                  <span className="teamline">
                    <MiniJersey jersey={campaign.league.teams[r.homeId].jersey} />
                    <button className="btn ghost sm" style={{ border: "none", padding: 0, background: "none" }} onClick={() => onOpenTeam(r.homeId)}>{teamName(r.homeId)}</button>
                  </span>
                  <span className="muted">v</span>
                  <span className="teamline">
                    <MiniJersey jersey={campaign.league.teams[r.awayId].jersey} />
                    <button className="btn ghost sm" style={{ border: "none", padding: 0, background: "none" }} onClick={() => onOpenTeam(r.awayId)}>{teamName(r.awayId)}</button>
                  </span>
                  {r.derby && <span className="marker" title="Derby">🔥</span>}
                  {(r.motivationHome || r.motivationAway) && <span className="marker" title="Motivation bonus in play">💪</span>}
                  {r.decidedBy && <span className="marker" title={r.decidedBy === "penalties" ? `Penalties${r.penaltyScore ? ` ${r.penaltyScore.home}–${r.penaltyScore.away}` : ""}` : "After overtime"}>{r.decidedBy === "penalties" ? "🥅" : "⏱️"}</span>}
                  {r.incidents.map((inc, ii) => (
                    <span key={ii} className="marker" title={`${inc.kind === "corruption" ? "Corruption" : "Crowd incident"}: ${inc.reason}`}>{inc.kind === "corruption" ? "⚖️" : "🚨"}</span>
                  ))}
                </span>
                <span className="score">{scoreText(r)}</span>
                <span className="att" title="Attendance">👥 {numberFmt(r.attendance)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
