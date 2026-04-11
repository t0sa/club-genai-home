---
title: "feat: Replace side drawer with floating dropdown card"
type: feat
status: active
date: 2026-04-11
origin: docs/brainstorms/2026-04-11-floating-menu-card-requirements.md
---

# feat: Replace side drawer with floating dropdown card

## Overview

Le side drawer pleine-hauteur de la navigation est remplacé par une floating card dropdown ancrée sous la barre de navigation (desktop ≥ 768px uniquement). Sur mobile, le hamburger et le menu disparaissent entièrement — le scroll de page suffit. Un seul fichier est modifié : `src/components/Nav.astro`.

## Problem Frame

La navigation actuelle ouvre un side drawer avec backdrop semi-opaque pour seulement 3 liens, une mécanique disproportionnée. Sur desktop, une card flottante légère (style Airbnb) offre une meilleure expérience tout en respectant la direction artistique du site. Sur mobile, la page est intentionnellement épurée.

(see origin: `docs/brainstorms/2026-04-11-floating-menu-card-requirements.md`)

## Requirements Trace

- R1. Suppression du side drawer `#nav-drawer`, du backdrop `#nav-backdrop`, et de tout leur JS
- R2. Hamburger masqué sur mobile — `hidden md:flex`
- R3. Card positionnée en absolu, ancrée sous la nav bar, alignée à droite
- R4. Card visible uniquement sous la barre de navigation
- R5. Largeur fixe `w-48` (192 px)
- R6. Z-index supérieur à la nav (`z-50`) — `z-[60]`
- R7. 3 entrées dans le même ordre : Projets, Veille, Meetup
- R8. Icônes conservées (SVG inline pour Projets/Veille, `<img>` pour Meetup)
- R9. Séparateur fin (`sand` / `dark-border`) entre chaque entrée
- R10. Meetup ouvre dans un nouvel onglet avec `target="_blank" rel="noopener noreferrer"`
- R11. Light mode : fond `cream`, bordure `sand`, texte `charcoal`, fond de ligne hover `sand/60`
- R12. Dark mode : fond `dark-card`, bordure `dark-border`, texte `dark-text`, fond de ligne hover plus sombre
- R13. `rounded-xl`, `shadow-lg`
- R14. Texte du label en `terracotta` au hover (icône Meetup exemptée car `<img>`)
- R15. Animation : `translateY(-4px) opacity-0` → `translateY(0) opacity-100`, ~150 ms ease-out
- R16. Fermeture au clic extérieur ou Escape
- R17. Fermeture au clic sur n'importe quel lien (ancres + Meetup)
- R18. Focus retourne au bouton déclencheur à la fermeture
- R19. `aria-expanded` + `aria-controls` (id de la nouvelle card, pas `#nav-drawer`)

## Scope Boundaries

- Seul `src/components/Nav.astro` est modifié
- Aucune entrée de menu ajoutée ou supprimée
- Pas de changement au logo, ThemeToggle, layouts, pages, ni aux autres composants
- Pas de tests automatisés créés (aucune infrastructure de test Astro UI dans le projet)
- L'icône Meetup reste un `<img>` — pas d'inlining SVG

## Context & Research

### Relevant Code and Patterns

- `src/components/Nav.astro` — fichier cible : drawer actuel lignes 49–101, JS lignes 103–160
- Backdrop existant (`#nav-backdrop`) : toggle via `opacity-0 pointer-events-none` ↔ `opacity-100` — même pattern à réutiliser pour la card
- Drawer existant : événements Escape, clic extérieur, fermeture sur lien ancre — mêmes handlers à porter sur la card
- `src/components/ThemeToggle.astro` — exemple de `<script>` standard Astro (module déféré, `document.getElementById`, assertions `!`)
- `tailwind.config.mjs` — tokens couleur définis en hex : opacity modifiers (`sand/60`, `cream/95`) fonctionnent avec Tailwind 3.4 (confirmé à plusieurs endroits dans le codebase)
- `src/layouts/Base.astro` — `<nav>` est sticky z-50, enfant direct de `<body>`. `position: sticky` crée un contexte de positionnement pour les enfants `absolute`.

### Institutional Learnings

- `docs/solutions/best-practices/astro-anti-fouc-dark-mode-is-inline-2026-04-10.md` — Ne jamais utiliser `is:inline` pour un handler d'interaction. Tout le JS interactif (open/close, ARIA, Escape) doit être dans un `<script>` standard (module déféré). L'attribut `is:inline` est réservé exclusivement au script anti-FOUC dans `<head>`.

### Resolved Planning Questions

