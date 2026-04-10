---
title: "feat: enrich veille sources — HuggingFace, Google AI, Nvidia, Ars Technica + GitHub quality filter"
type: feat
status: active
date: 2026-04-10
origin: docs/brainstorms/2026-04-10-veille-sources-requirements.md
---

# feat: enrich veille sources — HuggingFace, Google AI, Nvidia, Ars Technica + GitHub quality filter

## Overview

La section Veille passe de 3 à 7 sources RSS et filtre désormais les repos GitHub pour ne garder que ceux avec ≥ 50 étoiles créés dans les 7 derniers jours (élan fort). La capacité totale passe de 15 à 20 items. Quatre nouveaux badges source sont ajoutés côté frontend. L'ordre d'affichage reste chronologique, aucun changement de comportement utilisateur.

## Problem Frame

Seuls OpenAI, Google DeepMind et Meta AI sont couverts actuellement. Les repos GitHub affichés peuvent avoir 0 étoiles. L'enrichissement des sources améliore la diversité et la qualité de la veille sans changer la philosophie d'affichage. (see origin: docs/brainstorms/2026-04-10-veille-sources-requirements.md)

## Requirements Trace

- R1. Ajouter HuggingFace Blog comme source RSS
- R2. Ajouter Google AI Blog (label `"Google AI"`, distinct de `"Google"` = DeepMind)
- R3. Ajouter Nvidia Developer Blog (URL à vérifier — voir Open Questions)
- R4. Ajouter Ars Technica Tech Lab
- R5. Conserver OpenAI, DeepMind (`"Google"`), Meta AI
- R6. Requête GitHub : ajouter `stars:>50` au filtre `created:>7days`
- R7. Tri stars décroissant + limite 5 repos conservés
- R8. Ordre d'affichage chronologique inchangé côté frontend
- R9. MAX_TOTAL : 15 → 20
- R10. Quatre nouveaux badges SOURCE_CLASSES dans VeilleGenAI.astro

## Scope Boundaries

- Pas de scoring, pas de random shuffle, pas d'AMD
- Le seuil `stars:>50` est codé en dur dans la requête — pas dans config.json
- MAX_PER_SOURCE reste à 5 par source
- Anthropic : badge déjà présent dans SOURCE_CLASSES, source RSS absente → inchangé

### Deferred to Separate Tasks

- Scoring/ranking par pertinence : future itération
- AMD : à réévaluer si flux RSS fiable identifié
- Filtre mot-clé Ars Technica : si le contenu s'avère trop généraliste en pratique, filtrer en post-processing dans une prochaine itération

## Context & Research

### Relevant Code and Patterns

- `.github/scripts/fetch-veille.js` — `RSS_SOURCES` : tableau `{ url, source }` ; `fetchRSS(url, source)` réutilisable tel quel pour chaque nouvelle entrée ; `MAX_TOTAL` à changer ligne `const MAX_TOTAL = 15`
- `.github/scripts/fetch-veille.js` — `fetchGitHubTrending()` : URL construite avec `?q=topic:generative-ai+topic:llm+created:>${since}` → ajouter `+stars:>50` avant `&sort=stars`
- `src/components/VeilleGenAI.astro` — `SOURCE_CLASSES` Record : 5 entrées existantes avec dark: variants suivant le pattern `bg-{color}-50 text-{color}-700 border-{color}-200 dark:bg-{color}-900/30 dark:text-{color}-300 dark:border-{color}-800`
- Source `"Google"` (badge bleu) = DeepMind → inchangée. Nouveau label `"Google AI"` = Google AI Blog → même palette bleue

### Institutional Learnings

- `docs/solutions/security-issues/xss-javascript-uri-rss-feed-url-validation-2026-04-10.md` — tout nouveau flux RSS doit passer par `safeUrl()` avant stockage ; c'est déjà le cas dans `fetchRSS()` (la fonction existante applique `safeUrl` sur tous les liens extraits)

