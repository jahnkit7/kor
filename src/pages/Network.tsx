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
  MessageCircle
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

const Network = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requests");
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatPartner, setChatPartner] = useState<{ id: string; name: string; requestId?: string; requestName?: string } | null>(null);
  const [filters, setFilters] = useState<MerchantFiltersState>({
    search: "",
    specialty: null,
    merchantType: null,
    location: null,
  });

  const { profile: myMerchantProfile, loading: profileLoading, hasProfile } = useMerchantProfile();
  const { merchants, loading: merchantsLoading } = useMerchants();
  const { requests, myRequests, loading: requestsLoading, fulfillRequest, cancelRequest } = useProductRequests();
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
      // Search filter
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

      // Type filter
      if (filters.merchantType && m.merchant_type !== filters.merchantType) {
        return false;
      }

      // Specialty filter
      if (filters.specialty && !m.specialties?.includes(filters.specialty)) {
        return false;
      }

      // Location filter
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

  const handleContact = (request: typeof requests[0]) => {
    setChatPartner({
      id: request.user_id,
      name: "Marchand", // Will be fetched in chat
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
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => navigate("/dashboard")}
                  className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                    <Radio className="w-5 h-5 text-primary" />
                    Réseau DÉKON
                  </h1>
                  <p className="text-xs text-muted-foreground">Marchands et demandes</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowChat(true)}
                  className="rounded-xl h-9 relative"
                >
                  <MessageCircle className="w-4 h-4 mr-1.5" />
                  Messages
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant={hasProfile ? "outline" : "default"}
                  onClick={() => setShowProfileSheet(true)}
                  className="rounded-xl h-9"
                >
                  <Store className="w-4 h-4 mr-1.5" />
                  {hasProfile ? "Profil" : "Rejoindre"}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full h-11 p-1 bg-secondary rounded-xl">
                <TabsTrigger 
                  value="requests" 
                  className="flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Package className="w-4 h-4 mr-1.5" />
                  Demandes
                </TabsTrigger>
                <TabsTrigger 
                  value="merchants" 
                  className="flex-1 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  Marchands
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          {activeTab === "requests" && (
            <div className="space-y-4">
              {/* My Requests Section */}
              {myRequests.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Mes demandes
                  </h2>
                  {myRequests.map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      isOwn
                      onCancel={() => handleCancel(req.id)}
                    />
                  ))}
                </div>
              )}

              {/* Network Requests */}
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Demandes du réseau
                </h2>
                
                {requestsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
                      <Package className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Aucune demande pour le moment</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">
                      Soyez le premier à publier !
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
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

              {/* Map Toggle */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {showMap ? "Carte" : "Liste"} ({filteredMerchants.length})
                </h2>
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
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredMerchants.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  {merchants.length === 0 ? (
                    <>
                      <p className="text-muted-foreground">Aucun marchand inscrit</p>
                      <Button
                        onClick={() => setShowProfileSheet(true)}
                        className="mt-4 rounded-xl"
                      >
                        <Store className="w-4 h-4 mr-2" />
                        Être le premier
                      </Button>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Aucun résultat pour ces filtres</p>
                  )}
                </div>
              ) : showMap ? (
                <MerchantsMap merchants={filteredMerchants} />
              ) : (
                <div className="space-y-3">
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
        {activeTab === "requests" && (
          <div className="fixed bottom-24 right-5 z-40">
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
          <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
            <SheetHeader className="sr-only">
              <SheetTitle>Profil marchand</SheetTitle>
            </SheetHeader>
            <div className="pt-2 pb-8">
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
