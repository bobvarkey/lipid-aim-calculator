import { Card } from "@/components/ui/card";
import { Heart, TrendingUp, AlertTriangle, Dna, Activity, ShieldCheck, ListChecks, Stethoscope } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import MermaidChart from "@/components/MermaidChart";

// ─── Primary Prevention reference content (migrated from former Prevention tab) ───
const PRIMARY_PREVENTION_STEPS = [
  {
    title: "Step 1 — Define Population & Assess Baseline",
    items: [
      "Confirm no clinical ASCVD (no prior MI, stroke, PAD, revascularization).",
      "Obtain fasting or nonfasting lipid panel, A1c, creatinine, urine albumin/creatinine, etc.",
      "Calculate 10-year ASCVD risk with PREVENT-ASCVD for adults 30–79 y (updated ACC/AHA guideline) or Pooled Cohort Equations where PREVENT is not yet embedded.",
    ],
  },
  {
    title: "Step 2 — Decide on Lipid-Lowering Therapy",
    items: [
      "Threshold to treat: updated guideline recommends initiating lipid-lowering therapy at 10-year ASCVD risk ≥5%.",
      "For adults 40–75 y with LDL-C 70–189 mg/dL and 10-year risk ≥7.5%, moderate- to high-intensity statin is recommended.",
      "5–7.5% supports moderate-intensity statin after discussion.",
    ],
  },
  {
    title: "Step 3 — Apply LDL-C Thresholds",
    items: [
      "General primary prevention goal: LDL-C <100 mg/dL to prevent a first MI or stroke.",
      "Higher-risk primary prevention (e.g., diabetes, HIV, CKD) — target <70 mg/dL.",
      "If the patient later develops ASCVD and is extremely high risk, aim for <55 mg/dL.",
    ],
  },
  {
    title: "Step 4 — Refine Risk & Intensify If Needed",
    items: [
      "When treatment is uncertain or borderline, use CAC scoring, Lp(a), and apoB to reclassify risk and support earlier therapy.",
      "Start with statin; add ezetimibe, PCSK9 inhibitor, or bempedoic acid if LDL-C goals are not reached or statin intolerance exists.",
    ],
  },
  {
    title: "Step 5 — Lifestyle & Follow-Up",
    items: [
      "Reinforce diet, weight, and physical activity at every visit.",
      "Recheck lipids 4–12 weeks after therapy change, then every 3–12 months to assess adherence and goal attainment.",
    ],
  },
];

const PRIMARY_PREVENTION_TIERS = [
  { risk: "Low (<5%)",            ldl: "<100 mg/dL",                  color: "text-success",  bg: "bg-success/10"  },
  { risk: "Borderline (5–7.5%)",  ldl: "<100 mg/dL — consider statin", color: "text-primary",  bg: "bg-primary/10"  },
  { risk: "Intermediate (7.5–20%)", ldl: "<70 mg/dL",                 color: "text-warning",  bg: "bg-warning/10"  },
  { risk: "High (≥20%)",          ldl: "<55 mg/dL",                   color: "text-danger",   bg: "bg-danger/10"   },
];

const DIABETES_PROTOCOL = [
  { label: "Diabetes mellitus (baseline)", target: "<70 mg/dL" },
  { label: "Diabetes + target organ damage or ≥2 major ASCVD RF", target: "<50 mg/dL" },
  { label: "Diabetes + ASCVD (Extreme Risk A)", target: "≤30 mg/dL (optional)" },
  { label: "ASCVD + Diabetes with TOD or ≥2 major ASCVD RF", target: "≤30 mg/dL" },
];

const ACS_PROTOCOL = [
  "All ASCVD patients must achieve LDL-C <50 mg/dL.",
  "Recurrent ACS or polyvascular disease (Extreme Risk B): target ≤30 mg/dL.",
  "Lipid profile at emergency triage; repeat within 2 weeks of initiating therapy.",
  "Start combination therapy (high-intensity statin + ezetimibe) at presentation to ED.",
  "Intensify every 2 weeks until goals achieved, preferably by week 4.",
];

