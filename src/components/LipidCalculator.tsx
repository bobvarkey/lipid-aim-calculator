import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Heart, AlertTriangle, ShieldCheck, RotateCcw, Activity, Printer, Info, ChevronDown, ChevronUp } from "lucide-react";
import cvRiskMeasures from "@/assets/cv-risk-measures.png";
import lipoproteinParticles from "@/assets/lipoprotein-particles.png";
import cprFramework from "@/assets/cpr-framework.png";

type RiskCategory = null | "vhrg" | "extreme-a" | "extreme-b" | "extreme-c";

const SMURFS = [
  { key: "smoking", label: "Smoking", letter: "S" },
  { key: "male", label: "Male sex (age ≥45 years)", letter: "M" },
  { key: "uncontrolled_dm", label: "Uncontrolled Diabetes Mellitus (HbA1c >7%)", letter: "u" },
  { key: "renal", label: "Reduced renal function (eGFR <60)", letter: "R" },
  { key: "familial", label: "Familial hypercholesterolemia / Strong family history of premature CAD", letter: "F" },
  { key: "hscrp", label: "hsCRP elevated (≥2 mg/L)", letter: "S*", isNew: true },
];

const MAJOR_ASCVD_RF = [
  "Age (Men ≥45 y, Women ≥55 y)",
  "Current cigarette smoking",
  "Hypertension (BP ≥140/90 mmHg or on treatment)",
  "Low HDL-C (<40 mg/dL in men, <50 mg/dL in women)",
  "Family history of premature CHD (1st degree: male <55 y, female <65 y)",
  "Diabetes mellitus",
  "Chronic kidney disease (eGFR <60 mL/min)",
  "Obesity (BMI ≥30 or waist circumference elevated)",
];

const VHRG_CONDITIONS = [
  "ASCVD (CAD/PAD/TIA or stroke)",
  "Homozygous familial hypercholesterolemia",
  "Diabetes with ≥3 major ASCVD risk factors / target organ damage",
];

const EXTREME_A_CONDITIONS = [
  "CAD with Diabetes (without target organ damage / 0–2 major ASCVD risk factors)",
  "CAD with Familial hypercholesterolemia",
  "CAD with ≥3 major ASCVD risk factors",
  "CAD with CKD stage 3B or 4",
  "CAD with ≥2 major ASCVD risk factors + ≥1 moderate nonconventional risk factor",
  "CAD with Lp(a) ≥50 mg/dL",
  "CAD with Coronary calcium score ≥300 HU",
  "CAD with Extreme of a single risk factor",
  "CAD with PAD",
  "CAD with H/o TIA or stroke",
];

const EXTREME_B_CONDITIONS = [
  "CAD with Diabetes + polyvascular disease / ≥3 major ASCVD risk factors / target organ damage",
  "Recurrent ACS (within 12 months) despite being on LDL-C goal",
  "Homozygous familial hypercholesterolemia",
];

const EXTREME_C_CONDITIONS = [
  "Recurrent ASCVD events despite optimal lifestyle intervention + aggressive lipid-lowering therapy + anti-inflammatory agents (e.g., colchicine) + guideline-directed management of diabetes/hypertension",
];

interface ResultInfo {
  category: string;
  ldlGoal: string;
  nonHdlGoal: string;
  apoBGoal: string;
  color: string;
  icon: React.ReactNode;
  treatment: string[];
}

const RESULTS: Record<string, ResultInfo> = {
  vhrg: {
    category: "Very High-Risk Group (VHRG)",
    ldlGoal: "< 50 mg/dL",
    nonHdlGoal: "< 80 mg/dL",
    apoBGoal: "< 65 mg/dL",
    color: "warning",
    icon: <AlertTriangle className="h-6 w-6" />,
    treatment: [
      "High-intensity statin therapy",
      "If LDL-C ≥50 mg/dL → Add ezetimibe",
      "If still ≥50 mg/dL → Consider PCSK9 inhibitor",
      "Reinforce lifestyle measures",
    ],
  },
  "extreme-a": {
    category: "Extreme Risk — Category A",
    ldlGoal: "< 50 mg/dL (indispensable)\n≤ 30 mg/dL (optional)*",
    nonHdlGoal: "< 80 mg/dL (indispensable)\n≤ 60 mg/dL (optional)*",
    apoBGoal: "< 55 mg/dL",
    color: "danger",
    icon: <AlertTriangle className="h-6 w-6" />,
    treatment: [
      "High-intensity statin therapy",
      "If LDL-C ≥50 mg/dL → Add ezetimibe",
      "If still ≥50 mg/dL → Category A pathway",
      "Optional goal ≤30 mg/dL after physician–patient discussion",
      "Reinforce lifestyle measures",
    ],
  },
  "extreme-b": {
    category: "Extreme Risk — Category B",
    ldlGoal: "≤ 30 mg/dL",
    nonHdlGoal: "≤ 60 mg/dL",
    apoBGoal: "< 45 mg/dL",
    color: "danger",
    icon: <AlertTriangle className="h-6 w-6" />,
    treatment: [
      "High-intensity statin therapy",
      "If LDL-C ≥50 mg/dL → Add ezetimibe",
      "Aggressive LDL-C lowering to ≤30 mg/dL",
      "Reinforce lifestyle measures",
    ],
  },
  "extreme-c": {
    category: "Extreme Risk — Category C",
    ldlGoal: "10–15 mg/dL",
    nonHdlGoal: "≤ 40 mg/dL",
    apoBGoal: "< 35 mg/dL",
    color: "danger",
    icon: <AlertTriangle className="h-6 w-6" />,
    treatment: [
      "Maximize high-intensity statin + ezetimibe + PCSK9 inhibitor",
      "Anti-inflammatory therapy (e.g., colchicine)",
      "Guideline-directed management of diabetes, hypertension, and other conditions",
      "Optimal lifestyle intervention",
      "Target LDL-C 10–15 mg/dL",
    ],
  },
};

