---
title: "feat: dark mode with toggle and localStorage persistence"
type: feat
status: active
date: 2026-04-10
origin: docs/brainstorms/2026-04-10-dark-mode-requirements.md
---

# feat: dark mode with toggle and localStorage persistence

## Overview

Ajouter un dark mode optionnel au site Club GenAI Home. L'utilisateur bascule entre light et dark via un bouton lune/soleil dans la Nav. Le choix est sauvegardé en localStorage et appliqué avant le premier paint (pas de flash). Le mode light reste le défaut.

## Problem Frame

Le site est 100 % light mode. Le dark mode est un confort optionnel activé explicitement — pas une adaptation automatique aux préférences système. La palette sombre suit la DA Anthropic-inspired : tons chauds, accent terracotta inchangé. (see origin: docs/brainstorms/2026-04-10-dark-mode-requirements.md)

## Requirements Trace

- R1. Palette dark chaude : `dark-bg #141210`, `dark-card #1e1c18`, `dark-text #f0ede6`, `dark-muted #8a8580`, `dark-border #2d2b26`. Terracotta inchangé.
- R2. Toutes les sections (Nav, Hero, Actualités, Projets, Veille, Footer) ont des variantes dark.
- R3. Bouton toggle dans la Nav entre "Veille" et l'icône Meetup.
- R4. Icône lune en light mode, soleil en dark mode.
- R5. Style identique aux icônes sociales existantes (h-5 w-5, text-stone, hover:text-terracotta).
- R6. aria-label dynamique : "Passer en mode sombre" / "Passer en mode clair".
- R7. localStorage (clé `theme`), try/catch.
- R8. Mode appliqué avant premier paint via script inline synchrone. Default : light.
- R9. Basculement instantané.
- R10. prefers-color-scheme ignoré.

## Scope Boundaries

- Pas de `prefers-color-scheme` comme défaut.
- Pas de transition CSS animée (non bloquant si ajoutée).
- Un seul thème supplémentaire (dark).
- Design du toggle suit la maquette Stitch (project `15034475254751730230`).

## Context & Research

### Relevant Code and Patterns

- `tailwind.config.mjs` — à compléter avec `darkMode: 'class'` et les tokens dark (actuellement aucun `darkMode` key → défaut `'media'`)
- `src/layouts/Base.astro` — `<head>` sans `<script>` actuellement ; anti-FOUC va juste avant les `<link>` stylesheets
- `src/components/Nav.astro` — toggle s'insère entre `<a href="#veille">` (enfant 2) et `<a href={meetupUrl}>` (enfant 3) dans le flex container right-side
- `src/components/VeilleGenAI.astro` — `SOURCE_CLASSES` Record TypeScript avec strings Tailwind scale (orange-50, blue-50…) ; dark: variants à ajouter aux strings (Tailwind scanne les `.astro`)

### Classes nécessitant des variantes dark: par composant

| Composant | Classes actuelles à remplacer |
|-----------|------------------------------|
| `Base.astro` body | `bg-cream` → `dark:bg-dark-bg`, `text-charcoal` → `dark:text-dark-text` |
| `Nav.astro` | `border-sand` → `dark:border-dark-border`, `bg-cream/95` → `dark:bg-dark-bg/95`, `text-charcoal` → `dark:text-dark-text`, `text-stone` → `dark:text-dark-muted` |
| `Hero.astro` | `text-charcoal` → `dark:text-dark-text`, `text-charcoal/70` → `dark:text-dark-muted` |
| `Actualites.astro` | `border-sand` → `dark:border-dark-border`, `bg-white` → `dark:bg-dark-card`, `bg-terracotta/10` → `dark:bg-terracotta/15`, `text-stone` → `dark:text-dark-muted`, `text-charcoal` → `dark:text-dark-text` |
| `ProjectList.astro` | `border-sand` → `dark:border-dark-border`, `bg-cream-card` → `dark:bg-dark-card`, `bg-white` → `dark:bg-dark-card`, `text-charcoal` → `dark:text-dark-text`, `text-stone` → `dark:text-dark-muted`, `bg-sand` → `dark:bg-dark-border` |
| `VeilleGenAI.astro` | `border-sand` → `dark:border-dark-border`, `bg-cream-card` → `dark:bg-dark-card`, `bg-white` → `dark:bg-dark-card`, `text-charcoal` → `dark:text-dark-text`, `text-stone` → `dark:text-dark-muted` ; source badges Record : ajouter `dark:bg-*/30 dark:text-*/300 dark:border-*/900` aux strings |
| `Footer.astro` | `border-sand` → `dark:border-dark-border`, `text-stone` → `dark:text-dark-muted` |

