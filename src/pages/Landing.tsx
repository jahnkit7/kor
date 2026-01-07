import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Mic, Users, TrendingUp } from "lucide-react";
import { Onboarding } from "@/components/Onboarding";

const ONBOARDING_KEY = "dekon_onboarding_completed";

const Landing = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    // Check if onboarding was completed
    const completed = localStorage.getItem(ONBOARDING_KEY);
    if (!completed) {
      setShowOnboarding(true);
    }
    setCheckingOnboarding(false);
  }, []);

  const handleOnboardingComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShowOnboarding(false);
  };

  const handleStart = () => {
    setIsLoading(true);
    setTimeout(() => navigate("/auth"), 300);
  };

  // Show loading while checking
  if (checkingOnboarding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show onboarding on first launch
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="gradient-hero flex-1 flex flex-col items-center justify-center px-6 py-12 text-primary-foreground">
        <div className="animate-fade-in text-center max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent shadow-glow mb-4">
              <Mic className="w-10 h-10" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight">
              DÉK<span className="text-accent">ON</span>
            </h1>
            <p className="text-lg opacity-90 mt-2 font-medium">
              L'OS du commerce africain
            </p>
          </div>

          {/* Value Proposition */}
          <p className="text-xl font-semibold mb-8 leading-relaxed">
            Parle, c'est vendu. Même sans internet.
          </p>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <FeatureItem icon={Mic} text="Dictée vocale" />
            <FeatureItem icon={Users} text="Suivi Dettes" />
            <FeatureItem icon={TrendingUp} text="Rapports" />
            <FeatureItem icon={Shield} text="Hors ligne" />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-background px-6 py-8 safe-bottom">
        <div className="max-w-sm mx-auto space-y-4">
          <Button
            variant="action"
            size="xl"
            className="w-full"
            onClick={handleStart}
            disabled={isLoading}
          >
            Commencer maintenant
            <ArrowRight className="w-6 h-6" />
          </Button>
          
          <p className="text-center text-sm text-muted-foreground">
            Essai gratuit • Pas de carte bancaire
          </p>
        </div>
      </div>
    </div>
  );
};

const FeatureItem = ({ icon: Icon, text }: { icon: React.ElementType; text: string }) => (
  <div className="flex items-center gap-3 bg-primary-foreground/10 rounded-xl p-3">
    <Icon className="w-5 h-5 text-accent" />
    <span className="text-sm font-semibold">{text}</span>
  </div>
);

export default Landing;