---
date: 2026-04-11
topic: lighthouse-seo-perf-a11y
---

# Lighthouse — SEO, Performance & Accessibilité

## Problem Frame

Le site club-genai-home est un site vitrine statique Astro déployé sur GitHub Pages. Le `<head>` ne contient que les métadonnées minimales (description, title, viewport), sans Open Graph, sans sitemap, ni robots.txt, ni données structurées. Le chargement de Google Fonts est render-blocking et il n'y a pas de lien skip-to-content. L'objectif est d'atteindre des scores Lighthouse élevés (SEO, Performance, Accessibilité) en une seule passe sur une branche dédiée.

## Requirements

**SEO — Métadonnées et indexation**

- R1. Ajouter dans `src/layouts/Base.astro` les balises Open Graph : `og:title`, `og:description`, `og:image` (pointant vers `club-genai-dark.svg`), `og:url` (URL canonique complète), `og:type` (`website`), `og:locale` (`fr_FR`).
- R2. Ajouter les balises Twitter Card : `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`.
- R3. Ajouter `<link rel="canonical">` avec l'URL absolue de la page dans `Base.astro`. L'URL doit être construite comme `new URL(Astro.url.pathname, Astro.site).href` pour obtenir `https://t0sa.github.io/club-genai-home/` — `Astro.site` seul renvoie uniquement l'origin.
- R4. Créer `public/robots.txt` autorisant tous les crawlers et pointant vers le sitemap.
- R5. Produire un sitemap listant la page d'accueil. Approche recommandée : utiliser `@astrojs/sitemap` (intégration Astro officielle, zéro config, compatible `site`/`base`) plutôt qu'un fichier statique manuel dont la `<lastmod>` deviendrait immédiatement périmée.
- R6. Ajouter un bloc JSON-LD `Organization` dans `Base.astro` décrivant le Club GenAI (name, url, logo, description, sameAs GitHub/Meetup).

**Performance — Chargement des ressources**

- R7. Rendre le chargement Google Fonts non-render-blocking. Note : `display=swap` est déjà présent dans le query param de l'URL Google Fonts — ce qui reste bloquant, c'est le `<link rel="stylesheet">`. Le corriger avec le pattern `rel="preload" as="style" onload="this.onload=null;this.rel='stylesheet'"` + `<noscript>` fallback. Les `<link rel="preconnect">` sont déjà en place dans `src/layouts/Base.astro`.
- R8. Ajouter les attributs HTML `width="40" height="40"` sur les balises `<img>` du logo dans `src/components/Nav.astro`. Les classes Tailwind `h-10 w-10` ne suffisent pas pour le score CLS — Lighthouse exige des attributs HTML natifs.

**Accessibilité**

- R9. Ajouter un lien "Aller au contenu principal" (`skip to content`) visible au focus clavier en tête de `src/layouts/Base.astro`, pointant vers `#main-content`.
- R10. Ajouter `id="main-content"` sur le `<main>` dans `src/pages/index.astro`.
- R11. Corriger le double `<img>` logo dans `src/components/Nav.astro` : ajouter `aria-hidden="true"` sur l'img `club-genai-light.svg` (celle avec `class="... hidden dark:block"`) afin que les lecteurs d'écran n'annoncent pas deux fois "Club GenAI logo".

## Success Criteria

- Score Lighthouse SEO ≥ 95 sur la page déployée.
- Score Lighthouse Performance ≥ 90 (mesure en production, pas en dev).
- Score Lighthouse Accessibilité ≥ 95.
- Aucune régression visuelle sur desktop et mobile.
- Le sitemap est valide XML et accessible à l'URL `/club-genai-home/sitemap.xml`.

## Scope Boundaries

- Pas de génération dynamique du sitemap (une seule page — fichier statique suffisant).
- Pas de PWA / manifest.json (hors scope pour ce sprint).
- Pas d'optimisation d'images raster (le site n'en utilise pas).
- Pas de Content Security Policy headers (GitHub Pages ne permet pas les headers personnalisés).

## Key Decisions

- **og:image → SVG existant** : `club-genai-dark.svg` déjà dans `public/` — pas d'asset supplémentaire à créer. Les parseurs OG acceptent les SVG même si certains crawlers les ignorent.
- **Fonts → preload + swap** : Garder Google Fonts CDN (pas d'auto-hébergement) mais rendre le chargement non-bloquant via `font-display: swap` dans le CSS et `<link rel="preload">`.

## Dependencies / Assumptions

- `astro.config.mjs` déclare `site: 'https://t0sa.github.io'` et `base: '/club-genai-home/'` — les URLs absolues sont dérivées de ces valeurs via `Astro.site`.
- Le déploiement se fait sur GitHub Pages à `https://t0sa.github.io/club-genai-home/` — les URLs dans sitemap et canonical doivent respecter ce chemin.

## Outstanding Questions

### Deferred to Planning

- [Affects R6][Needs research] `sameAs` pour GitHub : `config.github_user` est un compte utilisateur (`https://github.com/t0sa`), pas une org. Pour Meetup : l'URL dans `config.meetup_url` pointe vers un event, pas la page du groupe — confirmer l'URL du groupe Meetup à utiliser.
- [Affects R5][Technical] Confirmer la version de `@astrojs/sitemap` compatible avec Astro 4 et vérifier si `base: '/club-genai-home/'` est correctement géré.

## Next Steps

-> `/ce:plan` pour la planification de l'implémentation.
