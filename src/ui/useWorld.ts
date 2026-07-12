import { useCallback, useRef, useState } from "react";
import { World } from "../game/world";

/** Holds a mutable World (multi-country) and re-renders after each action. */
export function useWorld() {
  const ref = useRef<World | null>(null);
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  const start = useCallback((w: World) => { ref.current = w; rerender(); }, [rerender]);
  const act = useCallback((fn: (w: World) => void) => {
    if (ref.current) { fn(ref.current); rerender(); }
  }, [rerender]);
  const reset = useCallback(() => { ref.current = null; rerender(); }, [rerender]);

  return { world: ref.current, start, act, reset };
}
