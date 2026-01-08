import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { 
  Users, 
  Package, 
  Plus, 
  Store,
  ArrowLeft,
  Loader2,
  Radio,
  Map,
  MessageCircle,
  RefreshCw,
  Sparkles
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { MerchantProfileSetup } from "@/components/network/MerchantProfileSetup";
import { MerchantCard } from "@/components/network/MerchantCard";
import { RequestCard } from "@/components/network/RequestCard";
import { NewRequestDialog } from "@/components/network/NewRequestDialog";
import { MerchantsMap } from "@/components/network/MerchantsMap";
import { MerchantFilters, type MerchantFiltersState } from "@/components/network/MerchantFilters";
import { MerchantChat } from "@/components/network/MerchantChat";
import { useMerchantProfile, useMerchants } from "@/hooks/use-merchant-profile";
import { useProductRequests } from "@/hooks/use-product-requests";
import { useMerchantMessages } from "@/hooks/use-merchant-messages";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const Network = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requests");
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chatPartner, setChatPartner] = useState<{ id: string; name: string; requestId?: string; requestName?: string } | null>(null);
  const [filters, setFilters] = useState<MerchantFiltersState>({
    search: "",
    specialty: null,
    merchantType: null,
    location: null,
  });

  const { profile: myMerchantProfile, loading: profileLoading, hasProfile } = useMerchantProfile();
  const { merchants, loading: merchantsLoading, refetch: refetchMerchants } = useMerchants();
  const { requests, myRequests, loading: requestsLoading, fulfillRequest, cancelRequest, refetch: refetchRequests } = useProductRequests();
  const { conversations } = useMerchantMessages();

  // Extract unique locations for filter
  const locations = useMemo(() => {
    const locs = new Set<string>();
    merchants.forEach((m) => {
      if (m.location_name) locs.add(m.location_name);
      if (m.market_address) locs.add(m.market_address);
    });
    return Array.from(locs).filter(Boolean);
  }, [merchants]);

  // Filter merchants
  const filteredMerchants = useMemo(() => {
    return merchants.filter((m) => {
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchesSearch =
          m.profiles?.shop_name?.toLowerCase().includes(search) ||
          m.profiles?.owner_name?.toLowerCase().includes(search) ||
          m.specialties?.some((s) => s.toLowerCase().includes(search)) ||
          m.location_name?.toLowerCase().includes(search) ||
          m.market_address?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      if (filters.merchantType && m.merchant_type !== filters.merchantType) {
        return false;
      }

      if (filters.specialty && !m.specialties?.includes(filters.specialty)) {
        return false;
      }

      if (filters.location) {
        const matchesLocation =
          m.location_name === filters.location ||
          m.market_address === filters.location;
        if (!matchesLocation) return false;
      }

      return true;
    });
  }, [merchants, filters]);

  // Count unread messages
  const unreadCount = useMemo(() => {
    return conversations.reduce((sum, c) => sum + c.unreadCount, 0);
  }, [conversations]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchRequests(),
        refetchMerchants(),
      ]);
      toast.success("Données actualisées");
    } catch (error) {
      toast.error("Erreur lors du rafraîchissement");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleContact = (request: typeof requests[0]) => {
    setChatPartner({
      id: request.user_id,
      name: "Marchand",
      requestId: request.id,
      requestName: request.product_name,
    });
    setShowChat(true);
  };

  const handleFulfill = async (requestId: string) => {
    await fulfillRequest(requestId);
  };

  const handleCancel = async (requestId: string) => {
    await cancelRequest(requestId);
  };

  return (
    <AppLayout>
      <div className="min-h-screen pb-24">
        {/* Header - Compact & Modern */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="px-4 py-3">
            {/* Top row */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <button 
                  onClick={() => navigate("/dashboard")}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-secondary flex items-center justify-center"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5 truncate">
                    <Radio className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="truncate">Réseau</span>
                  </h1>
                </div>
              </div>
              
              {/* Action buttons - icons only on mobile */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-9 w-9 rounded-xl"
                >
                  <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowChat(true)}
                  className="h-9 w-9 rounded-xl relative"
                >
                  <MessageCircle className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant={hasProfile ? "outline" : "default"}
                  onClick={() => setShowProfileSheet(true)}
                  className="h-9 rounded-xl px-3"
                >
                  <Store className="w-4 h-4" />
                  <span className="hidden sm:inline ml-1.5">
                    {hasProfile ? "Profil" : "Rejoindre"}
                  </span>
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full h-10 p-1 bg-secondary rounded-xl">
                <TabsTrigger 
                  value="requests" 
                  className="flex-1 rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Package className="w-4 h-4 mr-1.5" />
                  Demandes
                </TabsTrigger>
                <TabsTrigger 
                  value="merchants" 
                  className="flex-1 rounded-lg text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  Marchands
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4">
          {activeTab === "requests" && (
            <div className="space-y-5">
              {/* My Requests Section */}
              {myRequests.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">
                      Mes demandes
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {myRequests.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {myRequests.map((req) => (
                      <RequestCard
                        key={req.id}
                        request={req}
                        isOwn
                        onCancel={() => handleCancel(req.id)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Network Requests */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Demandes du réseau
                  </h2>
                  <Badge variant="outline" className="text-xs">
                    {requests.length}
                  </Badge>
                </div>
                
                {requestsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                      <p className="text-sm text-muted-foreground mt-3">Chargement...</p>
                    </div>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mx-auto flex items-center justify-center mb-4">
                      <Package className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-medium text-foreground">Aucune demande</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                      Soyez le premier à publier une demande de produit !
                    </p>
                    <Button
                      onClick={() => setShowNewRequest(true)}
                      className="mt-4 rounded-xl"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Nouvelle demande
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {requests.map((req) => (
                      <RequestCard
                        key={req.id}
                        request={req}
                        onFulfill={() => handleFulfill(req.id)}
                        onContact={() => handleContact(req)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "merchants" && (
            <div className="space-y-4">
              {/* Filters */}
              <MerchantFilters
                filters={filters}
                onFiltersChange={setFilters}
                locations={locations}
              />

              {/* Map Toggle & Count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filteredMerchants.length} marchand{filteredMerchants.length !== 1 ? "s" : ""}
                </p>
                <Button
                  size="sm"
                  variant={showMap ? "default" : "outline"}
                  onClick={() => setShowMap(!showMap)}
                  className="rounded-xl h-8"
                >
                  <Map className="w-3.5 h-3.5 mr-1.5" />
                  {showMap ? "Liste" : "Carte"}
                </Button>
              </div>

              {merchantsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground mt-3">Chargement...</p>
                  </div>
                </div>
              ) : filteredMerchants.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 mx-auto flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-primary" />
                  </div>
                  {merchants.length === 0 ? (
                    <>
                      <p className="font-medium text-foreground">Aucun marchand</p>
                      <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                        Rejoignez le réseau et soyez le premier !
                      </p>
                      <Button
                        onClick={() => setShowProfileSheet(true)}
                        className="mt-4 rounded-xl"
                      >
                        <Store className="w-4 h-4 mr-2" />
                        Rejoindre
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-foreground">Aucun résultat</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Essayez d'autres filtres
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => setFilters({
                          search: "",
                          specialty: null,
                          merchantType: null,
                          location: null,
                        })}
                        className="mt-4 rounded-xl"
                      >
                        Effacer les filtres
                      </Button>
                    </>
                  )}
                </div>
              ) : showMap ? (
                <div className="rounded-2xl overflow-hidden border border-border">
                  <MerchantsMap merchants={filteredMerchants} />
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMerchants.map((merchant) => (
                    <MerchantCard
                      key={merchant.id}
                      merchant={merchant}
                      onContact={() => {
                        setChatPartner({
                          id: merchant.user_id,
                          name: merchant.profiles?.shop_name || "Marchand",
                        });
                        setShowChat(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* FAB - New Request */}
        {activeTab === "requests" && requests.length > 0 && (
          <div className="fixed bottom-24 right-4 z-40">
            <Button
              size="lg"
              onClick={() => setShowNewRequest(true)}
              className="h-14 w-14 rounded-2xl shadow-lg"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>
        )}

        {/* Profile Sheet */}
        <Sheet open={showProfileSheet} onOpenChange={setShowProfileSheet}>
          <SheetContent 
            side="bottom" 
            className="h-[90vh] max-h-[90vh] rounded-t-3xl flex flex-col p-0"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>Profil marchand</SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto pt-2 pb-8 px-4">
              <MerchantProfileSetup onComplete={() => setShowProfileSheet(false)} />
            </div>
          </SheetContent>
        </Sheet>

        {/* New Request Dialog */}
        <NewRequestDialog 
          open={showNewRequest} 
          onOpenChange={setShowNewRequest} 
        />

        {/* Chat */}
        <MerchantChat
          open={showChat}
          onOpenChange={setShowChat}
          initialPartnerId={chatPartner?.id}
          initialPartnerName={chatPartner?.name}
          requestId={chatPartner?.requestId}
          requestName={chatPartner?.requestName}
        />
      </div>
    </AppLayout>
  );
};

export default Network;
