import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Database, RefreshCw, Trash2, CloudDownload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOffline } from "@/contexts/OfflineContext";
import { useAuth } from "@/hooks/use-auth";
import { pullFromCloud } from "@/lib/supabase-sync";

export function CacheManagement() {
  const [isClearing, setIsClearing] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const { performSync, pendingCount } = useOffline();
  const { user } = useAuth();

  const handleClearCache = async () => {
    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }

    setIsClearing(true);
    try {
      // Delete the IndexedDB database
      const dbName = "caisse-plus-db";
      
      // Close any existing connections
      const databases = await indexedDB.databases();
      const dbExists = databases.some(db => db.name === dbName);
      
      if (dbExists) {
        // Request to delete the database
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        
        await new Promise<void>((resolve, reject) => {
          deleteRequest.onsuccess = () => resolve();
          deleteRequest.onerror = () => reject(deleteRequest.error);
          deleteRequest.onblocked = () => {
            console.warn("Database deletion blocked - connections still open");
            // Still resolve, the deletion will happen when connections close
            resolve();
          };
        });
      }

      toast.success("Cache local vidé avec succès");
      
      // Now re-sync from cloud
      setIsResyncing(true);
      await pullFromCloud(user.id);
      toast.success("Données re-téléchargées depuis le cloud");
      
      // Reload the page to reinitialize the database
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error("Error clearing cache:", error);
      toast.error("Erreur lors du vidage du cache");
    } finally {
      setIsClearing(false);
      setIsResyncing(false);
    }
  };

  const handleForceSync = async () => {
    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }

    setIsResyncing(true);
    try {
      await performSync();
      toast.success("Synchronisation forcée terminée");
    } catch (error) {
      console.error("Sync error:", error);
      toast.error("Erreur de synchronisation");
    } finally {
      setIsResyncing(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Database className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Gestion du cache</p>
            <p className="text-sm text-muted-foreground">
              {pendingCount > 0 
                ? `${pendingCount} élément(s) en attente de sync` 
                : "Tout est synchronisé"}
            </p>
          </div>
        </div>

        {/* Force Sync Button */}
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleForceSync}
          disabled={isResyncing || isClearing}
        >
          {isResyncing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Forcer la synchronisation
        </Button>

        {/* Clear Cache Dialog */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-destructive hover:text-destructive"
              disabled={isClearing || isResyncing}
            >
              {isClearing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Vider le cache et re-télécharger
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CloudDownload className="w-5 h-5" />
                Vider le cache local ?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  Cette action va supprimer toutes les données locales non synchronisées 
                  et re-télécharger vos données depuis le cloud.
                </p>
                {pendingCount > 0 && (
                  <p className="text-destructive font-medium">
                    ⚠️ Attention: vous avez {pendingCount} élément(s) non synchronisé(s) 
                    qui seront perdus !
                  </p>
                )}
                <p className="text-sm">
                  Utilisez cette option uniquement si vous rencontrez des problèmes 
                  de synchronisation persistants.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClearCache}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {pendingCount > 0 ? "Vider quand même" : "Confirmer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
