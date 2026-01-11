import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, Share, Plus, Check, ArrowUp, X, MoreVertical, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Onboarding } from "@/components/Onboarding";
import { usePWA } from "@/hooks/use-pwa";
import KorLogo from "@/assets/logo-kor.svg";

const ONBOARDING_KEY = "kor_onboarding_completed";

// Browser detection
type BrowserType = "safari" | "chrome" | "firefox" | "edge" | "samsung" | "other";

const detectBrowser = (): BrowserType => {
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes("samsungbrowser")) return "samsung";
  if (ua.includes("edg")) return "edge";
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("chrome") && !ua.includes("edg")) return "chrome";
  if (ua.includes("safari") && !ua.includes("chrome")) return "safari";
  
  return "other";
};

// Browser-specific install instructions
const getInstallInstructions = (browser: BrowserType) => {
  switch (browser) {
    case "safari":
      return [
        {
          step: 1,
          icon: Share,
          title: "Appuyez sur Partager",
          description: "En bas de l'écran (icône carrée avec flèche)",
          animate: true
        },
        {
          step: 2,
          icon: Plus,
          title: "Sur l'écran d'accueil",
          description: "Faites défiler et appuyez sur cette option",
          animate: false
        },
        {
          step: 3,
          icon: Check,
          title: "Appuyez Ajouter",
          description: "En haut à droite de l'écran",
          animate: false
        }
      ];
    case "chrome":
    case "edge":
      return [
        {
          step: 1,
          icon: MoreVertical,
          title: "Ouvrez le menu",
          description: "Appuyez sur les 3 points en haut à droite",
          animate: true
        },
        {
          step: 2,
          icon: Download,
          title: "Installer l'application",
          description: "Ou 'Ajouter à l'écran d'accueil'",
          animate: false
        },
        {
          step: 3,
          icon: Check,
          title: "Confirmez l'installation",
          description: "Appuyez sur Installer",
          animate: false
        }
      ];
    case "firefox":
      return [
        {
          step: 1,
          icon: MoreVertical,
          title: "Ouvrez le menu",
          description: "Appuyez sur les 3 points en bas à droite",
          animate: true
        },
        {
          step: 2,
          icon: Plus,
          title: "Ajouter à l'écran d'accueil",
          description: "Sélectionnez cette option dans le menu",
          animate: false
        },
        {
          step: 3,
          icon: Check,
          title: "Confirmez",
          description: "Appuyez sur Ajouter",
          animate: false
        }
      ];
    case "samsung":
      return [
        {
          step: 1,
          icon: MoreVertical,
          title: "Ouvrez le menu",
          description: "Appuyez sur les 3 lignes en bas à droite",
          animate: true
        },
        {
          step: 2,
          icon: Plus,
          title: "Ajouter page à",
          description: "Puis 'Écran d'accueil'",
          animate: false
        },
        {
          step: 3,
          icon: Check,
          title: "Confirmez",
          description: "Appuyez sur Ajouter",
          animate: false
        }
      ];
    default:
      return [
        {
          step: 1,
          icon: MoreVertical,
          title: "Ouvrez le menu",
          description: "Cherchez l'icône menu de votre navigateur",
          animate: true
        },
        {
          step: 2,
          icon: Plus,
          title: "Ajouter à l'écran d'accueil",
          description: "Ou 'Installer l'application'",
          animate: false
        },
        {
          step: 3,
          icon: Check,
          title: "Confirmez",
          description: "Suivez les instructions à l'écran",
          animate: false
        }
      ];
  }
};

const getBrowserName = (browser: BrowserType): string => {
  switch (browser) {
    case "safari": return "Safari";
    case "chrome": return "Chrome";
    case "firefox": return "Firefox";
    case "edge": return "Edge";
    case "samsung": return "Samsung Internet";
    default: return "votre navigateur";
  }
};

// Decorative elements component
const DecoElements = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8 }}
      className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-gradient-to-br from-[#e0c3fc]/40 to-[#8ec5fc]/40 blur-3xl" 
    />
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-gradient-to-tr from-[#a1c4fd]/30 to-[#c2e9fb]/30 blur-2xl" 
    />
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.4 }}
      className="absolute top-1/3 right-10 w-24 h-24 rounded-full bg-[#4f7df3]/10 blur-xl" 
    />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72">
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute inset-0 border-[3px] border-[#4f7df3]/20 rounded-full" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className="absolute inset-4 border-[2px] border-[#4f7df3]/15 rounded-full" 
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
        className="absolute inset-8 border-[1px] border-[#4f7df3]/10 rounded-full" 
      />
    </div>
  </div>
);

