import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Share, Plus, Check, ArrowUp, X } from "lucide-react";
import { Onboarding } from "@/components/Onboarding";
import { usePWA } from "@/hooks/use-pwa";

const ONBOARDING_KEY = "dekon_onboarding_completed";

// Decorative elements component
const DecoElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Large blurred circle - top right */}
    <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-[#e0c3fc]/40 to-[#8ec5fc]/40 blur-3xl" />
    {/* Medium circle - bottom left */}
    <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-tr from-[#a1c4fd]/30 to-[#c2e9fb]/30 blur-2xl" />
    {/* Small accent circle */}
    <div className="absolute top-1/3 right-10 w-24 h-24 rounded-full bg-[#4f7df3]/10 blur-xl" />
    {/* Abstract shape - center */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72">
      <div className="absolute inset-0 border-[3px] border-[#4f7df3]/20 rounded-full" />
      <div className="absolute inset-4 border-[2px] border-[#4f7df3]/15 rounded-full" />
      <div className="absolute inset-8 border-[1px] border-[#4f7df3]/10 rounded-full" />
    </div>
  </div>
);

// Floating badge component
const FloatingBadge = ({ 
  children, 
  className,
  style
}: { 
  children: React.ReactNode; 
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div className={`absolute bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg ${className}`} style={style}>
    {children}
  </div>
);

const Landing = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const { canInstall, promptInstall, isInstalled } = usePWA();

  useEffect(() => {
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

  const handleInstall = async () => {
    if (canInstall) {
      const installed = await promptInstall();
      if (!installed) {
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handleContinue = () => {
    navigate("/auth");
  };

  // Loading state
  if (checkingOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] flex items-center justify-center font-['Poppins',sans-serif]">
        <div className="animate-spin w-8 h-8 border-4 border-[#4f7df3] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Onboarding flow
  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] flex flex-col overflow-hidden font-['Poppins',sans-serif] relative">
      {/* Safe area spacer */}
      <div className="h-[max(env(safe-area-inset-top),20px)]" />
      
      <DecoElements />

      {/* Header */}
      <div className="relative z-10 px-6 pt-4">
        <div className="flex items-center gap-3">
          <div className="flex gap-1 items-end">
            <div className="w-1.5 h-8 bg-[#4f7df3] rounded-full" />
            <div className="w-1.5 h-6 bg-[#4f7df3] rounded-full" />
            <div className="w-1.5 h-4 bg-[#4f7df3] rounded-full" />
          </div>
          <span className="text-xl font-bold text-[#2d3748] tracking-tight">DÉKON</span>
        </div>
      </div>

      {/* Floating badges */}
      <FloatingBadge className="top-28 left-6 animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#4f7df3] to-[#5b8af5] flex items-center justify-center">
            <span className="text-white text-xs font-bold">%</span>
          </div>
          <div>
            <p className="text-[#2d3748] text-sm font-bold">120%</p>
            <p className="text-[#718096] text-xs">Efficacité</p>
          </div>
        </div>
      </FloatingBadge>

      <FloatingBadge className="top-36 right-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#10b981] to-[#34d399] flex items-center justify-center">
            <span className="text-white text-xs">📱</span>
          </div>
          <div>
            <p className="text-[#2d3748] text-sm font-bold">65+</p>
            <p className="text-[#718096] text-xs">Téléchargements</p>
          </div>
        </div>
      </FloatingBadge>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Text section */}
      <div className="relative z-10 px-6 pb-8">
        <p className="text-[#718096] text-sm uppercase tracking-widest mb-3 font-medium">
          SIMPLIFIEZ VOS VENTES
        </p>
        <h1 className="text-4xl font-extrabold text-[#2d3748] leading-tight mb-4">
          Votre assistant
          <br />
          commerce dans
          <br />
          <span className="text-[#4f7df3]">votre poche!</span>
        </h1>
        <p className="text-[#718096] text-base leading-relaxed">
          Gérez ventes et dettes facilement avec DÉKON.
          <br />
          Même sans connexion internet.
        </p>
      </div>

      {/* Bottom section */}
      <div className="relative z-10 px-6 pb-8 flex items-end justify-between">
        <button
          onClick={handleContinue}
          className="text-[#718096] text-sm hover:text-[#4f7df3] transition-colors underline underline-offset-4"
        >
          Continuer sans installer
        </button>

        {/* Install button */}
        {!isInstalled && (
          <button
            onClick={handleInstall}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8] flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <ArrowUpRight className="w-7 h-7 text-white" />
          </button>
        )}
      </div>

      {/* Install button label */}
      {!isInstalled && (
        <div className="absolute bottom-28 right-6 text-right">
          <p className="text-[#2d3748] text-sm font-semibold">Installer</p>
          <p className="text-[#718096] text-xs">l'appli</p>
        </div>
      )}

      {/* Safe area bottom */}
      <div className="h-[env(safe-area-inset-bottom)]" />

      {/* Install guide overlay */}
      {showInstallGuide && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6 animate-fade-in">
          {/* Close button */}
          <button 
            onClick={() => setShowInstallGuide(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center"
          >
            <X className="w-5 h-5 text-white" />
          </button>

          <h2 className="text-2xl font-bold text-white mb-2">Comment installer</h2>
          <p className="text-white/60 text-sm mb-10 text-center">
            Suivez ces étapes pour ajouter DÉKON à votre écran d'accueil
          </p>
          
          <div className="space-y-6 w-full max-w-sm">
            {/* Step 1 */}
            <div className="flex items-center gap-4 animate-fade-in bg-white/5 rounded-2xl p-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#4f7df3] to-[#5b8af5] flex items-center justify-center text-white font-bold text-lg shrink-0">
                1
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Appuyez sur Partager</p>
                <p className="text-white/50 text-sm">En bas de votre navigateur</p>
              </div>
              <Share className="w-6 h-6 text-[#4f7df3] animate-bounce" />
            </div>
            
            {/* Step 2 */}
            <div className="flex items-center gap-4 animate-fade-in bg-white/5 rounded-2xl p-4" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#4f7df3] to-[#5b8af5] flex items-center justify-center text-white font-bold text-lg shrink-0">
                2
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Sur l'écran d'accueil</p>
                <p className="text-white/50 text-sm">Faites défiler et appuyez</p>
              </div>
              <Plus className="w-6 h-6 text-[#4f7df3]" />
            </div>
            
            {/* Step 3 */}
            <div className="flex items-center gap-4 animate-fade-in bg-white/5 rounded-2xl p-4" style={{ animationDelay: '0.4s' }}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#4f7df3] to-[#5b8af5] flex items-center justify-center text-white font-bold text-lg shrink-0">
                3
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Appuyez Ajouter</p>
                <p className="text-white/50 text-sm">En haut à droite</p>
              </div>
              <Check className="w-6 h-6 text-[#10b981]" />
            </div>
          </div>
          
          {/* Animated arrow */}
          <div className="mt-10 flex flex-col items-center">
            <ArrowUp className="w-8 h-8 text-[#4f7df3] animate-bounce" />
            <p className="text-white/40 text-xs mt-2">Regardez en haut</p>
          </div>
          
          <button 
            onClick={() => {
              setShowInstallGuide(false);
              navigate("/auth");
            }} 
            className="mt-8 text-white/70 text-sm hover:text-white transition-colors"
          >
            Continuer sans installer →
          </button>
        </div>
      )}
    </div>
  );
};

export default Landing;
