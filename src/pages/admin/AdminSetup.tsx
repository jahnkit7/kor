import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Database, Globe, CreditCard, ToggleLeft, Map, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

interface DataStatus {
  countries: number;
  plans: number;
  features: number;
  roadmap: number;
}

const SEED_COUNTRIES = [
  { name: 'Bénin', code: 'BJ', phone_prefix: '+229', currency: 'XOF', is_active: false },
  { name: 'Togo', code: 'TG', phone_prefix: '+228', currency: 'XOF', is_active: true },
  { name: 'Côte d\'Ivoire', code: 'CI', phone_prefix: '+225', currency: 'XOF', is_active: false },
  { name: 'Sénégal', code: 'SN', phone_prefix: '+221', currency: 'XOF', is_active: false },
  { name: 'Mali', code: 'ML', phone_prefix: '+223', currency: 'XOF', is_active: false },
  { name: 'Niger', code: 'NE', phone_prefix: '+227', currency: 'XOF', is_active: false },
  { name: 'Burkina Faso', code: 'BF', phone_prefix: '+226', currency: 'XOF', is_active: false },
  { name: 'Cameroun', code: 'CM', phone_prefix: '+237', currency: 'XAF', is_active: false },
];

const SEED_PLANS = [
  { name: 'Gratuit', price: 0, duration_days: 7, currency: 'XOF', features: ['sales', 'stock', 'clients', 'debts', 'offline_mode', 'referrals', 'commission_payment'], is_active: true, sort_order: 0, description: 'Essai gratuit de 7 jours' },
  { name: 'Starter', price: 1500, duration_days: 30, currency: 'XOF', features: ['sales', 'stock', 'clients', 'debts', 'offline_mode', 'referrals', 'commission_payment', 'reports', 'voice_input', 'alerts'], is_active: true, sort_order: 1, description: 'Pour les petites boutiques' },
  { name: 'Premium', price: 5000, duration_days: 30, currency: 'XOF', features: ['sales', 'stock', 'clients', 'debts', 'offline_mode', 'referrals', 'commission_payment', 'reports', 'voice_input', 'alerts', 'ai_analysis', 'network', 'employees', 'invoices', 'multi_currency'], is_active: true, sort_order: 2, description: 'Fonctionnalités avancées' },
  { name: 'Annuel Premium', price: 50000, duration_days: 365, currency: 'XOF', features: ['sales', 'stock', 'clients', 'debts', 'offline_mode', 'referrals', 'commission_payment', 'reports', 'voice_input', 'alerts', 'ai_analysis', 'network', 'employees', 'invoices', 'multi_currency'], is_active: true, sort_order: 3, description: 'Premium avec 2 mois offerts' },
];

