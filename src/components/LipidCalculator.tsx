import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Heart, AlertTriangle, ShieldCheck, RotateCcw, Activity, Printer, Target } from "lucide-react";
import PrimaryPrevention from "@/components/calculator/PrimaryPrevention";
import ClinicalGuidance from "@/components/calculator/ClinicalGuidance";
import EducationSection from "@/components/calculator/EducationSection";

type RiskCategory = null | "vhrg" | "extreme-a" | "extreme-b" | "extreme-c";
type TabKey = "calculator" | "primary" | "flowchart" | "education";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "calculator", label: "Risk Calculator", icon: <Target className="h-3.5 w-3.5" /> },
  { key: "primary", label: "Primary Prevention", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { key: "flowchart", label: "Flowchart", icon: <Activity className="h-3.5 w-3.5" /> },
  { key: "education", label: "Education", icon: <Heart className="h-3.5 w-3.5" /> },
];

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
  { label: "Established ASCVD (CAD, ischemic stroke/TIA of atherosclerotic origin, or PAD)", ldl: "< 50 mg/dL" },
  { label: "Homozygous familial hypercholesterolemia", ldl: "< 50 mg/dL" },
  { label: "Diabetes with ≥3 major ASCVD risk factors / target organ damage", ldl: "< 50 mg/dL" },
];

const EXTREME_A_CONDITIONS = [
  { label: "Very-high-risk ASCVD or equivalent features (CAD, stroke, PAD, or subclinical high-risk burden)", ldl: "< 50 mg/dL (≤30 optional)" },
  { label: "High coronary calcium score or extensive plaque burden (subclinical atherosclerosis)", ldl: "< 50 mg/dL (≤30 optional)" },
  { label: "ASCVD with Diabetes (without target organ damage / 0–2 major ASCVD risk factors)", ldl: "< 50 mg/dL (≤30 optional)" },
  { label: "ASCVD with Familial hypercholesterolemia", ldl: "< 50 mg/dL (≤30 optional)" },
  { label: "ASCVD with ≥3 major ASCVD risk factors", ldl: "< 50 mg/dL (≤30 optional)" },
  { label: "ASCVD with CKD stage 3B or 4", ldl: "< 50 mg/dL (≤30 optional)" },
  { label: "ASCVD with Lp(a) ≥50 mg/dL", ldl: "< 50 mg/dL (≤30 optional)" },
  { label: "ASCVD with Coronary calcium score ≥300 HU", ldl: "< 50 mg/dL (≤30 optional)" },
  { label: "ASCVD with PAD or polyvascular disease", ldl: "< 50 mg/dL (≤30 optional)" },
  { label: "ASCVD with H/o TIA or ischemic stroke", ldl: "< 50 mg/dL (≤30 optional)" },
];

const EXTREME_B_CONDITIONS = [
  { label: "CAD with Diabetes + polyvascular disease / ≥3 major ASCVD risk factors / target organ damage", ldl: "≤ 30 mg/dL" },
  { label: "CAD with very-high-risk features and recurrent/progressive events despite LDL-C < 50 mg/dL", ldl: "≤ 30 mg/dL" },
  { label: "Recurrent ACS (within 12 months) despite being on LDL-C goal", ldl: "≤ 30 mg/dL" },
  { label: "Homozygous familial hypercholesterolemia", ldl: "≤ 30 mg/dL" },
];

const EXTREME_C_CONDITIONS = [
  { label: "Ongoing ASCVD sequelae despite already achieving LDL-C ≤30 mg/dL + optimal lifestyle + aggressive lipid-lowering + anti-inflammatory agents (e.g., colchicine) + guideline-directed management of comorbidities", ldl: "10–15 mg/dL" },
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
      "High-intensity statin first",
      "Add ezetimibe if LDL-C target not met",
      "Add PCSK9 inhibitor if combination insufficient",
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
      "Maximal statin + ezetimibe (often insufficient alone)",
      "PCSK9 inhibitor–based intensification commonly required",
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
      "Ultralow LDL-C strategy: maximize statin + ezetimibe + PCSK9 inhibitor",
      "Anti-inflammatory therapy (e.g., colchicine)",
      "Strict control of all other risk factors",
      "Guideline-directed management of comorbidities",
      "Target LDL-C 10–15 mg/dL (residual-risk phenotype)",
    ],
  },
};

