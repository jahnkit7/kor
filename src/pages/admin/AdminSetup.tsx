import { useState, useEffect, useRef } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Database, Globe, CreditCard, ToggleLeft, Map, CheckCircle2, XCircle, Loader2, RefreshCw, Download, Upload, FileCode } from "lucide-react";

interface DataStatus {
  countries: number;
  plans: number;
  features: number;
  roadmap: number;
}

const SEED_COUNTRIES = [
  { name: 'Bénin', code: 'BJ', phone_prefix: '+229', currency: 'XOF', is_active: false },
  { name: 'Togo', code: 'TG', phone_prefix: '+228', currency: 'XOF', is_active: true },
  { name: 'Côte d\'Ivoire', code: 'CI', phone_prefix: '+225', currency: 'XOF', is_active: true },
  { name: 'Sénégal', code: 'SN', phone_prefix: '+221', currency: 'XOF', is_active: false },
  { name: 'Mali', code: 'ML', phone_prefix: '+223', currency: 'XOF', is_active: false },
  { name: 'Niger', code: 'NE', phone_prefix: '+227', currency: 'XOF', is_active: false },
  { name: 'Burkina Faso', code: 'BF', phone_prefix: '+226', currency: 'XOF', is_active: false },
  { name: 'Cameroun', code: 'CM', phone_prefix: '+237', currency: 'XAF', is_active: false },
  { name: 'Guinée', code: 'GN', phone_prefix: '+224', currency: 'GNF', is_active: false },
  { name: 'Gabon', code: 'GA', phone_prefix: '+241', currency: 'XAF', is_active: false },
];

const SEED_PLANS = [
  { 
    name: 'Gratuit', 
    price: 0, 
    duration_days: 7, 
    currency: 'XOF', 
    features: ['sales', 'stock', 'clients', 'debts', 'offline_mode'], 
    is_active: true, 
    sort_order: 0, 
    description: 'Essai gratuit de 7 jours',
    max_clients: 10,
    max_sales_per_day: 10
  },
  { 
    name: 'Starter', 
    price: 1500, 
    duration_days: 30, 
    currency: 'XOF', 
    features: ['sales', 'stock', 'clients', 'debts', 'offline_mode', 'reports', 'voice_input', 'alerts', 'referrals', 'commission_payment'], 
    is_active: true, 
    sort_order: 1, 
    description: 'Pour les petites boutiques',
    max_clients: null,
    max_sales_per_day: null
  },
  { 
    name: 'Premium', 
    price: 5000, 
    duration_days: 30, 
    currency: 'XOF', 
    features: ['sales', 'stock', 'clients', 'debts', 'offline_mode', 'reports', 'voice_input', 'alerts', 'ai_analysis', 'network', 'employees', 'invoices', 'multi_currency', 'referrals', 'commission_payment'], 
    is_active: true, 
    sort_order: 2, 
    description: 'Fonctionnalités avancées',
    max_clients: null,
    max_sales_per_day: null
  },
  { 
    name: 'Annuel Premium', 
    price: 50000, 
    duration_days: 365, 
    currency: 'XOF', 
    features: ['sales', 'stock', 'clients', 'debts', 'offline_mode', 'reports', 'voice_input', 'alerts', 'ai_analysis', 'network', 'employees', 'invoices', 'multi_currency', 'referrals', 'commission_payment'], 
    is_active: true, 
    sort_order: 3, 
    description: 'Premium avec 2 mois offerts',
    max_clients: null,
    max_sales_per_day: null
  },
];

