import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, AlertTriangle, Heart, Activity, Copy, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  {
    title: "Step 1 — Define Population & Assess Baseline",
    items: [
      "Confirm no clinical ASCVD (no prior MI, stroke, PAD, revascularization).",
      "Obtain fasting or nonfasting lipid panel, A1c, creatinine, urine albumin/creatinine, etc.",
      "Calculate 10‑year ASCVD risk with PREVENT-ASCVD for adults 30–79 y (updated ACC/AHA guideline) or Pooled Cohort Equations where PREVENT is not yet embedded.",
    ],
  },
  {
    title: "Step 2 — Decide on Lipid-Lowering Therapy",
    items: [
      "Threshold to treat: updated guideline recommends initiating lipid‑lowering therapy at 10‑year ASCVD risk ≥5%.",
      "For adults 40–75 y with LDL‑C 70–189 mg/dL and 10‑year risk ≥7.5%, moderate‑ to high‑intensity statin is recommended.",
      "5–7.5% supports moderate‑intensity statin after discussion.",
    ],
  },
  {
    title: "Step 3 — Apply LDL-C Thresholds",
    items: [
      "General primary prevention goal: LDL‑C <100 mg/dL to prevent a first MI or stroke.",
      "Higher‑risk primary prevention (e.g., diabetes, HIV, CKD) — target <70 mg/dL.",
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

const RISK_TIERS = [
  { risk: "Low (<5%)", ldl: "<100 mg/dL", color: "text-success", bg: "bg-success/10" },
  { risk: "Borderline (5–7.5%)", ldl: "<100 mg/dL", note: "consider statin", color: "text-primary", bg: "bg-primary/10" },
  { risk: "Intermediate (7.5–20%)", ldl: "<70 mg/dL", color: "text-warning", bg: "bg-warning/10" },
  { risk: "High (≥20%)", ldl: "<55 mg/dL", color: "text-danger", bg: "bg-danger/10" },
];

// ─── Diabetes Target Organ Damage sub-criteria (≥1 required) ───
const TOD_MICROVASCULAR = [
  { id: "tod_retinopathy", label: "Diabetic retinopathy", qualifier: "Microaneurysms, hemorrhages, macular edema on fundoscopy or retinal imaging" },
  { id: "tod_nephropathy", label: "Diabetic nephropathy", qualifier: "UACR ≥30 mg/g (micro-/macroalbuminuria) or reduced eGFR for age" },
  { id: "tod_neuropathy", label: "Diabetic neuropathy", qualifier: "Distal symmetric polyneuropathy, autonomic neuropathy, or foot-ulcer risk (monofilament/NCS)" },
];
const TOD_MACROVASCULAR = [
  { id: "tod_lvh", label: "Left-ventricular hypertrophy (LVH)", qualifier: "Increased LV mass index on echocardiography" },
  { id: "tod_diastolic", label: "Diastolic dysfunction", qualifier: "Abnormal E/e′ ratio or impaired global longitudinal strain on echo" },
  { id: "tod_subclinical", label: "Subclinical atherosclerosis", qualifier: "Elevated carotid IMT, carotid/femoral plaque, or coronary calcium score" },
];
const TOD_ALL = [...TOD_MICROVASCULAR, ...TOD_MACROVASCULAR];

// ─── Diabetes checklist items ───
const DM_CHECKLIST = [
  { id: "dm_baseline", label: "Diabetes mellitus (baseline)", target: "<70 mg/dL", hasTod: false },
  { id: "dm_tod", label: "Diabetes + target organ damage or ≥2 major ASCVD RF", target: "<50 mg/dL", hasTod: true },
  { id: "dm_ascvd", label: "Diabetes + ASCVD (Extreme Risk A)", target: "≤30 mg/dL (optional)", hasTod: false },
  { id: "dm_ascvd_tod", label: "ASCVD + Diabetes with TOD or ≥2 major ASCVD RF", target: "≤30 mg/dL", hasTod: true },
];

// ─── ACS checklist ───
const ACS_CHECKLIST = [
  { id: "acs_ldl50", label: "All ASCVD patients must achieve LDL-C <50 mg/dL" },
  { id: "acs_recurrent", label: "Recurrent ACS or polyvascular disease (Extreme Risk B): target ≤30 mg/dL" },
  { id: "acs_triage", label: "Lipid profile at emergency triage, repeat within 2 weeks of initiating therapy" },
  { id: "acs_combo", label: "Start combination therapy (high-intensity statin + ezetimibe) at presentation to ED" },
  { id: "acs_intensify", label: "Intensify every 2 weeks until goals achieved, preferably by week 4" },
];

// ─── Metabolic Syndrome sub-criteria (≥3 required) ───
const METSYN_CRITERIA = [
  { id: "ms_waist", label: "Large waistline — >40 in (102 cm) ♂, >35 in (88 cm) ♀" },
  { id: "ms_tg", label: "High triglycerides — ≥150 mg/dL (1.7 mmol/L) or on TG medication" },
  { id: "ms_hdl", label: "Low HDL — <40 mg/dL (1.0 mmol/L) ♂, <50 mg/dL (1.3 mmol/L) ♀, or on HDL medication" },
  { id: "ms_bp", label: "High blood pressure — ≥130 systolic or ≥85 diastolic, or on antihypertensive" },
  { id: "ms_glucose", label: "High fasting glucose — ≥100 mg/dL (5.6 mmol/L) or on glucose-lowering medication" },
];

// ─── Established ASCVD sub-items ───
const ASCVD_ESTABLISHED = [
  { id: "ascvd_cad", label: "CAD / Coronary ASCVD", qualifier: "Prior MI, angina requiring revascularization, or angiographically confirmed coronary stenosis ≥50%" },
  { id: "ascvd_stroke", label: "Ischemic stroke or TIA", qualifier: "Prior ischemic stroke confirmed by imaging, or TIA with neurovascular evidence" },
  { id: "ascvd_pad", label: "Peripheral arterial disease (PAD)", qualifier: "ABI <0.9, claudication with imaging confirmation, or prior peripheral revascularization" },
];

// ─── High-risk features checklist ───
const HIGHRISK_CHECKLIST = [
  { id: "hr_ascvd", label: "Established ASCVD" },
  { id: "hr_nafld", label: "Nonalcoholic fatty liver disease with fibrosis grades II and III" },
  { id: "hr_metsyn", label: "Metabolic syndrome" },
  { id: "hr_ckd", label: "Chronic kidney disease stage 3B/4", qualifier: "Stage 3B: eGFR 30–44 mL/min/1.73 m². Stage 4: eGFR 15–29 mL/min/1.73 m². Persistently reduced eGFR with or without albuminuria." },
  { id: "hr_fhx", label: "Family history of premature CHD", qualifier: "First-degree relative with CHD: male <55 years or female <65 years. Includes MI, coronary revascularization, or angina." },
  { id: "hr_apob", label: "ApoB >130 mg/dL" },
  { id: "hr_lpa", label: "Lp(a) ≥50 mg/dL" },
  { id: "hr_cac", label: "High coronary calcium / extensive plaque burden", qualifier: "CAC ≥100 AU or ≥75th percentile for age/sex/ethnicity; or multi-territory plaque (carotid, femoral, coronary) on imaging" },
  { id: "hr_dmtod", label: "Diabetes with target organ damage" },
  { id: "hr_extreme", label: "Extreme elevation of a single risk factor", qualifier: "e.g., LDL-C ≥190 mg/dL, TG ≥500 mg/dL, BP ≥180/120 mmHg, or A1c ≥10%" },
];

// ─── Risk modifiers checklist ───
const MODIFIER_CHECKLIST = [
  { id: "rm_tg", label: "Elevated TG (fasting >150 or nonfasting >175 mg/dL)" },
  { id: "rm_lpa", label: "Lp(a) 20–49 mg/dL" },
  { id: "rm_waist", label: "Increased waist circumference (>90 cm ♂, >80 cm ♀)" },
  { id: "rm_ifg", label: "Impaired fasting glucose (100–125 mg/dL)" },
  { id: "rm_crp", label: "hsCRP >2 mg/L" },
  { id: "rm_air", label: "Air pollution exposure" },
  { id: "rm_joint", label: "Inflammatory joint diseases", qualifier: "Rheumatoid arthritis, psoriatic arthritis, ankylosing spondylitis, or SLE" },
  { id: "rm_meno", label: "Premature menopause", qualifier: "Natural or surgical menopause before age 40" },
  { id: "rm_preeclampsia", label: "Preeclampsia / Gestational diabetes", qualifier: "History of preeclampsia, eclampsia, HELLP syndrome, or gestational diabetes in any pregnancy" },
  { id: "rm_pcos", label: "Polycystic ovary syndrome", qualifier: "Diagnosed per Rotterdam criteria (≥2 of: oligo/anovulation, hyperandrogenism, polycystic ovaries)" },
  { id: "rm_prs", label: "High polygenic risk score", qualifier: "Top 5–10% of population-based genomic risk distribution for ASCVD" },
  { id: "rm_hiv", label: "HIV infection" },
];

// ─── Risk upgrade interpretation ───
function getRiskUpgradeInterpretation(hrCount: number, rmCount: number) {
  const total = hrCount + rmCount;
  let severity: "none" | "mild" | "moderate" | "high" = "none";
  let message = "";
  let recommendation = "";

  if (total === 0) {
    severity = "none";
    message = "No high-risk features or risk modifiers identified.";
    recommendation = "Standard risk-based management per baseline ASCVD risk tier.";
  } else if (total === 1) {
    severity = "mild";
    message = `1 risk factor identified (${hrCount} high-risk, ${rmCount} modifier). A single significant modifier can tip borderline risk (5–7.5%) toward statin initiation.`;
    recommendation = "Consider moderate-intensity statin if borderline 10-year ASCVD risk. Discuss shared decision-making with patient.";
  } else if (total >= 2 && total <= 3) {
    severity = "moderate";
    message = `${total} risk factors identified (${hrCount} high-risk, ${rmCount} modifiers). ≥2 factors more reliably upgrade intermediate risk (7.5–20%) to higher categories.`;
    recommendation = "Strongly consider moderate-to-high intensity statin. Target LDL-C <70 mg/dL. Studies show clusters of ≥2 metabolic modifiers double event rates.";
  } else {
    severity = "high";
    message = `${total} risk factors identified (${hrCount} high-risk, ${rmCount} modifiers). Multiple compounding factors amplify ASCVD risk synergistically beyond individual prediction.`;
    recommendation = "Aggressive lipid-lowering therapy warranted. Target LDL-C <70 mg/dL (consider <55 mg/dL). Initiate high-intensity statin ± ezetimibe. Consider CAC or ABI testing to further refine risk.";
  }

  return { severity, message, recommendation, total };
}

export default function PrimaryPrevention() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [noteEdited, setNoteEdited] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [copied, setCopied] = useState(false);

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const countChecked = (items: { id: string }[]) =>
    items.filter((i) => checked[i.id]).length;

  const dmCount = countChecked(DM_CHECKLIST);
  const acsCount = countChecked(ACS_CHECKLIST);
  const msCount = countChecked(METSYN_CRITERIA);
  const metsynMet = msCount >= 3;
  const todCount = countChecked(TOD_ALL);
  const todMet = todCount >= 1;
  const ascvdCount = countChecked(ASCVD_ESTABLISHED);
  const ascvdMet = ascvdCount >= 1;
  const dmTodMet = todMet; // reuse TOD sub-checklist for hr_dmtod

  // Auto-check/uncheck hr_metsyn, hr_ascvd, hr_dmtod based on sub-criteria
  const hrCountRaw = countChecked(HIGHRISK_CHECKLIST);
  let hrCount = hrCountRaw;
  // Adjust for auto-qualified items
  if (metsynMet && !checked["hr_metsyn"]) hrCount++;
  if (!metsynMet && checked["hr_metsyn"]) hrCount--;
  if (ascvdMet && !checked["hr_ascvd"]) hrCount++;
  if (!ascvdMet && checked["hr_ascvd"]) hrCount--;
  if (dmTodMet && !checked["hr_dmtod"]) hrCount++;
  if (!dmTodMet && checked["hr_dmtod"]) hrCount--;
  const rmCount = countChecked(MODIFIER_CHECKLIST);

  const riskInfo = useMemo(() => getRiskUpgradeInterpretation(hrCount, rmCount), [hrCount, rmCount]);

  // ─── Generate exportable note ───
  const generatedNote = useMemo(() => {
    const lines: string[] = [];
    lines.push("═══ PRIMARY PREVENTION — CLINICAL SUMMARY ═══");
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push("");

    // Diabetes section
    const dmChecked = DM_CHECKLIST.filter((i) => checked[i.id] || (i.hasTod && todMet));
    if (dmChecked.length > 0) {
      lines.push("▸ DIABETES & DYSLIPIDEMIA — Day 1 Treatment:");
      dmChecked.forEach((i) => {
        lines.push(`  ✓ ${i.label} → Target: ${i.target}`);
        if (i.hasTod && todCount > 0) {
          const microChecked = TOD_MICROVASCULAR.filter((t) => checked[t.id]);
          const macroChecked = TOD_MACROVASCULAR.filter((t) => checked[t.id]);
          lines.push(`    Target organ damage (${todCount}/${TOD_ALL.length} — ≥1 required):`);
          if (microChecked.length > 0) {
            lines.push("      Microvascular:");
            microChecked.forEach((t) => lines.push(`        • ${t.label}`));
          }
          if (macroChecked.length > 0) {
            lines.push("      Macrovascular/Cardiac:");
            macroChecked.forEach((t) => lines.push(`        • ${t.label}`));
          }
        }
      });
      lines.push("");
    }

    // ACS section
    const acsChecked = ACS_CHECKLIST.filter((i) => checked[i.id]);
    if (acsChecked.length > 0) {
      lines.push("▸ ASCVD & ACS MANAGEMENT:");
      acsChecked.forEach((i) => lines.push(`  ✓ ${i.label}`));
      lines.push("");
    }

    // High-risk features
    const hrChecked = HIGHRISK_CHECKLIST.filter((i) =>
      checked[i.id] || (i.id === "hr_metsyn" && metsynMet) || (i.id === "hr_ascvd" && ascvdMet) || (i.id === "hr_dmtod" && dmTodMet)
    );
    if (hrChecked.length > 0) {
      lines.push(`▸ HIGH-RISK FEATURES (${hrChecked.length}/${HIGHRISK_CHECKLIST.length}):`);
      hrChecked.forEach((i) => {
        lines.push(`  ✓ ${i.label}`);
        if (i.id === "hr_ascvd") {
          const ascvdChecked = ASCVD_ESTABLISHED.filter((a) => checked[a.id]);
          ascvdChecked.forEach((a) => lines.push(`      • ${a.label}`));
        }
        if (i.id === "hr_metsyn") {
          const msChecked = METSYN_CRITERIA.filter((m) => checked[m.id]);
          lines.push(`    Sub-criteria met (${msCount}/5 — ≥3 required):`);
          msChecked.forEach((m) => lines.push(`      • ${m.label}`));
        }
        if (i.id === "hr_dmtod") {
          const microChecked = TOD_MICROVASCULAR.filter((t) => checked[t.id]);
          const macroChecked = TOD_MACROVASCULAR.filter((t) => checked[t.id]);
          lines.push(`    Target organ damage (${todCount}/${TOD_ALL.length} — ≥1 required):`);
          if (microChecked.length > 0) {
            lines.push("      Microvascular:");
            microChecked.forEach((t) => lines.push(`        • ${t.label}`));
          }
          if (macroChecked.length > 0) {
            lines.push("      Macrovascular/Cardiac:");
            macroChecked.forEach((t) => lines.push(`        • ${t.label}`));
          }
        }
      });
      lines.push("");
    }

    // Risk modifiers
    const rmChecked = MODIFIER_CHECKLIST.filter((i) => checked[i.id]);
    if (rmChecked.length > 0) {
      lines.push(`▸ RISK MODIFIERS (${rmChecked.length}/${MODIFIER_CHECKLIST.length}):`);
      rmChecked.forEach((i) => lines.push(`  ✓ ${i.label}`));
      lines.push("");
    }

    // Interpretation
    lines.push("▸ RISK UPGRADE ASSESSMENT:");
    lines.push(`  Combined risk factors: ${riskInfo.total} (${hrCount} high-risk features, ${rmCount} modifiers)`);
    lines.push(`  Interpretation: ${riskInfo.message}`);
    lines.push(`  Recommendation: ${riskInfo.recommendation}`);
    lines.push("");

    // Guideline references
    lines.push("▸ GUIDELINE FRAMEWORK:");
    lines.push("  • ACC/AHA: ≥1 risk-enhancing factor supports moderate-intensity statin for borderline/intermediate risk.");
    lines.push("  • ESC/SCORE2: 1–2 modifiers commonly suffice for reclassification; >4 risks overestimation.");
    lines.push("  • Practical: ≥2 metabolic modifiers alongside high-risk features double event rates.");
    lines.push("  • If uncertainty persists, discuss CAC scoring or ABI testing.");

    if (dmChecked.length === 0 && acsChecked.length === 0 && hrChecked.length === 0 && rmChecked.length === 0) {
      return "No checklist items selected. Complete the checklists above to generate a clinical summary note.";
    }

    return lines.join("\n");
  }, [checked, riskInfo, hrCount, rmCount, msCount, metsynMet, todCount, todMet, ascvdCount, ascvdMet, dmTodMet]);

  const displayNote = noteEdited ? customNote : generatedNote;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayNote);
      setCopied(true);
      toast.success("Note copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="space-y-4">
      {/* LDL-C Targets by 10-Year Risk */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground">
            Primary Prevention LDL-C Targets by 10-Year ASCVD Risk
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RISK_TIERS.map((t) => (
            <div key={t.risk} className={`rounded-lg ${t.bg} px-4 py-3`}>
              <p className={`text-xs font-semibold ${t.color}`}>{t.risk}</p>
              <p className="text-lg font-bold text-foreground mt-1">{t.ldl}</p>
              {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
            </div>
          ))}
        </div>
      </Card>

      {/* 5-Step Workflow */}
      {STEPS.map((step, i) => (
        <Card key={i} className="border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {i + 1}
            </span>
            <div className="flex-1">
              <h3 className="font-display text-sm font-bold text-foreground mb-2">{step.title}</h3>
              <ul className="space-y-1.5">
                {step.items.map((item, j) => (
                  <li key={j} className="text-sm text-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ))}

      {/* ─── Diabetes Day-1 Treatment (Checklist) ─── */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-danger" />
            <h3 className="font-display text-sm font-bold text-foreground">
              Diabetes & Dyslipidemia — Day 1 Treatment
            </h3>
          </div>
          {dmCount > 0 && (
            <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger">
              {dmCount}/{DM_CHECKLIST.length}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Initiate dyslipidemia treatment <strong className="text-foreground">on day 1</strong> of diagnosis. Targets must be attained by <strong className="text-foreground">week 12</strong>.
        </p>
        <div className="space-y-2">
          {DM_CHECKLIST.map((item) => {
            const isTodItem = item.hasTod;
            const isAutoChecked = isTodItem && todMet;
            const isChecked = isTodItem ? (isAutoChecked || !!checked[item.id]) : !!checked[item.id];
            return (
              <div key={item.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isChecked ? "bg-danger/8 ring-1 ring-danger/20" : "hover:bg-muted/50"
                  }`}
                >
                  {isTodItem ? (
                    <>
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggle(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm leading-snug text-foreground">{item.label}</span>
                        <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          todMet ? "bg-danger/15 text-danger" : "bg-muted text-muted-foreground"
                        }`}>
                          TOD: {todCount}/{TOD_ALL.length} — {todMet ? "Qualified ✓" : "≥1 required"}
                        </span>
                        <span className={`ml-1 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold ${
                          isChecked ? "bg-danger/15 text-danger" : "text-muted-foreground"
                        }`}>
                          {item.target}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Checkbox
                        checked={!!checked[item.id]}
                        onCheckedChange={() => toggle(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm leading-snug text-foreground">{item.label}</span>
                        <span className={`ml-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold ${
                          checked[item.id] ? "bg-danger/15 text-danger" : "text-muted-foreground"
                        }`}>
                          {item.target}
                        </span>
                      </div>
                    </>
                  )}
                </label>

                {/* TOD sub-checklist — show under the first TOD item */}
                {item.id === "dm_tod" && (
                  <div className="ml-8 mt-2 mb-1 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Target Organ Damage Criteria (≥1 microvascular or macrovascular required):
                    </p>

                    {/* Microvascular */}
                    <div>
                      <p className="text-[11px] font-bold text-danger/80 uppercase tracking-wide mb-1.5">Microvascular</p>
                      <div className="space-y-1.5">
                        {TOD_MICROVASCULAR.map((tod) => (
                          <label
                            key={tod.id}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                              checked[tod.id] ? "bg-danger/10 ring-1 ring-danger/15" : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={!!checked[tod.id]}
                              onCheckedChange={() => toggle(tod.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm leading-snug text-foreground">{tod.label}</span>
                              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tod.qualifier}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Macrovascular */}
                    <div>
                      <p className="text-[11px] font-bold text-danger/80 uppercase tracking-wide mb-1.5">Macrovascular / Cardiac</p>
                      <div className="space-y-1.5">
                        {TOD_MACROVASCULAR.map((tod) => (
                          <label
                            key={tod.id}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                              checked[tod.id] ? "bg-danger/10 ring-1 ring-danger/15" : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={!!checked[tod.id]}
                              onCheckedChange={() => toggle(tod.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm leading-snug text-foreground">{tod.label}</span>
                              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tod.qualifier}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ─── ASCVD & ACS Management (Checklist) ─── */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">ASCVD & ACS Management</h3>
          </div>
          {acsCount > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {acsCount}/{ACS_CHECKLIST.length}
            </span>
          )}
        </div>
        <div className="space-y-2 mt-3">
          {ACS_CHECKLIST.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                checked[item.id] ? "bg-primary/8 ring-1 ring-primary/20" : "hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={!!checked[item.id]}
                onCheckedChange={() => toggle(item.id)}
                className="mt-0.5"
              />
              <span className="text-sm leading-snug text-foreground">{item.label}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Subclinical Atherosclerosis */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground leading-relaxed">
        <strong>Subclinical Atherosclerosis:</strong> Any form — including nonobstructive carotid, femoral, or coronary plaques or ABI &lt;0.9 — is considered <strong>equivalent to ASCVD</strong>, with similar LDL-C targets as for clinically manifest ASCVD.
      </div>

      {/* ─── High-Risk Features (Checklist) ─── */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <h3 className="font-display text-sm font-bold text-foreground">High-Risk Features (LDL-C Target &lt;70 mg/dL)</h3>
          </div>
          {hrCount > 0 && (
            <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
              {hrCount}/{HIGHRISK_CHECKLIST.length}
            </span>
          )}
        </div>
        <div className="space-y-2 mt-3">
          {HIGHRISK_CHECKLIST.map((item) => {
            const isAutoItem = item.id === "hr_metsyn" || item.id === "hr_ascvd" || item.id === "hr_dmtod";
            const isAutoMet = item.id === "hr_metsyn" ? metsynMet
              : item.id === "hr_ascvd" ? ascvdMet
              : item.id === "hr_dmtod" ? dmTodMet
              : false;
            const isChecked = isAutoItem ? isAutoMet : !!checked[item.id];

            return (
              <div key={item.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isChecked ? "bg-warning/8 ring-1 ring-warning/20" : "hover:bg-muted/50"
                  }`}
                >
                  {isAutoItem ? (
                    <>
                      <Checkbox checked={isAutoMet} disabled className="mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm leading-snug text-foreground">{item.label}</span>
                        {item.id === "hr_metsyn" && (
                          <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            metsynMet ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                          }`}>
                            {msCount}/5 — {metsynMet ? "Criteria Met ✓" : "≥3 required"}
                          </span>
                        )}
                        {item.id === "hr_ascvd" && (
                          <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            ascvdMet ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                          }`}>
                            {ascvdCount}/{ASCVD_ESTABLISHED.length} — {ascvdMet ? "Confirmed ✓" : "≥1 required"}
                          </span>
                        )}
                        {item.id === "hr_dmtod" && (
                          <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            dmTodMet ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                          }`}>
                            TOD: {todCount}/{TOD_ALL.length} — {dmTodMet ? "Qualified ✓" : "≥1 required"}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <Checkbox
                        checked={!!checked[item.id]}
                        onCheckedChange={() => toggle(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm leading-snug text-foreground">{item.label}</span>
                        {item.qualifier && (
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.qualifier}</p>
                        )}
                      </div>
                    </>
                  )}
                </label>

                {/* Established ASCVD sub-checklist */}
                {item.id === "hr_ascvd" && (
                  <div className="ml-8 mt-2 mb-1 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Select applicable ASCVD manifestations (≥1 required):
                    </p>
                    {ASCVD_ESTABLISHED.map((a) => (
                      <label
                        key={a.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                          checked[a.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={!!checked[a.id]}
                          onCheckedChange={() => toggle(a.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm leading-snug text-foreground">{a.label}</span>
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{a.qualifier}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Metabolic Syndrome sub-checklist */}
                {item.id === "hr_metsyn" && (
                  <div className="ml-8 mt-2 mb-1 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      Diagnostic Criteria (at least 3 of 5 required):
                    </p>
                    {METSYN_CRITERIA.map((ms) => (
                      <label
                        key={ms.id}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                          checked[ms.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={!!checked[ms.id]}
                          onCheckedChange={() => toggle(ms.id)}
                          className="mt-0.5"
                        />
                        <span className="text-sm leading-snug text-foreground">{ms.label}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* DM Target Organ Damage sub-checklist */}
                {item.id === "hr_dmtod" && (
                  <div className="ml-8 mt-2 mb-1 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Target Organ Damage Criteria (≥1 microvascular or macrovascular required):
                    </p>
                    <div>
                      <p className="text-[11px] font-bold text-warning/80 uppercase tracking-wide mb-1.5">Microvascular</p>
                      <div className="space-y-1.5">
                        {TOD_MICROVASCULAR.map((tod) => (
                          <label
                            key={tod.id}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                              checked[tod.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={!!checked[tod.id]}
                              onCheckedChange={() => toggle(tod.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm leading-snug text-foreground">{tod.label}</span>
                              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tod.qualifier}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-warning/80 uppercase tracking-wide mb-1.5">Macrovascular / Cardiac</p>
                      <div className="space-y-1.5">
                        {TOD_MACROVASCULAR.map((tod) => (
                          <label
                            key={tod.id}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                              checked[tod.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox
                              checked={!!checked[tod.id]}
                              onCheckedChange={() => toggle(tod.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm leading-snug text-foreground">{tod.label}</span>
                              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tod.qualifier}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ─── Risk Modifiers (Checklist) ─── */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">Risk Modifiers (May Upgrade Low/Moderate → Higher Risk)</h3>
          </div>
          {rmCount > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {rmCount}/{MODIFIER_CHECKLIST.length}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          No fixed number required — even 1 significant modifier can tip borderline risk toward statin initiation, while ≥2 more reliably upgrade intermediate risk.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {MODIFIER_CHECKLIST.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-start gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                checked[item.id] ? "bg-primary/8 ring-1 ring-primary/20" : "hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={!!checked[item.id]}
                onCheckedChange={() => toggle(item.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm leading-snug text-foreground">{item.label}</span>
                {item.qualifier && (
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.qualifier}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </Card>

      {/* ─── Risk Upgrade Interpretation ─── */}
      <Card className={`border-border bg-card p-5 ${
        riskInfo.severity === "high" ? "ring-1 ring-danger/30" :
        riskInfo.severity === "moderate" ? "ring-1 ring-warning/30" :
        riskInfo.severity === "mild" ? "ring-1 ring-primary/30" : ""
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className={`h-4 w-4 ${
            riskInfo.severity === "high" ? "text-danger" :
            riskInfo.severity === "moderate" ? "text-warning" :
            riskInfo.severity === "mild" ? "text-primary" : "text-muted-foreground"
          }`} />
          <h3 className="font-display text-sm font-bold text-foreground">
            Compounding Risk Assessment
          </h3>
          {riskInfo.total > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              riskInfo.severity === "high" ? "bg-danger/15 text-danger" :
              riskInfo.severity === "moderate" ? "bg-warning/15 text-warning" :
              "bg-primary/15 text-primary"
            }`}>
              {riskInfo.total} factor{riskInfo.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div className={`rounded-lg px-4 py-3 mb-3 ${
          riskInfo.severity === "high" ? "bg-danger/8" :
          riskInfo.severity === "moderate" ? "bg-warning/8" :
          riskInfo.severity === "mild" ? "bg-primary/8" : "bg-muted/50"
        }`}>
          <p className="text-sm text-foreground leading-relaxed">{riskInfo.message}</p>
          <p className="text-sm text-foreground leading-relaxed mt-2 font-medium">{riskInfo.recommendation}</p>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground">
          <p><strong className="text-foreground">ACC/AHA:</strong> ≥1 risk-enhancing factor supports moderate-intensity statin for borderline/intermediate risk. Multiple enhancers strengthen the decision without a numeric cutoff.</p>
          <p><strong className="text-foreground">ESC/SCORE2:</strong> 1–2 modifiers commonly suffice for reclassification; &gt;4 risks overestimation.</p>
          <p><strong className="text-foreground">Practical:</strong> ≥2 metabolic modifiers alongside high-risk features double event rates. Consider CAC or ABI testing if uncertainty persists.</p>
        </div>
      </Card>

      {/* ─── Exportable Clinical Note ─── */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">Exportable Clinical Note</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy Note"}
          </Button>
        </div>
        <Textarea
          value={displayNote}
          onChange={(e) => {
            setNoteEdited(true);
            setCustomNote(e.target.value);
          }}
          className="font-mono text-xs leading-relaxed min-h-[280px] bg-muted/30 border-border"
        />
        {noteEdited && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 text-xs text-muted-foreground"
            onClick={() => {
              setNoteEdited(false);
              setCustomNote("");
            }}
          >
            Reset to auto-generated note
          </Button>
        )}
      </Card>
    </div>
  );
}
