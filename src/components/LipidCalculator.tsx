import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Heart, AlertTriangle, ShieldCheck, RotateCcw, Activity, Printer } from "lucide-react";

type RiskCategory = null | "vhrg" | "extreme-a" | "extreme-b";

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
};

export default function LipidCalculator() {
  const [currentLDL, setCurrentLDL] = useState("");
  const [currentLpa, setCurrentLpa] = useState("");
  const [currentNonHDL, setCurrentNonHDL] = useState("");
  const [currentApoB, setCurrentApoB] = useState("");
  const [selectedAscvdRF, setSelectedAscvdRF] = useState<boolean[]>(new Array(MAJOR_ASCVD_RF.length).fill(false));
  const [selectedSmurfs, setSelectedSmurfs] = useState<boolean[]>(new Array(SMURFS.length).fill(false));
  const [selectedVHRG, setSelectedVHRG] = useState<boolean[]>(new Array(VHRG_CONDITIONS.length).fill(false));
  const [selectedExtA, setSelectedExtA] = useState<boolean[]>(new Array(EXTREME_A_CONDITIONS.length).fill(false));
  const [selectedExtB, setSelectedExtB] = useState<boolean[]>(new Array(EXTREME_B_CONDITIONS.length).fill(false));
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
    if (selectedExtB.some(Boolean)) {
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
    setResult(null);
    setShowResult(false);
  };

  const resultInfo = result ? RESULTS[result] : null;
  const ldlNum = parseFloat(currentLDL);
  const nonHdlNum = parseFloat(currentNonHDL);
  const apoBNum = parseFloat(currentApoB);

  const ldlAtGoal = resultInfo && !isNaN(ldlNum)
    ? result === "extreme-b" ? ldlNum <= 30 : ldlNum < 50
    : null;
  const nonHdlAtGoal = resultInfo && !isNaN(nonHdlNum)
    ? result === "extreme-b" ? nonHdlNum <= 60 : nonHdlNum < 80
    : null;
  const apoBAtGoal = resultInfo && !isNaN(apoBNum)
    ? result === "extreme-b" ? apoBNum < 45
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