export default function LipidCalculator() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("calculator");
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

  useEffect(() => {
    if (ascvdRFCount >= 3) {
      setSelectedVHRG((prev) => { if (prev[2]) return prev; const c = [...prev]; c[2] = true; return c; });
      setSelectedExtA((prev) => { if (prev[4]) return prev; const c = [...prev]; c[4] = true; return c; });
    } else {
      setSelectedVHRG((prev) => { if (!prev[2]) return prev; const c = [...prev]; c[2] = false; return c; });
      setSelectedExtA((prev) => { if (!prev[4]) return prev; const c = [...prev]; c[4] = false; return c; });
    }
  }, [ascvdRFCount]);

  const lpaNum = parseFloat(currentLpa);
  useEffect(() => {
    const isElevated = !isNaN(lpaNum) && lpaNum >= 50;
    setSelectedExtA((prev) => { if (prev[6] === isElevated) return prev; const c = [...prev]; c[6] = isElevated; return c; });
  }, [lpaNum]);

  const toggleItem = (arr: boolean[], setter: React.Dispatch<React.SetStateAction<boolean[]>>, idx: number) => {
    const copy = [...arr]; copy[idx] = !copy[idx]; setter(copy);
  };

  const calculate = () => {
    if (selectedExtC.some(Boolean)) setResult("extreme-c");
    else if (selectedExtB.some(Boolean)) setResult("extreme-b");
    else if (selectedExtA.some(Boolean)) setResult("extreme-a");
    else if (selectedVHRG.some(Boolean)) setResult("vhrg");
    else setResult(null);
    setShowResult(true);
  };

  const reset = () => {
    setCurrentLDL(""); setCurrentLpa(""); setCurrentNonHDL(""); setCurrentApoB("");
    setSelectedAscvdRF(new Array(MAJOR_ASCVD_RF.length).fill(false));
    setSelectedSmurfs(new Array(SMURFS.length).fill(false));
    setSelectedVHRG(new Array(VHRG_CONDITIONS.length).fill(false));
    setSelectedExtA(new Array(EXTREME_A_CONDITIONS.length).fill(false));
    setSelectedExtB(new Array(EXTREME_B_CONDITIONS.length).fill(false));
    setSelectedExtC(new Array(EXTREME_C_CONDITIONS.length).fill(false));
    setResult(null); setShowResult(false);
  };

  const resultInfo = result ? RESULTS[result] : null;
  const ldlNum = parseFloat(currentLDL);
  const nonHdlNum = parseFloat(currentNonHDL);
  const apoBNum = parseFloat(currentApoB);

  const ldlAtGoal = resultInfo && !isNaN(ldlNum)
    ? result === "extreme-c" ? ldlNum <= 15 : result === "extreme-b" ? ldlNum <= 30 : ldlNum < 50
    : null;
  const nonHdlAtGoal = resultInfo && !isNaN(nonHdlNum)
    ? result === "extreme-c" ? nonHdlNum <= 40 : result === "extreme-b" ? nonHdlNum <= 60 : nonHdlNum < 80
    : null;
  const apoBAtGoal = resultInfo && !isNaN(apoBNum)
    ? result === "extreme-c" ? apoBNum < 35 : result === "extreme-b" ? apoBNum < 45 : result === "extreme-a" ? apoBNum < 55 : apoBNum < 65
    : null;

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <Heart className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            LDL-C Target Calculator
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

        {/* ASCVD EMR Link */}
        {activeTab === "calculator" && (
          <Card className="mb-4 border-border bg-card p-4 no-print">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">ASCVD Risk Assessment & EMR</h3>
                <p className="text-xs text-muted-foreground mt-0.5">ACC/AHA Primary Prevention with EMR Note Generator</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/ascvd")} className="gap-1.5">
                Open
                <Activity className="h-3.5 w-3.5" />
              </Button>
            </div>
          </Card>
        )}

        {/* Tab Content */}
        {activeTab === "calculator" && (
          <>
            {/* Current Lab Values */}
            <Card className="mb-4 border-border bg-card p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="mb-2 block font-display text-sm font-semibold text-foreground">LDL-C (mg/dL)</label>
                  <Input type="number" placeholder="e.g. 85" value={currentLDL} onChange={(e) => setCurrentLDL(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block font-display text-sm font-semibold text-foreground">Non-HDL-C (mg/dL)</label>
                  <Input type="number" placeholder="e.g. 110" value={currentNonHDL} onChange={(e) => setCurrentNonHDL(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block font-display text-sm font-semibold text-foreground">ApoB (mg/dL)</label>
                  <Input type="number" placeholder="e.g. 70" value={currentApoB} onChange={(e) => setCurrentApoB(e.target.value)} />
                </div>
                <div>
                  <label className="mb-2 block font-display text-sm font-semibold text-foreground">Lp(a) (mg/dL)</label>
                  <Input type="number" placeholder="e.g. 45" value={currentLpa} onChange={(e) => setCurrentLpa(e.target.value)} />
                  {!isNaN(lpaNum) && lpaNum >= 50 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-danger">
                      <AlertTriangle className="h-3 w-3" /> ≥50 → Extreme A
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* SMuRFS */}
            <Card className="mb-4 border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="font-display text-sm font-bold text-foreground">SMuRFS — Major ASCVD Risk Factors</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Count: <span className="font-bold text-foreground">{smurfCount}/6</span>
              </p>
              <div className="space-y-3">
                {SMURFS.map((s, i) => (
                  <label key={s.key} className="flex cursor-pointer items-start gap-3">
                    <Checkbox checked={selectedSmurfs[i]} onCheckedChange={() => toggleItem(selectedSmurfs, setSelectedSmurfs, i)} className="mt-0.5" />
                    <span className="text-sm leading-snug text-foreground">
                      <span className="font-bold text-primary">{s.letter}</span> — {s.label}
                      {s.isNew && (
                        <span className="ml-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">New 5th SMuRF</span>
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

            {/* Major ASCVD Risk Factors */}
            <Card className="mb-4 border-border bg-card p-5">
              <div className="flex items-center gap-2 mb-1">
                <Heart className="h-4 w-4 text-danger" />
                <h2 className="font-display text-sm font-bold text-foreground">Major ASCVD Risk Factors</h2>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Count: <span className="font-bold text-foreground">{ascvdRFCount}/{MAJOR_ASCVD_RF.length}</span>
              </p>
              <div className="space-y-3">
                {MAJOR_ASCVD_RF.map((rf, i) => (
                  <label key={i} className="flex cursor-pointer items-start gap-3">
                    <Checkbox checked={selectedAscvdRF[i]} onCheckedChange={() => toggleItem(selectedAscvdRF, setSelectedAscvdRF, i)} className="mt-0.5" />
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

            {/* Risk Category Sections with inline LDL-C targets */}
            <InteractiveRiskSection
              title="Very High-Risk Group (VHRG)"
              subtitle="Select if any apply"
              conditions={VHRG_CONDITIONS}
              selected={selectedVHRG}
              onToggle={(i) => toggleItem(selectedVHRG, setSelectedVHRG, i)}
              accent="warning"
            />

            <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-xs text-danger font-medium leading-relaxed mb-4">
              <strong>Note:</strong> LAI uses an <strong>ASCVD-centered model</strong>, not a CAD-only model. Established ASCVD includes CAD, ischemic stroke/TIA of atherosclerotic origin, and PAD. CAD is explicitly mentioned in Category B wording.
            </div>

            <InteractiveRiskSection
              title="Extreme Risk — Category A"
              subtitle="Very-high-risk ASCVD or equivalent features (CAD not mandatory)"
              conditions={EXTREME_A_CONDITIONS}
              selected={selectedExtA}
              onToggle={(i) => toggleItem(selectedExtA, setSelectedExtA, i)}
              accent="danger"
            />

            <InteractiveRiskSection
              title="Extreme Risk — Category B"
              subtitle="CAD + very-high-risk features or recurrent events despite LDL-C <50"
              conditions={EXTREME_B_CONDITIONS}
              selected={selectedExtB}
              onToggle={(i) => toggleItem(selectedExtB, setSelectedExtB, i)}
              accent="danger"
            />

            <InteractiveRiskSection
              title="Extreme Risk — Category C"
              subtitle="Residual-risk phenotype: ongoing ASCVD sequelae despite LDL-C ≤30 mg/dL"
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
                    <div className={`px-5 py-4 ${result === "vhrg" ? "bg-warning/10 text-warning" : "bg-danger/10 text-danger"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 font-display font-bold">
                          {resultInfo.icon}
                          {resultInfo.category}
                        </div>
                        <Button variant="ghost" size="sm" className="no-print" onClick={() => window.print()}>
                          <Printer className="h-4 w-4 mr-1" /> Print Report
                        </Button>
                      </div>
                    </div>

                    <div className="hidden print-only px-5 pt-4">
                      <h2 className="font-display text-lg font-bold text-foreground">LDL-C Target Calculator — Patient Report</h2>
                      <p className="text-xs text-muted-foreground">
                        Generated on {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} • Based on LAI 2023
                      </p>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print-break-inside-avoid">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">LDL-C Target</p>
                          <p className="mt-1 font-display text-lg font-bold text-foreground whitespace-pre-line">{resultInfo.ldlGoal}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Non-HDL-C Target</p>
                          <p className="mt-1 font-display text-lg font-bold text-foreground whitespace-pre-line">{resultInfo.nonHdlGoal}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">ApoB Target</p>
                          <p className="mt-1 font-display text-lg font-bold text-foreground whitespace-pre-line">{resultInfo.apoBGoal}</p>
                        </div>
                      </div>

                      {(ldlAtGoal !== null || nonHdlAtGoal !== null || apoBAtGoal !== null) && (
                        <div className="space-y-2 print-break-inside-avoid">
                          {ldlAtGoal !== null && (
                            <GoalIndicator label={`LDL-C (${currentLDL} mg/dL)`} atGoal={ldlAtGoal} />
                          )}
                          {nonHdlAtGoal !== null && (
                            <GoalIndicator label={`Non-HDL-C (${currentNonHDL} mg/dL)`} atGoal={nonHdlAtGoal} />
                          )}
                          {apoBAtGoal !== null && (
                            <GoalIndicator label={`ApoB (${currentApoB} mg/dL)`} atGoal={apoBAtGoal} />
                          )}
                        </div>
                      )}

                      <div className="print-break-inside-avoid">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Treatment Algorithm</p>
                        <ul className="space-y-2">
                          {resultInfo.treatment.map((step, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{i + 1}</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {result === "extreme-a" && (
                        <p className="text-xs text-muted-foreground italic">
                          *The LDL-C goal of ≤30 mg/dL must be pursued after detailed risk–benefit discussion.
                        </p>
                      )}

                      <div className="rounded-lg border border-border bg-muted/50 p-4 print-break-inside-avoid">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Stroke-Specific Guidance</p>
                        <p className="text-sm text-foreground leading-relaxed">
                          Ischemic stroke patients are classified as <span className="font-semibold">very high-risk</span> (LDL-C &lt;50 mg/dL) or <span className="font-semibold">extreme risk</span> (≤30 mg/dL for Category B).
                        </p>
                        <p className="mt-2 text-sm text-foreground leading-relaxed">
                          CSI/LAI suggest LDL-C <span className="font-semibold">&lt;55 mg/dL</span> with <span className="font-semibold">≥50% reduction</span> from baseline.
                        </p>
                      </div>

                      <div className="hidden print-only border-t border-border pt-3 mt-4">
                        <p className="text-[10px] text-muted-foreground">
                          This report is for informational purposes only. Reference: LAI 2023 Update — Consensus Statement IV.
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-5 text-center">
                    <ShieldCheck className="mx-auto h-10 w-10 text-success mb-2" />
                    <p className="font-display font-semibold text-foreground">No high-risk conditions selected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Select applicable risk factors or consult standard lipid guidelines.
                    </p>
                  </div>
                )}
              </Card>
            )}
          </>
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

function InteractiveRiskSection({
  title,
  subtitle,
  conditions,
  selected,
  onToggle,
  accent,
}: {
  title: string;
  subtitle: string;
  conditions: { label: string; ldl: string }[];
  selected: boolean[];
  onToggle: (i: number) => void;
  accent: string;
}) {
  return (
    <Card className="mb-4 border-border bg-card p-5">
      <h2 className="font-display text-sm font-bold text-foreground">{title}</h2>
      <p className="mb-3 text-xs text-muted-foreground">{subtitle}</p>
      <div className="space-y-2">
        {conditions.map((c, i) => (
          <div key={i}>
            <label className="flex cursor-pointer items-start gap-3">
              <Checkbox checked={selected[i]} onCheckedChange={() => onToggle(i)} className="mt-0.5" />
              <span className="text-sm leading-snug text-foreground">{c.label}</span>
            </label>
            {selected[i] && (
              <div className={`ml-8 mt-1 mb-1 rounded-md px-3 py-1.5 text-xs font-semibold ${
                accent === "danger" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
              }`}>
                <Target className="inline h-3 w-3 mr-1" />
                LDL-C Target: {c.ldl}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
