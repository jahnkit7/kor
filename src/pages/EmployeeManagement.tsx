import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { AnimatedCard } from "@/components/ui/animated-card";
import { 
  ArrowLeft, 
  UserPlus,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Users,
  MessageCircle,
  ExternalLink
} from "lucide-react";
import { useEmployees, type EmployeeInvite } from "@/hooks/use-employees";
import { useProfile } from "@/hooks/use-profile";
import { FeatureGate } from "@/components/FeatureGate";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import CountryCodeSelect, { countries, type Country } from "@/components/CountryCodeSelect";

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const { invites, loading, sendInvite, cancelInvite } = useEmployees();
  const { profile } = useProfile();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]); // Sénégal par défaut
  const [sending, setSending] = useState(false);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d MMM yyyy", { locale: fr });
  };

  const formatPhone = (phone: string) => {
    if (phone.length <= 2) return phone;
    if (phone.length <= 5) return `${phone.slice(0, 2)} ${phone.slice(2)}`;
    if (phone.length <= 7) return `${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5)}`;
    return `${phone.slice(0, 2)} ${phone.slice(2, 5)} ${phone.slice(5, 7)} ${phone.slice(7, 9)}`;
  };

  const generateInviteLink = (inviteCode: string) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/invite?code=${inviteCode}`;
  };

  const generateWhatsAppMessage = (inviteCode: string) => {
    const shopName = profile?.shop_name || "Ma Boutique";
    const ownerName = profile?.owner_name || "Le propriétaire";
    const inviteLink = generateInviteLink(inviteCode);
    
    return `👋 Bonjour !

${ownerName} vous invite à rejoindre l'équipe de *${shopName}* sur Kasy.

🔗 Cliquez sur ce lien pour vous connecter :
${inviteLink}

📱 Vous pourrez ensuite accéder au tableau de bord et aider à gérer la boutique.

À bientôt ! 🎉`;
  };

  const openWhatsApp = (phoneNumber: string, inviteCode: string) => {
    const message = generateWhatsAppMessage(inviteCode);
    const cleanPhone = phoneNumber.replace(/\D/g, "");
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleSendInvite = async () => {
    if (!phone.trim()) {
      toast.error("Entrez un numéro de téléphone");
      return;
    }
    
    if (phone.length < 7) {
      toast.error("Numéro de téléphone trop court");
      return;
    }
    
    setSending(true);
    
    // Format le numéro complet avec l'indicatif pays
    const fullPhone = `${selectedCountry.dial_code.replace("+", "")}${phone}`;
    const inviteCode = await sendInvite(fullPhone);
    
    if (inviteCode) {
      // Ouvrir WhatsApp automatiquement avec le code de l'invite
      setTimeout(() => {
        openWhatsApp(fullPhone, inviteCode);
      }, 300);
      
      setPhone("");
      setShowAddModal(false);
      toast.success("WhatsApp ouvert pour envoyer l'invitation");
    }
    
    setSending(false);
  };

  const getStatusIcon = (status: EmployeeInvite["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="w-5 h-5 text-warning" />;
      case "accepted":
        return <CheckCircle className="w-5 h-5 text-success" />;
      case "expired":
        return <XCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: EmployeeInvite["status"]) => {
    switch (status) {
      case "pending":
        return "En attente";
      case "accepted":
        return "Acceptée";
      case "expired":
        return "Expirée";
    }
  };

  const getStatusColor = (status: EmployeeInvite["status"]) => {
    switch (status) {
      case "pending":
        return "text-warning";
      case "accepted":
        return "text-success";
      case "expired":
        return "text-muted-foreground";
    }
  };

  const pendingInvites = invites.filter(i => i.status === "pending");
  const pastInvites = invites.filter(i => i.status !== "pending");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <FeatureGate featureKey="employees" showUpgradePrompt>
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-card px-4 pb-6 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Gestion des employés</h1>
        </div>
        <p className="text-sm text-muted-foreground ml-14">
          Invitez des employés à accéder à votre boutique
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Add Button */}
        <PrimaryActionButton
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus className="w-5 h-5" />
          Inviter un employé
        </PrimaryActionButton>

        {/* Info Card */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Comment ça marche ?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  L'employé recevra une invitation WhatsApp avec un lien pour se connecter. 
                  Il pourra ensuite accéder au tableau de bord avec des permissions limitées.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              Invitations en attente ({pendingInvites.length})
            </p>
            <div className="space-y-3">
              {pendingInvites.map((invite, index) => (
                <AnimatedCard key={invite.id} delay={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                        {getStatusIcon(invite.status)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          +{invite.employee_phone.slice(0, 3)} {formatPhone(invite.employee_phone.slice(3))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Envoyée le {formatDate(invite.created_at)} • 
                          <span className={`ml-1 ${getStatusColor(invite.status)}`}>
                            {getStatusText(invite.status)}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); openWhatsApp(invite.employee_phone, invite.invite_code); }}
                          className="text-success hover:text-success hover:bg-success/10"
                          title="Renvoyer via WhatsApp"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); cancelInvite(invite.id); }}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </AnimatedCard>
              ))}
            </div>
          </div>
        )}

        {/* Past Invites */}
        {pastInvites.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              Historique
            </p>
            <div className="space-y-3">
              {pastInvites.map((invite, index) => (
                <AnimatedCard key={invite.id} delay={index} className="opacity-70">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        invite.status === "accepted" ? "bg-success/10" : "bg-secondary"
                      }`}>
                        {getStatusIcon(invite.status)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          +{invite.employee_phone.slice(0, 3)} {formatPhone(invite.employee_phone.slice(3))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(invite.created_at)} • 
                          <span className={`ml-1 ${getStatusColor(invite.status)}`}>
                            {getStatusText(invite.status)}
                          </span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); cancelInvite(invite.id); }}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </AnimatedCard>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {invites.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">Aucun employé</h3>
              <p className="text-sm text-muted-foreground">
                Invitez des employés pour leur donner accès à votre boutique
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-foreground/50 flex items-end z-50">
          <div className="bg-card w-full rounded-t-3xl p-6 animate-slide-up safe-bottom">
            <div className="w-12 h-1 bg-border rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-2 text-center">Inviter un employé</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              Entrez le numéro de téléphone de l'employé
            </p>
            
            <div className="mb-4">
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-3 py-2">
                <CountryCodeSelect
                  value={selectedCountry}
                  onChange={setSelectedCountry}
                />
                <div className="w-px h-6 bg-border" />
                <Input
                  type="tel"
                  placeholder="77 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="border-0 bg-transparent text-lg font-semibold focus-visible:ring-0 p-0 flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                L'invitation sera envoyée via WhatsApp
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setShowAddModal(false);
                  setPhone("");
                }}
                disabled={sending}
              >
                Annuler
              </Button>
              <Button
                variant="action"
                size="lg"
                onClick={handleSendInvite}
                disabled={sending || phone.length < 7}
                className="bg-success hover:bg-success/90"
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5 mr-2" />
                    WhatsApp
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </FeatureGate>
  );
};

export default EmployeeManagement;