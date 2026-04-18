import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Heart, AlertTriangle, ShieldCheck, RotateCcw, Activity,
  Printer, Target, Copy, ClipboardCheck, TrendingUp, User,
  TestTube, ChevronDown, Stethoscope, FileText, Home,
} from "lucide-react";
import PrimaryPrevention from "@/components/calculator/PrimaryPrevention";
import {
  ASCVD_ESTABLISHED, SUBCLINICAL_ITEMS, HIGH_CAC_ITEMS, CKD_ITEMS,
  FHX_ITEMS, EXTREME_ELEVATION_ITEMS, TOD_MICROVASCULAR, TOD_MACROVASCULAR,
  TOD_ALL, countCheckedItems, type SubItem,
  RISK_MODIFIERS_LAI, HIGH_RISK_FEATURES_LAI,
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
  "ageRisk", "smoking", "htn", "lowhdl",
] as const;

const MAJOR_RF_LABELS: Record<string, string> = {
  ageRisk: "Age (Men ≥45y, Women ≥55y)",
  smoking: "Tobacco use: Cigarettes, bidi, paan, gutka, etc.",
  htn: "High blood pressure (≥140/90 or on treatment)",
  lowhdl: "Low HDL-C (Men <40 mg/dL, Women <50 mg/dL)",
};

// ─── ASCVD history & extreme-risk modifiers ───
// ─── Predictor Badge Styles ───
const PREDICTOR_STYLING: Record<string, { bg: string; text: string; border: string }> = {
  feat_apob: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30" },
  feat_extreme: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  feat_lpa: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
  feat_mets: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  feat_nafld: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
  feat_cacs: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/30" },
};

