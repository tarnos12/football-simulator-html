import { useEffect, useState } from "react";
import "./ui/styles.css";
import { useCampaign } from "./ui/useCampaign";
import { CreateWizard } from "./ui/CreateWizard";
import { StandingsTable } from "./ui/StandingsTable";
import { ResultsView } from "./ui/ResultsView";
import { CupView } from "./ui/CupView";
import { LocationMap } from "./ui/LocationMap";
import { StatsView } from "./ui/StatsView";
import { CreatorTools } from "./ui/CreatorTools";
import { SeasonSummary } from "./ui/SeasonSummary";
import { TeamCardModal } from "./ui/TeamCardModal";
import { ShareBar } from "./ui/ShareBar";

type Tab = "table" | "results" | "map" | "cup" | "summary" | "stats" | "creator";

export function App() {
  const { campaign, start, act, reset } = useCampaign();
  const [tab, setTab] = useState<Tab>("table");
  const [divisionId, setDivisionId] = useState<string>("");
  const [teamModal, setTeamModal] = useState<string | null>(null);

  const divisions = campaign?.league.levels.flatMap((l) => l.divisions) ?? [];
  useEffect(() => {
    if (divisions.length && !divisions.some((d) => d.id === divisionId)) setDivisionId(divisions[0].id);
  }, [divisions, divisionId]);

  if (!campaign) {
    return (
      <Shell campaign={null} onImport={start} onReset={reset}>
        <CreateWizard onCreate={start} />
      </Shell>
    );
  }

  const complete = campaign.seasonComplete();
  const tabs: { id: Tab; label: string; show: boolean }[] = [
    { id: "table", label: "Table", show: true },
    { id: "results", label: "Results", show: true },
    { id: "map", label: "Map", show: true },
    { id: "cup", label: "Cup", show: !!campaign.cup },
    { id: "summary", label: "Summary", show: complete },
    { id: "stats", label: "History", show: true },
    { id: "creator", label: "Creator tools", show: true },
  ];
  const activeTab = tabs.find((t) => t.id === tab && t.show) ? tab : "table";

  return (
    <Shell campaign={campaign} onImport={start} onReset={reset}>
      <div className="panel" data-testid="controls">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            <strong>Season {campaign.seasonNumber}</strong>
            <span className="muted">{campaign.league.name}</span>
          </div>
          <div className="row">
            <button className="btn sm" data-testid="sim-round" disabled={complete} onClick={() => act((c) => c.simulateNextRound())}>▶ Sim round</button>
            <button className="btn sm primary" data-testid="sim-season" disabled={complete} onClick={() => act((c) => c.simulateSeason())}>⏭ Sim whole season</button>
            <button className="btn sm good" data-testid="next-season" disabled={!complete} onClick={() => { act((c) => c.advanceToNextSeason()); setTab("table"); }}>Next season ▸</button>
          </div>
        </div>
        {complete && <div className="banner" style={{ marginTop: "0.6rem", marginBottom: 0 }} data-testid="season-complete">Season complete — check the Summary, then advance to the next season (teams change &amp; promotion/relegation resolves).</div>}
      </div>

      <div className="tabs">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.id} className={`tab ${activeTab === t.id ? "active" : ""}`} data-testid={`tab-${t.id}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {(activeTab === "table" || activeTab === "results") && divisions.length > 1 && (
        <div className="row" style={{ marginBottom: "0.6rem" }}>
          <button className="btn sm" onClick={() => stepDivision(-1)}>◀</button>
          <select value={divisionId} onChange={(e) => setDivisionId(e.target.value)} data-testid="division-select">
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn sm" onClick={() => stepDivision(1)}>▶</button>
        </div>
      )}

      {activeTab === "table" && divisionId && <StandingsTable campaign={campaign} divisionId={divisionId} onOpenTeam={setTeamModal} />}
      {activeTab === "results" && divisionId && <ResultsView campaign={campaign} divisionId={divisionId} onOpenTeam={setTeamModal} />}
      {activeTab === "map" && <LocationMap campaign={campaign} divisionId={divisionId} onOpenTeam={setTeamModal} />}
      {activeTab === "cup" && <CupView campaign={campaign} act={act} />}
      {activeTab === "summary" && <SeasonSummary campaign={campaign} />}
      {activeTab === "stats" && <StatsView history={campaign.history} teams={campaign.league.teams} />}
      {activeTab === "creator" && <CreatorTools campaign={campaign} act={act} />}

      {teamModal && (
        <TeamCardModal campaign={campaign} teamId={teamModal} onClose={() => setTeamModal(null)} onChange={() => act(() => {})} />
      )}
    </Shell>
  );

  function stepDivision(dir: number) {
    const idx = divisions.findIndex((d) => d.id === divisionId);
    const next = divisions[(idx + dir + divisions.length) % divisions.length];
    if (next) setDivisionId(next.id);
  }
}

function Shell({ campaign, onImport, onReset, children }: {
  campaign: import("./game/campaign").Campaign | null;
  onImport: (l: import("./model/types").LeagueSystem) => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">⚽ World of Sports</div>
        <div className="tagline">God-mode league simulator</div>
        <div className="spacer" />
        <ShareBar campaign={campaign} onImport={onImport} />
        {campaign && <button className="btn sm ghost" onClick={onReset}>New league</button>}
      </header>
      {children}
    </main>
  );
}
