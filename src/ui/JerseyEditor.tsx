import { JERSEY_PATTERNS } from "../config";
import type { Jersey } from "../model/types";
import { JerseyPreview } from "./Jersey";

/** Jersey editor (§21): 2–3 shirt colours + pattern, 2–3 short colours, live preview. */
export function JerseyEditor({ jersey, onChange }: { jersey: Jersey; onChange: (j: Jersey) => void }) {
  const setShirt = (colors: string[]) => onChange({ ...jersey, shirtColors: colors });
  const setShorts = (colors: string[]) => onChange({ ...jersey, shortColors: colors });

  return (
    <div className="row" style={{ alignItems: "flex-start", gap: "1.4rem" }}>
      <JerseyPreview jersey={jersey} />
      <div style={{ flex: 1 }}>
        <ColorRow label="Shirt colours" colors={jersey.shirtColors} onChange={setShirt} />
        <div className="field">
          <label>Shirt pattern</label>
          <select value={jersey.shirtPattern} onChange={(e) => onChange({ ...jersey, shirtPattern: e.target.value as Jersey["shirtPattern"] })}>
            {JERSEY_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <ColorRow label="Short colours" colors={jersey.shortColors} onChange={setShorts} />
      </div>
    </div>
  );
}

function ColorRow({ label, colors, onChange }: { label: string; colors: string[]; onChange: (c: string[]) => void }) {
  const setAt = (i: number, v: string) => onChange(colors.map((c, j) => (j === i ? v : c)));
  return (
    <div className="field">
      <label>{label} ({colors.length})</label>
      <div className="row">
        {colors.map((c, i) => (
          <input key={i} type="color" value={normalize(c)} onChange={(e) => setAt(i, e.target.value)} style={{ width: 40, height: 30, padding: 0, border: "1px solid var(--line)", borderRadius: 6 }} />
        ))}
        {colors.length < 3 && <button className="btn sm" onClick={() => onChange([...colors, "#888888"])}>＋</button>}
        {colors.length > 2 && <button className="btn sm ghost" onClick={() => onChange(colors.slice(0, -1))}>－</button>}
      </div>
    </div>
  );
}

function normalize(c: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(c) ? c : "#888888";
}
