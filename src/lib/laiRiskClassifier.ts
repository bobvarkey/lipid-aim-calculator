/**
 * Pure LAI 2023 risk-tier classifier — mirrors the logic in src/pages/MiniApp.tsx
 * (summary useMemo) so it can be unit-tested and exercised on a dedicated test page.
 *
 * Tiers: Low / Moderate / High / Very High / Extreme
 * LDL-C goals: <100 / <70 / <55 / <50 / ≤30 mg/dL
 */

export type LaiTier = "Extreme" | "Very High" | "High" | "Moderate" | "Low";
export type PreventCategory = "Low" | "Borderline" | "Intermediate" | "High";

export interface LaiClassifierInput {
  // Triggers for Extreme tier
  recurrentAscvd?: boolean;       // recurrent ASCVD despite LDL ≤30
  polyvascular?: boolean;          // polyvascular atherosclerotic disease

  // Triggers for Very High tier
  ascvd?: boolean;                 // established ASCVD
  diabetesTOD?: boolean;           // diabetes with target-organ damage
  ckdStage?: "1" | "2" | "3A" | "3B" | "4" | "5" | "";

  // Triggers for High tier
  diabetes?: boolean;              // diabetes without TOD

  // Major risk factors (LAI 2023 — used to count toward Moderate/High)
  htn?: boolean;
  smoker?: boolean;
  familyHx?: boolean;
  hyperchol?: boolean;             // LDL-C ≥160 mg/dL (auto-detected)
  lpaHigh?: boolean;               // Lp(a) ≥50 mg/dL or ≥125 nmol/L
  southAsian?: boolean;

  // 10-year PREVENT risk category (optional — when vitals sufficient)
  preventCategory?: PreventCategory;
}

export interface LaiClassifierResult {
  tier: LaiTier;
  ldlGoal: string;
  therapy: string;
  majorCount: number;
  reason: string;
}

export function classifyLai2023(input: LaiClassifierInput): LaiClassifierResult {
  const majorCount = [
    input.htn,
    input.smoker,
    input.familyHx,
    input.hyperchol,
    input.lpaHigh,
    input.southAsian,
  ].filter(Boolean).length;

  if (input.recurrentAscvd || input.polyvascular) {
    return {
      tier: "Extreme",
      ldlGoal: "≤30 mg/dL",
      therapy: "Max-intensity statin + ezetimibe + PCSK9i/inclisiran",
      majorCount,
      reason: input.recurrentAscvd ? "Recurrent ASCVD on therapy" : "Polyvascular disease",
    };
  }

  if (
    input.ascvd ||
    input.diabetesTOD ||
    (input.ckdStage === "4" || input.ckdStage === "5")
  ) {
    return {
      tier: "Very High",
      ldlGoal: "<50 mg/dL",
      therapy: "High-intensity statin + ezetimibe; add PCSK9i if above goal",
      majorCount,
      reason: input.ascvd
        ? "Established ASCVD"
        : input.diabetesTOD
        ? "Diabetes + target-organ damage"
        : `CKD stage ${input.ckdStage}`,
    };
  }

  if (
    input.diabetes ||
    input.ckdStage === "3A" ||
    input.ckdStage === "3B" ||
    majorCount >= 3 ||
    input.preventCategory === "High"
  ) {
    return {
      tier: "High",
      ldlGoal: "<55 mg/dL",
      therapy: "High-intensity statin; add ezetimibe if not at goal",
      majorCount,
      reason: input.diabetes
        ? "Diabetes mellitus"
        : input.ckdStage === "3A" || input.ckdStage === "3B"
        ? `CKD stage ${input.ckdStage}`
        : majorCount >= 3
        ? `${majorCount} major risk factors`
        : "PREVENT 10-y risk ≥20%",
    };
  }

  if (majorCount === 2 || input.preventCategory === "Intermediate") {
    return {
      tier: "Moderate",
      ldlGoal: "<70 mg/dL",
      therapy: "Moderate→high-intensity statin; consider CAC if uncertain",
      majorCount,
      reason: majorCount === 2 ? "2 major risk factors" : "PREVENT 10-y risk 7.5–<20%",
    };
  }

  return {
    tier: "Low",
    ldlGoal: "<100 mg/dL",
    therapy: "Lifestyle; pharmacotherapy if CAC ≥100 or enhancer present",
    majorCount,
    reason: majorCount <= 1 ? `${majorCount} major risk factor(s)` : "PREVENT 10-y risk <7.5%",
  };
}

