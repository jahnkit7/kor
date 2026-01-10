import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

// Éléments décoratifs géométriques
const DecoElements = () => (
  <>
    {/* Dégradé rose/violet en haut à gauche */}
    <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-pink-200/40 via-purple-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
    
    {/* Dégradé bleu en haut à droite */}
    <div className="absolute top-20 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-2xl pointer-events-none" />
    
    {/* Points colorés */}
    <div className="absolute bottom-32 left-8 w-3 h-3 rounded-full bg-yellow-400 pointer-events-none" />
    <div className="absolute bottom-36 left-24 w-2 h-2 rounded-full bg-green-500 pointer-events-none" />
    <div className="absolute bottom-40 right-20 w-2 h-2 rounded-full bg-emerald-400 pointer-events-none" />
    <div className="absolute bottom-44 right-8 w-3 h-3 rounded-full border-2 border-red-400 pointer-events-none" />
    
    {/* Losanges */}
    <div className="absolute bottom-28 left-12 w-2 h-2 rotate-45 bg-slate-400 pointer-events-none" />
    <div className="absolute bottom-24 left-32 w-2 h-2 rotate-45 bg-slate-300 pointer-events-none" />
  </>
);

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
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#4f7df3] border-t-transparent rounded-full" />
      </div>
    );
  }

  const isFormValid = shopName.trim() && ownerName.trim();

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] flex flex-col font-poppins relative overflow-hidden">
      {/* Éléments décoratifs */}
      <DecoElements />
      
      {/* Header */}
      <div className="px-6 pt-12 pb-4 text-left relative z-10">
        <h1 className="text-3xl font-extrabold text-[#2d3748] mb-2">
          Configurez votre boutique
        </h1>
        <p className="text-[#718096] font-light text-sm">
          Étape finale avant de commencer
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 flex flex-col px-6 pb-8 relative z-10 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full">
          {/* Owner Name */}
          <div className="space-y-1.5">
            <Label htmlFor="ownerName" className="text-sm font-medium text-[#2d3748] flex items-center gap-2">
              <User className="w-4 h-4 text-[#718096]" />
              Votre nom *
            </Label>
            <Input
              id="ownerName"
              type="text"
              placeholder="Ex: Mamadou Diop"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="h-12 bg-[#f5f7fa] border-0 rounded-xl text-[#2d3748] placeholder:text-[#a0aec0] focus:ring-2 focus:ring-[#4f7df3]/20"
              autoComplete="name"
            />
          </div>

          {/* Shop Name */}
          <div className="space-y-1.5">
            <Label htmlFor="shopName" className="text-sm font-medium text-[#2d3748] flex items-center gap-2">
              <Store className="w-4 h-4 text-[#718096]" />
              Nom de la boutique *
            </Label>
            <Input
              id="shopName"
              type="text"
              placeholder="Ex: Boutique Mamadou"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="h-12 bg-[#f5f7fa] border-0 rounded-xl text-[#2d3748] placeholder:text-[#a0aec0] focus:ring-2 focus:ring-[#4f7df3]/20"
            />
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <Label htmlFor="city" className="text-sm font-medium text-[#2d3748] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#718096]" />
              Ville
            </Label>
            <Input
              id="city"
              type="text"
              placeholder="Ex: Lomé, Cotonou..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-12 bg-[#f5f7fa] border-0 rounded-xl text-[#2d3748] placeholder:text-[#a0aec0] focus:ring-2 focus:ring-[#4f7df3]/20"
            />
          </div>

          {/* Specialty */}
          <div className="space-y-1.5">
            <Label htmlFor="specialty" className="text-sm font-medium text-[#2d3748] flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-[#718096]" />
              Spécialité
            </Label>
            <Select value={specialty} onValueChange={setSpecialty}>
              <SelectTrigger className="h-12 bg-[#f5f7fa] border-0 rounded-xl text-[#2d3748] focus:ring-2 focus:ring-[#4f7df3]/20">
                <SelectValue placeholder="Sélectionnez une spécialité" />
              </SelectTrigger>
              <SelectContent className="bg-white border-[#e2e8f0] rounded-xl">
                {SPECIALTIES.map((spec) => (
                  <SelectItem key={spec.value} value={spec.value} className="text-[#2d3748]">
                    {spec.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Phone (pre-filled, read-only visual) */}
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm font-medium text-[#2d3748] flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#718096]" />
              Téléphone
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+228 90 123 45 67"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 bg-[#e8ecf4] border-0 rounded-xl text-[#718096] placeholder:text-[#a0aec0]"
              readOnly={!!extractedPhone}
            />
            {extractedPhone && (
              <p className="text-xs text-[#718096]">
                Numéro détecté automatiquement
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="
                relative w-full h-14 rounded-full flex items-center justify-center gap-2
                bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8]
                text-white font-bold text-base tracking-wide uppercase
                shadow-lg shadow-blue-500/30
                hover:shadow-xl hover:shadow-blue-500/40
                active:scale-[0.98]
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                overflow-hidden
              "
            >
              {/* Décorations intégrées au bouton */}
              <span className="absolute left-4 top-2 w-1.5 h-1.5 rounded-full bg-white/30" />
              <span className="absolute left-6 bottom-3 w-1 h-1 rotate-45 bg-white/20" />
              <span className="absolute right-5 top-3 w-1 h-1 rotate-45 bg-white/25" />
              <span className="absolute right-8 bottom-2 w-1.5 h-1.5 rounded-full border border-white/20" />
              
              {isLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  COMMENCER
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          <p className="text-center text-xs text-[#a0aec0] pt-2">
            Modifiable à tout moment dans les réglages
          </p>
        </form>
      </div>
    </div>
  );
};

export default ProfileSetup;
