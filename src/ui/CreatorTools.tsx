import { useState } from "react";
import type { Campaign } from "../game/campaign";
import {
  GOAL_TABLE_DIFFS, GOAL_TABLE_ROLLS,
  type LeagueRules, type TieBreak,
} from "../config";
import { corruptionReasons, crowdReasons, goalTableOf, setOverride } from "../model/config-resolve";

/**
 * Creator / balance tools (§23): edit league rules (global and per-division),
 * reorder tie-breaks, and edit the hidden tables (Goal Table + reason lists),
 * which are saved with the league and read by the simulator.
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

        <TieBreakEditor rules={rules} setRule={setRule} />
      </div>

      <PerDivisionRules campaign={campaign} act={act} />
      <ReasonLists campaign={campaign} act={act} />
      <GoalTableEditor campaign={campaign} act={act} />
    </>
  );
}

function TieBreakEditor({ rules, setRule }: { rules: LeagueRules; setRule: <K extends keyof LeagueRules>(k: K, v: LeagueRules[K]) => void }) {
  const order = rules.tieBreakOrder;
  const move = (i: number, dir: number) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setRule("tieBreakOrder", next);
  };
  return (
    <>
      <h3>Tie-break order</h3>
      <ol style={{ margin: "0.3rem 0", paddingLeft: "1.4rem" }}>
        {order.map((tb, i) => (
          <li key={tb} className="row" style={{ gap: "0.4rem" }}>
            <span>{tieBreakLabel[tb]}</span>
            <button className="btn sm ghost" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
            <button className="btn sm ghost" disabled={i === order.length - 1} onClick={() => move(i, 1)}>▼</button>
          </li>
        ))}
      </ol>
    </>
  );
}

function PerDivisionRules({ campaign, act }: { campaign: Campaign; act: (fn: (c: Campaign) => void) => void }) {
  const divisions = campaign.league.levels.flatMap((l) => l.divisions);
  const [divId, setDivId] = useState(divisions[0]?.id ?? "");
  const div = divisions.find((d) => d.id === divId);
  if (!div) return null;
  const override = div.rulesOverride ?? {};
  const keys: (keyof LeagueRules)[] = ["homeAdvantage", "weather", "form", "motivation", "derby", "corruption", "crowdTrouble"];

  const setOverrideRule = (k: keyof LeagueRules, val: boolean | "inherit") =>
    act((c) => {
      const d = c.league.levels.flatMap((l) => l.divisions).find((x) => x.id === divId)!;
      const next = { ...(d.rulesOverride ?? {}) };
      if (val === "inherit") delete next[k];
      else (next as Record<string, unknown>)[k] = val;
      d.rulesOverride = Object.keys(next).length ? next : undefined;
    });

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Per-division rule overrides</h2>
        <select value={divId} onChange={(e) => setDivId(e.target.value)}>
          {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <p className="muted" style={{ fontSize: "0.82rem" }}>Leave as “inherit” to use the league rule; override to differ this division.</p>
      <div className="grid2">
        {keys.map((k) => {
          const cur = k in override ? (override[k] ? "on" : "off") : "inherit";
          return (
            <div className="field" key={k}>
              <label>{ruleLabels[k] ?? k}</label>
              <select value={cur} onChange={(e) => setOverrideRule(k, e.target.value === "inherit" ? "inherit" : e.target.value === "on")}>
                <option value="inherit">Inherit ({campaign.league.rules[k] ? "on" : "off"})</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReasonLists({ campaign, act }: { campaign: Campaign; act: (fn: (c: Campaign) => void) => void }) {
  return (
    <div className="panel">
      <h2>Reason lists <span className="muted">(editable, saved with the league)</span></h2>
      <div className="grid2">
        <ReasonEditor
          title="Corruption" list={corruptionReasons(campaign.league)}
          onSet={(next) => act((c) => setOverride(c.league, "corruptionReasons", next))}
        />
        <ReasonEditor
          title="Crowd incidents" list={crowdReasons(campaign.league)}
          onSet={(next) => act((c) => setOverride(c.league, "crowdReasons", next))}
        />
      </div>
    </div>
  );
}

function ReasonEditor({ title, list, onSet }: { title: string; list: string[]; onSet: (next: string[]) => void }) {
  const [text, setText] = useState("");
  return (
    <div>
      <h3>{title}</h3>
      <div>
        {list.map((r, i) => (
          <span className="chip" key={i}>
            {r} <button className="close-x" style={{ fontSize: "0.9rem", padding: 0 }} onClick={() => onSet(list.filter((_, j) => j !== i))}>✕</button>
          </span>
        ))}
      </div>
      <div className="row" style={{ marginTop: "0.4rem" }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a reason…" />
        <button className="btn sm" disabled={!text.trim()} onClick={() => { onSet([...list, text.trim()]); setText(""); }}>Add</button>
      </div>
    </div>
  );
}

function GoalTableEditor({ campaign, act }: { campaign: Campaign; act: (fn: (c: Campaign) => void) => void }) {
  const table = goalTableOf(campaign.league);
  const edited = !!campaign.league.configOverrides?.["goalTable"];
  const setCell = (ri: number, ci: number, v: number) =>
    act((c) => {
      const copy = goalTableOf(c.league).map((row) => [...row]);
      copy[ri][ci] = Math.max(0, Math.min(20, v));
      setOverride(c.league, "goalTable", copy);
    });

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Goal Table <span className="muted">(hidden from players — editable)</span></h2>
        {edited && <button className="btn sm ghost" onClick={() => act((c) => setOverride(c.league, "goalTable", undefined))}>Reset to default</button>}
      </div>
      <p className="muted" style={{ fontSize: "0.82rem" }}>Rows = team difference, columns = 2D6 roll (13–16 via coach-skill diff). Edit any cell to rebalance.</p>
      <div className="table-wrap">
        <table className="grid">
          <thead><tr><th>Diff ▾</th>{GOAL_TABLE_ROLLS.map((r) => <th key={r} className="num">{r}</th>)}</tr></thead>
          <tbody>
            {table.map((row, ri) => (
              <tr key={ri}>
                <td className="num pts">{GOAL_TABLE_DIFFS[ri] > 0 ? "+" : ""}{GOAL_TABLE_DIFFS[ri]}</td>
                {row.map((cell, ci) => (
                  <td key={ci} className="num">
                    <input type="number" min={0} max={20} value={cell} onChange={(e) => setCell(ri, ci, +e.target.value)}
                      style={{ width: 38, textAlign: "right", opacity: cell === 0 ? 0.5 : 1 }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const ruleLabels: Partial<Record<keyof LeagueRules, string>> = {
  homeAdvantage: "Home advantage", weather: "Weather affects games", form: "Form",
  motivation: "Motivation", bigTeamAdvantage: "Big-team advantage", derby: "Derby rules",
  corruption: "League corruption", crowdTrouble: "Violent/disruptive crowd", mirroring: "Mirrored schedule",
};
const tieBreakLabel: Record<TieBreak, string> = {
  goalDiff: "Goal difference", goalsScored: "Goals scored", headToHead: "Head-to-head", coinToss: "Coin toss",
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
}
