import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, Search, X, MapPin, SlidersHorizontal } from "lucide-react";

const SPECIALTIES = [
  "Alimentation",
  "Boissons",
  "Cosmétiques",
  "Électronique",
  "Vêtements",
  "Quincaillerie",
  "Téléphonie",
  "Autres",
];

const MERCHANT_TYPES = [
  { value: "grossiste", label: "Grossiste" },
  { value: "demi-grossiste", label: "Demi-Grossiste" },
  { value: "détaillant", label: "Détaillant" },
];

export interface MerchantFiltersState {
  search: string;
  specialty: string | null;
  merchantType: string | null;
  location: string | null;
}

interface MerchantFiltersProps {
  filters: MerchantFiltersState;
  onFiltersChange: (filters: MerchantFiltersState) => void;
  locations: string[];
}

export function MerchantFilters({
  filters,
  onFiltersChange,
  locations,
}: MerchantFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = [
    filters.specialty,
    filters.merchantType,
    filters.location,
  ].filter(Boolean).length;

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleSpecialtyChange = (value: string | null) => {
    onFiltersChange({ ...filters, specialty: value });
  };

  const handleTypeChange = (value: string | null) => {
    onFiltersChange({ ...filters, merchantType: value === "all" ? null : value });
  };

  const handleLocationChange = (value: string | null) => {
    onFiltersChange({ ...filters, location: value === "all" ? null : value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: "",
      specialty: null,
      merchantType: null,
      location: null,
    });
    setIsOpen(false);
  };

  const toggleSpecialty = (specialty: string) => {
    handleSpecialtyChange(filters.specialty === specialty ? null : specialty);
  };

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-10 rounded-xl"
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl relative flex-shrink-0">
              <SlidersHorizontal className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] max-h-[70vh] rounded-t-3xl flex flex-col p-0">
            <SheetHeader className="px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
              <SheetTitle className="text-left">Filtres</SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-5 py-4 space-y-6">
                {/* Type de marchand */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Type de marchand</label>
                  <Select
                    value={filters.merchantType || "all"}
                    onValueChange={handleTypeChange}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Tous les types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les types</SelectItem>
                      {MERCHANT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Localisation */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Localisation
                  </label>
                  <Select
                    value={filters.location || "all"}
                    onValueChange={handleLocationChange}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Toutes les localisations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {locations.map((loc) => (
                        <SelectItem key={loc} value={loc}>
                          <span className="truncate">{loc}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Spécialités */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Spécialités</label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map((specialty) => (
                      <Badge
                        key={specialty}
                        variant={filters.specialty === specialty ? "default" : "outline"}
                        className="cursor-pointer px-3 py-1.5 rounded-lg text-sm"
                        onClick={() => toggleSpecialty(specialty)}
                      >
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            {/* Footer */}
            {activeFiltersCount > 0 && (
              <div className="flex-shrink-0 p-5 border-t border-border bg-background pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                <Button
                  variant="outline"
                  className="w-full h-11 rounded-xl"
                  onClick={clearAllFilters}
                >
                  Effacer les filtres ({activeFiltersCount})
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>

      {/* Active filters display - horizontal scroll */}
      {(filters.specialty || filters.merchantType || filters.location) && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {filters.merchantType && (
            <Badge variant="secondary" className="gap-1 flex-shrink-0 rounded-lg">
              <span className="truncate max-w-[100px]">
                {MERCHANT_TYPES.find((t) => t.value === filters.merchantType)?.label}
              </span>
              <button onClick={() => handleTypeChange(null)} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="gap-1 flex-shrink-0 rounded-lg">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate max-w-[100px]">{filters.location}</span>
              <button onClick={() => handleLocationChange(null)} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.specialty && (
            <Badge variant="secondary" className="gap-1 flex-shrink-0 rounded-lg">
              <span className="truncate max-w-[100px]">{filters.specialty}</span>
              <button onClick={() => handleSpecialtyChange(null)} className="ml-0.5">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
