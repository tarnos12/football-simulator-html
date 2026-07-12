import { useState } from "react";
import type { Campaign } from "../game/campaign";
import { COACH_ATTRIBUTES } from "../config";
import type { CoachAttributeId } from "../config";
import { JerseyPreview } from "./Jersey";
import { JerseyEditor } from "./JerseyEditor";
import { formArrows, changeArrow } from "./format";

/**
 * Team Card + Edit (§5, §21). This is a creator/edit tool, so raw stat NUMBERS are
 * shown here (players only see icons elsewhere). Stats are editable; between-season
 * change highlights are shown when present.
 */
export function TeamCardModal({ campaign, teamId, onClose, onChange }: {
  campaign: Campaign;
  teamId: string;
  onClose: () => void;
  onChange: () => void;
}) {
  const team = campaign.league.teams[teamId];
  const [edit, setEdit] = useState(false);
  const hl = campaign.highlights[teamId];

  const set = (patch: Partial<typeof team>) => {
    Object.assign(campaign.league.teams[teamId], patch);
    onChange();
  };

  const attrDef = (id: CoachAttributeId) => COACH_ATTRIBUTES.find((a) => a.id === id)!;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>{team.name}</h2>
          <button className="close-x" onClick={onClose}>✕</button>
        </div>

        <div className="row" style={{ alignItems: "flex-start", gap: "1.2rem" }}>
          <JerseyPreview jersey={team.jersey} />
          <div style={{ flex: 1 }}>
            {edit ? (
              <div className="grid2">
                {(["attack", "defence", "stamina", "clubSize", "organisation"] as const).map((k) => (
                  <div className="field" key={k}>
                    <label>{k}</label>
                    <input type="number" min={1} max={9} value={team[k]} onChange={(e) => set({ [k]: clamp(+e.target.value, 1, 9) } as Partial<typeof team>)} />
                  </div>
                ))}
                <div className="field"><label>form</label>
                  <input type="number" step={0.05} min={-2} max={2} value={team.form} onChange={(e) => set({ form: Math.max(-2, Math.min(2, +e.target.value)) })} /></div>
                <div className="field"><label>coach skill</label>
                  <input type="number" min={1} max={5} value={team.coach.skill} onChange={(e) => { team.coach.skill = clamp(+e.target.value, 1, 5); onChange(); }} /></div>
                <div className="field"><label>ownership</label>
                  <select value={team.ownership} onChange={(e) => set({ ownership: e.target.value as typeof team.ownership })}>
                    <option value="capitalistic">Capitalistic</option>
                    <option value="fans">51% Fans</option>
                  </select></div>
                <div className="field"><label>location X</label>
                  <input type="number" min={-10} max={10} value={team.location.x} onChange={(e) => { team.location.x = clamp(+e.target.value, -10, 10) || 1; onChange(); }} /></div>
                <div className="field"><label>location Y</label>
                  <input type="number" min={-10} max={10} value={team.location.y} onChange={(e) => { team.location.y = clamp(+e.target.value, -10, 10) || 1; onChange(); }} /></div>
              </div>
            ) : (
              <div className="statgrid">
                <Stat k="Attack" v={team.attack} d={hl?.attack} />
                <Stat k="Defence" v={team.defence} d={hl?.defence} />
                <Stat k="Stamina" v={team.stamina} d={hl?.stamina} />
                <Stat k="Club size" v={team.clubSize} d={hl?.clubSize} />
                <Stat k="Organisation" v={team.organisation} d={hl?.organisation} />
                <div className="stat"><div className="k">Form</div><div className="v">{formArrows(team.form)}</div></div>
                <div className="stat"><div className="k">Ownership</div><div className="v" style={{ fontSize: "0.9rem" }}>{team.ownership === "fans" ? "51% Fans" : "Capitalistic"} {hl?.ownership ? "✨" : ""}</div></div>
                <div className="stat"><div className="k">Location</div><div className="v" style={{ fontSize: "0.9rem" }}>{team.location.x} / {team.location.y}</div></div>
              </div>
            )}
          </div>
        </div>

        <h3>Coach — {team.coach.name} {hl?.coach ? <span className="chip">new</span> : null}</h3>
        <div>Skill {"★".repeat(team.coach.skill)}{"☆".repeat(5 - team.coach.skill)}</div>
        <div className="row" style={{ marginTop: "0.4rem" }}>
          {team.coach.attributes.map((id) => {
            const a = attrDef(id);
            return <span key={id} className="chip marker" title={`${a.effect} — ${a.hover}`} style={{ color: a.positive ? "var(--accent)" : "var(--danger)" }}>{a.name}</span>;
          })}
        </div>

        {edit && (
          <>
            <h3>Coach attributes <span className="muted" style={{ fontSize: "0.8rem" }}>(toggle to hand-edit)</span></h3>
            <div className="grid2">
              {COACH_ATTRIBUTES.map((a) => {
                const on = team.coach.attributes.includes(a.id);
                return (
                  <label className="check" key={a.id} title={a.hover} style={{ color: a.positive ? "var(--accent)" : "var(--danger)" }}>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) => {
                        const attrs = e.target.checked
                          ? [...team.coach.attributes, a.id]
                          : team.coach.attributes.filter((x) => x !== a.id);
                        team.coach.attributes = attrs;
                        onChange();
                      }}
                    />
                    {a.name} <span className="muted" style={{ fontSize: "0.75rem" }}>({a.effect})</span>
                  </label>
                );
              })}
            </div>
            <h3>Jersey</h3>
            <JerseyEditor jersey={team.jersey} onChange={(j) => { campaign.league.teams[teamId].jersey = j; onChange(); }} />
          </>
        )}

        <div className="row" style={{ marginTop: "1rem" }}>
          <button className="btn" onClick={() => setEdit(!edit)}>{edit ? "Done editing" : "✎ Edit team"}</button>
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v, d }: { k: string; v: number; d?: number }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className="v">{v} {d ? <span className={d > 0 ? "hl-add" : "hl-sub"} style={{ fontSize: "0.8rem" }}>{changeArrow(d)}</span> : null}</div>
    </div>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
}