function PredictorBadge({ id, label }: { id: string; label: string }) {
  const style = PREDICTOR_STYLING[id] || { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  // Extract a meaningful letter (usually the first char of the main subject)
  const letterMap: Record<string, string> = {
    feat_apob: "B",
    feat_extreme: "E",
    feat_lpa: "L",
    feat_mets: "M",
    feat_nafld: "N",
    feat_cacs: "C"
  };
  const letter = letterMap[id] || "?";
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${style.bg} ${style.text} ${style.border} text-[11px] font-black uppercase tracking-widest shadow-sm transition-all hover:scale-105`}>
      <span className="flex items-center justify-center w-5 h-5 rounded-lg bg-white dark:bg-black/40 text-[10px] shadow-sm">
        {letter}
      </span>
      {label}
    </div>
  );
}

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

// ─── Unit Conversion Utilities ───
const CONVERSIONS = {
  kgToLb: (v: number) => v * 2.20462,
  lbToKg: (v: number) => v / 2.20462,
  cmToIn: (v: number) => v * 0.393701,
  inToCm: (v: number) => v / 0.393701,
  mgdlToMmol: (v: number) => v * 0.02586,
  mmolToMgdl: (v: number) => v / 0.02586,
};

function formatDisplay(val: string, unit: string, useMetric: boolean): string {
  if (!val) return "NA";
  const num = parseFloat(val);
  if (isNaN(num)) return "NA";
  return `${num.toFixed(1)} ${unit}`;
}

/** Asian BMI classification helper */
function getAsianBmiClass(bmiVal: number): { label: string; color: string } {
  if (bmiVal < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (bmiVal < 23) return { label: "Normal", color: "text-emerald-500" };
  if (bmiVal < 25) return { label: "Overweight (At Risk)", color: "text-amber-500" };
  if (bmiVal < 27.5) return { label: "Obese I", color: "text-rose-500" };
  return { label: "Obese II", color: "text-rose-600" };
}

function getWhoBmiClass(bmiVal: number): { label: string; color: string } {
  if (bmiVal < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (bmiVal < 25) return { label: "Normal", color: "text-emerald-500" };
  if (bmiVal < 30) return { label: "Overweight", color: "text-amber-500" };
  return { label: "Obese", color: "text-rose-600" };
}

function getIndianBmiClass(bmiVal: number): { label: string; color: string } {
  if (bmiVal < 18.5) return { label: "Underweight", color: "text-blue-500" };
  if (bmiVal < 23) return { label: "Normal", color: "text-emerald-500" };
  if (bmiVal < 25) return { label: "Overweight (At Risk)", color: "text-amber-500" };
  if (bmiVal < 27) return { label: "Obese I", color: "text-rose-500" };
  return { label: "Obese II", color: "text-rose-600" };
}

function getBmiClass(bmiVal: number, ethnicity: string): { label: string; color: string } {
  if (ethnicity === "asian") return getAsianBmiClass(bmiVal);
  if (ethnicity === "indian") return getIndianBmiClass(bmiVal);
  return getWhoBmiClass(bmiVal);
}

function getObesityThreshold(ethnicity: string): number {
  if (ethnicity === "asian" || ethnicity === "indian") return 25;
  return 30;
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
  { cat: "C", trigger: "Recurrent ASCVD despite LDL ~30", ldl: "Focus on non-LDL factors / specialized care" },
  { cat: "B", trigger: "ASCVD + 2 VHR features, recurrent ACS, or polyvascular", ldl: "Aggressive target" },
  { cat: "A", trigger: "ASCVD + 1 High-Risk feature or CACS ≥300", ldl: "<50 mg/dL" },
  { cat: "VHR", trigger: "DM + TOD, DM + ≥2 major factors, or LDL ≥190", ldl: "<50 mg/dL" },
  { cat: "High", trigger: "≥3 major RF or DM + 0–1 major factor", ldl: "<70 mg/dL" },
  { cat: "Moderate", trigger: "2 major RF or 1 risk modifier", ldl: "<100 mg/dL" },
  { cat: "Low", trigger: "0–1 major RF", ldl: "<100 mg/dL (primary prevention)" },
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

// ─── Section tone palette (color-coded cards) ───
type SectionTone = "primary" | "accent" | "danger" | "warning" | "neutral" | "indigo";

const TONE_STYLES: Record<SectionTone, { card: string; header: string; iconWrap: string; title: string; ring: string }> = {
  primary: {
    card: "border-primary/25 bg-primary/[0.04]",
    header: "bg-primary/8 hover:bg-primary/12",
    iconWrap: "bg-primary/15 text-primary",
    title: "text-primary",
    ring: "ring-primary/20",
  },
  accent: {
    card: "border-accent/25 bg-accent/[0.04]",
    header: "bg-accent/8 hover:bg-accent/12",
    iconWrap: "bg-accent/15 text-accent",
    title: "text-accent",
    ring: "ring-accent/20",
  },
  danger: {
    card: "border-danger/25 bg-danger/[0.04]",
    header: "bg-danger/8 hover:bg-danger/12",
    iconWrap: "bg-danger/15 text-danger",
    title: "text-danger",
    ring: "ring-danger/20",
  },
  warning: {
    card: "border-warning/30 bg-warning/[0.05]",
    header: "bg-warning/10 hover:bg-warning/15",
    iconWrap: "bg-warning/20 text-warning",
    title: "text-warning",
    ring: "ring-warning/20",
  },
  indigo: {
    card: "border-[hsl(245_70%_55%)]/25 bg-[hsl(245_70%_55%)]/[0.04]",
    header: "bg-[hsl(245_70%_55%)]/8 hover:bg-[hsl(245_70%_55%)]/12",
    iconWrap: "bg-[hsl(245_70%_55%)]/15 text-[hsl(245_70%_55%)]",
    title: "text-[hsl(245_70%_55%)]",
    ring: "ring-[hsl(245_70%_55%)]/20",
  },
  neutral: {
    card: "border-border bg-card",
    header: "hover:bg-muted/30",
    iconWrap: "bg-muted text-foreground",
    title: "text-foreground",
    ring: "ring-border",
  },
};

// ─── Collapsible Section ───
function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
  tone = "neutral",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  tone?: SectionTone;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const t = TONE_STYLES[tone];
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={`overflow-hidden shadow-sm ${t.card}`}>
        <CollapsibleTrigger className={`flex w-full items-center justify-between px-5 py-3.5 transition-colors ${t.header}`}>
          <div className="flex items-center gap-2.5">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${t.iconWrap}`}>
              {icon}
            </span>
            <h2 className={`font-display text-sm font-bold ${t.title}`}>{title}</h2>
            {badge}
          </div>
          <ChevronDown className={`h-4 w-4 ${t.title} transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-3 bg-card">{children}</div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function LipidCalculator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("calculator");
  const [useMetric, setUseMetric] = useState(true);

  // ─── Lab inputs (Base units: cm, kg, mg/dL) ───
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
  const [ethnicity, setEthnicity] = useState<"caucasian" | "asian" | "indian" | "other">("indian");
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
  const [subListOpen, setSubListOpen] = useState<Record<string, boolean>>({});
  
  const toggleSub = (id: string) =>
    setSubChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  
  const toggleSubList = (key: string) =>
    setSubListOpen((prev) => ({ ...prev, [key]: !prev[key] }));

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
    let h = parseFloat(height);
    let w = parseFloat(weight);
    if (isNaN(h) || h <= 0 || isNaN(w) || w <= 0) { setBmiAuto(false); return; }
    
    // Normalize to cm and kg if in Imperial
    if (!useMetric) {
      h = h * 2.54; // in to cm
      w = w * 0.453592; // lb to kg
    }
    
    const hm = h / 100;
    setBmi((w / (hm * hm)).toFixed(1));
    setBmiAuto(true);
  }, [height, weight, useMetric]);

  // ─── Auto-derive obesity ───
  useEffect(() => {
    const v = parseFloat(bmi);
    if (isNaN(v)) return;
    const threshold = getObesityThreshold(ethnicity);
    const isObese = v >= threshold;
    setRfChecked((prev) => (prev.obesity === isObese ? prev : { ...prev, obesity: isObese }));
  }, [bmi, ethnicity]);

  // ─── Auto-calculate eGFR (CKD-EPI 2021) ───
  useEffect(() => {
    let cr = parseFloat(creatinine);
    const a = parseFloat(age);
    if (isNaN(cr) || cr <= 0 || isNaN(a) || a <= 0) { setEgfrAuto(false); return; }
    
    // Normalize to mg/dL if in Imperial (umol/L)
    if (!useMetric) {
      cr = cr / 88.42; 
    }
    
    const kappa = sex === "female" ? 0.7 : 0.9;
    const alpha = sex === "female" ? -0.241 : -0.302;
    const sexMul = sex === "female" ? 1.012 : 1.0;
    const calculated = 142 * Math.pow(Math.min(cr / kappa, 1), alpha) * Math.pow(Math.max(cr / kappa, 1), -1.200) * Math.pow(0.9938, a) * sexMul;
    setEgfr(Math.round(calculated).toString());
    setEgfrAuto(true);
  }, [creatinine, age, sex, useMetric]);

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
  const [laiModChecked, setLaiModChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(RISK_MODIFIERS_LAI.map(m => [m.id, false]))
  );
  const [laiFeatChecked, setLaiFeatChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(HIGH_RISK_FEATURES_LAI.map(f => [f.id, false]))
  );

  const toggleLaiMod = (id: string) => setLaiModChecked(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleLaiFeat = (id: string) => setLaiFeatChecked(prev => ({ ...prev, [id]: !prev[id] }));

  // ─── Classification logic (LAI 2023) ───
  const classify = useCallback((): CategoryResult | null => {
    const v = modChecked;
    const ldlVal = parseFloat(ldl);
    const nonhdlVal = parseFloat(nonhdl);
    const rf = rfCount;
    const mods = Object.values(laiModChecked).filter(Boolean).length;
    const feats = Object.values(laiFeatChecked).filter(Boolean).length;
    
    let cat = "", ldlT = 0, nonHdlT = 0, apoBT = 0;
    const why: string[] = [];

    // Category C
    if (v.sequelae30) {
      cat = "Extreme Risk C"; ldlT = 30; nonHdlT = 60; apoBT = 45;
      why.push("Recurrent ASCVD event despite LDL-C around 30 mg/dL.");
    } 
    // Category B
    else if ((v.ascvd && (feats >= 2)) || v.acs12 || v.polyvascular || v.hofh) {
      cat = "Extreme Risk B"; ldlT = 30; nonHdlT = 60; apoBT = 45;
      if (v.ascvd && feats >= 2) why.push("ASCVD with ≥2 features of very high risk group.");
      if (v.acs12) why.push("Recurrent ACS.");
      if (v.polyvascular) why.push("Polyvascular disease.");
      if (v.hofh) why.push("Homozygous FH.");
    }
    // Category A
    else if ((v.ascvd && feats >= 1) || (!isNaN(parseFloat(lpa)) && parseFloat(lpa) >= 300)) {
      cat = "Extreme Risk A"; ldlT = 50; nonHdlT = 80; apoBT = 55;
      why.push("ASCVD with ≥1 High-risk group feature.");
    }
    // Very High Risk
    else if (v.ascvd || v.fh || (rfChecked.dm && (v.tod || rf >= 2)) || feats >= 2 || ldlVal >= 190) {
      cat = "Very High Risk"; ldlT = 50; nonHdlT = 80; apoBT = 65;
      if (rfChecked.dm && (v.tod || rf >= 2)) why.push("Diabetes with TOD or ≥2 major risk factors.");
      if (feats >= 2) why.push("≥2 High-risk features present.");
      if (v.ascvd) why.push("Established ASCVD.");
      if (v.fh || ldlVal >= 190) why.push("Heterozygous FH or LDL-C ≥190 mg/dL.");
    }
    // High Risk
    else if (rf >= 3 || (ldlVal >= 160 && ldlVal <= 189) || (rfChecked.dm && rf <= 1) || (rf === 2 && mods >= 1) || feats >= 1) {
      cat = "High Risk"; ldlT = 70; nonHdlT = 100; apoBT = 80;
      if (rf >= 3) why.push("≥3 major ASCVD risk factors.");
      if (ldlVal >= 160) why.push("LDL-C 160-189 mg/dL.");
      if (rfChecked.dm) why.push("Diabetes with 0-1 major risk factors.");
      if (rf === 2 && mods >= 1) why.push("2 major factors + ≥1 risk modifier.");
      if (feats >= 1) why.push("1 high-risk feature present.");
    }
    // Moderate Risk
    else if (rf === 2 || (ldlVal >= 130 && ldlVal <= 159) || (rf <= 1 && mods >= 1)) {
      cat = "Moderate Risk"; ldlT = 100; nonHdlT = 130; apoBT = 0;
      if (rf === 2) why.push("2 major ASCVD risk factors.");
      if (mods >= 1) why.push("≥1 risk modifier present.");
    }
    // Low Risk
    else if (rf <= 1 || (ldlVal >= 100 && ldlVal <= 129)) {
      cat = "Low Risk"; ldlT = 100; nonHdlT = 130; apoBT = 0;
      why.push("0–1 major ASCVD risk factor.");
    }
    else {
      return null;
    }

    return { 
      category: cat, 
      ldlTarget: ldlT, 
      nonHdlTarget: nonHdlT, 
      apoBTarget: apoBT, 
      treatment: TREATMENTS[cat] || [], 
      why 
    };
  }, [modChecked, rfChecked, rfCount, lpa, ldl, nonhdl, laiModChecked, laiFeatChecked]);

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
    lines.push("       LIPID RISK PREDICTOR");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("");
    lines.push("CATEGORY: " + (result?.category || "Lower than VHR / not classifiable"));
    lines.push("");
    lines.push("LDL-C Target: " + (result?.ldlTarget || "Use standard LAI primary-prevention pathway"));
    lines.push("Non-HDL-C Target: " + (result?.nonHdlTarget || "—"));
    lines.push("ApoB Target: " + (result?.apoBTarget || "—"));
    lines.push("");
    lines.push("═══════════════════════════════════════════════════");
    lines.push("Ref: 2026 ACC/AHA Guideline on Management of Dyslipidemia · LAI 2023 Consensus IV");
    return lines.join("\n");
  }, [result]);

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
    setLaiFeatChecked(Object.fromEntries(HIGH_RISK_FEATURES_LAI.map((f) => [f.id, false])));
    setSubChecked({});
  };

  const toggleUnits = () => {
    const isNowMetric = !useMetric;
    setUseMetric(isNowMetric);

    const conv = (val: string, factor: number) => {
      if (!val) return "";
      const n = parseFloat(val);
      if (isNaN(n)) return "";
      return (n * factor).toFixed(1);
    };

    // Metric (SI) vs Imperial (US)
    if (isNowMetric) {
      // Switching from Imperial (mg/dL) to Metric (mmol/L)
      setLdl(prev => conv(prev, CONVERSIONS.mgdlToMmol(1)));
      setNonhdl(prev => conv(prev, CONVERSIONS.mgdlToMmol(1)));
      setHdl(prev => conv(prev, CONVERSIONS.mgdlToMmol(1)));
      setTotalChol(prev => conv(prev, CONVERSIONS.mgdlToMmol(1)));
      setHeight(prev => conv(prev, CONVERSIONS.inToCm(1)));
      setWeight(prev => conv(prev, CONVERSIONS.lbToKg(1)));
      setApob(prev => conv(prev, 1 / 100)); // mg/dL to g/L
      setLpa(prev => conv(prev, 2.4)); // mg/dL to nmol/L (rough avg)
      setCreatinine(prev => conv(prev, 88.42)); // mg/dL to μmol/L
    } else {
      // Switching from Metric (mmol/L) to Imperial (mg/dL)
      setLdl(prev => conv(prev, CONVERSIONS.mmolToMgdl(1)));
      setNonhdl(prev => conv(prev, CONVERSIONS.mmolToMgdl(1)));
      setHdl(prev => conv(prev, CONVERSIONS.mmolToMgdl(1)));
      setTotalChol(prev => conv(prev, CONVERSIONS.mmolToMgdl(1)));
      setHeight(prev => conv(prev, CONVERSIONS.cmToIn(1)));
      setWeight(prev => conv(prev, CONVERSIONS.kgToLb(1)));
      setApob(prev => conv(prev, 100)); // g/L to mg/dL
      setLpa(prev => conv(prev, 0.4166)); // nmol/L to mg/dL
      setCreatinine(prev => conv(prev, 0.0113)); // μmol/L to mg/dL
    }
  };

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
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/20">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="font-display text-base font-bold tracking-tight text-foreground truncate">
                  Lipid Risk Predictor
                </h1>
                <p className="text-[10px] text-muted-foreground truncate font-semibold uppercase tracking-wider">
                  Premium Clinical Decision Support
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">Units:</span>
              <button 
                onClick={toggleUnits}
                className={`relative flex h-6 w-12 items-center rounded-full p-1 transition-colors duration-200 focus:outline-none ${useMetric ? "bg-emerald-500" : "bg-orange-500"}`}
              >
                <div className={`h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${useMetric ? "translate-x-6" : "translate-x-0"}`} />
              </button>
              <span className="text-[10px] font-black w-12 text-center text-foreground">
                {useMetric ? "METRIC" : "IMPERIAL"}
              </span>
            </div>
          </div>
            <div className="flex items-center gap-2 no-print shrink-0">
              {preventResult?.valid && (
                <div className={`hidden sm:flex flex-col items-end rounded-lg border px-2.5 py-1 leading-none ${
                    preventResult.category === "High" ? "border-danger/30 bg-danger/5"
                    : preventResult.category === "Intermediate" ? "border-warning/30 bg-warning/5"
                    : preventResult.category === "Borderline" ? "border-primary/30 bg-primary/5"
                    : "border-accent/30 bg-accent/5"
                  }`}>
                  <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Risk Index</span>
                  <span className={`font-display text-sm font-bold ${
                      preventResult.category === "High" ? "text-danger"
                      : preventResult.category === "Intermediate" ? "text-warning"
                      : preventResult.category === "Borderline" ? "text-primary"
                      : "text-accent"
                    }`}>{preventResult.riskPct}<span className="text-[10px]">%</span></span>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => navigate("/")} title="Back to Home">
                <Home className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={reset} title="Reset Form">
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
          <div className="space-y-4">
            <Section title="Demographics & Metrics" tone="primary" icon={<User className="h-4 w-4" />}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                    <User className="h-3 w-3" /> Age (Years)
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder="Enter Age" 
                    value={age} 
                    onChange={(e) => setAge(e.target.value)}
                    className="h-10 border-indigo-500/20 bg-indigo-500/5 focus-visible:ring-indigo-500" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-purple-500 flex items-center gap-2">
                    <Activity className="h-3 w-3" /> Sex
                  </label>
                  <Select value={sex} onValueChange={(v: any) => setSex(v)}>
                    <SelectTrigger className="h-10 border-purple-500/20 bg-purple-500/5 focus:ring-purple-500">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" /> Height ({useMetric ? "cm" : "in"})
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder={useMetric ? "cm" : "in"} 
                    value={height} 
                    onChange={(e) => setHeight(e.target.value)}
                    className="h-10 border-emerald-500/20 bg-emerald-500/5 focus-visible:ring-emerald-500" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-teal-500 flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" /> Weight ({useMetric ? "kg" : "lb"})
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    placeholder={useMetric ? "kg" : "lb"} 
                    value={weight} 
                    onChange={(e) => setWeight(e.target.value)}
                    className="h-10 border-teal-500/20 bg-teal-500/5 focus-visible:ring-teal-500" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4 transition-all hover:bg-indigo-500/20">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Calculated BMI</span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{bmi || "NA"}</span>
                  </div>
                  {bmi && (
                    <div className="text-right">
                      <span className={`text-[11px] font-black uppercase ${getBmiClass(parseFloat(bmi), ethnicity).color}`}>
                        {getBmiClass(parseFloat(bmi), ethnicity).label}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                    <Globe className="h-3 w-3" /> Ethnicity
                  </label>
                  <Select value={ethnicity} onValueChange={(v) => setEthnicity(v as any)}>
                    <SelectTrigger className="h-10 border-blue-500/20 bg-blue-500/5 focus:ring-blue-500">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indian">Indian</SelectItem>
                      <SelectItem value="asian">Asian</SelectItem>
                      <SelectItem value="caucasian">Caucasian</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

               <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                  <Activity className="h-3 w-3" /> Waist Circ (cm)
                </label>
                <div className="flex gap-3">
                  <Input 
                    type="number" 
                    min="0"
                    placeholder="cm" 
                    value={waistCirc} 
                    onChange={(e) => setWaistCirc(e.target.value)}
                    className="h-10 border-emerald-600/20 bg-emerald-600/5 focus-visible:ring-emerald-600 flex-1" 
                  />
                  {waistCirc && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-600/10 bg-emerald-600/5 px-4 text-[10px] font-bold">
                      {(sex === "male" ? parseFloat(waistCirc) >= 90 : parseFloat(waistCirc) >= 80) ? (
                        <span className="text-rose-500 uppercase">Above Cutoff</span>
                      ) : (
                        <span className="text-emerald-600 uppercase">Normal</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Section>

            {/* ── Section 2: Laboratory Values ── */}
            <Section title="Laboratory Values" tone="indigo" icon={<TestTube className="h-4 w-4" />}>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                    <TestTube className="h-3 w-3" /> LDL-C ({useMetric ? "mmol/L" : "mg/dL"})
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    value={ldl} 
                    onChange={(e) => setLdl(e.target.value)}
                    className="h-10 border-rose-500/20 bg-rose-500/5 focus-visible:ring-rose-500" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-500 flex items-center gap-2">
                    <TestTube className="h-3 w-3" /> Non-HDL ({useMetric ? "mmol/L" : "mg/dL"})
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    value={nonhdl} 
                    onChange={(e) => setNonhdl(e.target.value)}
                    className="h-10 border-orange-500/20 bg-orange-500/5 focus-visible:ring-orange-500" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-2">
                    <TestTube className="h-3 w-3" /> ApoB ({useMetric ? "g/L" : "mg/dL"})
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    value={apob} 
                    onChange={(e) => setApob(e.target.value)}
                    className="h-10 border-amber-500/20 bg-amber-500/5 focus-visible:ring-amber-500" 
                  />
                </div>
              </div>
               
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-cyan-500 flex items-center gap-2">
                    <TestTube className="h-3 w-3" /> Lp(a) ({useMetric ? "nmol/L" : "mg/dL"})
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    value={lpa} 
                    onChange={(e) => setLpa(e.target.value)}
                    className="h-10 border-cyan-500/20 bg-cyan-500/5 focus-visible:ring-cyan-500" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                    <TestTube className="h-3 w-3" /> HbA1c (%)
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    value={hba1c} 
                    onChange={(e) => setHba1c(e.target.value)}
                    className="h-10 border-emerald-500/20 bg-emerald-500/5 focus-visible:ring-emerald-500" 
                  />
                </div>
              </div>

               <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                    <TestTube className="h-3 w-3" /> HDL-C ({useMetric ? "mmol/L" : "mg/dL"})
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    value={hdl} 
                    onChange={(e) => setHdl(e.target.value)}
                    className="h-10 border-blue-500/20 bg-blue-500/5 focus-visible:ring-blue-500" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-violet-500 flex items-center gap-2">
                    <TestTube className="h-3 w-3" /> Creatinine ({useMetric ? "μmol/L" : "mg/dL"})
                  </label>
                  <Input 
                    type="number" 
                    min="0"
                    value={creatinine} 
                    onChange={(e) => setCreatinine(e.target.value)}
                    className="h-10 border-violet-500/20 bg-violet-500/5 focus-visible:ring-violet-500" 
                  />
                </div>
              </div>

              {/* Cardiovascular Risk Parameters */}
              <div className="border-t border-border pt-4 mt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Cardiovascular Risk Parameters (PREVENT)</p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                      <Activity className="h-3 w-3" /> SBP (mmHg)
                    </label>
                    <Input 
                      type="number" 
                      min="0"
                      placeholder="e.g. 130" 
                      value={sbp} 
                      onChange={(e) => setSbp(e.target.value)}
                      className="h-10 border-slate-500/20 bg-slate-500/5 focus-visible:ring-slate-500" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                      <TestTube className="h-3 w-3" /> Total Chol ({useMetric ? "mmol/L" : "mg/dL"})
                    </label>
                    <Input 
                      type="number" 
                      min="0"
                      placeholder="e.g. 200" 
                      value={totalChol} 
                      onChange={(e) => setTotalChol(e.target.value)}
                      className="h-10 border-slate-500/20 bg-slate-500/5 focus-visible:ring-slate-500" 
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-500/10 bg-slate-500/5 px-3 py-2 transition-colors hover:bg-slate-500/10">
                    <Checkbox checked={bpMed} onCheckedChange={() => setBpMed(!bpMed)} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">On BP Meds</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-500/10 bg-slate-500/5 px-3 py-2 transition-colors hover:bg-slate-500/10">
                    <Checkbox checked={onStatin} onCheckedChange={() => setOnStatin(!onStatin)} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">On Statin</span>
                  </label>
                </div>
              </div>
            </Section>

            {/* ── Section: High-Risk Features ── */}
            <Section title="High-Risk Features Checklist" tone="secondary" icon={<Activity className="h-4 w-4" />}>
              <div className="grid grid-cols-1 gap-2">
                {HIGH_RISK_FEATURES_LAI.map(feature => (
                  <label 
                    key={feature.id}
                    className={`flex items-start gap-3 rounded-xl border p-3 transition-all cursor-pointer hover:bg-muted/50 ${
                      laiFeatChecked[feature.id] 
                        ? "border-indigo-500/30 bg-indigo-500/5 shadow-sm" 
                        : "border-border/50 bg-background"
                    }`}
                  >
                    <div className="mt-1">
                      <Checkbox 
                        checked={laiFeatChecked[feature.id]} 
                        onCheckedChange={() => toggleLaiFeat(feature.id)}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-xs font-bold leading-none ${laiFeatChecked[feature.id] ? "text-indigo-600" : "text-foreground"}`}>
                        {feature.label}
                      </span>
                      {feature.qualifier && (
                        <span className="text-[10px] text-muted-foreground mt-1">
                          {feature.qualifier}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </Section>

            {/* ── Section 3: PREVENT Risk Score ── */}
            <Section
              title="AHA PREVENT — 10-Year ASCVD Risk"
              tone="accent"
              icon={<TrendingUp className="h-4 w-4" />}
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

            {/* ── Section 4: Major ASCVD Risk Factors ── */}
            <Section
              title="Major ASCVD Risk Factors"
              tone="warning"
              icon={<Heart className="h-4 w-4" />}
              badge={<span className="ml-2 rounded-full bg-warning/15 px-2 py-0.5 text-xs font-bold text-warning">{rfCount}/4</span>}
            >
              <p className="mb-3 text-[10px] text-muted-foreground">Age and Low HDL-C are auto-derived from your inputs.</p>
              <div className="space-y-3">
                {MAJOR_RF_KEYS.map((key) => (
                  <label key={key} className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={rfChecked[key]}
                      onCheckedChange={() => toggleRf(key)}
                      disabled={key === "ageRisk" || key === "lowhdl"}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-snug text-foreground">{MAJOR_RF_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </Section>

            {/* ── Section: High-Risk Features ── */}
            <Section
              title="High-Risk Features"
              tone="danger"
              icon={<AlertTriangle className="h-4 w-4" />}
              badge={<span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-xs font-bold text-danger">
                {Object.values(laiFeatChecked).filter(Boolean).length}/{HIGH_RISK_FEATURES_LAI.length}
              </span>}
            >
              <p className="mb-3 text-[10px] text-muted-foreground">Indicates a higher categorical risk even at lower RF counts.</p>
              <div className="space-y-2.5">
                {HIGH_RISK_FEATURES_LAI.map((item) => (
                  <div key={item.id}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <Checkbox
                        checked={laiFeatChecked[item.id]}
                        onCheckedChange={() => toggleLaiFeat(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm leading-snug text-foreground">{item.label}</span>
                        {item.qualifier && <QualifierText text={item.qualifier} />}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Section: Risk Modifiers ── */}
            <Section
              title="Risk Modifiers"
              tone="primary"
              icon={<ShieldCheck className="h-4 w-4" />}
              badge={<span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-bold text-primary">
                {Object.values(laiModChecked).filter(Boolean).length}/{RISK_MODIFIERS_LAI.length}
              </span>}
            >
              <p className="mb-3 text-[10px] text-muted-foreground">Modifiers that can upgrade Low to Moderate or Moderate to High Risk.</p>
              <div className="space-y-2.5">
                {RISK_MODIFIERS_LAI.map((item) => (
                  <div key={item.id}>
                    <label className="flex cursor-pointer items-start gap-3">
                      <Checkbox
                        checked={laiModChecked[item.id]}
                        onCheckedChange={() => toggleLaiMod(item.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm leading-snug text-foreground">{item.label}</span>
                        {item.qualifier && <QualifierText text={item.qualifier} />}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </Section>

            {/* ── Section 5: ASCVD History & Modifiers ── */}
            <Section
              title="ASCVD History & Extreme-Risk Modifiers"
              tone="danger"
              icon={<Stethoscope className="h-4 w-4" />}
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
                        <Collapsible open={subListOpen[key]} onOpenChange={() => toggleSubList(key)} className="ml-8 mt-2 mb-1">
                          <CollapsibleTrigger asChild>
                            <button className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                              <span className="text-xs font-semibold text-muted-foreground">
                                {subConfig!.title.split("(")[0].trim()} ({countCheckedItems(subConfig!.items, subChecked)}/{subConfig!.items.length})
                              </span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${subListOpen[key] ? "rotate-180" : ""}`} />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-1.5 rounded-b-lg border-x border-b border-border bg-muted/30 p-3 pt-0">
                            {key === "fh" && (
                              <p className="text-[11px] text-muted-foreground leading-snug">
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
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {/* TOD sub-checklist */}
                      {hasTod && (
                        <Collapsible open={subListOpen.tod} onOpenChange={() => toggleSubList("tod")} className="ml-8 mt-2 mb-1">
                          <CollapsibleTrigger asChild>
                            <button className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 p-3 hover:bg-muted/50 transition-colors">
                              <span className="text-xs font-semibold text-muted-foreground">
                                Target Organ Damage Criteria ({countCheckedItems(TOD_ALL, subChecked)}/${TOD_ALL.length})
                              </span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${subListOpen.tod ? "rotate-180" : ""}`} />
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="space-y-3 rounded-b-lg border-x border-b border-border bg-muted/30 p-3 pt-0">
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
                          </CollapsibleContent>
                        </Collapsible>
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

            <Card className="border-border bg-card overflow-hidden">
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

               {/* Predicted High-Risk Load Detectors */}
              {Object.values(laiFeatChecked).some(Boolean) && (
                <div className="px-5 py-3 border-b border-border/50 bg-indigo-50/50 dark:bg-indigo-950/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">High-Risk Predictors Found</p>
                  <div className="flex flex-wrap gap-2">
                    {HIGH_RISK_FEATURES_LAI.filter(f => laiFeatChecked[f.id]).map(f => (
                      <PredictorBadge key={f.id} id={f.id} label={f.label} />
                    ))}
                  </div>
                </div>
              )}

              <div className="p-5 space-y-4">
                {result ? (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {([
                        { label: "LDL-C Target", val: result.ldlTarget, type: "ldl" },
                        { label: "Non-HDL Target", val: result.nonHdlTarget, type: "nonhdl" },
                        { label: "ApoB Target", val: result.apoBTarget, type: "apob" },
                      ] as const).map((t) => {
                        let displayVal = "—";
                        if (t.val > 0) {
                          if (t.type === "apob") {
                            displayVal = useMetric ? `< ${ (t.val / 100).toFixed(2) } g/L` : `< ${t.val} mg/dL`;
                          } else {
                            displayVal = useMetric ? `< ${ (t.val / 38.67).toFixed(1) } mmol/L` : `< ${t.val} mg/dL`;
                          }
                        }
                        return (
                          <div key={t.label}>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t.label}</p>
                            <p className="mt-1 font-display text-lg font-bold text-foreground">{displayVal}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="space-y-2">
                      {ldl && result.ldlTarget > 0 && (
                        <GoalIndicator 
                          label={`LDL-C (${ldl} ${useMetric ? "mmol/L" : "mg/dL"})`} 
                          atGoal={useMetric ? parseFloat(ldl) <= result.ldlTarget/38.67 : parseFloat(ldl) <= result.ldlTarget} 
                        />
                      )}
                      {nonhdl && result.nonHdlTarget > 0 && (
                        <GoalIndicator 
                          label={`Non-HDL (${nonhdl} ${useMetric ? "mmol/L" : "mg/dL"})`} 
                          atGoal={useMetric ? parseFloat(nonhdl) <= result.nonHdlTarget/38.67 : parseFloat(nonhdl) <= result.nonHdlTarget} 
                        />
                      )}
                      {apob && result.apoBTarget > 0 && (
                        <GoalIndicator 
                          label={`ApoB (${apob} ${useMetric ? "g/L" : "mg/dL"})`} 
                          atGoal={useMetric ? parseFloat(apob) <= result.apoBTarget/100 : parseFloat(apob) <= result.apoBTarget} 
                        />
                      )}
                    </div>

                    {result.why.length > 0 && (
                      <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1 border border-border/50">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</p>
                        {result.why.map((w, i) => <p key={i} className="text-sm text-foreground">{w}</p>)}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Clinical Management</p>
                      <ul className="space-y-2">
                        {result.treatment.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-black text-primary border border-primary/20">{i + 1}</span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-xl border border-dashed border-border">
                    <ShieldCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-bold text-muted-foreground">Clinical Entry Incomplete</p>
                    <p className="text-xs text-muted-foreground/60">Enter laboratory values and risk factors to classify.</p>
                  </div>
                )}
              </div>
            </Card>

            {/* ── Section 7: Decision Logic ── */}
            <Section title="Decision Logic & Bucket Summary" tone="neutral" icon={<Target className="h-4 w-4" />} defaultOpen={false}>
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
            <Section title="EMR Note" tone="indigo" icon={<FileText className="h-4 w-4" />}>
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
