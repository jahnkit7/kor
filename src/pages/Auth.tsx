import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

const Auth = () => {
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, loading, configured } = useAuth();
  
  const [isNewUser, setIsNewUser] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!configured) {
      toast.error("Le service n'est pas encore prêt. Veuillez rafraîchir la page.");
      return;
    }

    if (!email || !password) {
      toast.error("Remplissez tous les champs");
      return;
    }

    if (isNewUser && password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }

    setIsLoading(true);

    try {
      if (isNewUser) {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast.error("Cet email est déjà utilisé");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Compte créé avec succès !");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            toast.error("Email ou mot de passe incorrect");
          } else {
            toast.error(error.message);
          }
        }
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isNewUser ? "Créer un compte" : "Se connecter"}
          </h1>
          <p className="text-muted-foreground">
            {isNewUser
              ? "Créez votre compte CAISSE+ pour commencer"
              : "Connectez-vous à votre compte"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full">
          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Email</label>
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-xl">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/50"
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-muted-foreground">Mot de passe</label>
            <div className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-xl">
              <Lock className="w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/50"
                autoComplete={isNewUser ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password (for signup) */}
          {isNewUser && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-muted-foreground">Confirmer le mot de passe</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-xl">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/50"
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="action"
            size="lg"
            className="w-full"
            disabled={isLoading || !configured}
          >
            {isLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : isNewUser ? (
              "Créer le compte"
            ) : (
              "Se connecter"
            )}
          </Button>
        </form>

        {/* Toggle new/existing user */}
        <button
          type="button"
          className="text-sm text-primary font-semibold mt-6 underline underline-offset-4 text-center"
          onClick={() => setIsNewUser(!isNewUser)}
        >
          {isNewUser ? "J'ai déjà un compte" : "Créer un nouveau compte"}
        </button>
      </div>

      <div className="p-6 safe-bottom" />
    </div>
  );
};

export default Auth;
