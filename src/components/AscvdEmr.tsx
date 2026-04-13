import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Activity, ClipboardCopy, ArrowLeft, AlertTriangle, Heart, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ASCVD_ESTABLISHED, SUBCLINICAL_ITEMS, HIGH_CAC_ITEMS, CKD_ITEMS,
  FHX_ITEMS, EXTREME_ELEVATION_ITEMS, TOD_MICROVASCULAR, TOD_MACROVASCULAR,
  TOD_ALL, countCheckedItems, type SubItem,
} from "@/lib/clinicalConstants";

// ─── Sub-checklist renderer ───
function SubChecklist({
  items, checked, toggle, title,
}: {
  items: SubItem[]; checked: Record<string, boolean>;
  toggle: (id: string) => void; title: string;
}) {
  return (
    <div className="ml-8 mt-2 mb-1 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{title}</p>
      {items.map((item) => (
        <label
          key={item.id}
          className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
            checked[item.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
          }`}
        >
          <Checkbox checked={!!checked[item.id]} onCheckedChange={() => toggle(item.id)} className="mt-0.5" />
          <div className="flex-1 min-w-0">
            <span className="text-sm leading-snug text-foreground">{item.label}</span>
            {item.qualifier && (
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{item.qualifier}</p>
            )}
          </div>
        </label>
      ))}
    </div>
  );
}

// ─── TOD sub-checklist (micro + macro) ───
function TodSubChecklist({
  checked, toggle, colorClass = "warning",
}: {
  checked: Record<string, boolean>; toggle: (id: string) => void; colorClass?: string;
}) {
  return (
    <div className="ml-8 mt-2 mb-1 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        Target Organ Damage Criteria (≥1 microvascular or macrovascular required):
      </p>
      {([
        { title: "Microvascular", items: TOD_MICROVASCULAR },
        { title: "Macrovascular / Cardiac", items: TOD_MACROVASCULAR },
      ] as const).map(({ title, items }) => (
        <div key={title}>
          <p className={`text-[11px] font-bold text-${colorClass}/80 uppercase tracking-wide mb-1.5`}>{title}</p>
          <div className="space-y-1.5">
            {items.map((tod) => (
              <label
                key={tod.id}
                className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                  checked[tod.id] ? `bg-${colorClass}/10 ring-1 ring-${colorClass}/15` : "hover:bg-muted/50"
                }`}
              >
                <Checkbox checked={!!checked[tod.id]} onCheckedChange={() => toggle(tod.id)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm leading-snug text-foreground">{tod.label}</span>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{tod.qualifier}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Qualifier sections config ───
const ASCVD_HISTORY_ITEMS = [
  { id: "q_ascvd", label: "Established ASCVD", subKey: "ascvd" as const },
  { id: "q_cac", label: "High coronary calcium / extensive plaque burden", subKey: "cac" as const },
  { id: "q_ckd", label: "CKD Stage 3B/4", subKey: "ckd" as const },
  { id: "q_fhx", label: "Family history of premature CHD / ASCVD", subKey: "fhx" as const },
  { id: "q_dmtod", label: "Diabetes with target organ damage", subKey: "dmtod" as const },
  { id: "q_subclinical", label: "Subclinical atherosclerosis", subKey: "subclinical" as const },
  { id: "q_extreme", label: "Extreme elevation of a single risk factor", subKey: "extreme" as const },
];

const SUB_MAP: Record<string, SubItem[]> = {
  ascvd: ASCVD_ESTABLISHED,
  cac: HIGH_CAC_ITEMS,
  ckd: CKD_ITEMS,
  fhx: FHX_ITEMS,
  subclinical: SUBCLINICAL_ITEMS,
  extreme: EXTREME_ELEVATION_ITEMS,
};

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
    name: "John Doe", age: 52, sex: "Male", mrn: "123456",
  });
  const [data, setData] = useState<PatientData>({
    ascvd: false, diabetes: true, smoker: false, htn: true,
    ldl: 140, hdl: 38, hba1c: 7.5,
  });
  const [qChecked, setQChecked] = useState<Record<string, boolean>>({});

  const toggleQ = (id: string) =>
    setQChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  // ─── Auto-qualification logic ───
  const autoQual = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const item of ASCVD_HISTORY_ITEMS) {
      if (item.subKey === "dmtod") {
        map[item.id] = countCheckedItems(TOD_ALL, qChecked) >= 1;
      } else {
        const sub = SUB_MAP[item.subKey];
        map[item.id] = sub ? countCheckedItems(sub, qChecked) >= 1 : !!qChecked[item.id];
      }
    }
    return map;
  }, [qChecked]);

  const qualifiedCount = ASCVD_HISTORY_ITEMS.filter((i) => autoQual[i.id]).length;

  // ─── Risk calc ───
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
  const category = data.ascvd || risk >= 20 ? "HIGH" : risk >= 7.5 ? "INTERMEDIATE" : risk >= 5 ? "BORDERLINE" : "LOW";
  const colorClass = category === "HIGH" ? "bg-danger/10 text-danger" : category === "LOW" ? "bg-success/10 text-success" : "bg-warning/10 text-warning";
  const ldlTarget = category === "HIGH" ? "<50 mg/dL" : category === "LOW" ? "<100 mg/dL" : "<70 mg/dL";
  const treatment = category === "HIGH" ? "High-intensity statin ± ezetimibe ± PCSK9" : category === "LOW" ? "Lifestyle only" : "Moderate-intensity statin";

  // ─── Status badge ───
  const getStatusBadge = (item: typeof ASCVD_HISTORY_ITEMS[0]) => {
    const sub = item.subKey === "dmtod" ? TOD_ALL : SUB_MAP[item.subKey];
    if (!sub) return null;
    const count = countCheckedItems(sub, qChecked);
    const met = autoQual[item.id];
    return (
      <span className={`ml-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
        met ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"
      }`}>
        {count}/{sub.length} — {met ? "Qualified ✓" : "≥1 required"}
      </span>
    );
  };

  // ─── EMR Note ───
  const generateNote = useMemo(() => {
    const lines: string[] = [];
    lines.push("═══ ASCVD RISK ASSESSMENT ═══");
    lines.push(`Patient: ${patient.name} (${patient.mrn})`);
    lines.push(`Age: ${patient.age}, Sex: ${patient.sex}`);
    lines.push(`Date: ${new Date().toLocaleDateString()}`);
    lines.push("");

    lines.push("▸ CONDITIONS:");
    if (data.ascvd) lines.push("  ✓ Established ASCVD");
    if (data.diabetes) lines.push("  ✓ Diabetes mellitus");
    if (data.smoker) lines.push("  ✓ Active smoker");
    if (data.htn) lines.push("  ✓ Hypertension");
    lines.push("");

    lines.push("▸ LABS:");
    lines.push(`  LDL-C: ${data.ldl} mg/dL`);
    lines.push(`  HDL-C: ${data.hdl} mg/dL`);
    lines.push(`  HbA1c: ${data.hba1c}%`);
    lines.push("");

    lines.push(`▸ 10-YEAR ASCVD RISK: ${risk.toFixed(1)}%`);
    lines.push(`  Category: ${category}`);
    lines.push(`  LDL Target: ${ldlTarget}`);
    lines.push(`  Plan: ${treatment}`);
    lines.push("");

    // Qualifier section
    const qualChecked = ASCVD_HISTORY_ITEMS.filter((i) => autoQual[i.id]);
    if (qualChecked.length > 0) {
      lines.push(`▸ ASCVD HISTORY & EXTREME RISK MODIFIERS (${qualChecked.length}/${ASCVD_HISTORY_ITEMS.length}):`);
      for (const item of qualChecked) {
        lines.push(`  ✓ ${item.label}`);
        if (item.subKey === "dmtod") {
          const micro = TOD_MICROVASCULAR.filter((t) => qChecked[t.id]);
          const macro = TOD_MACROVASCULAR.filter((t) => qChecked[t.id]);
          if (micro.length > 0) {
            lines.push("      Microvascular:");
            micro.forEach((t) => lines.push(`        • ${t.label}`));
          }
          if (macro.length > 0) {
            lines.push("      Macrovascular/Cardiac:");
            macro.forEach((t) => lines.push(`        • ${t.label}`));
          }
        } else if (item.subKey === "fhx") {
          const fhxChecked = FHX_ITEMS.filter((f) => qChecked[f.id]);
          fhxChecked.forEach((f) => lines.push(`      • ${f.label}`));
        } else {
          const sub = SUB_MAP[item.subKey];
          if (sub) {
            sub.filter((s) => qChecked[s.id]).forEach((s) => lines.push(`      • ${s.label}`));
          }
        }
      }
      lines.push("");
    }

    lines.push("▸ FOLLOW-UP:");
    lines.push("  Repeat lipids in 6–12 months.");

    return lines.join("\n");
  }, [patient, data, risk, category, ldlTarget, treatment, qChecked, autoQual]);

  const toggles: (keyof PatientData)[] = ["ascvd", "diabetes", "smoker", "htn"];
  const labs: (keyof PatientData)[] = ["ldl", "hdl", "hba1c"];

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-6">
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

        {/* Patient Header */}
        <Card className="border-border bg-card p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(["name", "mrn"] as const).map((k) => (
              <div key={k}>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">{k === "mrn" ? "MRN" : "Patient Name"}</label>
                <Input value={patient[k]} onChange={(e) => setPatient({ ...patient, [k]: e.target.value })} />
              </div>
            ))}
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
                <Checkbox checked={data[k] as boolean} onCheckedChange={() => setData({ ...data, [k]: !data[k] })} />
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
                <Input type="number" value={data[lab] as number} onChange={(e) => setData({ ...data, [lab]: +e.target.value })} />
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

        {/* ─── ASCVD History & Extreme Risk Modifiers ─── */}
        <Card className="border-border bg-card p-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <h3 className="font-display text-sm font-bold text-foreground">
                ASCVD History & Extreme Risk Modifiers
              </h3>
            </div>
            {qualifiedCount > 0 && (
              <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning">
                {qualifiedCount}/{ASCVD_HISTORY_ITEMS.length}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Expand sub-criteria to auto-qualify each category. All selections are reflected in the EMR note.
          </p>
          <div className="space-y-2">
            {ASCVD_HISTORY_ITEMS.map((item) => {
              const isQualified = autoQual[item.id];
              return (
                <div key={item.id}>
                  <div
                    className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                      isQualified ? "bg-warning/8 ring-1 ring-warning/20" : "hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox checked={isQualified} disabled className="mt-0.5" />
                    <div className="flex-1">
                      <span className="text-sm leading-snug text-foreground">{item.label}</span>
                      {getStatusBadge(item)}
                    </div>
                  </div>

                  {/* Sub-checklists */}
                  {item.subKey === "ascvd" && (
                    <SubChecklist items={ASCVD_ESTABLISHED} checked={qChecked} toggle={toggleQ}
                      title="Select applicable ASCVD manifestations (≥1 required):" />
                  )}
                  {item.subKey === "cac" && (
                    <SubChecklist items={HIGH_CAC_ITEMS} checked={qChecked} toggle={toggleQ}
                      title="Select applicable high CAC / plaque burden findings (≥1 required):" />
                  )}
                  {item.subKey === "ckd" && (
                    <SubChecklist items={CKD_ITEMS} checked={qChecked} toggle={toggleQ}
                      title="Select CKD stage and albuminuria status (≥1 required):" />
                  )}
                  {item.subKey === "subclinical" && (
                    <SubChecklist items={SUBCLINICAL_ITEMS} checked={qChecked} toggle={toggleQ}
                      title="Select applicable subclinical findings (≥1 required):" />
                  )}
                  {item.subKey === "extreme" && (
                    <SubChecklist items={EXTREME_ELEVATION_ITEMS} checked={qChecked} toggle={toggleQ}
                      title="Select applicable extreme risk factor elevations (≥1 required):" />
                  )}
                  {item.subKey === "fhx" && (
                    <div className="ml-8 mt-2 mb-1 space-y-1.5 rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Premature CHD / ASCVD: event in a 1st-degree relative before sex-specific age cutoff (≥1 required):
                      </p>
                      <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
                        "Premature" = CHD or atherosclerotic CVD event in a <strong className="text-foreground">male &lt;55 y</strong> or <strong className="text-foreground">female &lt;65 y</strong>.
                      </p>
                      {FHX_ITEMS.map((f) => (
                        <label
                          key={f.id}
                          className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2.5 py-1.5 transition-colors text-sm ${
                            qChecked[f.id] ? "bg-warning/10 ring-1 ring-warning/15" : "hover:bg-muted/50"
                          }`}
                        >
                          <Checkbox checked={!!qChecked[f.id]} onCheckedChange={() => toggleQ(f.id)} className="mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm leading-snug text-foreground">{f.label}</span>
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{f.qualifier}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  {item.subKey === "dmtod" && (
                    <TodSubChecklist checked={qChecked} toggle={toggleQ} />
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        {/* EMR Note */}
        <Card className="border-border bg-card p-5">
          <h3 className="font-display text-sm font-bold text-foreground mb-3">EMR Note</h3>
          <textarea
            value={generateNote}
            readOnly
            className="w-full h-64 rounded-lg border border-input bg-background p-3 text-sm text-foreground font-mono resize-none"
          />
          <Button
            onClick={() => {
              navigator.clipboard.writeText(generateNote);
              toast.success("Note copied to clipboard");
            }}
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
