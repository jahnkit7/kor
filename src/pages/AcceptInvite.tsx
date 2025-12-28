import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Store, 
  UserPlus,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

interface InviteDetails {
  id: string;
  owner_user_id: string;
  employee_phone: string;
  status: string;
  expires_at: string;
  invite_code: string;
  owner_shop_name?: string;
  owner_name?: string;
}

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const inviteCode = searchParams.get("code");
  
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!inviteCode) {
        setError("Code d'invitation manquant");
        setLoading(false);
        return;
      }

      try {
        // Chercher l'invitation par code
        const { data: inviteData, error: inviteError } = await supabase
          .from("employee_invites")
          .select("*")
          .eq("invite_code", inviteCode)
          .maybeSingle();

        if (inviteError) {
          console.error("Error fetching invite:", inviteError);
          setError("Erreur lors de la récupération de l'invitation");
          setLoading(false);
          return;
        }

        if (!inviteData) {
          setError("Invitation non trouvée ou expirée");
          setLoading(false);
          return;
        }

        // Vérifier si l'invitation est expirée
        if (new Date(inviteData.expires_at) < new Date()) {
          setError("Cette invitation a expiré");
          setLoading(false);
          return;
        }

        // Vérifier si l'invitation est déjà acceptée
        if (inviteData.status === "accepted") {
          setError("Cette invitation a déjà été acceptée");
          setLoading(false);
          return;
        }

        // Récupérer les infos du propriétaire
        const { data: ownerProfile } = await supabase
          .from("profiles")
          .select("shop_name, owner_name")
          .eq("user_id", inviteData.owner_user_id)
          .maybeSingle();

        setInvite({
          ...inviteData,
          owner_shop_name: ownerProfile?.shop_name || "Boutique",
          owner_name: ownerProfile?.owner_name || "Le propriétaire",
        });
      } catch (err) {
        console.error("Error:", err);
        setError("Une erreur est survenue");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [inviteCode]);

  const handleAcceptInvite = async () => {
    if (!invite || !user) return;

    setAccepting(true);

    try {
      // Mettre à jour le profil de l'employé avec le linked_owner_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ linked_owner_id: invite.owner_user_id })
        .eq("user_id", user.id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        toast.error("Erreur lors de l'acceptation");
        setAccepting(false);
        return;
      }

      // Mettre à jour le statut de l'invitation
      const { error: inviteError } = await supabase
        .from("employee_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);

      if (inviteError) {
        console.error("Error updating invite:", inviteError);
        toast.error("Erreur lors de la mise à jour de l'invitation");
        setAccepting(false);
        return;
      }

      // Ajouter le rôle employé
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({ 
          user_id: user.id, 
          role: "employee" as const
        }, { 
          onConflict: "user_id,role" 
        });

      if (roleError) {
        console.error("Error setting role:", roleError);
      }

      toast.success("Invitation acceptée ! Bienvenue dans l'équipe 🎉");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error:", err);
      toast.error("Une erreur est survenue");
    } finally {
      setAccepting(false);
    }
  };

  const handleGoToAuth = () => {
    // Rediriger vers la page d'authentification avec le code d'invitation
    navigate(`/auth?invite=${inviteCode}`);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement de l'invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold mb-2">Invitation invalide</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Retour à l'accueil
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invite) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Store className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Vous êtes invité(e) !</h1>
            <p className="text-muted-foreground">
              <span className="font-semibold text-foreground">{invite.owner_name}</span> vous invite à rejoindre
            </p>
          </div>

          {/* Shop Info */}
          <div className="bg-secondary rounded-2xl p-6 mb-6 text-center">
            <p className="text-2xl font-bold text-foreground mb-1">
              {invite.owner_shop_name}
            </p>
            <p className="text-sm text-muted-foreground">
              En tant qu'employé(e)
            </p>
          </div>

          {/* Permissions */}
          <div className="bg-primary/5 rounded-xl p-4 mb-8">
            <p className="text-sm font-semibold text-foreground mb-2">
              Vous pourrez :
            </p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Voir le tableau de bord</li>
              <li>• Enregistrer des ventes</li>
              <li>• Consulter les clients et dettes</li>
            </ul>
          </div>

          {/* Actions */}
          {isAuthenticated ? (
            <Button
              variant="action"
              size="lg"
              className="w-full"
              onClick={handleAcceptInvite}
              disabled={accepting}
            >
              {accepting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Accepter l'invitation
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                variant="action"
                size="lg"
                className="w-full"
                onClick={handleGoToAuth}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Créer mon compte
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Vous avez déjà un compte ?{" "}
                <button 
                  onClick={handleGoToAuth}
                  className="text-primary font-semibold"
                >
                  Connectez-vous
                </button>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AcceptInvite;
