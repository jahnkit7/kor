import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useReferralCode, useReferralStats, useReferrals } from "@/hooks/use-referrals";
import { Copy, Gift, Users, CheckCircle2, Clock, Share2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function ReferralSection() {
  const { data: referralCode, isLoading: codeLoading } = useReferralCode();
  const { data: stats, isLoading: statsLoading } = useReferralStats();
  const { data: referrals, isLoading: referralsLoading } = useReferrals();
  const [copied, setCopied] = useState(false);

  const referralLink = referralCode 
    ? `${window.location.origin}/auth?ref=${referralCode}`
    : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Lien copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Rejoins DÉKON !",
          text: `Utilise mon code ${referralCode} pour t'inscrire et bénéficier de -10% sur ton premier abonnement !`,
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  const isLoading = codeLoading || statsLoading || referralsLoading;

  return (
    <div className="space-y-6">
      {/* Referral Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Parrainage
          </CardTitle>
          <CardDescription>
            Invitez vos amis et gagnez 10% de réduction sur votre prochain abonnement pour chaque parrainage converti.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Votre code de parrainage</label>
            <div className="flex gap-2">
              <Input 
                value={referralCode || "Chargement..."} 
                readOnly 
                className="font-mono text-lg font-bold text-center"
              />
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Lien de parrainage</label>
            <div className="flex gap-2">
              <Input value={referralLink} readOnly className="text-sm" />
              <Button onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
            <p className="text-xs text-muted-foreground">Invitations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{stats?.pending || 0}</p>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{stats?.converted || 0}</p>
            <p className="text-xs text-muted-foreground">Convertis</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Gift className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats?.totalRewards || 0}%</p>
            <p className="text-xs text-muted-foreground">Réductions gagnées</p>
          </CardContent>
        </Card>
      </div>

      {/* Referrals History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des parrainages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Chargement...</p>
          ) : referrals && referrals.length > 0 ? (
            <div className="space-y-3">
              {referrals.map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Invitation #{ref.referral_code.slice(-4)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(ref.created_at), "dd MMM yyyy", { locale: fr })}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      ref.status === "converted" || ref.status === "rewarded" 
                        ? "default" 
                        : ref.status === "pending" 
                          ? "secondary" 
                          : "outline"
                    }
                  >
                    {ref.status === "pending" && "En attente"}
                    {ref.status === "converted" && "Converti"}
                    {ref.status === "rewarded" && "Récompensé"}
                    {ref.status === "expired" && "Expiré"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Aucun parrainage pour le moment</p>
              <p className="text-sm">Partagez votre code pour commencer !</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
