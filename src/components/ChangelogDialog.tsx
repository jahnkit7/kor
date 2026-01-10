import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChangelogs, useMarkAllChangelogsAsRead } from "@/hooks/use-changelogs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  Sparkles, 
  Wrench, 
  Bug, 
  AlertTriangle, 
  Check, 
  ChevronDown,
  ChevronUp 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChangelogDialogProps {
  featureKey: string;
  featureName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const changeTypeConfig = {
  feature: { 
    icon: Sparkles, 
    label: "Nouveauté", 
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" 
  },
  improvement: { 
    icon: Wrench, 
    label: "Amélioration", 
    color: "bg-blue-500/10 text-blue-500 border-blue-500/30" 
  },
  bugfix: { 
    icon: Bug, 
    label: "Correction", 
    color: "bg-amber-500/10 text-amber-500 border-amber-500/30" 
  },
  breaking: { 
    icon: AlertTriangle, 
    label: "Important", 
    color: "bg-red-500/10 text-red-500 border-red-500/30" 
  },
};

export function ChangelogDialog({ 
  featureKey, 
  featureName, 
  open, 
  onOpenChange 
}: ChangelogDialogProps) {
  const { changelogs, unreadChangelogs, isLoading } = useChangelogs(featureKey);
  const markAllAsRead = useMarkAllChangelogsAsRead(featureKey);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  const unreadIds = new Set(unreadChangelogs.map(c => c.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              Changelog - {featureName}
            </DialogTitle>
            {unreadChangelogs.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <Check className="w-3 h-3 mr-1" />
                Tout marquer comme lu
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : changelogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun changelog disponible
            </div>
          ) : (
            <div className="space-y-3">
              {changelogs.map((changelog) => {
                const config = changeTypeConfig[changelog.change_type];
                const Icon = config.icon;
                const isExpanded = expandedIds.has(changelog.id);
                const isUnread = unreadIds.has(changelog.id);

                return (
                  <div 
                    key={changelog.id}
                    className={cn(
                      "border rounded-lg p-3 transition-colors",
                      isUnread && "border-amber-500/50 bg-amber-500/5"
                    )}
                  >
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleExpanded(changelog.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] px-1.5 py-0", config.color)}
                          >
                            <Icon className="w-2.5 h-2.5 mr-1" />
                            {config.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            v{changelog.version}
                          </span>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          )}
                        </div>
                        <h4 className="font-medium text-sm">{changelog.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(changelog.published_at), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t text-sm text-muted-foreground whitespace-pre-wrap">
                        {changelog.content_md}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