### Institutional Learnings

- `docs/solutions/security-issues/xss-javascript-uri-rss-feed-url-validation-2026-04-10.md` — non applicable ici.

### External References

- Astro docs — `is:inline` directive : empêche le bundling/déférement, émet le script verbatim dans le HTML de sortie. Obligatoire pour l'anti-FOUC.
- Tailwind CSS v3 — `darkMode: 'class'` déclenche les variantes `dark:` quand `<html>` a la classe `dark`.

## Key Technical Decisions

- **`darkMode: 'class'`** : classe `dark` sur `<html>`, cohérent avec le système de tokens existant. CSS custom properties rejetées — complexité inutile quand Tailwind couvre le besoin.
- **`is:inline` pour l'anti-FOUC** : sans `is:inline`, Astro transforme le `<script>` en `type="module"` (différé → FOUC garanti). `is:inline` émet le contenu verbatim et synchrone.
- **Script anti-FOUC placé AVANT les `<link>` stylesheets** : s'exécute pendant le parsing HTML, avant la construction du CSSOM.
- **Toggle handler en `<script>` standard** (sans `is:inline`) dans `Nav.astro` : bundlé et différé, correct pour les event handlers post-paint.
- **Dark tokens nommés** dans `tailwind.config.mjs` (ex : `dark-bg`, `dark-card`) : suivent la convention des tokens existants (`cream`, `cream-card`, etc.).
- **VeilleGenAI badges** : ajouter `dark:` variants directement dans les strings du `SOURCE_CLASSES` Record — Tailwind les trouve à l'analyse des `.astro`.

## Open Questions

### Resolved During Planning

- **Stratégie dark mode** : `darkMode: 'class'` (pas CSS custom properties).
- **Directive anti-FOUC** : `is:inline` — seul moyen d'obtenir un script synchrone dans `<head>` avec Astro.
- **Position du script** : dans `<head>` de `Base.astro`, avant les `<link>` aux Google Fonts.

### Deferred to Implementation

- Valeurs exactes des dark: variants pour les `text-charcoal/70` (opacity modifier sur token custom) — l'implémenteur vérifiera le rendu réel.
- Source badge dark variants : valeurs exactes Tailwind scale (ex : `orange-950/30` vs `orange-900/40`) à ajuster visuellement.

## High-Level Technical Design

> *Directional guidance for review — not implementation specification.*

```
État du mode :
  <html class="">        → light mode (défaut)
  <html class="dark">   → dark mode

Flux au chargement :
  <head> parse → <script is:inline> s'exécute →
    lit localStorage['theme'] (try/catch) →
    si 'dark' : ajoute classe 'dark' sur <html> →
  <link> stylesheets chargent → render → body visible (dark ou light, sans flash)

Flux au clic du toggle :
  clic → toggle class 'dark' sur <html> →
  écriture localStorage['theme'] (try/catch) →
  mise à jour aria-label + icône (via data-theme ou re-render JS)

Composant ThemeToggle :
  slot dans Nav entre "Veille" (enfant 2) et icône Meetup (enfant 3)
  <button aria-label="..."> [icône SVG lune | soleil] </button>
  <script> handler : toggle class + localStorage + aria-label update
```

## Implementation Units

- [ ] **Unit 1: Tailwind config — darkMode + dark color tokens**

