import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Heart, AlertTriangle, ShieldCheck, RotateCcw, Activity,
  Printer, Target, Copy, ClipboardCheck, TrendingUp, User,
  TestTube, ChevronDown, Stethoscope, FileText,
} from "lucide-react";
import PrimaryPrevention from "@/components/calculator/PrimaryPrevention";
import {
  ASCVD_ESTABLISHED, SUBCLINICAL_ITEMS, HIGH_CAC_ITEMS, CKD_ITEMS,
  FHX_ITEMS, EXTREME_ELEVATION_ITEMS, TOD_MICROVASCULAR, TOD_MACROVASCULAR,
  TOD_ALL, countCheckedItems, type SubItem,
} from "@/lib/clinicalConstants";

import EducationSection from "@/components/calculator/EducationSection";
import { calculatePrevent, type PreventResult } from "@/lib/prevent";

type TabKey = "calculator" | "primary" | "education";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "calculator", label: "Calculator", icon: <Target className="h-4 w-4" /> },
  { key: "primary", label: "Prevention", icon: <ShieldCheck className="h-4 w-4" /> },
  { key: "education", label: "Education", icon: <Heart className="h-4 w-4" /> },
];

// ─── Major ASCVD Risk Factors ───
const MAJOR_RF_KEYS = [
  "ageRisk", "smoking", "htn", "lowhdl", "fhx", "dm", "ckd", "obesity",
] as const;

const MAJOR_RF_LABELS: Record<string, string> = {
  ageRisk: "Age threshold met (men ≥45 y, women ≥55 y)",
  smoking: "Current cigarette smoking",
  htn: "Hypertension (BP ≥140/90 or treated)",
  lowhdl: "Low HDL-C (men <40 mg/dL, women <50 mg/dL)",
  fhx: "Family history of premature CHD",
  dm: "Diabetes mellitus",
  ckd: "Chronic kidney disease (eGFR <60)",
  obesity: "Obesity",
};

// ─── ASCVD history & extreme-risk modifiers ───
const MODIFIER_KEYS = [
  "ascvd", "polyvascular",
  "tod", "fh", "hofh", "subclinical", "ckd34",
  "recurrent50", "acs12", "sequelae30",
] as const;

const MODIFIER_LABELS: Record<string, string> = {
  ascvd: "Established ASCVD",
  polyvascular: "Polyvascular disease (≥2 arterial territories: CAD, cerebrovascular, PAD)",
  tod: "Diabetes target organ damage",
  fh: "Familial hypercholesterolemia / strong family history",
  hofh: "Homozygous familial hypercholesterolemia",
  subclinical: "High coronary calcium / extensive plaque burden / subclinical high-risk burden",
  ckd34: "CKD stage 3B or 4",
  recurrent50: "Recurrent or progressive events despite LDL-C <50 mg/dL",
  acs12: "Recurrent ACS within 12 months despite being on LDL goal",
  sequelae30: "Ongoing ASCVD sequelae despite LDL-C ≤30 mg/dL and intensive therapy",
};

// Modifiers that have sub-checklists for auto-qualification
const MOD_SUB_MAP: Record<string, { items: SubItem[]; title: string }> = {
  ascvd: { items: ASCVD_ESTABLISHED, title: "Select applicable ASCVD manifestations (≥1 required):" },
  subclinical: { items: HIGH_CAC_ITEMS, title: "Select applicable high CAC / plaque burden findings (≥1 required):" },
  ckd34: { items: CKD_ITEMS, title: "Select CKD stage and albuminuria status (≥1 required):" },
  fh: { items: FHX_ITEMS, title: "Premature CHD / ASCVD: event in a 1st-degree relative before sex-specific age cutoff (≥1 required):" },
};

// Asian BMI classification helper
function getAsianBmiClass(bmiVal: number): { label: string; color: string } {
  if (bmiVal < 18.5) return { label: "Underweight", color: "text-primary" };
  if (bmiVal < 23) return { label: "Normal", color: "text-success" };
  if (bmiVal < 25) return { label: "Overweight (At Risk)", color: "text-warning" };
  if (bmiVal < 27.5) return { label: "Obese I", color: "text-danger" };
  return { label: "Obese II", color: "text-danger" };
}

function getWhoBmiClass(bmiVal: number): { label: string; color: string } {
  if (bmiVal < 18.5) return { label: "Underweight", color: "text-primary" };
  if (bmiVal < 25) return { label: "Normal", color: "text-success" };
  if (bmiVal < 30) return { label: "Overweight", color: "text-warning" };
  return { label: "Obese", color: "text-danger" };
}

