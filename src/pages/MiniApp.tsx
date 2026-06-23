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
import { HypothyroidismCaveat } from "@/components/calculator/HypothyroidismCaveat";

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
  polyvascular: boolean;
  recurrentAscvd: boolean;
  subclinical: boolean;       // ASCVD-equivalent (LAI 2023 — South Asians)
  heFH: boolean;              // Heterozygous FH
  hoFH: boolean;              // Homozygous FH
  cacScore: string;           // Agatston score (AU)
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
  nafld: boolean;
  sleepApnea: boolean;
  pcos: boolean;
  highPRS: boolean;
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

const RISK_EXPLANATIONS: Record<string, string> = {
  ascvd:
    "Prior MI, ischemic stroke/TIA, stable/unstable angina, coronary or peripheral revascularization, PAD, or aortic aneurysm. Secondary prevention → high-intensity statin; LDL-C goal <55 mg/dL.",
  polyvascular:
    "Atherosclerotic disease in ≥2 vascular beds (coronary + carotid/cerebrovascular + peripheral/aortic). Confers extreme-risk status — LDL-C goal ≤40 mg/dL with high-intensity statin + ezetimibe ± PCSK9i.",
  recurrentAscvd:
    "Recurrent ASCVD event despite LDL-C ≤30 mg/dL on maximally tolerated therapy = extreme residual risk. Evaluate Lp(a), inflammation (hs-CRP), adherence, and consider adding PCSK9i, bempedoic acid, or inclisiran.",
  diabetes:
    "Type 1 or 2 diabetes ≥10 yr duration, age ≥40 yr, or with target-organ damage → high risk. Default LDL-C <70 mg/dL; <55 mg/dL with TOD or extra risk factors.",
  htn:
    "BP ≥130/80 or on antihypertensive therapy. Enter SBP in vitals for accurate PREVENT calculation.",
  smoker:
    "Current cigarette use within ~30 days. Cessation is the single most impactful lifestyle intervention.",
  ckd:
    "eGFR <60 mL/min/1.73m² and/or albuminuria. Independent ASCVD enhancer; stage 3B–5 ranks as high/very-high risk regardless of PREVENT.",
  familyHx:
    "Premature ASCVD in first-degree relative — male <55 yr or female <65 yr. Risk-enhancing factor in borderline/intermediate risk.",
  southAsian:
    "Ethnicity-based enhancer (per LAI 2023). Lower BMI/ApoB thresholds; consider more aggressive LDL-C targets at borderline/intermediate risk.",
};

interface Criterion {
  id: string;
  label: string;
  qualifier: string;
}