**Goal:** Activer la stratégie dark mode `'class'` et déclarer les 5 tokens de la palette sombre.

**Requirements:** R1

**Dependencies:** Aucune

**Files:**
- Modify: `tailwind.config.mjs`

**Approach:**
- Ajouter `darkMode: 'class'` au niveau racine de la config (avant `content`).
- Ajouter dans `theme.extend.colors` les 5 tokens : `dark-bg`, `dark-card`, `dark-text`, `dark-muted`, `dark-border` avec leurs valeurs hexadécimales (R1).
- Les tokens `terracotta` et `terracotta-dark` restent inchangés.

**Patterns to follow:**
- Convention des tokens existants : noms kebab-case, valeurs hex, dans `theme.extend.colors`.

**Test scenarios:**
- Test expectation: none — pure configuration, aucun comportement vérifiable sans les composants. Vérifier à l'étape build (`npm run build`) qu'aucune erreur Tailwind n'est levée.

**Verification:**
- `npm run build` passe sans erreur. Les classes `dark:bg-dark-bg`, `dark:text-dark-text` etc. sont reconnues par Tailwind (pas de warning "unknown class").

---

- [ ] **Unit 2: Anti-FOUC script dans Base.astro**

**Goal:** Appliquer le mode sauvegardé avant le premier paint pour éviter tout flash.

**Requirements:** R7, R8, R10

**Dependencies:** Unit 1 (dark class doit exister dans Tailwind pour que le rendu en dark soit correct)

**Files:**
- Modify: `src/layouts/Base.astro`

**Approach:**
- Insérer un `<script is:inline>` dans `<head>`, **avant** les `<link rel="preconnect">` et `<link rel="stylesheet">` existants.
- Le script IIFE : lit `localStorage.getItem('theme')` dans un try/catch. Si la valeur est exactement `'dark'`, ajoute la classe `dark` à `document.documentElement`. Sinon (valeur absente, valeur invalide, exception localStorage) : ne rien faire (light reste le défaut).
- Ajouter `dark:bg-dark-bg dark:text-dark-text` à la `<body>` (en complément des classes existantes `bg-cream text-charcoal`).

**Technical design:**
```
IIFE dans <script is:inline> :
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch (e) {}
```

**Patterns to follow:**
- Aucun précédent dans le projet — pattern standard documenté par Astro + Tailwind.

**Test scenarios:**
- Happy path: localStorage contient `theme='dark'` → `<html class="dark">` visible dès le premier paint, aucun flash.
- Happy path: localStorage contient `theme='light'` → light mode sans flash.
- Edge case: localStorage vide → light mode par défaut, sans erreur.
- Edge case: localStorage inaccessible (throwé) → light mode par défaut, l'erreur est capturée silencieusement.
- Edge case: valeur inattendue (`theme='invalid'`) → light mode, valeur ignorée.

**Verification:**
- Ouvrir le site en dark mode. Recharger. Aucun flash blanc au chargement.
- Désactiver JavaScript → le site s'affiche en light mode (le script ne tourne pas, le défaut s'applique).

---

- [ ] **Unit 3: Composant ThemeToggle et intégration dans Nav.astro**

**Goal:** Créer le bouton lune/soleil, l'intégrer dans la Nav, et câbler la logique de bascule.

**Requirements:** R3, R4, R5, R6, R7, R9

**Dependencies:** Unit 1 (tokens dark), Unit 2 (classe dark sur `<html>`)

**Files:**
- Create: `src/components/ThemeToggle.astro`
- Modify: `src/components/Nav.astro`
- Modify: `src/layouts/Base.astro` (ajouter `githubUser` prop si nécessaire — non applicable ici)

