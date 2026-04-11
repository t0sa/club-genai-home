---
title: "feat: Lighthouse SEO, Performance & Accessibilité"
type: feat
status: active
date: 2026-04-11
origin: docs/brainstorms/2026-04-11-lighthouse-seo-perf-a11y-requirements.md
---

# feat: Lighthouse SEO, Performance & Accessibilité

## Overview

Le site ne dispose d'aucun signal SEO au-delà des balises de base, son chargement de polices est render-blocking, et il manque les fondamentaux d'accessibilité clavier. Ce plan couvre 11 requirements en 4 unités déployables sur une branche dédiée.

## Problem Frame

Site vitrine statique Astro sur GitHub Pages. Score Lighthouse dégradé par : absence d'Open Graph / JSON-LD / sitemap / robots.txt (SEO), `<link rel="stylesheet">` Google Fonts bloquant (Performance), absence de skip-to-content et d'attributs ARIA/dimensionnels complets (Accessibilité). Voir origin document pour le détail.

## Requirements Trace

- R1. Open Graph : `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale`
- R2. Twitter Card : `twitter:card`, `twitter:title`, `twitter:description`
- R3. `<link rel="canonical">` — URL absolue construite via `new URL(Astro.url.pathname, Astro.site)`
- R4. `public/robots.txt` autorisant tous les crawlers, pointant vers sitemap
- R5. Sitemap auto-généré via `@astrojs/sitemap` (respecte `site` + `base`)
- R6. JSON-LD `Organization` dans `<head>` : name, url, description, logo, sameAs (GitHub + Meetup group)
- R7. Google Fonts non-render-blocking via pattern `rel="preload" as="style" onload` + `<noscript>` fallback
- R8. `width="40" height="40"` HTML natifs sur les `<img>` logo dans `src/components/Nav.astro`
- R9. Lien "Aller au contenu" visible au focus, premier enfant de `<body>`
- R10. `id="main-content"` sur le `<main>` de `src/pages/index.astro`
- R11. Corriger le double logo dans Nav : `alt=""` sur les deux `<img>`, `aria-label="Club GenAI"` sur le `<a>` parent — `aria-hidden` statique sur une seule image casserait les screen readers en dark mode

## Scope Boundaries

- Pas de PWA / manifest.json
- Pas de Content Security Policy (GitHub Pages ne supporte pas les headers personnalisés)
- Pas d'auto-hébergement de la police Inter (garder Google Fonts CDN)
- Pas d'og:image custom (utiliser `club-genai-dark.svg` déjà dans `public/`)
- `meetup_url` pointe vers un event, pas la page du groupe — le JSON-LD `sameAs` Meetup doit utiliser l'URL du groupe (parent path de `meetup_url`)

## Context & Research

### Relevant Code and Patterns

- `src/layouts/Base.astro` — seul layout : toutes les balises `<head>` SEO vont ici
- `src/pages/index.astro` — seule page : ajouter `id="main-content"` sur le `<main>` existant
- `src/components/Nav.astro` — deux `<img>` logo sans `width`/`height`, un `<img>` sans `aria-hidden`
- `astro.config.mjs` — `site: 'https://t0sa.github.io'` et `base: '/club-genai-home/'` déjà configurés
- `src/data/config.json` — `meetup_url`, `github_user` disponibles pour JSON-LD `sameAs`
- `public/` — aucun `robots.txt` ni sitemap existant

### Institutional Learnings

- `docs/solutions/best-practices/astro-anti-fouc-dark-mode-is-inline-2026-04-10.md` — le script `is:inline` anti-FOUC **doit rester en premier enfant de `<head>`**, avant tout nouveau `<link>`. Ne pas le déplacer lors des éditions de `Base.astro`.

### External References

- `@astrojs/sitemap` gère `base` automatiquement — passer `site` suffit, pas de config supplémentaire
- Pattern Google Fonts non-blocking : `rel="preload" as="style" onload="this.onload=null;this.rel='stylesheet'"` + `<noscript>` fallback
- `Astro.url.pathname` inclut le préfixe `base` à build time — `new URL(Astro.url.pathname, Astro.site)` donne l'URL complète correcte

## Key Technical Decisions

