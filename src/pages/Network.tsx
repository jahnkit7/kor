import { useState } from "react";
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
  Map
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { MerchantProfileSetup } from "@/components/network/MerchantProfileSetup";
import { MerchantCard } from "@/components/network/MerchantCard";
import { RequestCard } from "@/components/network/RequestCard";
import { NewRequestDialog } from "@/components/network/NewRequestDialog";
import { MerchantsMap } from "@/components/network/MerchantsMap";
import { useMerchantProfile, useMerchants } from "@/hooks/use-merchant-profile";
import { useProductRequests } from "@/hooks/use-product-requests";
import { useNavigate } from "react-router-dom";

const Network = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("requests");
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const { profile: myMerchantProfile, loading: profileLoading, hasProfile } = useMerchantProfile();
  const { merchants, loading: merchantsLoading } = useMerchants();
  const { requests, myRequests, loading: requestsLoading, fulfillRequest, cancelRequest } = useProductRequests();

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
              
              <Button
                size="sm"
                variant={hasProfile ? "outline" : "default"}
                onClick={() => setShowProfileSheet(true)}
                className="rounded-xl h-9"
              >
                <Store className="w-4 h-4 mr-1.5" />
                {hasProfile ? "Mon profil" : "Rejoindre"}
              </Button>
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
                        onContact={() => {
                          // TODO: Implement contact
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "merchants" && (
            <div className="space-y-4">
              {/* Map Toggle */}
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {showMap ? "Carte des marchands" : "Liste des marchands"}
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
              ) : merchants.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">Aucun marchand inscrit</p>
                  <Button
                    onClick={() => setShowProfileSheet(true)}
                    className="mt-4 rounded-xl"
                  >
                    <Store className="w-4 h-4 mr-2" />
                    Être le premier
                  </Button>
                </div>
              ) : showMap ? (
                <MerchantsMap merchants={merchants} />
              ) : (
                <div className="space-y-3">
                  {merchants.map((merchant) => (
                    <MerchantCard
                      key={merchant.id}
                      merchant={merchant}
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
      </div>
    </AppLayout>
  );
};

export default Network;