**Approach:**
- Créer `ThemeToggle.astro` : un `<button>` avec deux SVG (lune + soleil) dont la visibilité est contrôlée par CSS (`dark:hidden` / `dark:block`). En light mode : lune visible, soleil caché. En dark mode : lune cachée, soleil visible.
- `aria-label` initial `"Passer en mode sombre"` mis à jour dynamiquement par le script après chaque toggle.
- Ajouter un `<script>` standard (pas `is:inline`) dans `ThemeToggle.astro` : écoute le clic, toggle la classe `dark` sur `document.documentElement`, écrit dans localStorage (try/catch), met à jour `aria-label`.
- Dans `Nav.astro` : importer `ThemeToggle.astro` et l'insérer dans le flex container right-side, entre `<a href="#veille">` et `<a href={meetupUrl}>`.
- Ajouter les `dark:` variants aux classes du Nav : `dark:bg-dark-bg/95`, `dark:border-dark-border`, `dark:text-dark-text` (brand link), `dark:text-dark-muted` (liens texte + icônes).

**Technical design (directional):**
```
ThemeToggle.astro :
  <button id="theme-toggle" aria-label="Passer en mode sombre"
          class="text-stone hover:text-terracotta transition-colors dark:text-dark-muted">
    <!-- Lune : visible en light, cachée en dark -->
    <svg class="block dark:hidden" ...>[moon SVG path]</svg>
    <!-- Soleil : cachée en light, visible en dark -->
    <svg class="hidden dark:block" ...>[sun SVG path]</svg>
  </button>

  <script>  // standard (bundlé, différé)
    const btn = document.getElementById('theme-toggle')
    btn?.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark')
      try { localStorage.setItem('theme', isDark ? 'dark' : 'light') } catch {}
      if (btn instanceof HTMLElement) {
        btn.setAttribute('aria-label',
          isDark ? 'Passer en mode clair' : 'Passer en mode sombre')
      }
    })
  </script>
```

**Patterns to follow:**
- Style et taille des icônes : `h-5 w-5`, `text-stone hover:text-terracotta transition-colors` — identiques aux icônes Meetup et GitHub dans `Nav.astro`.
- Placement dans le flex container : même `gap-6` existant.

**Test scenarios:**
- Happy path: clic sur le bouton en light mode → classe `dark` ajoutée à `<html>`, icône bascule de lune à soleil, aria-label devient "Passer en mode clair".
- Happy path: clic à nouveau en dark mode → classe `dark` retirée, icône revient à lune, aria-label revient à "Passer en mode sombre".
- Persistence: passer en dark mode, recharger → page se charge en dark mode (Unit 2 couvre le FOUC), bouton affiche le soleil avec le bon aria-label.
- Edge case: localStorage throwé lors du setItem → basculement visuel réussit quand même, erreur silencieuse.
- Edge case: `<html>` n'a pas la classe `dark` au chargement (light) → bouton affiche lune correctement via CSS `dark:hidden / dark:block`.

**Verification:**
- Toggle fonctionne sans rechargement de page.
- aria-label correct dans les deux états (vérifiable avec les dev tools accessibilité).
- LocalStorage `theme` mise à jour à chaque toggle (inspectable dans Application > Storage).

---

- [ ] **Unit 4: Variantes dark: dans Hero, Actualites, ProjectList, VeilleGenAI, Footer**

**Goal:** Appliquer les variantes `dark:` à tous les composants de contenu pour un dark mode cohérent.

**Requirements:** R1, R2

**Dependencies:** Unit 1, Unit 2

**Files:**
- Modify: `src/components/Hero.astro`
- Modify: `src/components/Actualites.astro`
- Modify: `src/components/ProjectList.astro`
- Modify: `src/components/VeilleGenAI.astro`
- Modify: `src/components/Footer.astro`

**Approach:**
- Pour chaque composant : ajouter les variantes `dark:` aux classes selon la table de correspondance dans Context & Research.
- `bg-white` → `dark:bg-dark-card` (cartes Actualites, ProjectList, VeilleGenAI).
- `bg-cream-card` → `dark:bg-dark-card` (cartes ProjectList, badge VeilleGenAI).
- `border-sand` → `dark:border-dark-border` partout.
- `text-charcoal` → `dark:text-dark-text` partout.
- `text-stone` (et variantes `/60`) → `dark:text-dark-muted` partout.
- **VeilleGenAI `SOURCE_CLASSES` Record** : pour chaque entrée, ajouter les variantes dark au string. Exemple : `'Google': 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'`. Ajuster visuellement les valeurs exactes de l'échelle (voir Deferred to Implementation).
- `bg-terracotta/10` dans Actualites → ajouter `dark:bg-terracotta/20` (légèrement plus visible sur fond sombre).
- `bg-sand` dans ProjectList (topic pills) → `dark:bg-dark-border`.

