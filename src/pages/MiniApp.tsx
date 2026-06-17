import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ClipboardCopy,
  Droplet,
  FlaskConical,
  Heart,
  Info,
  ShieldAlert,
  Sparkles,
  User,
} from "lucide-react";
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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { calculatePrevent } from "@/lib/prevent";
import { useToast } from "@/hooks/use-toast";
import HypothyroidismCaveat from "@/components/calculator/HypothyroidismCaveat";

// ─── Types ─────────────────────────────────────────────────────────────────

type Sex = "male" | "female";
type CkdStage = "" | "3A" | "3B" | "4" | "5";

interface RangeField {
  value: string; // single value or low end
  high?: string; // optional upper bound
}

const blankRange: RangeField = { value: "", high: "" };

interface PatientState {
  name: string;
  mrn: string;
  age: string;
  sex: Sex;
}

interface MajorRiskState {
  ascvd: boolean;
  diabetes: boolean;
  diabetesTOD: boolean;
  htn: boolean;
  smoker: boolean;
  ckd: boolean;
  ckdStage: CkdStage;
  familyHx: boolean;
  southAsian: boolean;
}

interface LipidState {
  ldl: RangeField;
  hdl: RangeField;
  tg: RangeField;
  hba1c: RangeField;
  apoB: RangeField;
  lpa: RangeField;
  lpaUnit: "mg/dL" | "nmol/L";
}

interface EnhancerState {
  metsyn: boolean;
  inflammatory: boolean;
  prematureMenopause: boolean;
  preeclampsia: boolean;
  hsCRP: boolean;
  abi: boolean;
  subclinical: boolean;
}

interface VitalsState {
  sbp: RangeField;
  heightCm: string;
  weightKg: string;
  egfr: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const num = (v: string) => {
  const n = parseFloat(v);
  return isFinite(n) ? n : NaN;
};
const rangePair = (r: RangeField): [number, number] => {
  const lo = num(r.value);
  const hi = r.high && r.high !== "" ? num(r.high) : lo;
  return [lo, hi];
};
const rangeMid = (r: RangeField) => {
  const [lo, hi] = rangePair(r);
  if (!isFinite(lo)) return NaN;
  if (!isFinite(hi)) return lo;
  return (lo + hi) / 2;
};
const rangeMax = (r: RangeField) => {
  const [lo, hi] = rangePair(r);
  return Math.max(lo, hi);
};

const fmtRange = (r: RangeField, unit = "") => {
  if (!r.value) return "—";
  if (r.high && r.high !== "" && r.high !== r.value)
    return `${r.value}–${r.high}${unit ? " " + unit : ""}`;
  return `${r.value}${unit ? " " + unit : ""}`;
};

// ─── Reusable ──────────────────────────────────────────────────────────────

function RangeInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit: string;
  value: RangeField;
  onChange: (v: RangeField) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between mb-1">
        <span>{label}</span>
        <span className="text-[10px] uppercase tracking-wider opacity-70">{unit}</span>
      </label>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          inputMode="decimal"
          value={value.value}
          onChange={(e) => onChange({ ...value, value: e.target.value })}
          placeholder={placeholder ?? "value"}
          className="h-9 text-sm"
        />
        <span className="text-muted-foreground text-xs">–</span>
        <Input
          type="number"
          inputMode="decimal"
          value={value.high ?? ""}
          onChange={(e) => onChange({ ...value, high: e.target.value })}
          placeholder="upper"
          className="h-9 text-sm"
        />
      </div>
    </div>
  );
}

function SingleInput({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground flex items-center justify-between mb-1">
        <span>{label}</span>
        {unit && <span className="text-[10px] uppercase tracking-wider opacity-70">{unit}</span>}
      </label>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 text-sm"
      />
    </div>
  );
}

