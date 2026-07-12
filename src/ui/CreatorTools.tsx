import type { Campaign } from "../game/campaign";
import {
  GOAL_TABLE, GOAL_TABLE_DIFFS, GOAL_TABLE_ROLLS, CORRUPTION, CROWD,
  type LeagueRules,
} from "../config";

/**
 * Creator / balance tools (§23): edit league rules, and inspect the hidden tables
 * (Goal Table, reason lists) that are normally invisible to players.
 */
export function CreatorTools({ campaign, act }: { campaign: Campaign; act: (fn: (c: Campaign) => void) => void }) {
  const rules = campaign.league.rules;
  const setRule = <K extends keyof LeagueRules>(key: K, value: LeagueRules[K]) =>
    act((c) => { c.league.rules = { ...c.league.rules, [key]: value }; });

  const boolRules: (keyof LeagueRules)[] = [
    "homeAdvantage", "weather", "form", "motivation", "bigTeamAdvantage",
    "derby", "corruption", "crowdTrouble", "mirroring",
  ];

  return (
    <>
      <div className="panel">
        <h2>Rules &amp; balance</h2>
        <p className="muted">Rule changes apply from the next season (a running season keeps its fixtures).</p>
        <div className="grid2">
          {boolRules.map((k) => (
            <label className="check" key={k}>
              <input type="checkbox" checked={!!rules[k]} onChange={(e) => setRule(k, e.target.checked as never)} />
              {ruleLabels[k] ?? k}
            </label>
          ))}
        </div>
        <div className="grid2" style={{ marginTop: "0.6rem" }}>
          <div className="field"><label>Points for a win</label>
            <input type="number" min={1} max={5} value={rules.pointsWin} onChange={(e) => setRule("pointsWin", clamp(+e.target.value, 0, 10))} /></div>
          <div className="field"><label>Points for a draw</label>
            <input type="number" min={0} max={3} value={rules.pointsDraw} onChange={(e) => setRule("pointsDraw", clamp(+e.target.value, 0, 5))} /></div>
          <div className="field"><label>Climate</label>
            <select value={rules.climate} onChange={(e) => setRule("climate", e.target.value as LeagueRules["climate"])}>
              <option value="warm">Warm</option><option value="temperate">Temperate</option><option value="cold">Cold</option>
            </select></div>
          <div className="field"><label>Corruption frequency</label>
            <select value={rules.corruptionFrequency} onChange={(e) => setRule("corruptionFrequency", e.target.value as LeagueRules["corruptionFrequency"])}>
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select></div>
          <div className="field"><label>Motivation: games from end</label>
            <input type="number" min={1} max={20} value={rules.motivationGamesFromEnd} onChange={(e) => setRule("motivationGamesFromEnd", clamp(+e.target.value, 1, 38))} /></div>
          <div className="field"><label>Derby range (cells)</label>
            <input type="number" min={0} max={5} value={rules.derbyRange} onChange={(e) => setRule("derbyRange", clamp(+e.target.value, 0, 10))} /></div>
        </div>
      </div>

      <div className="panel">
        <h2>Goal Table <span className="muted">(hidden from players)</span></h2>
        <p className="muted">Rows = effective team difference, columns = 2D6 roll (13–16 via coach-skill diff). Cell = goals scored.</p>
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>Diff ▾ / Roll ▸</th>{GOAL_TABLE_ROLLS.map((r) => <th key={r} className="num">{r}</th>)}</tr></thead>
            <tbody>
              {GOAL_TABLE.map((row, ri) => (
                <tr key={ri}>
                  <td className="num pts">{GOAL_TABLE_DIFFS[ri] > 0 ? "+" : ""}{GOAL_TABLE_DIFFS[ri]}</td>
                  {row.map((cell, ci) => <td key={ci} className="num" style={{ opacity: cell === 0 ? 0.35 : 1 }}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h2>Reason lists</h2>
        <div className="grid2">
          <div>
            <h3>Corruption</h3>
            <div>{CORRUPTION.reasons.map((r) => <span className="chip" key={r}>{r}</span>)}</div>
          </div>
          <div>
            <h3>Crowd incidents</h3>
            <div>{CROWD.reasons.map((r) => <span className="chip" key={r}>{r}</span>)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

const ruleLabels: Partial<Record<keyof LeagueRules, string>> = {
  homeAdvantage: "Home advantage", weather: "Weather affects games", form: "Form",
  motivation: "Motivation", bigTeamAdvantage: "Big-team advantage", derby: "Derby rules",
  corruption: "League corruption", crowdTrouble: "Violent/disruptive crowd", mirroring: "Mirrored schedule",
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
}
