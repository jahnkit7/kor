import { useState } from "react";
import { Mic, Users, CloudOff, ChevronRight, X } from "lucide-react";

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Mic,
    title: "Parle, c'est vendu.",
    description: "Dicte tes ventes comme tu parles au marché. Simple et naturel.",
  },
  {
    icon: Users,
    title: "Tes dettes, suivies.",
    description: "Sache toujours qui te doit combien. Plus de confusion.",
  },
  {
    icon: CloudOff,
    title: "Même sans réseau.",
    description: "Tout fonctionne hors ligne. Comme au marché.",
  },
];

// Decorative elements
const DecoElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-[#e0c3fc]/40 to-[#8ec5fc]/40 blur-3xl" />
    <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-tr from-[#a1c4fd]/30 to-[#c2e9fb]/30 blur-2xl" />
    <div className="absolute top-1/4 left-10 w-20 h-20 rounded-full bg-[#4f7df3]/10 blur-xl" />
  </div>
);

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
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] flex flex-col font-['Poppins',sans-serif] overflow-hidden">
      {/* Safe area spacer */}
      <div className="h-[max(env(safe-area-inset-top),20px)]" />
      
      <DecoElements />

      {/* Skip button */}
      <div className="relative z-10 flex justify-end px-4 pt-2">
        <button 
          onClick={handleSkip} 
          className="w-10 h-10 rounded-full bg-[#f5f7fa] flex items-center justify-center text-[#718096] hover:bg-[#edf0f4] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        {/* Icon */}
        <div 
          key={currentSlide}
          className="w-28 h-28 rounded-3xl bg-[#4f7df3]/10 flex items-center justify-center mb-10 animate-scale-in"
        >
          <Icon className="w-14 h-14 text-[#4f7df3]" />
        </div>
        
        {/* Title */}
        <h1 
          key={`title-${currentSlide}`}
          className="text-3xl font-extrabold text-[#2d3748] mb-4 animate-fade-in"
        >
          {slide.title}
        </h1>
        
        {/* Description */}
        <p 
          key={`desc-${currentSlide}`}
          className="text-lg text-[#718096] max-w-xs leading-relaxed animate-fade-in"
          style={{ animationDelay: '0.1s' }}
        >
          {slide.description}
        </p>
      </div>

      {/* Navigation */}
      <div className="relative z-10 p-8 pb-12">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? "bg-[#4f7df3] w-8"
                  : index < currentSlide
                  ? "bg-[#4f7df3]/50 w-2"
                  : "bg-[#e2e8f0] w-2"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={handleNext}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          {currentSlide < slides.length - 1 ? (
            <>
              Suivant
              <ChevronRight className="w-5 h-5" />
            </>
          ) : (
            "Commencer"
          )}
        </button>

        {/* Skip text */}
        {currentSlide < slides.length - 1 && (
          <button
            onClick={handleSkip}
            className="w-full mt-4 text-sm text-[#718096] hover:text-[#4f7df3] transition-colors"
          >
            Passer
          </button>
        )}
      </div>

      {/* Safe area bottom */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
