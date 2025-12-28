import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ClientWarningBadgeProps {
  isRisky: boolean;
  className?: string;
}

export function ClientWarningBadge({ isRisky, className }: ClientWarningBadgeProps) {
  if (!isRisky) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center w-6 h-6 rounded-full",
            "bg-credit/10 text-credit",
            className
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Client souvent en retard</p>
      </TooltipContent>
    </Tooltip>
  );
}
