import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Check, Gift } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useUserSubscription } from "@/hooks/use-feature-access";
import { useRole } from "@/hooks/use-role";
import { supabase } from "@/integrations/supabase/client";
import { recordReferral, useValidateReferralCode } from "@/hooks/use-referral-validation";

// Pays d'Afrique de l'Ouest supportés
const COUNTRIES = [
  { code: "TG", name: "Togo", prefix: "+228", flag: "🇹🇬" },
  { code: "BJ", name: "Bénin", prefix: "+229", flag: "🇧🇯" },
  { code: "CI", name: "Côte d'Ivoire", prefix: "+225", flag: "🇨🇮" },
  { code: "SN", name: "Sénégal", prefix: "+221", flag: "🇸🇳" },
  { code: "ML", name: "Mali", prefix: "+223", flag: "🇲🇱" },
  { code: "NE", name: "Niger", prefix: "+227", flag: "🇳🇪" },
  { code: "BF", name: "Burkina Faso", prefix: "+226", flag: "🇧🇫" },
  { code: "CM", name: "Cameroun", prefix: "+237", flag: "🇨🇲" },
];

const DEFAULT_COUNTRY = COUNTRIES[0];
const PIN_LENGTH = 6;

const generateSecurePassword = (pin: string, phone: string, countryPrefix: string): string => {
  const fullPhone = countryPrefix.replace("+", "") + phone;
  const reversedPin = pin.split("").reverse().join("");
  const phoneHash = fullPhone.split("").reduce((acc, char, idx) => {
    return acc + String.fromCharCode(((char.charCodeAt(0) + idx) % 26) + 97);
  }, "");
  return `${reversedPin}${phoneHash.slice(0, 8)}${pin}${fullPhone.slice(-4)}`;
};