- **sitemap via `@astrojs/sitemap`** plutôt que fichier statique : auto-updated à chaque build, `<lastmod>` exact, compatible `base` sans config. (see origin: docs/brainstorms/2026-04-11-lighthouse-seo-perf-a11y-requirements.md)
- **og:image → `club-genai-dark.svg`** : pas d'asset supplémentaire, les parseurs OG acceptent les SVG même si certains crawlers les ignorent. (see origin)
- **Fonts : conserver Google Fonts CDN** avec pattern preload/onload, pas d'auto-hébergement. `display=swap` déjà dans le query param — seul le mode de chargement change.
- **JSON-LD : type `Organization`** — approprié pour une communauté, plus simple que `EducationalOrganization`, reconnu universellement.
- **Ordering `<head>`** : script `is:inline` anti-FOUC → preconnect → canonical → SEO meta → JSON-LD → fonts preload.

## Open Questions

### Resolved During Planning

- **`Astro.url` static mode** : disponible, pathname inclut `base`. Canonical = `new URL(Astro.url.pathname, Astro.site)`.
- **`@astrojs/sitemap` vs static XML** : sitemap intégration retenu — zéro config, `base`-aware, `<lastmod>` auto.
- **`font-display: swap` CSS** : déjà injecté via query param Google Fonts, pas de CSS custom nécessaire.

### Deferred to Implementation

- **URL du groupe Meetup pour `sameAs`** : dériver à partir de `config.meetup_url` (retirer le segment `/events/...`) ou confirmer l'URL du groupe directement. L'implémenteur valide l'URL avant de hardcoder.
- **`@astrojs/sitemap` version compatible Astro 4** : vérifier le peer dependency lors de l'installation avec `npx astro add sitemap`.

## Implementation Units

- [x] **Unit 1 : Installer @astrojs/sitemap**

**Goal:** Générer automatiquement `sitemap-index.xml` et `sitemap-0.xml` à chaque build.

**Requirements:** R5

**Dependencies:** Aucune.

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`

**Approach:**
- Installer `@astrojs/sitemap` via `npx astro add sitemap` (ou `npm install @astrojs/sitemap` + ajout manuel)
- Ajouter `import sitemap from '@astrojs/sitemap'` et `sitemap()` dans le tableau `integrations` de `astro.config.mjs`, après `tailwind()`
- `site` est déjà déclaré — la configuration est complète sans paramètre supplémentaire

**Patterns to follow:**
- `astro.config.mjs` pour la syntaxe d'intégration (voir `tailwind()` existant)

**Test scenarios:**
- Happy path : `npm run build` produit `dist/sitemap-index.xml` et `dist/sitemap-0.xml`
- Happy path : `sitemap-0.xml` contient `https://t0sa.github.io/club-genai-home/` comme URL
- Edge case : build réussit sans erreur si `site` est absent (doit afficher un warning, pas planter)

**Verification:**
- Fichiers sitemap présents dans `dist/` après build
- URL canonique dans le sitemap correspond à `https://t0sa.github.io/club-genai-home/`

---

- [x] **Unit 2 : Créer robots.txt**

**Goal:** Guider les crawlers et les pointer vers le sitemap généré.

**Requirements:** R4

**Dependencies:** Unit 1 (le chemin du sitemap doit être connu).

**Files:**
- Create: `public/robots.txt`

**Approach:**
- Fichier statique dans `public/` — Astro le sert à la racine du `base` path
- Contenu minimal : `User-agent: *`, `Allow: /`, `Sitemap: https://t0sa.github.io/club-genai-home/sitemap-index.xml`
- Note : Astro place `public/robots.txt` à la **racine de `dist/`**, pas sous le chemin `base`. Il sera servi à `https://t0sa.github.io/robots.txt` — ce qui est correct : les crawlers lisent toujours `/robots.txt` depuis la racine du domaine.

**Test scenarios:**
- Happy path : `public/robots.txt` accessible après build à `dist/robots.txt`
- Happy path : l'URL du sitemap dans `robots.txt` pointe vers `sitemap-index.xml` (index généré par `@astrojs/sitemap`)

**Verification:**
- `dist/robots.txt` présent avec le bon contenu après build

---

- [x] **Unit 3 : SEO meta, canonical, JSON-LD et fonts non-bloquantes dans Base.astro**

