import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, 
  Search, 
  User, 
  Phone, 
  Plus,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { ClientWarningBadge } from "@/components/ClientWarningBadge";
import { usePermissions } from "@/hooks/use-role";
import { useHiddenAmount } from "@/components/HideAmountsToggle";
import { toast } from "sonner";

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { canDeleteData } = usePermissions();
  const { formatMoney } = useHiddenAmount();

  // Mock data with isRisky flag
  const [clients, setClients] = useState([
    { id: "1", name: "Ousmane Diallo", phone: "77 123 45 67", debt: 125000, isRisky: true },
    { id: "2", name: "Fatou Ndiaye", phone: "78 234 56 78", debt: 75000, isRisky: false },
    { id: "3", name: "Ibrahima Fall", phone: "76 345 67 89", debt: 50000, isRisky: false },
    { id: "4", name: "Aminata Sow", phone: "70 456 78 90", debt: 0, isRisky: true },
    { id: "5", name: "Moussa Ba", phone: "77 567 89 01", debt: 0, isRisky: false },
  ]);

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery)
  );

  const toggleRisky = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setClients(prev => 
      prev.map(c => 
        c.id === clientId ? { ...c, isRisky: !c.isRisky } : c
      )
    );
    const client = clients.find(c => c.id === clientId);
    if (client) {
      toast.success(
        client.isRisky 
          ? `${client.name} n'est plus marqué` 
          : `${client.name} marqué comme souvent en retard`
      );
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-xl font-bold">Clients</h1>
          </div>
          <Button
            variant="action"
            size="icon"
            onClick={() => navigate("/clients/new")}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 px-4 py-3 bg-secondary rounded-xl">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="p-4">
        <p className="text-sm font-semibold text-muted-foreground mb-3">
          {filteredClients.length} client{filteredClients.length > 1 ? "s" : ""}
        </p>
        
        <div className="space-y-3">
          {filteredClients.map((client) => (
            <Card
              key={client.id}
              className="cursor-pointer hover:shadow-lg transition-shadow animate-fade-in"
              onClick={() => client.debt > 0 ? navigate(`/debts/${client.id}`) : undefined}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-6 h-6 text-muted-foreground" />
                    </div>
                    {/* Warning badge */}
                    <div className="absolute -top-1 -right-1">
                      <ClientWarningBadge isRisky={client.isRisky} />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{client.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {client.phone}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      {client.debt > 0 ? (
                        <>
                          <p className="text-sm font-bold text-debt">{formatMoney(client.debt)} CFA</p>
                          <p className="text-xs text-muted-foreground">dette</p>
                        </>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-success/10 text-success">
                          Pas de dette
                        </span>
                      )}
                    </div>
                    
                    {/* Risky toggle (only for owners) */}
                    {canDeleteData && (
                      <button
                        onClick={(e) => toggleRisky(client.id, e)}
                        className={`p-2 rounded-lg transition-colors ${
                          client.isRisky 
                            ? "bg-credit/10 text-credit" 
                            : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                        }`}
                        title={client.isRisky ? "Retirer le marquage" : "Marquer comme souvent en retard"}
                      >
                        <AlertTriangle className="w-4 h-4" />
                      </button>
                    )}
                    
                    {client.debt > 0 && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Clients;