export default function EducationSection() {
  return (
    <div className="space-y-6">

      {/* 2026 AHA/ACC At-a-Glance */}
      <Card className="border-indigo-500/30 bg-indigo-500/5 p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
            <Heart className="h-4 w-4 text-indigo-500" />
          </div>
          <h3 className="font-display text-base font-bold text-indigo-600 dark:text-indigo-400">2026 AHA/ACC Dyslipidemia Guidelines At-a-Glance</h3>
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-4 p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/10">
          The American Heart Association and American College of Cardiology released the first cholesterol guideline update in eight years, with <strong className="text-indigo-600 dark:text-indigo-400">52 distinct new recommendations</strong>.
        </p>

        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">Key Recommendation</p>
          <p className="text-sm text-foreground leading-relaxed">
            <strong className="text-emerald-600 dark:text-emerald-400">Lp(a) Screening:</strong> Measure Lp(a) at least once in every adult's life to identify very high inherited levels (&gt;180 mg/dL), which can reclassify moderate-risk patients to higher risk.
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-2.5 text-sm text-foreground leading-relaxed mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2">Biggest Changes</p>
          <p>• <strong className="text-amber-600 dark:text-amber-400">Lp(a) testing</strong> is now recommended for all adults.</p>
          <p>• Treatment is now recommended for <strong className="text-amber-600 dark:text-amber-400">younger adults</strong>, based on 30-year risk projections.</p>
          <p>• <strong className="text-amber-600 dark:text-amber-400">ApoB testing, hsCRP, and CAC</strong> are recommended more frequently.</p>
          <p>• <strong className="text-amber-600 dark:text-amber-400">Specific LDL targets are back</strong>, after being removed in the 2013 guidelines.</p>
        </div>

        {/* Risk Categories & LDL-C Targets */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Risk Categories & LDL-C Targets</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Risk Level</th>
                  <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Clinical Criteria</th>
                  <th className="text-left py-2 font-semibold text-muted-foreground">LDL-C Target</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-3 font-semibold text-danger">Very High</td>
                  <td className="py-2.5 pr-3 text-xs leading-relaxed">ASCVD, diabetes with organ damage/&gt;20y duration, eGFR&lt;30, FH with ASCVD, SCORE&gt;10%</td>
                  <td className="py-2.5 font-semibold whitespace-nowrap">&lt;55 mg/dL<br /><span className="font-normal text-xs text-muted-foreground">(&lt;40 recurrent ASCVD)</span></td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-3 font-semibold text-warning">High</td>
                  <td className="py-2.5 pr-3 text-xs leading-relaxed">LDL-C&gt;190, TC&gt;310, BP&gt;180/110, FH, diabetes&gt;10y, eGFR 30–59, SCORE 5–10%</td>
                  <td className="py-2.5 font-semibold">&lt;70 mg/dL</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2.5 pr-3 font-semibold text-primary">Moderate</td>
                  <td className="py-2.5 pr-3 text-xs leading-relaxed">Younger diabetes, diabetes&lt;10y without other risks, SCORE 1–5%</td>
                  <td className="py-2.5 font-semibold">&lt;100 mg/dL</td>
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 font-semibold text-success">Low</td>
                  <td className="py-2.5 pr-3 text-xs leading-relaxed">SCORE &lt;1%</td>
                  <td className="py-2.5 font-semibold">&lt;116 mg/dL</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ApoB Treatment Targets */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">ApoB Treatment Targets</p>
          <p className="text-sm text-foreground leading-relaxed mb-3">
            Because on-treatment LDL-C and apoB levels were nearly identical in trial data, the same number can be used for both.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Risk Level</th>
                  <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">LDL-C Target</th>
                  <th className="text-left py-2 font-semibold text-muted-foreground">ApoB Target</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-3 font-semibold text-danger">Very High</td>
                  <td className="py-2 pr-3">&lt;55 mg/dL</td>
                  <td className="py-2">&lt;55 mg/dL (0.55 g/L)</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-3 font-semibold text-warning">High</td>
                  <td className="py-2 pr-3">&lt;70 mg/dL</td>
                  <td className="py-2">&lt;70 mg/dL (0.70 g/L)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3 font-semibold text-primary">Moderate</td>
                  <td className="py-2 pr-3">&lt;100 mg/dL</td>
                  <td className="py-2">&lt;100 mg/dL (1.0 g/L)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ApoB Reference Ranges */}
          <div className="mt-4 rounded-lg border border-primary/10 bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Key ApoB Levels (Reference Ranges)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Category</th>
                    <th className="text-left py-2 font-semibold text-muted-foreground">ApoB Level</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-semibold text-primary">Optimal</td>
                    <td className="py-2">&lt;80 mg/dL (&lt;60 mg/dL for high risk)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-semibold text-warning">Borderline High</td>
                    <td className="py-2">90–109 mg/dL</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 font-semibold text-danger">High Risk</td>
                    <td className="py-2">≥110 mg/dL (often ≥120 mg/dL)</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 pr-3 text-muted-foreground">Male Typical</td>
                    <td className="py-2">66–133 mg/dL</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-3 text-muted-foreground">Female Typical</td>
                    <td className="py-2">60–117 mg/dL</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Treatment Goals Table */}
          <div className="mt-4 rounded-lg border border-primary/10 bg-background p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Treatment Goals: Non-HDL-C, LDL-C & ApoB (mg/dL)</p>
            <p className="text-xs text-muted-foreground mb-2">*ApoB is a secondary, optional target.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Risk</th>
                    <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Non-HDL-C</th>
                    <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">LDL-C</th>
                    <th className="text-left py-2 font-semibold text-primary">ApoB*</th>
                  </tr>
                </thead>
                <tbody className="text-foreground">
                  <tr className="border-b border-border/50"><td className="py-2 pr-3">Low</td><td className="py-2 pr-3">&lt;130</td><td className="py-2 pr-3">&lt;100</td><td className="py-2 font-semibold text-primary">&lt;90</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 pr-3">Moderate</td><td className="py-2 pr-3">&lt;130</td><td className="py-2 pr-3">&lt;100</td><td className="py-2 font-semibold text-primary">&lt;90</td></tr>
                  <tr className="border-b border-border/50"><td className="py-2 pr-3">High</td><td className="py-2 pr-3">&lt;130</td><td className="py-2 pr-3">&lt;100</td><td className="py-2 font-semibold text-primary">&lt;90</td></tr>
                  <tr><td className="py-2 pr-3 font-semibold">Very High</td><td className="py-2 pr-3">&lt;100</td><td className="py-2 pr-3">&lt;70</td><td className="py-2 font-semibold text-primary">&lt;80</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-danger mt-3 leading-relaxed font-medium">
            ⚠️ Elevated levels of Lp(a) significantly increase the risk of heart disease, stroke, and aortic valve stenosis, even if your other cholesterol numbers are normal.
          </p>
        </div>

        {/* Clinical ASCVD Definition */}
        <div className="rounded-lg border border-border bg-muted/50 p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Clinical ASCVD: Very High Risk Definition</p>
          <p className="text-sm text-foreground leading-relaxed mb-2">
            ≥2 major ASCVD events <strong>OR</strong> 1 major ASCVD event + ≥2 high-risk conditions:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-foreground">
            <div>
              <p className="font-semibold mb-1">Major ASCVD Events:</p>
              <p className="text-muted-foreground leading-relaxed">ACS, MI, ischemic stroke, symptomatic PAD</p>
            </div>
            <div>
              <p className="font-semibold mb-1">High-Risk Conditions:</p>
              <p className="text-muted-foreground leading-relaxed">Age ≥65, coronary bypass/PCI, current smoker, diabetes, HF, HTN, LDL-C ≥100 despite max statin + ezetimibe</p>
            </div>
          </div>
        </div>

        {/* CAC Score Management */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Subclinical Atherosclerosis — CAC Score Management</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">CAC Score</th>
                  <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Risk / Action</th>
                  <th className="text-left py-2 font-semibold text-muted-foreground">LDL-C Target</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/50"><td className="py-2.5 pr-3">0</td><td className="py-2.5 pr-3">Low risk</td><td className="py-2.5 font-semibold">&lt;100 mg/dL</td></tr>
                <tr className="border-b border-border/50"><td className="py-2.5 pr-3">1–99 AU</td><td className="py-2.5 pr-3">Start moderate statin</td><td className="py-2.5 font-semibold">&lt;70 mg/dL</td></tr>
                <tr className="border-b border-border/50"><td className="py-2.5 pr-3">100–399 AU</td><td className="py-2.5 pr-3">High-intensity statin</td><td className="py-2.5 font-semibold">&lt;55 mg/dL</td></tr>
                <tr><td className="py-2.5 pr-3">≥400 AU</td><td className="py-2.5 pr-3">Very high-intensity</td><td className="py-2.5 font-semibold">&lt;40 mg/dL</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Primary Prevention Table */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Primary Prevention: Adults 30–79y Without ASCVD</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">10-Year Risk</th>
                  <th className="text-left py-2 font-semibold text-muted-foreground">LDL-C Target</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/50"><td className="py-2 pr-3">Low (&lt;5%)</td><td className="py-2 font-semibold">&lt;100 mg/dL</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-3">Borderline (5–7.5%)</td><td className="py-2 font-semibold">&lt;100 mg/dL <span className="font-normal text-xs text-muted-foreground">(consider)</span></td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-3">Intermediate (7.5–20%)</td><td className="py-2 font-semibold">&lt;70 mg/dL</td></tr>
                <tr><td className="py-2 pr-3">High (≥20%)</td><td className="py-2 font-semibold">&lt;55 mg/dL</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Treatment Algorithms */}
        <div className="space-y-4 mb-5">
          <div className="rounded-lg border border-danger/20 bg-danger/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-danger mb-2">Secondary Prevention: Very High Risk ASCVD</p>
            <ol className="space-y-1.5 text-sm text-foreground leading-relaxed list-decimal list-inside">
              <li>Start <strong>high-intensity statin</strong> → LDL &lt;55 mg/dL</li>
              <li>Add <strong>ezetimibe</strong> if not at goal</li>
              <li>Add <strong>PCSK9 inhibitor</strong> if still not at goal</li>
              <li>Monitor adherence and lifestyle</li>
            </ol>
          </div>
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-warning mb-2">Secondary Prevention: Not Very High Risk ASCVD</p>
            <ol className="space-y-1.5 text-sm text-foreground leading-relaxed list-decimal list-inside">
              <li>Start <strong>moderate statin</strong> → LDL &lt;70 mg/dL</li>
              <li>Add <strong>ezetimibe</strong> if not at goal</li>
              <li>Add <strong>bempedoic acid</strong> if statin-intolerant</li>
              <li>Optional goal: &lt;55 mg/dL</li>
            </ol>
          </div>
          <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-purple-500 mb-2">Severe Hypercholesterolemia (LDL-C ≥190 mg/dL)</p>
            <ol className="space-y-1.5 text-sm text-foreground leading-relaxed list-decimal list-inside">
              <li><strong>Cascade screening</strong> + complete genetic testing</li>
              <li>Add <strong>ezetimibe</strong></li>
              <li>Add <strong>PCSK9 inhibitor</strong> if not at goal</li>
            </ol>
          </div>
        </div>

        {/* TG ≥500 */}
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-500 mb-2">Adults with Triglycerides ≥500 mg/dL</p>
          <ol className="space-y-1.5 text-sm text-foreground leading-relaxed list-decimal list-inside">
            <li>Identify/manage <strong>secondary causes</strong></li>
            <li><strong>Lifestyle:</strong> Optimize diet/exercise</li>
            <li>If TG persists ≥500 mg/dL:
              <ul className="ml-5 mt-1 space-y-1 list-disc">
                <li><strong>Pancreatitis risk:</strong> Refer to lipid specialist</li>
                <li><strong>Prevent ASCVD risk:</strong> Add fiber/omega-3, fenofibrate, or icosapent ethyl</li>
              </ul>
            </li>
          </ol>
        </div>

        {/* Statin-Intolerant */}
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-4 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-500 mb-2">Statin-Intolerant Adults</p>
          <div className="space-y-1.5 text-sm text-foreground leading-relaxed">
            <p>• Evaluate muscle symptoms</p>
            <p>• <strong>ASCVD absent:</strong> LDL &lt;100 mg/dL → ezetimibe</p>
            <p>• <strong>ASCVD present:</strong> LDL &lt;70 mg/dL → ezetimibe + bempedoic acid</p>
            <p>• If goals not met → Add <strong>PCSK9 inhibitor</strong></p>
          </div>
        </div>

        {/* Screening Recommendations */}
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Screening Recommendations</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">COR (Class of Recommendation)</th>
                  <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">LOE (Level of Evidence)</th>
                  <th className="text-left py-2 font-semibold text-muted-foreground">Recommendation</th>
                </tr>
              </thead>
              <tbody className="text-foreground">
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-3">
                    <p className="font-semibold">1</p>
                    <p className="text-xs text-muted-foreground">Class 1: Recommended/indicated. Evidence is strong that it works.</p>
                  </td>
                  <td className="py-2 pr-3">
                    <p className="font-semibold">B-NR</p>
                    <p className="text-xs text-muted-foreground">Based on Non-Randomized studies or registries (observational data).</p>
                  </td>
                  <td className="py-2 text-xs leading-relaxed">Lipid profile every 5y for ASCVD risk, more frequent with risk factors</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 pr-3">
                    <p className="font-semibold">1</p>
                    <p className="text-xs text-muted-foreground">Class 1: Recommended/indicated. Evidence is strong that it works.</p>
                  </td>
                  <td className="py-2 pr-3">
                    <p className="font-semibold">B-NR</p>
                    <p className="text-xs text-muted-foreground">Based on Non-Randomized studies or registries (observational data).</p>
                  </td>
                  <td className="py-2 text-xs leading-relaxed">Children 9–11y to screen for FH/other lipid disorders</td>
                </tr>
                <tr>
                  <td className="py-2 pr-3">
                    <p className="font-semibold">2a</p>
                    <p className="text-xs text-muted-foreground">Class 2a: Reasonable to do. Moderate evidence that it is useful.</p>
                  </td>
                  <td className="py-2 pr-3">
                    <p className="font-semibold">B-NR</p>
                    <p className="text-xs text-muted-foreground">Based on Non-Randomized studies or registries (observational data).</p>
                  </td>
                  <td className="py-2 text-xs leading-relaxed">Cascade screening with lipid profile for FH relatives</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Summary</p>
          <div className="space-y-1.5 text-sm text-foreground leading-relaxed">
            <p>• <strong>Screening:</strong> Lp(a) once in adults, lipid profile every 5y</p>
            <p>• <strong>Targets:</strong> Very high-risk &lt;55, high &lt;70, moderate &lt;100 mg/dL</p>
            <p>• <strong>Key drugs:</strong> Statins first, then ezetimibe / PCSK9i / bempedoic acid</p>
            <p>• <strong>Special cases:</strong> TG ≥500 → fibrates/omega-3; severe hypercholesterolemia → cascade screening + PCSK9i</p>
          </div>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground italic">
          Source: 2026 AHA/ACC Dyslipidemia Guidelines At-a-Glance
        </p>
      </Card>

      {/* Lp(a) Section */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-md border border-blue-500/30">
            <Dna className="h-5 w-5 text-blue-500" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">Lp(a) — Lipoprotein(a)</h3>
        </div>
        
        {/* Lp(a) Levels with Color-Coded Icons */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/5 border border-success/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-success/20">
              <Heart className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-sm font-semibold text-success">Optimal: ≤14 mg/dL</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/20">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary">Normal: ≤30 mg/dL</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-danger/5 border border-danger/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-danger/20">
              <AlertTriangle className="h-4 w-4 text-danger" />
            </div>
            <div>
              <p className="text-sm font-semibold text-danger">Elevated: &gt;50 mg/dL</p>
            </div>
          </div>
        </div>

        {/* Risk Progression */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20">
              <TrendingUp className="h-3 w-3 text-primary" />
            </div>
            <p className="text-sm text-foreground">
              Lp(a) 10–49 mg/dL → <strong className="text-primary">28% higher</strong> cardiovascular risk
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-warning/20">
              <TrendingUp className="h-3 w-3 text-warning" />
            </div>
            <p className="text-sm text-foreground">
              Lp(a) 50–99 mg/dL → <strong className="text-warning">44% higher</strong> cardiovascular risk
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-danger/20">
              <TrendingUp className="h-3 w-3 text-danger" />
            </div>
            <p className="text-sm text-foreground">
              Lp(a) &gt;100 mg/dL → <strong className="text-danger font-bold">114% higher</strong> cardiovascular risk
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground italic">
          Lp(a) confers a genetic risk — it represents a specific, highly inherited subset of particles that are particularly dangerous.
        </p>
      </Card>

      {/* Lp(a) Risk Table */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-md border border-orange-500/30">
            <Activity className="h-5 w-5 text-orange-500" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">Lp(a) & Relative ASCVD Risk</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Lp(a) Level</th>
                <th className="text-left py-2 font-semibold text-muted-foreground">Relative ASCVD Risk</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-success/20">
                      <Heart className="h-3 w-3 text-success" />
                    </div>
                    <span>&lt;75 nmol/L (&lt;30 mg/dL)</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className="font-semibold text-success">Reference (low)</span>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/20">
                      <Heart className="h-3 w-3 text-primary" />
                    </div>
                    <span>75–124 nmol/L (30–49 mg/dL)</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className="font-semibold text-primary">1.2×</span>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-warning/20">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                    </div>
                    <span>≥125 nmol/L (≥50 mg/dL)</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className="font-semibold text-warning">1.4×</span>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-danger/20">
                      <AlertTriangle className="h-5 w-5 text-danger" />
                    </div>
                    <span>≥250 nmol/L (≥100 mg/dL)</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className="font-bold text-danger">2×</span>
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-danger/30">
                      <AlertTriangle className="h-6 w-6 text-danger" />
                    </div>
                    <span>≥350 nmol/L (≥150 mg/dL)</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className="font-bold text-danger">3×</span>
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-danger/40">
                      <AlertTriangle className="h-7 w-7 text-danger" />
                    </div>
                    <span>≥430 nmol/L (≥180 mg/dL)</span>
                  </div>
                </td>
                <td className="py-3">
                  <span className="font-bold text-danger">4×</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ApoB Section */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md border border-purple-500/30">
            <Activity className="h-5 w-5 text-purple-500" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground">ApoB — Apolipoprotein B</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500/20 flex-shrink-0">
              <Dna className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-sm text-foreground">
              LDL is sometimes <strong className="text-purple-500">calculated</strong>; ApoB is always <strong className="text-purple-500">measured</strong>.
            </p>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/20 flex-shrink-0">
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-sm text-foreground">
              LDL is just one of three atherogenic particles. <strong className="text-blue-500">ApoB counts all of them.</strong>
            </p>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-cyan-500/20 flex-shrink-0">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
            </div>
            <p className="text-sm text-foreground">
              ApoB is a <strong className="text-cyan-500">more accurate predictor</strong> of cardiovascular events than LDL-C.
            </p>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/20 flex-shrink-0">
              <Heart className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-sm text-foreground">
              When ApoB and LDL-C disagree, <strong className="text-emerald-500">ApoB is the better predictor of risk</strong>.
            </p>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500/20 flex-shrink-0">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-sm text-foreground">
              Young adults with high ApoB but normal LDL-C had a <strong className="text-amber-500 font-bold">55% higher risk</strong> of developing coronary artery calcification 25 years later.
            </p>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground italic">
          ApoB is "sticky cholesterol" — it reflects the total number of atherogenic particles (LDL + Lp(a) + others).
        </p>
      </Card>
    </div>
  );
}