// Floating badge component
const FloatingBadge = ({ 
  children, 
  className,
  delay = 0
}: { 
  children: React.ReactNode; 
  className?: string;
  delay?: number;
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={`absolute bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg ${className}`}
  >
    {children}
  </motion.div>
);

const Landing = () => {
  const navigate = useNavigate();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const { canInstall, promptInstall, isInstalled } = usePWA();

  const browser = useMemo(() => detectBrowser(), []);
  const instructions = useMemo(() => getInstallInstructions(browser), [browser]);
  const browserName = useMemo(() => getBrowserName(browser), [browser]);

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
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 px-6 pt-4"
      >
        <div className="flex items-center gap-3">
          <img src={KorLogo} alt="KÒR" className="w-10 h-10 rounded-xl" />
          <span className="text-xl font-bold text-[#2d3748] tracking-tight">KÒR</span>
        </div>
      </motion.div>

      {/* Floating badges */}
      <FloatingBadge className="top-28 left-6" delay={0.3}>
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

      <FloatingBadge className="top-36 right-6" delay={0.5}>
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
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative z-10 px-6 pb-8"
      >
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
          Gérez ventes et dettes facilement avec KÒR.
          <br />
          Même sans connexion internet.
        </p>
      </motion.div>

      {/* Bottom section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="relative z-10 px-6 pb-8 flex items-end justify-between"
      >
        <button
          onClick={handleContinue}
          className="text-[#718096] text-sm hover:text-[#4f7df3] transition-colors underline underline-offset-4"
        >
          Continuer sans installer
        </button>

        {/* Install button */}
        {!isInstalled && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleInstall}
            className="w-16 h-16 rounded-full bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8] flex items-center justify-center shadow-lg"
          >
            <ArrowUpRight className="w-7 h-7 text-white" />
          </motion.button>
        )}
      </motion.div>

      {/* Install button label */}
      {!isInstalled && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="absolute bottom-28 right-6 text-right"
        >
          <p className="text-[#2d3748] text-sm font-semibold">Installer</p>
          <p className="text-[#718096] text-xs">l'appli</p>
        </motion.div>
      )}

      {/* Safe area bottom */}
      <div className="h-[env(safe-area-inset-bottom)]" />

      {/* Install guide overlay */}
      <AnimatePresence>
        {showInstallGuide && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-6"
          >
            {/* Close button */}
            <motion.button 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-white mb-2 text-center">Comment installer</h2>
              <p className="text-white/60 text-sm mb-2 text-center">
                Instructions pour <span className="text-[#4f7df3] font-medium">{browserName}</span>
              </p>
              <p className="text-white/40 text-xs mb-8 text-center">
                Ajoutez KÒR à votre écran d'accueil
              </p>
            </motion.div>
            
            <div className="space-y-4 w-full max-w-sm">
              {instructions.map((instruction, index) => {
                const IconComponent = instruction.icon;
                return (
                  <motion.div 
                    key={instruction.step}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + index * 0.15 }}
                    className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 backdrop-blur-sm"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#4f7df3] to-[#5b8af5] flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {instruction.step}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{instruction.title}</p>
                      <p className="text-white/50 text-sm">{instruction.description}</p>
                    </div>
                    <IconComponent 
                      className={`w-6 h-6 shrink-0 ${
                        instruction.step === 3 ? 'text-[#10b981]' : 'text-[#4f7df3]'
                      } ${instruction.animate ? 'animate-bounce' : ''}`} 
                    />
                  </motion.div>
                );
              })}
            </div>
            
            {/* Animated arrow pointing to browser UI */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-8 flex flex-col items-center"
            >
              {browser === "safari" ? (
                <>
                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowUp className="w-8 h-8 text-[#4f7df3] rotate-180" />
                  </motion.div>
                  <p className="text-white/40 text-xs mt-2">Regardez en bas</p>
                </>
              ) : (
                <>
                  <motion.div
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <ArrowUp className="w-8 h-8 text-[#4f7df3]" />
                  </motion.div>
                  <p className="text-white/40 text-xs mt-2">Regardez en haut</p>
                </>
              )}
            </motion.div>
            
            <motion.button 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              onClick={() => {
                setShowInstallGuide(false);
                navigate("/auth");
              }} 
              className="mt-8 text-white/70 text-sm hover:text-white transition-colors"
            >
              Continuer sans installer →
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Landing;
