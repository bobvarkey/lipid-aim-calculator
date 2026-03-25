import { useState, lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, ClipboardCopy, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MermaidChart = lazy(() => import("@/components/MermaidChart"));

const PRIMARY_PREVENTION_CHART = `flowchart TD
    A[Start: Adult 40-79 y, Primary Prevention] --> B{Has clinical ASCVD?}
    B -->|Yes| C[Established ASCVD]
    C --> C1[Secondary prevention: statin + BP/lifestyle]
    C --> C2[Reassess risk factors and LDL periodically]
    B -->|No| D[Estimate 10-year ASCVD risk]
    D --> D1[Inputs: age, sex, race, TC, HDL, SBP, BP meds, diabetes, smoking]
    D --> D2[Use Pooled Cohort Equations PCE]
    D --> D3[Use ACC/AHA ASCVD Risk Estimator]
    D3 --> E{10-year ASCVD risk}
    E -->|Less than 5%| F[Low risk]
    E -->|5-7.4%| G[Borderline risk]
    E -->|7.5-19.9%| H[Intermediate risk]
    E -->|20% or higher| I[High risk]
    F --> F1[Statin not routinely indicated; lifestyle only]
    G --> G1[Statin may be considered after risk discussion]
    H --> H1[Statin usually indicated moderate to high intensity]
    I --> I1[High-intensity statin + risk factor control]
    H --> J{Uncertain / hesitant?}
    I --> J
    J -->|Yes| K[Add risk-enhancing factors]
    K --> K1[Family history early ASCVD]
    K --> K2[Metabolic syndrome / obesity]
    K --> K3[Chronic inflammatory disease]
    K --> K4[Chronic kidney disease]
    K --> K5[Selected biomarkers e.g. hsCRP, Lp a]
    K --> K6[Consider CAC score 0 vs over 100]
    K6 --> K7[CAC = 0: downgrade risk]
    K6 --> K8[CAC 100 or higher or rapid progression: upgrade risk / statin]
    K7 --> L[Clinician-patient risk discussion]
    K8 --> L
    L --> L1[Discuss estimated risk, treatment benefits, side effects]
    L --> L2[Set LDL-C and BP targets]
    L --> L3[Align with AHA-ACC lipid guideline]`;

interface PatientData {
  ascvd: boolean;
  diabetes: boolean;
  smoker: boolean;
  htn: boolean;
  ldl: number;
  hdl: number;
  hba1c: number;
}

export default function AscvdEmr() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState({
    name: "John Doe",
    age: 52,
    sex: "Male",
    mrn: "123456",
  });

  const [data, setData] = useState<PatientData>({
    ascvd: false,
    diabetes: true,
    smoker: false,
    htn: true,
    ldl: 140,
    hdl: 38,
    hba1c: 7.5,
  });

  const calculateRisk = () => {
    let risk = 0;
    risk += (patient.age - 30) * 0.6;
    risk += (data.ldl - 100) * 0.12;
    risk -= (data.hdl - 40) * 0.25;
    if (data.smoker) risk += 10;
    if (data.diabetes) risk += 12;
    if (data.htn) risk += 6;
    return Math.max(1, Math.min(risk, 35));
  };

  const risk = calculateRisk();

  const category =
    data.ascvd || risk >= 20
      ? "HIGH"
      : risk >= 7.5
      ? "INTERMEDIATE"
      : risk >= 5
      ? "BORDERLINE"
      : "LOW";

  const colorClass =
    category === "HIGH"
      ? "bg-danger/10 text-danger"
      : category === "LOW"
      ? "bg-success/10 text-success"
      : "bg-warning/10 text-warning";

  const ldlTarget =
    category === "HIGH"
      ? "<50 mg/dL"
      : category === "LOW"
      ? "<100 mg/dL"
      : "<70 mg/dL";

  const treatment =
    category === "HIGH"
      ? "High-intensity statin ± ezetimibe ± PCSK9"
      : category === "LOW"
      ? "Lifestyle only"
      : "Moderate-intensity statin";

  const generateNote = () =>
    `ASCVD RISK ASSESSMENT
Patient: ${patient.name} (${patient.mrn})
Age: ${patient.age}, Sex: ${patient.sex}

10-year ASCVD Risk: ${risk.toFixed(1)}%
Risk Category: ${category}
LDL Target: ${ldlTarget}

Plan:
${treatment}

Follow-up:
Repeat lipids in 6–12 months.`;

  const toggles: (keyof PatientData)[] = ["ascvd", "diabetes", "smoker", "htn"];
  const labs: (keyof PatientData)[] = ["ldl", "hdl", "hba1c"];

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Calculator
        </Button>

        <div className="text-center mb-6">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            ASCVD Risk Assessment
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            ACC/AHA Primary Prevention Pathway with EMR Note Generator
          </p>
        </div>

        {/* ACC/AHA Primary Prevention Flowchart */}
        <Card className="border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-bold text-foreground">
              ACC/AHA Primary Prevention Decision Pathway
            </h3>
          </div>
          <Suspense fallback={<div className="text-sm text-muted-foreground text-center py-8">Loading flowchart...</div>}>
            <MermaidChart chart={PRIMARY_PREVENTION_CHART} className="w-full" />
          </Suspense>
        </Card>

        {/* Patient Header */}
        <Card className="border-border bg-card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Patient Name</label>
              <Input value={patient.name} onChange={(e) => setPatient({ ...patient, name: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">MRN</label>
              <Input value={patient.mrn} onChange={(e) => setPatient({ ...patient, mrn: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Age</label>
              <Input type="number" value={patient.age} onChange={(e) => setPatient({ ...patient, age: +e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Sex</label>
              <Input value={patient.sex} onChange={(e) => setPatient({ ...patient, sex: e.target.value })} />
            </div>
          </div>
        </Card>

        {/* Quick Toggles */}
        <Card className="border-border bg-card p-5">
          <h3 className="font-display text-sm font-bold text-foreground mb-3">Conditions</h3>
          <div className="flex gap-3 flex-wrap">
            {toggles.map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={data[k] as boolean}
                  onCheckedChange={() => setData({ ...data, [k]: !data[k] })}
                />
                <span className="text-sm font-medium text-foreground">{k.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Labs */}
        <Card className="border-border bg-card p-5">
          <h3 className="font-display text-sm font-bold text-foreground mb-3">Lab Values</h3>
          <div className="grid grid-cols-3 gap-4">
            {labs.map((lab) => (
              <div key={lab}>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">{lab.toUpperCase()}</label>
                <Input
                  type="number"
                  value={data[lab] as number}
                  onChange={(e) => setData({ ...data, [lab]: +e.target.value })}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Risk Card */}
        <Card className={`border-border p-5 ${colorClass}`}>
          <div className="text-3xl font-display font-bold">{risk.toFixed(1)}%</div>
          <div className="text-sm font-semibold mt-1">{category} RISK</div>
          <div className="mt-3 text-sm">
            <span className="font-semibold">LDL Target:</span> {ldlTarget}
          </div>
          <div className="text-sm">
            <span className="font-semibold">Plan:</span> {treatment}
          </div>
        </Card>

        {/* EMR Note */}
        <Card className="border-border bg-card p-5">
          <h3 className="font-display text-sm font-bold text-foreground mb-3">EMR Note</h3>
          <textarea
            value={generateNote()}
            readOnly
            className="w-full h-48 rounded-lg border border-input bg-background p-3 text-sm text-foreground font-mono resize-none"
          />
          <Button
            onClick={() => navigator.clipboard.writeText(generateNote())}
            className="w-full mt-3 gap-2"
          >
            <ClipboardCopy className="h-4 w-4" />
            Copy to EMR
          </Button>
        </Card>
      </div>
    </div>
  );
}
