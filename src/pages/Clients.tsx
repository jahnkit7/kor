import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Search, 
  User, 
  Phone, 
  Plus,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { ClientWarningBadge } from "@/components/ClientWarningBadge";
import { usePermissions } from "@/hooks/use-role";
import { useHiddenAmount } from "@/components/HideAmountsToggle";
import { useClients } from "@/hooks/use-clients";
import { FeatureGate } from "@/components/FeatureGate";
import { Skeleton, ListSkeleton } from "@/components/ui/loading-skeleton";

const Clients = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { canDeleteData } = usePermissions();
  const { formatMoney } = useHiddenAmount();
  const { clients, loading, toggleRisky } = useClients();
  const { trackFeature } = useFeatureTracking();

  // Track page view
  useEffect(() => {
    trackFeature("clients", { action: "page_view" });
  }, [trackFeature]);

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery)
  );

  const handleToggleRisky = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleRisky(clientId);
  };

  if (loading) {
    return (
      <AppLayout>
      <div className="bg-gradient-to-b from-[#f8f9ff] to-white px-4 pb-6 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <div className="p-4">
          <Skeleton className="h-4 w-20 mb-3" />
          <ListSkeleton count={6} variant="client" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <FeatureGate featureKey="clients" showUpgradePrompt>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#f8f9ff] to-white px-4 pb-6 border-b border-border" style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-6 h-6 text-[#2d3748]" />
            </Button>
            <h1 className="text-xl font-bold text-[#2d3748]">Clients</h1>
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
          {filteredClients.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground mb-4">Aucun client trouvé</p>
                <button 
                  onClick={() => navigate("/clients/new")}
                  className="w-full h-14 rounded-full flex items-center justify-center gap-2
                    bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8]
                    text-white font-bold text-base tracking-wide uppercase
                    shadow-lg shadow-blue-500/30 hover:shadow-xl
                    active:scale-[0.98] transition-all"
                >
                  <Plus className="w-5 h-5" />
                  Ajouter un client
                </button>
              </CardContent>
            </Card>
          ) : (
            filteredClients.map((client) => (
              <Card
                key={client.id}
                className="cursor-pointer hover:shadow-lg transition-shadow animate-fade-in"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      {/* Warning badge */}
                      <div className="absolute -top-1 -right-1">
                        <ClientWarningBadge isRisky={client.is_risky} />
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
                        {client.total_debt && client.total_debt > 0 ? (
                          <>
                            <p className="text-sm font-bold text-debt">{formatMoney(client.total_debt)} CFA</p>
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
                          onClick={(e) => handleToggleRisky(client.id, e)}
                          className={`p-2 rounded-lg transition-colors ${
                            client.is_risky 
                              ? "bg-credit/10 text-credit" 
                              : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                          }`}
                          title={client.is_risky ? "Retirer le marquage" : "Marquer comme souvent en retard"}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                      )}
                      
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      </FeatureGate>
    </AppLayout>
  );
};

export default Clients;