import { ReactNode } from "react";

interface FullScreenLayoutProps {
  children: ReactNode;
  className?: string;
  /** If true, removes top safe-area padding (for pages with colored headers) */
  transparentStatusBar?: boolean;
}

/**
 * Layout for full-screen pages that need to fit within viewport
 * Handles iOS safe areas (notch, home indicator) properly
 * Use this for pages like Sale where you don't want scrolling
 */
const FullScreenLayout = ({ 
  children, 
  className = "",
  transparentStatusBar = false,
}: FullScreenLayoutProps) => {
  return (
    <div 
      className={`h-[100dvh] flex flex-col overflow-hidden bg-background ${className}`}
      style={{
        paddingTop: transparentStatusBar ? undefined : 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {children}
    </div>
  );
};

export default FullScreenLayout;
