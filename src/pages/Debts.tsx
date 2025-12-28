import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  Search, 
  User, 
  Phone, 
  ChevronRight,
  AlertCircle,
  Clock,
  TrendingUp
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { ClientWarningBadge } from "@/components/ClientWarningBadge";
import { WhatsAppShare } from "@/components/WhatsAppShare";
import { useHiddenAmount } from "@/components/HideAmountsToggle";
import { useDebts } from "@/hooks/use-debts";
import { useClients } from "@/hooks/use-clients";

const Debts = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { formatMoney } = useHiddenAmount();
  const { debts, totalDebts, loading } = useDebts();
  const { clients } = useClients();

  // Group debts by client with unpaid balance
  const clientDebts = debts.reduce((acc, debt) => {
    if (debt.remaining <= 0) return acc;
    
    const existing = acc.find(c => c.client_id === debt.client_id);
    if (existing) {
      existing.totalAmount += debt.remaining;
      // Update oldest debt date
      if (new Date(debt.created_at) < new Date(existing.oldestDebt)) {
        existing.oldestDebt = debt.created_at;
      }
    } else {
      acc.push({
        client_id: debt.client_id,
        name: debt.client_name || "Client inconnu",
        phone: debt.client_phone || "",
        totalAmount: debt.remaining,
        oldestDebt: debt.created_at,
        isRisky: debt.client_is_risky || false,
      });
    }
    return acc;
  }, [] as Array<{
    client_id: string;
    name: string;
    phone: string;
    totalAmount: number;
    oldestDebt: string;
    isRisky: boolean;
  }>);

  // Calculate days overdue
  const clientDebtsWithOverdue = clientDebts.map(cd => {
    const daysSinceOldest = Math.floor(
      (new Date().getTime() - new Date(cd.oldestDebt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return { ...cd, daysOverdue: daysSinceOldest };
  });

  const filteredDebts = clientDebtsWithOverdue.filter(
    (debt) =>
      debt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.phone.includes(searchQuery)
  );

  const getOverdueColor = (days: number) => {
    if (days >= 30) return "text-debt bg-debt/10";
    if (days >= 7) return "text-credit bg-credit/10";
    return "text-muted-foreground bg-secondary";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-card px-4 pt-4 pb-6 border-b border-border">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold">Dettes</h1>
        </div>

        {/* Total */}
        <Card className="bg-debt/5 border-debt/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-debt/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-debt" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Dettes à récupérer</p>
                <p className="text-money-lg text-debt">{formatMoney(totalDebts)} <span className="text-sm">CFA</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="mt-4 flex items-center gap-3 px-4 py-3 bg-secondary rounded-xl">
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

      {/* Debts List */}
      <div className="p-4">
        <p className="text-sm font-semibold text-muted-foreground mb-3">
          {filteredDebts.length} client{filteredDebts.length > 1 ? "s" : ""} avec dette
        </p>
        
        <div className="space-y-3">
          {filteredDebts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Aucune dette en cours
              </CardContent>
            </Card>
          ) : (
            filteredDebts.map((debt) => (
              <Card
                key={debt.client_id}
                className="cursor-pointer hover:shadow-lg transition-shadow animate-fade-in"
                onClick={() => navigate(`/debts/${debt.client_id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                        <User className="w-6 h-6 text-muted-foreground" />
                      </div>
                      {/* Warning badge positioned on avatar */}
                      <div className="absolute -top-1 -right-1">
                        <ClientWarningBadge isRisky={debt.isRisky} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-foreground">{debt.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {debt.phone || "Pas de téléphone"}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                      </div>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-2">
                          <p className="text-money-sm text-debt">
                            {formatMoney(debt.totalAmount)} <span className="text-xs">CFA</span>
                          </p>
                          <WhatsAppShare
                            type="debt"
                            data={{
                              clientName: debt.name,
                              clientPhone: debt.phone,
                              amount: debt.totalAmount,
                            }}
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs px-2"
                          />
                        </div>
                        
                        {debt.daysOverdue > 0 ? (
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${getOverdueColor(debt.daysOverdue)}`}>
                            <AlertCircle className="w-3 h-3" />
                            {debt.daysOverdue}j
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-success/10 text-success flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Nouveau
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Debts;