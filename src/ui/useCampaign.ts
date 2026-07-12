import { useCallback, useRef, useState } from "react";
import { Campaign } from "../game/campaign";
import type { LeagueSystem } from "../model/types";

/**
 * Holds a mutable Campaign in a ref (the sim mutates the league in place as form
 * evolves) and forces re-renders via a tick counter after each action.
 */
export function useCampaign() {
  const ref = useRef<Campaign | null>(null);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const start = useCallback(
    (league: LeagueSystem) => {
      ref.current = new Campaign(league);
      rerender();
    },
    [rerender],
  );

  const act = useCallback(
    (fn: (c: Campaign) => void) => {
      if (ref.current) {
        fn(ref.current);
        rerender();
      }
    },
    [rerender],
  );

  const reset = useCallback(() => {
    ref.current = null;
    rerender();
  }, [rerender]);

  return { campaign: ref.current, start, act, reset };
}
