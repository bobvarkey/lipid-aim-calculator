import { useNavigate } from "react-router-dom";
import { Heart, Shield, BookOpen, ActivitySquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ArteryHeroGraphic from "@/components/ArteryHeroGraphic";

const Home = () => {
  const navigate = useNavigate();

  const cards = [
    {
      icon: Heart,
      title: "Lipid Risk Calculator",
      description: "Comprehensive cardiovascular risk assessment with LDL-C, Non-HDL-C, and ApoB targets",
      color: "from-red-500/30 to-pink-500/30",
      borderColor: "border-red-500/20",
      hoverColor: "hover:border-red-500/40 hover:shadow-[0_0_30px_rgba(239,68,68,0.2)]",
      path: "/calculator",
    },
    {
      icon: ActivitySquare,
      title: "ASCVD Assessment",
      description: "Risk stratification for primary prevention based on ACC/AHA guidelines",
      color: "from-blue-500/30 to-cyan-500/30",
      borderColor: "border-blue-500/20",
      hoverColor: "hover:border-blue-500/40 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]",
      path: "/ascvd",
    },
    {
      icon: Shield,
      title: "Prevention Guidelines",
      description: "Primary prevention strategies and risk factor management protocols",
      color: "from-emerald-500/30 to-teal-500/30",
      borderColor: "border-emerald-500/20",
      hoverColor: "hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.2)]",
      path: "/calculator",
      hash: "#primary",
    },
    {
      icon: BookOpen,
      title: "Education",
      description: "Comprehensive learning resources on cardiovascular risk and lipid management",
      color: "from-amber-500/30 to-orange-500/30",
      borderColor: "border-amber-500/20",
      hoverColor: "hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(217,119,6,0.2)]",
      path: "/calculator",
      hash: "#education",
    },
  ];

  const handleNavigation = (path: string, hash?: string) => {
    navigate(path);
    if (hash && typeof window !== "undefined") {
      setTimeout(() => {
        const element = document.querySelector(hash);
        element?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-0 right-0 h-96 w-96 bg-gradient-to-bl from-red-500/10 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 h-96 w-96 bg-gradient-to-tr from-blue-500/10 to-transparent rounded-full blur-3xl animate-pulse delay-700" />
      </div>

      {/* Header/Hero Section */}
      <div className="relative pt-12 pb-8 md:pt-20 md:pb-12">
        <div className="mx-auto max-w-4xl px-4 text-center">
          {/* Logo/Icon */}
          <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-xl border border-red-500/30 shadow-lg">
            <Heart className="h-7 w-7 text-red-500" />
          </div>

          {/* Title */}
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
            Lipid Risk Predictor
          </h1>

          {/* Subtitle */}
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            Advanced cardiovascular risk assessment and LDL-C management based on ACC/AHA 2026 guidelines and LAI 2023 Consensus recommendations
          </p>

          {/* CTA Button */}
          <div className="mt-8 flex gap-3 justify-center flex-wrap">
            <Button
              onClick={() => handleNavigation("/calculator")}
              className="gap-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg hover:shadow-xl transition-all"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => handleNavigation("/ascvd")}
              variant="outline"
              className="gap-2 border-primary/30 hover:border-primary/60 hover:bg-primary/5"
            >
              ASCVD Assessment
            </Button>
          </div>

          <div className="mt-12 flex justify-center px-4 sm:px-0">
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-slate-900/10 backdrop-blur-xl max-w-5xl w-full">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(248,113,113,0.18),transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.16),transparent_40%)]" />
              <div className="relative rounded-[2rem] overflow-hidden">
                <ArteryHeroGraphic className="h-[380px] w-full md:h-[420px]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Cards Section */}
      <div className="relative py-12 md:py-20">
        <div className="mx-auto max-w-5xl px-4">
          {/* Section Title */}
          <div className="mb-12 text-center">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
              Comprehensive Tools
            </h2>
            <p className="text-muted-foreground">
              Navigate through our integrated risk assessment and management suite
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleNavigation(card.path, card.hash)}
                  className={`group relative h-full text-left transition-all duration-500 cursor-pointer`}
                >
                  {/* Glassmorphic Card */}
                  <div
                    className={`relative h-full rounded-2xl p-6 md:p-8 border ${card.borderColor} ${card.hoverColor} 
                      bg-gradient-to-br ${card.color} 
                      backdrop-blur-xl
                      shadow-lg
                      transition-all duration-500
                      overflow-hidden`}
                  >
                    {/* Animated inner border effect */}
                    <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none" />

                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                    {/* Icon Container */}
                    <div
                      className={`mb-4 inline-flex h-12 w-12 md:h-14 md:w-14 items-center justify-center rounded-xl 
                        bg-white/10 backdrop-blur-sm border border-white/20
                        group-hover:scale-110 group-hover:shadow-lg 
                        transition-all duration-500`}
                    >
                      <Icon className="h-6 w-6 md:h-7 md:w-7 text-foreground" />
                    </div>

                    {/* Content */}
                    <h3 className="font-display text-lg md:text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {card.title}
                    </h3>
                    <p className="text-sm md:text-base text-muted-foreground leading-relaxed group-hover:text-foreground/70 transition-colors">
                      {card.description}
                    </p>

                    {/* Arrow indicator */}
                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary group-hover:translate-x-1 transition-transform duration-500">
                      <span>Explore</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>

                    {/* Glow effect on hover */}
                    <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-br from-white/5 to-transparent" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Features/Benefits Section */}
      <div className="relative py-12 md:py-16">
        <div className="mx-auto max-w-5xl px-4">
          <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/2 backdrop-blur-xl p-8 md:p-12">
            <h3 className="font-display text-xl md:text-2xl font-bold text-foreground mb-6">
              Key Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  title: "Automated Classification",
                  description: "Instant risk category assignment from Extreme Risk C to Very High Risk",
                },
                {
                  title: "Evidence-Based Targets",
                  description: "LDL-C, Non-HDL-C, and ApoB targets aligned with 2026 ACC/AHA guidelines",
                },
                {
                  title: "Smart Sub-Checklists",
                  description: "Collapsible questionnaires for ASCVD history and risk modifiers",
                },
                {
                  title: "PREVENT Integration",
                  description: "10-year ASCVD risk calculation using validated prediction models",
                },
                {
                  title: "EMR Export",
                  description: "Copy-ready clinical notes for seamless EHR documentation",
                },
                {
                  title: "Mobile Optimized",
                  description: "Responsive design for use on any device during patient encounters",
                },
              ].map((feature, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="font-semibold text-foreground">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="relative py-8 border-t border-border/40">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-xs md:text-sm text-muted-foreground">
            Based on <span className="font-semibold">2026 ACC/AHA Guideline on Management of Dyslipidemia</span> and{" "}
            <span className="font-semibold">LAI 2023 Consensus Statement IV</span>
          </p>
          <p className="mt-2 text-xs text-muted-foreground/60">
            For educational and clinical decision support use only. Always consult current guidelines and clinical judgment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home;
