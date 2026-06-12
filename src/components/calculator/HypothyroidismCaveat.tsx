import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function Cite({ n, text }: { n: number; text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary transition-colors align-middle"
          aria-label={`Citation ${n}`}
        >
          <Info className="h-2.5 w-2.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-[11px] leading-snug">
        <span className="font-semibold text-primary">[{n}]</span> {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function HypothyroidismCaveat() {
  return (
    <footer className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.04] p-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
        <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
          Clinical Caveat — Rule Out Hypothyroidism Before Starting Statin
        </p>
      </div>

      <div className="rounded-md border border-amber-500/20 bg-card p-3 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-sm text-foreground leading-relaxed">
            Before starting a statin for dyslipidemia, <strong className="text-amber-600 dark:text-amber-400">hypothyroidism should be ruled out</strong> for two key reasons:
          </p>
        </div>

        <ol className="ml-6 space-y-2 text-sm text-foreground leading-relaxed list-decimal">
          <li>
            If hypothyroidism is present, the primary treatment is <strong>levothyroxine</strong>, not a statin.
            <Cite
              n={1}
              text="National Lipid Association (2023 Recommendations): In patients with dyslipidemia and untreated hypothyroidism, initiate thyroid replacement first; lipids often improve substantially."
            />
          </li>
          <li>
            In the presence of hypothyroidism, using a statin <strong>increases the risk of statin-induced myopathy</strong> up to around 20%.
            <Cite
              n={2}
              text="UpToDate — Statin muscle-related side effects (updated through April 2025): Hypothyroidism is a major risk factor for statin myopathy; incidence rises to ~20% when both are present."
            />
            <Cite
              n={3}
              text="European Society of Cardiology & Atherosclerosis Society Guidelines: Screen for secondary causes (including hypothyroidism) before initiating lipid-lowering therapy."
            />
          </li>
        </ol>
      </div>

      <p className="mt-3 text-[10px] text-muted-foreground leading-snug">
        Sources: National Lipid Association 2023 Recommendations; UpToDate (Statin muscle-related side effects, Apr 2025); ESC/EAS Dyslipidaemia Guidelines.
      </p>
    </footer>
  );
}
