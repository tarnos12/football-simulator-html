import { useMemo } from "react";
import { RNG } from "./core/rng";
import { buildLeagueSystem } from "./model/factory";
import { encodeShareCode, decodeShareCode, serializeLeague } from "./model/serialize";

/**
 * Phase 1 foundation smoke screen. The full creator/simulation UI arrives in
 * Phase 5; for now this proves the foundation end-to-end: build a league in
 * memory, round-trip it through the share code, and confirm it is byte-identical.
 */
export function App() {
  const status = useMemo(() => {
    const rng = new RNG("demo-seed");
    const league = buildLeagueSystem(rng, {
      name: "Demo League",
      seed: "demo-seed",
      matchesPerPairing: 2,
      split: "random",
      levels: [
        { name: "Premier", divisions: [{ name: "Division 1", teams: 8 }] },
        { name: "Championship", divisions: [{ name: "Division 2", teams: 8 }] },
      ],
    });
    const code = encodeShareCode(league);
    const restored = decodeShareCode(code);
    const identical = serializeLeague(league) === serializeLeague(restored);
    return {
      teams: Object.keys(league.teams).length,
      divisions: league.levels.flatMap((l) => l.divisions).length,
      identical,
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">⚽ World of Sports</div>
        <div className="tagline">God-mode fantasy football league simulator</div>
      </header>
      <section className="panel">
        <h1>Foundation online</h1>
        <p>
          The deterministic core is in place: seeded PRNG, the balance tables, the
          Team-Card &amp; league-system data model, and 100%-shareable serialisation.
        </p>
        <ul className="status-list">
          <li>Demo league built in memory: <strong>{status.teams} teams</strong> across <strong>{status.divisions} divisions</strong></li>
          <li>
            Serialise → deserialise → serialise byte-identical:{" "}
            <strong className={status.identical ? "ok" : "bad"}>
              {status.identical ? "✓ lossless" : "✗ mismatch"}
            </strong>
          </li>
        </ul>
        <p className="muted">The creation wizard and season simulator land in later phases.</p>
      </section>
    </main>
  );
}
