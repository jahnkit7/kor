import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Lock } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "pin">("phone");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);

  const handlePhoneSubmit = () => {
    if (phone.length >= 8) {
      setStep("pin");
    }
  };

  const handlePinSubmit = () => {
    if (pin.length === 4) {
      navigate("/dashboard");
    }
  };

  const handleNumberClick = (num: string) => {
    if (step === "phone" && phone.length < 10) {
      setPhone((prev) => prev + num);
    } else if (step === "pin" && pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (step === "phone") {
      setPhone((prev) => prev.slice(0, -1));
    } else {
      setPin((prev) => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    if (step === "phone") {
      setPhone("");
    } else {
      setPin("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => (step === "pin" ? setStep("phone") : navigate("/"))}
        >
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
            {step === "phone" ? "Votre numéro" : "Code PIN"}
          </h1>
          <p className="text-muted-foreground">
            {step === "phone"
              ? "Entrez votre numéro de téléphone"
              : isNewUser
              ? "Créez votre code PIN (4 chiffres)"
              : "Entrez votre code PIN"}
          </p>
        </div>

        {/* Display */}
        <div className="mb-8">
          {step === "phone" ? (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-6 py-4 bg-secondary rounded-xl">
                <span className="text-muted-foreground font-semibold">+221</span>
                <span className="text-money-md text-foreground min-w-[180px]">
                  {phone || <span className="text-muted-foreground/50">__ __ __ __</span>}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-200 ${
                    pin.length > i
                      ? "bg-primary border-primary"
                      : "border-border bg-secondary"
                  }`}
                >
                  {pin.length > i && (
                    <div className="w-3 h-3 rounded-full bg-primary-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Toggle new/existing user */}
        {step === "phone" && (
          <button
            className="text-sm text-primary font-semibold mb-6 underline underline-offset-4"
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
          disabled={step === "phone" ? phone.length < 8 : pin.length < 4}
        >
          {step === "phone" ? "Continuer" : isNewUser ? "Créer le compte" : "Se connecter"}
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
