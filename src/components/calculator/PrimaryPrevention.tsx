import { Card } from "@/components/ui/card";
import { ShieldCheck, AlertTriangle, Heart, Activity } from "lucide-react";

const STEPS = [
  {
    title: "Step 1 — Define Population & Assess Baseline",
    items: [
      "Confirm no clinical ASCVD (no prior MI, stroke, PAD, revascularization).",
      "Obtain fasting or nonfasting lipid panel, A1c, creatinine, urine albumin/creatinine, etc.",
      "Calculate 10‑year ASCVD risk with PREVENT-ASCVD for adults 30–79 y (updated ACC/AHA guideline) or Pooled Cohort Equations where PREVENT is not yet embedded.",
    ],
  },
  {
    title: "Step 2 — Decide on Lipid-Lowering Therapy",
    items: [
      "Threshold to treat: updated guideline recommends initiating lipid‑lowering therapy at 10‑year ASCVD risk ≥5%.",
      "For adults 40–75 y with LDL‑C 70–189 mg/dL and 10‑year risk ≥7.5%, moderate‑ to high‑intensity statin is recommended.",
      "5–7.5% supports moderate‑intensity statin after discussion.",
    ],
  },
  {
    title: "Step 3 — Apply LDL-C Thresholds",
    items: [
      "General primary prevention goal: LDL‑C <100 mg/dL to prevent a first MI or stroke.",
      "Higher‑risk primary prevention (e.g., diabetes, HIV, CKD) — target <70 mg/dL.",
      "If the patient later develops ASCVD and is extremely high risk, aim for <55 mg/dL.",
    ],
  },
  {
    title: "Step 4 — Refine Risk & Intensify If Needed",
    items: [
      "When treatment is uncertain or borderline, use CAC scoring, Lp(a), and apoB to reclassify risk and support earlier therapy.",
      "Start with statin; add ezetimibe, PCSK9 inhibitor, or bempedoic acid if LDL-C goals are not reached or statin intolerance exists.",
    ],
  },
  {
    title: "Step 5 — Lifestyle & Follow-Up",
    items: [
      "Reinforce diet, weight, and physical activity at every visit.",
      "Recheck lipids 4–12 weeks after therapy change, then every 3–12 months to assess adherence and goal attainment.",
    ],
  },
];

const RISK_TIERS = [
  { risk: "Low (<5%)", ldl: "<100 mg/dL", color: "text-success", bg: "bg-success/10" },
  { risk: "Borderline (5–7.5%)", ldl: "<100 mg/dL", note: "consider statin", color: "text-primary", bg: "bg-primary/10" },
  { risk: "Intermediate (7.5–20%)", ldl: "<70 mg/dL", color: "text-warning", bg: "bg-warning/10" },
  { risk: "High (≥20%)", ldl: "<55 mg/dL", color: "text-danger", bg: "bg-danger/10" },
];

