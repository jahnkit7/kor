import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  QrCode, 
  Globe, 
  ToggleLeft, 
  Percent, 
  MessageSquare, 
  FileText,
  ArrowLeft,
  Zap,
  BarChart2,
  TrendingUp,
  Gift,
  Bell,
  Map,
  Database,
  User,
  LogOut,
  Store,
  Settings2,
  Trash2,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-profile";
import { useAdminLayout } from "@/hooks/use-admin-layout";
import { DraggableNavItem } from "./DraggableNavItem";
import KorLogo from "@/assets/logo-kor.svg";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

const allModules = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", exact: true },
  { to: "/admin/financials", icon: TrendingUp, label: "Finances" },
  { to: "/admin/users", icon: Users, label: "Utilisateurs" },
  { to: "/admin/subscriptions", icon: CreditCard, label: "Abonnements" },
  { to: "/admin/resellers", icon: Store, label: "Revendeurs" },
  { to: "/admin/geography", icon: Globe, label: "Géographie" },
];

const allFeatures = [
  { to: "/admin/features", icon: ToggleLeft, label: "Features" },
  { to: "/admin/roadmap", icon: Map, label: "Roadmap" },
  { to: "/admin/feature-analytics", icon: BarChart2, label: "Analytics" },
  { to: "/admin/commissions", icon: Gift, label: "Commissions" },
  { to: "/admin/promo-codes", icon: Percent, label: "Codes Promo" },
];

const allSupport = [
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/support", icon: MessageSquare, label: "Support" },
  { to: "/admin/logs", icon: FileText, label: "Logs" },
  { to: "/admin/setup", icon: Database, label: "Config. Initiale" },
];

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-[#718096]/60 px-3 mb-2">
      {children}
    </p>
  );
}

export function AdminFloatingSidebar() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { layout, updateSidebarSection, resetLayout } = useAdminLayout();
  const [isDragMode, setIsDragMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Déconnexion réussie");
      navigate("/auth");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const handleDragEnd = (
    section: "sidebarModules" | "sidebarFeatures" | "sidebarSupport",
    event: DragEndEvent
  ) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = layout[section].indexOf(active.id as string);
      const newIndex = layout[section].indexOf(over.id as string);
      updateSidebarSection(section, arrayMove(layout[section], oldIndex, newIndex));
      toast.success("Position sauvegardée");
    }
  };

  // Sort items based on saved layout
  const getSortedItems = (
    items: typeof allModules,
    order: string[]
  ) => {
    return [...items].sort((a, b) => {
      const aIndex = order.indexOf(a.to);
      const bIndex = order.indexOf(b.to);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
  };

  const sortedModules = getSortedItems(allModules, layout.sidebarModules);
  const sortedFeatures = getSortedItems(allFeatures, layout.sidebarFeatures);
  const sortedSupport = getSortedItems(allSupport, layout.sidebarSupport);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:top-4 lg:left-4 lg:bottom-4 bg-white/80 backdrop-blur-xl border border-[#e2e8f0]/50 rounded-3xl shadow-2xl shadow-[#4f7df3]/5 overflow-hidden">
      {/* Header - Branding + Admin Info */}
      <div className="p-6 border-b border-[#e2e8f0]/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-lg shadow-[#4f7df3]/30">
              <img src={KorLogo} alt="KÒR" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-[#2d3748] tracking-tight">KÒR</h1>
              <p className="text-[11px] text-[#718096] font-medium">Control Center</p>
            </div>
          </div>
          
          {/* Edit Mode Toggle */}
          <button
            onClick={() => setIsDragMode(!isDragMode)}
            className={cn(
              "p-2 rounded-xl transition-all",
              isDragMode 
                ? "bg-[#4f7df3] text-white shadow-lg shadow-[#4f7df3]/25" 
                : "text-[#718096] hover:bg-[#f8f9ff]"
            )}
            title={isDragMode ? "Terminer l'édition" : "Réorganiser"}
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Admin Info */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#f8f9ff]">
          <div className="w-7 h-7 rounded-full bg-[#4f7df3]/10 flex items-center justify-center">
            <User className="w-4 h-4 text-[#4f7df3]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#2d3748] truncate">
              {profile?.owner_name || "Administrateur"}
            </p>
            <p className="text-[10px] text-[#718096]">Admin</p>
          </div>
        </div>
        
        {/* Drag Mode Indicator */}
        {isDragMode && (
          <div className="mt-3 flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200">
            <span className="text-xs text-amber-700 font-medium">
              Mode édition actif
            </span>
            <button
              onClick={resetLayout}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-800 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Modules Section */}
        <div>
          <SectionTitle>Modules</SectionTitle>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd("sidebarModules", e)}
          >
            <SortableContext
              items={sortedModules.map((m) => m.to)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {sortedModules.map((item) => (
                  <DraggableNavItem 
                    key={item.to} 
                    id={item.to}
                    {...item} 
                    isDragMode={isDragMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Features Section */}
        <div>
          <SectionTitle>Fonctionnalités</SectionTitle>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd("sidebarFeatures", e)}
          >
            <SortableContext
              items={sortedFeatures.map((m) => m.to)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {sortedFeatures.map((item) => (
                  <DraggableNavItem 
                    key={item.to} 
                    id={item.to}
                    {...item} 
                    isDragMode={isDragMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {/* Support Section */}
        <div>
          <SectionTitle>Support</SectionTitle>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={(e) => handleDragEnd("sidebarSupport", e)}
          >
            <SortableContext
              items={sortedSupport.map((m) => m.to)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {sortedSupport.map((item) => (
                  <DraggableNavItem 
                    key={item.to} 
                    id={item.to}
                    {...item} 
                    isDragMode={isDragMode}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </nav>

      {/* Quick Actions */}
      <div className="p-4 border-t border-border/50">
        <div className="mb-3">
          <SectionTitle>Actions Rapides</SectionTitle>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl bg-gradient-to-r from-[#4f7df3] via-[#5b8af5] to-[#3b6ce8] text-white shadow-lg shadow-[#4f7df3]/25 hover:opacity-90 transition-opacity">
            <Zap className="w-4 h-4" />
            <span className="text-[10px] font-medium">Broadcast</span>
          </button>
          <button className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 border-[#4f7df3] bg-transparent text-[#4f7df3] hover:bg-[#4f7df3] hover:text-white transition-all">
            <QrCode className="w-4 h-4" />
            <span className="text-[10px] font-medium">Générer</span>
          </button>
          <button 
            onClick={() => {
              // Increment global cache version
              const newVersion = Date.now().toString();
              localStorage.setItem("kor_cache_version", newVersion);
              // Clear all local caches
              const keysToRemove = Object.keys(localStorage).filter(key => 
                key.startsWith("kor_") && key !== "kor_cache_version"
              );
              keysToRemove.forEach(key => localStorage.removeItem(key));
              // Clear react-query cache
              window.location.reload();
              toast.success("Cache vidé ! Tous les utilisateurs verront les MAJ.");
            }}
            className="flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-white transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span className="text-[10px] font-medium">Vider cache</span>
          </button>
        </div>
        
        <div className="space-y-1">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l'app</span>
          </NavLink>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-destructive hover:text-destructive/80 hover:bg-destructive/10 transition-all w-full"
          >
            <LogOut className="w-4 h-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