## Key Technical Decisions

- **Label `"Google AI"` distinct de `"Google"`** : `"Google"` est le label DeepMind existant dans `RSS_SOURCES` et `SOURCE_CLASSES`. Si on changeait en `"DeepMind"`, tous les badges existants en veille.json deviendraient sans badge couleur. Séparation propre : `"Google"` = DeepMind, `"Google AI"` = blog.google/technology/ai.
- **`stars:>50` codé en dur** : pas dans config.json pour cette itération — simple à changer dans la requête si le seuil doit évoluer.
- **MAX_TOTAL = 20** : 7 sources × 5 items max = 35 articles + 5 repos = 40 candidats → tranché à 20. Garde une diversité satisfaisante sans alourdir la page.

## Open Questions

### Deferred to Implementation

- **[Affects R3] Nvidia RSS URL** : `https://developer.nvidia.com/blog/feed/` est supposée valide. Vérifier avec `curl -I` ou fetch avant d'intégrer. Si 404, tester `https://blogs.nvidia.com/feed/` ou supprimer la source et signaler.
- **[Affects R4] Contenu Ars Technica** : si le feed tech-lab s'avère trop généraliste (gaming, semiconducteurs hors IA), filtrer les items sur des mots-clés (`AI`, `LLM`, `machine learning`) en post-processing dans `fetchRSS` pour cette source spécifiquement.

## Implementation Units

- [ ] **Unit 1: Nouvelles sources RSS + filtre GitHub dans fetch-veille.js**

**Goal:** Ajouter 4 sources RSS, mettre à jour la requête GitHub avec filtre étoiles, augmenter MAX_TOTAL.

**Requirements:** R1, R2, R3, R4, R5, R6, R7, R9

**Dependencies:** Aucune

**Files:**
- Modify: `.github/scripts/fetch-veille.js`
- Test: `test/scripts/fetch-veille.test.js` *(tests des fonctions pures — pas de nouveaux tests nécessaires si `cleanText`, `parseISODate`, `safeUrl` ne changent pas)*

**Approach:**
- Ajouter 4 entrées dans `RSS_SOURCES` dans cet ordre : HuggingFace, Google AI, Nvidia, Ars Technica
- Changer `MAX_TOTAL` de `15` à `20`
- Dans la fonction `fetchGitHubTrending`, modifier la query string en ajoutant `+stars:>50` après `topic:llm` et avant `&sort=stars`
- Vérifier l'URL Nvidia en local avec un fetch rapide avant de committer
- Si Nvidia est inaccessible : commenter la source avec une note et créer un issue pour suivi

**Patterns to follow:**
- Structure exacte de `RSS_SOURCES` : `{ url: '...', source: '...' }` — les labels doivent correspondre exactement aux clés de SOURCE_CLASSES dans VeilleGenAI.astro
- `fetchRSS` est déjà appliquée à chaque entrée via `Promise.all(RSS_SOURCES.map(s => fetchRSS(s.url, s.source)))` — aucun autre changement nécessaire dans `main()`

**Test scenarios:**
- Happy path: lancer le script localement — veille.json contient des items avec `source: "Hugging Face"`, `source: "Google AI"`, `source: "Nvidia"` (si RSS valide), `source: "Ars Technica"` et un total ≤ 20 items
- Edge case: source Nvidia retourne une erreur HTTP → le `console.warn` existant s'affiche, les autres sources continuent, aucune exception non gérée
- Edge case: requête GitHub avec `stars:>50` retourne 0 résultats cette semaine → repos absents, articles seuls dans veille.json, écriture normale (> 0 items au total)
- Edge case: aucun repo avec ≥ 50 étoiles créé dans les 7 derniers jours ET < 1 article récupéré → skip write (comportement existant inchangé)

