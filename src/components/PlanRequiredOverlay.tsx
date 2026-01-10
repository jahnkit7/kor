import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanRequiredOverlayProps {
  children: ReactNode;
  requiredPlan: string;
  isDisabled: boolean;
  className?: string;
}

export function PlanRequiredOverlay({ 
  children, 
  requiredPlan, 
  isDisabled,
  className,
}: PlanRequiredOverlayProps) {
  if (!isDisabled) return <>{children}</>;
  
  return (
    <div className={cn("relative", className)}>
      {children}
      {/* Overlay dégradé */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/80 to-background/60 flex items-center justify-center rounded-xl backdrop-blur-[2px]">
        <div className="text-center p-4">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Disponible pour {requiredPlan}
          </p>
        </div>
      </div>
    </div>
  );
}
