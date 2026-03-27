import { lazy, Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Activity } from "lucide-react";

const MermaidChart = lazy(() => import("@/components/MermaidChart"));

const CLINICAL_CHART = `flowchart TD
    A[Start: Patient with Dyslipidemia / Diabetes] --> B{High-Risk Features?}
    B -->|Yes| C[High-Risk Features - LDL-C target less than 70 mg/dL]
    C --> C1[NAFLD with fibrosis II/III]
    C --> C2[Metabolic syndrome]
    C --> C3[CKD stage 3B/4]
    C --> C4[ApoB greater than 130 mg/dL]
    C --> C5[Lp a 50 mg/dL or higher]
    C --> C6[CAC 1-99 but under 75th percentile]
    C --> C7[Extreme elevation of one RF]
    B -->|No / Some| D[Risk Modifiers]
    D --> D1[TG fasting over 150 or nonfasting over 175]
    D --> D2[Lp a 20-49 mg/dL]
    D --> D3[Increased waist circumference]
    D --> D4[Impaired fasting glucose 100-125]
    D --> D5[hsCRP over 2 mg/L]
    D --> D6[Air pollution exposure]
    D --> D7[Inflammatory joint disease]
    D --> D8[Premature menopause]
    D --> D9[Preeclampsia / GDM]
    D --> D10[PCOS]
    D --> D11[High polygenic risk score]
    D --> D12[HIV infection]
    A --> E[Diabetes mellitus diagnosed]
    E --> E1[Initiate dyslipidemia therapy on Day 1]
    E1 --> E2[Aim target LDL-C by Week 12]
    E2 --> E3[DM baseline: LDL-C under 70]
    E2 --> E4[DM + TOD or 2+ ASCVD RF: LDL-C under 50]
    E2 --> E5[DM + ASCVD Extreme A: LDL-C 30 or less]
    E2 --> E6[ASCVD + DM with TOD: LDL-C 30 or less]
    A --> F[ASCVD or ACS]
    F --> F1[All ASCVD: LDL-C under 50]
    F --> F2[Recurrent ACS / polyvascular: LDL-C 30 or less]
    F --> F3[ACS: lipid at triage, repeat by 2 weeks]
    F --> F4[Start statin + ezetimibe at ED]
    F --> F5[Intensify every 2 weeks, goal by Week 4]
    A --> G[Subclinical Atherosclerosis]
    G --> G1[Nonobstructive carotid/femoral/coronary plaque]
    G --> G2[ABI under 0.9]
    G --> G3[Manage as ASCVD: same LDL-C targets]
    A --> H[SMuRFS: 0-5 SMuRFs]
    H --> H1[S - Smoking]
    H --> H2[M - Male 45 y or older]
    H --> H3[u - uncontrolled DM HbA1c over 7%]
    H --> H4[R - eGFR under 60]
    H --> H5[F - FH / strong family history]
    H --> H6[S* - hsCRP 2 mg/L or higher]`;

export default function ClinicalGuidance() {
  return (
    <div className="space-y-4">
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground">Clinical Decision Flowchart</h3>
          <span className="text-[10px] text-muted-foreground ml-auto">Zoomable · Drag to pan</span>
        </div>
        <Suspense fallback={<div className="text-sm text-muted-foreground text-center py-8">Loading flowchart...</div>}>
          <MermaidChart className="w-full" chart={CLINICAL_CHART} />
        </Suspense>
      </Card>
    </div>
  );
}
