import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Heart, AlertTriangle, ShieldCheck, RotateCcw, Activity, Printer, Target, Copy, ClipboardCheck } from "lucide-react";
import PrimaryPrevention from "@/components/calculator/PrimaryPrevention";
import ClinicalGuidance from "@/components/calculator/ClinicalGuidance";
import EducationSection from "@/components/calculator/EducationSection";

type TabKey = "calculator" | "primary" | "flowchart" | "education";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "calculator", label: "Risk Calculator", icon: <Target className="h-3.5 w-3.5" /> },
  { key: "primary", label: "Primary Prevention", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: "flowchart", label: "Flowchart", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "education", label: "Education", icon: <Heart className="h-3.5 w-3.5" /> },
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
  "ascvd", "cad", "stroke", "pad", "polyvascular",
  "tod", "fh", "hofh", "subclinical", "ckd34",
  "recurrent50", "acs12", "sequelae30",
] as const;

const MODIFIER_LABELS: Record<string, string> = {
  ascvd: "Established ASCVD",
  cad: "CAD / coronary ASCVD",
  stroke: "Ischemic stroke or TIA of atherosclerotic origin",
  pad: "PAD",
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

  // ─── Risk factors (auto-derived where possible) ───
  const [rfChecked, setRfChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(MAJOR_RF_KEYS.map((k) => [k, false]))
  );
  // ─── Modifiers ───
  const [modChecked, setModChecked] = useState<Record<string, boolean>>(
    Object.fromEntries(MODIFIER_KEYS.map((k) => [k, false]))
  );

  const [copied, setCopied] = useState(false);

  // ─── Auto-derive age risk ───
  useEffect(() => {
    const a = parseFloat(age);
    if (isNaN(a)) return;
    const hit = (sex === "male" && a >= 45) || (sex === "female" && a >= 55);
    setRfChecked((prev) => (prev.ageRisk === hit ? prev : { ...prev, ageRisk: hit }));
  }, [age, sex]);

  // ─── Auto-calculate eGFR from creatinine (CKD-EPI 2021) ───
  useEffect(() => {
    const cr = parseFloat(creatinine);
    const a = parseFloat(age);
    if (isNaN(cr) || cr <= 0 || isNaN(a) || a <= 0) {
      setEgfrAuto(false);
      return;
    }
    // CKD-EPI 2021 (race-free)
    const kappa = sex === "female" ? 0.7 : 0.9;
    const alpha = sex === "female" ? -0.241 : -0.302;
    const sexMultiplier = sex === "female" ? 1.012 : 1.0;
    const minRatio = Math.min(cr / kappa, 1);
    const maxRatio = Math.max(cr / kappa, 1);
    const calculated = 142 * Math.pow(minRatio, alpha) * Math.pow(maxRatio, -1.200) * Math.pow(0.9938, a) * sexMultiplier;
    setEgfr(Math.round(calculated).toString());
    setEgfrAuto(true);
  }, [creatinine, age, sex]);

  // ─── Auto-derive CKD from eGFR ───
  useEffect(() => {
    const v = parseFloat(egfr);
    if (isNaN(v)) return;
    setRfChecked((prev) => {
      const val = v < 60;
      return prev.ckd === val ? prev : { ...prev, ckd: val };
    });
  }, [egfr]);

  // ─── Auto-derive DM from HbA1c ───
  useEffect(() => {
    const v = parseFloat(hba1c);
    if (!isNaN(v) && v > 7) {
      setRfChecked((prev) => (prev.dm ? prev : { ...prev, dm: true }));
    }
  }, [hba1c]);

  // ─── Auto-derive low HDL from HDL-C and sex ───
  useEffect(() => {
    const v = parseFloat(hdl);
    if (isNaN(v)) return;
    const isLow = sex === "male" ? v < 40 : v < 50;
    setRfChecked((prev) => (prev.lowhdl === isLow ? prev : { ...prev, lowhdl: isLow }));
  }, [hdl, sex]);

  const rfCount = Object.values(rfChecked).filter(Boolean).length;

  const toggleRf = (key: string) =>
    setRfChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  const toggleMod = (key: string) =>
    setModChecked((prev) => ({ ...prev, [key]: !prev[key] }));

  // ─── Classification logic: C → B → A → VHR ───
  const classify = useCallback((): CategoryResult | null => {
    const v = modChecked;
    const ldlVal = parseFloat(ldl);
    const lpaVal = parseFloat(lpa);
    const rf = rfCount;

    let cat = "";
    let ldlTarget = "";
    let nonHdlTarget = "";
    let apoBTarget = "";
    const why: string[] = [];

    // Category C
    if (v.sequelae30) {
      cat = "Extreme Risk C";
      ldlTarget = "10–15 mg/dL";
      nonHdlTarget = "≤ 40 mg/dL";
      apoBTarget = "< 35 mg/dL";
      why.push("Ongoing ASCVD sequelae despite LDL-C ≤30 mg/dL and intensive therapy.");
    }
    // Category B
    else if (
      (v.cad && (rfChecked.dm || v.polyvascular || v.tod || rf >= 3)) ||
      v.recurrent50 ||
      v.acs12 ||
      v.hofh
    ) {
      cat = "Extreme Risk B";
      ldlTarget = "≤ 30 mg/dL";
      nonHdlTarget = "≤ 60 mg/dL";
      apoBTarget = "< 45 mg/dL";
      if (v.cad) why.push("CAD present with very-high-risk features.");
      if (v.recurrent50) why.push("Recurrent/progressive events despite LDL-C <50 mg/dL.");
      if (v.acs12) why.push("Recurrent ACS within 12 months despite LDL goal.");
      if (v.hofh) why.push("Homozygous familial hypercholesterolemia selected.");
    }
    // Category A
    else if (
      (v.ascvd &&
        (rfChecked.dm || v.fh || rf >= 3 || v.ckd34 || v.polyvascular || v.pad || v.stroke ||
          (!isNaN(lpaVal) && lpaVal >= 50) || v.subclinical)) ||
      v.subclinical
    ) {
      cat = "Extreme Risk A";
      ldlTarget = "< 50 mg/dL, optional ≤ 30 mg/dL";
      nonHdlTarget = "< 80 mg/dL (optional ≤ 60)";
      apoBTarget = "< 55 mg/dL";
      why.push("Very-high-risk ASCVD or equivalent burden detected.");
      if (v.ascvd && !v.cad && (v.stroke || v.pad))
        why.push("CAD not required because other ASCVD territories qualify.");
      if (v.subclinical)
        why.push("High calcium / extensive plaque burden supports extreme-risk A assignment.");
    }
    // Very High Risk
    else if (v.ascvd || v.hofh || (rfChecked.dm && (rf >= 3 || v.tod))) {
      cat = "Very High Risk";
      ldlTarget = "< 50 mg/dL";
      nonHdlTarget = "< 80 mg/dL";
      apoBTarget = "< 65 mg/dL";
      if (v.ascvd) why.push("Established ASCVD present.");
      if (v.hofh) why.push("Homozygous FH present.");
      if (rfChecked.dm && (rf >= 3 || v.tod))
        why.push("Diabetes with ≥3 risk factors or target-organ damage.");
    } else {
      return null;
    }

    return {
      category: cat,
      ldlTarget,
      nonHdlTarget,
      apoBTarget,
      treatment: TREATMENTS[cat] || [],
      why,
    };
  }, [modChecked, rfChecked, rfCount, ldl, lpa]);

  const result = classify();

  // ─── EMR Note ───
  const generateNote = useCallback(() => {
    const lines: string[] = [];
    lines.push("LAI EXTREME RISK ASSESSMENT");
    lines.push("Predicted category: " + (result?.category || "Lower than VHR / not classifiable"));
    lines.push("LDL-C target: " + (result?.ldlTarget || "Use standard LAI primary-prevention pathway"));
    lines.push("Established ASCVD: " + (modChecked.ascvd ? "Yes" : "No"));
    lines.push(
      "Territories: CAD=" + (modChecked.cad ? "Yes" : "No") +
      ", Stroke/TIA=" + (modChecked.stroke ? "Yes" : "No") +
      ", PAD=" + (modChecked.pad ? "Yes" : "No") +
      ", Polyvascular=" + (modChecked.polyvascular ? "Yes" : "No")
    );
    lines.push(
      "Modifiers: DM=" + (rfChecked.dm ? "Yes" : "No") +
      ", TOD=" + (modChecked.tod ? "Yes" : "No") +
      ", FH=" + (modChecked.fh ? "Yes" : "No") +
      ", HoFH=" + (modChecked.hofh ? "Yes" : "No") +
      ", CKD3B/4=" + (modChecked.ckd34 ? "Yes" : "No") +
      ", High plaque/CAC=" + (modChecked.subclinical ? "Yes" : "No")
    );
    lines.push("Risk factor count: " + rfCount);
    lines.push(
      "Labs: LDL-C=" + (ldl || "—") +
      ", Non-HDL-C=" + (nonhdl || "—") +
      ", HDL-C=" + (hdl || "—") +
      ", ApoB=" + (apob || "—") +
      ", Lp(a)=" + (lpa || "—") +
      ", HbA1c=" + (hba1c || "—") +
      ", Creatinine=" + (creatinine || "—") +
      ", eGFR=" + (egfr || "—") + (egfrAuto ? " (auto)" : "") +
      ", hsCRP=" + (hscrp || "—")
    );
    if (result?.why.length) lines.push("Rationale: " + result.why.join(" "));
    return lines.join("\n");
  }, [result, modChecked, rfChecked, rfCount, ldl, nonhdl, hdl, apob, lpa, hba1c, creatinine, egfr, egfrAuto, hscrp]);

  const copyNote = async () => {
    try {
      await navigator.clipboard.writeText(generateNote());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const reset = () => {
    setAge(""); setSex("male"); setLdl(""); setNonhdl(""); setApob(""); setLpa("");
    setHba1c(""); setEgfr(""); setCreatinine(""); setEgfrAuto(false); setHscrp(""); setHdl("");
    setRfChecked(Object.fromEntries(MAJOR_RF_KEYS.map((k) => [k, false])));
    setModChecked(Object.fromEntries(MODIFIER_KEYS.map((k) => [k, false])));
  };

  // ─── Goal checks ───
  const ldlNum = parseFloat(ldl);
  const nonHdlNum = parseFloat(nonhdl);
  const apoBNum = parseFloat(apob);
  const lpaNum = parseFloat(lpa);

  const ldlAtGoal = result && !isNaN(ldlNum)
    ? result.category === "Extreme Risk C" ? ldlNum <= 15
    : result.category === "Extreme Risk B" ? ldlNum <= 30
    : ldlNum < 50
    : null;
  const nonHdlAtGoal = result && !isNaN(nonHdlNum)
    ? result.category === "Extreme Risk C" ? nonHdlNum <= 40
    : result.category === "Extreme Risk B" ? nonHdlNum <= 60
    : nonHdlNum < 80
    : null;
  const apoBAtGoal = result && !isNaN(apoBNum)
    ? result.category === "Extreme Risk C" ? apoBNum < 35
    : result.category === "Extreme Risk B" ? apoBNum < 45
    : result.category === "Extreme Risk A" ? apoBNum < 55
    : apoBNum < 65
    : null;

  const catColor = result
    ? result.category === "Very High Risk" ? "warning" : "danger"
    : "muted";

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Heart className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            LAI Extreme Risk Predictor
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lipid Association of India 2023 Update — Consensus Statement IV
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 no-print">
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

        {activeTab === "calculator" && (
          <div className="space-y-4">
            {/* ASCVD EMR Link */}
            <Card className="border-border bg-card p-4 no-print">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">ASCVD Risk Assessment & EMR</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">ACC/AHA Primary Prevention with EMR Note Generator</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate("/ascvd")} className="gap-1.5">
                  Open <Activity className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>

            {/* ─── Inputs ─── */}
            <Card className="border-border bg-card p-5">
              <h2 className="font-display text-sm font-bold text-foreground mb-3">Inputs</h2>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">Age</label>
                  <Input type="number" placeholder="e.g. 55" value={age} onChange={(e) => setAge(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">Sex</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value as "male" | "female")}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">LDL-C (mg/dL)</label>
                  <Input type="number" placeholder="e.g. 85" value={ldl} onChange={(e) => setLdl(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">Non-HDL-C</label>
                  <Input type="number" placeholder="e.g. 110" value={nonhdl} onChange={(e) => setNonhdl(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">ApoB (mg/dL)</label>
                  <Input type="number" placeholder="e.g. 70" value={apob} onChange={(e) => setApob(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">Lp(a) (mg/dL)</label>
                  <Input type="number" placeholder="e.g. 45" value={lpa} onChange={(e) => setLpa(e.target.value)} />
                  {!isNaN(lpaNum) && lpaNum >= 50 && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-danger">
                      <AlertTriangle className="h-3 w-3" /> ≥50 → Extreme Risk A
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">HbA1c (%)</label>
                  <Input type="number" placeholder="e.g. 7.2" value={hba1c} onChange={(e) => setHba1c(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">Creatinine (mg/dL)</label>
                  <Input type="number" placeholder="e.g. 1.2" value={creatinine} onChange={(e) => setCreatinine(e.target.value)} />
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Enter to auto-calculate eGFR</p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">
                    eGFR (mL/min/1.73m²)
                    {egfrAuto && <span className="ml-1 text-[10px] font-normal text-primary">auto</span>}
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 45"
                    value={egfr}
                    onChange={(e) => { setEgfr(e.target.value); setEgfrAuto(false); setCreatinine(""); }}
                    className={egfrAuto ? "bg-muted" : ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">HDL-C (mg/dL)</label>
                  <Input type="number" placeholder="e.g. 42" value={hdl} onChange={(e) => setHdl(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-foreground">hsCRP (mg/L)</label>
                  <Input type="number" placeholder="e.g. 3.5" value={hscrp} onChange={(e) => setHscrp(e.target.value)} />
                </div>
              </div>
            </Card>

            {/* ─── Major ASCVD Risk Factors ─── */}
            <Card className="border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="h-4 w-4 text-danger" />
                <h2 className="font-display text-sm font-bold text-foreground">Major ASCVD Risk Factors</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Count: <span className="font-bold text-foreground">{rfCount}/{MAJOR_RF_KEYS.length}</span>
                {" · "}CKD, age, and low HDL auto-derived from inputs
              </p>
              <div className="space-y-2.5">
                {MAJOR_RF_KEYS.map((key) => (
                  <label key={key} className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={rfChecked[key]}
                      onCheckedChange={() => toggleRf(key)}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-snug text-foreground">{MAJOR_RF_LABELS[key]}</span>
                  </label>
                ))}
              </div>
              {rfCount >= 3 && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  ≥3 major ASCVD risk factors — qualifies for higher risk stratification
                </div>
              )}
            </Card>

            {/* ─── ASCVD History & Extreme-Risk Modifiers ─── */}
            <Card className="border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold text-foreground">ASCVD History & Extreme-Risk Modifiers</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Tick all that apply. The algorithm auto-classifies C → B → A → VHR.
              </p>
              <div className="space-y-2.5">
                {MODIFIER_KEYS.map((key) => (
                  <label key={key} className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={modChecked[key]}
                      onCheckedChange={() => toggleMod(key)}
                      className="mt-0.5"
                    />
                    <span className="text-sm leading-snug text-foreground">{MODIFIER_LABELS[key]}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Polyvascular disease:</span> Atherosclerosis in ≥2 major arterial territories — coronary (CAD), cerebrovascular (ischemic stroke/TIA), and/or peripheral arterial disease (PAD). Presence significantly elevates cardiovascular risk.
                </p>
              </div>
            </Card>

            {/* ─── Predicted Category (live) ─── */}
            <Card className={`border-border bg-card overflow-hidden`}>
              <div className={`px-5 py-4 ${
                result
                  ? catColor === "warning" ? "bg-warning/10" : "bg-danger/10"
                  : "bg-muted/30"
              }`}>
                <div className="flex items-center justify-between">
                  <div className={`flex items-center gap-2 font-display font-bold ${
                    result
                      ? catColor === "warning" ? "text-warning" : "text-danger"
                      : "text-muted-foreground"
                  }`}>
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
                    {/* Targets */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LDL-C Target</p>
                        <p className="mt-1 font-display text-lg font-bold text-foreground">{result.ldlTarget}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Non-HDL-C Target</p>
                        <p className="mt-1 font-display text-lg font-bold text-foreground">{result.nonHdlTarget}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ApoB Target</p>
                        <p className="mt-1 font-display text-lg font-bold text-foreground">{result.apoBTarget}</p>
                      </div>
                    </div>

                    {/* Goal indicators */}
                    {(ldlAtGoal !== null || nonHdlAtGoal !== null || apoBAtGoal !== null) && (
                      <div className="space-y-2">
                        {ldlAtGoal !== null && <GoalIndicator label={`LDL-C (${ldl} mg/dL)`} atGoal={ldlAtGoal} />}
                        {nonHdlAtGoal !== null && <GoalIndicator label={`Non-HDL-C (${nonhdl} mg/dL)`} atGoal={nonHdlAtGoal} />}
                        {apoBAtGoal !== null && <GoalIndicator label={`ApoB (${apob} mg/dL)`} atGoal={apoBAtGoal} />}
                      </div>
                    )}

                    {/* Rationale */}
                    {result.why.length > 0 && (
                      <div className="rounded-lg bg-muted/50 px-4 py-3 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rationale</p>
                        {result.why.map((w, i) => (
                          <p key={i} className="text-sm text-foreground">{w}</p>
                        ))}
                      </div>
                    )}

                    {/* Treatment */}
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
                      <p className="text-xs text-muted-foreground italic">
                        *The LDL-C goal of ≤30 mg/dL must be pursued after detailed risk–benefit discussion.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground">
                      Enter data or tick criteria to classify the patient.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Decision logic & Bucket summary */}
            <Card className="border-border bg-card p-5">
              <h2 className="font-display text-sm font-bold text-foreground mb-2">Decision Logic</h2>
              <ol className="list-decimal ml-5 space-y-1 text-sm text-foreground mb-4">
                <li>Check Category C first: ongoing ASCVD sequelae despite LDL-C ≤30 and intensive therapy.</li>
                <li>Then Category B: CAD plus very-high-risk features or recurrent events despite LDL-C &lt;50.</li>
                <li>Then Category A: ASCVD or equivalent burden with diabetes, FH, CKD, Lp(a), stroke, PAD, polyvascular disease, or high calcium/plaque burden.</li>
                <li>If not extreme-risk, label Very High Risk when established ASCVD, homozygous FH, or diabetes with ≥3 major RF / target-organ damage is present.</li>
              </ol>

              <h2 className="font-display text-sm font-bold text-foreground mb-2">Bucket Summary</h2>
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
            </Card>

            {/* ─── EMR Note ─── */}
            <Card className="border-border bg-card p-5">
              <h2 className="font-display text-sm font-bold text-foreground mb-2">EMR Note</h2>
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
            </Card>
          </div>
        )}

        {activeTab === "primary" && <PrimaryPrevention />}
        {activeTab === "flowchart" && <ClinicalGuidance />}
        {activeTab === "education" && <EducationSection />}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Reference: Lipid Association of India 2023 Update — Consensus Statement IV
        </p>
      </div>
    </div>
  );
}

function GoalIndicator({ label, atGoal }: { label: string; atGoal: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
      atGoal ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
    }`}>
      {atGoal ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      {label} — {atGoal ? "At goal" : "Above target"}
    </div>
  );
}
