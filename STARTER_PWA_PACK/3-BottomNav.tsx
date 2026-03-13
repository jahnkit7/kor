import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ShoppingCart, Users, Settings } from "lucide-react"; // Exemple avec lucide

/**
 * BOTTOM NAV FLOTTANTE - Positionnement anti-barres-parasites
 * 
 * ARCHITECTURE:
 * 
 * 1. Position: fixed bottom-4
 *    - "bottom-4" = 16px au-dessus du bord bas de l'écran
 *    - Sur iOS avec home indicator, ça laisse naturellement de l'espace
 *    - PAS besoin de safe-area-inset-bottom car on est déjà au-dessus
 * 
 * 2. pointer-events-none sur le container externe
 *    - Le container prend toute la largeur (left-0 right-0)
 *    - Mais ne bloque PAS les clics sur le contenu en dessous
 *    - Seule la pilule (pointer-events-auto) capture les clics
 * 
 * 3. PAS de pb-[env(safe-area-inset-bottom)] sur la nav
 *    - La nav est FLOTTANTE, pas collée au bord
 *    - Le safe-area est géré par le gap naturel de bottom-4
 * 
 * ERREUR COMMUNE À ÉVITER:
 * - Ne PAS mettre la nav en "fixed bottom-0" avec du padding safe-area
 *   → Ça crée un rectangle blanc/noir visible sous la nav
 * - Utiliser "fixed bottom-4" avec une pilule flottante = propre
 */

const navItems = [
  { icon: Home, label: "Accueil", path: "/dashboard" },
  { icon: ShoppingCart, label: "Ventes", path: "/sales" },
  { icon: Users, label: "Clients", path: "/clients" },
  { icon: Settings, label: "Réglages", path: "/settings" },
];

const buttonVariants = {
  initial: { gap: 0, paddingLeft: "0.75rem", paddingRight: "0.75rem" },
  animate: { gap: "0.5rem", paddingLeft: "1rem", paddingRight: "1rem" },
};

const spanVariants = {
  initial: { width: 0, opacity: 0 },
  animate: { width: "auto", opacity: 1 },
  exit: { width: 0, opacity: 0 },
};

const transition = { delay: 0.05, type: "spring" as const, bounce: 0, duration: 0.5 };

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto relative">
        {/* Bordure gradient animée (optionnel) */}
        <div className="absolute -inset-[1.5px] rounded-full bg-gradient-to-r from-primary via-purple-400 to-orange-400 bg-[length:200%_200%] animate-gradient-border opacity-60" />
        
        {/* Barre de navigation */}
        <div className="relative flex items-center justify-center gap-1 h-14 px-3 bg-background/90 backdrop-blur-2xl rounded-full shadow-xl overflow-hidden">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            
            return (
              <motion.button
                key={path}
                onClick={() => navigate(path)}
                variants={buttonVariants}
                initial="initial"
                animate={isActive ? "animate" : "initial"}
                transition={transition}
                className={`relative flex items-center rounded-full py-2.5 transition-colors ${
                  isActive 
                    ? "bg-primary/15 text-primary" 
                    : "text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" strokeWidth={isActive ? 2 : 1.5} />
                
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      variants={spanVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={transition}
                      className="text-xs font-semibold whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