const CRITERIA: Record<string, Criterion[]> = {
  ascvd: [
    { id: "as_cad", label: "CAD / Coronary ASCVD", qualifier: "Prior MI, angina requiring revascularization, or angiographic stenosis ≥50%" },
    { id: "as_stroke", label: "Ischemic stroke or TIA", qualifier: "Imaging-confirmed ischemic stroke or TIA with neurovascular evidence of atherosclerosis" },
    { id: "as_pad", label: "Peripheral arterial disease", qualifier: "ABI <0.9, claudication with imaging, or prior peripheral revascularization" },
    { id: "as_aaa", label: "Abdominal aortic aneurysm", qualifier: "AAA ≥3 cm by ultrasound or CT — atherosclerotic in origin" },
  ],
  polyvascular: [
    { id: "pv_coro_carot", label: "Coronary + carotid disease", qualifier: "CAD plus carotid stenosis ≥50% or prior carotid revascularization" },
    { id: "pv_coro_pad", label: "Coronary + PAD", qualifier: "CAD plus ABI <0.9, claudication, or prior peripheral revascularization" },
    { id: "pv_carot_pad", label: "Carotid + PAD", qualifier: "Carotid stenosis ≥50% plus PAD in lower extremities" },
    { id: "pv_three", label: "≥3 vascular beds involved", qualifier: "Coronary + carotid + peripheral/aortic — extreme atherosclerotic burden" },
  ],
  recurrentAscvd: [
    { id: "rec_event", label: "Recurrent MI / stroke / revascularization", qualifier: "New event despite maximally tolerated statin therapy" },
    { id: "rec_ldl30", label: "LDL-C ≤30 mg/dL on therapy", qualifier: "Persistent residual risk despite aggressive LDL reduction — pursue Lp(a) and inflammation pathways" },
    { id: "rec_lpa", label: "Elevated Lp(a) contributing", qualifier: "Lp(a) ≥50 mg/dL or ≥125 nmol/L as residual driver" },
    { id: "rec_inflam", label: "Residual inflammatory risk", qualifier: "hs-CRP ≥2 mg/L despite LDL goal — consider colchicine or anti-inflammatory strategies" },
  ],
  diabetes: [
    { id: "dm_duration", label: "Duration ≥10 years", qualifier: "Long-standing diabetes confers higher ASCVD risk independent of glycemic control" },
    { id: "dm_age40", label: "Age ≥40 with diabetes", qualifier: "Threshold for moderate–high intensity statin in primary prevention" },
    { id: "dm_retinopathy", label: "Retinopathy", qualifier: "Microaneurysms, hemorrhages, or macular edema on fundoscopy" },
    { id: "dm_nephropathy", label: "Nephropathy / albuminuria", qualifier: "UACR ≥30 mg/g or reduced eGFR" },
    { id: "dm_neuropathy", label: "Neuropathy", qualifier: "Distal symmetric polyneuropathy or autonomic neuropathy" },
  ],
  htn: [
    { id: "htn_stage1", label: "Stage 1: 130–139 / 80–89", qualifier: "Lifestyle ± pharmacotherapy if ASCVD risk ≥10%" },
    { id: "htn_stage2", label: "Stage 2: ≥140 / ≥90", qualifier: "Pharmacotherapy indicated alongside lifestyle" },
    { id: "htn_crisis", label: "Hypertensive urgency/emergency ≥180/120", qualifier: "Immediate evaluation and BP reduction" },
    { id: "htn_meds", label: "On antihypertensive medication", qualifier: "Counts as hypertension regardless of current reading" },
  ],
  smoker: [
    { id: "sm_current", label: "Current daily smoker", qualifier: "Use within the past 30 days" },
    { id: "sm_heavy", label: "Heavy use (>1 pack/day)", qualifier: "Extreme risk-factor per LAI 2023" },
    { id: "sm_former", label: "Former smoker (<1 year cessation)", qualifier: "Residual elevated risk during first year off tobacco" },
    { id: "sm_vape", label: "E-cigarette / vaping use", qualifier: "Emerging cardiovascular risk — counsel cessation" },
  ],
  ckd: [
    { id: "ckd_3a", label: "Stage 3A: eGFR 45–59", qualifier: "Mildly–moderately decreased kidney function" },
    { id: "ckd_3b", label: "Stage 3B: eGFR 30–44", qualifier: "Moderately–severely decreased — high ASCVD risk" },
    { id: "ckd_4", label: "Stage 4: eGFR 15–29", qualifier: "Severely decreased — very-high ASCVD risk" },
    { id: "ckd_alb", label: "Albuminuria UACR ≥30 mg/g", qualifier: "Independent ASCVD risk marker" },
  ],
  familyHx: [
    { id: "fhx_male", label: "Male 1st-degree relative <55 y", qualifier: "Father, brother, or son with MI, revascularization, or angina before 55" },
    { id: "fhx_female", label: "Female 1st-degree relative <65 y", qualifier: "Mother, sister, or daughter with MI, revascularization, or angina before 65" },
    { id: "fhx_sudden", label: "Sudden cardiac death in family", qualifier: "Premature SCD in 1st-degree relative — pursue lipid/genetic workup" },
  ],
  southAsian: [
    { id: "sa_origin", label: "Indian / Pakistani / Bangladeshi / Sri Lankan origin", qualifier: "Higher ASCVD risk at lower BMI and ApoB thresholds" },
    { id: "sa_bmi", label: "Asian-specific BMI cutoffs apply", qualifier: "Overweight ≥23, Obesity ≥27.5 kg/m² (WHO Asia-Pacific)" },
    { id: "sa_waist", label: "Increased waist circumference", qualifier: ">90 cm men, >80 cm women (South Asian-specific)" },
  ],
  // Advanced enhancers
  metsyn: [
    { id: "ms_waist", label: "↑ Waist circumference", qualifier: ">102 cm men, >88 cm women (>90/>80 South Asian)" },
    { id: "ms_tg", label: "TG ≥150 mg/dL", qualifier: "Or on TG-lowering therapy" },
    { id: "ms_hdl", label: "Low HDL-C", qualifier: "<40 mg/dL men, <50 mg/dL women" },
    { id: "ms_bp", label: "BP ≥130/85 or on antihypertensives", qualifier: "Hypertension component" },
    { id: "ms_glu", label: "Fasting glucose ≥100 mg/dL", qualifier: "Impaired fasting glucose or diabetes" },
  ],
  inflammatory: [
    { id: "in_ra", label: "Rheumatoid arthritis", qualifier: "Doubles ASCVD risk; treat inflammation aggressively" },
    { id: "in_psoriasis", label: "Psoriasis / psoriatic arthritis", qualifier: "Severe disease confers higher ASCVD risk" },
    { id: "in_lupus", label: "Systemic lupus erythematosus", qualifier: "Markedly elevated cardiovascular risk" },
    { id: "in_hiv", label: "HIV infection", qualifier: "Chronic inflammation + ART-related dyslipidemia" },
    { id: "in_ibd", label: "Inflammatory bowel disease", qualifier: "Moderate cardiovascular risk increase" },
  ],
  prematureMenopause: [
    { id: "pm_natural", label: "Natural menopause before age 40", qualifier: "Premature ovarian insufficiency increases ASCVD risk" },
    { id: "pm_surgical", label: "Surgical menopause before age 45", qualifier: "Bilateral oophorectomy without HRT" },
    { id: "pm_chemo", label: "Iatrogenic (chemo/radiation)", qualifier: "Treatment-induced ovarian failure" },
  ],
  preeclampsia: [
    { id: "pe_severe", label: "Severe preeclampsia / eclampsia", qualifier: "Doubles long-term ASCVD risk" },
    { id: "pe_recurrent", label: "Recurrent preeclampsia", qualifier: ">1 affected pregnancy — higher residual risk" },
    { id: "pe_gdm", label: "Gestational diabetes", qualifier: "Increases diabetes and ASCVD risk later in life" },
    { id: "pe_ghtn", label: "Pregnancy-induced hypertension", qualifier: "Predicts future hypertension and ASCVD" },
  ],
  hsCRP: [
    { id: "cr_mild", label: "hs-CRP 2–10 mg/L", qualifier: "Vascular inflammation — risk-enhancing factor" },
    { id: "cr_high", label: "hs-CRP >10 mg/L (persistent)", qualifier: "Rule out infection; if chronic, consider anti-inflammatory strategy" },
  ],
  abi: [
    { id: "abi_low", label: "ABI <0.9", qualifier: "Peripheral atherosclerosis — risk-enhancing factor" },
    { id: "abi_vlow", label: "ABI ≤0.7 or rest pain", qualifier: "Severe PAD — vascular referral" },
    { id: "abi_high", label: "ABI >1.4", qualifier: "Non-compressible arteries (often diabetes/CKD) — use toe-brachial index" },
  ],
  subclinical: [
    { id: "sc_cac1_99", label: "CAC 1–99 AU", qualifier: "Mild plaque burden — moderate-intensity statin reasonable" },
    { id: "sc_cac100", label: "CAC ≥100 AU or ≥75th %ile", qualifier: "Significant atherosclerosis — initiate statin" },
    { id: "sc_cimt", label: "Elevated carotid IMT (>75th %ile)", qualifier: "Subclinical atherosclerosis marker" },
    { id: "sc_plaque", label: "Carotid or femoral plaque", qualifier: "Focal wall thickening ≥1.5 mm on ultrasound" },
  ],
  nafld: [
    { id: "nf_steatosis", label: "Hepatic steatosis on imaging", qualifier: "Bright liver on US or ≥5% steatosis on MRI-PDFF" },
    { id: "nf_fib2", label: "Fibrosis stage F2", qualifier: "Significant fibrosis (FIB-4 or transient elastography)" },
    { id: "nf_fib34", label: "Advanced fibrosis F3–F4", qualifier: "High ASCVD and liver morbidity risk" },
  ],
  sleepApnea: [
    { id: "sa_mild", label: "Mild OSA (AHI 5–14)", qualifier: "Lifestyle interventions; consider CPAP if symptomatic" },
    { id: "sa_modsev", label: "Moderate–severe OSA (AHI ≥15)", qualifier: "CPAP indicated; independent ASCVD risk factor" },
  ],
  pcos: [
    { id: "pc_oligo", label: "Oligo-/anovulation", qualifier: "Cycles >35 days or <8/year" },
    { id: "pc_hyper", label: "Hyperandrogenism", qualifier: "Clinical (hirsutism/acne) or biochemical (↑testosterone)" },
    { id: "pc_morph", label: "Polycystic ovarian morphology / ↑ AMH", qualifier: "≥20 follicles per ovary or AMH >3.2 ng/mL" },
    { id: "pc_ir", label: "Insulin resistance / HOMA-IR >2.5", qualifier: "Common metabolic accompaniment — increases ASCVD risk" },
  ],
  highPRS: [
    { id: "pr_score", label: "High polygenic risk score for CAD", qualifier: "Top decile PRS — confers ≈2-fold ASCVD risk" },
    { id: "pr_fh", label: "Pathogenic FH variant (LDLR/APOB/PCSK9)", qualifier: "Monogenic familial hypercholesterolemia" },
  ],
};