**Goal:** Ajouter Open Graph, Twitter Card, canonical URL, JSON-LD Organization et rendre Google Fonts non-bloquant.

**Requirements:** R1, R2, R3, R6, R7

**Dependencies:** Aucune.

**Files:**
- Modify: `src/layouts/Base.astro`

**Approach:**

*Canonical & OG/Twitter :*
- Calculer `canonicalURL = new URL(Astro.url.pathname, Astro.site)` dans le frontmatter
- Ajouter `<link rel="canonical" href={canonicalURL} />` après le script anti-FOUC
- Injecter les balises `og:*` et `twitter:*` — `og:image` pointe vers `${Astro.site}/club-genai-home/club-genai-dark.svg` (URL absolue)
- `og:url` = `canonicalURL` ; `og:type` = `website` ; `og:locale` = `fr_FR`
- `og:image` = `new URL('club-genai-dark.svg', canonicalURL).href` — pattern cohérent avec le canonical, évite le double-base si l'implémenteur suit le pattern `${base}` du favicon
- `twitter:card` = `summary_large_image`

*JSON-LD Organization :*
- Bloc `<script type="application/ld+json">` dans `<head>` — Astro ne le transpile pas, aucun `is:inline` nécessaire
- Champs : `name`, `url`, `description`, `logo`, `sameAs` (GitHub user URL + Meetup group URL)
- `logo` = URL absolue vers `club-genai-dark.svg`
- `sameAs` Meetup = URL du groupe (dériver depuis `meetup_url` en configuration, ou hardcoder si stable)
- Importer `config` depuis `src/data/config.json` pour `sameAs github_user`

*Google Fonts non-bloquant :*
- Remplacer le `<link rel="stylesheet">` existant par le pattern preload :
  ```
  rel="preload" as="style" onload="this.onload=null;this.rel='stylesheet'"
  ```
- Ajouter `<noscript>` avec le `<link rel="stylesheet">` original en fallback
- Les `<link rel="preconnect">` existants restent inchangés

*Ordering impératif dans `<head>` :*
1. Script is:inline anti-FOUC (existant — ne pas déplacer)
2. preconnect Google Fonts (existant)
3. canonical
4. OG + Twitter meta
5. JSON-LD script
6. `<link rel="preload" as="style">` Google Fonts + noscript fallback
7. favicon (existant)

**Patterns to follow:**
- Script `is:inline` existant dans `Base.astro` — ne pas déplacer, ne pas encapsuler
- `src/data/config.json` import pattern (voir `src/pages/index.astro`)

**Test scenarios:**
- Happy path : `npm run build && cat dist/index.html | grep og:title` retourne la balise OG
- Happy path : `<link rel="canonical">` présente avec URL `https://t0sa.github.io/club-genai-home/`
- Happy path : `<script type="application/ld+json">` présent et parsable JSON dans `dist/index.html`
- Happy path : le `<link rel="stylesheet">` Google Fonts est absent du HTML rendu (remplacé par preload)
- Happy path : `<noscript>` contient le `<link rel="stylesheet">` Google Fonts fallback
- Edge case : la page s'affiche correctement avec JS désactivé (Inter chargé via noscript)
- Edge case : le script anti-FOUC reste le premier enfant de `<head>` après les modifications

**Verification:**
- `dist/index.html` contient les balises OG, Twitter, canonical, et JSON-LD
- Google PageSpeed Insights ou Lighthouse CLI ne signale plus le font comme render-blocking
- JSON-LD valide via `schema.org/validator` ou Rich Results Test

---

- [x] **Unit 4 : Accessibilité — skip-to-content, aria-hidden logo dupliqué, dimensions img**

**Goal:** Permettre la navigation clavier sans souris (skip link), corriger l'annonce double du logo par les lecteurs d'écran, satisfaire le check CLS de Lighthouse sur les images.

**Requirements:** R8, R9, R10, R11

**Dependencies:** Aucune.

**Files:**
- Modify: `src/layouts/Base.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/components/Nav.astro`

**Approach:**

*Skip-to-content (`Base.astro`) :*
- Premier élément enfant de `<body>` : `<a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 ...">Aller au contenu principal</a>`
- Style : invisible au repos (`sr-only`), visible et positionné en absolu au focus (`focus:not-sr-only`)
- Couleurs Tailwind : fond `terracotta`, texte blanc, contraste ≥ 4.5:1

