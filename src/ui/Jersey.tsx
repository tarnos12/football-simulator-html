/**
 * ui/Jersey.tsx — SVG mini-jersey renderer used in standings tables and results.
 *
 * Pure, deterministic, no state. Renders a shirt silhouette (body + two sleeves)
 * filled per the team's `Jersey.shirtPattern`, clipped to the shirt shape so
 * patterns never bleed outside. `JerseyPreview` adds shorts and a caption.
 */

import type { Jersey } from "../model/types";
import { JERSEY_PATTERNS, type JerseyPattern } from "../config";

// Shirt silhouette path within the "0 0 24 22" viewBox: neckline dip, two
// shoulders, two sleeves flaring to the sides, then the body down to the hem.
const SHIRT_PATH =
  "M9,2 Q12,4 15,2 L17,3 L23,6 L21,9 L18,8 L18,21 L6,21 L6,8 L3,9 L1,6 L7,3 Z";

const FALLBACK = "#888";

/** Colour at index `i`, falling back to the last colour, then to grey. */
function colorAt(colors: string[], i: number): string {
  if (colors.length === 0) return FALLBACK;
  return colors[i] ?? colors[colors.length - 1] ?? FALLBACK;
}

/** Deterministic, DOM-safe id derived from the jersey so clipPaths don't clash. */
function clipId(jersey: Jersey): string {
  const raw = `${jersey.shirtPattern}|${jersey.shirtColors.join(",")}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h * 31 + raw.charCodeAt(i)) | 0;
  }
  return `jersey-clip-${(h >>> 0).toString(36)}`;
}

/** Vertical stripes alternating the first two shirt colours. */
function verticalStripes(c0: string, c1: string, width: number): JSX.Element[] {
  const out: JSX.Element[] = [];
  for (let x = 0, i = 0; x < 24; x += width, i += 1) {
    out.push(
      <rect key={`vs${i}`} x={x} y={0} width={width} height={22} fill={i % 2 === 0 ? c0 : c1} />,
    );
  }
  return out;
}

/** Horizontal bands (col1) laid over the base colour. */
function horizontalBands(c1: string, count: number): JSX.Element[] {
  const out: JSX.Element[] = [];
  const top = 3;
  const bottom = 20;
  const span = bottom - top;
  const band = span / (count * 2 + 1);
  for (let i = 0; i < count; i += 1) {
    const y = top + band * (i * 2 + 1);
    out.push(<rect key={`hb${i}`} x={0} y={y} width={24} height={band} fill={c1} />);
  }
  return out;
}

/** The pattern fill for a shirt, drawn assuming a caller-provided clip. */
function shirtPattern(pattern: JerseyPattern, colors: string[]): JSX.Element {
  const c0 = colorAt(colors, 0);
  const c1 = colorAt(colors, 1);
  const base = <rect key="base" x={0} y={0} width={24} height={22} fill={c0} />;

  switch (pattern) {
    case "One color":
      return <g>{base}</g>;

    case "Shirt collar diff color":
      return (
        <g>
          {base}
          <rect key="collar" x={8} y={1} width={8} height={3} fill={c1} />
        </g>
      );

    case "Lateral colors":
      return (
        <g>
          {base}
          <rect key="l" x={0} y={0} width={8} height={22} fill={c1} />
          <rect key="r" x={16} y={0} width={8} height={22} fill={c1} />
        </g>
      );

    case "Stripes":
      return <g>{verticalStripes(c0, c1, 4)}</g>;

    case "Thin stripes":
      return <g>{verticalStripes(c0, c1, 2)}</g>;

    case "Thick stripes":
      return <g>{verticalStripes(c0, c1, 6)}</g>;

    case "Horizontal lines 1":
      return (
        <g>
          {base}
          {horizontalBands(c1, 1)}
        </g>
      );

    case "Horizontal lines 3":
      return (
        <g>
          {base}
          {horizontalBands(c1, 3)}
        </g>
      );

    case "Shoulder sleeves":
      // Only the sleeve regions lie outside x∈[6,18]; colouring the far sides
      // paints the sleeves/shoulders while leaving the body in c0.
      return (
        <g>
          {base}
          <rect key="ls" x={0} y={0} width={6} height={22} fill={c1} />
          <rect key="rs" x={18} y={0} width={6} height={22} fill={c1} />
        </g>
      );

    case "2 colors horizontal 50%":
      return (
        <g>
          {base}
          <rect key="bot" x={0} y={11} width={24} height={11} fill={c1} />
        </g>
      );

    case "2 colors horizontal 75%":
      return (
        <g>
          {base}
          <rect key="bot" x={0} y={16.25} width={24} height={5.75} fill={c1} />
        </g>
      );

    case "2 colors vertical 50%":
      return (
        <g>
          {base}
          <rect key="right" x={12} y={0} width={12} height={22} fill={c1} />
        </g>
      );

    case "2 colors vertical 75%":
      return (
        <g>
          {base}
          <rect key="right" x={17.5} y={0} width={6.5} height={22} fill={c1} />
        </g>
      );

    case "1 diagonal line left/right":
      return (
        <g>
          {base}
          <line key="diag" x1={0} y1={0} x2={24} y2={22} stroke={c1} strokeWidth={7} />
        </g>
      );

    case "1 diagonal line right/left":
      return (
        <g>
          {base}
          <line key="diag" x1={24} y1={0} x2={0} y2={22} stroke={c1} strokeWidth={7} />
        </g>
      );

    case "Arlequin":
      return (
        <g>
          <rect key="tl" x={0} y={0} width={12} height={11} fill={c0} />
          <rect key="tr" x={12} y={0} width={12} height={11} fill={c1} />
          <rect key="bl" x={0} y={11} width={12} height={11} fill={c1} />
          <rect key="br" x={12} y={11} width={12} height={11} fill={c0} />
        </g>
      );

    case "Vertical centre line":
      return (
        <g>
          {base}
          <rect key="c" x={10.5} y={0} width={3} height={22} fill={c1} />
        </g>
      );

    case "Cross":
      return (
        <g>
          {base}
          <rect key="v" x={10.5} y={0} width={3} height={22} fill={c1} />
          <rect key="h" x={0} y={9.5} width={24} height={3} fill={c1} />
        </g>
      );

    default:
      return <g>{base}</g>;
  }
}

/**
 * A small inline SVG jersey shirt. Width is a touch wider than tall because the
 * shirt (with sleeves) is wider than it is tall — hence viewBox "0 0 24 22".
 */
export function MiniJersey({ jersey, size = 18 }: { jersey: Jersey; size?: number }): JSX.Element {
  const id = clipId(jersey);
  const width = (size * 24) / 22;
  return (
    <svg
      width={width}
      height={size}
      viewBox="0 0 24 22"
      role="img"
      aria-label={`Jersey: ${jersey.shirtPattern}`}
      shapeRendering="crispEdges"
    >
      <defs>
        <clipPath id={id}>
          <path d={SHIRT_PATH} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{shirtPattern(jersey.shirtPattern, jersey.shirtColors)}</g>
      <path d={SHIRT_PATH} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.75} />
    </svg>
  );
}

/**
 * A larger jersey preview: shirt above, shorts below, pattern name as caption.
 */
export function JerseyPreview({ jersey }: { jersey: Jersey }): JSX.Element {
  const patternName: string = (JERSEY_PATTERNS as readonly string[]).includes(jersey.shirtPattern)
    ? jersey.shirtPattern
    : "One color";
  const shortColor = colorAt(jersey.shortColors, 0);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <MiniJersey jersey={jersey} size={72} />
      <svg width={44} height={24} viewBox="0 0 24 14" role="img" aria-label="Shorts" shapeRendering="crispEdges">
        <path
          d="M2,1 L22,1 L22,6 L15,13 L13,13 L12,6 L11,13 L9,13 L2,6 Z"
          fill={shortColor}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={0.75}
        />
      </svg>
      <div className="muted">{patternName}</div>
    </div>
  );
}
