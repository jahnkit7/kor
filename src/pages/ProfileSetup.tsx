import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Store, 
  User, 
  MapPin, 
  Briefcase, 
  Phone, 
  ArrowRight, 
  Loader2,
  Check,
  Building2,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";
import { clearProfileCache } from "@/components/RequireProfile";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// Types d'activité avec configuration automatique
const ACTIVITY_TYPES = [
  { 
    value: "retail", 
    label: "Commerce de détail", 
    icon: "🛒",
    description: "Boutique, quincaillerie, vêtements...",
    autoDeductStock: true,
  },
  { 
    value: "restaurant", 
    label: "Restauration", 
    icon: "🍽️",
    description: "Bar, restaurant, maquis, snack...",
    autoDeductStock: false,
  },
  { 
    value: "services", 
    label: "Services", 
    icon: "✂️",
    description: "Salon, pressing, réparation...",
    autoDeductStock: false,
  },
] as const;

// Spécialités prédéfinies (affinement après le type d'activité)
const SPECIALTIES_BY_TYPE: Record<string, Array<{ value: string; label: string; icon: string }>> = {
  retail: [
    { value: "alimentation", label: "Alimentation générale", icon: "🛒" },
    { value: "vetements", label: "Vêtements & Mode", icon: "👔" },
    { value: "electronique", label: "Électronique", icon: "📱" },
    { value: "cosmetiques", label: "Cosmétiques & Beauté", icon: "💄" },
    { value: "quincaillerie", label: "Quincaillerie", icon: "🔧" },
    { value: "pharmacie", label: "Pharmacie", icon: "💊" },
    { value: "autre_retail", label: "Autre commerce", icon: "📦" },
  ],
  restaurant: [
    { value: "restaurant", label: "Restaurant / Maquis", icon: "🍽️" },
    { value: "bar", label: "Bar / Buvette", icon: "🍹" },
    { value: "snack", label: "Snack / Fast-food", icon: "🍔" },
    { value: "jus", label: "Bar à jus", icon: "🧃" },
    { value: "boulangerie", label: "Boulangerie / Pâtisserie", icon: "🥐" },
    { value: "autre_resto", label: "Autre restauration", icon: "🍳" },
  ],
  services: [
    { value: "salon_coiffure", label: "Salon de coiffure", icon: "✂️" },
    { value: "pressing", label: "Pressing / Laverie", icon: "👔" },
    { value: "reparation", label: "Réparation / Dépannage", icon: "🔧" },
    { value: "couture", label: "Couture / Tailleur", icon: "🧵" },
    { value: "autre_service", label: "Autre service", icon: "💼" },
  ],
};

// Steps configuration
const STEPS = [
  { id: 1, title: "Identité", icon: User },
  { id: 2, title: "Boutique", icon: Store },
  { id: 3, title: "Activité", icon: Briefcase },
];

// Progress indicator component
const ProgressIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="flex items-center justify-center gap-2 mb-6">
    {Array.from({ length: totalSteps }).map((_, i) => (
      <div 
        key={i}
        className={cn(
          "transition-all duration-300",
          i + 1 === currentStep 
            ? "w-8 h-2 rounded-full bg-white" 
            : i + 1 < currentStep
              ? "w-2 h-2 rounded-full bg-white/80"
              : "w-2 h-2 rounded-full bg-white/30"
        )}
      />
    ))}
  </div>
);

// Step indicator with icons
const StepIndicator = ({ steps, currentStep }: { steps: typeof STEPS; currentStep: number }) => (
  <div className="flex items-center justify-center gap-1 mb-8">
    {steps.map((step, i) => {
      const Icon = step.icon;
      const isActive = step.id === currentStep;
      const isComplete = step.id < currentStep;
      
      return (
        <div key={step.id} className="flex items-center">
          <div 
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300",
              isActive && "bg-white text-primary shadow-lg",
              isComplete && "bg-white/20 text-white",
              !isActive && !isComplete && "bg-white/10 text-white/50"
            )}
          >
            {isComplete ? (
              <Check className="w-5 h-5" />
            ) : (
              <Icon className="w-5 h-5" />
            )}
          </div>
          {i < steps.length - 1 && (
            <div 
              className={cn(
                "w-8 h-0.5 mx-1 transition-all duration-300",
                step.id < currentStep ? "bg-white/40" : "bg-white/10"
              )} 
            />
          )}
        </div>
      );
    })}
  </div>
);

// Input field with modern styling
const ModernInput = ({ 
  id, 
  label, 
  icon: Icon, 
  value, 
  onChange, 
  placeholder,
  type = "text",
  readOnly = false,
  hint
}: { 
  id: string;
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
  readOnly?: boolean;
  hint?: string;
}) => (
  <motion.div 
    className="space-y-2"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Label htmlFor={id} className="text-sm font-medium text-foreground flex items-center gap-2">
      <Icon className="w-4 h-4 text-muted-foreground" />
      {label}
    </Label>
    <Input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      className={cn(
        "h-14 bg-card border border-border/50 rounded-2xl text-foreground placeholder:text-muted-foreground",
        "focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200",
        "shadow-sm hover:shadow-md",
        readOnly && "bg-muted/50"
      )}
    />
    {hint && (
      <p className="text-xs text-muted-foreground pl-1">{hint}</p>
    )}
  </motion.div>
);

