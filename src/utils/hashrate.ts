// Hashrate display helpers.
//
// Miner sources report wildly different magnitudes — a NerdMiner does a few
// KH/s, a mobile CPU miner a few hundred H/s, a Kaspa ASIC ~GH/s, and a BTC
// BitAxe/Antminer is TH/s-and-up (a large farm can reach PH/s). Anything that
// hardcodes "GH/s" is therefore wrong for most of that range. Normalize every
// source to base H/s, then scale the unit dynamically for display.

/** Multipliers to convert a value in a single-letter unit (e.g. "G") to H/s. */
const UNIT_TO_HS: Record<string, number> = {
  H: 1,
  K: 1e3,
  M: 1e6,
  G: 1e9,
  T: 1e12,
  P: 1e15,
  E: 1e18,
};

/** Convert a single-letter hashrate unit (e.g. "G", "T") to its H/s multiplier.
 *  Defaults to GH/s for the unknown/empty case to match legacy ASIC behavior. */
export function hashrateUnitToHs(unit: string | undefined): number {
  const key = (unit || "G").trim().toUpperCase().charAt(0);
  return UNIT_TO_HS[key] ?? 1e9;
}

const SCALE: { suffix: string; factor: number }[] = [
  { suffix: "PH/s", factor: 1e15 },
  { suffix: "TH/s", factor: 1e12 },
  { suffix: "GH/s", factor: 1e9 },
  { suffix: "MH/s", factor: 1e6 },
  { suffix: "KH/s", factor: 1e3 },
  { suffix: "H/s", factor: 1 },
];

/** Pick the most readable unit for a hashrate given in H/s. */
export function scaleHashrate(hs: number): { value: number; unit: string; factor: number } {
  const abs = Math.abs(hs);
  for (const s of SCALE) {
    if (abs >= s.factor) return { value: hs / s.factor, unit: s.suffix, factor: s.factor };
  }
  return { value: hs, unit: "H/s", factor: 1 };
}

/** Format a hashrate given in H/s, dynamically scaling KH/s → PH/s. */
export function formatHashrate(hs: number, decimals = 2): string {
  if (!hs || hs <= 0) return "0 H/s";
  const { value, unit } = scaleHashrate(hs);
  return `${value.toFixed(decimals)} ${unit}`;
}

/** Convert a GH/s value (the unit farm snapshots are normalized to) to H/s. */
export function ghsToHs(ghs: number): number {
  return ghs * 1e9;
}