const RISK_EXPLANATIONS: Record<keyof MajorRiskState | string, string> = {
  ascvd:
    "Prior MI, ischemic stroke/TIA, stable/unstable angina, coronary or peripheral revascularization, PAD, or aortic aneurysm. These patients are automatically high-risk (secondary prevention) → high-intensity statin; LDL-C goal <55 mg/dL.",
  diabetes:
    "Type 1 or 2 diabetes ≥10 yr duration, age ≥40 yr, or with target-organ damage shifts patients into high-risk. Default LDL-C goal <70 mg/dL; <55 mg/dL with TOD or additional risk factors.",
  htn:
    "BP ≥130/80 or on antihypertensive therapy. Add SBP to the vitals panel for accurate PREVENT calculation.",
  smoker:
    "Current cigarette use (within ~30 days). Smoking cessation is the single most impactful lifestyle intervention.",
  ckd:
    "eGFR <60 mL/min/1.73m² and/or albuminuria. CKD is an independent ASCVD enhancer; stage 3B–5 ranks as high/very-high risk regardless of PREVENT score.",
  familyHx:
    "Premature ASCVD in first-degree relative — male <55 yr or female <65 yr. Counts as a risk-enhancing factor in borderline/intermediate risk.",
  southAsian:
    "Ethnicity-based enhancer (per LAI 2023). Lower BMI and ApoB thresholds apply; consider more aggressive LDL targets at borderline/intermediate risk.",
};

function RiskFactorRow({
  id,
  label,
  checked,
  onChange,
  explanation,
  children,
  autoBadge,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  explanation: string;
  children?: React.ReactNode;
  autoBadge?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-3 py-2">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(c) => onChange(!!c)}
        />
        <label htmlFor={id} className="flex-1 text-sm font-medium cursor-pointer select-none">
          {label}
        </label>
        {autoBadge && (
          <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-primary/15 text-primary">
            {autoBadge}
          </span>
        )}
        <button
          type="button"
          aria-label="More info"
          onClick={() => setOpen((o) => !o)}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
          {explanation}
        </div>
      )}
      {checked && children && (
        <div className="border-t border-border px-3 py-2.5 bg-muted/10">{children}</div>
      )}
    </div>
  );
}

