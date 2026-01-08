import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft, 
  Bell, 
  MessageCircle, 
  Search,
  MoreHorizontal,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NetworkHeaderProps {
  shopName?: string;
  ownerName?: string;
  unreadMessages: number;
  onBack: () => void;
  onOpenMessages: () => void;
  onOpenProfile: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function NetworkHeader({
  shopName,
  ownerName,
  unreadMessages,
  onBack,
  onOpenMessages,
  onOpenProfile,
  onRefresh,
  isRefreshing
}: NetworkHeaderProps) {
  const initials = shopName 
    ? shopName.substring(0, 2).toUpperCase()
    : ownerName 
      ? ownerName.substring(0, 2).toUpperCase() 
      : "RD";

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">Réseau</span>
            <span className="text-xl font-bold text-primary">DÉKON</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-9 w-9 rounded-full"
          >
            <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
          </Button>
          
          <button 
            onClick={onOpenMessages}
            className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </button>
          
          <button
            onClick={onOpenProfile}
            className="w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary ring-offset-2 ring-offset-background"
          >
            <Avatar className="h-full w-full">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>
    </header>
  );
}
