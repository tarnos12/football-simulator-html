import { useState } from "react";
import type { Campaign } from "../game/campaign";
import type { Team } from "../model/types";
import { MiniJersey } from "./Jersey";
import { JerseyEditor } from "./JerseyEditor";

/**
 * Edit-Division mass grid (§5, §21): every team's stats in one screen, editable,
 * with quick switching between divisions. This is a creator tool, so raw numbers
 * are shown. Click a jersey to edit it.
 */
export function EditDivision({ campaign, divisionId, setDivisionId, onChange }: {
  campaign: Campaign;
  divisionId: string;
  setDivisionId: (id: string) => void;
  onChange: () => void;
}) {
  const [jerseyTeam, setJerseyTeam] = useState<string | null>(null);
  const divisions = campaign.league.levels.flatMap((l) => l.divisions);
  const div = divisions.find((d) => d.id === divisionId) ?? divisions[0];
  if (!div) return null;

  const upd = (id: string, patch: Partial<Team>) => {
    Object.assign(campaign.league.teams[id], patch);
    onChange();
  };
  const num = (id: string, key: keyof Team, lo: number, hi: number) => (
    <input
      type="number" min={lo} max={hi}
      value={campaign.league.teams[id][key] as number}
      onChange={(e) => upd(id, { [key]: clamp(+e.target.value, lo, hi) } as Partial<Team>)}
      style={{ width: 48 }}
    />
  );

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Edit division</h2>
        <select value={div.id} onChange={(e) => setDivisionId(e.target.value)}>
          {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <p className="muted" style={{ fontSize: "0.82rem" }}>Changes apply immediately. Stat edits affect the next match simulated.</p>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>#</th><th>Team</th><th className="num">Att</th><th className="num">Def</th><th className="num">Sta</th>
              <th className="num">Form</th><th className="num">Coach</th><th className="num">Size</th><th className="num">Org</th>
              <th>Owner</th><th className="num">X</th><th className="num">Y</th><th>Jersey</th>
            </tr>
          </thead>
          <tbody>
            {div.teamIds.map((id, i) => {
              const t = campaign.league.teams[id];
              return (
                <tr key={id}>
                  <td className="num pos">{i + 1}</td>
                  <td>{t.name}</td>
                  <td className="num">{num(id, "attack", 1, 9)}</td>
                  <td className="num">{num(id, "defence", 1, 9)}</td>
                  <td className="num">{num(id, "stamina", 1, 9)}</td>
                  <td className="num"><input type="number" step={0.05} min={-2} max={2} value={t.form} onChange={(e) => upd(id, { form: clampF(+e.target.value) })} style={{ width: 60 }} /></td>
                  <td className="num"><input type="number" min={1} max={5} value={t.coach.skill} onChange={(e) => { t.coach.skill = clamp(+e.target.value, 1, 5); onChange(); }} style={{ width: 44 }} /></td>
                  <td className="num">{num(id, "clubSize", 1, 9)}</td>
                  <td className="num">{num(id, "organisation", 1, 9)}</td>
                  <td>
                    <select value={t.ownership} onChange={(e) => upd(id, { ownership: e.target.value as Team["ownership"] })}>
                      <option value="capitalistic">Cap</option><option value="fans">51%</option>
                    </select>
                  </td>
                  <td className="num"><input type="number" min={-10} max={10} value={t.location.x} onChange={(e) => { t.location.x = nz(+e.target.value); onChange(); }} style={{ width: 48 }} /></td>
                  <td className="num"><input type="number" min={-10} max={10} value={t.location.y} onChange={(e) => { t.location.y = nz(+e.target.value); onChange(); }} style={{ width: 48 }} /></td>
                  <td><button className="btn sm ghost" style={{ border: "none" }} onClick={() => setJerseyTeam(id)}><MiniJersey jersey={t.jersey} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {jerseyTeam && (
        <div className="modal-backdrop" onClick={() => setJerseyTeam(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>{campaign.league.teams[jerseyTeam].name} — jersey</h2>
              <button className="close-x" onClick={() => setJerseyTeam(null)}>✕</button>
            </div>
            <JerseyEditor jersey={campaign.league.teams[jerseyTeam].jersey} onChange={(j) => { campaign.league.teams[jerseyTeam].jersey = j; onChange(); }} />
          </div>
        </div>
      )}
    </div>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
}
function clampF(v: number): number {
  return Math.max(-2, Math.min(2, Number.isFinite(v) ? v : 0));
}
function nz(v: number): number {
  const c = clamp(v, -10, 10);
  return c === 0 ? 1 : c;
}