**Patterns to follow:**
- Toutes les variantes `dark:` suivent la table dans Context & Research.
- Classes existantes non modifiées — on ajoute uniquement les variantes.

**Test scenarios:**
- Happy path: activer dark mode → fond de page `#141210`, cartes `#1e1c18`, textes `#f0ede6`, bordures `#2d2b26`.
- Happy path: désactiver dark mode → retour exact au light mode (aucune couleur résiduelle).
- Edge case: source badges VeilleGenAI en dark mode → lisibles (contraste suffisant sur fond `#1e1c18`).
- Integration: `npm run build` passe — toutes les classes `dark:*` générées par Tailwind sont présentes dans le CSS bundle.

**Verification:**
- Inspecter chaque section en dark mode → aucun texte illisible, aucune couleur inattendue.
- L'accent terracotta `#d97757` est identique en light et dark sur les CTA.
- `npm run build` et `npm run preview` — les deux modes sont visuellement corrects.

## System-Wide Impact

- **Interaction graph:** Le script anti-FOUC dans `Base.astro` s'exécute sur chaque `<html>` chargeant la page. Si des pages supplémentaires sont ajoutées à l'avenir, elles bénéficient du dark mode automatiquement via `Base.astro`.
- **State lifecycle risks:** La classe `dark` sur `<html>` est le seul état partagé. Aucun conflit possible entre composants — tous lisent l'état depuis le DOM, pas depuis un store.
- **Error propagation:** localStorage try/catch dans le script anti-FOUC et dans le toggle handler : les erreurs sont capturées silencieusement, le site tombe en light mode par défaut.
- **Unchanged invariants:** L'accent terracotta (`#d97757`, `#b85c3a`), les polices (Inter), l'espacement et la mise en page — entièrement inchangés dans les deux modes.
- **View Transitions (future):** Si `<ViewTransitions />` est ajouté à Astro plus tard, le script anti-FOUC devra écouter `astro:after-swap` pour ré-appliquer la classe `dark` après chaque navigation client-side. Ce n'est pas dans le scope actuel (site à page unique).

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Tailwind ne génère pas les `dark:*` classes si elles ne sont pas dans les fichiers scannés | Vérifier que `content` dans `tailwind.config.mjs` couvre `./src/**/*.astro` (déjà le cas) |
| Source badge dark variants illisibles (contraste insuffisant) | Ajuster visuellement les valeurs Tailwind scale en implémentation (ex: `blue-900/30` vs `blue-950/40`) |
| Script anti-FOUC mal placé (après `<link>`) → flash résiduel | Vérifier dans le HTML construit que le script précède les stylesheets |
| `<script is:inline>` oublié → script bundlé/différé → FOUC en dark mode | Vérifier le HTML de sortie : l'IIFE doit apparaître verbatim inline avant les `<link>` |
| VeilleGenAI SOURCE_CLASSES strings non scannées par Tailwind (si externalisées dans un .ts) | Les strings restent dans le fichier .astro → scannées correctement. Ne pas les déplacer dans un module .ts externe sans mettre à jour `content` |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-10-dark-mode-requirements.md](docs/brainstorms/2026-04-10-dark-mode-requirements.md)
- Stitch mockups: project `15034475254751730230` — "Club GenAI - Home" + "Club GenAI - Home (Dark Mode)"
- Astro docs: `is:inline` directive — https://docs.astro.build/en/reference/directives-reference/#isinline
- Tailwind CSS v3: `darkMode: 'class'` — https://tailwindcss.com/docs/dark-mode
