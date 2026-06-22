import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, XCircle, FlaskConical } from "lucide-react";
import {
  classifyLai2023,
  LAI_TEST_SCENARIOS,
  type LaiTier,
  type LaiClassifierInput,
} from "@/lib/laiRiskClassifier";

const TIER_STYLES: Record<LaiTier, string> = {
  Extreme: "bg-red-600 text-white",
  "Very High": "bg-red-500 text-white",
  High: "bg-orange-500 text-white",
  Moderate: "bg-amber-400 text-amber-950",
  Low: "bg-emerald-500 text-white",
};

function TierPill({ tier }: { tier: LaiTier }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_STYLES[tier]}`}>
      {tier}
    </span>
  );
}

function InputBadges({ input }: { input: LaiClassifierInput }) {
  const items: string[] = [];
  if (input.recurrentAscvd) items.push("Recurrent ASCVD");
  if (input.polyvascular) items.push("Polyvascular");
  if (input.ascvd) items.push("ASCVD");
  if (input.diabetesTOD) items.push("DM + TOD");
  else if (input.diabetes) items.push("DM");
  if (input.ckdStage) items.push(`CKD ${input.ckdStage}`);
  if (input.htn) items.push("HTN");
  if (input.smoker) items.push("Smoker");
  if (input.familyHx) items.push("FHx");
  if (input.hyperchol) items.push("LDL≥160");
  if (input.lpaHigh) items.push("Lp(a)↑");
  if (input.southAsian) items.push("S. Asian");
  if (input.preventCategory) items.push(`PREVENT: ${input.preventCategory}`);
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it) => (
        <span key={it} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {it}
        </span>
      ))}
    </div>
  );
}

export default function LaiTest() {
  const [filter, setFilter] = useState<"all" | "pass" | "fail">("all");

  const results = useMemo(
    () =>
      LAI_TEST_SCENARIOS.map((s) => {
        const result = classifyLai2023(s.input);
        return { scenario: s, result, pass: result.tier === s.expected };
      }),
    []
  );

  const passCount = results.filter((r) => r.pass).length;
  const total = results.length;
  const filtered = results.filter((r) =>
    filter === "all" ? true : filter === "pass" ? r.pass : !r.pass
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <h1 className="font-display text-lg font-bold">LAI 2023 Risk-Tier Validation</h1>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="mr-1 h-4 w-4" />Mini App</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Overall</div>
              <div className="font-display text-2xl font-bold">
                {passCount} / {total}{" "}
                <span className={passCount === total ? "text-emerald-600" : "text-amber-600"}>
                  {passCount === total ? "PASS" : "scenarios passed"}
                </span>
              </div>
            </div>
            <div className="flex gap-1.5">
              {(["all", "pass", "fail"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filter === f ? "default" : "outline"}
                  onClick={() => setFilter(f)}
                  className="capitalize"
                >
                  {f}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-2">
          {filtered.map(({ scenario, result, pass }) => (
            <Card
              key={scenario.id}
              className={`overflow-hidden border-l-4 p-4 ${
                pass ? "border-l-emerald-500" : "border-l-red-500"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {pass ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                    )}
                    <h3 className="font-display text-sm font-semibold">{scenario.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{scenario.description}</p>
                  <div className="mt-2"><InputBadges input={scenario.input} /></div>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Expected</div>
                  <TierPill tier={scenario.expected} />
                  <div className="mt-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">Actual</div>
                  <TierPill tier={result.tier} />
                </div>
              </div>

              <div className="mt-3 grid gap-2 rounded-md bg-muted/40 p-2.5 text-xs sm:grid-cols-3">
                <div>
                  <div className="font-semibold text-muted-foreground">Reason</div>
                  <div>{result.reason}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">LDL-C goal</div>
                  <div>{result.ldlGoal}</div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">Therapy</div>
                  <div>{result.therapy}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <p className="pt-2 text-[11px] text-muted-foreground">
          Logic mirrors <code>src/pages/MiniApp.tsx</code> Risk Summary (LAI 2023 tiers: Low / Moderate / High / Very High / Extreme; LDL-C goals 100 / 70 / 55 / 50 / 30 mg/dL).
        </p>
      </main>
    </div>
  );
}
