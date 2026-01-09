import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminUsers } from "@/hooks/use-admin-stats";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, User, Phone, MapPin, Calendar, MoreVertical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function AdminUsers() {
  const { data: users, isLoading } = useAdminUsers();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const filteredUsers = users?.filter(
    (user) =>
      user.shop_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.phone?.includes(search) ||
      user.owner_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
            <p className="text-muted-foreground">
              {users?.length || 0} utilisateurs inscrits
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, téléphone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Boutique</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead className="hidden lg:table-cell">Ville</TableHead>
                      <TableHead className="hidden lg:table-cell">Inscription</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow 
                        key={user.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedUser(user)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{user.shop_name || "Sans nom"}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.owner_name || "-"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {user.phone || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {(user as any).city || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            {user.created_at
                              ? formatDistanceToNow(new Date(user.created_at), {
                                  addSuffix: true,
                                  locale: fr,
                                })
                              : "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(user.subscriptions as any)?.[0]?.status === "active" ? (
                            <Badge className="bg-success/10 text-success hover:bg-success/20">
                              Actif
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Trial</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                Voir détails
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                Activer manuellement
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                Suspendre
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Detail Sheet */}
        <Sheet open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Détails utilisateur</SheetTitle>
            </SheetHeader>
            {selectedUser && (
              <div className="mt-6 space-y-6">
                {/* Profile Info */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {selectedUser.shop_name || "Sans nom"}
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedUser.owner_name || "-"}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{selectedUser.phone || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Ville</p>
                      <p className="font-medium">{selectedUser.city || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Spécialité</p>
                      <p className="font-medium">{selectedUser.specialty || "-"}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-secondary/50">
                      <p className="text-sm text-muted-foreground">Inscription</p>
                      <p className="font-medium">
                        {selectedUser.created_at
                          ? new Date(selectedUser.created_at).toLocaleDateString("fr-FR")
                          : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Subscription Info */}
                  <div className="p-4 rounded-lg border border-border">
                    <h4 className="font-semibold mb-3">Abonnement</h4>
                    {selectedUser.subscriptions?.[0] ? (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Statut</span>
                          <Badge className="bg-success/10 text-success">
                            {selectedUser.subscriptions[0].status}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expire</span>
                          <span>
                            {selectedUser.subscriptions[0].expires_at
                              ? new Date(selectedUser.subscriptions[0].expires_at).toLocaleDateString("fr-FR")
                              : "Jamais"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Pas d'abonnement</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button className="w-full">Activer abonnement manuellement</Button>
                    <Button variant="outline" className="w-full">
                      Reset PIN
                    </Button>
                    <Button variant="destructive" className="w-full">
                      Suspendre le compte
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </AdminLayout>
  );
}
