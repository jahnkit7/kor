import { useState, useMemo, useEffect } from "react";
import { useFeatureTracking } from "@/hooks/use-feature-tracking";
import { 
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2,
  Map,
  Store,
  Plus,
  Package,
  Tag,
  Briefcase
} from "lucide-react";
import { NetworkLayout } from "@/components/network/NetworkLayout";
import { NetworkHeader } from "@/components/network/NetworkHeader";
import { MerchantProfileSetup } from "@/components/network/MerchantProfileSetup";
import { MerchantCard } from "@/components/network/MerchantCard";
import { RequestCard } from "@/components/network/RequestCard";
import { OfferCard } from "@/components/network/OfferCard";
import { NewRequestDialog } from "@/components/network/NewRequestDialog";
import { NewOfferDialog } from "@/components/network/NewOfferDialog";
import { MerchantsMap } from "@/components/network/MerchantsMap";
import { MerchantFilters, type MerchantFiltersState } from "@/components/network/MerchantFilters";
import { MerchantChat } from "@/components/network/MerchantChat";
import { NegotiationCard } from "@/components/network/NegotiationCard";
import { ProposalDialog } from "@/components/network/ProposalDialog";
import { FeatureGate } from "@/components/FeatureGate";
import { useMerchantProfile, useMerchants } from "@/hooks/use-merchant-profile";
import { useProductRequests } from "@/hooks/use-product-requests";
import { useMerchantOffers } from "@/hooks/use-merchant-offers";
import { useMerchantMessages } from "@/hooks/use-merchant-messages";
import { useNegotiations } from "@/hooks/use-negotiations";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TabType = "requests" | "offers" | "merchants" | "activity";

