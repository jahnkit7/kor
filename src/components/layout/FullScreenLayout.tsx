import { ReactNode } from "react";

interface FullScreenLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Layout for full-screen pages that need to fit within viewport
 * Handles iOS safe areas (notch, home indicator) properly
 * Use this for pages like Sale where you don't want scrolling
 */
const FullScreenLayout = ({ children, className = "" }: FullScreenLayoutProps) => {
  return (
    <div 
      className={`h-[100dvh] flex flex-col overflow-hidden bg-background ${className}`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </div>
  );
};

export default FullScreenLayout;
