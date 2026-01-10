import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Store, User, MapPin, Briefcase, Phone, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

// Spécialités prédéfinies
const SPECIALTIES = [
  { value: "alimentation", label: "Alimentation générale" },
  { value: "vetements", label: "Vêtements & Mode" },
  { value: "electronique", label: "Électronique" },
  { value: "cosmetiques", label: "Cosmétiques & Beauté" },
  { value: "quincaillerie", label: "Quincaillerie" },
  { value: "restaurant", label: "Restaurant / Maquis" },
  { value: "pharmacie", label: "Pharmacie" },
  { value: "autre", label: "Autre" },
];

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Extract phone number from fake email (format: 228XXXXXXXX@dekon.local)
  const extractedPhone = useMemo(() => {
    if (!user?.email) return "";
    const match = user.email.match(/^(\d+)@dekon\.local$/);
    if (match) {
      const fullNumber = match[1];
      // Format: +228 XX XXX XX XX
      if (fullNumber.length >= 11) {
        const countryCode = fullNumber.slice(0, 3);
        const number = fullNumber.slice(3);
        return `+${countryCode} ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5, 7)} ${number.slice(7)}`;
      }
      return fullNumber;
    }
    return "";
  }, [user?.email]);

  // Check profile on mount - if complete, redirect
  useEffect(() => {
    let cancelled = false;

    const safeRedirect = (path: string) => {
      try {
        window.location.assign(path);
      } catch (e) {
        console.error("Redirect failed:", e);
      }
    };

    const checkProfile = async () => {
      if (authLoading) return;

      if (!user) {
        safeRedirect("/auth");
        return;
      }

      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          console.error("Error checking profile:", error);
          return;
        }

        const isComplete = Boolean(
          data?.shop_name &&
            data.shop_name !== "Ma Boutique" &&
            data?.owner_name
        );

        if (isComplete) {
          safeRedirect("/dashboard");
          return;
        }

        if (data) {
          setShopName(
            data.shop_name && data.shop_name !== "Ma Boutique" ? data.shop_name : ""
          );
          setOwnerName(data.owner_name ?? "");
          setCity(data.city ?? "");
          setSpecialty(data.specialty ?? "");
          setPhone(data.phone ?? extractedPhone);
        } else {
          // Pre-fill phone from extracted value
          setPhone(extractedPhone);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    checkProfile();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, extractedPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shopName.trim() || !ownerName.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = await getSupabaseClient();

      // Check if profile exists
      const { data: existing, error: existingError } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) {
        console.error("Error checking profile:", existingError);
        toast.error("Erreur lors de la sauvegarde");
        setIsLoading(false);
        return;
      }

      const profileData = {
        shop_name: shopName.trim(),
        owner_name: ownerName.trim(),
        city: city.trim() || null,
        specialty: specialty || null,
        phone: phone.trim() || null,
        onboarding_completed: true,
      };

      if (!existing) {
        // Create new profile
        const { error: insertError } = await supabase.from("profiles").insert({
          user_id: user.id,
          ...profileData,
        });

        if (insertError) {
          console.error("Error creating profile:", insertError);
          toast.error("Erreur lors de la sauvegarde");
          setIsLoading(false);
          return;
        }
      } else {
        // Update existing profile
        const { error: updateError } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("user_id", user.id);

        if (updateError) {
          console.error("Error updating profile:", updateError);
          toast.error("Erreur lors de la sauvegarde");
          setIsLoading(false);
          return;
        }
      }

      toast.success("Profil configuré !");
      try {
        window.location.assign("/dashboard");
      } catch (e) {
        console.error("Redirect failed:", e);
      }
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la sauvegarde");
      setIsLoading(false);
    }
  };

  // Show loading while checking auth or profile
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isFormValid = shopName.trim() && ownerName.trim();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex flex-col">
      {/* Header compact */}
      <div className="px-6 pt-8 pb-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-3">
          <Store className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Configurez votre boutique</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Étape finale avant de commencer
        </p>
      </div>

      {/* Form - full screen centered */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full">
          {/* Owner Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ownerName" className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              Votre nom *
            </Label>
            <Input
              id="ownerName"
              type="text"
              placeholder="Ex: Mamadou Diop"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="h-12 bg-card border-border/50 focus:border-primary"
              autoComplete="name"
            />
          </div>

          {/* Shop Name */}
          <div className="space-y-1.5">
            <Label htmlFor="shopName" className="text-sm font-medium flex items-center gap-2">
              <Store className="w-4 h-4 text-muted-foreground" />
              Nom de la boutique *
            </Label>
            <Input
              id="shopName"
              type="text"
              placeholder="Ex: Boutique Mamadou"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="h-12 bg-card border-border/50 focus:border-primary"
            />
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              Ville
            </Label>
            <Input
              id="city"
              type="text"
              placeholder="Ex: Lomé, Cotonou..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-12 bg-card border-border/50 focus:border-primary"
            />
          </div>

          {/* Specialty */}
          <div className="space-y-1.5">
            <Label htmlFor="specialty" className="text-sm font-medium flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              Spécialité
            </Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="h-12 bg-card border-border/50 focus:border-primary">
                <SelectValue placeholder="Sélectionnez une spécialité" />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTIES.map((spec) => (
                  <SelectItem key={spec.value} value={spec.value}>
                    {spec.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone (pre-filled, read-only visual) */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              Téléphone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+228 90 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 bg-muted/50 border-border/50 text-muted-foreground"
              readOnly={!!extractedPhone}
            />
            {extractedPhone && (
              <p className="text-xs text-muted-foreground">
                Numéro détecté automatiquement
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90"
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Commencer
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Modifiable à tout moment dans les réglages
          </p>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