const SEED_FEATURES = [
  // Primaires (Obligatoires) - Toujours inclus
  { feature_key: 'sales', name: 'Ventes', description: 'Enregistrement et suivi des ventes', is_globally_enabled: true, min_plan_required: null, depends_on: [], category: 'primary', sort_order: 0, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'stock', name: 'Stock', description: 'Gestion du stock et inventaire', is_globally_enabled: true, min_plan_required: null, depends_on: [], category: 'primary', sort_order: 1, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'clients', name: 'Clients', description: 'Gestion de la base clients', is_globally_enabled: true, min_plan_required: null, depends_on: [], category: 'primary', sort_order: 2, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'debts', name: 'Créances', description: 'Suivi des dettes clients', is_globally_enabled: true, min_plan_required: null, depends_on: ['clients'], category: 'primary', sort_order: 3, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'offline_mode', name: 'Mode Hors Ligne', description: 'Synchronisation des données en mode offline', is_globally_enabled: true, min_plan_required: null, depends_on: [], category: 'primary', sort_order: 4, is_beta: false, current_version: '1.0.0' },
  
  // Secondaires (Valeur ajoutée)
  { feature_key: 'reports', name: 'Rapports', description: 'Rapports et statistiques avancés', is_globally_enabled: true, min_plan_required: 'starter', depends_on: ['sales'], category: 'secondary', sort_order: 0, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'voice_input', name: 'Entrée vocale', description: 'Saisie vocale des ventes et stock', is_globally_enabled: true, min_plan_required: 'starter', depends_on: [], category: 'secondary', sort_order: 1, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'alerts', name: 'Alertes', description: 'Rappels automatiques pour dettes et expiration', is_globally_enabled: true, min_plan_required: 'starter', depends_on: [], category: 'secondary', sort_order: 2, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'ai_analysis', name: 'Analyse IA', description: 'Analyse intelligente des données', is_globally_enabled: true, min_plan_required: 'premium', depends_on: ['voice_input'], category: 'secondary', sort_order: 3, is_beta: true, current_version: '1.0.0' },
  { feature_key: 'network', name: 'Réseau Marchands', description: 'Réseau B2B entre marchands', is_globally_enabled: false, min_plan_required: 'premium', depends_on: ['clients'], category: 'secondary', sort_order: 4, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'employees', name: 'Gestion Employés', description: 'Gestion des employés et permissions', is_globally_enabled: true, min_plan_required: 'premium', depends_on: [], category: 'secondary', sort_order: 5, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'referrals', name: 'Parrainage', description: 'Système de parrainage et commissions affiliés', is_globally_enabled: true, min_plan_required: null, depends_on: [], category: 'secondary', sort_order: 6, is_beta: true, current_version: '1.0.0' },
  { feature_key: 'invoices', name: 'Factures', description: 'Génération de factures PDF professionnelles', is_globally_enabled: true, min_plan_required: 'premium', depends_on: ['sales'], category: 'secondary', sort_order: 7, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'multi_currency', name: 'Multi-devises', description: 'Support de plusieurs devises et taux de change', is_globally_enabled: true, min_plan_required: 'premium', depends_on: [], category: 'secondary', sort_order: 8, is_beta: false, current_version: '1.0.0' },
  { feature_key: 'commission_payment', name: 'Paiement Commissions', description: 'Gestion des paiements de commissions', is_globally_enabled: true, min_plan_required: null, depends_on: ['referrals'], category: 'secondary', sort_order: 9, is_beta: false, current_version: '1.0.0' },
];

const SEED_ROADMAP = [
  // En cours
  { title: 'Finaliser générateur factures', description: 'Ajouter personnalisation logo/couleurs et historique des factures générées', category: 'feature', status: 'in_progress', priority: 'high' },
  { title: 'Amélioration UI Settings', description: 'Réorganiser les paramètres : abonnement en haut, les trucs comme parrainage à la suite, suppression compte en bas', category: 'improvement', status: 'backlog', priority: 'high' },
  { title: 'Style classique utilisateur', description: 'Appliquer les mêmes finitions douces que le dashboard admin', category: 'improvement', status: 'backlog', priority: 'medium' },
  { title: 'Onboarding utilisateur', description: 'Corriger affichage infos utilisateur côté admin et améliorer le flux', category: 'bug', status: 'in_progress', priority: 'urgent' },
  
  // Backlog
  { title: 'Notifications push PWA', description: 'Implémenter les notifications push pour les alertes stock et dettes', category: 'feature', status: 'backlog', priority: 'medium' },
  { title: 'Export données Excel/CSV', description: 'Permettre aux utilisateurs d\'exporter leurs données (ventes, stock, clients)', category: 'feature', status: 'backlog', priority: 'low' },
  { title: 'Tableau de bord avancé', description: 'Graphiques et analyses plus détaillés avec filtres temporels', category: 'feature', status: 'backlog', priority: 'medium' },
  { title: 'Intégration Mobile Money', description: 'Permettre le paiement abonnement via Mobile Money (Flooz, TMoney)', category: 'feature', status: 'backlog', priority: 'high' },
];

