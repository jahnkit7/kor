# 📱 Starter Layout Mobile PWA — Anti-barres-parasites

## Le problème
Sur iOS PWA (et parfois Android), des barres noires/blanches apparaissent :
- **En haut** : derrière la status bar (heure, réseau, batterie)
- **En bas** : sous la bottom nav, rectangle blanc/noir visible

## La solution (4 fichiers)

### 1. `index.html` — Meta tags critiques
```html
<meta name="viewport" content="..., viewport-fit=cover" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```
- `viewport-fit=cover` → le contenu s'étend SOUS le notch et le home indicator
- `black-translucent` → la status bar devient transparente (pas de barre opaque)

### 2. `AppLayout.tsx` — Container principal
- Utilise `min-h-[100dvh]` (Dynamic Viewport Height) au lieu de `100vh`
- Gère le scroll interne (pas le body)
- Ajoute 80px de padding-bottom pour la nav flottante

### 3. `BottomNav.tsx` — Navigation flottante
- Position `fixed bottom-4` (PAS bottom-0)
- Nav en pilule flottante avec `pointer-events-none` sur le container
- Pas besoin de safe-area car la nav est au-dessus du bord

### 4. `index.css` — Reset et utilitaires
- Supprime le `max-width` par défaut de Vite sur `#root`
- `body { overflow: hidden }` — le scroll est dans AppLayout
- Classes utilitaires `.pt-safe-top` et `.pb-safe-bottom`

## Checklist rapide

- [ ] `viewport-fit=cover` dans la meta viewport
- [ ] `apple-mobile-web-app-status-bar-style` = `black-translucent`
- [ ] `100dvh` au lieu de `100vh`
- [ ] Pas de `max-width` ou `padding` sur `#root`
- [ ] `body { overflow: hidden }` 
- [ ] BottomNav en `fixed bottom-4` (pas bottom-0)
- [ ] Headers avec `padding-top: env(safe-area-inset-top)`
- [ ] Bottom sheets avec `padding-bottom: env(safe-area-inset-bottom)`

## Utilisation des safe-areas dans les pages

```tsx
// Header d'une page
<header 
  className="sticky top-0 z-40 bg-background"
  style={{ paddingTop: 'env(safe-area-inset-top)' }}
>
  <div className="px-4 py-3">
    <h1>Ma Page</h1>
  </div>
</header>

// Bottom sheet / Drawer
<SheetContent side="bottom">
  <div style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
    Contenu du sheet
  </div>
</SheetContent>
```

## Erreurs communes

| Erreur | Résultat | Solution |
|--------|----------|----------|
| Pas de `viewport-fit=cover` | Barres blanches en haut/bas | Ajouter dans meta viewport |
| `status-bar-style: default` | Barre noire/blanche en haut | Changer pour `black-translucent` |
| `100vh` au lieu de `100dvh` | Contenu déborde sous barre URL | Utiliser `100dvh` |
| `#root { max-width: 1280px }` | Marges blanches sur desktop | Supprimer le max-width |
| Nav en `bottom-0` + padding | Rectangle visible sous la nav | Utiliser `bottom-4` flottant |
| Body qui scroll | Bounce iOS, double scroll | `body { overflow: hidden }` |
