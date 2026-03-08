import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Heart, AlertTriangle, ShieldCheck, RotateCcw, Activity } from "lucide-react";

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
  color: string;
  icon: React.ReactNode;
  treatment: string[];
}

const RESULTS: Record<string, ResultInfo> = {
  vhrg: {
    category: "Very High-Risk Group (VHRG)",
    ldlGoal: "< 50 mg/dL",
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
  const [selectedAscvdRF, setSelectedAscvdRF] = useState<boolean[]>(new Array(MAJOR_ASCVD_RF.length).fill(false));
  const [selectedSmurfs, setSelectedSmurfs] = useState<boolean[]>(new Array(SMURFS.length).fill(false));
  const [selectedVHRG, setSelectedVHRG] = useState<boolean[]>(new Array(VHRG_CONDITIONS.length).fill(false));
  const [selectedExtA, setSelectedExtA] = useState<boolean[]>(new Array(EXTREME_A_CONDITIONS.length).fill(false));
  const [selectedExtB, setSelectedExtB] = useState<boolean[]>(new Array(EXTREME_B_CONDITIONS.length).fill(false));
  const [result, setResult] = useState<RiskCategory>(null);
  const [showResult, setShowResult] = useState(false);
  const smurfCount = selectedSmurfs.filter(Boolean).length;
  const ascvdRFCount = selectedAscvdRF.filter(Boolean).length;
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
    setSelectedSmurfs(new Array(SMURFS.length).fill(false));
    setSelectedVHRG(new Array(VHRG_CONDITIONS.length).fill(false));
    setSelectedExtA(new Array(EXTREME_A_CONDITIONS.length).fill(false));
    setSelectedExtB(new Array(EXTREME_B_CONDITIONS.length).fill(false));
    setResult(null);
    setShowResult(false);
  };

  const resultInfo = result ? RESULTS[result] : null;
  const ldlNum = parseFloat(currentLDL);
  const atGoal = resultInfo && !isNaN(ldlNum)
    ? result === "extreme-b"
      ? ldlNum <= 30
      : ldlNum < 50
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
            Based on ILA (Lipid Association of India) Guidelines 2020
          </p>
        </div>

        {/* Current LDL Input */}
        <Card className="mb-4 border-border bg-card p-5">
          <label className="mb-2 block font-display text-sm font-semibold text-foreground">
            Current LDL-C Level (mg/dL)
          </label>
          <Input
            type="number"
            placeholder="e.g. 85"
            value={currentLDL}
            onChange={(e) => setCurrentLDL(e.target.value)}
            className="text-lg"
          />
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
          subtitle="CAD with ≥1 of the following"
          conditions={EXTREME_A_CONDITIONS}
          selected={selectedExtA}
          onToggle={(i) => toggleItem(selectedExtA, setSelectedExtA, i)}
          accent="danger"
        />

        <RiskSection
          title="Extreme Risk — Category B"
          subtitle="CAD with ≥1 of the following"
          conditions={EXTREME_B_CONDITIONS}
          selected={selectedExtB}
          onToggle={(i) => toggleItem(selectedExtB, setSelectedExtB, i)}
          accent="danger"
        />

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button onClick={calculate} className="flex-1 font-display text-base font-semibold" size="lg">
            Calculate Target
          </Button>
          <Button onClick={reset} variant="outline" size="lg">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Result */}
        {showResult && (
          <Card className="mt-6 overflow-hidden border-border bg-card">
            {resultInfo ? (
              <>
                <div className={`px-5 py-4 ${
                  result === "vhrg"
                    ? "bg-warning/10 text-warning"
                    : "bg-danger/10 text-danger"
                }`}>
                  <div className="flex items-center gap-2 font-display font-bold">
                    {resultInfo.icon}
                    {resultInfo.category}
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LDL-C Target</p>
                    <p className="mt-1 font-display text-2xl font-bold text-foreground whitespace-pre-line">
                      {resultInfo.ldlGoal}
                    </p>
                  </div>

                  {atGoal !== null && (
                    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium ${
                      atGoal
                        ? "bg-success/10 text-success"
                        : "bg-danger/10 text-danger"
                    }`}>
                      {atGoal ? (
                        <><ShieldCheck className="h-5 w-5" /> Current LDL-C ({currentLDL} mg/dL) is at goal</>
                      ) : (
                        <><AlertTriangle className="h-5 w-5" /> Current LDL-C ({currentLDL} mg/dL) is above target</>
                      )}
                    </div>
                  )}

                  <div>
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
          Reference: Journal of Clinical Lipidology, Vol 14, No 2, April 2020 — Lipid Association of India
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
