import { useFeatureAccess } from "@/hooks/use-feature-access";
import { Badge } from "@/components/ui/badge";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

interface BetaBadgeProps {
  featureKey: string;
  /**
   * Position of the badge relative to its container
   * - "top-right": absolute positioned at top right (default)
   * - "top-left": absolute positioned at top left
   * - "inline": inline badge (no absolute positioning)
   * - "dot": small dot indicator only (for nav icons)
   */
  position?: "top-right" | "top-left" | "inline" | "dot";
  /** Size of the badge */
  size?: "sm" | "md";
  /** Additional class names */
  className?: string;
  /** Show even if feature is not accessible (for locked items) */
  showWhenLocked?: boolean;
}

export function BetaBadge({ 
  featureKey, 
  position = "top-right", 
  size = "sm",
  className,
  showWhenLocked = false,
}: BetaBadgeProps) {
  const { isBeta, hasAccess, loading } = useFeatureAccess(featureKey);
  
  // Don't show if loading or not beta
  if (loading || !isBeta) return null;
  
  // Don't show if user doesn't have access and showWhenLocked is false
  if (!hasAccess && !showWhenLocked) return null;

  // Dot indicator for nav icons
  if (position === "dot") {
    return (
      <span 
        className={cn(
          "w-2 h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500",
          "absolute -top-0.5 -right-0.5",
          className
        )} 
      />
    );
  }

  // Position classes
  const positionClasses = {
    "top-right": "absolute -top-2 -right-2 z-10",
    "top-left": "absolute -top-2 -left-2 z-10",
    "inline": "",
  };

  // Size classes
  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0 h-5",
    md: "text-xs px-2 py-0.5",
  };

  return (
    <Badge 
      variant="beta" 
      className={cn(
        positionClasses[position],
        sizeClasses[size],
        "flex items-center gap-0.5",
        className
      )}
    >
      <FlaskConical className={cn(size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3")} />
      Bêta
    </Badge>
  );
}