**Verification:**
- `node .github/scripts/fetch-veille.js` (avec GITHUB_TOKEN) → `src/data/veille.json` contient ≤ 20 items, plusieurs sources distinctes représentées
- Aucun item avec `url: ""` (safeUrl filtre les URLs invalides)
- `npm test` passe (fonctions pures non modifiées)

---

- [ ] **Unit 2: Badges nouveaux sources dans VeilleGenAI.astro**

**Goal:** Ajouter les 4 entrées manquantes dans SOURCE_CLASSES pour que les nouveaux badges s'affichent correctement en light et dark mode.

**Requirements:** R10

**Dependencies:** Unit 1 (définit les labels exacts à utiliser)

**Files:**
- Modify: `src/components/VeilleGenAI.astro`

**Approach:**
- Ajouter 4 entrées dans le `SOURCE_CLASSES` Record en respectant le pattern exact `bg-{color}-50 text-{color}-700 border-{color}-200 dark:bg-{color}-900/30 dark:text-{color}-300 dark:border-{color}-800` :
  - `'Hugging Face'` → jaune (`yellow`)
  - `'Google AI'` → bleu (`blue`) — même palette que `'Google'` existant
  - `'Nvidia'` → vert (`green`)
  - `'Ars Technica'` → amber
- Le label doit correspondre exactement à la valeur `source` dans `RSS_SOURCES` (casse incluse)

**Patterns to follow:**
- Toutes les entrées existantes dans SOURCE_CLASSES : même format 6-classes (3 light + 3 dark)
- `'Google'` existant (bleu) : `bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800` → `'Google AI'` reprend la même valeur

**Test scenarios:**
- Test expectation: none — changement purement stylistique. Vérifier visuellement en preview (`npm run preview`) que les badges apparaissent avec les bonnes couleurs.
- Happy path: `npm run build` passe sans erreur (Tailwind scanne le fichier .astro et inclut toutes les classes `bg-yellow-50`, `dark:bg-yellow-900/30`, etc.)

**Verification:**
- `npm run build` passe
- Ouvrir `npm run preview` et inspecter manuellement un item de chaque nouvelle source → badge de la bonne couleur visible en light et dark mode

## System-Wide Impact

- **Interaction graph:** Le script `fetch-veille.js` est appelé par `deploy.yml` (à chaque push) et `update-data.yml` (cron quotidien 7h FR). Aucun changement de déclencheur.
- **Unchanged invariants:** `fetchRSS(url, source)` n'est pas modifiée — les fonctions pures (`cleanText`, `parseISODate`, `safeUrl`) restent identiques. Les 33 tests unitaires existants continuent de passer.
- **State lifecycle risks:** Si la requête GitHub `stars:>50` ne retourne aucun repo, le tableau repos est vide mais `items` (articles seuls) reste > 0 → l'écriture atomique fonctionne normalement.
- **Ars Technica content risk:** Le feed tech-lab peut contenir du contenu non-IA. Impact : quelques items hors-sujet dans la veille. Mitigation différée à une future itération.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Nvidia RSS URL invalide | Vérifier avant commit ; si 404, commenter la source et créer un issue de suivi |
| Ars Technica trop généraliste | Accepté pour cette itération ; filtre mot-clé différé |
| Tailwind ne trouve pas les nouvelles classes de badge | Les classes sont dans .astro scanné par le content glob — aucun risque si le fichier est dans `src/` |
| 7 sources → délai fetch plus long | Toutes les requêtes sont en `Promise.all` avec timeout 12s chacune — parallèle, délai total inchangé |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-10-veille-sources-requirements.md](docs/brainstorms/2026-04-10-veille-sources-requirements.md)
- Related code: `.github/scripts/fetch-veille.js`, `src/components/VeilleGenAI.astro`
- Institutional learning: `docs/solutions/security-issues/xss-javascript-uri-rss-feed-url-validation-2026-04-10.md` — safeUrl() est déjà appliqué sur tous les liens RSS