*Main content target (`index.astro`) :*
- Ajouter `id="main-content"` sur le `<main>` existant (ligne ~16)
- Aucun autre changement sur cette page

*Nav.astro — logo dupliqué :*
- Le dark mode inverse dynamiquement quelle image est visible — un `aria-hidden` statique sur une seule image casserait l'accessibilité en dark mode
- Correction : mettre `alt=""` sur les **deux** `<img>` logo et placer `aria-label="Club GenAI"` sur l'élément `<a>` parent (qui englobe déjà les deux images). Les lecteurs d'écran annoncent alors le lien une seule fois via son `aria-label`, indépendamment du thème.

*Nav.astro — dimensions img :*
- Ajouter `width="40" height="40"` comme attributs HTML natifs sur **les deux** `<img>` logo
- Les classes Tailwind `h-10 w-10` restent (CSS sizing), les attributs HTML évitent le CLS au chargement

**Patterns to follow:**
- Classes Tailwind `sr-only` et `focus:not-sr-only` — nativement disponibles avec Tailwind 3
- Couleurs palette : `bg-terracotta text-white` pour le skip link visible

**Test scenarios:**
- Happy path : appuyer sur Tab depuis le haut de page place le focus sur le skip link et le rend visible
- Happy path : activer le skip link déplace le focus sur `#main-content` en sautant la nav
- Happy path : avec VoiceOver / NVDA, le logo n'est annoncé qu'une seule fois ("Club GenAI logo")
- Happy path : Lighthouse CLI ne signale plus de CLS warning sur les images logo
- Edge case : le skip link n'est pas visible quand le focus est ailleurs (sr-only correct)
- Edge case : skip link fonctionne en dark mode (couleurs contrastées dans les deux thèmes)

**Verification:**
- Navigation clavier Tab → skip link visible → activation → focus sur `<main>`
- Inspection DOM : `aria-hidden="true"` présent sur `<img club-genai-light.svg>`
- Inspection DOM : `width="40" height="40"` sur les deux img logo dans Nav
- Score Lighthouse Accessibilité ≥ 95

## System-Wide Impact

- **Interaction graph:** Aucun callback ou middleware affecté — modifications purement `<head>` et attributs HTML statiques
- **État du sitemap :** `@astrojs/sitemap` crée deux fichiers dans `dist/` à chaque build — pas d'effet sur les autres assets
- **Ordering `<head>` :** le script anti-FOUC `is:inline` doit rester en position 1 — toute insertion avant lui risquerait un FOUC sur le thème sombre
- **`dark:hidden` / `dark:block` + `aria-hidden`** : l'attribut `aria-hidden` est statique dans le HTML, il ne toggle pas avec le thème. C'est correct — la version visible au chargement conserve son alt, la version masquée par défaut est toujours aria-hidden
- **Unchanged invariants :** fonctionnement du toggle dark mode, navigation hamburger, données veille/projets — rien de ce plan ne touche à ces mécanismes

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `@astrojs/sitemap` peer dep incompatible Astro 4 | Vérifier au moment de `npx astro add sitemap` — en pratique la v3 est compatible Astro 4 |
| `Astro.url.pathname` vide en mode dev (`/`) | Normal — le canonical en dev sera `https://t0sa.github.io/` mais le build produira la bonne URL. Tester uniquement post-build |
| Skip link invisible en dark mode | Utiliser des classes Tailwind avec variante `dark:` si le contraste est insuffisant |
| `og:image` SVG ignoré par certains crawlers | Acceptable — décision documentée dans l'origin doc. Amélioration future : générer un PNG |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-11-lighthouse-seo-perf-a11y-requirements.md](docs/brainstorms/2026-04-11-lighthouse-seo-perf-a11y-requirements.md)
- Institutional learning: `docs/solutions/best-practices/astro-anti-fouc-dark-mode-is-inline-2026-04-10.md`
- `@astrojs/sitemap` docs : https://docs.astro.build/en/guides/integrations-guide/sitemap/
- Google Fonts preload pattern : https://web.dev/defer-non-critical-css/
- schema.org Organization : https://schema.org/Organization
