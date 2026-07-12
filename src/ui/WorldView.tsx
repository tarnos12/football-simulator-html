import { useState } from "react";
import type { World } from "../game/world";
import { StandingsTable } from "./StandingsTable";
import { ResultsView } from "./ResultsView";
import { TeamCardModal } from "./TeamCardModal";
import { scoreText } from "./format";

/**
 * World view (§19): several countries each running their own league, plus an
 * international cup. Switch countries, edit country strengths, and play the
 * strength-weighted Champions Cup.
 */
export function WorldView({ world, act, onReset }: {
  world: World;
  act: (fn: (w: World) => void) => void;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<string>("0");
  const [teamModal, setTeamModal] = useState<{ countryIndex: number; teamId: string } | null>(null);
  const allDone = world.allSeasonsComplete();

  const country = tab !== "intl" ? world.countries[+tab] : null;
  const topDivId = country?.campaign.league.levels[0].divisions[0].id ?? "";

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">⚽ World of Sports</div>
        <div className="tagline">International mode</div>
        <div className="spacer" />
        <button className="btn sm ghost" onClick={onReset}>New league</button>
      </header>

      <div className="panel">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row"><strong>World season {world.seasonNumber}</strong><span className="muted">{world.countries.length} countries</span></div>
          <div className="row">
            <button className="btn sm primary" disabled={allDone} onClick={() => act((w) => w.simulateAllSeasons())}>⏭ Sim all seasons</button>
            <button className="btn sm" disabled={!allDone || !!world.international?.complete} onClick={() => act((w) => w.runInternational())}>🏆 Run Champions Cup</button>
            <button className="btn sm good" disabled={!allDone} onClick={() => act((w) => w.advanceAll())}>Next season ▸</button>
          </div>
        </div>
      </div>

      <div className="tabs">
        {world.countries.map((c, i) => (
          <button key={i} className={`tab ${tab === String(i) ? "active" : ""}`} onClick={() => setTab(String(i))}>
            {c.name} <span className="muted">· str {c.strength}</span>
          </button>
        ))}
        <button className={`tab ${tab === "intl" ? "active" : ""}`} onClick={() => setTab("intl")}>🌍 International</button>
      </div>

      {country && (
        <>
          <StandingsTable campaign={country.campaign} divisionId={topDivId} onOpenTeam={(id) => setTeamModal({ countryIndex: +tab, teamId: id })} />
          <ResultsView campaign={country.campaign} divisionId={topDivId} onOpenTeam={(id) => setTeamModal({ countryIndex: +tab, teamId: id })} />
        </>
      )}

      {tab === "intl" && <International world={world} act={act} />}

      {teamModal && (
        <TeamCardModal
          campaign={world.countries[teamModal.countryIndex].campaign}
          teamId={teamModal.teamId}
          onClose={() => setTeamModal(null)}
          onChange={() => act(() => {})}
        />
      )}
    </main>
  );
}

function International({ world, act }: { world: World; act: (fn: (w: World) => void) => void }) {
  const intl = world.international;
  return (
    <>
      <div className="panel">
        <h2>Country strengths <span className="muted">(1–9; stronger leagues are favoured)</span></h2>
        <div className="grid2">
          {world.countries.map((c, i) => (
            <div className="field" key={i}>
              <label>{c.name}</label>
              <input type="number" min={1} max={9} value={c.strength} onChange={(e) => act((w) => w.setStrength(i, +e.target.value))} />
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Champions Cup</h2>
        {!intl ? (
          <p className="muted">Simulate all countries' seasons, then run the Champions Cup to draw their top teams together.</p>
        ) : (
          <>
            {intl.championId && <div className="banner">🏆 <strong>{world.intlName(intl.championId)}</strong> win the {intl.name}!</div>}
            <div className="bracket">
              {intl.rounds.map((round, ri) => (
                <div className="bracket-round" key={ri}>
                  <div className="muted" style={{ fontSize: "0.8rem", fontWeight: 700 }}>{round.name}</div>
                  {round.ties.map((tie, ti) => (
                    <div className="tie" key={ti}>
                      <div className={tie.winnerId === tie.aId ? "win" : ""}>{world.intlName(tie.aId)}</div>
                      <div className={tie.winnerId === tie.bId ? "win" : ""}>{world.intlName(tie.bId)}</div>
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
    </>
  );
}
