import { useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface Country {
  code: string;
  name: string;
  dial_code: string;
  flag: string;
}

export const countries: Country[] = [
  { code: "SN", name: "Sénégal", dial_code: "+221", flag: "🇸🇳" },
  { code: "CI", name: "Côte d'Ivoire", dial_code: "+225", flag: "🇨🇮" },
  { code: "ML", name: "Mali", dial_code: "+223", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", dial_code: "+226", flag: "🇧🇫" },
  { code: "GN", name: "Guinée", dial_code: "+224", flag: "🇬🇳" },
  { code: "NE", name: "Niger", dial_code: "+227", flag: "🇳🇪" },
  { code: "TG", name: "Togo", dial_code: "+228", flag: "🇹🇬" },
  { code: "BJ", name: "Bénin", dial_code: "+229", flag: "🇧🇯" },
  { code: "MR", name: "Mauritanie", dial_code: "+222", flag: "🇲🇷" },
  { code: "CM", name: "Cameroun", dial_code: "+237", flag: "🇨🇲" },
  { code: "GA", name: "Gabon", dial_code: "+241", flag: "🇬🇦" },
  { code: "CG", name: "Congo", dial_code: "+242", flag: "🇨🇬" },
  { code: "CD", name: "RD Congo", dial_code: "+243", flag: "🇨🇩" },
  { code: "MA", name: "Maroc", dial_code: "+212", flag: "🇲🇦" },
  { code: "DZ", name: "Algérie", dial_code: "+213", flag: "🇩🇿" },
  { code: "TN", name: "Tunisie", dial_code: "+216", flag: "🇹🇳" },
  { code: "FR", name: "France", dial_code: "+33", flag: "🇫🇷" },
  { code: "BE", name: "Belgique", dial_code: "+32", flag: "🇧🇪" },
  { code: "CH", name: "Suisse", dial_code: "+41", flag: "🇨🇭" },
  { code: "CA", name: "Canada", dial_code: "+1", flag: "🇨🇦" },
];

interface CountryCodeSelectProps {
  value: Country;
  onChange: (country: Country) => void;
}

const CountryCodeSelect = ({ value, onChange }: CountryCodeSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dial_code.includes(search)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-1 px-2 h-auto py-0 hover:bg-transparent"
        >
          <span className="text-xl">{value.flag}</span>
          <span className="text-sm font-medium text-muted-foreground">
            {value.dial_code}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <Input
          placeholder="Rechercher un pays..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />
        <ScrollArea className="h-60">
          <div className="space-y-1">
            {filteredCountries.map((country) => (
              <button
                key={country.code}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  value.code === country.code
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-secondary"
                }`}
                onClick={() => {
                  onChange(country);
                  setOpen(false);
                  setSearch("");
                }}
              >
                <span className="text-xl">{country.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{country.name}</p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {country.dial_code}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default CountryCodeSelect;
