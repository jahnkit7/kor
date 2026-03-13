import { ReactNode, forwardRef } from "react";
import BottomNav from "@/components/BottomNav";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

/**
 * LAYOUT PRINCIPAL - Architecture anti-barres-parasites
 * 
 * POURQUOI ça marche:
 * 
 * 1. min-h-[100dvh] → utilise Dynamic Viewport Height (PAS 100vh)
 *    - 100vh sur mobile = inclut la barre d'URL du navigateur → contenu déborde
 *    - 100dvh = hauteur RÉELLE visible, s'adapte quand la barre d'URL apparaît/disparaît
 * 
 * 2. overflow-y-auto → CE div est le scroll container, PAS le body
 *    - Empêche le bounce iOS sur le body
 *    - Permet un contrôle total du scroll
 * 
 * 3. paddingBottom: 80px (quand BottomNav visible)
 *    - Réserve l'espace pour la nav flottante
 *    - PAS de safe-area-inset-bottom ici car la nav est en position fixed
 *    - La nav gère elle-même son safe-area
 * 
 * 4. PAS de paddingTop ici
 *    - Chaque page gère son propre padding-top avec env(safe-area-inset-top)
 *    - Permet aux pages avec header coloré de s'étendre sous la status bar
 */
const AppLayout = forwardRef<HTMLDivElement, AppLayoutProps>(
  ({ children, showBottomNav = true, className = "" }, ref) => {
    return (
      <div 
        ref={ref}
        className={`min-h-[100dvh] bg-background overflow-y-auto ${className}`}
        style={{
          paddingBottom: showBottomNav ? '80px' : '0',
        }}
      >
        {children}
        {showBottomNav && <BottomNav />}
      </div>
    );
  }
);

AppLayout.displayName = "AppLayout";

export default AppLayout;