export default function LipidCalculator() {
  const [showEducation, setShowEducation] = useState(false);
  const [currentLDL, setCurrentLDL] = useState("");
  const [currentLpa, setCurrentLpa] = useState("");
  const [currentNonHDL, setCurrentNonHDL] = useState("");
  const [currentApoB, setCurrentApoB] = useState("");
  const [selectedAscvdRF, setSelectedAscvdRF] = useState<boolean[]>(new Array(MAJOR_ASCVD_RF.length).fill(false));
  const [selectedSmurfs, setSelectedSmurfs] = useState<boolean[]>(new Array(SMURFS.length).fill(false));
  const [selectedVHRG, setSelectedVHRG] = useState<boolean[]>(new Array(VHRG_CONDITIONS.length).fill(false));
  const [selectedExtA, setSelectedExtA] = useState<boolean[]>(new Array(EXTREME_A_CONDITIONS.length).fill(false));
  const [selectedExtB, setSelectedExtB] = useState<boolean[]>(new Array(EXTREME_B_CONDITIONS.length).fill(false));
  const [selectedExtC, setSelectedExtC] = useState<boolean[]>(new Array(EXTREME_C_CONDITIONS.length).fill(false));
  const [result, setResult] = useState<RiskCategory>(null);
  const [showResult, setShowResult] = useState(false);
  const smurfCount = selectedSmurfs.filter(Boolean).length;
  const ascvdRFCount = selectedAscvdRF.filter(Boolean).length;

  // Auto-check "≥3 major ASCVD risk factors" conditions when ≥3 are selected
  useEffect(() => {
    if (ascvdRFCount >= 3) {
      // VHRG index 2: "Diabetes with ≥3 major ASCVD risk factors / target organ damage"
      setSelectedVHRG((prev) => {
        if (prev[2]) return prev;
        const copy = [...prev];
        copy[2] = true;
        return copy;
      });
      // Extreme A index 2: "CAD with ≥3 major ASCVD risk factors"
      setSelectedExtA((prev) => {
        if (prev[2]) return prev;
        const copy = [...prev];
        copy[2] = true;
        return copy;
      });
    } else {
      // Uncheck the auto-checked items when < 3
      setSelectedVHRG((prev) => {
        if (!prev[2]) return prev;
        const copy = [...prev];
        copy[2] = false;
        return copy;
      });
      setSelectedExtA((prev) => {
        if (!prev[2]) return prev;
        const copy = [...prev];
        copy[2] = false;
        return copy;
      });
    }
  }, [ascvdRFCount]);

  // Auto-check "CAD with Lp(a) ≥50 mg/dL" (Extreme A index 5) when Lp(a) ≥50
  const lpaNum = parseFloat(currentLpa);
  useEffect(() => {
    const isElevated = !isNaN(lpaNum) && lpaNum >= 50;
    setSelectedExtA((prev) => {
      if (prev[5] === isElevated) return prev;
      const copy = [...prev];
      copy[5] = isElevated;
      return copy;
    });
  }, [lpaNum]);
  const toggleItem = (
    arr: boolean[],
    setter: React.Dispatch<React.SetStateAction<boolean[]>>,
    idx: number
  ) => {
    const copy = [...arr];
    copy[idx] = !copy[idx];
    setter(copy);
  };

  const calculate = () => {
    if (selectedExtC.some(Boolean)) {
      setResult("extreme-c");
    } else if (selectedExtB.some(Boolean)) {
      setResult("extreme-b");
    } else if (selectedExtA.some(Boolean)) {
      setResult("extreme-a");
    } else if (selectedVHRG.some(Boolean)) {
      setResult("vhrg");
    } else {
      setResult(null);
    }
    setShowResult(true);
  };

  const reset = () => {
    setCurrentLDL("");
    setCurrentLpa("");
    setCurrentNonHDL("");
    setCurrentApoB("");
    setSelectedAscvdRF(new Array(MAJOR_ASCVD_RF.length).fill(false));
    setSelectedSmurfs(new Array(SMURFS.length).fill(false));
    setSelectedVHRG(new Array(VHRG_CONDITIONS.length).fill(false));
    setSelectedExtA(new Array(EXTREME_A_CONDITIONS.length).fill(false));
    setSelectedExtB(new Array(EXTREME_B_CONDITIONS.length).fill(false));
    setSelectedExtC(new Array(EXTREME_C_CONDITIONS.length).fill(false));
    setResult(null);
    setShowResult(false);
  };

  const resultInfo = result ? RESULTS[result] : null;
  const ldlNum = parseFloat(currentLDL);
  const nonHdlNum = parseFloat(currentNonHDL);
  const apoBNum = parseFloat(currentApoB);

  const ldlAtGoal = resultInfo && !isNaN(ldlNum)
    ? result === "extreme-c" ? ldlNum <= 15
      : result === "extreme-b" ? ldlNum <= 30
      : ldlNum < 50
    : null;
  const nonHdlAtGoal = resultInfo && !isNaN(nonHdlNum)
    ? result === "extreme-c" ? nonHdlNum <= 40
      : result === "extreme-b" ? nonHdlNum <= 60
      : nonHdlNum < 80
    : null;
  const apoBAtGoal = resultInfo && !isNaN(apoBNum)
    ? result === "extreme-c" ? apoBNum < 35
      : result === "extreme-b" ? apoBNum < 45
      : result === "extreme-a" ? apoBNum < 55
      : apoBNum < 65
    : null;

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Heart className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            LDL-C Target Calculator
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Lipid Association of India 2023 Update on Cardiovascular Risk Assessment and Lipid Management in Indian Patients: Consensus Statement IV
          </p>
        </div>

        {/* Current LDL & Lp(a) Inputs */}
        <Card className="mb-4 border-border bg-card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="mb-2 block font-display text-sm font-semibold text-foreground">
                LDL-C (mg/dL)
              </label>
              <Input
                type="number"
                placeholder="e.g. 85"
                value={currentLDL}
                onChange={(e) => setCurrentLDL(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block font-display text-sm font-semibold text-foreground">
                Non-HDL-C (mg/dL)
              </label>
              <Input
                type="number"
                placeholder="e.g. 110"
                value={currentNonHDL}
                onChange={(e) => setCurrentNonHDL(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block font-display text-sm font-semibold text-foreground">
                ApoB (mg/dL)
              </label>
              <Input
                type="number"
                placeholder="e.g. 70"
                value={currentApoB}
                onChange={(e) => setCurrentApoB(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block font-display text-sm font-semibold text-foreground">
                Lp(a) (mg/dL)
              </label>
              <Input
                type="number"
                placeholder="e.g. 45"
                value={currentLpa}
                onChange={(e) => setCurrentLpa(e.target.value)}
              />
              {!isNaN(lpaNum) && lpaNum >= 50 && (
                <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-danger">
                  <AlertTriangle className="h-3 w-3" />
                  ≥50 → Extreme A
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* SMuRFS Section */}
        <Card className="mb-4 border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-display text-sm font-bold text-foreground">
              SMuRFS — Major ASCVD Risk Factors
            </h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Standard Modifiable Risk Factors + hsCRP (5th SMuRF). Count: <span className="font-bold text-foreground">{smurfCount}/6</span>
          </p>
          <div className="space-y-3">
            {SMURFS.map((s, i) => (
              <label key={s.key} className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={selectedSmurfs[i]}
                  onCheckedChange={() => toggleItem(selectedSmurfs, setSelectedSmurfs, i)}
                  className="mt-0.5"
                />
                <span className="text-sm leading-snug text-foreground">
                  <span className="font-bold text-primary">{s.letter}</span> — {s.label}
                  {s.isNew && (
                    <span className="ml-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                      New 5th SMuRF
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
          {smurfCount >= 3 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-warning/10 px-3 py-2 text-xs font-medium text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              ≥3 major ASCVD risk factors identified — qualifies for higher risk stratification
            </div>
          )}
        </Card>

        {/* Major ASCVD Risk Factors Checklist */}
        <Card className="mb-4 border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-4 w-4 text-danger" />
            <h2 className="font-display text-sm font-bold text-foreground">
              Major ASCVD Risk Factors
            </h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Helps determine risk stratification. Count: <span className="font-bold text-foreground">{ascvdRFCount}/{MAJOR_ASCVD_RF.length}</span>
          </p>
          <div className="space-y-3">
            {MAJOR_ASCVD_RF.map((rf, i) => (
              <label key={i} className="flex cursor-pointer items-start gap-3">
                <Checkbox
                  checked={selectedAscvdRF[i]}
                  onCheckedChange={() => toggleItem(selectedAscvdRF, setSelectedAscvdRF, i)}
                  className="mt-0.5"
                />
                <span className="text-sm leading-snug text-foreground">{rf}</span>
              </label>
            ))}
          </div>
          {ascvdRFCount >= 3 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-xs font-medium text-danger">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              ≥3 major ASCVD risk factors — consider Extreme Risk or VHRG classification
            </div>
          )}
        </Card>

        {/* Risk Sections */}
        <RiskSection
          title="Very High-Risk Group (VHRG)"
          subtitle="Select if any apply"
          conditions={VHRG_CONDITIONS}
          selected={selectedVHRG}
          onToggle={(i) => toggleItem(selectedVHRG, setSelectedVHRG, i)}
          accent="warning"
        />

        <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger font-medium leading-relaxed">
          <strong>Note:</strong> CAD is typically a "must" to fall under the "Extreme Risk" category, with PAD, stroke, or CKD acting as additional major complicating factors.
        </div>

        <RiskSection
          title="Extreme Risk — Category A"
          subtitle="CAD plus a single major complicating factor (e.g., PAD, prior Stroke, or Stage 3/4 CKD)"
          conditions={EXTREME_A_CONDITIONS}
          selected={selectedExtA}
          onToggle={(i) => toggleItem(selectedExtA, setSelectedExtA, i)}
          accent="danger"
        />

        <RiskSection
          title="Extreme Risk — Category B"
          subtitle="CAD plus more severe or multiple complications (e.g., Diabetes with target organ damage, or recurrent events within 12 months)"
          conditions={EXTREME_B_CONDITIONS}
          selected={selectedExtB}
          onToggle={(i) => toggleItem(selectedExtB, setSelectedExtB, i)}
          accent="danger"
        />

        <RiskSection
          title="Extreme Risk — Category C"
          subtitle="Recurrent ASCVD events despite holistic risk reduction (optimal lifestyle, aggressive lipid-lowering, anti-inflammatory agents, guideline-directed management of diabetes/HTN)"
          conditions={EXTREME_C_CONDITIONS}
          selected={selectedExtC}
          onToggle={(i) => toggleItem(selectedExtC, setSelectedExtC, i)}
          accent="danger"
        />

        {/* Actions */}
        <div className="mt-6 flex gap-3 no-print">
          <Button onClick={calculate} className="flex-1 font-display text-base font-semibold" size="lg">
            Calculate Target
          </Button>
          <Button onClick={reset} variant="outline" size="lg">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Result */}
        {showResult && (
          <Card className="mt-6 overflow-hidden border-border bg-card" id="lipid-report">
            {resultInfo ? (
              <>
                <div className={`px-5 py-4 ${
                  result === "vhrg"
                    ? "bg-warning/10 text-warning"
                    : "bg-danger/10 text-danger"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-display font-bold">
                      {resultInfo.icon}
                      {resultInfo.category}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="no-print"
                      onClick={() => window.print()}
                    >
                      <Printer className="h-4 w-4 mr-1" />
                      Print Report
                    </Button>
                  </div>
                </div>

                {/* Print-only header */}
                <div className="hidden print-only px-5 pt-4">
                  <h2 className="font-display text-lg font-bold text-foreground">LDL-C Target Calculator — Patient Report</h2>
                  <p className="text-xs text-muted-foreground">
                    Generated on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} • Based on LAI 2023 Consensus Statement IV
                  </p>
                  {(currentLDL || currentNonHDL || currentApoB || currentLpa) && (
                    <p className="mt-1 text-sm text-foreground">
                      {currentLDL && <>LDL-C: <span className="font-bold">{currentLDL}</span></>}
                      {currentNonHDL && <>{currentLDL ? " • " : ""}Non-HDL-C: <span className="font-bold">{currentNonHDL}</span></>}
                      {currentApoB && <>{(currentLDL || currentNonHDL) ? " • " : ""}ApoB: <span className="font-bold">{currentApoB}</span></>}
                      {currentLpa && <>{(currentLDL || currentNonHDL || currentApoB) ? " • " : ""}Lp(a): <span className="font-bold">{currentLpa}</span></>}
                      <span className="text-muted-foreground"> mg/dL</span>
                    </p>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print-break-inside-avoid">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LDL-C Target</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground whitespace-pre-line">
                        {resultInfo.ldlGoal}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Non-HDL-C Target</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground whitespace-pre-line">
                        {resultInfo.nonHdlGoal}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ApoB Target</p>
                      <p className="mt-1 font-display text-lg font-bold text-foreground whitespace-pre-line">
                        {resultInfo.apoBGoal}
                      </p>
                    </div>
                  </div>

                  {/* At-goal indicators for all three markers */}
                  {(ldlAtGoal !== null || nonHdlAtGoal !== null || apoBAtGoal !== null) && (
                    <div className="space-y-2 print-break-inside-avoid">
                      {ldlAtGoal !== null && (
                        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
                          ldlAtGoal ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}>
                          {ldlAtGoal ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          LDL-C ({currentLDL} mg/dL) — {ldlAtGoal ? "At goal" : "Above target"}
                        </div>
                      )}
                      {nonHdlAtGoal !== null && (
                        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
                          nonHdlAtGoal ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}>
                          {nonHdlAtGoal ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          Non-HDL-C ({currentNonHDL} mg/dL) — {nonHdlAtGoal ? "At goal" : "Above target"}
                        </div>
                      )}
                      {apoBAtGoal !== null && (
                        <div className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${
                          apoBAtGoal ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                        }`}>
                          {apoBAtGoal ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          ApoB ({currentApoB} mg/dL) — {apoBAtGoal ? "At goal" : "Above target"}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="print-break-inside-avoid">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Treatment Algorithm</p>
                    <ul className="space-y-2">
                      {resultInfo.treatment.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {result === "extreme-a" && (
                    <p className="text-xs text-muted-foreground italic">
                      *The LDL-C goal of ≤30 mg/dL must be pursued after detailed risk–benefit discussion between physician and patient.
                    </p>
                  )}

                  {/* Stroke-Specific Guidance */}
                  <div className="rounded-lg border border-border bg-muted/50 p-4 print-break-inside-avoid">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Stroke-Specific Guidance
                    </p>
                    <p className="text-sm text-foreground leading-relaxed">
                      Ischemic stroke patients are classified as <span className="font-semibold">very high-risk</span> (LDL-C &lt;50 mg/dL) or <span className="font-semibold">extreme risk</span> (≤30 mg/dL for Category B), aligning with ASCVD targets.
                    </p>
                    <p className="mt-2 text-sm text-foreground leading-relaxed">
                      CSI/LAI suggest LDL-C <span className="font-semibold">&lt;55 mg/dL</span> with <span className="font-semibold">≥50% reduction</span> from baseline.
                    </p>
                  </div>

                  {/* Print-only footer */}
                  <div className="hidden print-only border-t border-border pt-3 mt-4">
                    <p className="text-[10px] text-muted-foreground">
                      This report is generated for informational purposes only and does not replace professional medical advice. Reference: Lipid Association of India 2023 Update — Consensus Statement IV.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-5 text-center">
                <ShieldCheck className="mx-auto h-10 w-10 text-success mb-2" />
                <p className="font-display font-semibold text-foreground">No high-risk conditions selected</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Please select applicable risk factors or consult standard lipid guidelines for moderate/low risk.
                </p>
              </div>
            )}
          </Card>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Reference: Lipid Association of India 2023 Update — Consensus Statement IV on Cardiovascular Risk Assessment and Lipid Management in Indian Patients
        </p>

        {/* Educational Reference Section */}
        <div className="mt-8 no-print">
          <button
            onClick={() => setShowEducation(!showEducation)}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 text-left transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-display text-sm font-bold text-foreground">Understanding Lp(a), ApoB & Cardiovascular Risk</p>
                <p className="text-xs text-muted-foreground">Key concepts, risk tables & 2026 guideline updates</p>
              </div>
            </div>
            {showEducation ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>

          {showEducation && (
            <div className="mt-4 space-y-6">
              {/* Images */}
              <Card className="border-border bg-card overflow-hidden">
                <img src={cvRiskMeasures} alt="Core measures to assess cardiovascular risk - Information scale showing ApoB, Lp(a) vs Non-HDL-C, TG, TC, VLDL-C, LDL-C" className="w-full" />
              </Card>
              <Card className="border-border bg-card overflow-hidden">
                <img src={lipoproteinParticles} alt="Lipoprotein particles - VLDL, LDL, IDL (atherogenic with ApoB) and HDL (protective with ApoA1)" className="w-full" />
              </Card>
              <Card className="border-border bg-card overflow-hidden">
                <img src={cprFramework} alt="CPR Framework for Risk Evaluation - 2026 ACC/AHA Dyslipidemia Guidelines" className="w-full" />
              </Card>

              {/* 2026 AHA/ACC At-a-Glance */}
              <Card className="border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Heart className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-display text-base font-bold text-foreground">2026 AHA/ACC Dyslipidemia Guidelines At-a-Glance</h3>
                </div>
                <p className="text-sm text-foreground leading-relaxed mb-4">
                  The American Heart Association and American College of Cardiology released the first cholesterol guideline update in eight years, with <strong>52 distinct new recommendations</strong>.
                </p>

                {/* Key Recommendations */}
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Key Recommendation</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    <strong>Lp(a) Screening:</strong> Measure Lp(a) at least once in every adult's life to identify very high inherited levels (&gt;180 mg/dL), which can reclassify moderate-risk patients to higher risk.
                  </p>
                </div>

                {/* Biggest Changes */}
                <div className="space-y-2.5 text-sm text-foreground leading-relaxed mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Biggest Changes</p>
                  <p>• <strong>Lp(a) testing</strong> is now recommended for all adults — it is the strongest hereditary risk factor for heart disease.</p>
                  <p>• Treatment is now recommended for <strong>younger adults</strong>, based on 30-year heart disease risk projections rather than 10-year risk.</p>
                  <p>• <strong>ApoB testing, hsCRP (inflammation), and CAC (imaging)</strong> are recommended more frequently — essentially better biomarkers for heart health.</p>
                  <p>• <strong>Specific LDL targets are back</strong>, after being removed in the 2013 guidelines.</p>
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
                          <td className="py-2.5 font-semibold whitespace-nowrap">&lt;55 mg/dL<br /><span className="font-normal text-xs text-muted-foreground">(&lt;40 mg/dL recurrent ASCVD)</span></td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2.5 pr-3 font-semibold text-warning">High</td>
                          <td className="py-2.5 pr-3 text-xs leading-relaxed">LDL-C&gt;190, TC&gt;310, BP&gt;180/110, FH, diabetes&gt;10y, eGFR 30–59, SCORE 5–10%</td>
                          <td className="py-2.5 font-semibold">&lt;70 mg/dL</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2.5 pr-3 font-semibold text-primary">Moderate</td>
                          <td className="py-2.5 pr-3 text-xs leading-relaxed">Younger diabetes (&lt;35 T1DM/&lt;50 T2DM), diabetes&lt;10y without other risks, SCORE 1–5%</td>
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
                    Because on-treatment LDL-C and apoB levels were nearly identical in trial data, the same number can be used for both. If a target LDL-C is &lt;70 mg/dL, the target apoB should also be &lt;70 mg/dL (0.70 g/L). This simple approach eliminates confusion between guidelines.
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
                          <td className="py-2 pr-3 font-semibold">&lt;55 mg/dL</td>
                          <td className="py-2 font-semibold">&lt;55 mg/dL (0.55 g/L)</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-3 font-semibold text-warning">High</td>
                          <td className="py-2 pr-3 font-semibold">&lt;70 mg/dL</td>
                          <td className="py-2 font-semibold">&lt;70 mg/dL (0.70 g/L)</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-semibold text-primary">Moderate</td>
                          <td className="py-2 pr-3 font-semibold">&lt;100 mg/dL</td>
                          <td className="py-2 font-semibold">&lt;100 mg/dL (1.0 g/L)</td>
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
                            <td className="py-2">&lt;80 mg/dL (&lt;60 mg/dL for high risk of arterial occlusion)</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-3 font-semibold text-warning">Borderline High</td>
                            <td className="py-2">90–109 mg/dL</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-3 font-semibold text-danger">High Risk</td>
                            <td className="py-2">≥110 mg/dL (often defined as ≥120 mg/dL)</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-3 text-muted-foreground">Male Typical Range</td>
                            <td className="py-2">66–133 mg/dL</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-3 text-muted-foreground">Female Typical Range</td>
                            <td className="py-2">60–117 mg/dL</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Treatment Goals Table (Non-HDL-C, LDL-C, ApoB) */}
                  <div className="mt-4 rounded-lg border border-primary/10 bg-background p-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Treatment Goals: Non-HDL-C, LDL-C & ApoB (mg/dL)</p>
                    <p className="text-xs text-muted-foreground mb-2">*ApoB is a secondary, optional target of treatment.</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Risk Category</th>
                            <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Non-HDL-C</th>
                            <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">LDL-C</th>
                            <th className="text-left py-2 font-semibold text-primary">ApoB*</th>
                          </tr>
                        </thead>
                        <tbody className="text-foreground">
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-3">Low</td>
                            <td className="py-2 pr-3">&lt;130</td>
                            <td className="py-2 pr-3">&lt;100</td>
                            <td className="py-2 font-semibold text-primary">&lt;90</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-3">Moderate</td>
                            <td className="py-2 pr-3">&lt;130</td>
                            <td className="py-2 pr-3">&lt;100</td>
                            <td className="py-2 font-semibold text-primary">&lt;90</td>
                          </tr>
                          <tr className="border-b border-border/50">
                            <td className="py-2 pr-3">High</td>
                            <td className="py-2 pr-3">&lt;130</td>
                            <td className="py-2 pr-3">&lt;100</td>
                            <td className="py-2 font-semibold text-primary">&lt;90</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-3 font-semibold">Very High</td>
                            <td className="py-2 pr-3">&lt;100</td>
                            <td className="py-2 pr-3">&lt;70</td>
                            <td className="py-2 font-semibold text-primary">&lt;80</td>
                          </tr>
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
                      <p className="text-muted-foreground leading-relaxed">Age ≥65, coronary bypass/PCI, current smoker, diabetes, HF, HTN, LDL-C ≥100 mg/dL despite max statin + ezetimibe</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed italic">
                    ASCVD includes history of ACS, MI, stable or unstable angina, coronary or other arterial revascularization, stroke, TIA, or PAD.
                  </p>
                </div>

                {/* Subclinical Atherosclerosis / CAC Score */}
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
                        <tr className="border-b border-border/50">
                          <td className="py-2.5 pr-3">0</td>
                          <td className="py-2.5 pr-3">Low risk</td>
                          <td className="py-2.5 font-semibold">&lt;100 mg/dL</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2.5 pr-3">1–99 AU</td>
                          <td className="py-2.5 pr-3">Start moderate statin</td>
                          <td className="py-2.5 font-semibold">&lt;70 mg/dL</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2.5 pr-3">100–399 AU</td>
                          <td className="py-2.5 pr-3">High-intensity statin</td>
                          <td className="py-2.5 font-semibold">&lt;55 mg/dL</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 pr-3">≥400 AU</td>
                          <td className="py-2.5 pr-3">Very high-intensity</td>
                          <td className="py-2.5 font-semibold">&lt;40 mg/dL</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Primary Prevention */}
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

                  <div className="rounded-lg border border-border bg-muted/50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Severe Hypercholesterolemia (LDL-C ≥190 mg/dL)</p>
                    <ol className="space-y-1.5 text-sm text-foreground leading-relaxed list-decimal list-inside">
                      <li><strong>Cascade screening</strong> + complete genetic testing</li>
                      <li>Add <strong>ezetimibe</strong></li>
                      <li>Add <strong>PCSK9 inhibitor</strong> if not at goal</li>
                    </ol>
                  </div>
                </div>

                {/* TG ≥500 */}
                <div className="rounded-lg border border-border bg-muted/50 p-4 mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Adults with Triglycerides ≥500 mg/dL</p>
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
                <div className="rounded-lg border border-border bg-muted/50 p-4 mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Statin-Intolerant Adults</p>
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
                          <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">COR</th>
                          <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">LOE</th>
                          <th className="text-left py-2 font-semibold text-muted-foreground">Recommendation</th>
                        </tr>
                      </thead>
                      <tbody className="text-foreground">
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-3 font-semibold">1</td>
                          <td className="py-2 pr-3">B-NR</td>
                          <td className="py-2 text-xs leading-relaxed">Lipid profile every 5y for ASCVD risk, more frequent with risk factors</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2 pr-3 font-semibold">1</td>
                          <td className="py-2 pr-3">B-NR</td>
                          <td className="py-2 text-xs leading-relaxed">Children 9–11y to screen for FH/other lipid disorders</td>
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 font-semibold">2a</td>
                          <td className="py-2 pr-3">B-NR</td>
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
                    <p>• <strong>Targets:</strong> Very high-risk &lt;55 mg/dL, high &lt;70 mg/dL, moderate &lt;100 mg/dL</p>
                    <p>• <strong>Key drugs:</strong> Statins first, then ezetimibe / PCSK9i / bempedoic acid</p>
                    <p>• <strong>Special cases:</strong> TG ≥500 mg/dL → fibrates/omega-3; severe hypercholesterolemia → cascade screening + PCSK9i</p>
                  </div>
                </div>

                <p className="mt-4 text-[11px] text-muted-foreground italic">
                  Source: 2026 AHA/ACC Dyslipidemia Guidelines At-a-Glance
                </p>
              </Card>

              {/* Lp(a) Section */}
              <Card className="border-border bg-card p-5">
                <h3 className="font-display text-base font-bold text-foreground mb-3">Lp(a) — Lipoprotein(a)</h3>
                <div className="space-y-2 text-sm text-foreground leading-relaxed">
                  <p>• <strong>Optimal:</strong> ≤14 mg/dL</p>
                  <p>• <strong>Normal:</strong> ≤30 mg/dL</p>
                  <p>• <strong>Elevated:</strong> &gt;50 mg/dL</p>
                </div>
                <div className="mt-4 space-y-1.5 text-sm text-foreground leading-relaxed">
                  <p>• Lp(a) 10–49 mg/dL → <strong>28% higher</strong> cardiovascular risk</p>
                  <p>• Lp(a) 50–99 mg/dL → <strong>44% higher</strong> cardiovascular risk</p>
                  <p>• Lp(a) &gt;100 mg/dL → <strong>114% higher</strong> cardiovascular risk</p>
                </div>
                <p className="mt-3 text-sm text-muted-foreground italic">
                  Lp(a) confers a genetic risk — it represents a specific, highly inherited subset of particles that are particularly dangerous, often described as a "hidden" risk factor that does not respond to standard diet or lifestyle changes.
                </p>
              </Card>

              {/* Lp(a) Risk Table */}
              <Card className="border-border bg-card p-5">
                <h3 className="font-display text-base font-bold text-foreground mb-3">Lp(a) & Relative ASCVD Risk</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 pr-4 font-semibold text-muted-foreground">Lp(a) Level</th>
                        <th className="text-left py-2 font-semibold text-muted-foreground">Relative ASCVD Risk</th>
                      </tr>
                    </thead>
                    <tbody className="text-foreground">
                      <tr className="border-b border-border/50"><td className="py-2 pr-4">&lt;75 nmol/L (&lt;30 mg/dL)</td><td className="py-2">Reference (low)</td></tr>
                      <tr className="border-b border-border/50"><td className="py-2 pr-4">75–124 nmol/L (30–49 mg/dL)</td><td className="py-2 font-semibold">1.2×</td></tr>
                      <tr className="border-b border-border/50"><td className="py-2 pr-4">≥125 nmol/L (≥50 mg/dL)</td><td className="py-2 font-semibold text-warning">1.4×</td></tr>
                      <tr className="border-b border-border/50"><td className="py-2 pr-4">≥250 nmol/L (≥100 mg/dL)</td><td className="py-2 font-semibold text-danger">2×</td></tr>
                      <tr className="border-b border-border/50"><td className="py-2 pr-4">≥350 nmol/L (≥150 mg/dL)</td><td className="py-2 font-semibold text-danger">3×</td></tr>
                      <tr><td className="py-2 pr-4">≥430 nmol/L (≥180 mg/dL)</td><td className="py-2 font-semibold text-danger">4×</td></tr>
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* ApoB Section */}
              <Card className="border-border bg-card p-5">
                <h3 className="font-display text-base font-bold text-foreground mb-3">ApoB — Apolipoprotein B</h3>
                <div className="space-y-2.5 text-sm text-foreground leading-relaxed">
                  <p>• LDL is sometimes <strong>calculated</strong>; ApoB is always <strong>measured</strong>.</p>
                  <p>• LDL is just one of three atherogenic particles. <strong>ApoB counts all of them.</strong></p>
                  <p>• LDL counts mass, whereas <strong>ApoB counts number of particles</strong>.</p>
                  <p>• ApoB is a <strong>more accurate predictor</strong> of cardiovascular events than LDL-C or non-HDL cholesterol.</p>
                  <p>• Discordance between ApoB and LDL-C is common, especially in people with <strong>metabolic syndrome, diabetes, or high triglycerides</strong>.</p>
                  <p>• When ApoB and LDL-C disagree, <strong>ApoB is the better predictor of risk</strong>.</p>
                  <p>• Young adults with high ApoB but normal LDL-C had a <strong>55% higher risk</strong> of developing coronary artery calcification 25 years later, while those with high LDL-C but normal ApoB did not show increased risk.</p>
                </div>
                <p className="mt-3 text-sm text-muted-foreground italic">
                  ApoB is "sticky cholesterol" — it reflects the total number of atherogenic particles (LDL + Lp(a) + others).
                </p>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RiskSection({
  title,
  subtitle,
  conditions,
  selected,
  onToggle,
  accent,
}: {
  title: string;
  subtitle: string;
  conditions: string[];
  selected: boolean[];
  onToggle: (i: number) => void;
  accent: string;
}) {
  return (
    <Card className="mb-4 border-border bg-card p-5">
      <h2 className="font-display text-sm font-bold text-foreground">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
      <div className="space-y-3">
        {conditions.map((c, i) => (
          <label key={i} className="flex cursor-pointer items-start gap-3">
            <Checkbox
              checked={selected[i]}
              onCheckedChange={() => onToggle(i)}
              className="mt-0.5"
            />
            <span className="text-sm leading-snug text-foreground">{c}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}
