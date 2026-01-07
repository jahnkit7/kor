import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Lock, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const COUNTRIES = [
  { code: "SN", name: "Sénégal", prefix: "+221", flag: "🇸🇳" },
  { code: "BJ", name: "Bénin", prefix: "+229", flag: "🇧🇯" },
  { code: "TG", name: "Togo", prefix: "+228", flag: "🇹🇬" },
  { code: "CI", name: "Côte d'Ivoire", prefix: "+225", flag: "🇨🇮" },
  { code: "GN", name: "Guinée", prefix: "+224", flag: "🇬🇳" },
];

// Minimum PIN length for security (6 digits instead of 4)
const PIN_LENGTH = 6;

// Generate a more secure password by combining PIN with phone as salt
const generateSecurePassword = (pin: string, phone: string, countryPrefix: string): string => {
  // Create a deterministic but more complex password
  // Format: reversed_pin + phone_hash_chars + pin + country_code
  const fullPhone = countryPrefix.replace("+", "") + phone;
  const reversedPin = pin.split("").reverse().join("");
  const phoneHash = fullPhone.split("").reduce((acc, char, idx) => {
    return acc + String.fromCharCode(((char.charCodeAt(0) + idx) % 26) + 97);
  }, "");
  return `${reversedPin}${phoneHash.slice(0, 8)}${pin}${fullPhone.slice(-4)}`;
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, isAuthenticated, loading, configured } = useAuth();
  
  // Récupérer le code d'invitation s'il existe
  const inviteCode = searchParams.get("invite");
  
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [isNewUser, setIsNewUser] = useState(!!inviteCode); // Par défaut nouveau si invitation
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Si l'utilisateur vient d'une invitation, rediriger vers la page d'acceptation
      if (inviteCode) {
        navigate(`/invite?code=${inviteCode}`);
      } else {
        navigate("/dashboard");
      }
    }
  }, [isAuthenticated, loading, navigate, inviteCode]);

  const formatPhone = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, "");
    // Format with spaces every 2-3 digits for readability
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
  
  // Calculate lockout delay based on failed attempts (exponential backoff)
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

    // Check rate limiting lockout
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

    // Use phone as fake email for Supabase auth
    const fakeEmail = `${selectedCountry.prefix.replace("+", "")}${phone}@dekon.local`;
    // Generate more secure password using PIN + phone as salt
    const password = generateSecurePassword(pin, phone, selectedCountry.prefix);

    try {
      if (isNewUser) {
        const { error } = await signUp(fakeEmail, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Ce numéro est déjà utilisé");
          } else {
            toast.error("Erreur lors de la création du compte");
            if (import.meta.env.DEV) console.error(error);
          }
        } else {
          // Reset rate limiting on successful signup
          setFailedAttempts(0);
          setLockoutUntil(null);
          toast.success("Compte créé avec succès !");
        }
      } else {
        const { error } = await signIn(fakeEmail, password);
        if (error) {
          // Increment failed attempts and apply exponential backoff
          const newFailedAttempts = failedAttempts + 1;
          setFailedAttempts(newFailedAttempts);
          
          // Exponential backoff: 2^attempts seconds, max 30 seconds
          const lockoutDuration = Math.min(Math.pow(2, newFailedAttempts) * 1000, 30000);
          setLockoutUntil(Date.now() + lockoutDuration);
          
          if (error.message.includes("Invalid login")) {
            if (newFailedAttempts >= 3) {
              toast.error(`Numéro ou code PIN incorrect. Veuillez attendre ${Math.ceil(lockoutDuration / 1000)}s.`);
            } else {
              toast.error("Numéro ou code PIN incorrect");
            }
          } else {
            toast.error("Erreur de connexion");
            if (import.meta.env.DEV) console.error(error);
          }
        } else {
          // Reset rate limiting on successful login
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
    if (step === "pin") {
      setStep("phone");
      setPin("");
      setConfirmPin("");
    } else {
      navigate("/");
    }
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const showConfirmPin = isNewUser && step === "pin" && pin.length === PIN_LENGTH;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            {step === "phone" ? (
              <Phone className="w-8 h-8 text-primary" />
            ) : (
              <Lock className="w-8 h-8 text-primary" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {step === "phone" 
              ? "Votre numéro" 
              : showConfirmPin 
                ? "Confirmez le PIN"
                : isNewUser 
                  ? "Créez votre PIN" 
                  : "Votre code PIN"
            }
          </h1>
          <p className="text-muted-foreground">
            {step === "phone"
              ? "Entrez votre numéro de téléphone"
              : showConfirmPin
                ? "Entrez à nouveau votre code PIN"
                : isNewUser
                  ? `Choisissez un code PIN à ${PIN_LENGTH} chiffres`
                  : "Entrez votre code PIN"
            }
          </p>
        </div>

        {/* Display */}
        <div className="mb-8">
          {step === "phone" ? (
            <div className="space-y-4">
              {/* Country Picker */}
              <button
                onClick={() => setShowCountryPicker(!showCountryPicker)}
                className="w-full flex items-center justify-between px-4 py-3 bg-secondary rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{selectedCountry.flag}</span>
                  <span className="font-semibold">{selectedCountry.name}</span>
                  <span className="text-muted-foreground">{selectedCountry.prefix}</span>
                </div>
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showCountryPicker ? "rotate-180" : ""}`} />
              </button>

              {showCountryPicker && (
                <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
                  {COUNTRIES.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => {
                        setSelectedCountry(country);
                        setShowCountryPicker(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{country.flag}</span>
                        <span className="font-semibold">{country.name}</span>
                        <span className="text-muted-foreground">{country.prefix}</span>
                      </div>
                      {selectedCountry.code === country.code && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Phone Input Display */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-6 py-4 bg-secondary rounded-xl">
                  <span className="text-muted-foreground font-semibold">{selectedCountry.prefix}</span>
                  <span className="text-money-md text-foreground min-w-[160px] text-left">
                    {phone ? formatPhone(phone) : <span className="text-muted-foreground/50">__ ___ __ __</span>}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* PIN Display */}
              <div className="flex justify-center gap-3">
                {Array.from({ length: PIN_LENGTH }, (_, i) => {
                  const currentPin = showConfirmPin ? confirmPin : pin;
                  return (
                    <div
                      key={i}
                      className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
                        currentPin.length > i
                          ? "bg-primary border-primary"
                          : currentPin.length === i
                            ? "border-primary bg-secondary"
                            : "border-border bg-secondary"
                      }`}
                    >
                      {currentPin.length > i && (
                        <div className="w-2.5 h-2.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Phone number reminder */}
              <p className="text-center text-sm text-muted-foreground">
                {selectedCountry.prefix} {formatPhone(phone)}
              </p>
            </div>
          )}
        </div>

        {/* Toggle new/existing user (only on phone step) */}
        {step === "phone" && (
          <button
            className="text-sm text-primary font-semibold mb-6 underline underline-offset-4 text-center"
            onClick={() => setIsNewUser(!isNewUser)}
          >
            {isNewUser ? "J'ai déjà un compte" : "Créer un nouveau compte"}
          </button>
        )}
      </div>

      {/* Numpad */}
      <div className="px-6 pb-6 safe-bottom">
        <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-4">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
            <NumpadButton key={num} onClick={() => handleNumberClick(num)}>
              {num}
            </NumpadButton>
          ))}
          <NumpadButton onClick={handleClear} variant="secondary">
            C
          </NumpadButton>
          <NumpadButton onClick={() => handleNumberClick("0")}>0</NumpadButton>
          <NumpadButton onClick={handleDelete} variant="secondary">
            ←
          </NumpadButton>
        </div>

        <Button
          variant="action"
          size="lg"
          className="w-full max-w-xs mx-auto block"
          onClick={step === "phone" ? handlePhoneSubmit : handlePinSubmit}
          disabled={
            isLoading || 
            isLockedOut() ||
            (step === "phone" ? phone.length < 8 : (isNewUser ? (showConfirmPin ? confirmPin.length < PIN_LENGTH : pin.length < PIN_LENGTH) : pin.length < PIN_LENGTH))
          }
        >
          {isLoading ? (
            <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : step === "phone" ? (
            "Continuer"
          ) : showConfirmPin ? (
            "Créer le compte"
          ) : isNewUser ? (
            "Suivant"
          ) : (
            "Se connecter"
          )}
        </Button>
      </div>
    </div>
  );
};

const NumpadButton = ({
  children,
  onClick,
  variant = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "secondary";
}) => (
  <button
    onClick={onClick}
    className={`h-16 rounded-xl text-2xl font-bold transition-all duration-150 active:scale-95 ${
      variant === "secondary"
        ? "bg-secondary text-secondary-foreground"
        : "bg-card text-foreground border border-border hover:bg-secondary"
    }`}
  >
    {children}
  </button>
);

export default Auth;
