/**
 * LAI 2023 lipid-lowering treatment targets for South Asian patients.
 *
 * Source: Puri R, et al. Lipid Association of India Expert Consensus Statement
 * on the Management of Dyslipidemia in Indians 2023.
 *
 * Units: mg/dL. Roles — LDL-C: Primary · Non-HDL-C: Co-primary · Apo-B: Secondary.
 */

export type LaiTargetKey =
  | "Low"
  | "Moderate"
  | "High"
  | "Very High"
  | "Extreme-A"
  | "Extreme-B"
  | "Extreme-C";

export interface LaiTargetRow {
  label: string;
  ldl: string;
  nonHdl: string;
  apoB: string;
}

export const LAI_LIPID_TARGETS: Record<LaiTargetKey, LaiTargetRow> = {
  Low:         { label: "Low-risk",          ldl: "<100",                nonHdl: "<130",                apoB: "<90" },
  Moderate:    { label: "Moderate-risk",     ldl: "<100 (optional <70)", nonHdl: "<130 (optional <100)", apoB: "<90" },
  High:        { label: "High-risk",         ldl: "<70",                 nonHdl: "<100",                apoB: "<80" },
  "Very High": { label: "Very high-risk",    ldl: "<50",                 nonHdl: "<80",                 apoB: "<65" },
  "Extreme-A": { label: "Extreme · Group A", ldl: "<50 (optional ≤30)",  nonHdl: "<80 (optional ≤60)",  apoB: "<65" },
  "Extreme-B": { label: "Extreme · Group B", ldl: "≤30",                 nonHdl: "≤60",                 apoB: "<50" },
  "Extreme-C": { label: "Extreme · Group C", ldl: "10–15",               nonHdl: "40–45",               apoB: "—" },
};

/** Resolve the LAI target row from a summary category + optional Extreme sub-group. */
export function resolveLaiTargetKey(
  category: "Low" | "Moderate" | "High" | "Very High" | "Extreme" | "Pending",
  extremeGroup?: "A" | "B" | "C" | null,
): LaiTargetKey | null {
  if (category === "Pending") return null;
  if (category === "Extreme") return `Extreme-${extremeGroup ?? "A"}` as LaiTargetKey;
  return category;
}
