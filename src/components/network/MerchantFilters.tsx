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
import { Filter, Search, X, MapPin } from "lucide-react";

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
  };

  const toggleSpecialty = (specialty: string) => {
    handleSpecialtyChange(filters.specialty === specialty ? null : specialty);
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un marchand..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
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
            <Button variant="outline" className="relative">
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filtres</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              {/* Type de marchand */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Type de marchand</label>
                <Select
                  value={filters.merchantType || "all"}
                  onValueChange={handleTypeChange}
                >
                  <SelectTrigger>
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
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Localisation
                </label>
                <Select
                  value={filters.location || "all"}
                  onValueChange={handleLocationChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les localisations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Spécialités */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Spécialités</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((specialty) => (
                    <Badge
                      key={specialty}
                      variant={
                        filters.specialty === specialty ? "default" : "outline"
                      }
                      className="cursor-pointer"
                      onClick={() => toggleSpecialty(specialty)}
                    >
                      {specialty}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Clear filters button */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearAllFilters}
                >
                  Effacer les filtres
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active filters display */}
      {(filters.specialty || filters.merchantType || filters.location) && (
        <div className="flex flex-wrap gap-2">
          {filters.merchantType && (
            <Badge variant="secondary" className="gap-1">
              {MERCHANT_TYPES.find((t) => t.value === filters.merchantType)?.label}
              <button onClick={() => handleTypeChange(null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.location && (
            <Badge variant="secondary" className="gap-1">
              <MapPin className="h-3 w-3" />
              {filters.location}
              <button onClick={() => handleLocationChange(null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.specialty && (
            <Badge variant="secondary" className="gap-1">
              {filters.specialty}
              <button onClick={() => handleSpecialtyChange(null)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
