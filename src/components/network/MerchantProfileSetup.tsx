import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Check, 
  Store, 
  Eye, 
  EyeOff,
  Loader2,
  Sparkles,
  Navigation,
  Edit3
} from "lucide-react";
import { 
  useMerchantProfile, 
  MERCHANT_TYPES, 
  SPECIALTIES,
  type MerchantProfile 
} from "@/hooks/use-merchant-profile";
import { MarketAddressInput } from "./MarketAddressInput";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MerchantProfileSetupProps {
  onComplete?: () => void;
}

export function MerchantProfileSetup({ onComplete }: MerchantProfileSetupProps) {
  const { profile, loading, createOrUpdateProfile, hasProfile } = useMerchantProfile();
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [merchantType, setMerchantType] = useState("détaillant");
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [locationName, setLocationName] = useState("");
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [marketAddress, setMarketAddress] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  // Show profile summary if we have a profile and not editing
  const showSummary = hasProfile && !isEditing;

  // Update state when profile loads
  useEffect(() => {
    if (profile) {
      setMerchantType(profile.merchant_type);
      setSpecialties(profile.specialties || []);
      setLocationName(profile.location_name || "");
      setLocationLat(profile.location_lat);
      setLocationLng(profile.location_lng);
      setMarketAddress(profile.market_address || "");
      setIsVisible(profile.is_visible);
    }
  }, [profile]);

  const toggleSpecialty = (specialty: string) => {
    setSpecialties(prev => 
      prev.includes(specialty) 
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    );
  };

  const getGPSLocation = () => {
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationLat(position.coords.latitude);
        setLocationLng(position.coords.longitude);
        toast.success("Position GPS enregistrée !");
        setGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Impossible d'obtenir votre position");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await createOrUpdateProfile({
      merchant_type: merchantType,
      specialties,
      location_name: locationName || null,
      location_lat: locationLat,
      location_lng: locationLng,
      market_address: marketAddress || null,
      is_visible: isVisible,
    });
    setSaving(false);
    
    if (result && onComplete) {
      onComplete();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Profile Summary View
  if (showSummary && profile) {
    const typeInfo = MERCHANT_TYPES.find(t => t.value === profile.merchant_type);
    const specialtyInfos = profile.specialties?.map(s => SPECIALTIES.find(sp => sp.value === s)).filter(Boolean) || [];

    return (
      <div className="space-y-6">
        {/* Profile Header */}
        <div className="text-center pb-2">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center mb-4">
            <Store className="w-10 h-10 text-primary-foreground" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {profile.profiles?.shop_name || "Ma Boutique"}
          </h2>
          {profile.profiles?.owner_name && (
            <p className="text-muted-foreground mt-1">{profile.profiles.owner_name}</p>
          )}
          <Badge 
            variant={profile.is_visible ? "default" : "secondary"} 
            className="mt-3"
          >
            {profile.is_visible ? (
              <><Eye className="w-3 h-3 mr-1" /> Visible sur le réseau</>
            ) : (
              <><EyeOff className="w-3 h-3 mr-1" /> Profil masqué</>
            )}
          </Badge>
        </div>

        {/* Type */}
        <div className="p-4 bg-secondary rounded-xl">
          <p className="text-xs text-muted-foreground mb-1">Type de commerce</p>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{typeInfo?.emoji}</span>
            <div>
              <p className="font-semibold text-foreground">{typeInfo?.label}</p>
              <p className="text-xs text-muted-foreground">{typeInfo?.description}</p>
            </div>
          </div>
        </div>

        {/* Specialties */}
        {specialtyInfos.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">Spécialités</p>
            <div className="flex flex-wrap gap-2">
              {specialtyInfos.map((sp) => sp && (
                <Badge key={sp.value} variant="outline" className="text-sm py-1.5 px-3">
                  <span className="mr-1.5">{sp.emoji}</span>
                  {sp.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Location */}
        {(profile.location_name || profile.market_address) && (
          <div className="p-4 bg-secondary rounded-xl">
            <p className="text-xs text-muted-foreground mb-1">Localisation</p>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                {profile.location_name && (
                  <p className="font-medium text-foreground">{profile.location_name}</p>
                )}
                {profile.market_address && (
                  <p className="text-sm text-muted-foreground">{profile.market_address}</p>
                )}
                {profile.location_lat && profile.location_lng && (
                  <p className="text-xs text-primary mt-1">
                    ✓ Position GPS enregistrée
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Button */}
        <Button
          onClick={() => setIsEditing(true)}
          variant="outline"
          className="w-full h-12 rounded-xl"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Modifier mon profil
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-2">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center mb-4">
          <Store className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground">
          {hasProfile ? "Modifier mon profil" : "Rejoindre le réseau"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Connectez-vous avec d'autres marchands
        </p>
      </div>

      {/* Merchant Type Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground">Type de commerce</Label>
        <div className="grid grid-cols-2 gap-2">
          {MERCHANT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setMerchantType(type.value)}
              className={cn(
                "p-3 rounded-xl border-2 transition-all text-left relative",
                merchantType === type.value
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/50"
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{type.emoji}</span>
                <span className="font-semibold text-sm text-foreground">{type.label}</span>
              </div>
              <p className="text-xs text-muted-foreground">{type.description}</p>
              {merchantType === type.value && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-primary" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Specialties Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground">
          Spécialités <span className="text-muted-foreground font-normal">(plusieurs possibles)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((specialty) => (
            <button
              key={specialty.value}
              onClick={() => toggleSpecialty(specialty.value)}
              className={cn(
                "px-3 py-2 rounded-full border transition-all flex items-center gap-1.5 text-sm",
                specialties.includes(specialty.value)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-foreground hover:border-primary/50"
              )}
            >
              <span>{specialty.emoji}</span>
              <span className="font-medium">{specialty.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Location Name */}
      <div className="space-y-2">
        <Label htmlFor="location" className="text-sm font-semibold text-foreground">
          Quartier / Ville
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="location"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="Ex: Lomé, Hédzranawoé"
            className="pl-10 h-12 rounded-xl"
          />
        </div>
      </div>

      {/* GPS Location */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          Position GPS <span className="text-muted-foreground font-normal">(pour la carte)</span>
        </Label>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={getGPSLocation}
            disabled={gettingLocation}
            className="h-12 rounded-xl flex-1"
          >
            {gettingLocation ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Navigation className="w-4 h-4 mr-2" />
            )}
            {locationLat ? "Mettre à jour ma position" : "Enregistrer ma position"}
          </Button>
        </div>
        {locationLat && locationLng && (
          <p className="text-xs text-primary font-medium">
            ✓ Position enregistrée ({locationLat.toFixed(4)}, {locationLng.toFixed(4)})
          </p>
        )}
      </div>

      {/* Market Address */}
      <MarketAddressInput 
        value={marketAddress} 
        onChange={setMarketAddress} 
      />

      {/* Visibility Toggle */}
      <div className="flex items-center justify-between p-4 bg-secondary rounded-xl">
        <div className="flex items-center gap-3">
          {isVisible ? (
            <Eye className="w-5 h-5 text-primary" />
          ) : (
            <EyeOff className="w-5 h-5 text-muted-foreground" />
          )}
          <div>
            <p className="font-semibold text-foreground text-sm">Visible sur le réseau</p>
            <p className="text-xs text-muted-foreground">
              {isVisible ? "Les autres marchands peuvent vous trouver" : "Profil masqué"}
            </p>
          </div>
        </div>
        <Switch checked={isVisible} onCheckedChange={setIsVisible} />
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          onClick={handleSave}
          disabled={saving || specialties.length === 0}
          className="w-full h-14 rounded-2xl text-base font-semibold"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-5 h-5 mr-2" />
          )}
          {hasProfile ? "Mettre à jour" : "Rejoindre le réseau"}
        </Button>
        
        {hasProfile && (
          <Button
            onClick={() => setIsEditing(false)}
            variant="ghost"
            className="w-full h-12 rounded-xl"
          >
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}
