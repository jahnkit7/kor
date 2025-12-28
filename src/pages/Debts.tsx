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

const Debts = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("fr-FR").format(amount);
  };

  // Mock data
  const totalDebts = 340000;
  const debts = [
    {
      id: "1",
      name: "Ousmane Diallo",
      phone: "77 123 45 67",
      amount: 125000,
      daysOverdue: 15,
      lastPayment: "Il y a 10 jours",
    },
    {
      id: "2",
      name: "Fatou Ndiaye",
      phone: "78 234 56 78",
      amount: 75000,
      daysOverdue: 5,
      lastPayment: "Il y a 3 jours",
    },
    {
      id: "3",
      name: "Ibrahima Fall",
      phone: "76 345 67 89",
      amount: 50000,
      daysOverdue: 0,
      lastPayment: "Aujourd'hui",
    },
    {
      id: "4",
      name: "Aminata Sow",
      phone: "70 456 78 90",
      amount: 90000,
      daysOverdue: 30,
      lastPayment: "Il y a 1 mois",
    },
  ];

  const filteredDebts = debts.filter(
    (debt) =>
      debt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.phone.includes(searchQuery)
  );

  const getOverdueColor = (days: number) => {
    if (days >= 30) return "text-debt bg-debt/10";
    if (days >= 7) return "text-credit bg-credit/10";
    return "text-muted-foreground bg-secondary";
  };

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
                <p className="text-sm text-muted-foreground font-medium">Total impayé</p>
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
          {filteredDebts.map((debt) => (
            <Card
              key={debt.id}
              className="cursor-pointer hover:shadow-lg transition-shadow animate-fade-in"
              onClick={() => navigate(`/debts/${debt.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-foreground">{debt.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {debt.phone}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-money-sm text-debt">
                        {formatMoney(debt.amount)} <span className="text-xs">CFA</span>
                      </p>
                      
                      {debt.daysOverdue > 0 ? (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${getOverdueColor(debt.daysOverdue)}`}>
                          <AlertCircle className="w-3 h-3" />
                          {debt.daysOverdue}j en retard
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-success/10 text-success flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          À jour
                        </span>
                      )}
                    </div>
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

export default Debts;