function MiniSection({
  icon,
  title,
  children,
  tone = "primary",
  collapsible = false,
  defaultOpen = true,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "primary" | "rose" | "violet" | "emerald" | "amber";
  collapsible?: boolean;
  defaultOpen?: boolean;
  subtitle?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const TONE: Record<string, string> = {
    primary: "bg-primary/15 text-primary",
    rose: "bg-[hsl(346_77%_55%)/0.15] text-[hsl(346_77%_45%)]",
    violet: "bg-[hsl(262_70%_58%)/0.15] text-[hsl(262_70%_48%)]",
    emerald: "bg-emerald-500/15 text-emerald-600",
    amber: "bg-amber-500/15 text-amber-600",
  };
  const header = (
    <div className="flex items-center gap-2.5 px-4 py-3">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONE[tone]}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <h2 className="font-display text-sm font-bold leading-tight">{title}</h2>
        {subtitle && <p className="text-[11px] text-muted-foreground leading-snug">{subtitle}</p>}
      </div>
      {collapsible && (
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      )}
    </div>
  );
  return (
    <Card className="overflow-hidden shadow-sm">
      {collapsible ? (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="w-full text-left">{header}</CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 pt-1 border-t border-border bg-background/40">{children}</div>
          </CollapsibleContent>
        </Collapsible>
      ) : (
        <>
          {header}
          <div className="px-4 pb-4 pt-1 border-t border-border bg-background/40">{children}</div>
        </>
      )}
    </Card>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function MiniApp() {
  const { toast } = useToast();
  const [patient, setPatient] = useState<PatientState>({ name: "", mrn: "", age: "", sex: "male" });
  const [risk, setRisk] = useState<MajorRiskState>({
    ascvd: false, diabetes: false, diabetesTOD: false, htn: false,
    smoker: false, ckd: false, ckdStage: "", familyHx: false, southAsian: false,
  });
  const [lipid, setLipid] = useState<LipidState>({
    ldl: { ...blankRange }, hdl: { ...blankRange }, tg: { ...blankRange },
    hba1c: { ...blankRange }, apoB: { ...blankRange }, lpa: { ...blankRange },
    lpaUnit: "mg/dL",
  });
  const [enhancer, setEnhancer] = useState<EnhancerState>({
    metsyn: false, inflammatory: false, prematureMenopause: false,
    preeclampsia: false, hsCRP: false, abi: false, subclinical: false,
  });
  const [vitals, setVitals] = useState<VitalsState>({
    sbp: { ...blankRange }, heightCm: "", weightKg: "", egfr: "",
  });
  const [bpMed, setBpMed] = useState(false);
  const [onStatin, setOnStatin] = useState(false);

  // ─── Auto-detection ─────────────────────────────────────────────────────
  const auto = useMemo(() => {
    const ldlMax = rangeMax(lipid.ldl);
    const tgMax = rangeMax(lipid.tg);
    const apoBMax = rangeMax(lipid.apoB);
    const lpaMax = rangeMax(lipid.lpa);
    const lpaCutoff = lipid.lpaUnit === "nmol/L" ? 125 : 50;
    return {
      hyperchol: isFinite(ldlMax) && ldlMax >= 160,
      hyperTG: isFinite(tgMax) && tgMax >= 175,
      apoBHigh: isFinite(apoBMax) && apoBMax >= 130,
      lpaHigh: isFinite(lpaMax) && lpaMax >= lpaCutoff,
      ckdStaged: risk.ckd && !!risk.ckdStage,
    };
  }, [lipid, risk.ckd, risk.ckdStage]);

  // ─── Risk calc (PREVENT) ────────────────────────────────────────────────
  const calcRisk = (endpoint: "low" | "high") => {
    const pickRange = (r: RangeField) => {
      const [lo, hi] = rangePair(r);
      if (!isFinite(lo)) return NaN;
      if (!isFinite(hi)) return lo;
      return endpoint === "low" ? Math.min(lo, hi) : Math.max(lo, hi);
    };
    const age = num(patient.age);
    const ldl = pickRange(lipid.ldl);
    const hdl = pickRange(lipid.hdl);
    const tg = pickRange(lipid.tg);
    const sbp = pickRange(vitals.sbp);
    const h = num(vitals.heightCm);
    const w = num(vitals.weightKg);
    const bmi = isFinite(h) && isFinite(w) && h > 0 ? w / (h / 100) ** 2 : NaN;
    const tc = isFinite(ldl) && isFinite(hdl) && isFinite(tg) ? ldl + hdl + tg / 5 : NaN;
    const egfr = num(vitals.egfr);
    if (![age, sbp, tc, hdl, bmi, egfr].every(isFinite)) return null;
    return calculatePrevent({
      age, sex: patient.sex, sbp, bpMed,
      totalChol: tc, hdl, statin: onStatin,
      diabetes: risk.diabetes, smoking: risk.smoker, egfr, bmi,
    });
  };

  const riskLow = useMemo(() => calcRisk("low"), [patient, lipid, vitals, risk, bpMed, onStatin]);
  const riskHigh = useMemo(() => calcRisk("high"), [patient, lipid, vitals, risk, bpMed, onStatin]);

  // ─── Decision: category, LDL goal, therapy ──────────────────────────────
  const summary = useMemo(() => {
    const drivers: string[] = [];
    if (risk.ascvd) drivers.push("Established ASCVD");
    if (risk.diabetes) drivers.push(risk.diabetesTOD ? "Diabetes + TOD" : "Diabetes");
    if (risk.ckd && risk.ckdStage) drivers.push(`CKD stage ${risk.ckdStage}`);
    if (risk.smoker) drivers.push("Current smoker");
    if (risk.familyHx) drivers.push("FHx premature ASCVD");
    if (risk.southAsian) drivers.push("South Asian ethnicity");
    if (auto.hyperchol) drivers.push(`LDL-C ${fmtRange(lipid.ldl, "mg/dL")}`);
    if (auto.hyperTG) drivers.push(`TG ${fmtRange(lipid.tg, "mg/dL")}`);
    if (auto.apoBHigh) drivers.push(`ApoB ${fmtRange(lipid.apoB, "mg/dL")}`);
    if (auto.lpaHigh) drivers.push(`Lp(a) ${fmtRange(lipid.lpa, lipid.lpaUnit)}`);

    // Category override hierarchy
    let category: "Very High" | "High" | "Intermediate" | "Borderline" | "Low" | "Pending" = "Pending";
    let ldlGoal = "—";
    let therapy = "—";

    if (risk.ascvd) {
      category = "Very High";
      ldlGoal = "<55 mg/dL (1.4 mmol/L)";
      therapy = "High-intensity statin ± ezetimibe; add PCSK9i if LDL above goal";
    } else if (
      (risk.diabetes && risk.diabetesTOD) ||
      (risk.ckd && ["3B", "4", "5"].includes(risk.ckdStage)) ||
      auto.lpaHigh
    ) {
      category = "High";
      ldlGoal = "<70 mg/dL (1.8 mmol/L)";
      therapy = "High-intensity statin; add ezetimibe if LDL not at goal";
    } else if (riskHigh?.valid) {
      const cat = riskHigh.category;
      category = cat as any;
      if (cat === "High") {
        ldlGoal = "<70 mg/dL";
        therapy = "High-intensity statin";
      } else if (cat === "Intermediate") {
        ldlGoal = "<100 mg/dL (≥50% LDL reduction)";
        therapy = "Moderate→high intensity statin; consider CAC if uncertain";
      } else if (cat === "Borderline") {
        ldlGoal = "<130 mg/dL";
        therapy = "Lifestyle; consider statin if ≥1 enhancer or CAC ≥100";
      } else {
        ldlGoal = "<160 mg/dL (lifestyle)";
        therapy = "Lifestyle; pharmacotherapy not routinely indicated";
      }
    } else if (auto.hyperchol && num(patient.age) >= 20) {
      category = "Intermediate";
      ldlGoal = "<100 mg/dL";
      therapy = "Moderate-intensity statin (primary hypercholesterolemia)";
    }

    return { drivers, category, ldlGoal, therapy };
  }, [risk, auto, riskHigh, lipid, patient.age]);

  // ─── EMR Note ───────────────────────────────────────────────────────────
  const emrNote = useMemo(() => {
    const factors = [
      risk.ascvd && "Established ASCVD",
      risk.diabetes && (risk.diabetesTOD ? "Diabetes mellitus with target-organ damage" : "Diabetes mellitus"),
      risk.htn && "Hypertension",
      risk.smoker && "Current smoker",
      risk.ckd && `Chronic kidney disease${risk.ckdStage ? ` (stage ${risk.ckdStage})` : ""}`,
      risk.familyHx && "Family history of premature ASCVD",
      risk.southAsian && "South Asian ethnicity",
      enhancer.metsyn && "Metabolic syndrome",
      enhancer.inflammatory && "Chronic inflammatory disease",
      enhancer.prematureMenopause && "Premature menopause",
      enhancer.preeclampsia && "History of preeclampsia",
      enhancer.hsCRP && "hs-CRP >2 mg/L",
      enhancer.abi && "ABI <0.9",
      enhancer.subclinical && "Subclinical atherosclerosis (CAC/plaque)",
      auto.hyperchol && "Persistent primary hypercholesterolemia (LDL-C ≥160)",
      auto.hyperTG && "Persistent hypertriglyceridemia (TG ≥175)",
      auto.apoBHigh && "Elevated ApoB (≥130 mg/dL)",
      auto.lpaHigh && `Elevated Lp(a) (≥${lipid.lpaUnit === "nmol/L" ? "125 nmol/L" : "50 mg/dL"})`,
    ].filter(Boolean) as string[];

    const riskLine = riskLow && riskHigh && riskLow.valid && riskHigh.valid
      ? riskLow.riskPct === riskHigh.riskPct
        ? `${riskLow.riskPct}%`
        : `${riskLow.riskPct}%–${riskHigh.riskPct}%`
      : "Insufficient vitals for PREVENT calc";

    return [
      "ASCVD RISK ASSESSMENT",
      "",
      patient.name ? `Patient: ${patient.name}` : null,
      patient.mrn ? `MRN: ${patient.mrn}` : null,
      `Age: ${patient.age || "—"}`,
      `Sex: ${patient.sex}`,
      "",
      "Major Risk Factors / Enhancers:",
      factors.length ? factors.map((f) => `  • ${f}`).join("\n") : "  • None identified",
      "",
      "Lipid Profile:",
      `  LDL-C: ${fmtRange(lipid.ldl, "mg/dL")}`,
      `  HDL-C: ${fmtRange(lipid.hdl, "mg/dL")}`,
      `  TG:    ${fmtRange(lipid.tg, "mg/dL")}`,
      `  HbA1c: ${fmtRange(lipid.hba1c, "%")}`,
      lipid.apoB.value ? `  ApoB:  ${fmtRange(lipid.apoB, "mg/dL")}` : null,
      lipid.lpa.value ? `  Lp(a): ${fmtRange(lipid.lpa, lipid.lpaUnit)}` : null,
      "",
      `10-Year ASCVD Risk: ${riskLine}`,
      `Risk Category: ${summary.category}`,
      `LDL Goal: ${summary.ldlGoal}`,
      `Recommendation: ${summary.therapy}`,
    ].filter((l) => l !== null).join("\n");
  }, [patient, risk, lipid, enhancer, auto, summary, riskLow, riskHigh]);

  const copyEmr = async () => {
    await navigator.clipboard.writeText(emrNote);
    toast({ title: "EMR note copied", description: "Pasted-ready clinical summary." });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Sticky app bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[hsl(340_82%_52%)] text-white">
              <Heart className="h-4 w-4" />
            </span>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold">Lipid Risk Mini</p>
              <p className="text-[10px] text-muted-foreground">2026 ACC/AHA · LAI 2023</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={copyEmr} className="h-8 gap-1.5 text-xs">
            <ClipboardCopy className="h-3.5 w-3.5" /> EMR
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-md space-y-3 px-3 py-4 pb-32">
        {/* Section 1 — Patient */}
        <MiniSection icon={<User className="h-3.5 w-3.5" />} title="Patient Information" tone="primary">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Patient Name</label>
              <Input value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} className="h-9 text-sm" placeholder="Optional" />
            </div>
            <SingleInput label="Age" unit="yr" value={patient.age} onChange={(v) => setPatient({ ...patient, age: v })} placeholder="55" />
            <div>
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Sex</label>
              <Select value={patient.sex} onValueChange={(v: Sex) => setPatient({ ...patient, sex: v })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">MRN (optional)</label>
              <Input value={patient.mrn} onChange={(e) => setPatient({ ...patient, mrn: e.target.value })} className="h-9 text-sm" placeholder="e.g. 0012345" />
            </div>
          </div>
        </MiniSection>

        {/* Section 2 — Major Risk Factors */}
        <MiniSection icon={<ShieldAlert className="h-3.5 w-3.5" />} title="Major Risk Factors" tone="rose"
          subtitle="Tap the chevron for guideline rationale">
          <div className="space-y-2">
            <RiskFactorRow id="ascvd" label="Established ASCVD" checked={risk.ascvd}
              onChange={(v) => setRisk({ ...risk, ascvd: v })} explanation={RISK_EXPLANATIONS.ascvd} />
            <RiskFactorRow id="dm" label="Diabetes" checked={risk.diabetes}
              onChange={(v) => setRisk({ ...risk, diabetes: v, diabetesTOD: v ? risk.diabetesTOD : false })}
              explanation={RISK_EXPLANATIONS.diabetes}>
              <div className="flex items-center gap-2">
                <Checkbox id="tod" checked={risk.diabetesTOD} onCheckedChange={(c) => setRisk({ ...risk, diabetesTOD: !!c })} />
                <label htmlFor="tod" className="text-xs font-medium cursor-pointer">
                  Target-organ damage (retinopathy, nephropathy, neuropathy, or ASCVD)
                </label>
              </div>
            </RiskFactorRow>
            <RiskFactorRow id="htn" label="Hypertension" checked={risk.htn}
              onChange={(v) => setRisk({ ...risk, htn: v })} explanation={RISK_EXPLANATIONS.htn} />
            <RiskFactorRow id="smk" label="Current Smoker" checked={risk.smoker}
              onChange={(v) => setRisk({ ...risk, smoker: v })} explanation={RISK_EXPLANATIONS.smoker} />
            <RiskFactorRow id="ckd" label="Chronic Kidney Disease" checked={risk.ckd}
              onChange={(v) => setRisk({ ...risk, ckd: v, ckdStage: v ? risk.ckdStage : "" })}
              explanation={RISK_EXPLANATIONS.ckd}
              autoBadge={auto.ckdStaged ? `Stage ${risk.ckdStage}` : undefined}>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">CKD Stage</label>
                <Select value={risk.ckdStage} onValueChange={(v: CkdStage) => setRisk({ ...risk, ckdStage: v })}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select stage" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3A">Stage 3A (eGFR 45–59)</SelectItem>
                    <SelectItem value="3B">Stage 3B (eGFR 30–44)</SelectItem>
                    <SelectItem value="4">Stage 4 (eGFR 15–29)</SelectItem>
                    <SelectItem value="5">Stage 5 (eGFR &lt;15 / dialysis)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </RiskFactorRow>
            <RiskFactorRow id="fhx" label="Family History of Premature ASCVD" checked={risk.familyHx}
              onChange={(v) => setRisk({ ...risk, familyHx: v })} explanation={RISK_EXPLANATIONS.familyHx} />
            <RiskFactorRow id="sa" label="South Asian Ethnicity" checked={risk.southAsian}
              onChange={(v) => setRisk({ ...risk, southAsian: v })} explanation={RISK_EXPLANATIONS.southAsian} />
          </div>
        </MiniSection>

        {/* Section 3 — Lipid & Metabolic */}
        <MiniSection icon={<Droplet className="h-3.5 w-3.5" />} title="Lipid & Metabolic Data" tone="violet"
          subtitle="Enter a single value or a range">
          <div className="grid grid-cols-2 gap-2.5">
            <RangeInput label="LDL-C" unit="mg/dL" value={lipid.ldl} onChange={(v) => setLipid({ ...lipid, ldl: v })} placeholder="100" />
            <RangeInput label="HDL-C" unit="mg/dL" value={lipid.hdl} onChange={(v) => setLipid({ ...lipid, hdl: v })} placeholder="50" />
            <RangeInput label="Triglycerides" unit="mg/dL" value={lipid.tg} onChange={(v) => setLipid({ ...lipid, tg: v })} placeholder="150" />
            <RangeInput label="HbA1c" unit="%" value={lipid.hba1c} onChange={(v) => setLipid({ ...lipid, hba1c: v })} placeholder="5.7" />
          </div>

          <Collapsible className="mt-3">
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/30">
              <span className="flex items-center gap-1.5"><FlaskConical className="h-3.5 w-3.5" /> Advanced lipids (ApoB, Lp(a))</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <RangeInput label="ApoB" unit="mg/dL" value={lipid.apoB} onChange={(v) => setLipid({ ...lipid, apoB: v })} placeholder="80" />
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Lp(a)</label>
                    <div className="flex rounded-md border border-border bg-background/60 p-0.5">
                      {(["mg/dL", "nmol/L"] as const).map((u) => (
                        <button key={u} type="button" onClick={() => setLipid({ ...lipid, lpaUnit: u })}
                          className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${lipid.lpaUnit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                          {u}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Input type="number" value={lipid.lpa.value} onChange={(e) => setLipid({ ...lipid, lpa: { ...lipid.lpa, value: e.target.value } })} className="h-9 text-sm" placeholder="value" />
                    <span className="text-muted-foreground text-xs">–</span>
                    <Input type="number" value={lipid.lpa.high ?? ""} onChange={(e) => setLipid({ ...lipid, lpa: { ...lipid.lpa, high: e.target.value } })} className="h-9 text-sm" placeholder="upper" />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Auto-detected enhancers */}
          {(auto.hyperchol || auto.hyperTG || auto.apoBHigh || auto.lpaHigh) && (
            <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-2.5">
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Auto-detected
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-foreground">
                {auto.hyperchol && <li>• Persistent primary hypercholesterolemia (LDL-C ≥160)</li>}
                {auto.hyperTG && <li>• Persistent hypertriglyceridemia (TG ≥175)</li>}
                {auto.apoBHigh && <li>• Elevated ApoB (≥130 mg/dL) — risk enhancer</li>}
                {auto.lpaHigh && <li>• Elevated Lp(a) — risk enhancer</li>}
              </ul>
            </div>
          )}
        </MiniSection>

        {/* Section 4 — Advanced enhancers */}
        <MiniSection icon={<AlertTriangle className="h-3.5 w-3.5" />} title="Advanced Risk Enhancers" tone="amber"
          collapsible defaultOpen={false}>
          <div className="space-y-2">
            {[
              ["metsyn", "Metabolic Syndrome"],
              ["inflammatory", "Chronic Inflammatory Disease"],
              ["prematureMenopause", "Premature Menopause"],
              ["preeclampsia", "History of Preeclampsia"],
              ["hsCRP", "hs-CRP >2 mg/L"],
              ["abi", "ABI <0.9"],
              ["subclinical", "Subclinical Atherosclerosis (CAC/Plaque)"],
            ].map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-muted/30">
                <Checkbox checked={(enhancer as any)[k]} onCheckedChange={(c) => setEnhancer({ ...enhancer, [k]: !!c } as EnhancerState)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </MiniSection>

        {/* Vitals (for PREVENT) */}
        <MiniSection icon={<Activity className="h-3.5 w-3.5" />} title="Vitals for Risk Calculation" tone="emerald"
          collapsible defaultOpen={false}
          subtitle="Required for 10-year PREVENT risk score">
          <div className="grid grid-cols-2 gap-2.5">
            <RangeInput label="Systolic BP" unit="mmHg" value={vitals.sbp} onChange={(v) => setVitals({ ...vitals, sbp: v })} placeholder="130" />
            <SingleInput label="eGFR" unit="mL/min/1.73m²" value={vitals.egfr} onChange={(v) => setVitals({ ...vitals, egfr: v })} placeholder="90" />
            <SingleInput label="Height" unit="cm" value={vitals.heightCm} onChange={(v) => setVitals({ ...vitals, heightCm: v })} placeholder="170" />
            <SingleInput label="Weight" unit="kg" value={vitals.weightKg} onChange={(v) => setVitals({ ...vitals, weightKg: v })} placeholder="75" />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            <label className="flex items-center gap-1.5">
              <Checkbox checked={bpMed} onCheckedChange={(c) => setBpMed(!!c)} /> On BP medication
            </label>
            <label className="flex items-center gap-1.5">
              <Checkbox checked={onStatin} onCheckedChange={(c) => setOnStatin(!!c)} /> On statin
            </label>
          </div>
        </MiniSection>

        {/* Risk Summary */}
        <Card className="overflow-hidden border-2 border-primary/40 bg-gradient-to-br from-primary/[0.06] to-background shadow-md">
          <div className="px-4 py-3 border-b border-border bg-primary/10 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Heart className="h-3.5 w-3.5" />
            </span>
            <h2 className="font-display text-sm font-bold text-primary">Risk Summary</h2>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">10-Yr ASCVD</p>
                <p className="font-display text-2xl font-bold text-primary leading-tight">
                  {riskLow && riskHigh && riskLow.valid && riskHigh.valid
                    ? riskLow.riskPct === riskHigh.riskPct
                      ? `${riskLow.riskPct}%`
                      : `${riskLow.riskPct}–${riskHigh.riskPct}%`
                    : "—"}
                </p>
                {!riskLow?.valid && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Info className="h-2.5 w-2.5" /> Complete vitals to calculate
                  </p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Category</p>
                <p className="font-display text-base font-bold leading-tight">{summary.category}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">LDL Goal</p>
                <p className="text-sm font-semibold">{summary.ldlGoal}</p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recommended Therapy</p>
                <p className="text-sm">{summary.therapy}</p>
              </div>
              {summary.drivers.length > 0 && (
                <div className="col-span-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Key Drivers</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summary.drivers.map((d) => (
                      <span key={d} className="rounded-full bg-primary/12 text-primary text-[11px] font-semibold px-2 py-0.5">{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button onClick={copyEmr} className="w-full gap-2 mt-2">
              <ClipboardCopy className="h-4 w-4" /> Copy EMR Note
            </Button>
          </div>
        </Card>

        <HypothyroidismCaveat />

        <p className="text-[10px] text-center text-muted-foreground px-2 pt-2">
          Based on 2026 ACC/AHA Dyslipidemia Guideline & LAI 2023 Consensus Statement IV.
          For clinical decision support — verify with current guidelines and judgment.
        </p>
      </main>
    </div>
  );
}
