import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminTickets } from "@/hooks/use-admin-stats";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminSupport() {
  const { data: tickets, isLoading } = useAdminTickets();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge className="bg-accent/10 text-accent">Ouvert</Badge>;
      case "in_progress": return <Badge className="bg-primary/10 text-primary">En cours</Badge>;
      case "resolved": return <Badge className="bg-success/10 text-success">Résolu</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support</h1>
          <p className="text-muted-foreground">Gérez les tickets de support</p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <CardSkeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : tickets && tickets.length > 0 ? (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mt-1">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{ticket.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {(ticket.profiles as any)?.shop_name || "Utilisateur"} • {(ticket.profiles as any)?.phone || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(ticket.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Aucun ticket de support
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