/** Collapsible qualifier text */
function QualifierText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
      className="text-left w-full"
    >
      <span className="text-[11px] text-muted-foreground leading-snug mt-0.5 flex items-center gap-1 cursor-pointer hover:text-foreground/70 transition-colors">
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform duration-200 ${open ? "rotate-0" : "-rotate-90"}`} />
        <span className={open ? "" : "line-clamp-1"}>{text}</span>
      </span>
    </button>
  );
}

// ─── Result buckets ───
interface CategoryResult {
  category: string;
  ldlTarget: string;
  nonHdlTarget: string;
  apoBTarget: string;
  treatment: string[];
  why: string[];
}

const BUCKET_TABLE = [
  { cat: "C", trigger: "Residual ASCVD sequelae despite LDL ≤30", ldl: "10–15 mg/dL" },
  { cat: "B", trigger: "CAD + very-high-risk features, or recurrent/progressive events despite LDL <50", ldl: "≤30 mg/dL" },
  { cat: "A", trigger: "ASCVD/equivalent with major modifiers; CAD not mandatory", ldl: "<50 mg/dL, optional ≤30" },
  { cat: "VHR", trigger: "ASCVD or equivalent very-high-risk state", ldl: "<50 mg/dL" },
];

const TREATMENTS: Record<string, string[]> = {
  "Extreme Risk C": [
    "Ultralow LDL-C strategy: maximize statin + ezetimibe + PCSK9 inhibitor",
    "Anti-inflammatory therapy (e.g., colchicine)",
    "Strict control of all other risk factors",
    "Guideline-directed management of comorbidities",
    "Target LDL-C 10–15 mg/dL (residual-risk phenotype)",
  ],
  "Extreme Risk B": [
    "Maximal statin + ezetimibe (often insufficient alone)",
    "PCSK9 inhibitor–based intensification commonly required",
    "Aggressive LDL-C lowering to ≤30 mg/dL",
    "Reinforce lifestyle measures",
  ],
  "Extreme Risk A": [
    "High-intensity statin first",
    "Add ezetimibe if LDL-C target not met",
    "Add PCSK9 inhibitor if combination insufficient",
    "Optional goal ≤30 mg/dL after physician–patient discussion",
    "Reinforce lifestyle measures",
  ],
  "Very High Risk": [
    "High-intensity statin therapy",
    "If LDL-C ≥50 mg/dL → Add ezetimibe",
    "If still ≥50 mg/dL → Consider PCSK9 inhibitor",
    "Reinforce lifestyle measures",
  ],
};

// ─── CKD Stage helper ───
function getCkdStage(egfrVal: number): string {
  if (egfrVal >= 90) return "Stage 1 (≥90)";
  if (egfrVal >= 60) return "Stage 2 (60–89)";
  if (egfrVal >= 45) return "Stage 3A (45–59)";
  if (egfrVal >= 30) return "Stage 3B (30–44)";
  if (egfrVal >= 15) return "Stage 4 (15–29)";
  return "Stage 5 (<15)";
}

// ─── Collapsible Section ───
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="border-border bg-card overflow-hidden">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2.5">
            {icon}
            <h2 className="font-display text-sm font-bold text-foreground">{title}</h2>
            {badge}
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-1">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function LipidCalculator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("calculator");

  // ─── Lab inputs ───
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [ldl, setLdl] = useState("");
  const [nonhdl, setNonhdl] = useState("");
  const [apob, setApob] = useState("");
  const [lpa, setLpa] = useState("");
  const [hba1c, setHba1c] = useState("");
  const [egfr, setEgfr] = useState("");
  const [creatinine, setCreatinine] = useState("");
  const [egfrAuto, setEgfrAuto] = useState(false);
  const [hscrp, setHscrp] = useState("");
  const [hdl, setHdl] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState("");
  const [bmiAuto, setBmiAuto] = useState(false);
  const [waistCirc, setWaistCirc] = useState("");
  // ─── PREVENT inputs ───
  const [sbp, setSbp] = useState("");
  const [totalChol, setTotalChol] = useState("");
  const [bpMed, setBpMed] = useState(false);
  const [onStatin, setOnStatin] = useState(false);

  // ─── Risk factors ───
  const [rfChecked, setRfChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(MAJOR_RF_KEYS.map((k) => [k, false]))
  );
  const [modChecked, setModChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(MODIFIER_KEYS.map((k) => [k, false]))
  );

  // ─── Sub-checklist state for modifier auto-qualification ───
  const [subChecked, setSubChecked] = useState<Record<string, boolean>>({});
  const toggleSub = (id: string) =>
    setSubChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  // Auto-qualification for Major RF "fhx" from FHX sub-items
  const fhxAutoQual = useMemo(() => countCheckedItems(FHX_ITEMS, subChecked) >= 1, [subChecked]);

  useEffect(() => {
    if (fhxAutoQual && !rfChecked.fhx) {
      setRfChecked((prev) => ({ ...prev, fhx: true }));
    }
  }, [fhxAutoQual, rfChecked.fhx]);

  // Auto-qualification: if any sub-item is checked, parent modifier is auto-qualified
  const modAutoQual = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const [modKey, config] of Object.entries(MOD_SUB_MAP)) {
      map[modKey] = countCheckedItems(config.items, subChecked) >= 1;
    }
    // TOD auto-qual
    map.tod = countCheckedItems(TOD_ALL, subChecked) >= 1;
    return map;
  }, [subChecked]);

  // Auto-sync modChecked when sub-checklists qualify
  useEffect(() => {
    setModChecked((prev) => {
      let next = { ...prev };
      let changed = false;
      for (const [key, qualified] of Object.entries(modAutoQual)) {
        if (qualified && !prev[key]) {
          next[key] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [modAutoQual]);

  const [copied, setCopied] = useState(false);

  // ─── Auto-derive age risk ───
  useEffect(() => {
    const a = parseFloat(age);
    if (isNaN(a)) return;
    const hit = (sex === "male" && a >= 45) || (sex === "female" && a >= 55);
    setRfChecked((prev) => (prev.ageRisk === hit ? prev : { ...prev, ageRisk: hit }));
  }, [age, sex]);

  // ─── Auto-calculate BMI ───
  useEffect(() => {
    const h = parseFloat(height);
    const w = parseFloat(weight);
    if (isNaN(h) || h <= 0 || isNaN(w) || w <= 0) { setBmiAuto(false); return; }
    const hm = h / 100;
    setBmi((w / (hm * hm)).toFixed(1));
    setBmiAuto(true);
  }, [height, weight]);

  // ─── Auto-derive obesity ───
  useEffect(() => {
    const v = parseFloat(bmi);
    if (isNaN(v)) return;
    const isObese = v >= 25;
    setRfChecked((prev) => (prev.obesity === isObese ? prev : { ...prev, obesity: isObese }));
  }, [bmi]);

  // ─── Auto-calculate eGFR (CKD-EPI 2021) ───
  useEffect(() => {
    const cr = parseFloat(creatinine);
    const a = parseFloat(age);
    if (isNaN(cr) || cr <= 0 || isNaN(a) || a <= 0) { setEgfrAuto(false); return; }
    const kappa = sex === "female" ? 0.7 : 0.9;
    const alpha = sex === "female" ? -0.241 : -0.302;
    const sexMul = sex === "female" ? 1.012 : 1.0;
    const calculated = 142 * Math.pow(Math.min(cr / kappa, 1), alpha) * Math.pow(Math.max(cr / kappa, 1), -1.200) * Math.pow(0.9938, a) * sexMul;
    setEgfr(Math.round(calculated).toString());
    setEgfrAuto(true);
  }, [creatinine, age, sex]);

  const egfrVal = parseFloat(egfr);
  const ckdStage = !isNaN(egfrVal) ? getCkdStage(egfrVal) : null;

  // ─── Auto-derive CKD ───
  useEffect(() => {
    const v = parseFloat(egfr);
    if (isNaN(v)) return;
    setRfChecked((prev) => { const val = v < 60; return prev.ckd === val ? prev : { ...prev, ckd: val }; });
    setModChecked((prev) => { const is3b4 = v >= 15 && v < 45; return prev.ckd34 === is3b4 ? prev : { ...prev, ckd34: is3b4 }; });
  }, [egfr]);

  // ─── Auto-derive DM ───
  useEffect(() => {
    const v = parseFloat(hba1c);
    if (!isNaN(v) && v > 7) setRfChecked((prev) => (prev.dm ? prev : { ...prev, dm: true }));
  }, [hba1c]);

  // ─── Auto-derive low HDL ───
  useEffect(() => {
    const v = parseFloat(hdl);
    if (isNaN(v)) return;
    const isLow = sex === "male" ? v < 40 : v < 50;
    setRfChecked((prev) => (prev.lowhdl === isLow ? prev : { ...prev, lowhdl: isLow }));
  }, [hdl, sex]);

  const rfCount = Object.values(rfChecked).filter(Boolean).length;
  const toggleRf = (key: string) => setRfChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleMod = (key: string) => setModChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  // ─── Classification logic ───
  const classify = useCallback((): CategoryResult | null => {
    const v = modChecked;
    const lpaVal = parseFloat(lpa);
    const rf = rfCount;
    let cat = "", ldlTarget = "", nonHdlTarget = "", apoBTarget = "";
    const why: string[] = [];

    if (v.sequelae30) {
      cat = "Extreme Risk C"; ldlTarget = "10–15 mg/dL"; nonHdlTarget = "≤ 40 mg/dL"; apoBTarget = "< 35 mg/dL";
      why.push("Ongoing ASCVD sequelae despite LDL-C ≤30 mg/dL and intensive therapy.");
    } else if ((v.cad && (rfChecked.dm || v.polyvascular || v.tod || rf >= 3)) || v.recurrent50 || v.acs12 || v.hofh) {
      cat = "Extreme Risk B"; ldlTarget = "≤ 30 mg/dL"; nonHdlTarget = "≤ 60 mg/dL"; apoBTarget = "< 45 mg/dL";
      if (v.cad) why.push("CAD present with very-high-risk features.");
      if (v.recurrent50) why.push("Recurrent/progressive events despite LDL-C <50 mg/dL.");
      if (v.acs12) why.push("Recurrent ACS within 12 months despite LDL goal.");
      if (v.hofh) why.push("Homozygous familial hypercholesterolemia selected.");
    } else if ((v.ascvd && (rfChecked.dm || v.fh || rf >= 3 || v.ckd34 || v.polyvascular || v.pad || v.stroke || (!isNaN(lpaVal) && lpaVal >= 50) || v.subclinical)) || v.subclinical) {
      cat = "Extreme Risk A"; ldlTarget = "< 50 mg/dL, optional ≤ 30 mg/dL"; nonHdlTarget = "< 80 mg/dL (optional ≤ 60)"; apoBTarget = "< 55 mg/dL";
      why.push("Very-high-risk ASCVD or equivalent burden detected.");
      if (v.ascvd && !v.cad && (v.stroke || v.pad)) why.push("CAD not required because other ASCVD territories qualify.");
      if (v.subclinical) why.push("High calcium / extensive plaque burden supports extreme-risk A assignment.");
    } else if (v.ascvd || v.hofh || (rfChecked.dm && (rf >= 3 || v.tod))) {
      cat = "Very High Risk"; ldlTarget = "< 50 mg/dL"; nonHdlTarget = "< 80 mg/dL"; apoBTarget = "< 65 mg/dL";
      if (v.ascvd) why.push("Established ASCVD present.");
      if (v.hofh) why.push("Homozygous FH present.");
      if (rfChecked.dm && (rf >= 3 || v.tod)) why.push("Diabetes with ≥3 risk factors or target-organ damage.");
    } else {
      return null;
    }

    return { category: cat, ldlTarget, nonHdlTarget, apoBTarget, treatment: TREATMENTS[cat] || [], why };
  }, [modChecked, rfChecked, rfCount, lpa]);

  const result = classify();

  // ─── PREVENT ───
  const preventResult: PreventResult | null = useMemo(() => {
    const a = parseFloat(age), s = parseFloat(sbp), tc = parseFloat(totalChol), h = parseFloat(hdl), e = parseFloat(egfr), b = parseFloat(bmi);
    if ([a, s, tc, h, e, b].some(isNaN)) return null;
    return calculatePrevent({ age: a, sex, sbp: s, bpMed, totalChol: tc, hdl: h, statin: onStatin, diabetes: rfChecked.dm, smoking: rfChecked.smoking, egfr: e, bmi: b });
  }, [age, sex, sbp, totalChol, hdl, egfr, bmi, bpMed, onStatin, rfChecked.dm, rfChecked.smoking]);

  // ─── EMR Note ───
  const generateNote = useCallback(() => {
    const lines: string[] = [];
    lines.push("═══════════════════════════════════════════════════");
    lines.push("       LAI EXTREME RISK ASSESSMENT");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");
    lines.push("PREDICTED CATEGORY: " + (result?.category || "Lower than VHR / not classifiable"));
    lines.push("LDL-C Target: " + (result?.ldlTarget || "Use standard LAI primary-prevention pathway"));
    lines.push("Non-HDL-C Target: " + (result?.nonHdlTarget || "—"));
    lines.push("ApoB Target: " + (result?.apoBTarget || "—"));
    if (preventResult?.valid) {
      lines.push("── PREVENT 10-YEAR ASCVD RISK ──");
      lines.push("10-Year Risk: " + preventResult.riskPct + "% (" + preventResult.category + " Risk)");
      lines.push("SBP: " + (sbp || "—") + " mmHg | Total Chol: " + (totalChol || "—") + " mg/dL");
      lines.push("BP Medication: " + (bpMed ? "Yes" : "No") + " | Statin: " + (onStatin ? "Yes" : "No"));
      lines.push("");
    }
    lines.push("── DEMOGRAPHICS ──");
    lines.push("Age: " + (age || "—") + " | Sex: " + (sex === "male" ? "Male" : "Female"));
    if (height || weight || bmi) {
      const bmiVal = parseFloat(bmi);
      let bmiNote = "Height: " + (height ? height + " cm" : "—") + " | Weight: " + (weight ? weight + " kg" : "—") + " | BMI: " + (bmi ? bmi + " kg/m²" + (bmiAuto ? " (auto)" : "") : "—");
      if (!isNaN(bmiVal)) {
        bmiNote += " → Asian: " + getAsianBmiClass(bmiVal).label + " | WHO: " + getWhoBmiClass(bmiVal).label;
      }
      lines.push(bmiNote);
    }
    lines.push("");
    lines.push("── LAB VALUES ──");
    lines.push("LDL-C: " + (ldl || "—") + " mg/dL | Non-HDL-C: " + (nonhdl || "—") + " mg/dL | HDL-C: " + (hdl || "—") + " mg/dL");
    lines.push("ApoB: " + (apob || "—") + " mg/dL | Lp(a): " + (lpa || "—") + " mg/dL | HbA1c: " + (hba1c || "—") + "%");
    lines.push("Creatinine: " + (creatinine || "—") + " mg/dL | eGFR: " + (egfr || "—") + " mL/min/1.73m²" + (egfrAuto ? " (auto)" : "") + (ckdStage ? " → CKD " + ckdStage : "") + " | hsCRP: " + (hscrp || "—") + " mg/L");
    lines.push("");
    lines.push("── MAJOR ASCVD RISK FACTORS (" + rfCount + "/" + MAJOR_RF_KEYS.length + ") ──");
    MAJOR_RF_KEYS.forEach((k) => lines.push("  " + (rfChecked[k] ? "✓" : "✗") + " " + MAJOR_RF_LABELS[k]));
    lines.push("");
    lines.push("── ASCVD HISTORY & EXTREME-RISK MODIFIERS ──");
    MODIFIER_KEYS.forEach((k) => {
      lines.push("  " + (modChecked[k] ? "✓" : "✗") + " " + MODIFIER_LABELS[k]);
      // Emit sub-checklist details
      const subConfig = MOD_SUB_MAP[k];
      if (modChecked[k] && subConfig) {
        subConfig.items.filter((s) => subChecked[s.id]).forEach((s) => lines.push("      • " + s.label));
      }
      if (modChecked[k] && k === "tod") {
        const micro = TOD_MICROVASCULAR.filter((t) => subChecked[t.id]);
        const macro = TOD_MACROVASCULAR.filter((t) => subChecked[t.id]);
        if (micro.length > 0) {
          lines.push("      Microvascular:");
          micro.forEach((t) => lines.push("        • " + t.label));
        }
        if (macro.length > 0) {
          lines.push("      Macrovascular/Cardiac:");
          macro.forEach((t) => lines.push("        • " + t.label));
        }
      }
    });
    lines.push("");
    lines.push("── QUALIFIERS ──");
    lines.push("  Established ASCVD: " + (modChecked.ascvd ? "YES" : "No"));
    lines.push("  Family Hx premature CHD: " + (rfChecked.fhx ? "YES" : "No"));
    lines.push("  Obesity: " + (rfChecked.obesity ? "YES" + (bmi ? " (BMI " + bmi + " — Asian: " + getAsianBmiClass(parseFloat(bmi)).label + ")" : "") : "No"));
    lines.push("  High coronary calcium: " + (modChecked.subclinical ? "YES" : "No"));
    lines.push("  CKD: " + (rfChecked.ckd ? "YES" + (ckdStage ? " — " + ckdStage : "") : "No"));
    lines.push("  CKD Stage 3B/4: " + (modChecked.ckd34 ? "YES" : "No"));
    lines.push("");
    if (result?.why.length) {
      lines.push("── RATIONALE ──");
      result.why.forEach((w) => lines.push("  • " + w));
      lines.push("");
    }
    lines.push("═══════════════════════════════════════════════════");
    lines.push("Ref: 2026 ACC/AHA Guideline on Management of Dyslipidemia · LAI 2023 Consensus IV");
    return lines.join("\n");
  }, [result, modChecked, rfChecked, rfCount, ldl, nonhdl, hdl, apob, lpa, hba1c, creatinine, egfr, egfrAuto, hscrp, age, sex, height, weight, bmi, bmiAuto, ckdStage, preventResult, sbp, totalChol, bpMed, onStatin, subChecked]);

  const copyNote = async () => {
    try { await navigator.clipboard.writeText(generateNote()); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
  };

  const reset = () => {
    setAge(""); setSex("male"); setLdl(""); setNonhdl(""); setApob(""); setLpa("");
    setHba1c(""); setEgfr(""); setCreatinine(""); setEgfrAuto(false); setHscrp(""); setHdl("");
    setHeight(""); setWeight(""); setBmi(""); setBmiAuto(false); setWaistCirc("");
    setSbp(""); setTotalChol(""); setBpMed(false); setOnStatin(false);
    setRfChecked(Object.fromEntries(MAJOR_RF_KEYS.map((k) => [k, false])));
    setModChecked(Object.fromEntries(MODIFIER_KEYS.map((k) => [k, false])));
    setSubChecked({});
  };

  // ─── Goal checks ───
  const ldlNum = parseFloat(ldl);
  const nonHdlNum = parseFloat(nonhdl);
  const apoBNum = parseFloat(apob);
  const lpaNum = parseFloat(lpa);

  const ldlAtGoal = result && !isNaN(ldlNum) ? (result.category === "Extreme Risk C" ? ldlNum <= 15 : result.category === "Extreme Risk B" ? ldlNum <= 30 : ldlNum < 50) : null;
  const nonHdlAtGoal = result && !isNaN(nonHdlNum) ? (result.category === "Extreme Risk C" ? nonHdlNum <= 40 : result.category === "Extreme Risk B" ? nonHdlNum <= 60 : nonHdlNum < 80) : null;
  const apoBAtGoal = result && !isNaN(apoBNum) ? (result.category === "Extreme Risk C" ? apoBNum < 35 : result.category === "Extreme Risk B" ? apoBNum < 45 : result.category === "Extreme Risk A" ? apoBNum < 55 : apoBNum < 65) : null;

  const catColor = result ? (result.category === "Very High Risk" ? "warning" : "danger") : "muted";

  return (
    <div className="min-h-screen bg-background">
      {/* ─── Sticky Header + Tabs ─── */}
      <div className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex items-center gap-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <Heart className="h-4.5 w-4.5 text-primary-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-base font-bold tracking-tight text-foreground truncate">
                Lipid Risk Predictor
              </h1>
              <p className="text-[10px] text-muted-foreground truncate">
                Cardiovascular Risk Assessment & Management
              </p>
            </div>
            <Button variant="ghost" size="sm" className="no-print shrink-0" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-0.5 pb-2 overflow-x-auto no-print">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="mx-auto max-w-2xl px-4 py-5">
        {activeTab === "calculator" && (
          <div className="space-y-3">
            {/* Quick Link */}
            <Card className="border-border bg-card p-3.5 no-print">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-xs font-bold text-foreground">ASCVD Risk Assessment & EMR</h3>
                  <p className="text-[10px] text-muted-foreground">ACC/AHA Primary Prevention</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/ascvd")} className="gap-1.5 text-xs h-7">
                  Open <Activity className="h-3 w-3" />
                </Button>
              </div>
            </Card>

            {/* ── Section 1: Demographics & Anthropometrics ── */}
            <Section title="Demographics & Body Metrics" icon={<User className="h-4 w-4 text-primary" />}>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Age</label>
                  <Input type="number" placeholder="e.g. 55" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Sex</label>
                  <select value={sex} onChange={(e) => setSex(e.target.value as "male" | "female")} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Height (cm)</label>
                  <Input type="number" placeholder="170" value={height} onChange={(e) => setHeight(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Weight (kg)</label>
                  <Input type="number" placeholder="75" value={weight} onChange={(e) => setWeight(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    BMI {bmiAuto && <span className="text-[10px] font-normal text-primary">auto</span>}
                  </label>
                  <Input type="number" placeholder="26" value={bmi} onChange={(e) => { setBmi(e.target.value); setBmiAuto(false); setHeight(""); setWeight(""); }} className={bmiAuto ? "bg-muted" : ""} />
                  {(() => {
                    const bmiVal = parseFloat(bmi);
                    if (isNaN(bmiVal) || bmiVal <= 0) return null;
                    const asian = getAsianBmiClass(bmiVal);
                    const who = getWhoBmiClass(bmiVal);
                    return (
                      <div className="mt-1.5 space-y-1">
                        <p className={`text-[10px] font-medium ${asian.color}`}>
                          Asian: {asian.label} (BMI {bmiVal.toFixed(1)})
                        </p>
                        <p className={`text-[10px] font-medium ${who.color}`}>
                          WHO: {who.label}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
              {/* BMI Classification Reference — Collapsible */}
              {!isNaN(parseFloat(bmi)) && (
                <Collapsible>
                  <CollapsibleTrigger className="w-full mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground/70 transition-colors cursor-pointer">
                    <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-0 -rotate-90 shrink-0" />
                    BMI Classification Criteria (WHO &amp; Asian Guidelines)
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-3">
                      {/* WHO Standard */}
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">WHO Standard Criteria</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          {[
                            { range: "<18.5", label: "Underweight", color: "text-primary" },
                            { range: "18.5–24.9", label: "Normal", color: "text-success" },
                            { range: "25–29.9", label: "Overweight", color: "text-warning" },
                            { range: "≥30", label: "Obese", color: "text-danger" },
                          ].map((t) => (
                            <div key={t.label} className={`rounded px-2 py-1.5 bg-muted/50 ${t.color}`}>
                              <span className="font-bold">{t.label}</span><br />
                              <span className="text-muted-foreground">{t.range} kg/m²</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Asian Criteria */}
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Asian-Specific Cut-offs (WHO Asia-Pacific)</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                          {[
                            { range: "18.5–22.9", label: "Normal", color: "text-success" },
                            { range: "23–24.9", label: "Overweight", color: "text-warning" },
                            { range: "25–27.4", label: "Obese I", color: "text-danger" },
                            { range: "≥27.5", label: "Obese II", color: "text-danger" },
                          ].map((t) => (
                            <div key={t.label} className={`rounded px-2 py-1.5 bg-muted/50 ${t.color}`}>
                              <span className="font-bold">{t.label}</span><br />
                              <span className="text-muted-foreground">{t.range} kg/m²</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5 leading-snug">
                          Asian populations face higher metabolic risks at lower BMI. WHO action points: ≥23 (public health), ≥27.5 (high risk).
                        </p>
                      </div>
                      {/* Country Examples */}
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">Country-Specific Variations</p>
                        <div className="space-y-1 text-[10px] text-muted-foreground leading-snug">
                          <p>🇮🇳 <strong className="text-foreground">India</strong>: Overweight 23–24.9, Obesity ≥25 kg/m²</p>
                          <p>🇯🇵 <strong className="text-foreground">Japan</strong>: Obesity ≥25 kg/m²</p>
                          <p>🇰🇷 <strong className="text-foreground">Korea</strong>: Overweight/Pre-obese ≥23, Obesity ≥25 kg/m²</p>
                          <p>🇨🇳 <strong className="text-foreground">China</strong>: Overweight ≥24, Obesity ≥28 kg/m²</p>
                        </div>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Waist Circumference */}
              <div className="mt-3 grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Waist Circumference (cm)</label>
                  <Input type="number" placeholder="e.g. 88" value={waistCirc} onChange={(e) => setWaistCirc(e.target.value)} />
                  {(() => {
                    const wc = parseFloat(waistCirc);
                    if (isNaN(wc) || wc <= 0) return null;
                    const maleHigh = wc >= 90;
                    const femaleHigh = wc >= 80;
                    const isHigh = sex === "male" ? maleHigh : femaleHigh;
                    const threshold = sex === "male" ? "≥90 cm" : "≥80 cm";
                    return (
                      <p className={`mt-1 text-[10px] font-medium ${isHigh ? "text-danger" : "text-success"}`}>
                        {isHigh ? `⚠ Above Asian cutoff (${threshold})` : `Below Asian cutoff (${threshold})`}
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Waist Circumference Reference — Collapsible */}
              <Collapsible>
                <CollapsibleTrigger className="w-full mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground/70 transition-colors cursor-pointer">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 [&[data-state=open]]:rotate-0 -rotate-90 shrink-0" />
                  Waist Circumference — Asian Cutoffs &amp; Clinical Role
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-2.5 text-[10px] text-muted-foreground leading-snug">
                    <p>WC assesses central/abdominal obesity, complementing BMI due to higher visceral fat and metabolic risks at lower BMIs in Asians. Predicts CV and diabetes risks better than BMI alone.</p>
                    <div>
                      <p className="font-bold text-foreground uppercase tracking-wide mb-1">Measurement</p>
                      <p>Midpoint between lower rib margin and iliac crest, midway in axilla, relaxed abdomen. Non-stretch tape at minimal tension. Avoid post-meal.</p>
                    </div>
                    <div>
                      <p className="font-bold text-foreground uppercase tracking-wide mb-1">Asian Cutoffs</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] border-collapse">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-1 pr-2 font-bold text-foreground">Population</th>
                              <th className="text-center py-1 px-2 font-bold text-foreground">Men (cm)</th>
                              <th className="text-center py-1 pl-2 font-bold text-foreground">Women (cm)</th>
                            </tr>
                          </thead>
                          <tbody className="text-muted-foreground">
                            <tr className="border-b border-border/50"><td className="py-1 pr-2">🇮🇳 India — Action Level 1</td><td className="text-center py-1 px-2">≥78</td><td className="text-center py-1 pl-2">≥72</td></tr>
                            <tr className="border-b border-border/50"><td className="py-1 pr-2">🇮🇳 India — Action Level 2</td><td className="text-center py-1 px-2">≥90</td><td className="text-center py-1 pl-2">≥80</td></tr>
                            <tr className="border-b border-border/50"><td className="py-1 pr-2">IDF South Asians</td><td className="text-center py-1 px-2">≥90</td><td className="text-center py-1 pl-2">≥80</td></tr>
                            <tr><td className="py-1 pr-2">🇨🇳 Chinese</td><td className="text-center py-1 px-2">≥90</td><td className="text-center py-1 pl-2">≥80</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <p>WC identifies abdominal obesity even at "normal" BMI (18.5–22.9) in Asians. Combine with BMI: overweight/obesity if BMI ≥23 or WC above cutoffs.</p>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Section>

            {/* ── Section 2: Lab Values ── */}
            <Section title="Lab Values" icon={<TestTube className="h-4 w-4 text-primary" />}>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">LDL-C (mg/dL)</label>
                  <Input type="number" placeholder="85" value={ldl} onChange={(e) => setLdl(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Non-HDL-C</label>
                  <Input type="number" placeholder="110" value={nonhdl} onChange={(e) => setNonhdl(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">ApoB (mg/dL)</label>
                  <Input type="number" placeholder="70" value={apob} onChange={(e) => setApob(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Lp(a) (mg/dL)</label>
                  <Input type="number" placeholder="45" value={lpa} onChange={(e) => setLpa(e.target.value)} />
                  {!isNaN(lpaNum) && lpaNum >= 50 && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger">
                      <AlertTriangle className="h-3 w-3" /> ≥50 → Extreme Risk A
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">HbA1c (%)</label>
                  <Input type="number" placeholder="7.2" value={hba1c} onChange={(e) => setHba1c(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">HDL-C (mg/dL)</label>
                  <Input type="number" placeholder="42" value={hdl} onChange={(e) => setHdl(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">hsCRP (mg/L)</label>
                  <Input type="number" placeholder="3.5" value={hscrp} onChange={(e) => setHscrp(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">Creatinine (mg/dL)</label>
                  <Input type="number" placeholder="1.2" value={creatinine} onChange={(e) => setCreatinine(e.target.value)} />
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Auto-calculates eGFR</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-foreground">
                    eGFR {egfrAuto && <span className="text-[10px] font-normal text-primary">auto</span>}
                  </label>
                  <Input type="number" placeholder="45" value={egfr} onChange={(e) => { setEgfr(e.target.value); setEgfrAuto(false); setCreatinine(""); }} className={egfrAuto ? "bg-muted" : ""} />
                  {ckdStage && (
                    <p className={`mt-0.5 text-[10px] font-medium ${egfrVal < 60 ? "text-danger" : "text-muted-foreground"}`}>
                      CKD {ckdStage}
                    </p>
                  )}
                </div>
              </div>
              {/* PREVENT-specific */}
              <div className="border-t border-border pt-3 mt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">PREVENT Calculator Inputs</p>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">SBP (mmHg)</label>
                    <Input type="number" placeholder="130" value={sbp} onChange={(e) => setSbp(e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-foreground">Total Chol (mg/dL)</label>
                    <Input type="number" placeholder="200" value={totalChol} onChange={(e) => setTotalChol(e.target.value)} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox checked={bpMed} onCheckedChange={() => setBpMed(!bpMed)} />
                    <span className="text-xs text-foreground">On BP medication</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2">
                    <Checkbox checked={onStatin} onCheckedChange={() => setOnStatin(!onStatin)} />
                    <span className="text-xs text-foreground">On statin</span>
                  </label>
                </div>
              </div>
            </Section>

            {/* ── Section 3: PREVENT Risk Score ── */}
            <Section
              title="AHA PREVENT — 10-Year ASCVD Risk"
              icon={<TrendingUp className="h-4 w-4 text-primary" />}
              defaultOpen={true}
              badge={preventResult?.valid ? (
                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                  preventResult.category === "High" ? "bg-danger/15 text-danger"
                  : preventResult.category === "Intermediate" ? "bg-warning/15 text-warning"
                  : preventResult.category === "Borderline" ? "bg-primary/15 text-primary"
                  : "bg-success/15 text-success"
                }`}>
                  {preventResult.riskPct}% — {preventResult.category}
                </span>
              ) : undefined}
            >
              {preventResult?.valid ? (
                <div className="space-y-3">
                  <div className={`rounded-lg px-4 py-3 ${
                    preventResult.category === "High" ? "bg-danger/10"
                    : preventResult.category === "Intermediate" ? "bg-warning/10"
                    : preventResult.category === "Borderline" ? "bg-primary/10"
                    : "bg-success/10"
                  }`}>
                    <span className={`font-display text-2xl font-bold ${
                      preventResult.category === "High" ? "text-danger"
                      : preventResult.category === "Intermediate" ? "text-warning"
                      : preventResult.category === "Borderline" ? "text-primary"
                      : "text-success"
                    }`}>
                      {preventResult.riskPct}%
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      {preventResult.category} Risk
                      {preventResult.category === "Low" && " (<5%)"}
                      {preventResult.category === "Borderline" && " (5–7.5%)"}
                      {preventResult.category === "Intermediate" && " (7.5–20%)"}
                      {preventResult.category === "High" && " (≥20%)"}
                    </span>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended Next Steps</p>
                  <ul className="space-y-2">
                    {preventResult.nextSteps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground leading-relaxed">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-muted-foreground italic">
                    Ref: Khan SS et al. Circulation 2024;149(6):430-449.
                  </p>
                </div>
              ) : preventResult && !preventResult.valid ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Cannot calculate — fix the following:</p>
                  {preventResult.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-danger">• {w}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Enter Age, SBP, Total Cholesterol, HDL-C, eGFR, and BMI to auto-calculate.
                </p>
              )}
            </Section>

            {/* ── Section 4: Risk Factors ── */}
            <Section
              title="Major ASCVD Risk Factors"
              icon={<Heart className="h-4 w-4 text-danger" />}
              badge={<span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-foreground">{rfCount}/{MAJOR_RF_KEYS.length}</span>}
            >
              <p className="mb-3 text-[10px] text-muted-foreground">CKD, age, low HDL, obesity auto-derived from inputs</p>
              <div className="space-y-2.5">
                {MAJOR_RF_KEYS.map((key) => (
                  <div key={key}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <Checkbox
                        checked={rfChecked[key]}
                        onCheckedChange={() => toggleRf(key)}
                        disabled={key === "fhx" && fhxAutoQual}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <span className="text-sm leading-snug text-foreground">{MAJOR_RF_LABELS[key]}</span>
                        {key === "fhx" && (
                          <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            fhxAutoQual ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                          }`}>
                            {countCheckedItems(FHX_ITEMS, subChecked)}/{FHX_ITEMS.length} — {fhxAutoQual ? "Qualified ✓" : "≥1 required"}
                          </span>
                        )}
                      </div>
                    </label>
                    {key === "fhx" && (
                      <div className="ml-8 mt-2 mb-1 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-2">
                          Premature CHD / ASCVD: event in a 1st-degree relative before sex-specific age cutoff (≥1 required):
                        </p>
                        <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
                          "Premature" = CHD or atherosclerotic CVD event in a <strong className="text-foreground">male &lt;55 y</strong> or <strong className="text-foreground">female &lt;65 y</strong>. Includes MI, coronary revascularization, angina, ischemic stroke, or PAD.
                        </p>
                        {FHX_ITEMS.map((item) => (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                              subChecked[item.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
                            }`}
                          >
                            <Checkbox checked={!!subChecked[item.id]} onCheckedChange={() => toggleSub(item.id)} className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm leading-snug text-foreground">{item.label}</span>
                              {item.qualifier && <QualifierText text={item.qualifier} />}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {rfCount >= 3 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  ≥3 major ASCVD risk factors — qualifies for higher risk stratification
                </div>
              )}
            </Section>

            {/* ── Section 5: ASCVD History & Modifiers ── */}
            <Section
              title="ASCVD History & Extreme-Risk Modifiers"
              icon={<Stethoscope className="h-4 w-4 text-primary" />}
            >
              <p className="mb-3 text-[10px] text-muted-foreground">
                Tick all that apply. Auto-classifies C → B → A → VHR.
              </p>
              <div className="space-y-2.5">
                {MODIFIER_KEYS.map((key) => {
                  const hasSubMap = key in MOD_SUB_MAP;
                  const hasTod = key === "tod";
                  const isAutoQualified = modAutoQual[key];
                  const subConfig = MOD_SUB_MAP[key];

                  return (
                    <div key={key}>
                      <label className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 transition-colors ${
                        modChecked[key] ? "bg-primary/8 ring-1 ring-primary/20" : "hover:bg-muted/50"
                      }`}>
                        <Checkbox
                          checked={modChecked[key]}
                          onCheckedChange={() => toggleMod(key)}
                          disabled={!!isAutoQualified}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <span className="text-sm leading-snug text-foreground">{MODIFIER_LABELS[key]}</span>
                          {(hasSubMap || hasTod) && (() => {
                            const items = hasTod ? TOD_ALL : subConfig!.items;
                            const count = countCheckedItems(items, subChecked);
                            const qualified = isAutoQualified;
                            return (
                              <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                qualified ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
                              }`}>
                                {count}/{items.length} — {qualified ? "Qualified ✓" : "≥1 required"}
                              </span>
                            );
                          })()}
                        </div>
                      </label>

                      {/* Sub-checklists */}
                      {hasSubMap && (
                        <div className="ml-8 mt-2 mb-1 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">{subConfig!.title}</p>
                          {key === "fh" && (
                            <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
                              "Premature" = CHD or atherosclerotic CVD event in a <strong className="text-foreground">male &lt;55 y</strong> or <strong className="text-foreground">female &lt;65 y</strong>. Includes MI, coronary revascularization, angina, ischemic stroke, or PAD.
                            </p>
                          )}
                          {subConfig!.items.map((item) => (
                            <label
                              key={item.id}
                              className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                                subChecked[item.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
                              }`}
                            >
                              <Checkbox checked={!!subChecked[item.id]} onCheckedChange={() => toggleSub(item.id)} className="mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm leading-snug text-foreground">{item.label}</span>
                                {item.qualifier && <QualifierText text={item.qualifier} />}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* TOD sub-checklist */}
                      {hasTod && (
                        <div className="ml-8 mt-2 mb-1 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
                          <p className="text-xs font-semibold text-muted-foreground">
                            Target Organ Damage Criteria (≥1 microvascular or macrovascular required):
                          </p>
                          {([
                            { title: "Microvascular", items: TOD_MICROVASCULAR },
                            { title: "Macrovascular / Cardiac", items: TOD_MACROVASCULAR },
                          ] as const).map(({ title, items }) => (
                            <div key={title}>
                              <p className="text-[11px] font-bold text-warning/80 uppercase tracking-wide mb-1.5">{title}</p>
                              <div className="space-y-1.5">
                                {items.map((tod) => (
                                  <label
                                    key={tod.id}
                                    className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                                      subChecked[tod.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
                                    }`}
                                  >
                                    <Checkbox checked={!!subChecked[tod.id]} onCheckedChange={() => toggleSub(tod.id)} className="mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm leading-snug text-foreground">{tod.label}</span>
                                      {tod.qualifier && <QualifierText text={tod.qualifier} />}
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Polyvascular disease:</span> Atherosclerosis in ≥2 major arterial territories — coronary (CAD), cerebrovascular (ischemic stroke/TIA), and/or peripheral arterial disease (PAD).
                </p>
              </div>
            </Section>

            {/* ── Section 6: Classification Result ── */}
            <Card className={`border-border bg-card overflow-hidden`}>
              <div className={`px-5 py-4 ${result ? (catColor === "warning" ? "bg-warning/10" : "bg-danger/10") : "bg-muted/30"}`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 font-display font-bold ${result ? (catColor === "warning" ? "text-warning" : "text-danger") : "text-muted-foreground"}`}>
                    {result ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                    {result ? result.category : "Unclassified"}
                  </div>
                  {result && (
                    <Button variant="ghost" size="sm" className="no-print" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-1" /> Print
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-5 space-y-4">
                {result ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { label: "LDL-C Target", value: result.ldlTarget },
                        { label: "Non-HDL-C Target", value: result.nonHdlTarget },
                        { label: "ApoB Target", value: result.apoBTarget },
                      ].map((t) => (
                        <div key={t.label}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.label}</p>
                          <p className="mt-1 font-display text-lg font-bold text-foreground">{t.value}</p>
                        </div>
                      ))}
                    </div>
                    {(ldlAtGoal !== null || nonHdlAtGoal !== null || apoBAtGoal !== null) && (
                      <div className="space-y-2">
                        {ldlAtGoal !== null && <GoalIndicator label={`LDL-C (${ldl} mg/dL)`} atGoal={ldlAtGoal} />}
                        {nonHdlAtGoal !== null && <GoalIndicator label={`Non-HDL-C (${nonhdl} mg/dL)`} atGoal={nonHdlAtGoal} />}
                        {apoBAtGoal !== null && <GoalIndicator label={`ApoB (${apob} mg/dL)`} atGoal={apoBAtGoal} />}
                      </div>
                    )}
                    {result.why.length > 0 && (
                      <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</p>
                        {result.why.map((w, i) => <p key={i} className="text-sm text-foreground">{w}</p>)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Treatment Algorithm</p>
                      <ul className="space-y-2">
                        {result.treatment.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {result.category === "Extreme Risk A" && (
                      <p className="text-xs text-muted-foreground italic">*The LDL-C goal of ≤30 mg/dL must be pursued after detailed risk–benefit discussion.</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">Enter data or tick criteria to classify the patient.</p>
                )}
              </div>
            </Card>

            {/* ── Section 7: Decision Logic ── */}
            <Section title="Decision Logic & Bucket Summary" icon={<Target className="h-4 w-4 text-primary" />} defaultOpen={false}>
              <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground mb-4">
                <li>Check Category C first: ongoing ASCVD sequelae despite LDL-C ≤30 and intensive therapy.</li>
                <li>Then Category B: CAD plus very-high-risk features or recurrent events despite LDL-C &lt;50.</li>
                <li>Then Category A: ASCVD or equivalent burden with diabetes, FH, CKD, Lp(a), stroke, PAD, polyvascular disease, or high calcium/plaque burden.</li>
                <li>If not extreme-risk, label Very High Risk when established ASCVD, homozygous FH, or diabetes with ≥3 major RF / target-organ damage is present.</li>
              </ol>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-2 pr-3 text-left text-xs font-semibold text-muted-foreground">Category</th>
                      <th className="py-2 pr-3 text-left text-xs font-semibold text-muted-foreground">Main Trigger</th>
                      <th className="py-2 text-left text-xs font-semibold text-muted-foreground">LDL-C Target</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BUCKET_TABLE.map((row) => (
                      <tr key={row.cat} className="border-b border-border last:border-0">
                        <td className="py-2 pr-3 font-bold text-foreground">{row.cat}</td>
                        <td className="py-2 pr-3 text-foreground">{row.trigger}</td>
                        <td className="py-2 font-semibold text-foreground">{row.ldl}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            {/* ── Section 8: EMR Note ── */}
            <Section title="EMR Note" icon={<FileText className="h-4 w-4 text-primary" />}>
              <textarea
                readOnly
                value={generateNote()}
                className="w-full min-h-[180px] resize-y rounded-lg border border-border bg-muted/30 p-3 text-sm text-foreground font-mono"
              />
              <div className="flex gap-3 mt-3">
                <Button onClick={copyNote} className="gap-1.5">
                  {copied ? <ClipboardCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy Note"}
                </Button>
                <Button onClick={reset} variant="outline" className="gap-1.5">
                  <RotateCcw className="h-4 w-4" /> Reset
                </Button>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "primary" && <PrimaryPrevention />}
        {activeTab === "education" && <EducationSection />}

        <p className="mt-8 text-center text-xs text-muted-foreground pb-6">
          Reference: 2026 ACC/AHA Guideline on Management of Dyslipidemia · LAI 2023 Consensus IV
        </p>
      </div>
    </div>
  );
}

function GoalIndicator({ label, atGoal }: { label: string; atGoal: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${atGoal ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
      {atGoal ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {label} — {atGoal ? "At goal" : "Above target"}
    </div>
  );
}
