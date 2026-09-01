# 📋 Bilan Complet du Projet KÒR

> Document de synthèse pour toute personne reprenant le projet sans contexte.
> Date de rédaction : 1er septembre 2026

---

## 1. Qu'est-ce que KÒR ?

**KÒR** (korflow.space) est une application de **gestion de boutique / commerce** (PWA mobile-first) destinée aux commerçants africains. Elle permet de gérer :

- Les **ventes** (cash / crédit), y compris par **dictée vocale**
- Le **stock** et les **menus** (produits restaurant, services)
- Les **clients** et les **dettes** (crédit)
- La **caisse** (ouverture/fermeture avec fond de caisse)
- Les **factures**, **dépenses**, **dépôts/retraits**, **rapports**
- Les **employés** avec gestion des rôles (owner / employee / admin)
- Un **réseau de commerçants** (offres, négociations, messagerie inter-marchands)
- Un système d'**abonnements** (plans Gratuit, Starter, Premium, Annuel) avec revendeurs, codes prépayés et commissions

**Stack technique :**
- Frontend : React 18 + Vite 5 + TypeScript + Tailwind CSS v3 + shadcn/ui + framer-motion + Hugeicons
- Backend : Lovable Cloud (Supabase) — base de données Postgres, auth, storage, edge functions
- PWA : installable sur mobile, architecture full-screen native-like
- Offline-first : base locale (IndexedDB) + file de synchronisation vers le cloud

---

## 2. Architecture générale

```text
src/
├── App.tsx                  → Providers (QueryClient, Offline, Notifications, PlanGuard)
├── pages/                   → Dashboard, Sale, Stock, Clients, Debts, Reports, Settings,
│                              Auth, Landing, Store (Network), + ~20 pages admin/*
├── components/
│   ├── BottomNav.tsx        → Navigation flottante mobile (style signature du projet)
│   ├── layout/              → ProtectedLayout, AppLayout, AnimatedRoutes
│   ├── dashboard/           → ModernDashboard, SalesCard, BentoStatsGrid, CashDrawerDialog
│   ├── sale/                → VoiceSaleInput (analyse vocale), ProductSelector, MenuSelector
│   ├── admin/               → Sidebar admin, StatCard, composants de gestion
│   └── DynamicMetaTags.tsx  → Synchronisation des meta tags avec le branding en base
├── hooks/                   → ~60 hooks métier (use-sales, use-stock, use-role, use-admin…)
├── lib/db/                  → Base locale offline (IndexedDB) + types
├── lib/supabase-sync.ts     → Synchronisation offline → cloud
└── integrations/supabase/   → Client auto-généré (NE PAS ÉDITER)

supabase/functions/          → Edge functions :
    analyze-sale-voice/      → IA : transcription vocale → ventes structurées
    analyze-stock-voice/     → IA : transcription vocale → articles de stock
    analyze-request-voice/   → IA : dictée de demandes réseau
    sync-meta-tags/          → Génère le HTML des meta tags de branding
    delete-account/, migrate-emails/

STARTER_PWA_PACK/            → 4 fichiers de référence pour reproduire le layout mobile
```

### Rôles utilisateurs
- **owner** : propriétaire de boutique — accès complet (admin boutique, employés, rapports)
- **employee** : accès opérationnel (ventes, stock, clients, dettes, factures, caisse)
- **admin** : super-admin plateforme (`/admin/*`) — redirigé par défaut sur `/admin` au lieu de `/dashboard`

Les rôles sont dans la table `user_roles` (jamais sur le profil) et vérifiés via la fonction SQL `has_role()`. Le hook `useRole()` est la source unique de vérité (y compris pour `useAdmin()` — ne jamais appeler `useAuth()` une deuxième fois dans `useAdmin`, cela causait des redirections parasites).

---

## 3. Layout Mobile PWA — l'architecture "anti-barres parasites"

