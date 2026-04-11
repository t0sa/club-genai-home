---
date: 2026-04-11
topic: floating-menu-card
---

# Floating Menu Card (Airbnb-style)

## Problem Frame

Le nav actuel ouvre un side drawer pleine-hauteur avec backdrop pour seulement 3 liens — une mécanique disproportionnée. Sur mobile, le scroll de page suffit et aucun menu n'est nécessaire. Sur desktop, une floating card discrète ancrée sous le bouton offre une expérience plus légère, cohérente avec la direction artistique du site.

## Comportement par breakpoint

| Breakpoint | Hamburger visible | Menu |
|---|---|---|
| Mobile (`< md`, < 768px) | Non | Absent — pas de menu |
| Desktop (`≥ md`, ≥ 768px) | Oui | Floating card, déclenchée au clic |

## Requirements

**Suppression du side drawer**
- R1. Le side drawer (`#nav-drawer`), le backdrop (`#nav-backdrop`) et toute leur logique JS sont supprimés.
- R2. Le bouton hamburger est masqué sur mobile (`hidden md:flex`). Sur mobile, aucune interaction de menu n'est exposée.

**Floating card — structure et positionnement**
- R3. La card est positionnée en absolu, ancrée au coin inférieur droit du bouton déclencheur, alignée sur son bord droit. Le bouton est enveloppé dans un conteneur `relative` pour servir d'ancêtre de positionnement.
- R4. La card apparaît sous la barre de navigation, sans recouvrir le logo ni le toggle de thème.
- R5. La largeur de la card est fixe (`w-48`, 192 px) et ne s'adapte pas au contenu.
- R6. La card reçoit un z-index supérieur à celui de la barre de navigation (`z-50`) — par exemple `z-60` — pour apparaître au-dessus du contenu de page sans être masquée par la nav.

**Floating card — contenu**
- R7. La card contient les 3 entrées existantes dans le même ordre : Projets, Veille, Meetup.
- R8. Chaque entrée conserve son icône actuelle à gauche du label (SVG inline pour Projets et Veille ; `<img>` pour Meetup).
- R9. Un séparateur fin (couleur `sand` / `dark-border`) est placé entre chaque entrée.
- R10. Le lien Meetup s'ouvre dans un nouvel onglet (`target="_blank" rel="noopener noreferrer"`) comme actuellement.

**Floating card — direction artistique**
- R11. Light mode : fond `cream`, bordure `sand`, texte `charcoal`, fond de ligne au hover `sand/60`.
- R12. Dark mode : fond `dark-card`, bordure `dark-border`, texte `dark-text`, fond de ligne au hover `dark-card` (légèrement plus sombre).
- R13. Coins arrondis (`rounded-xl`), ombre portée (`shadow-lg`).
- R14. La couleur du texte du label passe en `terracotta` au hover, cohérent avec le reste du site.

**Floating card — animation et interactions**
- R15. La card s'affiche avec une transition légère : elle démarre à `translateY(-4px)` et `opacity-0`, et s'anime vers `translateY(0)` et `opacity-100` (~150 ms, ease-out).
- R16. La card se ferme au clic à l'extérieur ou à l'appui sur `Escape`.
- R17. La card se ferme au clic sur n'importe quel lien de la card (liens ancres `#projets`, `#veille` et lien Meetup externe).
- R18. Lorsque la card se ferme (Escape, clic extérieur, ou clic sur un lien), le focus revient au bouton déclencheur.
- R19. Le bouton expose `aria-expanded` et `aria-controls` pointant vers l'id de la nouvelle card (remplace la référence à l'ancien `#nav-drawer`).

## Success Criteria

- Sur desktop, cliquer le burger ouvre une card flottante discrète sans backdrop ni side effect sur le layout.
- Sur mobile, le nav est épuré : logo + toggle thème uniquement, aucun élément de menu visible.
- La card respecte visuellement la palette cream/charcoal/terracotta en light et dark mode.
- Fermeture propre au clic extérieur, à Escape, et au clic sur n'importe quel lien de la card.

## Scope Boundaries

- Aucune entrée de menu ajoutée ou supprimée — périmètre strictement identique aux 3 liens actuels.
- Pas de sous-menu ou niveau hiérarchique supplémentaire.
- Pas de changement au logo, au toggle de thème, ni au reste de la page.

## Key Decisions

- **Pas de menu sur mobile** : le scroll de page suffit selon le product owner — le nav reste intentionnellement minimal sur petit écran.
- **Clic plutôt que hover** : évite les faux positifs sur écrans tactiles et est cohérent avec le comportement actuel du drawer.
- **Side drawer supprimé** : la card flottante le remplace entièrement — pas de coexistence des deux patterns.

## Outstanding Questions

### Deferred to Planning
- [Affects R8, R14][Design] Le lien Meetup utilise un `<img>` pour son icône, incompatible avec la teinte `currentColor`. Décider si l'icône Meetup est exemptée de la teinte terracotta au hover, ou si le logo est inliné en SVG.
- [Affects R15–R19][Design] Quel pattern ARIA adopter : Disclosure Button (`aria-expanded` suffit, navigation Tab standard) ou Menu Button (`role="menu"` + `role="menuitem"`, navigation par flèches) ?
- [Affects R11, R14][Design] Comportement hover sur chaque ligne : fond `sand/60` et texte `terracotta` simultanément, ou uniquement l'un des deux ?

## Next Steps

→ `/ce:plan` pour l'implémentation dans `src/components/Nav.astro`