// Helper to detect activity type from specialty
const detectActivityType = (specialty: string | null | undefined): "retail" | "restaurant" | "services" => {
  if (!specialty) return "retail";
  
  // Check restaurant specialties
  if (SPECIALTIES_BY_TYPE.restaurant.some(s => s.value === specialty)) return "restaurant";
  // Check services specialties  
  if (SPECIALTIES_BY_TYPE.services.some(s => s.value === specialty)) return "services";
  // Check if specialty IS the activity type directly
  if (specialty === "restaurant" || specialty === "services") return specialty;
  // Default to retail
  return "retail";
};

const ProfileSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  
  // Edit mode from URL param - allows modifying existing profile
  const isEditMode = searchParams.get("edit") === "true";

  const [step, setStep] = useState(1);
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [city, setCity] = useState("");
  const [activityType, setActivityType] = useState<"retail" | "restaurant" | "services">("retail");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  
  // Invite info from URL or localStorage
  const [inviteInfo, setInviteInfo] = useState<{
    ownerShopName?: string;
    ownerName?: string;
    employeePhone?: string;
    isEmployee?: boolean;
  } | null>(null);

  // Extract phone number from fake email (format: 228XXXXXXXX@kor.local)
  const extractedPhone = useMemo(() => {
    if (!user?.email) return "";
    const match = user.email.match(/^(\d+)@(?:dekon|kor)\.local$/);
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

  // Check for pending invite and fetch invite details
  useEffect(() => {
    const checkInvite = async () => {
      const inviteCode = searchParams.get("invite") || localStorage.getItem("pendingInviteCode");
      
      if (!inviteCode) return;
      
      try {
        const supabase = await getSupabaseClient();
        
        // Fetch invite details
        const { data: invite } = await supabase
          .from("employee_invites")
          .select("owner_user_id, employee_phone")
          .eq("invite_code", inviteCode)
          .maybeSingle();
        
        if (invite) {
          // Get owner profile
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("shop_name, owner_name")
            .eq("user_id", invite.owner_user_id)
            .maybeSingle();
          
          setInviteInfo({
            ownerShopName: ownerProfile?.shop_name,
            ownerName: ownerProfile?.owner_name,
            employeePhone: invite.employee_phone,
            isEmployee: true,
          });
          
          // Store for later use in AcceptInvite
          localStorage.setItem("pendingInviteCode", inviteCode);
        }
      } catch (error) {
        console.error("Error fetching invite:", error);
      }
    };
    
    checkInvite();
  }, [searchParams]);

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
            data?.owner_name &&
            data?.specialty
        );

        // In edit mode, don't redirect - allow editing
        if (isComplete && !isEditMode) {
          // Check if we have a pending invite to accept
          const pendingInvite = localStorage.getItem("pendingInviteCode");
          if (pendingInvite) {
            navigate(`/invite?code=${pendingInvite}`, { replace: true });
          } else {
            safeRedirect("/dashboard");
          }
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
          
          // In edit mode, also detect and set the activity type from specialty
          if (isEditMode && data.specialty) {
            setActivityType(detectActivityType(data.specialty));
          }
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
  }, [user, authLoading, extractedPhone, navigate, isEditMode]);

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

      const activityConfig = ACTIVITY_TYPES.find(t => t.value === activityType);
      const profileData = {
        shop_name: shopName.trim(),
        owner_name: ownerName.trim(),
        city: city.trim() || null,
        specialty: specialty || activityType, // Use activity type as fallback
        phone: phone.trim() || null,
        onboarding_completed: true,
        auto_deduct_stock: activityConfig?.autoDeductStock ?? true,
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

      // Clear profile cache so RequireProfile doesn't redirect back
      clearProfileCache(user.id);
      
      toast.success("Profil configuré !");
      
      // Check if we have a pending invite
      const pendingInvite = localStorage.getItem("pendingInviteCode");
      if (pendingInvite) {
        navigate(`/invite?code=${pendingInvite}`, { replace: true });
      } else {
        try {
          window.location.assign("/dashboard");
        } catch (e) {
          console.error("Redirect failed:", e);
        }
      }
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la sauvegarde");
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !ownerName.trim()) {
      toast.error("Veuillez entrer votre nom");
      return;
    }
    if (step === 2 && !shopName.trim()) {
      toast.error("Veuillez entrer le nom de votre boutique");
      return;
    }
    setStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  // Show loading while checking auth or profile
  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  const isStep1Valid = ownerName.trim().length > 0;
  const isStep2Valid = shopName.trim().length > 0;
  const isFormValid = isStep1Valid && isStep2Valid;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Header with gradient */}
      <div 
        className="gradient-hero px-6 pb-8 relative overflow-hidden"
        style={{ paddingTop: 'max(env(safe-area-inset-top), 24px)' }}
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="absolute top-20 left-10 w-3 h-3 rounded-full bg-white/20" />
        <div className="absolute top-32 right-20 w-2 h-2 rounded-full bg-white/30" />
        
        {/* Progress */}
        <ProgressIndicator currentStep={step} totalSteps={3} />
        
        {/* Title */}
        <div className="text-center relative z-10 mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {step === 1 && "Qui êtes-vous ?"}
            {step === 2 && "Votre boutique"}
            {step === 3 && "Derniers détails"}
          </h1>
          <p className="text-white/70 text-sm">
            {step === 1 && "Commençons par faire connaissance"}
            {step === 2 && "Parlez-nous de votre commerce"}
            {step === 3 && "Presque terminé !"}
          </p>
        </div>

        {/* Step indicators */}
        <StepIndicator steps={STEPS} currentStep={step} />
        
        {/* Employee invite banner */}
        {inviteInfo?.isEmployee && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-xs">Vous rejoignez l'équipe de</p>
                <p className="text-white font-semibold">{inviteInfo.ownerShopName || "une boutique"}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Form Card - Floating */}
      <div className="flex-1 px-4 -mt-4 pb-8 relative z-20">
        <div className="bg-card rounded-3xl shadow-xl border border-border/50 p-6 max-w-md mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Identity */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <ModernInput
                    id="ownerName"
                    label="Votre nom complet *"
                    icon={User}
                    value={ownerName}
                    onChange={setOwnerName}
                    placeholder="Ex: Mamadou Diop"
                  />
                  
                  <ModernInput
                    id="phone"
                    label="Numéro de téléphone"
                    icon={Phone}
                    value={phone}
                    onChange={setPhone}
                    placeholder="+228 90 123 45 67"
                    type="tel"
                    readOnly={!!extractedPhone}
                    hint={extractedPhone ? "Détecté automatiquement" : undefined}
                  />
                </motion.div>
              )}

              {/* Step 2: Shop info */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <ModernInput
                    id="shopName"
                    label="Nom de votre boutique *"
                    icon={Store}
                    value={shopName}
                    onChange={setShopName}
                    placeholder="Ex: Boutique Mamadou"
                  />
                  
                  <ModernInput
                    id="city"
                    label="Ville"
                    icon={MapPin}
                    value={city}
                    onChange={setCity}
                    placeholder="Ex: Lomé, Cotonou..."
                  />
                </motion.div>
              )}

              {/* Step 3: Activity Type */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  {/* Activity Type Selection */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-muted-foreground" />
                      Type d'activité
                    </Label>
                    <div className="grid gap-2">
                      {ACTIVITY_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => {
                            setActivityType(type.value as "retail" | "restaurant" | "services");
                            setSpecialty(""); // Reset specialty when type changes
                          }}
                          className={cn(
                            "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left",
                            activityType === type.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="text-2xl">{type.icon}</span>
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{type.label}</p>
                            <p className="text-xs text-muted-foreground">{type.description}</p>
                          </div>
                          {activityType === type.value && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Specialty Selection (based on activity type) */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">
                      Spécialité (optionnel)
                    </Label>
                    <Select value={specialty} onValueChange={setSpecialty}>
                      <SelectTrigger className="h-12 bg-card border border-border/50 rounded-xl text-foreground">
                        <SelectValue placeholder="Précisez votre activité..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border rounded-xl">
                        {(SPECIALTIES_BY_TYPE[activityType] || []).map((spec) => (
                          <SelectItem key={spec.value} value={spec.value} className="text-foreground">
                            <span className="flex items-center gap-2">
                              <span>{spec.icon}</span>
                              <span>{spec.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Service Mode Info Banner */}
                  {(activityType === "restaurant" || activityType === "services") && (
                    <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                        ✨ Mode Service activé
                      </p>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        La déduction automatique du stock sera désactivée. Idéal pour les activités sans gestion d'inventaire physique.
                      </p>
                    </div>
                  )}

                  {/* Summary */}
                  <div className="bg-muted/50 rounded-2xl p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">Récapitulatif</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Nom</span>
                        <span className="font-medium text-foreground">{ownerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Boutique</span>
                        <span className="font-medium text-foreground">{shopName}</span>
                      </div>
                      {city && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ville</span>
                          <span className="font-medium text-foreground">{city}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Activité</span>
                        <span className="font-medium text-foreground">
                          {ACTIVITY_TYPES.find(t => t.value === activityType)?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 h-14 rounded-2xl bg-muted text-foreground font-semibold transition-all hover:bg-muted/80 active:scale-[0.98]"
                >
                  Retour
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={(step === 1 && !isStep1Valid) || (step === 2 && !isStep2Valid)}
                  className="flex-1 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold transition-all 
                             hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                >
                  Continuer
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground 
                             font-bold transition-all hover:shadow-lg active:scale-[0.98] 
                             disabled:opacity-50 disabled:cursor-not-allowed
                             flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Commencer
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Modifiable à tout moment dans les réglages
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetup;
