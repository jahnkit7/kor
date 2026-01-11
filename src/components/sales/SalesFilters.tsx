import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarIcon, X, Wallet, CreditCard, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type SaleTypeFilter = "all" | "cash" | "credit";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface SalesFiltersProps {
  typeFilter: SaleTypeFilter;
  onTypeFilterChange: (type: SaleTypeFilter) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

export const SalesFilters = ({
  typeFilter,
  onTypeFilterChange,
  dateRange,
  onDateRangeChange,
  activeFiltersCount,
  onClearFilters,
}: SalesFiltersProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const formatDateRange = () => {
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, "d MMM", { locale: fr })} → ${format(dateRange.to, "d MMM", { locale: fr })}`;
    }
    if (dateRange.from) {
      return `Depuis ${format(dateRange.from, "d MMM", { locale: fr })}`;
    }
    return "Dates";
  };

  const hasDateFilter = dateRange.from || dateRange.to;

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Filtrer par</p>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-7 text-xs text-muted-foreground hover:text-foreground px-2"
          >
            <X className="w-3 h-3 mr-1" />
            Tout effacer
          </Button>
        )}
      </div>

      {/* Type filter chips */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Type de vente</p>
        <div className="flex gap-2">
          <button
            onClick={() => onTypeFilterChange("all")}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all",
              "border-2 flex items-center justify-center gap-2",
              typeFilter === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            )}
          >
            <Sparkles className="w-4 h-4" />
            Tous
          </button>
          <button
            onClick={() => onTypeFilterChange("cash")}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all",
              "border-2 flex items-center justify-center gap-2",
              typeFilter === "cash"
                ? "border-cash bg-cash/10 text-cash"
                : "border-border bg-background text-muted-foreground hover:border-cash/50"
            )}
          >
            <Wallet className="w-4 h-4" />
            Cash
          </button>
          <button
            onClick={() => onTypeFilterChange("credit")}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all",
              "border-2 flex items-center justify-center gap-2",
              typeFilter === "credit"
                ? "border-credit bg-credit/10 text-credit"
                : "border-border bg-background text-muted-foreground hover:border-credit/50"
            )}
          >
            <CreditCard className="w-4 h-4" />
            Crédit
          </button>
        </div>
      </div>

      {/* Date range picker */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-medium">Période</p>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "w-full py-3 px-4 rounded-xl text-sm font-medium transition-all",
                "border-2 flex items-center justify-between",
                hasDateFilter
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                <span>{hasDateFilter ? formatDateRange() : "Sélectionner une période"}</span>
              </div>
              {hasDateFilter && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDateRangeChange({ from: undefined, to: undefined });
                  }}
                  className="p-1 hover:bg-primary/20 rounded-full transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-card border-border shadow-lg rounded-2xl overflow-hidden" align="center">
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                onDateRangeChange({
                  from: range?.from,
                  to: range?.to,
                });
                if (range?.from && range?.to) {
                  setCalendarOpen(false);
                }
              }}
              locale={fr}
              numberOfMonths={1}
              disabled={(date) => date > new Date()}
              className="p-3"
            />
            {hasDateFilter && (
              <div className="p-3 border-t border-border bg-muted/50">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDateRangeChange({ from: undefined, to: undefined });
                    setCalendarOpen(false);
                  }}
                  className="w-full rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" />
                  Effacer la période
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};
