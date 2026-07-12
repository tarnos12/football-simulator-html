/**
 * ui/StatsView.tsx — statistics & history screen (§20).
 *
 * Pure/derived rendering over the accumulated season archives. All figures come
 * from `stats/records`; this file only shapes them into panels, a table, record
 * tiles, and an optional head-to-head picker.
 */

import { useState } from "react";
import type { SeasonArchive, StreakRecord } from "../stats/records";
import type { Team } from "../model/types";
import {
  allTimeTable,
  mostChampionships,
  extremeResults,
  longestStreaks,
  headToHead,
} from "../stats/records";

export function StatsView({
  history,
  teams,
}: {
  history: SeasonArchive[];
  teams: Record<string, Team>;
}) {
  const nameOf = (teamId: string) => teams[teamId]?.name ?? teamId;

  if (history.length === 0) {
    return (
      <div className="panel muted">
        No completed seasons yet — simulate and finish a season to build history.
      </div>
    );
  }

  const table = allTimeTable(history);
  const champions = mostChampionships(history).filter((c) => c.titles > 0);
  const { biggestWin, mostGoals } = extremeResults(history);
  const streaks = longestStreaks(history);

  const STREAK_LABEL: Record<StreakRecord["kind"], string> = {
    win: "Longest win streak",
    unbeaten: "Longest unbeaten run",
    loss: "Longest losing streak",
    winless: "Longest winless run",
  };

  return (
    <>
      {/* ── All-time table ── */}
      <div className="panel">
        <h2>All-time table</h2>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Team</th>
                <th className="num">Sea</th>
                <th className="num">Pl</th>
                <th className="num">W</th>
                <th className="num">D</th>
                <th className="num">L</th>
                <th className="num">GF</th>
                <th className="num">GA</th>
                <th className="num">Pts</th>
                <th className="num">Titles</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => (
                <tr key={row.teamId}>
                  <td className="num">{i + 1}</td>
                  <td>{nameOf(row.teamId)}</td>
                  <td className="num">{row.seasons}</td>
                  <td className="num">{row.played}</td>
                  <td className="num">{row.won}</td>
                  <td className="num">{row.drawn}</td>
                  <td className="num">{row.lost}</td>
                  <td className="num">{row.goalsFor}</td>
                  <td className="num">{row.goalsAgainst}</td>
                  <td className="num">{row.points}</td>
                  <td className="num">{row.titles}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Most championships ── */}
      <div className="panel">
        <h2>Most championships</h2>
        {champions.length === 0 ? (
          <div className="muted">No top-division champions recorded yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>Team</th>
                  <th className="num">Titles</th>
                </tr>
              </thead>
              <tbody>
                {champions.map((c) => (
                  <tr key={c.teamId}>
                    <td>{nameOf(c.teamId)}</td>
                    <td className="num">{c.titles}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Records ── */}
      <div className="panel">
        <h2>Records</h2>
        <div className="statgrid">
          <div className="stat">
            <div className="k">Biggest win</div>
            <div className="v">
              {biggestWin
                ? `${biggestWin.match.homeGoals}–${biggestWin.match.awayGoals}`
                : "—"}
            </div>
            <div className="muted">
              {biggestWin
                ? `${nameOf(biggestWin.match.homeId)} vs ${nameOf(
                    biggestWin.match.awayId,
                  )} · Season ${biggestWin.seasonNumber}`
                : "No matches yet"}
            </div>
          </div>

          <div className="stat">
            <div className="k">Highest-scoring match</div>
            <div className="v">
              {mostGoals
                ? `${mostGoals.match.homeGoals}–${mostGoals.match.awayGoals}`
                : "—"}
            </div>
            <div className="muted">
              {mostGoals
                ? `${mostGoals.totalGoals} goals · ${nameOf(
                    mostGoals.match.homeId,
                  )} vs ${nameOf(mostGoals.match.awayId)} · Season ${
                    mostGoals.seasonNumber
                  }`
                : "No matches yet"}
            </div>
          </div>

          {(Object.keys(STREAK_LABEL) as StreakRecord["kind"][]).map((kind) => {
            const s = streaks[kind];
            return (
              <div className="stat" key={kind}>
                <div className="k">{STREAK_LABEL[kind]}</div>
                <div className="v">{s ? `${s.length}` : "—"}</div>
                <div className="muted">
                  {s
                    ? `${nameOf(s.teamId)} · Season ${s.seasonNumber}`
                    : "None yet"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <HeadToHeadPanel history={history} teams={teams} nameOf={nameOf} />
    </>
  );
}

// ── Optional head-to-head picker ──
function HeadToHeadPanel({
  history,
  teams,
  nameOf,
}: {
  history: SeasonArchive[];
  teams: Record<string, Team>;
  nameOf: (teamId: string) => string;
}) {
  const options = Object.values(teams).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const [aId, setAId] = useState<string>(options[0]?.id ?? "");
  const [bId, setBId] = useState<string>(options[1]?.id ?? options[0]?.id ?? "");

  if (options.length < 2) return null;

  const h2h = aId && bId && aId !== bId ? headToHead(history, aId, bId) : null;

  return (
    <div className="panel">
      <h2>Head-to-head</h2>
      <div className="statgrid">
        <div className="stat">
          <div className="k">Team A</div>
          <div className="v">
            <select value={aId} onChange={(e) => setAId(e.target.value)}>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="muted">{nameOf(aId)}</div>
        </div>
        <div className="stat">
          <div className="k">Team B</div>
          <div className="v">
            <select value={bId} onChange={(e) => setBId(e.target.value)}>
              {options.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="muted">{nameOf(bId)}</div>
        </div>
      </div>

      {!h2h ? (
        <div className="muted">Pick two different teams to compare.</div>
      ) : h2h.games === 0 ? (
        <div className="muted">These teams have never met.</div>
      ) : (
        <div className="statgrid">
          <div className="stat">
            <div className="k">Meetings</div>
            <div className="v">{h2h.games}</div>
            <div className="muted">across all seasons</div>
          </div>
          <div className="stat">
            <div className="k">Record (A–D–B)</div>
            <div className="v">{`${h2h.aWins}–${h2h.draws}–${h2h.bWins}`}</div>
            <div className="muted">
              {nameOf(aId)} wins · draws · {nameOf(bId)} wins
            </div>
          </div>
          <div className="stat">
            <div className="k">Goals (A–B)</div>
            <div className="v">{`${h2h.aGoals}–${h2h.bGoals}`}</div>
            <div className="muted">
              {nameOf(aId)} vs {nameOf(bId)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
