import type { Campaign } from "../game/campaign";
import { scoreText } from "./format";

/** Cup Table / Cup Draw (§14, §21): group standings and the knockout bracket. */
export function CupView({ campaign, act }: { campaign: Campaign; act: (fn: (c: Campaign) => void) => void }) {
  const cup = campaign.cup;
  if (!cup) return <div className="panel muted">No cup in this league system.</div>;
  const name = (id: string) => campaign.league.teams[id]?.name ?? id;

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>{cup.name}</h2>
        <div className="row">
          <button className="btn sm" disabled={cup.complete} onClick={() => act((c) => c.advanceCup())}>Play next round</button>
          <button className="btn sm primary" disabled={cup.complete} onClick={() => act((c) => c.playWholeCup())}>Play whole cup</button>
        </div>
      </div>

      {cup.championId && (
        <div className="banner">🏆 <strong>{name(cup.championId)}</strong> win the {cup.name}!</div>
      )}

      {cup.groups.length > 0 && (
        <>
          <h3>Groups</h3>
          <div className="grid2">
            {cup.groups.map((g) => (
              <div key={g.name} className="panel" style={{ margin: 0 }}>
                <strong>{g.name}</strong>
                <ol style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem" }}>
                  {g.teamIds.map((id) => (
                    <li key={id} className={g.advance.includes(id) ? "ok" : ""}>{name(id)}{g.advance.includes(id) ? " ✓" : ""}</li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </>
      )}

      {cup.rounds.length > 0 && (
        <>
          <h3>Knockout</h3>
          <div className="bracket">
            {cup.rounds.map((round, ri) => (
              <div className="bracket-round" key={ri}>
                <div className="muted" style={{ fontSize: "0.8rem", fontWeight: 700 }}>{round.name}</div>
                {round.ties.map((tie, ti) => (
                  <div className="tie" key={ti}>
                    <div className={tie.winnerId === tie.homeId ? "win" : ""}>{name(tie.homeId)}</div>
                    <div className={tie.winnerId === tie.awayId ? "win" : ""}>{name(tie.awayId)}</div>
                    {tie.result && (
                      <div className="muted" style={{ fontSize: "0.75rem" }}>
                        {scoreText(tie.result)}{tie.result.decidedBy === "penalties" && tie.result.penaltyScore ? ` · pens ${tie.result.penaltyScore.home}–${tie.result.penaltyScore.away}` : tie.result.decidedBy === "overtime" ? " · a.e.t." : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