Point fort du projet : sur mobile/PWA installée, **aucune barre blanche/noire** n'apparaît en haut (status bar) ni en bas (home indicator). La recette complète est documentée dans `STARTER_PWA_PACK/` (4 fichiers + README + checklist) :

1. **`index.html`** : `viewport-fit=cover` + `apple-mobile-web-app-status-bar-style: black-translucent`
2. **`AppLayout.tsx`** : container `min-h-[100dvh]` (pas `100vh`), scroll interne, `paddingBottom: 80px` pour la nav flottante
3. **`BottomNav.tsx`** : navigation en pilule **flottante** (`fixed bottom-4`, jamais `bottom-0`)
4. **`index.css`** : suppression du `max-width`/`padding` par défaut de Vite sur `#root`, utilitaires safe-area

Règles associées :
- Headers : `paddingTop: max(env(safe-area-inset-top), 24px)`
- Bottom sheets/drawers : `paddingBottom: max(env(safe-area-inset-bottom), 16px)` + ~80px pour ne pas passer sous la BottomNav
- `body { overflow: hidden }` — le scroll vit dans AppLayout

---

## 4. Fonctionnalités clés implémentées

### 4.1 Ventes vocales avec auto-création de produits
Le flux : dictée vocale → edge function IA (`analyze-sale-voice`) → produits détectés avec type (`retail` / `restaurant` / `service`) et catégorie → écran de validation → confirmation.

Corrections et améliorations apportées :
- **Bug majeur corrigé** : seuls certains produits (ex. "jus") étaient auto-créés en stock. Cause : si l'IA trouvait un match approximatif (`stock_item_id` assigné), la création était ignorée. Désormais, tout produit détecté comme **restaurant/service** est créé automatiquement en stock avec `is_menu_item: true` et sa catégorie, avec **détection de doublons**.
- **Migration SQL** : les produits restaurant/service existants en base avec `is_menu_item = false` ont été corrigés.
- **Avertissement visuel** : les nouveaux produits (absents de la base) affichent un badge bleu invitant à vérifier orthographe et prix avant validation — comme pour les produits retail.
- **Catégorisation intelligente** : l'IA suggère la catégorie (Boissons, Plats, Desserts, Snacks, Autre) au lieu de tout mettre dans "Autre".
- **Édition manuelle** : le dialogue d'édition permet de changer type et catégorie ; la catégorie s'affiche dans les badges de l'écran de validation (🍽️ Menu / 🛠️ Service).
- **Logs de debug** (`[VoiceSaleInput]` avec emojis) + **toast de confirmation** ("X produits ajoutés au stock").

### 4.2 Ouverture de caisse (Cash Drawer)
- Pop-up d'ouverture en début de journée avec bouton **"Ouvrir sans fond"** visible.
- **Non-récurrent** : une fois ouverte (avec ou sans fond) ou ignorée, elle ne se réaffiche plus dans la journée (marqueur `kor_cash_drawer_dismissed` en localStorage, daté).

### 4.3 Page Auth — saisie du code PIN
- Cases **vides par défaut** (plus de point gris).
- **Animation** : quand un chiffre est saisi, la case s'anime avec un contour vert avant de passer automatiquement à la suivante.

### 4.4 Dashboard — Activité récente
- Chaque action affiche un **badge avec le nom de l'utilisateur** (owner_name / shop_name) qui l'a effectuée.
- Données en temps réel via Supabase Realtime.

### 4.5 Admin — redirection et accès
- Un utilisateur **admin** est **toujours redirigé par défaut vers `/admin`** au lieu de `/dashboard`.
- **Bug corrigé** : les redirections intempestives `/admin → /auth → /subscriptions` venaient de `useAdmin()` qui utilisait une seconde instance de `useAuth()` ; il prend maintenant `user` depuis `useRole()`.
- Des logs de debug (`[useRole]`, `[AdminProtectedLayout]`) restent disponibles en console pour diagnostiquer.

