import { useState } from "react";
import { Mic, Users, CloudOff, ChevronRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

// Decorative elements with animation
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
      className="absolute top-1/4 left-10 w-20 h-20 rounded-full bg-[#4f7df3]/10 blur-xl" 
    />
  </div>
);

// Animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
    scale: 0.95
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 100 : -100,
    opacity: 0,
    scale: 0.95
  })
};

const iconVariants = {
  enter: {
    scale: 0.5,
    opacity: 0,
    rotate: -10
  },
  center: {
    scale: 1,
    opacity: 1,
    rotate: 0
  },
  exit: {
    scale: 0.5,
    opacity: 0,
    rotate: 10
  }
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
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
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 flex justify-end px-4 pt-2"
      >
        <button 
          onClick={handleSkip} 
          className="w-10 h-10 rounded-full bg-[#f5f7fa] flex items-center justify-center text-[#718096] hover:bg-[#edf0f4] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentSlide}
            custom={direction}
            variants={iconVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="w-28 h-28 rounded-3xl bg-[#4f7df3]/10 flex items-center justify-center mb-10"
          >
            <Icon className="w-14 h-14 text-[#4f7df3]" />
          </motion.div>
        </AnimatePresence>
        
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`content-${currentSlide}`}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="flex flex-col items-center"
          >
            {/* Title */}
            <h1 className="text-3xl font-extrabold text-[#2d3748] mb-4">
              {slide.title}
            </h1>
            
            {/* Description */}
            <p className="text-lg text-[#718096] max-w-xs leading-relaxed">
              {slide.description}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 p-8 pb-12"
      >
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {slides.map((_, index) => (
            <motion.div
              key={index}
              animate={{
                width: index === currentSlide ? 32 : 8,
                backgroundColor: index === currentSlide 
                  ? "#4f7df3" 
                  : index < currentSlide 
                    ? "rgba(79, 125, 243, 0.5)" 
                    : "#e2e8f0"
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="h-2 rounded-full"
            />
          ))}
        </div>

        {/* Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleNext}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8] text-white font-bold text-lg flex items-center justify-center gap-2 shadow-lg"
        >
          <AnimatePresence mode="wait">
            {currentSlide < slides.length - 1 ? (
              <motion.span
                key="next"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2"
              >
                Suivant
                <ChevronRight className="w-5 h-5" />
              </motion.span>
            ) : (
              <motion.span
                key="start"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                Commencer
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Skip text */}
        <AnimatePresence>
          {currentSlide < slides.length - 1 && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleSkip}
              className="w-full mt-4 text-sm text-[#718096] hover:text-[#4f7df3] transition-colors"
            >
              Passer
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Safe area bottom */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
