import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Filter, X, Wallet, CreditCard } from "lucide-react";
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
      return `${format(dateRange.from, "dd/MM", { locale: fr })} - ${format(dateRange.to, "dd/MM", { locale: fr })}`;
    }
    if (dateRange.from) {
      return `À partir du ${format(dateRange.from, "dd/MM", { locale: fr })}`;
    }
    return "Sélectionner dates";
  };

  const hasDateFilter = dateRange.from || dateRange.to;

  return (
    <div className="space-y-3">
      {/* Type filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={typeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeFilterChange("all")}
          className="h-8"
        >
          <Filter className="w-3.5 h-3.5 mr-1.5" />
          Tous
        </Button>
        <Button
          variant={typeFilter === "cash" ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeFilterChange("cash")}
          className={cn(
            "h-8",
            typeFilter === "cash" && "bg-cash hover:bg-cash/90 text-white"
          )}
        >
          <Wallet className="w-3.5 h-3.5 mr-1.5" />
          Cash
        </Button>
        <Button
          variant={typeFilter === "credit" ? "default" : "outline"}
          size="sm"
          onClick={() => onTypeFilterChange("credit")}
          className={cn(
            "h-8",
            typeFilter === "credit" && "bg-credit hover:bg-credit/90 text-white"
          )}
        >
          <CreditCard className="w-3.5 h-3.5 mr-1.5" />
          Crédit
        </Button>

        {/* Date range picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={hasDateFilter ? "default" : "outline"}
              size="sm"
              className="h-8"
            >
              <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
              {formatDateRange()}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 bg-popover" align="start">
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
            />
            {hasDateFilter && (
              <div className="p-3 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onDateRangeChange({ from: undefined, to: undefined });
                    setCalendarOpen(false);
                  }}
                  className="w-full"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Effacer les dates
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Clear all filters */}
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8 text-muted-foreground"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Effacer ({activeFiltersCount})
          </Button>
        )}
      </div>

      {/* Active filters badges */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {typeFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              {typeFilter === "cash" ? (
                <>
                  <Wallet className="w-3 h-3" />
                  Cash uniquement
                </>
              ) : (
                <>
                  <CreditCard className="w-3 h-3" />
                  Crédit uniquement
                </>
              )}
              <button
                onClick={() => onTypeFilterChange("all")}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {hasDateFilter && (
            <Badge variant="secondary" className="gap-1">
              <CalendarIcon className="w-3 h-3" />
              {formatDateRange()}
              <button
                onClick={() => onDateRangeChange({ from: undefined, to: undefined })}
                className="ml-1 hover:bg-muted rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