export default function PrimaryPrevention() {
  return (
    <div className="space-y-4">
      {/* LDL-C Targets by 10-Year Risk */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground">
            Primary Prevention LDL-C Targets by 10-Year ASCVD Risk
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {RISK_TIERS.map((t) => (
            <div key={t.risk} className={`rounded-lg ${t.bg} px-4 py-3`}>
              <p className={`text-xs font-semibold ${t.color}`}>{t.risk}</p>
              <p className="text-lg font-bold text-foreground mt-1">{t.ldl}</p>
              {t.note && <p className="text-xs text-muted-foreground">{t.note}</p>}
            </div>
          ))}
        </div>
      </Card>

      {/* 5-Step Workflow */}
      {STEPS.map((step, i) => (
        <Card key={i} className="border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {i + 1}
            </span>
            <div className="flex-1">
              <h3 className="font-display text-sm font-bold text-foreground mb-2">{step.title}</h3>
              <ul className="space-y-1.5">
                {step.items.map((item, j) => (
                  <li key={j} className="text-sm text-foreground leading-relaxed flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      ))}

      {/* Diabetes Day-1 Treatment */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="h-4 w-4 text-danger" />
          <h3 className="font-display text-sm font-bold text-foreground">
            Diabetes & Dyslipidemia — Day 1 Treatment
          </h3>
        </div>
        <p className="text-sm text-foreground leading-relaxed mb-3">
          All patients with diabetes mellitus should be initiated on dyslipidemia treatment <strong>on day 1 of diagnosis</strong>. Targets must be attained by <strong>week 12</strong>.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3 font-semibold text-muted-foreground">Scenario</th>
                <th className="text-left py-2 font-semibold text-muted-foreground">LDL-C Target</th>
              </tr>
            </thead>
            <tbody className="text-foreground">
              <tr className="border-b border-border/50">
                <td className="py-2 pr-3">Diabetes mellitus (baseline)</td>
                <td className="py-2 font-semibold">&lt;70 mg/dL</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-3">Diabetes + target organ damage or ≥2 major ASCVD RF</td>
                <td className="py-2 font-semibold">&lt;50 mg/dL</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-2 pr-3">Diabetes + ASCVD (Extreme Risk A)</td>
                <td className="py-2 font-semibold">≤30 mg/dL (optional)</td>
              </tr>
              <tr>
                <td className="py-2 pr-3">ASCVD + Diabetes with TOD or ≥2 major ASCVD RF</td>
                <td className="py-2 font-semibold">≤30 mg/dL</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ASCVD & ACS Management */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground">ASCVD & ACS Management</h3>
        </div>
        <ul className="space-y-2 text-sm text-foreground leading-relaxed">
          <li>• All ASCVD patients must achieve <strong>LDL-C &lt;50 mg/dL</strong>.</li>
          <li>• Recurrent ACS or polyvascular disease (Extreme Risk B): target <strong>≤30 mg/dL</strong>.</li>
          <li>• In ACS: lipid profile at <strong>emergency triage</strong>, repeat within <strong>2 weeks</strong> of initiating therapy.</li>
          <li>• Start <strong>combination therapy</strong> (high-intensity statin + ezetimibe) at presentation to ED.</li>
          <li>• Intensify every <strong>2 weeks</strong> until goals achieved, preferably by <strong>week 4</strong>.</li>
        </ul>
      </Card>

      {/* Subclinical Atherosclerosis */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground leading-relaxed">
        <strong>Subclinical Atherosclerosis:</strong> Any form — including nonobstructive carotid, femoral, or coronary plaques or ABI &lt;0.9 — is considered <strong>equivalent to ASCVD</strong>, with similar LDL-C targets as for clinically manifest ASCVD.
      </div>

      {/* High-Risk Features */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <h3 className="font-display text-sm font-bold text-foreground">High-Risk Features (LDL-C Target &lt;70 mg/dL)</h3>
        </div>
        <ul className="space-y-1.5 text-sm text-foreground leading-relaxed">
          <li>• Nonalcoholic fatty liver disease with fibrosis grades II and III</li>
          <li>• Metabolic syndrome</li>
          <li>• Chronic kidney disease stage 3B/4</li>
          <li>• ApoB &gt;130 mg/dL</li>
          <li>• Lp(a) ≥50 mg/dL</li>
          <li>• CAC score 1–99 but &lt;75th percentile for age, gender, and ethnic group</li>
          <li>• Extreme elevation of a single risk factor</li>
        </ul>
      </Card>

      {/* Risk Modifiers */}
      <Card className="border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-bold text-foreground">Risk Modifiers (May Upgrade Low/Moderate → Higher Risk)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm text-foreground leading-relaxed">
          <span>• Elevated TG (fasting &gt;150 or nonfasting &gt;175 mg/dL)</span>
          <span>• Lp(a) 20–49 mg/dL</span>
          <span>• Increased waist circumference (&gt;90 cm ♂, &gt;80 cm ♀)</span>
          <span>• Impaired fasting glucose (100–125 mg/dL)</span>
          <span>• hsCRP &gt;2 mg/L</span>
          <span>• Air pollution exposure</span>
          <span>• Inflammatory joint diseases</span>
          <span>• Premature menopause</span>
          <span>• Preeclampsia / Gestational diabetes</span>
          <span>• Polycystic ovary syndrome</span>
          <span>• High polygenic risk score</span>
          <span>• HIV infection</span>
        </div>
      </Card>
    </div>
  );
}