- **ARIA pattern** : Disclosure Button (`aria-expanded` + Tab uniquement) — suffisant pour 3 liens, cohérent avec le drawer existant. Pas de `role="menu"` ni navigation par flèches.
- **Hover Meetup** : icône `<img>` exemptée de la teinte terracotta — seul le texte label reçoit `hover:text-terracotta`.
- **Hover** : fond `sand/60` + texte `terracotta` simultanément sur chaque ligne, comme dans les liens du drawer actuel.
- **Positioning** : la `<nav>` sticky est un containing block CSS valide pour les enfants `absolute`. La card est un enfant direct de `<nav>` avec `absolute top-full` — positionnée naturellement sous la nav bar.
- **Z-index** : `z-[60]` en valeur arbitraire Tailwind (pas de `z-60` dans l'échelle par défaut de Tailwind 3).
- **Tailwind transition** : la classe `transition` couvre `opacity` et `transform` ensemble — un seul `transition duration-150 ease-out` suffit pour l'animation combinée.
- **Icon état hamburger** : l'icône hamburger reste fixe (3 barres) que la card soit ouverte ou fermée — le toggle X/hamburger existant est supprimé avec le drawer.

## High-Level Technical Design

> *Ceci illustre l'approche visée et sert de guide directionnel pour la revue, pas de spécification d'implémentation. L'agent implémentant devra l'utiliser comme contexte, pas comme code à reproduire.*

```
AVANT (current DOM)
──────────────────
<nav sticky z-50>
  <div max-w-6xl flex justify-between>
    <a logo />
    <div flex items-center gap-3>
      <ThemeToggle />
      <button#nav-hamburger>  ← toujours visible
    </div>
  </div>
</nav>
<div#nav-backdrop fixed z-40 />   ← backdrop plein-écran
<div#nav-drawer fixed z-50 right-0 />  ← side drawer

APRÈS (target DOM)
──────────────────
<nav sticky z-50>   ← crée un containing block pour absolute children
  <div max-w-6xl flex justify-between>
    <a logo />
    <div flex items-center gap-3>
      <ThemeToggle />
      <button#nav-hamburger hidden md:flex>  ← masqué sur mobile
    </div>
  </div>
  <div#nav-card absolute top-full right-6 mt-1 z-[60] w-48
       opacity-0 pointer-events-none -translate-y-1
       [OPEN: opacity-100 pointer-events-auto translate-y-0]>
    <a Projets />
    <hr sand />
    <a Veille />
    <hr sand />
    <a Meetup target=_blank />
  </div>
</nav>
<!-- backdrop et drawer supprimés -->
```

**Toggle state machine :**
```
FERMÉ  →  [clic hamburger]    →  OUVERT
OUVERT →  [clic hamburger]    →  FERMÉ
OUVERT →  [clic extérieur]    →  FERMÉ + focus → btn
OUVERT →  [Escape]            →  FERMÉ + focus → btn
OUVERT →  [clic lien]         →  FERMÉ + focus → btn
```

## Implementation Units

- [ ] **Unit 1 : Supprimer le système drawer/backdrop**

**Goal:** Retirer du markup et du JS tout ce qui appartient au side drawer et au backdrop.

**Requirements:** R1

**Dependencies:** Aucune

**Files:**
- Modify: `src/components/Nav.astro`

**Approach:**
- Supprimer l'élément `<div id="nav-backdrop">` (lignes 43–46 actuelles)
- Supprimer l'élément `<div id="nav-drawer">` et tout son contenu (lignes 49–101)
- Supprimer la balise `<script>` entière (lignes 103–160) — le JS sera réécrit dans Unit 3
- Supprimer les attributs `data-label-open` / `data-label-close` du bouton hamburger — ils n'ont plus de raison d'être
- Supprimer les SVG `icon-open` / `icon-close` dans le bouton hamburger et les remplacer par un seul SVG hamburger fixe (3 barres)
- Mettre à jour `aria-label` du bouton en valeur fixe `"Ouvrir le menu"` (plus besoin de basculer)
- Mettre à jour l'attribut `aria-controls="nav-drawer"` → `aria-controls="nav-card"` directement dans le markup HTML (R19 — ne pas laisser cette mise à jour uniquement au JS)

**Test scenarios:**
- Happy path : après la suppression, le DOM ne doit plus contenir `#nav-backdrop`, `#nav-drawer`, `icon-open`, `icon-close`
- Visual : le hamburger reste visible sur desktop avec un seul icône fixe

**Verification:** La page charge sans erreur JS (`ReferenceError` ou `Cannot read properties of null`) après suppression du script bloc.

---

- [ ] **Unit 2 : Ajouter la floating card**

**Goal:** Insérer la card dropdown dans le markup de `<nav>` avec tout son styling.

**Requirements:** R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R14

**Dependencies:** Unit 1

**Files:**
- Modify: `src/components/Nav.astro`

**Approach:**
- Ajouter `hidden md:flex` au bouton hamburger (R2) — masqué sur mobile, flex sur desktop
- Ajouter la card `<div id="nav-card">` comme enfant direct de `<nav>`, après le `<div>` interne (R3, R4)
- Position : `absolute top-full right-6 mt-1` — `top-full` sur `<nav>` sticky place la card juste sous le bord bas de la nav bar
- Ajout des classes initiales d'état fermé : `opacity-0 pointer-events-none -translate-y-1` + `transition duration-150 ease-out` (R15 — prévu pour Unit 3 mais doit être présent dans le markup)
- Taille et décoration : `w-48 rounded-xl shadow-lg border` (R5, R13)
- Couleurs light/dark : `bg-cream border-sand dark:bg-dark-card dark:border-dark-border` (R11, R12)
- Z-index : `z-[60]` (R6)
- 3 entrées dans l'ordre Projets → Veille → Meetup (R7) avec leurs icônes (R8) :
  - Projets et Veille : copier les SVG inline existants du drawer
  - Meetup : conserver `<img src={...meetup-logo.svg}>` avec `aria-hidden="true"`
- Séparateurs entre entrées : `<hr>` ou `<div>` de 1px avec `border-sand dark:border-dark-border` (R9)
- Hover par entrée : `hover:bg-sand/60 dark:hover:bg-dark-border hover:text-terracotta` sur le lien (R11, R14)
- Meetup : `target="_blank" rel="noopener noreferrer"` (R10)
- Chaque entrée : `flex items-center gap-3 px-3 py-2.5 text-sm` — taille tactile raisonnable (≥ 44px de zone de clic avec les séparateurs)

**Patterns to follow:**
- Style des liens du drawer actuel (`flex items-center gap-3 px-3 py-3 rounded-lg text-sm text-stone hover:text-charcoal hover:bg-sand/60`) — adapter sans le `rounded-lg` par entrée (la card entière est arrondie)
- Token dark mode : `dark:text-dark-muted dark:hover:text-dark-text` du drawer. **Attention** : le drawer utilisait `dark:hover:bg-dark-card` car son fond était `dark-bg`; ici le fond de la card est `dark-card`, donc utiliser `dark:hover:bg-dark-border` (#2d2b26) pour le hover — sinon le survol est invisible (même couleur que le fond)

**Test scenarios:**
- Happy path : la card est présente dans le DOM mais visuellement invisible (opacity-0)
- Visual light mode : fond cream, bordure sand, coins arrondis, ombre visible
- Visual dark mode : fond dark-card, bordure dark-border — distinction visible du fond de page (dark-bg)
- Visual : 3 entrées avec icônes, séparateurs entre elles
- Responsive : hamburger invisible sur mobile (< 768px), visible sur desktop

**Verification:** En inspectant le DOM, `#nav-card` est présent avec les classes attendues. En ouvrant manuellement (ajouter temporairement les classes open), la card s'affiche correctement en light et dark mode.

---

- [ ] **Unit 3 : Câbler les interactions JS**

**Goal:** Implémenter le comportement open/close de la card avec gestion ARIA, focus, et fermeture multi-contexte.

**Requirements:** R15, R16, R17, R18, R19

**Dependencies:** Unit 1, Unit 2

**Files:**
- Modify: `src/components/Nav.astro`

**Approach:**
- Ajouter un `<script>` standard (pas `is:inline`) — sera converti en module déféré par Astro
- Sélectionner `#nav-hamburger` et `#nav-card` avec `getElementById` + assertions `!`
- Initialiser `aria-controls="nav-card"` et `aria-expanded="false"` sur le bouton (R19)
- **Fonction `openCard()`** : retire les classes état fermé (`opacity-0 pointer-events-none -translate-y-1`), ajoute les classes état ouvert (`opacity-100 pointer-events-auto translate-y-0`), met `aria-expanded="true"`, attache les handlers `outsideClick` et `keyEscape`
- **Fonction `closeCard()`** : inverse les classes, met `aria-expanded="false"`, retire les handlers, appelle `btn.focus()` (R18)
- **Handler `outsideClick`** : si `event.target` n'est pas dans `#nav-card` et pas dans `#nav-hamburger`, appelle `closeCard()` — même pattern que le drawer existant. Utiliser `card` (ou `navCard`) comme nom de variable JS pour l'élément `#nav-card` — ne pas réutiliser `drawer` (élément supprimé)
- **Handler `keyEscape`** : si `event.key === 'Escape'`, appelle `closeCard()` — même pattern que le drawer existant
- **Liens de la card** : `querySelectorAll('#nav-card a')` → chaque lien écoute `click` → `closeCard()` (R17 — couvre ancres ET Meetup)
- **Bouton hamburger** : `toggle` — si `aria-expanded === 'true'` → `closeCard()`, sinon → `openCard()`

**Patterns to follow:**
- Handler `outsideClickHandler` du drawer existant (lignes 140–145 du Nav.astro actuel) — même délégation au document
- Handler `handleEscape` du drawer existant (lignes 113–115) — même pattern addEventListener/removeEventListener
- Mutation des classes CSS via `classList.add/remove` plutôt que `classList.toggle` pour la clarté

**Test scenarios:**
- Happy path : clic hamburger sur desktop → card passe à opacity-100, `aria-expanded="true"`
- Happy path : deuxième clic hamburger → card repasse à opacity-0, `aria-expanded="false"`, focus retourne au bouton
- Happy path : clic en dehors de la card → card se ferme, focus retourne au bouton
- Happy path : Escape avec la card ouverte → card se ferme, focus retourne au bouton
- Happy path : clic sur "Projets" → page scroll sur `#projets`, card fermée, focus au bouton
- Happy path : clic sur "Meetup" → nouvel onglet ouvert, card fermée, focus au bouton
- Edge case : clic hamburger sur mobile → impossible (bouton hidden) — pas de régression
- Edge case : tab key dans la card ouverte → navigation standard entre les 3 liens (pas de trap — Disclosure Button pattern)
- Dark mode : hover sur une entrée → fond légèrement plus sombre (`dark:hover:bg-dark-border`)

**Verification:** En mode desktop, toutes les interactions ouvrent/ferment la card proprement. Vérifier `aria-expanded` dans l'inspecteur DOM après chaque interaction. Vérifier que `document.activeElement` pointe vers le bouton après fermeture.

## Open Questions

### Resolved During Planning

- **ARIA role pattern** : Disclosure Button (pas Menu Button) — `aria-expanded` + Tab suffit pour 3 liens simples, pas d'exigence de navigation par flèches
- **Z-index** : `z-[60]` (valeur arbitraire Tailwind) — Tailwind 3 ne propose pas `z-60` dans son échelle par défaut
- **Positioning context** : `<nav sticky>` est un containing block CSS valide, la card est positionnée en `absolute top-full` par rapport à la nav
- **Transition multi-propriété** : la classe Tailwind `transition` couvre `opacity` ET `transform` — un seul `duration-150 ease-out` suffit

### Deferred to Implementation

- **Alignement horizontal exact** : `right-6` (24px = `px-6` du contenu intérieur) est l'approche recommandée, mais peut nécessiter ajustement selon le rendu réel sur différentes largeurs de viewport
- **Hauteur des entrées** : `py-2.5` est proposé pour une zone de clic ≥ 44px, à ajuster visuellement au rendu

## System-Wide Impact

- **Interaction graph** : Aucun callback, observer, ou middleware touché. La modification est contenue dans `Nav.astro`.
- **Error propagation** : Si `getElementById` retourne null (DOM non encore prêt), le script Astro déféré garantit que le DOM est chargé. Les assertions `!` suivent la convention existante.
- **State lifecycle risks** : Aucun état persisté (pas de localStorage). La card est toujours fermée au rechargement de page.
- **API surface parity** : Aucune API touchée. Les liens pointent vers les mêmes ancres (`#projets`, `#veille`) et la même URL meetup — aucun changement de routing.
- **Unchanged invariants** : Le logo, ThemeToggle, les autres composants (`Hero`, `Actualites`, `ProjectList`, `VeilleGenAI`, `Footer`), et le script anti-FOUC `is:inline` dans `Base.astro` restent inchangés.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `position: sticky` ne crée pas de containing block dans certains navigateurs anciens | Si problème constaté, wrapper la nav dans un `<div class="relative">` comme fallback |
| `z-[60]` non purgé par Tailwind en production | Les classes arbitraires Tailwind nécessitent d'être présentes dans le markup statique — c'est le cas ici |
| Card déborde du viewport sur écrans étroits (768–820px) | La largeur fixe `w-48` (192px) laisse suffisamment de marge sur 768px viewport |
| Double-click hamburger crée un état incohérent | Le toggle vérifie `aria-expanded` avant d'agir — état toujours cohérent |

## Documentation / Operational Notes

- Aucun changement de déploiement requis — même workflow GitHub Actions `deploy.yml`
- Le comportement mobile avant ce changement (hamburger visible, side drawer) est remplacé par "pas de menu du tout" — régression intentionnelle documentée dans les Key Decisions du brainstorm

## Sources & References

- **Origin document:** [`docs/brainstorms/2026-04-11-floating-menu-card-requirements.md`](docs/brainstorms/2026-04-11-floating-menu-card-requirements.md)
- Related code: `src/components/Nav.astro` (drawer pattern à supprimer)
- Related code: `src/components/ThemeToggle.astro` (modèle de `<script>` standard Astro)
- Related code: `src/layouts/Base.astro` (contexte DOM)
- Institutional learning: `docs/solutions/best-practices/astro-anti-fouc-dark-mode-is-inline-2026-04-10.md`
