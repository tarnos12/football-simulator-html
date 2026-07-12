import { useState } from "react";
import { encodeShareCode, decodeShareCode } from "../model/serialize";
import type { LeagueSystem } from "../model/types";
import type { Campaign } from "../game/campaign";

/** Sharing & community (§22): export the current league as a code, import to load. */
export function ShareBar({ campaign, onImport }: { campaign: Campaign | null; onImport: (league: LeagueSystem) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const doExport = () => {
    if (!campaign) return;
    const code = encodeShareCode(campaign.league);
    setText(code);
    setOpen(true);
    setError(null);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
    }
  };

  const doImport = () => {
    try {
      const league = decodeShareCode(text);
      onImport(league);
      setOpen(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid share code");
    }
  };

  return (
    <>
      <button className="btn sm" onClick={() => { setOpen(!open); setError(null); }}>🔗 Share</button>
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h2 style={{ margin: 0 }}>Share league system</h2>
              <button className="close-x" onClick={() => setOpen(false)}>✕</button>
            </div>
            <p className="muted">Whole league systems are 100% shareable. Export a code, or paste one to load it.</p>
            <textarea className="share" value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste a share code here to import…" />
            {error && <div className="bad" style={{ fontSize: "0.85rem" }}>{error}</div>}
            <div className="row" style={{ marginTop: "0.6rem" }}>
              <button className="btn" onClick={doExport} disabled={!campaign}>Export current {copied ? "✓ copied" : ""}</button>
              <button className="btn primary" onClick={doImport} disabled={!text.trim()}>Import &amp; load</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
