import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminLogs } from "@/hooks/use-admin-stats";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/loading-skeleton";
import { FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminLogs() {
  const { data: logs, isLoading } = useAdminLogs();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs</h1>
          <p className="text-muted-foreground">Historique des actions administratives</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Actions récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(10)].map((_, i) => <CardSkeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{log.action}</Badge>
                      <span className="text-sm">
                        {log.target_type && <span className="text-muted-foreground">{log.target_type}</span>}
                      </span>
                      {log.ip_address && (
                        <span className="text-xs text-muted-foreground font-mono">{log.ip_address}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">Aucun log disponible</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