function CriteriaList({
  items,
  details,
  onToggle,
}: {
  items: Criterion[];
  details: Record<string, boolean>;
  onToggle: (id: string, v: boolean) => void;
}) {
  return (
    <ul className="space-y-1.5">
      {items.map((c) => (
        <li key={c.id} className="flex gap-2 rounded-md border border-border/60 bg-background/60 px-2.5 py-2">
          <Checkbox
            id={c.id}
            checked={!!details[c.id]}
            onCheckedChange={(v) => onToggle(c.id, !!v)}
            className="mt-0.5"
          />
          <label htmlFor={c.id} className="flex-1 text-xs cursor-pointer leading-snug">
            <span className="font-semibold text-foreground">{c.label}</span>
            <span className="block text-[11px] text-muted-foreground mt-0.5">{c.qualifier}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function RiskFactorRow({
  id,
  label,
  checked,
  onChange,
  explanation,
  criteria,
  details,
  onToggleDetail,
  children,
  autoBadge,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  explanation: string;
  criteria?: Criterion[];
  details?: Record<string, boolean>;
  onToggleDetail?: (id: string, v: boolean) => void;
  children?: React.ReactNode;
  autoBadge?: string;
}) {
  const [open, setOpen] = useState(false);
  const selectedCount = criteria && details
    ? criteria.filter((c) => details[c.id]).length
    : 0;
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
        {selectedCount > 0 && (
          <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-muted text-foreground">
            {selectedCount}
          </span>
        )}
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
        <div className="border-t border-border bg-muted/30 px-3 py-2.5 space-y-2.5">
          <p className="text-xs text-muted-foreground leading-relaxed">{explanation}</p>
          {criteria && details && onToggleDetail && (
            <CriteriaList items={criteria} details={details} onToggle={onToggleDetail} />
          )}
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
    ascvd: false, polyvascular: false, recurrentAscvd: false,
    subclinical: false, heFH: false, hoFH: false, cacScore: "",
    diabetes: false, diabetesTOD: false, htn: false,
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
    nafld: false, sleepApnea: false, pcos: false, highPRS: false,
  });
  const [details, setDetails] = useState<Record<string, boolean>>({});
  const toggleDetail = (id: string, v: boolean) =>
    setDetails((d) => ({ ...d, [id]: v }));
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
    if (risk.recurrentAscvd) drivers.push("Recurrent ASCVD on therapy");
    if (risk.polyvascular) drivers.push("Polyvascular disease");
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

    // Category hierarchy — LAI 2023 (Lipid Association of India)
    // Tiers: Low / Moderate / High / Very High / Extreme
    // LDL-C goals: <100 / <70 / <55 / <50 / ≤30 mg/dL
    let category: "Extreme" | "Very High" | "High" | "Moderate" | "Low" | "Pending" = "Pending";
    let ldlGoal = "—";
    let therapy = "—";

    // Count classical major risk factors (excludes ASCVD/DM/CKD which trigger higher tiers directly)
    const majorCount = [
      risk.htn,
      risk.smoker,
      risk.familyHx,
      auto.hyperchol,                                    // LDL ≥160
      auto.lpaHigh,                                      // Lp(a) high
      risk.southAsian,                                   // ethnicity enhancer (LAI 2023)
    ].filter(Boolean).length;

    if (risk.recurrentAscvd || risk.polyvascular) {
      // Extreme Risk Group (LAI 2023): polyvascular disease, recurrent ASCVD on therapy, FH + ASCVD, DM + ASCVD
      category = "Extreme";
      ldlGoal = "≤30 mg/dL (0.8 mmol/L); non-HDL-C <60";
      therapy = "Max-intensity statin + ezetimibe + PCSK9i (or inclisiran / bempedoic acid); address Lp(a) & inflammation";
    } else if (
      risk.ascvd ||
      (risk.diabetes && risk.diabetesTOD) ||
      (risk.ckd && ["4", "5"].includes(risk.ckdStage))
    ) {
      // Very High Risk (LAI 2023): established ASCVD, DM with TOD, CKD stage 4–5
      category = "Very High";
      ldlGoal = "<50 mg/dL (1.3 mmol/L); non-HDL-C <80";
      therapy = "High-intensity statin + ezetimibe; add PCSK9i if LDL above goal";
    } else if (
      risk.diabetes ||
      (risk.ckd && ["3A", "3B"].includes(risk.ckdStage)) ||
      majorCount >= 3 ||
      (riskHigh?.valid && riskHigh.category === "High")
    ) {
      // High Risk (LAI 2023): DM without TOD, CKD 3A–3B, ≥3 major RFs, 10-y risk ≥20%
      category = "High";
      ldlGoal = "<55 mg/dL (1.4 mmol/L); non-HDL-C <85";
      therapy = "High-intensity statin; add ezetimibe if LDL not at goal";
    } else if (
      majorCount === 2 ||
      (riskHigh?.valid && riskHigh.category === "Intermediate")
    ) {
      // Moderate Risk (LAI 2023): 2 major RFs, or 10-y risk 7.5–<20%
      category = "Moderate";
      ldlGoal = "<70 mg/dL (1.8 mmol/L); non-HDL-C <100";
      therapy = "Moderate→high-intensity statin; consider CAC if uncertain";
    } else if (
      majorCount <= 1 ||
      (riskHigh?.valid && (riskHigh.category === "Borderline" || riskHigh.category === "Low"))
    ) {
      // Low Risk (LAI 2023): 0–1 major RF and 10-y risk <7.5%
      category = "Low";
      ldlGoal = "<100 mg/dL (2.6 mmol/L); non-HDL-C <130";
      therapy = "Lifestyle; pharmacotherapy if CAC ≥100 or risk enhancer present";
    }

    return { drivers, category, ldlGoal, therapy };
  }, [risk, auto, riskHigh, lipid, patient.age]);

  // ─── EMR Note ───────────────────────────────────────────────────────────
  const emrNote = useMemo(() => {
    const factors = [
      risk.recurrentAscvd && "Recurrent ASCVD despite LDL-C ≤30 on therapy",
      risk.polyvascular && "Polyvascular atherosclerotic disease",
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
              onChange={(v) => setRisk({ ...risk, ascvd: v })}
              explanation={RISK_EXPLANATIONS.ascvd}
              criteria={CRITERIA.ascvd} details={details} onToggleDetail={toggleDetail} />
            <RiskFactorRow id="polyvascular" label="Polyvascular Disease" checked={risk.polyvascular}
              onChange={(v) => setRisk({ ...risk, polyvascular: v })}
              explanation={RISK_EXPLANATIONS.polyvascular}
              criteria={CRITERIA.polyvascular} details={details} onToggleDetail={toggleDetail} />
            <RiskFactorRow id="recurrentAscvd" label="Recurrent ASCVD (LDL ≤30 mg/dL on therapy)" checked={risk.recurrentAscvd}
              onChange={(v) => setRisk({ ...risk, recurrentAscvd: v })}
              explanation={RISK_EXPLANATIONS.recurrentAscvd}
              criteria={CRITERIA.recurrentAscvd} details={details} onToggleDetail={toggleDetail} />
            <RiskFactorRow id="dm" label="Diabetes" checked={risk.diabetes}
              onChange={(v) => setRisk({ ...risk, diabetes: v, diabetesTOD: v ? risk.diabetesTOD : false })}
              explanation={RISK_EXPLANATIONS.diabetes}
              criteria={CRITERIA.diabetes} details={details} onToggleDetail={toggleDetail}>
              <div className="flex items-center gap-2">
                <Checkbox id="tod" checked={risk.diabetesTOD} onCheckedChange={(c) => setRisk({ ...risk, diabetesTOD: !!c })} />
                <label htmlFor="tod" className="text-xs font-medium cursor-pointer">
                  Target-organ damage (retinopathy, nephropathy, neuropathy, or ASCVD)
                </label>
              </div>
            </RiskFactorRow>
            <RiskFactorRow id="htn" label="Hypertension" checked={risk.htn}
              onChange={(v) => setRisk({ ...risk, htn: v })}
              explanation={RISK_EXPLANATIONS.htn}
              criteria={CRITERIA.htn} details={details} onToggleDetail={toggleDetail} />
            <RiskFactorRow id="smk" label="Current Smoker" checked={risk.smoker}
              onChange={(v) => setRisk({ ...risk, smoker: v })}
              explanation={RISK_EXPLANATIONS.smoker}
              criteria={CRITERIA.smoker} details={details} onToggleDetail={toggleDetail} />
            <RiskFactorRow id="ckd" label="Chronic Kidney Disease" checked={risk.ckd}
              onChange={(v) => setRisk({ ...risk, ckd: v, ckdStage: v ? risk.ckdStage : "" })}
              explanation={RISK_EXPLANATIONS.ckd}
              criteria={CRITERIA.ckd} details={details} onToggleDetail={toggleDetail}
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
              onChange={(v) => setRisk({ ...risk, familyHx: v })}
              explanation={RISK_EXPLANATIONS.familyHx}
              criteria={CRITERIA.familyHx} details={details} onToggleDetail={toggleDetail} />
            <RiskFactorRow id="sa" label="South Asian Ethnicity" checked={risk.southAsian}
              onChange={(v) => setRisk({ ...risk, southAsian: v })}
              explanation={RISK_EXPLANATIONS.southAsian}
              criteria={CRITERIA.southAsian} details={details} onToggleDetail={toggleDetail} />
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
            {([
              ["metsyn", "Metabolic Syndrome", "Cluster of ≥3: abdominal obesity, ↑TG, ↓HDL, ↑BP, ↑fasting glucose. Multiplies ASCVD risk."],
              ["inflammatory", "Chronic Inflammatory Disease", "RA, psoriasis, lupus, IBD, or HIV — chronic systemic inflammation accelerates atherosclerosis."],
              ["prematureMenopause", "Premature Menopause", "Menopause before age 40 (natural) or 45 (surgical) — loss of estrogen protection."],
              ["preeclampsia", "Adverse Pregnancy Outcome", "Preeclampsia, GDM, or pregnancy-induced hypertension — long-term ASCVD risk."],
              ["hsCRP", "Elevated hs-CRP", "≥2 mg/L marks vascular inflammation — risk-enhancing factor in primary prevention."],
              ["abi", "Abnormal ABI", "Ankle-brachial index <0.9 (PAD) or >1.4 (non-compressible) — vascular disease marker."],
              ["subclinical", "Subclinical Atherosclerosis", "CAC ≥100 AU, carotid plaque, or elevated CIMT on imaging — direct evidence of plaque."],
              ["nafld", "NAFLD / MASLD with fibrosis", "Hepatic steatosis with significant fibrosis — independent ASCVD risk factor."],
              ["sleepApnea", "Obstructive Sleep Apnea", "AHI ≥5 — moderate-severe disease (AHI ≥15) independently raises CVD risk."],
              ["pcos", "Polycystic Ovary Syndrome", "Hyperandrogenism + ovulatory dysfunction ± insulin resistance — early ASCVD risk."],
              ["highPRS", "High Polygenic Risk / Monogenic FH", "Top-decile PRS for CAD or pathogenic FH variant — genetic ASCVD predisposition."],
            ] as const).map(([k, label, expl]) => (
              <RiskFactorRow
                key={k}
                id={`enh-${k}`}
                label={label}
                checked={(enhancer as any)[k]}
                onChange={(v) => setEnhancer({ ...enhancer, [k]: v } as EnhancerState)}
                explanation={expl}
                criteria={CRITERIA[k]}
                details={details}
                onToggleDetail={toggleDetail}
              />
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