const SEED_FEATURES = [
  // Basiques (Gratuit)
  { feature_key: 'sales', name: 'Ventes', description: 'Enregistrement et suivi des ventes', is_globally_enabled: true, min_plan_required: null, depends_on: [] },
  { feature_key: 'stock', name: 'Stock', description: 'Gestion du stock et inventaire', is_globally_enabled: true, min_plan_required: null, depends_on: [] },
  { feature_key: 'clients', name: 'Clients', description: 'Gestion de la base clients', is_globally_enabled: true, min_plan_required: null, depends_on: [] },
  { feature_key: 'debts', name: 'Créances', description: 'Suivi des dettes clients', is_globally_enabled: true, min_plan_required: null, depends_on: ['clients'] },
  { feature_key: 'offline_mode', name: 'Mode Hors Ligne', description: 'Synchronisation des données en mode offline', is_globally_enabled: true, min_plan_required: null, depends_on: [] },
  { feature_key: 'referrals', name: 'Parrainage', description: 'Système de parrainage et commissions affiliés', is_globally_enabled: true, min_plan_required: null, depends_on: [] },
  { feature_key: 'commission_payment', name: 'Paiement Commissions', description: 'Gestion des paiements de commissions', is_globally_enabled: true, min_plan_required: null, depends_on: ['referrals'] },
  // Starter
  { feature_key: 'reports', name: 'Rapports', description: 'Rapports et statistiques avancés', is_globally_enabled: true, min_plan_required: 'starter', depends_on: ['sales'] },
  { feature_key: 'voice_input', name: 'Entrée vocale', description: 'Saisie vocale des ventes et stock', is_globally_enabled: true, min_plan_required: 'starter', depends_on: [] },
  { feature_key: 'alerts', name: 'Alertes', description: 'Rappels automatiques pour dettes et expiration', is_globally_enabled: true, min_plan_required: 'starter', depends_on: [] },
  // Premium
  { feature_key: 'ai_analysis', name: 'Analyse IA', description: 'Analyse intelligente des données', is_globally_enabled: true, min_plan_required: 'premium', depends_on: ['voice_input'] },
  { feature_key: 'network', name: 'Réseau Marchands', description: 'Réseau B2B entre marchands', is_globally_enabled: true, min_plan_required: 'premium', depends_on: ['clients'] },
  { feature_key: 'employees', name: 'Gestion Employés', description: 'Gestion des employés et permissions', is_globally_enabled: true, min_plan_required: 'premium', depends_on: [] },
  { feature_key: 'invoices', name: 'Factures', description: 'Génération de factures PDF professionnelles', is_globally_enabled: true, min_plan_required: 'premium', depends_on: ['sales'] },
  { feature_key: 'multi_currency', name: 'Multi-devises', description: 'Support de plusieurs devises et taux de change', is_globally_enabled: true, min_plan_required: 'premium', depends_on: [] },
];

const SEED_ROADMAP = [
  { title: 'Generateur de facture', description: 'N\'est pas encore implémenté', category: 'feature', status: 'in_progress', priority: 'high' },
  { title: 'Amelioration, UI settings user', description: 'Ranger mieux, garder abonnement visible en haut, les trucs comme parrainage peut etre a la suite de abonnement. Et les choses like supprime ton compte tout en bas', category: 'improvement', status: 'backlog', priority: 'high' },
  { title: 'Modifier legerement Style classic user', description: 'faire avec les meme finition soft comme dashboard admin', category: 'improvement', status: 'backlog', priority: 'high' },
  { title: 'Revoir Onboading user', description: 'Les infos que l\'utilisateur inscrit ne sont pas afficher sur sa page cote admin. Et ensuite je ne me rappele plus le reste de ce que fesait onboarding.', category: 'bug', status: 'in_progress', priority: 'urgent' },
  { title: 'Mode hors ligne', description: 'Actuellement, lorsqu\'on fait une operation, ca refuse. Alors que normalement, ca devrait etre storer localement, et quand il y a du reseau, pousser les donner dans la bdd. Donc il ne faut pas oublier de faire des sync. Pour l\'instant se focaliser sur les ventes et les dettes.', category: 'improvement', status: 'testing', priority: 'urgent' },
  { title: 'Gestion stock', description: 'Qu\'est-ce qui se passe, lorsqu\'un utilisateur ne veut pas la gestion de stock ? Le menu lui est visible, mais que doit-on afficher ? Lorsque cette feature lui ait desactive alors qu\'il a des donnes dans la table, le desactiver lui efface aussi les donnes ?', category: 'improvement', status: 'testing', priority: 'high' },
  { title: 'Transcription offline', description: 'Comment ca fonctionne la transcription ? Lorsque l\'appli est offline, on ne peut pas appeler l\'edge function. Faut-il prevoir une alternative ? Genre l\'API du browser de transcription ? Je crois que c\'est gratuit ca..', category: 'performance', status: 'in_progress', priority: 'urgent' },
];

export default function AdminSetup() {
  const { user } = useAuth();
  const [status, setStatus] = useState<DataStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState<string | null>(null);

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
      description: "8 pays d'Afrique de l'Ouest/Centrale",
      count: status?.countries || 0,
      expected: 8,
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
      description: "15 fonctionnalités avec dépendances",
      count: status?.features || 0,
      expected: 15,
      onSeed: seedFeatures,
    },
    {
      key: "roadmap",
      icon: Map,
      title: "Roadmap",
      description: "7 items réels du projet",
      count: status?.roadmap || 0,
      expected: 7,
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
            </ol>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