export default function AdminSetup() {
  const { user } = useAuth();
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingSQL, setExportingSQL] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [countries, plans, features, roadmap] = await Promise.all([
        supabase.from("countries").select("id", { count: "exact", head: true }),
        supabase.from("subscription_plans").select("id", { count: "exact", head: true }),
        supabase.from("feature_flags").select("id", { count: "exact", head: true }),
        supabase.from("roadmap_items").select("id", { count: "exact", head: true }),
      ]);

      setStatus({
        countries: countries.count || 0,
        plans: plans.count || 0,
        features: features.count || 0,
        roadmap: roadmap.count || 0,
      });
    } catch (error) {
      console.error("Error fetching status:", error);
      toast.error("Erreur lors de la vérification des données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const seedCountries = async () => {
    setSeeding("countries");
    try {
      const { error } = await supabase.from("countries").upsert(SEED_COUNTRIES, { onConflict: "code" });
      if (error) throw error;
      toast.success("Pays créés avec succès");
      fetchStatus();
    } catch (error) {
      console.error("Error seeding countries:", error);
      toast.error("Erreur lors de la création des pays");
    } finally {
      setSeeding(null);
    }
  };

  const seedPlans = async () => {
    setSeeding("plans");
    try {
      const { error } = await supabase.from("subscription_plans").upsert(SEED_PLANS, { onConflict: "name" });
      if (error) throw error;
      toast.success("Plans créés avec succès");
      fetchStatus();
    } catch (error) {
      console.error("Error seeding plans:", error);
      toast.error("Erreur lors de la création des plans");
    } finally {
      setSeeding(null);
    }
  };

  const seedFeatures = async () => {
    setSeeding("features");
    try {
      const { error } = await supabase.from("feature_flags").upsert(SEED_FEATURES, { onConflict: "feature_key" });
      if (error) throw error;
      toast.success("Features créées avec succès");
      fetchStatus();
    } catch (error) {
      console.error("Error seeding features:", error);
      toast.error("Erreur lors de la création des features");
    } finally {
      setSeeding(null);
    }
  };

  const seedRoadmap = async () => {
    if (!user?.id) {
      toast.error("Vous devez être connecté");
      return;
    }
    setSeeding("roadmap");
    try {
      const roadmapWithCreator = SEED_ROADMAP.map(item => ({
        ...item,
        created_by: user.id,
      }));
      const { error } = await supabase.from("roadmap_items").upsert(roadmapWithCreator, { onConflict: "title" });
      if (error) throw error;
      toast.success("Roadmap créée avec succès");
      fetchStatus();
    } catch (error) {
      console.error("Error seeding roadmap:", error);
      toast.error("Erreur lors de la création de la roadmap");
    } finally {
      setSeeding(null);
    }
  };

  const seedAll = async () => {
    await seedCountries();
    await seedPlans();
    await seedFeatures();
    await seedRoadmap();
    toast.success("Toutes les données ont été initialisées !");
  };

  // Export configuration as JSON
  const exportConfiguration = async () => {
    setExporting(true);
    try {
      const [features, plans, countries, roadmap] = await Promise.all([
        supabase.from("feature_flags").select("*"),
        supabase.from("subscription_plans").select("*"),
        supabase.from("countries").select("*"),
        supabase.from("roadmap_items").select("*"),
      ]);

      if (features.error) throw features.error;
      if (plans.error) throw plans.error;
      if (countries.error) throw countries.error;
      if (roadmap.error) throw roadmap.error;

      const config = {
        version: "1.0",
        exportDate: new Date().toISOString(),
        features: features.data,
        plans: plans.data,
        countries: countries.data,
        roadmap: roadmap.data,
      };

      const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `admin-config-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Configuration exportée avec succès");
    } catch (error) {
      console.error("Error exporting configuration:", error);
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  // Export configuration as SQL
  const exportSQL = async () => {
    setExportingSQL(true);
    try {
      const [features, plans, countries] = await Promise.all([
        supabase.from("feature_flags").select("*"),
        supabase.from("subscription_plans").select("*"),
        supabase.from("countries").select("*"),
      ]);

      if (features.error) throw features.error;
      if (plans.error) throw plans.error;
      if (countries.error) throw countries.error;

      let sql = `-- CaissePlus Database Seed\n-- Generated: ${new Date().toISOString()}\n-- Version: 1.0\n\n`;
      
      // Countries
      sql += `-- ===============================\n-- COUNTRIES (${countries.data?.length || 0} rows)\n-- ===============================\n`;
      countries.data?.forEach(c => {
        sql += `INSERT INTO countries (code, name, phone_prefix, currency, is_active) VALUES ('${c.code}', '${c.name.replace(/'/g, "''")}', '${c.phone_prefix}', '${c.currency}', ${c.is_active}) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, phone_prefix = EXCLUDED.phone_prefix, currency = EXCLUDED.currency, is_active = EXCLUDED.is_active;\n`;
      });
      
      // Plans
      sql += `\n-- ===============================\n-- SUBSCRIPTION PLANS (${plans.data?.length || 0} rows)\n-- ===============================\n`;
      plans.data?.forEach(p => {
        const featuresJson = JSON.stringify(p.features).replace(/'/g, "''");
        sql += `INSERT INTO subscription_plans (name, description, price, duration_days, currency, features, is_active, sort_order, max_clients, max_sales_per_day) VALUES ('${p.name}', '${(p.description || '').replace(/'/g, "''")}', ${p.price}, ${p.duration_days}, '${p.currency}', '${featuresJson}'::jsonb, ${p.is_active}, ${p.sort_order}, ${p.max_clients || 'NULL'}, ${p.max_sales_per_day || 'NULL'}) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, price = EXCLUDED.price, duration_days = EXCLUDED.duration_days, features = EXCLUDED.features, is_active = EXCLUDED.is_active, sort_order = EXCLUDED.sort_order, max_clients = EXCLUDED.max_clients, max_sales_per_day = EXCLUDED.max_sales_per_day;\n`;
      });
      
      // Features
      sql += `\n-- ===============================\n-- FEATURE FLAGS (${features.data?.length || 0} rows)\n-- ===============================\n`;
      features.data?.forEach(f => {
        const dependsOnArray = f.depends_on && f.depends_on.length > 0 
          ? `ARRAY[${f.depends_on.map((d: string) => `'${d}'`).join(',')}]::text[]` 
          : 'ARRAY[]::text[]';
        sql += `INSERT INTO feature_flags (feature_key, name, description, is_globally_enabled, min_plan_required, depends_on, category, sort_order, is_beta, current_version) VALUES ('${f.feature_key}', '${f.name}', '${(f.description || '').replace(/'/g, "''")}', ${f.is_globally_enabled}, ${f.min_plan_required ? `'${f.min_plan_required}'` : 'NULL'}, ${dependsOnArray}, '${f.category}', ${f.sort_order}, ${f.is_beta || false}, '${f.current_version || '1.0.0'}') ON CONFLICT (feature_key) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, is_globally_enabled = EXCLUDED.is_globally_enabled, min_plan_required = EXCLUDED.min_plan_required, depends_on = EXCLUDED.depends_on, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order, is_beta = EXCLUDED.is_beta, current_version = EXCLUDED.current_version;\n`;
      });

      const blob = new Blob([sql], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `caisse-plus-seed-${new Date().toISOString().split("T")[0]}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Fichier SQL exporté avec succès");
    } catch (error) {
      console.error("Error exporting SQL:", error);
      toast.error("Erreur lors de l'export SQL");
    } finally {
      setExportingSQL(false);
    }
  };

  // Import configuration from JSON
  const importConfiguration = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const content = await file.text();
      const config = JSON.parse(content);

      // Validate structure
      if (!config.version || !config.exportDate) {
        throw new Error("Format de fichier invalide");
      }

      let importedCount = 0;

      // Import countries
      if (config.countries && Array.isArray(config.countries) && config.countries.length > 0) {
        const countriesData = config.countries.map((c: any) => ({
          name: c.name,
          code: c.code,
          phone_prefix: c.phone_prefix,
          currency: c.currency,
          is_active: c.is_active,
        }));
        const { error } = await supabase.from("countries").upsert(countriesData, { onConflict: "code" });
        if (error) throw error;
        importedCount += countriesData.length;
      }

      // Import plans
      if (config.plans && Array.isArray(config.plans) && config.plans.length > 0) {
        const plansData = config.plans.map((p: any) => ({
          name: p.name,
          price: p.price,
          duration_days: p.duration_days,
          currency: p.currency,
          features: p.features,
          is_active: p.is_active,
          sort_order: p.sort_order,
          description: p.description,
          max_clients: p.max_clients,
          max_sales_per_day: p.max_sales_per_day,
          commission_reduction: p.commission_reduction,
        }));
        const { error } = await supabase.from("subscription_plans").upsert(plansData, { onConflict: "name" });
        if (error) throw error;
        importedCount += plansData.length;
      }

      // Import features
      if (config.features && Array.isArray(config.features) && config.features.length > 0) {
        const featuresData = config.features.map((f: any) => ({
          feature_key: f.feature_key,
          name: f.name,
          description: f.description,
          is_globally_enabled: f.is_globally_enabled,
          min_plan_required: f.min_plan_required,
          depends_on: f.depends_on,
          category: f.category,
          sort_order: f.sort_order,
          enabled_for_users: f.enabled_for_users,
          disabled_countries: f.disabled_countries,
          is_beta: f.is_beta,
          current_version: f.current_version,
        }));
        const { error } = await supabase.from("feature_flags").upsert(featuresData, { onConflict: "feature_key" });
        if (error) throw error;
        importedCount += featuresData.length;
      }

      // Import roadmap
      if (config.roadmap && Array.isArray(config.roadmap) && config.roadmap.length > 0 && user?.id) {
        const roadmapData = config.roadmap.map((r: any) => ({
          title: r.title,
          description: r.description,
          category: r.category,
          status: r.status,
          priority: r.priority,
          target_version: r.target_version,
          estimated_effort: r.estimated_effort,
          created_by: user.id,
        }));
        const { error } = await supabase.from("roadmap_items").upsert(roadmapData, { onConflict: "title" });
        if (error) throw error;
        importedCount += roadmapData.length;
      }

      toast.success(`${importedCount} éléments importés avec succès`);
      fetchStatus();
    } catch (error) {
      console.error("Error importing configuration:", error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de l'import");
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const StatusBadge = ({ count, expected }: { count: number; expected: number }) => {
    const hasData = count >= expected;
    return (
      <Badge variant={hasData ? "default" : "destructive"} className="gap-1">
        {hasData ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {count}/{expected}
      </Badge>
    );
  };

  const seedItems = [
    {
      key: "countries",
      icon: Globe,
      title: "Pays",
      description: "10 pays d'Afrique de l'Ouest/Centrale",
      count: status?.countries || 0,
      expected: 10,
      onSeed: seedCountries,
    },
    {
      key: "plans",
      icon: CreditCard,
      title: "Plans d'abonnement",
      description: "4 plans (Gratuit, Starter, Premium, Annuel)",
      count: status?.plans || 0,
      expected: 4,
      onSeed: seedPlans,
    },
    {
      key: "features",
      icon: ToggleLeft,
      title: "Feature Flags",
      description: "15 fonctionnalités avec dépendances et catégories",
      count: status?.features || 0,
      expected: 15,
      onSeed: seedFeatures,
    },
    {
      key: "roadmap",
      icon: Map,
      title: "Roadmap",
      description: "8 items actuels du projet",
      count: status?.roadmap || 0,
      expected: 8,
      onSeed: seedRoadmap,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configuration Initiale</h1>
            <p className="text-muted-foreground">
              Initialisez les données de base pour un nouveau remix
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStatus} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </Button>
            <Button onClick={seedAll} disabled={seeding !== null || loading}>
              {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
              Initialiser tout
            </Button>
          </div>
        </div>

        {/* Export/Import Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Sauvegarde & Restauration
            </CardTitle>
            <CardDescription>
              Exportez ou importez la configuration complète (features, plans, pays, roadmap)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button 
                variant="outline" 
                onClick={exportConfiguration} 
                disabled={exporting || loading}
                className="flex-1 min-w-[140px]"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export JSON
              </Button>
              <Button 
                variant="outline" 
                onClick={exportSQL} 
                disabled={exportingSQL || loading}
                className="flex-1 min-w-[140px]"
              >
                {exportingSQL ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileCode className="w-4 h-4 mr-2" />
                )}
                Export SQL
              </Button>
              <div className="flex-1 min-w-[140px]">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={importConfiguration}
                  className="hidden"
                  id="import-config"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing || loading}
                  className="w-full"
                >
                  {importing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  Import JSON
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          {seedItems.map((item) => (
            <Card key={item.key}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </div>
                  {!loading && <StatusBadge count={item.count} expected={item.expected} />}
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={item.onSeed}
                  disabled={seeding !== null || loading}
                >
                  {seeding === item.key ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Création en cours...
                    </>
                  ) : item.count >= item.expected ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Réinitialiser
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4 mr-2" />
                      Créer les données
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Instructions pour les remixes</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert">
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Connectez-vous avec un compte admin</li>
              <li>Accédez à cette page <code>/admin/setup</code></li>
              <li>Cliquez sur "Initialiser tout" ou créez chaque section individuellement</li>
              <li>Les données existantes ne seront pas dupliquées (upsert par clé unique)</li>
              <li>Les items de roadmap seront associés à votre compte admin</li>
              <li><strong>Export JSON :</strong> Sauvegarde complète de la config (features, plans, pays, roadmap)</li>
              <li><strong>Export SQL :</strong> Fichier .sql avec INSERT/UPSERT pour migration manuelle</li>
              <li><strong>Import JSON :</strong> Restaurer une configuration sauvegardée</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
