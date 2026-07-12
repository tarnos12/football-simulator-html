import type { Campaign } from "../game/campaign";
import { MiniJersey } from "./Jersey";

/** Season-end summary (§21): champions, promoted, relegated, cup winner. */
export function SeasonSummary({ campaign }: { campaign: Campaign }) {
  const summary = campaign.summary();
  const name = (id: string) => campaign.league.teams[id]?.name ?? id;
  const teamChip = (id: string) => (
    <span className="teamline chip" key={id}><MiniJersey jersey={campaign.league.teams[id].jersey} size={14} /> {name(id)}</span>
  );

  return (
    <div className="panel">
      <h2>Season {summary.seasonNumber} summary</h2>
      {summary.overallChampionId && (
        <div className="banner">🏆 Champions: <strong>{name(summary.overallChampionId)}</strong></div>
      )}
      {campaign.cup?.championId && (
        <div className="banner">🏆 {campaign.cup.name}: <strong>{name(campaign.cup.championId)}</strong></div>
      )}
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th>Division</th><th>Champion</th><th>Promoted</th><th>Relegated</th></tr></thead>
          <tbody>
            {summary.divisions.map((d) => (
              <tr key={d.divisionId}>
                <td>{d.name}</td>
                <td>{d.championId ? teamChip(d.championId) : <span className="muted">—</span>}</td>
                <td>{d.promoted.length ? d.promoted.map(teamChip) : <span className="muted">—</span>}</td>
                <td>{d.relegated.length ? d.relegated.map(teamChip) : <span className="muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