const Network = () => {
  const navigate = useNavigate();
  const { trackFeature } = useFeatureTracking();

  // Track page view
  useEffect(() => {
    trackFeature("network", { action: "page_view" });
  }, [trackFeature]);
  const [activeTab, setActiveTab] = useState<TabType>("requests");
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showNewOffer, setShowNewOffer] = useState(false);
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
  const { offers, myOffers, loading: offersLoading, cancelOffer, markAsSold, refetch: refetchOffers } = useMerchantOffers();
  const { conversations } = useMerchantMessages();
  const { negotiations, respondToProposal, markAsCompleted } = useNegotiations();

  // Profile info
  const shopName = myMerchantProfile?.profiles?.shop_name;
  const ownerName = myMerchantProfile?.profiles?.owner_name;

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

  // Pending negotiations for current user
  const pendingNegotiations = negotiations.filter(n => n.status === "pending");
  const acceptedNegotiations = negotiations.filter(n => n.status === "accepted");

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchRequests(),
        refetchMerchants(),
        refetchOffers(),
      ]);
      toast.success("Données actualisées");
    } catch (error) {
      toast.error("Erreur lors du rafraîchissement");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleContact = (userId: string, name: string, requestId?: string, productName?: string) => {
    setChatPartner({
      id: userId,
      name,
      requestId,
      requestName: productName,
    });
    setShowChat(true);
  };

  const handleCancel = async (requestId: string) => {
    await cancelRequest(requestId);
  };

  const handleAddNew = () => {
    if (activeTab === "requests") {
      setShowNewRequest(true);
    } else if (activeTab === "offers") {
      setShowNewOffer(true);
    } else if (activeTab === "merchants" && !hasProfile) {
      setShowProfileSheet(true);
    }
  };

  // Tab definitions
  const tabs = [
    { id: "requests" as TabType, label: "Demandes", icon: Package },
    { id: "offers" as TabType, label: "Offres", icon: Tag },
    { id: "merchants" as TabType, label: "Marchands", icon: Store },
    ...(hasProfile ? [{ id: "activity" as TabType, label: "Activité", icon: Briefcase }] : [])
  ];

  return (
    <FeatureGate featureKey="network" showUpgradePrompt>
    <NetworkLayout>
      {/* Custom Header */}
      <NetworkHeader
        shopName={shopName}
        ownerName={ownerName}
        unreadMessages={unreadCount}
        onBack={() => navigate("/dashboard")}
        onOpenMessages={() => {
          setChatPartner(null);
          setShowChat(true);
        }}
        onOpenProfile={() => setShowProfileSheet(true)}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Tab Navigation - Modern style */}
      <div className="sticky top-14 z-40 bg-background border-b border-border">
        <div className="flex items-center px-4 py-2 gap-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 pb-8">
        {/* DEMANDES TAB */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {/* Header with Add button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Demandes</h2>
                <p className="text-sm text-muted-foreground">
                  {requests.length + myRequests.length} demande{(requests.length + myRequests.length) !== 1 ? "s" : ""} active{(requests.length + myRequests.length) !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                onClick={() => setShowNewRequest(true)}
                className="rounded-full h-10 px-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle
              </Button>
            </div>

            {/* My Requests */}
            {myRequests.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-primary uppercase tracking-wider">
                  Mes demandes
                </p>
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
              {myRequests.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Réseau
                </p>
              )}
              
              {requestsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : requests.length === 0 && myRequests.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
                    <Package className="w-7 h-7 text-primary" />
                  </div>
                  <p className="font-medium text-foreground">Aucune demande</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                    Publiez votre recherche de produit !
                  </p>
                  <Button
                    onClick={() => setShowNewRequest(true)}
                    className="mt-4 rounded-full"
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
                      onContact={() => handleContact(req.user_id, "Marchand", req.id, req.product_name)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* OFFRES TAB */}
        {activeTab === "offers" && (
          <div className="space-y-4">
            {/* Header with Add button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Offres</h2>
                <p className="text-sm text-muted-foreground">
                  {offers.length + myOffers.length} offre{(offers.length + myOffers.length) !== 1 ? "s" : ""} disponible{(offers.length + myOffers.length) !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                onClick={() => setShowNewOffer(true)}
                className="rounded-full h-10 px-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Proposer
              </Button>
            </div>

            {/* My Offers */}
            {myOffers.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-medium text-accent uppercase tracking-wider">
                  Mes offres
                </p>
                <div className="space-y-2">
                  {myOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      isOwn
                      onCancel={() => cancelOffer(offer.id)}
                      onMarkSold={() => markAsSold(offer.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Network Offers */}
            <div className="space-y-3">
              {myOffers.length > 0 && (
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Réseau
                </p>
              )}
              
              {offersLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : offers.length === 0 && myOffers.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 mx-auto flex items-center justify-center mb-4">
                    <Tag className="w-7 h-7 text-accent" />
                  </div>
                  <p className="font-medium text-foreground">Aucune offre</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[200px] mx-auto">
                    Proposez vos produits disponibles !
                  </p>
                  <Button
                    onClick={() => setShowNewOffer(true)}
                    className="mt-4 rounded-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Proposer une offre
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {offers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      onContact={() => handleContact(
                        offer.user_id, 
                        offer.profiles?.shop_name || "Marchand"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MARCHANDS TAB */}
        {activeTab === "merchants" && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">Marchands</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredMerchants.length} marchand{filteredMerchants.length !== 1 ? "s" : ""} sur le réseau
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={showMap ? "default" : "outline"}
                  onClick={() => setShowMap(!showMap)}
                  className="rounded-full h-9"
                >
                  <Map className="w-4 h-4 mr-1.5" />
                  {showMap ? "Liste" : "Carte"}
                </Button>
                {!hasProfile && (
                  <Button
                    size="sm"
                    onClick={() => setShowProfileSheet(true)}
                    className="rounded-full h-9"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Rejoindre
                  </Button>
                )}
              </div>
            </div>

            {/* Filters */}
            <MerchantFilters
              filters={filters}
              onFiltersChange={setFilters}
              locations={locations}
            />

            {merchantsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : filteredMerchants.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-2xl border border-dashed border-border">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
                  <Store className="w-7 h-7 text-primary" />
                </div>
                {merchants.length === 0 ? (
                  <>
                    <p className="font-medium text-foreground">Aucun marchand</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Soyez le premier à rejoindre !
                    </p>
                    <Button
                      onClick={() => setShowProfileSheet(true)}
                      className="mt-4 rounded-full"
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
                      className="mt-4 rounded-full"
                    >
                      Effacer les filtres
                    </Button>
                  </>
                )}
              </div>
            ) : showMap ? (
              <div className="rounded-2xl overflow-hidden border border-border h-[400px]">
                <MerchantsMap merchants={filteredMerchants} />
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMerchants.map((merchant) => (
                  <MerchantCard
                    key={merchant.id}
                    merchant={merchant}
                    onContact={() => handleContact(
                      merchant.user_id,
                      merchant.profiles?.shop_name || "Marchand"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === "activity" && hasProfile && (
          <div className="space-y-6">
            {/* Profile Summary */}
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-4 border border-primary/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                  {shopName?.substring(0, 2).toUpperCase() || "RD"}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-foreground truncate">{shopName}</h2>
                  {ownerName && (
                    <p className="text-sm text-muted-foreground truncate">{ownerName}</p>
                  )}
                  <Badge variant="secondary" className="mt-1">
                    {myMerchantProfile?.merchant_type || "Marchand"}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowProfileSheet(true)}
                  className="rounded-full"
                >
                  Modifier
                </Button>
              </div>
            </div>

            {/* Pending Negotiations */}
            {pendingNegotiations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="font-semibold text-foreground">Propositions en attente</h3>
                  <Badge variant="secondary">{pendingNegotiations.length}</Badge>
                </div>
                <div className="space-y-2">
                  {pendingNegotiations.map(neg => (
                    <NegotiationCard
                      key={neg.id}
                      negotiation={neg}
                      partnerName="Marchand"
                      onAccept={() => respondToProposal(neg.id, "accepted")}
                      onReject={() => respondToProposal(neg.id, "rejected")}
                      onCounter={() => {}}
                      onComplete={() => markAsCompleted(neg.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Accepted Negotiations */}
            {acceptedNegotiations.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <h3 className="font-semibold text-foreground">Accords en cours</h3>
                  <Badge variant="secondary">{acceptedNegotiations.length}</Badge>
                </div>
                <div className="space-y-2">
                  {acceptedNegotiations.map(neg => (
                    <NegotiationCard
                      key={neg.id}
                      negotiation={neg}
                      partnerName="Marchand"
                      onAccept={() => {}}
                      onReject={() => {}}
                      onCounter={() => {}}
                      onComplete={() => markAsCompleted(neg.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* My Requests Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Mes demandes actives</h3>
              {myRequests.length === 0 ? (
                <div className="text-center py-6 bg-card rounded-xl border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">Aucune demande active</p>
                  <Button
                    variant="link"
                    onClick={() => setShowNewRequest(true)}
                    className="mt-1"
                  >
                    Créer une demande
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {myRequests.slice(0, 3).map((req) => (
                    <RequestCard
                      key={req.id}
                      request={req}
                      isOwn
                      onCancel={() => handleCancel(req.id)}
                    />
                  ))}
                  {myRequests.length > 3 && (
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab("requests")}
                      className="w-full"
                    >
                      Voir tout ({myRequests.length})
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* My Offers Summary */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Mes offres actives</h3>
              {myOffers.length === 0 ? (
                <div className="text-center py-6 bg-card rounded-xl border border-dashed border-border">
                  <p className="text-sm text-muted-foreground">Aucune offre active</p>
                  <Button
                    variant="link"
                    onClick={() => setShowNewOffer(true)}
                    className="mt-1"
                  >
                    Proposer une offre
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {myOffers.slice(0, 3).map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      isOwn
                      onCancel={() => cancelOffer(offer.id)}
                      onMarkSold={() => markAsSold(offer.id)}
                    />
                  ))}
                  {myOffers.length > 3 && (
                    <Button
                      variant="ghost"
                      onClick={() => setActiveTab("offers")}
                      className="w-full"
                    >
                      Voir tout ({myOffers.length})
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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

      {/* New Offer Dialog */}
      <NewOfferDialog 
        open={showNewOffer} 
        onOpenChange={setShowNewOffer} 
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
    </NetworkLayout>
    </FeatureGate>
  );
};

export default Network;
