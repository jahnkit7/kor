import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Store, User, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseClient } from "@/lib/supabase";
import { toast } from "sonner";

const ProfileSetup = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!shopName.trim() || !ownerName.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (!user) {
      toast.error("Utilisateur non connecté");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = await getSupabaseClient();
      
      const { error } = await supabase
        .from("profiles")
        .update({
          shop_name: shopName.trim(),
          owner_name: ownerName.trim(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Erreur lors de la sauvegarde");
        return;
      }

      toast.success("Profil configuré !");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-hero px-6 pt-12 pb-16 text-primary-foreground text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent shadow-glow mb-4">
          <Store className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Configurez votre boutique</h1>
        <p className="text-sm opacity-80">
          Ces informations apparaîtront dans vos rapports
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 px-6 -mt-8">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Owner Name */}
              <div className="space-y-2">
                <Label htmlFor="ownerName" className="text-base font-semibold">
                  Votre nom
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="ownerName"
                    type="text"
                    placeholder="Ex: Mamadou Diop"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="pl-12 h-14 text-base"
                    autoComplete="name"
                  />
                </div>
              </div>

              {/* Shop Name */}
              <div className="space-y-2">
                <Label htmlFor="shopName" className="text-base font-semibold">
                  Nom de la boutique
                </Label>
                <div className="relative">
                  <Store className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="shopName"
                    type="text"
                    placeholder="Ex: Boutique Mamadou"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    className="pl-12 h-14 text-base"
                  />
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="action"
                size="xl"
                className="w-full"
                disabled={isLoading || !shopName.trim() || !ownerName.trim()}
              >
                {isLoading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <>
                    Continuer
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Vous pourrez modifier ces informations plus tard dans les réglages
        </p>
      </div>
    </div>
  );
};

export default ProfileSetup;