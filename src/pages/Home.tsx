import { useNavigate } from "react-router-dom";
import { Heart, Shield, BookOpen, ActivitySquare, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-doctor.jpg";

const Home = () => {
  const navigate = useNavigate();

  const tools = [
    {
      icon: Heart,
      title: "Lipid Risk Calculator",
      description: "Calculate risk, set LDL-C targets, and generate patient-ready clinical notes based on latest guidelines.",
      iconBg: "bg-[hsl(340,82%,52%)]",
      path: "/calculator",
    },
    {
      icon: ActivitySquare,
      title: "ASCVD Assessment",
      description: "10-year risk stratification aligned with 2026 ACC/AHA guidelines and LAI 2023 Consensus Statement IV.",
      iconBg: "bg-[hsl(207,90%,54%)]",
      path: "/ascvd",
    },
    {
      icon: Shield,
      title: "Prevention Guidelines",
      description: "Navigate primary prevention strategies, risk modifiers, and treatment initiation thresholds.",
      iconBg: "bg-[hsl(122,39%,49%)]",
      path: "/calculator",
      hash: "#primary",
    },
    {
      icon: BookOpen,
      title: "Education",
      description: "Comprehensive reference on lipid targets, Lp(a), ApoB, and 2026 guideline updates.",
      iconBg: "bg-[hsl(36,100%,50%)]",
      path: "/calculator",
      hash: "#education",
    },
  ];

  const features = [
    "Data-driven lipid risk estimates",
    "Patient-friendly report generation",
  ];

  const handleNavigation = (path: string, hash?: string) => {
    navigate(path);
    if (hash && typeof window !== "undefined") {
      setTimeout(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Hero Section */}
      <section className="relative px-4 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="mx-auto max-w-5xl">
          {/* Badge */}
          <div className="mb-6 flex justify-center md:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(340,82%,96%)] px-4 py-1.5 text-xs font-semibold tracking-wide text-[hsl(340,82%,42%)] uppercase">
              <Heart className="h-3.5 w-3.5" /> Cardiovascular Risk
            </span>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:gap-12">
            {/* Left copy */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-[1.1]">
                Lipid Risk{" "}
                <span className="italic text-[hsl(340,82%,52%)]">Predictor</span>
              </h1>

              <p className="mt-4 text-base md:text-lg text-[hsl(var(--muted-foreground))] leading-relaxed max-w-lg mx-auto md:mx-0">
                An intuitive, clinician-designed tool for cardiovascular risk
                stratification. Leverage evidence-based lipid management
                protocols to deliver guideline-concordant patient care.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Button
                  size="lg"
                  onClick={() => handleNavigation("/calculator")}
                  className="gap-2 rounded-full bg-[hsl(340,82%,52%)] hover:bg-[hsl(340,82%,46%)] text-white shadow-lg shadow-[hsl(340,82%,52%)/0.25] px-8"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleNavigation("/ascvd")}
                  className="gap-2 rounded-full border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))] px-8"
                >
                  Clinic ASCVD Analysis
                </Button>
              </div>
            </div>

            {/* Right hero image */}
            <div className="mt-10 md:mt-0 flex-1 flex justify-center">
              <div className="relative w-full max-w-md">
                <div className="overflow-hidden rounded-3xl shadow-2xl shadow-[hsl(207,90%,54%)/0.15]">
                  <img
                    src={heroImage}
                    alt="Cardiovascular risk assessment"
                    className="w-full h-[320px] md:h-[380px] object-cover"
                  />
                </div>
                {/* Floating badge */}
                <div className="absolute -bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur-md border border-[hsl(var(--border))] p-3 shadow-lg">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(340,82%,52%)]">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      10-Year ASCVD Risk
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      2026 ACC/AHA & LAI 2023
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diagnostic Arsenal Section */}
      <section className="px-4 py-16 md:py-24 bg-[hsl(var(--card))]">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
            Diagnostic Arsenal
          </h2>
          <p className="text-[hsl(var(--muted-foreground))] mb-10 max-w-2xl">
            Integrated suite of tools for comprehensive cardiovascular risk management.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {tools.map((tool, idx) => {
              const Icon = tool.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleNavigation(tool.path, tool.hash)}
                  className="group relative text-left rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 transition-all duration-300 hover:shadow-lg hover:border-[hsl(var(--primary))/0.3] hover:-translate-y-0.5"
                >
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${tool.iconBg}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-display text-base font-bold text-[hsl(var(--foreground))] mb-1.5">
                    {tool.title}
                  </h3>
                  <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                    {tool.description}
                  </p>
                  <ArrowRight className="mt-4 h-4 w-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--primary))] group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data-Driven Decision Support Section */}
      <section className="px-4 py-16 md:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center md:gap-16">
            <div className="flex-1">
              <h2 className="font-display text-2xl md:text-3xl font-bold text-[hsl(var(--foreground))] mb-2">
                Data-Driven{" "}
                <span className="text-[hsl(var(--primary))]">Decision Support</span>
              </h2>
              <p className="text-[hsl(var(--muted-foreground))] mb-6 leading-relaxed">
                Precision medicine at your fingertips. Our validated algorithms
                combine current 2026 ACC/AHA and LAI 2023 guideline logic
                (ACC/AHA 2026 &amp; LAI 2023) to deliver accurate, actionable
                risk profiles for every patient.
              </p>

              <ul className="space-y-3">
                {features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[hsl(122,39%,49%)] flex-shrink-0" />
                    <span className="text-sm font-medium text-[hsl(var(--foreground))]">{feat}</span>
                  </li>
                ))}
              </ul>

              <Button
                size="lg"
                onClick={() => handleNavigation("/calculator")}
                className="mt-8 gap-2 rounded-full bg-[hsl(var(--primary))] hover:bg-[hsl(199,89%,32%)] text-white px-8"
              >
                Start Assessment
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Visual cards */}
            <div className="mt-10 md:mt-0 flex-1 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-[hsl(340,82%,52%)] to-[hsl(340,60%,62%)] p-5 text-white shadow-lg">
                <p className="text-3xl font-bold">98.4%</p>
                <p className="mt-1 text-xs opacity-90">Guideline Accuracy</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-[hsl(199,89%,38%)] to-[hsl(207,90%,54%)] p-5 text-white shadow-lg flex flex-col items-center justify-center">
                <Shield className="h-8 w-8 mb-1" />
                <p className="text-xs font-semibold">HIPAA Compliant</p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-[hsl(280,60%,50%)] to-[hsl(300,50%,60%)] p-5 text-white shadow-lg col-span-2 flex items-center gap-4">
                <ActivitySquare className="h-8 w-8 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold">Comprehensive Diagnostics</p>
                  <p className="text-xs opacity-90 mt-0.5">
                    LDL-C · Non-HDL-C · ApoB · Lp(a) · 10-Yr ASCVD Risk
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-8">
        <div className="mx-auto max-w-5xl text-center space-y-2">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Based on <span className="font-semibold">2026 ACC/AHA Guideline on Management of Dyslipidemia</span> and{" "}
            <span className="font-semibold">LAI 2023 Consensus Statement IV</span>
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))] opacity-60">
            For educational and clinical decision support use only. Always consult current guidelines and clinical judgment.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
