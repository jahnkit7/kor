import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Send
} from "lucide-react";
import { useEmployees, type EmployeeInvite } from "@/hooks/use-employees";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const EmployeeManagement = () => {
  const navigate = useNavigate();
  const { invites, loading, sendInvite, cancelInvite } = useEmployees();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [phone, setPhone] = useState("");
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

  const handleSendInvite = async () => {
    if (!phone.trim()) {
      toast.error("Entrez un numéro de téléphone");
      return;
    }
    
    setSending(true);
    const success = await sendInvite(phone);
    setSending(false);
    
    if (success) {
      setPhone("");
      setShowAddModal(false);
    }
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
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
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
        <Button
          variant="action"
          size="lg"
          className="w-full"
          onClick={() => setShowAddModal(true)}
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Inviter un employé
        </Button>

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
                  L'employé recevra un code d'accès par SMS. Il pourra ensuite se connecter 
                  avec son numéro de téléphone et voir les données de votre boutique avec des 
                  permissions limitées.
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
                <Card key={invite.id} className="animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                        {getStatusIcon(invite.status)}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          {formatPhone(invite.employee_phone)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Envoyée le {formatDate(invite.created_at)} • 
                          <span className={`ml-1 ${getStatusColor(invite.status)}`}>
                            {getStatusText(invite.status)}
                          </span>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => cancelInvite(invite.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
                <Card key={invite.id} className="animate-fade-in opacity-70" style={{ animationDelay: `${index * 50}ms` }}>
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
                          {formatPhone(invite.employee_phone)}
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
                        onClick={() => cancelInvite(invite.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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
            
            <div className="mb-6">
              <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <Input
                  type="tel"
                  placeholder="77 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
                  className="border-0 bg-transparent text-lg font-semibold focus-visible:ring-0 p-0"
                />
              </div>
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
                disabled={sending || phone.length < 8}
              >
                {sending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Envoyer
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;