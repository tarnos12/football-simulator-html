/**
 * model/serialize.ts — 100%-shareable state (§22).
 *
 * A league system must round-trip through serialisation with no loss: serialise
 * → deserialise → serialise is byte-identical. We achieve that with a stable
 * stringifier that sorts object keys recursively, so the byte stream depends only
 * on content, never on insertion order.
 */

import type { LeagueSystem } from "./types";

export const SCHEMA_VERSION = 1;

/** Deterministic JSON: object keys sorted recursively; arrays preserve order. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

/** Serialise a league system to a canonical string. */
export function serializeLeague(league: LeagueSystem): string {
  return stableStringify(league);
}

/** Parse a serialised league system back into a live object. */
export function deserializeLeague(json: string): LeagueSystem {
  const parsed = JSON.parse(json) as LeagueSystem;
  if (typeof parsed.schemaVersion !== "number") {
    throw new Error("Invalid league file: missing schemaVersion");
  }
  if (parsed.schemaVersion > SCHEMA_VERSION) {
    throw new Error(
      `League file schema v${parsed.schemaVersion} is newer than supported v${SCHEMA_VERSION}`,
    );
  }
  return parsed;
}

/**
 * Base64 wrapper for a compact, copy-pasteable share code. Uses UTF-8 safe
 * encoding that works in both browser and Node (no wall-clock, deterministic).
 */
export function encodeShareCode(league: LeagueSystem): string {
  const json = serializeLeague(league);
  return base64Encode(json);
}

export function decodeShareCode(code: string): LeagueSystem {
  return deserializeLeague(base64Decode(code.trim()));
}

function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  if (typeof btoa === "function") return btoa(binary);
  // Node fallback
  return Buffer.from(str, "utf-8").toString("base64");
}

function base64Decode(code: string): string {
  if (typeof atob === "function") {
    const binary = atob(code);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(code, "base64").toString("utf-8");
}

/** Deep structural clone via the canonical form — handy for editable runtime copies. */
export function cloneLeague(league: LeagueSystem): LeagueSystem {
  return JSON.parse(JSON.stringify(league)) as LeagueSystem;
}
