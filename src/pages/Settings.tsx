import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Store,
  User,
  Phone,
  Lock,
  Globe,
  LogOut,
  ChevronRight,
  Shield
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const Settings = () => {
  const navigate = useNavigate();

  const [settings] = useState({
    shopName: "Boutique Mamadou",
    ownerName: "Mamadou Diop",
    phone: "+221 77 123 45 67",
    currency: "CFA",
    language: "Français",
  });

  const handleLogout = () => {
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  const settingsGroups = [
    {
      title: "Boutique",
      items: [
        { icon: Store, label: "Nom de la boutique", value: settings.shopName },
        { icon: User, label: "Nom du propriétaire", value: settings.ownerName },
        { icon: Phone, label: "Téléphone", value: settings.phone },
      ],
    },
    {
      title: "Application",
      items: [
        { icon: Globe, label: "Devise", value: settings.currency },
        { icon: Globe, label: "Langue", value: settings.language },
      ],
    },
    {
      title: "Sécurité",
      items: [
        { icon: Lock, label: "Changer le code PIN", value: "" },
        { icon: Shield, label: "Sécurité du compte", value: "" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Réglages</h1>
        </div>
      </div>

      {/* Settings Groups */}
      <div className="p-4 space-y-6">
        {settingsGroups.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              {group.title}
            </p>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {group.items.map(({ icon: Icon, label, value }) => (
                  <button
                    key={label}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-secondary/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{label}</p>
                      {value && (
                        <p className="text-sm text-muted-foreground">{value}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        ))}

        {/* Logout Button */}
        <Button
          variant="destructive"
          size="lg"
          className="w-full"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Déconnexion
        </Button>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground">
          CAISSE+ v1.0.0
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default Settings;