### 4.6 Cache & mises à jour
- **Bouton "Vider le cache"** dans les Actions rapides du sidebar admin : efface tous les caches locaux (`kor_*`) et recharge.
- **Version de cache côté serveur** (table `app_settings`) : quand l'admin vide le cache, la version est incrémentée en base. Au démarrage, **chaque appareil** compare sa version locale au serveur et invalide son cache si nécessaire → les mises à jour apparaissent immédiatement partout.

### 4.7 Branding & SEO (page `/admin/branding`)
- **Upload dynamique** des assets (icône, logo SVG, image OG) vers Supabase Storage, avec prévisualisation immédiate.
- **Prévisualisation du partage social** : rendu du lien tel qu'il apparaîtra sur Facebook, Twitter/X, WhatsApp.
- **Outil de validation SEO** : score, vérification des balises meta, dimensions de l'image OG (1200×630), longueur titre (<60) / description (<160).
- **Edge function `sync-meta-tags`** : génère le HTML des meta tags à chaque changement de branding ; côté client, `DynamicMetaTags` synchronise le `<head>` (titre, metas, favicon) depuis `app_settings`.
- ⚠️ **Limite connue** : les crawlers sociaux (WhatsApp, Facebook) ne lisent que le HTML statique initial et **mettent en cache** les previews. Les meta OG critiques doivent donc être dans `index.html` avec des URLs Storage directes, et il faut invalider le cache des plateformes (Facebook Debugger, Twitter Card Validator) après un changement.

### 4.8 BottomNav (style signature)
Navigation mobile flottante : pilule glassmorphism avec **bordure dégradée animée** (bleu → violet → orange, animation `gradient-border` 3s), tab actif qui **s'étend en spring** pour révéler son label, badge "Hors ligne" et badge de messages non lus, popovers de navigation Owner/Admin/Employee. Code complet fourni dans le projet (composant + keyframes CSS) et réutilisable tel quel dans d'autres projets Lovable.

### 4.9 Page ProfileSetup
- **Bug corrigé** : le bouton "Sauvegarder" tournait indéfiniment. Cause : `setIsLoading(false)` n'était jamais appelé en cas de succès et la redirection échouait en mode édition. Désormais le spinner se réinitialise et la redirection en mode édition va vers `/settings`.

---

## 5. Base de données & données système

Données importées depuis un backup :
- **Pays actifs** : Bénin, Togo, Côte d'Ivoire
- **Plans** : Gratuit, Starter, Premium, Annuel Premium
- **15 feature flags**, 8 items de roadmap
- **Commission** : 2% sur toutes les ventes
- **Revendeur** : Pascal
- Rôle **admin** attribué à l'utilisateur principal (`784576969`) + abonnement Premium actif

Sécurité : toutes les tables publiques ont RLS activé + GRANT explicites. Les avertissements du linter de sécurité sont pré-existants.

---

## 6. Points de vigilance pour la suite

1. **Ne jamais éditer** `src/integrations/supabase/client.ts`, `types.ts`, `.env` (auto-générés).
2. **Rôles** : toujours via `user_roles` + `has_role()`, jamais sur le profil, jamais en localStorage.
3. **PWA** : ne pas ajouter de service worker manuel ; suivre `STARTER_PWA_PACK/` pour le layout.
4. **Branding** : un changement d'image OG nécessite d'invalider le cache des réseaux sociaux pour être visible.
5. **Ventes vocales** : les logs `[VoiceSaleInput]` en console permettent de tracer toute anomalie de création de produits.
6. **Admin** : si une redirection `/admin` réapparaît, vérifier les logs `[useRole]` / `[AdminProtectedLayout]` — c'est presque toujours un problème de timing d'hydratation du rôle.

---

## 7. URLs du projet

- Preview : `https://id-preview--ed325c01-7f59-47be-a0e1-47095faa6ec6.lovable.app`
- Publié : `https://kor.lovable.app`
- Domaine custom : `https://korflow.space`
