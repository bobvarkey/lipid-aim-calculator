import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ShieldCheck, AlertTriangle, Heart, Activity, Copy, FileText, CheckCircle2, Globe, ChevronDown, ListChecks } from "lucide-react";
import { SectionCard } from "@/components/ui/section-card";
import { toast } from "sonner";
import {
  ASCVD_ESTABLISHED, SUBCLINICAL_ITEMS, HIGH_CAC_ITEMS, CKD_ITEMS,
  FHX_ITEMS, EXTREME_ELEVATION_ITEMS, TOD_MICROVASCULAR, TOD_MACROVASCULAR,
  TOD_ALL, countCheckedItems,
} from "@/lib/clinicalConstants";

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

// ─── High-risk features checklist ───
const HIGHRISK_CHECKLIST = [
  { id: "hr_ascvd", label: "Established ASCVD" },
  { id: "hr_subclinical", label: "Subclinical atherosclerosis" },
  { id: "hr_nafld", label: "Nonalcoholic fatty liver disease with fibrosis grades II and III" },
  { id: "hr_metsyn", label: "Metabolic syndrome" },
  { id: "hr_ckd", label: "Chronic kidney disease stage 3B/4" },
  { id: "hr_fhx", label: "Family history of premature CHD / ASCVD" },
  { id: "hr_apob", label: "ApoB >130 mg/dL" },
  { id: "hr_lpa", label: "Lp(a) ≥50 mg/dL" },
  { id: "hr_cac", label: "High coronary calcium / extensive plaque burden" },
  { id: "hr_dmtod", label: "Diabetes with target organ damage" },
  { id: "hr_extreme", label: "Extreme elevation of a single risk factor" },
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

// All sub-checklist collections for auto-qualification
const SUB_CHECKLISTS: Record<string, { id: string }[]> = {
  hr_ascvd: ASCVD_ESTABLISHED,
  hr_subclinical: SUBCLINICAL_ITEMS,
  hr_ckd: CKD_ITEMS,
  hr_fhx: FHX_ITEMS,
  hr_cac: HIGH_CAC_ITEMS,
  hr_extreme: EXTREME_ELEVATION_ITEMS,
  hr_metsyn: METSYN_CRITERIA,
  hr_dmtod: TOD_ALL,
};

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

// countCheckedItems imported from @/lib/clinicalConstants

// Render a sub-checklist block
function SubChecklist({
  items,
  checked,
  toggle,
  title,
  colorClass = "warning",
  defaultOpen = false,
}: {
  items: { id: string; label: string; qualifier?: string }[];
  checked: Record<string, boolean>;
  toggle: (id: string) => void;
  title: string;
  colorClass?: string;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const checkedCount = items.filter((item) => checked[item.id]).length;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="ml-8 mt-2 mb-1">
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
          <span className="text-xs font-semibold text-muted-foreground">{title} {checkedCount > 0 && `(${checkedCount}/${items.length})`}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1.5 rounded-b-lg border-x border-b border-border bg-muted/30 p-3 pt-0 mt-0">
        {items.map((item) => (
          <label
            key={item.id}
            className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
              checked[item.id] ? `bg-${colorClass}/10 ring-1 ring-${colorClass}/15` : "hover:bg-muted/50"
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
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function PrimaryPrevention() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [noteEdited, setNoteEdited] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [indianEthnicity, setIndianEthnicity] = useState(false);
  const [dmTodOpen, setDmTodOpen] = useState(false);
  const [hrDmTodOpen, setHrDmTodOpen] = useState(false);
  const [hrFhxOpen, setHrFhxOpen] = useState(false);

  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const guideline = indianEthnicity
    ? "LAI 2023 — Lipid Association of India Consensus Statement IV"
    : "2026 ACC/AHA Guideline on the Management of Dyslipidemia";

  const dmCount = countCheckedItems(DM_CHECKLIST, checked);
  const acsCount = countCheckedItems(ACS_CHECKLIST, checked);
  const msCount = countCheckedItems(METSYN_CRITERIA, checked);
  const metsynMet = msCount >= 3;
  const todCount = countCheckedItems(TOD_ALL, checked);
  const todMet = todCount >= 1;
  const ascvdCount = countCheckedItems(ASCVD_ESTABLISHED, checked);
  const ascvdMet = ascvdCount >= 1;
  const subclinicalCount = countCheckedItems(SUBCLINICAL_ITEMS, checked);
  const subclinicalMet = subclinicalCount >= 1;
  const ckdCount = countCheckedItems(CKD_ITEMS, checked);
  const ckdMet = ckdCount >= 1;
  const fhxCount = countCheckedItems(FHX_ITEMS, checked);
  const fhxMet = fhxCount >= 1;
  const cacCount = countCheckedItems(HIGH_CAC_ITEMS, checked);
  const cacMet = cacCount >= 1;
  const extremeCount = countCheckedItems(EXTREME_ELEVATION_ITEMS, checked);
  const extremeMet = extremeCount >= 1;
  const dmTodMet = todMet;

  // Auto-qualified high-risk items
  const autoQualMap: Record<string, boolean> = {
    hr_ascvd: ascvdMet,
    hr_subclinical: subclinicalMet,
    hr_metsyn: metsynMet,
    hr_ckd: ckdMet,
    hr_fhx: fhxMet,
    hr_cac: cacMet,
    hr_dmtod: dmTodMet,
    hr_extreme: extremeMet,
  };
  const autoQualIds = new Set(Object.keys(autoQualMap));

  let hrCount = 0;
  HIGHRISK_CHECKLIST.forEach((item) => {
    if (autoQualIds.has(item.id)) {
      if (autoQualMap[item.id]) hrCount++;
    } else {
      if (checked[item.id]) hrCount++;
    }
  });

  const rmCount = countCheckedItems(MODIFIER_CHECKLIST, checked);
  const riskInfo = useMemo(() => getRiskUpgradeInterpretation(hrCount, rmCount), [hrCount, rmCount]);

  // ─── Generate exportable note ───
  const generatedNote = useMemo(() => {
    const lines: string[] = [];
    lines.push("═══ PRIMARY PREVENTION — CLINICAL SUMMARY ═══");
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push(`Guideline: ${guideline}`);
    lines.push(`Ethnicity: ${indianEthnicity ? "Indian / South Asian" : "Not specified as Indian"}`);
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
      autoQualIds.has(i.id) ? autoQualMap[i.id] : checked[i.id]
    );
    if (hrChecked.length > 0) {
      lines.push(`▸ HIGH-RISK FEATURES (${hrChecked.length}/${HIGHRISK_CHECKLIST.length}):`);
      hrChecked.forEach((i) => {
        lines.push(`  ✓ ${i.label}`);
        // Emit sub-items for each qualified feature
        const subList = SUB_CHECKLISTS[i.id];
        if (subList) {
          const subChecked = subList.filter((s) => checked[s.id]);
          if (subChecked.length > 0) {
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
            } else if (i.id === "hr_metsyn") {
              lines.push(`    Sub-criteria met (${msCount}/5 — ≥3 required):`);
              subChecked.forEach((s) => lines.push(`      • ${(s as any).label}`));
            } else {
              subChecked.forEach((s) => lines.push(`      • ${(s as any).label}`));
            }
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
    lines.push(`  • Active guideline: ${guideline}`);
    lines.push("  • ACC/AHA: ≥1 risk-enhancing factor supports moderate-intensity statin for borderline/intermediate risk.");
    lines.push("  • ESC/SCORE2: 1–2 modifiers commonly suffice for reclassification; >4 risks overestimation.");
    lines.push("  • Practical: ≥2 metabolic modifiers alongside high-risk features double event rates.");
    lines.push("  • If uncertainty persists, discuss CAC scoring or ABI testing.");

    if (dmChecked.length === 0 && acsChecked.length === 0 && hrChecked.length === 0 && rmChecked.length === 0) {
      return "No checklist items selected. Complete the checklists above to generate a clinical summary note.";
    }

    return lines.join("\n");
  }, [checked, riskInfo, hrCount, rmCount, msCount, todCount, todMet, guideline, indianEthnicity, autoQualMap]);

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

  // Helper to get status badge for auto-qualified items
  const getStatusBadge = (id: string) => {
    const subItems = SUB_CHECKLISTS[id];
    if (!subItems) return null;
    const met = autoQualMap[id];
    const count = countCheckedItems(subItems, checked);
    const total = subItems.length;
    const minReq = id === "hr_metsyn" ? "≥3" : "≥1";
    return (
      <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
        met ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
      }`}>
        {count}/{total} — {met ? "Qualified ✓" : `${minReq} required`}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* ─── Indian Ethnicity / Guideline Toggle ─── */}
      <SectionCard
        title="Indian / South Asian Ethnicity"
        tone="indigo"
        icon={<Globe className="h-4 w-4" />}
        collapsible={false}
      >
        <label className="flex cursor-pointer items-center gap-3">
          <Checkbox
            checked={indianEthnicity}
            onCheckedChange={() => setIndianEthnicity(!indianEthnicity)}
          />
          <div className="flex-1">
            <span className="text-sm font-semibold text-foreground">Apply LAI 2023 Guidelines</span>
            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
              {indianEthnicity
                ? "LAI 2023 guidelines applied (Lipid Association of India — Consensus IV)"
                : "2026 ACC/AHA Guideline on the Management of Dyslipidemia (default)"}
            </p>
          </div>
        </label>
      </SectionCard>

      {/* LDL-C Targets by 10-Year Risk */}
      <SectionCard
        title="Primary Prevention LDL-C Targets by 10-Year ASCVD Risk"
        tone="primary"
        icon={<ShieldCheck className="h-4 w-4" />}
        collapsible={false}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RISK_TIERS.map((t) => (
            <div key={t.risk} className={`rounded-lg ${t.bg} px-4 py-3`}>
              <p className={`text-xs font-semibold ${t.color}`}>{t.risk}</p>
              <p className="text-lg font-bold text-foreground mt-1">{t.ldl}</p>
              {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
            </div>
          ))}
        </div>
      </SectionCard>

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
      <SectionCard
        title="Diabetes & Dyslipidemia — Day 1 Treatment"
        tone="danger"
        icon={<Heart className="h-4 w-4" />}
        collapsible={false}
        badge={dmCount > 0 ? (
          <span className="rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-bold text-danger">
            {dmCount}/{DM_CHECKLIST.length}
          </span>
        ) : undefined}
      >
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

                {/* TOD sub-checklist */}
                {item.id === "dm_tod" && (
                  <Collapsible open={dmTodOpen} onOpenChange={setDmTodOpen} className="ml-8 mt-2 mb-1">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-semibold text-muted-foreground">Target Organ Damage Criteria {todCount > 0 && `(${todCount}/${TOD_ALL.length})`}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${dmTodOpen ? "rotate-180" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 rounded-b-lg border-x border-b border-border bg-muted/30 p-3 pt-0">
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
                              <Checkbox checked={!!checked[tod.id]} onCheckedChange={() => toggle(tod.id)} className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm leading-snug text-foreground">{tod.label}</span>
                                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tod.qualifier}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
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
                              <Checkbox checked={!!checked[tod.id]} onCheckedChange={() => toggle(tod.id)} className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm leading-snug text-foreground">{tod.label}</span>
                                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tod.qualifier}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
      <SectionCard
        title="ASCVD & ACS Management"
        tone="primary"
        icon={<Activity className="h-4 w-4" />}
        collapsible={false}
        badge={acsCount > 0 ? (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
            {acsCount}/{ACS_CHECKLIST.length}
          </span>
        ) : undefined}
      >
        <div className="space-y-2 mt-3">
          {ACS_CHECKLIST.map((item) => (
            <label
              key={item.id}
              className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                checked[item.id] ? "bg-primary/8 ring-1 ring-primary/20" : "hover:bg-muted/50"
              }`}
            >
              <Checkbox checked={!!checked[item.id]} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
              <span className="text-sm leading-snug text-foreground">{item.label}</span>
            </label>
          ))}
        </div>
      </SectionCard>

      {/* ─── High-Risk Features (Checklist) ─── */}
      <SectionCard
        title="High-Risk Features (LDL-C Target <70 mg/dL)"
        tone="warning"
        icon={<AlertTriangle className="h-4 w-4" />}
        collapsible={false}
        badge={hrCount > 0 ? (
          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
            {hrCount}/{HIGHRISK_CHECKLIST.length}
          </span>
        ) : undefined}
      >
        <div className="space-y-2 mt-3">
          {HIGHRISK_CHECKLIST.map((item) => {
            const isAuto = autoQualIds.has(item.id);
            const isChecked = isAuto ? autoQualMap[item.id] : !!checked[item.id];

            return (
              <div key={item.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isChecked ? "bg-warning/8 ring-1 ring-warning/20" : "hover:bg-muted/50"
                  }`}
                >
                  {isAuto ? (
                    <>
                      <Checkbox checked={isChecked} disabled className="mt-0.5" />
                      <div className="flex-1">
                        <span className="text-sm leading-snug text-foreground">{item.label}</span>
                        {getStatusBadge(item.id)}
                      </div>
                    </>
                  ) : (
                    <>
                      <Checkbox checked={!!checked[item.id]} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
                      <span className="text-sm leading-snug text-foreground">{item.label}</span>
                    </>
                  )}
                </label>

                {/* Established ASCVD sub-checklist */}
                {item.id === "hr_ascvd" && (
                  <SubChecklist
                    items={ASCVD_ESTABLISHED}
                    checked={checked}
                    toggle={toggle}
                    title="Select applicable ASCVD manifestations (≥1 required):"
                  />
                )}

                {/* Subclinical atherosclerosis sub-checklist */}
                {item.id === "hr_subclinical" && (
                  <SubChecklist
                    items={SUBCLINICAL_ITEMS}
                    checked={checked}
                    toggle={toggle}
                    title="Select applicable subclinical findings (≥1 required). Any form is considered equivalent to ASCVD with similar LDL-C targets:"
                  />
                )}

                {/* CKD sub-checklist */}
                {item.id === "hr_ckd" && (
                  <SubChecklist
                    items={CKD_ITEMS}
                    checked={checked}
                    toggle={toggle}
                    title="Select CKD stage and albuminuria status (≥1 required):"
                  />
                )}

                {/* Family history sub-checklist */}
                {item.id === "hr_fhx" && (
                  <Collapsible open={hrFhxOpen} onOpenChange={setHrFhxOpen} className="ml-8 mt-2 mb-1">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-semibold text-muted-foreground">Premature CHD / ASCVD {fhxCount > 0 && `(${fhxCount}/${FHX_ITEMS.length})`}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${hrFhxOpen ? "rotate-180" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1.5 rounded-b-lg border-x border-b border-border bg-muted/30 p-3 pt-0">
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        "Premature" = CHD or atherosclerotic CVD event in a <strong className="text-foreground">male &lt;55 y</strong> or <strong className="text-foreground">female &lt;65 y</strong>. Includes MI, coronary revascularization, angina, ischemic stroke, or PAD.
                      </p>
                      {FHX_ITEMS.map((f) => (
                        <label
                          key={f.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                            checked[f.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox checked={!!checked[f.id]} onCheckedChange={() => toggle(f.id)} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm leading-snug text-foreground">{f.label}</span>
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{f.qualifier}</p>
                          </div>
                        </label>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* High CAC / extensive plaque sub-checklist */}
                {item.id === "hr_cac" && (
                  <SubChecklist
                    items={HIGH_CAC_ITEMS}
                    checked={checked}
                    toggle={toggle}
                    title="Select applicable high CAC / plaque burden findings (≥1 required):"
                  />
                )}

                {/* Extreme elevation sub-checklist */}
                {item.id === "hr_extreme" && (
                  <SubChecklist
                    items={EXTREME_ELEVATION_ITEMS}
                    checked={checked}
                    toggle={toggle}
                    title="Select applicable extreme risk factor elevations (≥1 required):"
                  />
                )}

                {/* Metabolic Syndrome sub-checklist */}
                {item.id === "hr_metsyn" && (
                  <SubChecklist
                    items={METSYN_CRITERIA}
                    checked={checked}
                    toggle={toggle}
                    title="Diagnostic Criteria (at least 3 of 5 required):"
                  />
                )}

                {/* DM Target Organ Damage sub-checklist */}
                {item.id === "hr_dmtod" && (
                  <Collapsible open={hrDmTodOpen} onOpenChange={setHrDmTodOpen} className="ml-8 mt-2 mb-1">
                    <CollapsibleTrigger asChild>
                      <button className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                        <span className="text-xs font-semibold text-muted-foreground">DM Target Organ Damage {todCount > 0 && `(${todCount}/${TOD_ALL.length})`}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${hrDmTodOpen ? "rotate-180" : ""}`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 rounded-b-lg border-x border-b border-border bg-muted/30 p-3 pt-0">
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
                              <Checkbox checked={!!checked[tod.id]} onCheckedChange={() => toggle(tod.id)} className="mt-0.5" />
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
                              <Checkbox checked={!!checked[tod.id]} onCheckedChange={() => toggle(tod.id)} className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm leading-snug text-foreground">{tod.label}</span>
                                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tod.qualifier}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
      {/* ─── Risk Modifiers (Checklist) ─── */}
      <SectionCard
        title="Risk Modifiers (May Upgrade Low/Moderate → Higher Risk)"
        tone="accent"
        icon={<Activity className="h-4 w-4" />}
        collapsible={false}
        badge={rmCount > 0 ? (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
            {rmCount}/{MODIFIER_CHECKLIST.length}
          </span>
        ) : undefined}
      >
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
              <Checkbox checked={!!checked[item.id]} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="text-sm leading-snug text-foreground">{item.label}</span>
                {item.qualifier && (
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.qualifier}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </SectionCard>
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
      <SectionCard
        title="Exportable Clinical Note"
        tone="indigo"
        icon={<FileText className="h-4 w-4" />}
        collapsible={false}
        badge={
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5 text-xs h-7"
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy Note"}
          </Button>
        }
      >
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
      </SectionCard>
    </div>
  );
}
