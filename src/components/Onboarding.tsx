import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, Users, CloudOff, ChevronRight, X } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Wallet,
    title: "Ton argent, clair.",
    description: "Suis tes ventes cash et crédit en un clin d'œil.",
    color: "bg-cash/10 text-cash",
  },
  {
    icon: Users,
    title: "Tes dettes, suivies.",
    description: "Sache toujours qui te doit combien.",
    color: "bg-credit/10 text-credit",
  },
  {
    icon: CloudOff,
    title: "Même sans internet.",
    description: "Tout fonctionne hors ligne. Pas de souci.",
    color: "bg-primary/10 text-primary",
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Skip button */}
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted-foreground">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className={`w-24 h-24 rounded-3xl ${slide.color} flex items-center justify-center mb-8 animate-scale-in`}>
          <Icon className="w-12 h-12" />
        </div>
        
        <h1 className="text-3xl font-bold text-foreground mb-4 animate-fade-in">
          {slide.title}
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-xs animate-fade-in">
          {slide.description}
        </p>
      </div>

      {/* Navigation */}
      <div className="p-8 pb-12">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-primary w-6"
                  : index < currentSlide
                  ? "bg-primary/50"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <Button
          size="lg"
          className="w-full"
          onClick={handleNext}
        >
          {currentSlide < slides.length - 1 ? (
            <>
              Suivant
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          ) : (
            "Commencer"
          )}
        </Button>

        {/* Skip text */}
        {currentSlide < slides.length - 1 && (
          <button
            onClick={handleSkip}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Passer
          </button>
        )}
      </div>
    </div>
  );
}
