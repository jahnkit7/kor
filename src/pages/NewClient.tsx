import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PrimaryActionButton } from "@/components/ui/primary-action-button";
import { ArrowLeft, User, Phone, Camera, Check } from "lucide-react";
import { toast } from "sonner";
import { useClients } from "@/hooks/use-clients";

const NewClient = () => {
  const navigate = useNavigate();
  const { addClient } = useClients();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Entrez le nom du client");
      return;
    }
    if (!phone.trim() || phone.length < 8) {
      toast.error("Entrez un numéro de téléphone valide");
      return;
    }

    setIsLoading(true);
    try {
      const created = await addClient({ name: name.trim(), phone: phone.trim() });
      if (!created) return;
      navigate(-1);
    } catch {
      // addClient already toasts
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card px-4 pb-6 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Nouveau Client</h1>
        </div>
      </div>

      {/* Form */}
      <div className="p-4 space-y-4">
        {/* Photo */}
        <div className="flex justify-center mb-6">
          <button className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-border hover:border-primary transition-colors">
            <Camera className="w-8 h-8 text-muted-foreground" />
          </button>
        </div>

        {/* Name */}
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">
              Nom complet *
            </label>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Ex: Ousmane Diallo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Phone */}
        <Card>
          <CardContent className="p-4">
            <label className="text-sm font-semibold text-muted-foreground mb-2 block">
              Numéro de téléphone *
            </label>
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">+221</span>
              <input
                type="tel"
                placeholder="77 123 45 67"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/50"
                maxLength={9}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit */}
      <div className="p-4 safe-bottom">
        <PrimaryActionButton
          onClick={handleSubmit}
          disabled={!name.trim() || phone.length < 8 || isLoading}
        >
          <Check className="w-5 h-5" />
          Ajouter le client
        </PrimaryActionButton>
      </div>
    </div>
  );
};

export default NewClient;