// ─── Reference scenarios used by the LAI Test page and unit tests ────────
export interface LaiScenario {
  id: string;
  title: string;
  description: string;
  expected: LaiTier;
  input: LaiClassifierInput;
}

export const LAI_TEST_SCENARIOS: LaiScenario[] = [
  {
    id: "extreme-recurrent",
    title: "Recurrent MI despite LDL ≤30 on maximal therapy",
    description: "62 y M, prior MI 2021, recurrent NSTEMI 2024 while on rosuvastatin 40 + ezetimibe + alirocumab; LDL-C 28 mg/dL.",
    expected: "Extreme",
    input: { recurrentAscvd: true, ascvd: true, htn: true, smoker: false },
  },
  {
    id: "extreme-polyvascular",
    title: "Polyvascular disease (CAD + PAD)",
    description: "70 y M with prior PCI for CAD and symptomatic PAD (ABI 0.7); diabetic.",
    expected: "Extreme",
    input: { polyvascular: true, ascvd: true, diabetes: true, htn: true },
  },
  {
    id: "very-high-ascvd",
    title: "Stable established ASCVD",
    description: "58 y F, prior ischemic stroke, hypertensive, non-smoker, LDL-C 110 mg/dL.",
    expected: "Very High",
    input: { ascvd: true, htn: true },
  },
  {
    id: "very-high-dm-tod",
    title: "Diabetes with target-organ damage",
    description: "55 y M, T2DM 15 y, retinopathy + microalbuminuria; no prior ASCVD.",
    expected: "Very High",
    input: { diabetes: true, diabetesTOD: true, htn: true },
  },
  {
    id: "very-high-ckd4",
    title: "CKD stage 4 (eGFR 22)",
    description: "67 y F, eGFR 22 mL/min/1.73 m², hypertensive, non-diabetic.",
    expected: "Very High",
    input: { ckdStage: "4", htn: true },
  },
  {
    id: "high-dm",
    title: "Diabetes without TOD",
    description: "52 y M, T2DM 4 y, no microvascular complications; LDL 140 mg/dL.",
    expected: "High",
    input: { diabetes: true, htn: true },
  },
  {
    id: "high-ckd-3b",
    title: "CKD stage 3B",
    description: "70 y F, eGFR 35, no diabetes, no ASCVD.",
    expected: "High",
    input: { ckdStage: "3B", htn: true },
  },
  {
    id: "high-3rf",
    title: "≥3 major risk factors",
    description: "48 y M, South Asian, HTN, current smoker, FHx premature CAD (father MI age 50).",
    expected: "High",
    input: { htn: true, smoker: true, familyHx: true, southAsian: true },
  },
  {
    id: "high-prevent",
    title: "PREVENT 10-y risk ≥20%",
    description: "65 y M, SBP 150, LDL 170, HDL 35; PREVENT 10-y = 22% → High category.",
    expected: "High",
    input: { htn: true, preventCategory: "High" },
  },
  {
    id: "moderate-2rf",
    title: "2 major risk factors",
    description: "45 y M, HTN + current smoker; no diabetes, no ASCVD, no FHx.",
    expected: "Moderate",
    input: { htn: true, smoker: true },
  },
  {
    id: "moderate-prevent",
    title: "PREVENT 10-y risk 7.5–<20%",
    description: "58 y F, SBP 138, mild dyslipidemia; PREVENT 10-y = 12% → Intermediate.",
    expected: "Moderate",
    input: { preventCategory: "Intermediate" },
  },
  {
    id: "low-1rf",
    title: "0–1 major risk factor",
    description: "40 y F, only mild HTN, non-smoker, no FHx, normal lipids.",
    expected: "Low",
    input: { htn: true, preventCategory: "Low" },
  },
  {
    id: "low-clean",
    title: "Healthy adult, no risk factors",
    description: "35 y M, normotensive, non-smoker, normal lipids, no FHx.",
    expected: "Low",
    input: { preventCategory: "Low" },
  },
];
