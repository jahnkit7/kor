import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Loader2, Check, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface ActivateCodeDialogProps {
  onSuccess?: () => void;
}

export function ActivateCodeDialog({ onSuccess }: ActivateCodeDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [planName, setPlanName] = useState("");

  const handleActivate = async () => {
    if (!code.trim()) {
      toast.error("Veuillez entrer un code");
      return;
    }

    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setLoading(true);
    try {
      // 1. Find the code
      const { data: codeData, error: codeError } = await supabase
        .from("recharge_codes")
        .select("*, subscription_plans:plan_id(*)")
        .eq("code", code.trim().toUpperCase())
        .maybeSingle();

      if (codeError) throw codeError;

      if (!codeData) {
        toast.error("Code invalide");
        setLoading(false);
        return;
      }

      if (codeData.is_used) {
        toast.error("Ce code a déjà été utilisé");
        setLoading(false);
        return;
      }

      if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
        toast.error("Ce code a expiré");
        setLoading(false);
        return;
      }

      const plan = codeData.subscription_plans as any;
      const durationDays = plan?.duration_days || 30;

      // 2. Mark code as used
      const { error: updateCodeError } = await supabase
        .from("recharge_codes")
        .update({
          is_used: true,
          used_by: user.id,
          used_at: new Date().toISOString(),
        })
        .eq("id", codeData.id);

      if (updateCodeError) throw updateCodeError;

      // 3. Update or create subscription
      const newEndDate = new Date();
      newEndDate.setDate(newEndDate.getDate() + durationDays);

      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingSub) {
        // Extend existing subscription
        const currentEnd = new Date(existingSub.trial_ends_at);
        const extendedEnd = currentEnd > new Date() 
          ? new Date(currentEnd.getTime() + durationDays * 24 * 60 * 60 * 1000)
          : newEndDate;

        await supabase
          .from("subscriptions")
          .update({
            plan: plan?.name || "premium",
            trial_ends_at: extendedEnd.toISOString(),
            is_active: true,
            max_clients: plan?.max_clients || null,
          })
          .eq("id", existingSub.id);
      } else {
        // Create new subscription
        await supabase.from("subscriptions").insert({
          user_id: user.id,
          plan: plan?.name || "premium",
          trial_ends_at: newEndDate.toISOString(),
          is_active: true,
          max_clients: plan?.max_clients || null,
        });
      }

      setPlanName(plan?.name || "Premium");
      setSuccess(true);
      toast.success(`Plan ${plan?.name || "Premium"} activé pour ${durationDays} jours !`);
      onSuccess?.();

      // Reset after 2 seconds
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setCode("");
      }, 2000);

    } catch (error) {
      console.error("Error activating code:", error);
      toast.error("Erreur lors de l'activation du code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">Activer un code prépayé</p>
            <p className="text-sm text-muted-foreground">Recharger votre abonnement</p>
          </div>
          <CreditCard className="w-5 h-5 text-muted-foreground" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Activer un code prépayé
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Code activé !</h3>
              <p className="text-muted-foreground">
                Plan {planName} activé avec succès
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code de recharge</Label>
              <Input
                id="code"
                placeholder="Ex: ABCD1234EFGH"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest font-mono"
                maxLength={16}
              />
              <p className="text-xs text-muted-foreground">
                Entrez le code à 12 caractères figurant sur votre carte prépayée
              </p>
            </div>

            <Button
              onClick={handleActivate}
              disabled={loading || !code.trim()}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Activer le code
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