// Éléments décoratifs géométriques
const DecoElements = () => (
  <>
    {/* Dégradé rose/violet en haut à gauche */}
    <div className="absolute top-0 left-0 w-48 h-48 bg-gradient-to-br from-pink-200/40 via-purple-200/30 to-transparent rounded-full blur-3xl pointer-events-none" />
    
    {/* Dégradé bleu en haut à droite */}
    <div className="absolute top-20 right-0 w-32 h-32 bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-2xl pointer-events-none" />
    
    {/* Points colorés */}
    <div className="absolute bottom-40 left-8 w-3 h-3 rounded-full bg-yellow-400 pointer-events-none" />
    <div className="absolute bottom-44 left-24 w-2 h-2 rounded-full bg-green-500 pointer-events-none" />
    <div className="absolute bottom-48 right-20 w-2 h-2 rounded-full bg-emerald-400 pointer-events-none" />
    <div className="absolute bottom-52 right-8 w-3 h-3 rounded-full border-2 border-red-400 pointer-events-none" />
    
    {/* Losanges */}
    <div className="absolute bottom-36 left-12 w-2 h-2 rotate-45 bg-slate-400 pointer-events-none" />
    <div className="absolute bottom-32 left-32 w-2 h-2 rotate-45 bg-slate-300 pointer-events-none" />
    
    {/* Arc décoratif */}
    <div className="absolute bottom-28 left-4 w-16 h-16 border-2 border-red-300/50 rounded-full border-t-transparent border-r-transparent pointer-events-none" />
  </>
);

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, isAuthenticated, loading, configured } = useAuth();
  const { data: subscription, isLoading: subLoading } = useUserSubscription();
  const { role, loading: roleLoading, isStable: roleStable } = useRole();
  
  const inviteCode = searchParams.get("invite");
  const refCode = searchParams.get("ref");
  
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [isNewUser, setIsNewUser] = useState(!!inviteCode || !!refCode);
  const [selectedCountry, setSelectedCountry] = useState(DEFAULT_COUNTRY);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countryDetecting, setCountryDetecting] = useState(true);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(55);
  
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  
  const countryDetectedRef = useRef(false);
  const validateReferralCode = useValidateReferralCode();

  // Timer pour renvoyer le code
  useEffect(() => {
    if (step === "pin" && resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer(prev => prev > 0 ? prev - 1 : 0);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, resendTimer]);

  // Détection automatique du pays
  useEffect(() => {
    if (countryDetectedRef.current) {
      setCountryDetecting(false);
      return;
    }
    
    const detectCountry = async () => {
      countryDetectedRef.current = true;
      
      try {
        const response = await fetch("https://ipapi.co/json/", { 
          signal: AbortSignal.timeout(5000) 
        });
        
        if (response.ok) {
          const data = await response.json();
          const detectedCode = data.country_code;
          const matchingCountry = COUNTRIES.find(c => c.code === detectedCode);
          
          if (matchingCountry) {
            const { data: countryData } = await supabase
              .from("countries")
              .select("is_active")
              .eq("code", detectedCode)
              .single();
            
            if (countryData?.is_active) {
              setSelectedCountry(matchingCountry);
            }
          }
        }
      } catch (error) {
        console.log("Détection du pays échouée, utilisation du pays par défaut");
      } finally {
        setCountryDetecting(false);
      }
    };

    detectCountry();
  }, []);

  // Validate referral code
  useEffect(() => {
    const codeToValidate = refCode || localStorage.getItem("pendingReferralCode");
    
    if (codeToValidate) {
      localStorage.setItem("pendingReferralCode", codeToValidate);
      
      validateReferralCode.mutate(codeToValidate, {
        onSuccess: (data) => {
          setReferrerName(data.referrerName);
          toast.success(`🎁 Parrainage de ${data.referrerName || 'un utilisateur'} détecté ! -10% sur votre abonnement`);
        },
        onError: () => {
          localStorage.removeItem("pendingReferralCode");
        },
      });
    }
  }, [refCode]);

  // Redirect authenticated users
  useEffect(() => {
    if (loading || subLoading || roleLoading || !roleStable) return;
    if (!isAuthenticated) return;

    if (inviteCode) {
      navigate(`/invite?code=${inviteCode}`, { replace: true });
      return;
    }

    const checkProfileAndRedirect = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("shop_name, owner_name")
          .eq("user_id", user.id)
          .maybeSingle();

        const isProfileComplete = Boolean(
          profile?.shop_name &&
          profile.shop_name !== "Ma Boutique" &&
          profile?.owner_name
        );

        if (!isProfileComplete) {
          navigate("/profile-setup", { replace: true });
        } else if (!subscription) {
          navigate("/subscriptions", { replace: true });
        } else if (role === "admin") {
          navigate("/admin", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("Error checking profile:", error);
        navigate("/profile-setup", { replace: true });
      }
    };

    checkProfileAndRedirect();
  }, [isAuthenticated, loading, subLoading, roleLoading, roleStable, role, subscription, navigate, inviteCode]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  };

  const handlePhoneChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 9) {
      setPhone(digits);
    }
  };

  const handlePhoneSubmit = () => {
    if (phone.length >= 8) {
      setStep("pin");
      setResendTimer(55);
    } else {
      toast.error("Entrez un numéro valide");
    }
  };

  const handlePinChange = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= PIN_LENGTH) {
      if (isNewUser && step === "pin" && pin.length === PIN_LENGTH) {
        setConfirmPin(digits);
      } else {
        setPin(digits);
      }
    }
  };
  
  const getRemainingLockoutTime = (): number => {
    if (!lockoutUntil) return 0;
    return Math.max(0, lockoutUntil - Date.now());
  };
  
  const isLockedOut = (): boolean => {
    return getRemainingLockoutTime() > 0;
  };

  const handlePinSubmit = async () => {
    if (!configured) {
      toast.error("Le service n'est pas encore prêt. Veuillez rafraîchir la page.");
      return;
    }

    if (isLockedOut()) {
      const remainingSeconds = Math.ceil(getRemainingLockoutTime() / 1000);
      toast.error(`Trop de tentatives. Réessayez dans ${remainingSeconds} secondes.`);
      return;
    }

    if (pin.length !== PIN_LENGTH) {
      toast.error(`Le PIN doit contenir ${PIN_LENGTH} chiffres`);
      return;
    }

    if (isNewUser && confirmPin !== pin) {
      toast.error("Les codes PIN ne correspondent pas");
      setConfirmPin("");
      return;
    }

    setIsLoading(true);

    const fakeEmail = `${selectedCountry.prefix.replace("+", "")}${phone}@kor.local`;
    const password = generateSecurePassword(pin, phone, selectedCountry.prefix);

    try {
      if (isNewUser) {
        const { error, data } = await signUp(fakeEmail, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Ce numéro est déjà utilisé");
          } else {
            toast.error("Erreur lors de la création du compte");
          }
        } else {
          setFailedAttempts(0);
          setLockoutUntil(null);
          
          if (refCode && data?.user?.id) {
            const recorded = await recordReferral(data.user.id, refCode);
            if (recorded) {
              toast.success("Compte créé ! Votre parrainage a été enregistré 🎉");
            } else {
              toast.success("Compte créé avec succès !");
            }
          } else {
            toast.success("Compte créé avec succès !");
          }
        }
      } else {
        // Try login with new domain first (@kor.local), then fallback to old domain (@dekon.local)
        let loginResult = await signIn(fakeEmail, password);
        
        // If login fails with new domain, try old domain for backward compatibility
        if (loginResult.error && loginResult.error.message.includes("Invalid login")) {
          const oldEmail = `${selectedCountry.prefix.replace("+", "")}${phone}@dekon.local`;
          const oldResult = await signIn(oldEmail, password);
          if (!oldResult.error) {
            loginResult = oldResult; // Old domain worked
          }
        }
        
        if (loginResult.error) {
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);
          
          const lockoutDuration = Math.min(Math.pow(2, newFailedAttempts) * 1000, 30000);
          setLockoutUntil(Date.now() + lockoutDuration);
          
          if (loginResult.error.message.includes("Invalid login")) {
            if (newFailedAttempts >= 3) {
              toast.error(`Numéro ou code PIN incorrect. Veuillez attendre ${Math.ceil(lockoutDuration / 1000)}s.`);
            } else {
              toast.error("Numéro ou code PIN incorrect");
            }
          } else {
            toast.error("Erreur de connexion");
          }
        } else {
          setFailedAttempts(0);
          setLockoutUntil(null);
        }
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setStep("phone");
    setPin("");
    setConfirmPin("");
  };

  const handleNumberClick = (num: string) => {
    if (step === "phone") {
      handlePhoneChange(phone + num);
    } else {
      handlePinChange((isNewUser && pin.length === PIN_LENGTH ? confirmPin : pin) + num);
    }
  };

  const handleDelete = () => {
    if (step === "phone") {
      setPhone(phone.slice(0, -1));
    } else {
      if (isNewUser && pin.length === PIN_LENGTH && confirmPin.length > 0) {
        setConfirmPin(confirmPin.slice(0, -1));
      } else {
        setPin(pin.slice(0, -1));
      }
    }
  };

  const handleClear = () => {
    if (step === "phone") {
      setPhone("");
    } else {
      setPin("");
      setConfirmPin("");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#4f7df3] border-t-transparent rounded-full" />
      </div>
    );
  }

  const showConfirmPin = isNewUser && step === "pin" && pin.length === PIN_LENGTH;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] via-white to-[#f8f9ff] flex flex-col font-poppins relative overflow-hidden">
      {/* Éléments décoratifs */}
      <DecoElements />
      
      {/* Contenu principal - Sans scroll */}
      <div className="flex-1 flex flex-col justify-between py-8 px-6 max-h-screen relative z-10">
        
        {/* Header titre */}
        <div className="text-left pt-8 mb-6">
          <h1 className="text-3xl font-extrabold text-[#2d3748] mb-2">
            {step === "phone" 
              ? (isNewUser ? "Bienvenue" : "Bon Retour")
              : showConfirmPin 
                ? "Confirmez le PIN"
                : isNewUser 
                  ? "Créez votre PIN" 
                  : "Votre code PIN"
            }
          </h1>
          <p className="text-[#718096] font-light text-sm leading-relaxed whitespace-pre-line">
            {step === "phone"
              ? (isNewUser 
                  ? "Créez votre compte pour commencer." 
                  : "Heureux de vous revoir.\nPour utiliser l'app, connectez-vous.")
              : showConfirmPin
                ? "Entrez à nouveau votre code PIN"
                : isNewUser
                  ? `Choisissez un code PIN à ${PIN_LENGTH} chiffres`
                  : "Entrez votre code PIN"
            }
          </p>
          
          {/* Referral Badge */}
          {referrerName && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-600 rounded-full text-sm font-medium">
              <Gift className="w-4 h-4" />
              Parrainage de {referrerName} • -10%
            </div>
          )}
        </div>

        {/* Input Zone */}
        <div className="flex-1 flex flex-col justify-center">
          {step === "phone" ? (
            <div className="space-y-4">
              {/* Champ unifié : Drapeau + Code + Numéro */}
              <div className="bg-[#f5f7fa] rounded-2xl px-4 py-4">
                <div className="w-full flex items-center">
                  {/* Sélecteur pays (compact) */}
                  <button 
                    onClick={() => setShowCountryPicker(!showCountryPicker)}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <span className="text-2xl">{selectedCountry.flag}</span>
                    <span className="text-[#718096] text-sm">{selectedCountry.prefix}</span>
                    <ChevronDown className={`w-4 h-4 text-[#718096] transition-transform ${showCountryPicker ? "rotate-180" : ""}`} />
                  </button>
                  
                  {/* Séparateur */}
                  <div className="h-6 w-px bg-[#e2e8f0] mx-4" />
                  
                  {/* Numéro (plus large) */}
                  <div className="flex-1 text-[#2d3748] text-xl font-semibold tracking-wider">
                    {phone ? formatPhone(phone) : <span className="text-[#a0aec0]">XX XX XX XX</span>}
                  </div>
                </div>
              </div>

              {/* Country Picker Dropdown */}
              {showCountryPicker && (
                <div className="bg-white border border-[#e2e8f0] rounded-2xl overflow-hidden shadow-lg animate-fade-in max-h-64 overflow-y-auto">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => {
                        setSelectedCountry(country);
                        setShowCountryPicker(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#f5f7fa] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{country.flag}</span>
                        <span className="font-semibold text-[#2d3748]">{country.name}</span>
                        <span className="text-[#718096]">{country.prefix}</span>
                      </div>
                      {selectedCountry.code === country.code && (
                        <Check className="w-5 h-5 text-[#4f7df3]" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Toggle new/existing user */}
              <button
                className="text-sm text-[#4f7df3] font-semibold underline underline-offset-4 text-center w-full"
                onClick={() => setIsNewUser(!isNewUser)}
              >
                {isNewUser ? "J'ai déjà un compte" : "Créer un nouveau compte"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* PIN Display - 6 cases */}
              <div className="flex justify-center gap-2">
                {Array.from({ length: PIN_LENGTH }, (_, i) => {
                  const currentPin = showConfirmPin ? confirmPin : pin;
                  const isFilled = currentPin.length > i;
                  const isActive = currentPin.length === i;
                  
                  return (
                    <div
                      key={i}
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold
                        transition-all duration-300
                        ${isFilled 
                          ? "bg-[#e8ecf4] text-[#2d3748]" 
                          : isActive 
                            ? "bg-[#f0f4ff] border-2 border-[#4f7df3] animate-pulse-border"
                            : "bg-[#f5f7fa] text-[#cbd5e0]"
                        }
                      `}
                    >
                      ●
                    </div>
                  );
                })}
              </div>

              {/* Phone number reminder */}
              <p className="text-center text-sm text-[#718096]">
                {selectedCountry.prefix} {formatPhone(phone)}
              </p>
            </div>
          )}
        </div>

        {/* Clavier numérique compact + Bouton */}
        <div className="space-y-4">
          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "←"].map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (key === "C") handleClear();
                  else if (key === "←") handleDelete();
                  else handleNumberClick(key);
                }}
                className="h-14 rounded-2xl text-xl font-semibold text-[#2d3748] active:scale-95 active:bg-[#f5f7fa] transition-all"
              >
                {key}
              </button>
            ))}
          </div>

          {/* Bouton principal dégradé */}
          <button
            onClick={step === "phone" ? handlePhoneSubmit : handlePinSubmit}
            disabled={
              isLoading || 
              isLockedOut() ||
              (step === "phone" ? phone.length < 8 : (isNewUser ? (showConfirmPin ? confirmPin.length < PIN_LENGTH : pin.length < PIN_LENGTH) : pin.length < PIN_LENGTH))
            }
            className="
              relative w-full max-w-[280px] mx-auto h-14 rounded-full flex items-center justify-center
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
            ) : step === "phone" ? (
              "CONTINUER"
            ) : showConfirmPin ? (
              "CRÉER LE COMPTE"
            ) : isNewUser ? (
              "SUIVANT"
            ) : (
              "SE CONNECTER"
            )}
          </button>

          {/* Bouton retour circulaire (écran PIN) */}
          {step === "pin" && (
            <button
              onClick={handleBack}
              className="mx-auto flex flex-col items-center gap-1"
            >
              <div className="w-12 h-12 rounded-full border-2 border-[#e2e8f0] flex items-center justify-center hover:bg-[#f5f7fa] transition-colors">
                <ArrowLeft className="w-5 h-5 text-[#718096]" />
              </div>
              <span className="text-xs text-[#718096]">Retour</span>
            </button>
          )}

          {/* Conditions d'utilisation */}
          <p className="text-center text-xs text-[#a0aec0] px-4">
            En vous connectant, vous acceptez nos{" "}
            <span className="text-[#4f7df3]">Conditions d'utilisation</span> et{" "}
            <span className="text-[#4f7df3]">Politique de confidentialité</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
