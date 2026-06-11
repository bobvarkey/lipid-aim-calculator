import { useState, useMemo } from "react";
import { ScanLine, Info, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type CacRangeId = "0" | "1-99" | "100-399" | ">=400";

type CacRow = {
  id: CacRangeId;
  label: string;
  action: string;
  ldl: string;
  tone: "emerald" | "amber" | "orange" | "danger";
  match: (v: number) => boolean;
  actionCitation: string;
  ldlCitation: string;
};

const ROWS: CacRow[] = [
  {
    id: "0",
    label: "0",
    action: "Low risk — statin generally deferrable",
    ldl: "<100 mg/dL (<2.6 mmol/L)",
    tone: "emerald",
    match: (v) => v === 0,
    actionCitation:
      "2018 ACC/AHA Cholesterol Guideline (Grundy SM et al., Circulation 2019): CAC = 0 in borderline/intermediate-risk adults supports withholding or deferring statin; reassess in 5–10 y.",
    ldlCitation:
      "LAI 2023 Consensus Statement IV — low-risk primary prevention LDL-C goal <100 mg/dL.",
  },
  {
    id: "1-99",
    label: "1–99 AU",
    action: "Start moderate-intensity statin",
    ldl: "<70 mg/dL (<1.8 mmol/L)",
    tone: "amber",
    match: (v) => v >= 1 && v <= 99,
    actionCitation:
      "2026 ACC/AHA Primary Prevention Guideline update: any CAC >0, particularly age ≥55 y or with risk-enhancers, favors moderate-intensity statin initiation.",
    ldlCitation:
      "LAI 2023 Consensus Statement IV — intermediate-risk LDL-C target <70 mg/dL.",
  },
  {
    id: "100-399",
    label: "100–399 AU",
    action: "High-intensity statin",
    ldl: "<55 mg/dL (<1.4 mmol/L)",
    tone: "orange",
    match: (v) => v >= 100 && v <= 399,
    actionCitation:
      "MESA (McClelland RL, JACC 2015) & 2018 ACC/AHA: CAC ≥100 or ≥75th percentile is a guideline-endorsed trigger for high-intensity statin.",
    ldlCitation:
      "LAI 2023 Consensus Statement IV / 2019 ESC-EAS dyslipidaemia: high-risk LDL-C target <55 mg/dL.",
  },
  {
    id: ">=400",
    label: "≥400 AU",
    action: "Very high-intensity — statin + ezetimibe ± PCSK9i",
    ldl: "<40 mg/dL (<1.0 mmol/L)",
    tone: "danger",
    match: (v) => v >= 400,
    actionCitation:
      "Budoff MJ et al., JACC 2018; CAC ≥400 confers event rates comparable to secondary prevention — maximally tolerated lipid-lowering therapy advised.",
    ldlCitation:
      "LAI 2023 Consensus Statement IV (Very-High-Risk Group) — LDL-C goal <40 mg/dL when CAC ≥400 or established ASCVD.",
  },
];

const TONE: Record<
  CacRow["tone"],
  { border: string; bg: string; pill: string; text: string; row: string }
> = {
  emerald: {
    border: "border-emerald-500/50",
    bg: "bg-emerald-500/[0.08]",
    pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    text: "text-emerald-700 dark:text-emerald-400",
    row: "ring-1 ring-emerald-500/40",
  },
  amber: {
    border: "border-amber-500/50",
    bg: "bg-amber-500/[0.08]",
    pill: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    text: "text-amber-700 dark:text-amber-400",
    row: "ring-1 ring-amber-500/40",
  },
  orange: {
    border: "border-orange-500/50",
    bg: "bg-orange-500/[0.08]",
    pill: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
    text: "text-orange-700 dark:text-orange-400",
    row: "ring-1 ring-orange-500/40",
  },
  danger: {
    border: "border-danger/50",
    bg: "bg-danger/[0.08]",
    pill: "bg-danger/15 text-danger",
    text: "text-danger",
    row: "ring-1 ring-danger/40",
  },
};

function Cite({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary transition-colors align-middle"
          aria-label="View citation"
        >
          <Info className="h-2.5 w-2.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-snug">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function CacManagementFootnote() {
  const [cacInput, setCacInput] = useState<string>("");
  const [manual, setManual] = useState<CacRangeId | null>(null);

  const parsedCac = useMemo(() => {
    const n = parseFloat(cacInput);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [cacInput]);

  const autoId = useMemo(() => {
    if (parsedCac === null) return null;
    return ROWS.find((r) => r.match(parsedCac))?.id ?? null;
  }, [parsedCac]);

  const activeId = manual ?? autoId;
  const activeRow = ROWS.find((r) => r.id === activeId);

  return (
    <footer className="mt-4 rounded-lg border border-[hsl(245_70%_55%)]/30 bg-[hsl(245_70%_55%)]/[0.04] p-4">
      <div className="flex items-center gap-2 mb-2">
        <ScanLine className="h-3.5 w-3.5 text-[hsl(245_70%_55%)]" />
        <p className="text-xs font-bold uppercase tracking-wider text-[hsl(245_70%_55%)]">
          Footnote — Subclinical Atherosclerosis: CAC Score Management
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3">
        Enter the patient's CAC score or tap a row to see the matching LDL-C target and statin
        intensity. Hover the
        <Info className="inline h-2.5 w-2.5 mx-1 align-middle" />
        icons for guideline citations.
      </p>

      {/* CAC input */}
      <div className="flex items-center gap-2 mb-3">
        <label className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
          CAC score (AU):
        </label>
        <Input
          type="number"
          min={0}
          inputMode="numeric"
          value={cacInput}
          onChange={(e) => {
            setCacInput(e.target.value);
            setManual(null);
          }}
          placeholder="e.g. 145"
          className="h-8 w-28 text-sm"
        />
        {parsedCac !== null && activeRow && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[activeRow.tone].pill}`}
          >
            Matches {activeRow.label}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-border bg-card">
        <table className="w-full text-[11px] sm:text-xs">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground bg-muted/30">
              <th className="py-2 px-3 font-semibold">CAC Score</th>
              <th className="py-2 px-3 font-semibold">Risk / Action</th>
              <th className="py-2 px-3 font-semibold">LDL-C Target</th>
            </tr>
          </thead>
          <tbody className="text-foreground">
            {ROWS.map((r) => {
              const isActive = activeId === r.id;
              const t = TONE[r.tone];
              return (
                <tr
                  key={r.id}
                  onClick={() => setManual(isActive ? null : r.id)}
                  className={`border-b border-border/50 last:border-0 cursor-pointer transition-all ${
                    isActive ? `${t.bg} ${t.row}` : "hover:bg-muted/40"
                  }`}
                >
                  <td className={`py-2 px-3 font-semibold ${isActive ? t.text : ""}`}>
                    {r.label}
                  </td>
                  <td className="py-2 px-3">
                    <span className={isActive ? "font-semibold" : ""}>{r.action}</span>
                    <Cite text={r.actionCitation} />
                  </td>
                  <td className={`py-2 px-3 ${isActive ? `font-bold ${t.text}` : ""}`}>
                    {r.ldl}
                    <Cite text={r.ldlCitation} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Active summary */}
      {activeRow && (
        <div
          className={`mt-3 rounded-md border ${TONE[activeRow.tone].border} ${TONE[activeRow.tone].bg} p-2.5`}
        >
          <div className="flex items-start gap-2">
            <Target className={`h-3.5 w-3.5 mt-0.5 ${TONE[activeRow.tone].text}`} />
            <div className="flex-1">
              <p
                className={`text-[11px] font-bold uppercase tracking-wider ${TONE[activeRow.tone].text}`}
              >
                Recommended for CAC {activeRow.label}
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">{activeRow.ldl}</p>
              <span
                className={`inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${TONE[activeRow.tone].pill}`}
              >
                {activeRow.action}
              </span>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-[10px] text-muted-foreground leading-snug">
        Sources: 2026 ACC/AHA Primary Prevention Guideline; LAI 2023 Consensus Statement IV;
        MESA (McClelland 2015); Budoff JACC 2018; 2019 ESC/EAS dyslipidaemia guidelines.
      </p>
    </footer>
  );
}
