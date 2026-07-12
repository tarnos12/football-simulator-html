import { useState } from "react";
import { RNG } from "../core/rng";
import { createLeague, type CreateBlueprint } from "../league/create";
import { defaultCup } from "../game/campaign";
import { World } from "../game/world";
import type { LeagueSystem } from "../model/types";

/**
 * League creation wizard (§6): levels, divisions, teams, distribution, matches,
 * rules & toggles, optional cup. "Quick start" builds a sensible default league.
 */
export function CreateWizard({ onCreate, onCreateWorld }: {
  onCreate: (league: LeagueSystem) => void;
  onCreateWorld: (world: World) => void;
}) {
  const [name, setName] = useState("World of Sports League");
  const [seed, setSeed] = useState("kickoff");
  const [levels, setLevels] = useState(2);
  const [divisionsPerLevel, setDivisionsPerLevel] = useState(1);
  const [teamsPerDivision, setTeamsPerDivision] = useState(10);
  const [matchesPerPairing, setMatchesPerPairing] = useState(2);
  const [split, setSplit] = useState<"random" | "geographic">("random");
  const [climate, setClimate] = useState<"warm" | "temperate" | "cold">("temperate");
  const [cup, setCup] = useState(true);

  const [toggles, setToggles] = useState({
    homeAdvantage: true, weather: true, form: true, motivation: true,
    bigTeamAdvantage: false, derby: true, corruption: false, crowdTrouble: false, mirroring: false,
  });
  const [ownership, setOwnership] = useState<"capitalistic" | "mix" | "fans">("mix");
  const [statChanges, setStatChanges] = useState<"normal" | "slow" | "static">("normal");
  const [champSplit, setChampSplit] = useState(false);

  function build(bp?: Partial<CreateBlueprint>): LeagueSystem {
    const levelBlueprints = Array.from({ length: levels }, (_, li) => ({
      name: li === 0 ? "Premier Division" : `Division ${li + 1}`,
      split,
      divisions: Array.from({ length: divisionsPerLevel }, (_, di) => ({
        name: divisionsPerLevel > 1 ? `Level ${li + 1} · ${String.fromCharCode(65 + di)}` : `Division ${li + 1}`,
        teams: teamsPerDivision,
      })),
    }));
    const topN = Math.max(2, Math.min(6, Math.floor(teamsPerDivision / 2)));
    const blueprint: CreateBlueprint = {
      name, seed, matchesPerPairing, levels: levelBlueprints,
      rules: { ...toggles, climate, ownership, statChanges },
      relegationCount: 2, promotionCount: 2,
      championshipSplit: champSplit && teamsPerDivision > topN ? { topN, carry: "full", matchesPerPairing: 1 } : undefined,
      ...bp,
    };
    const league = createLeague(new RNG(seed), blueprint);
    if (cup) league.cup = defaultCup(league);
    return league;
  }

  function quickStart() {
    onCreate(build());
  }

  const t = (key: keyof typeof toggles) => (
    <label className="check" key={key}>
      <input type="checkbox" checked={toggles[key]} onChange={(e) => setToggles({ ...toggles, [key]: e.target.checked })} />
      {toggleLabel[key]}
    </label>
  );

  return (
    <div className="panel">
      <h2>Create your league system</h2>
      <p className="muted">You are the overseer. Design the pyramid, set the rules, then simulate seasons.</p>

      <div className="grid2">
        <div className="field"><label>League name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>Seed (same seed ⇒ same league)</label>
          <input value={seed} onChange={(e) => setSeed(e.target.value)} /></div>
        <div className="field"><label>Levels (tiers)</label>
          <input type="number" min={1} max={5} value={levels} onChange={(e) => setLevels(clamp(+e.target.value, 1, 5))} /></div>
        <div className="field"><label>Divisions per level</label>
          <input type="number" min={1} max={4} value={divisionsPerLevel} onChange={(e) => setDivisionsPerLevel(clamp(+e.target.value, 1, 4))} /></div>
        <div className="field"><label>Teams per division</label>
          <input type="number" min={3} max={30} value={teamsPerDivision} onChange={(e) => setTeamsPerDivision(clamp(+e.target.value, 3, 30))} /></div>
        <div className="field"><label>Matches per pairing</label>
          <input type="number" min={1} max={4} value={matchesPerPairing} onChange={(e) => setMatchesPerPairing(clamp(+e.target.value, 1, 4))} /></div>
        <div className="field"><label>Distribution on same level</label>
          <select value={split} onChange={(e) => setSplit(e.target.value as typeof split)}>
            <option value="random">Random</option>
            <option value="geographic">Geographic</option>
          </select></div>
        <div className="field"><label>Climate</label>
          <select value={climate} onChange={(e) => setClimate(e.target.value as typeof climate)}>
            <option value="warm">Warm (no snow)</option>
            <option value="temperate">Temperate (all weather)</option>
            <option value="cold">Cold (no very warm)</option>
          </select></div>
        <div className="field"><label>Team owners</label>
          <select value={ownership} onChange={(e) => setOwnership(e.target.value as typeof ownership)}>
            <option value="capitalistic">Capitalistic</option>
            <option value="mix">Mix</option>
            <option value="fans">51% Fans</option>
          </select></div>
        <div className="field"><label>Team stat changes</label>
          <select value={statChanges} onChange={(e) => setStatChanges(e.target.value as typeof statChanges)}>
            <option value="normal">Normal</option>
            <option value="slow">Slow</option>
            <option value="static">On hold (static)</option>
          </select></div>
      </div>

      <h3>Rules &amp; toggles</h3>
      <div className="grid2">{(Object.keys(toggles) as (keyof typeof toggles)[]).map(t)}</div>
      <label className="check"><input type="checkbox" checked={cup} onChange={(e) => setCup(e.target.checked)} /> Include a national cup (knockout)</label>
      <label className="check"><input type="checkbox" checked={champSplit} onChange={(e) => setChampSplit(e.target.checked)} /> Championship split — top division splits into two groups after the regular season (§6)</label>

      <div className="row" style={{ marginTop: "1rem" }}>
        <button className="btn primary" onClick={quickStart}>Create league ▸</button>
        <button className="btn" onClick={() => onCreateWorld(new World({ seed, countryCount: 4, teamsPerDivision, teamsPerCountry: 2 }))}>
          🌍 Create a World (4 countries + Champions Cup)
        </button>
        <span className="muted">{levels * divisionsPerLevel * teamsPerDivision} teams total</span>
      </div>
    </div>
  );
}

const toggleLabel: Record<string, string> = {
  homeAdvantage: "Home advantage (+1 Att/Def)",
  weather: "Weather affects games",
  form: "Form",
  motivation: "Motivation (late-season)",
  bigTeamAdvantage: "Big-team advantage",
  derby: "Derby rules",
  corruption: "League corruption",
  crowdTrouble: "Violent/disruptive crowd",
  mirroring: "Mirrored schedule",
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
}
