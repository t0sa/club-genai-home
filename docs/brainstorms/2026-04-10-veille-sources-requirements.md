---
date: 2026-04-10
topic: veille-sources
---

# Veille GenAI — Enrichissement des sources et filtrage des repos

## Problem Frame

La section Veille affiche actuellement 3 sources RSS (OpenAI, Google DeepMind, Meta AI) et 5 repos GitHub créés la semaine passée, sans filtre de qualité. Les visiteurs voient parfois des repos avec 0 étoiles ou des sources redondantes. L'objectif est d'élargir la couverture avec des sources pertinentes, et de ne montrer que les repos GitHub qui ont déjà prouvé un engouement rapide.

## Requirements

**Nouvelles sources RSS**
- R1. Ajouter **Hugging Face Blog** (`https://huggingface.co/blog/feed.xml`) comme source d'articles.
- R2. Ajouter **Google AI Blog** (`https://blog.google/technology/ai/rss/`) comme source distincte de Google DeepMind — labellisée `"Google AI"`.
- R3. Ajouter **Nvidia Developer Blog** (`https://developer.nvidia.com/blog/feed/`) — labellisé `"Nvidia"`. URL à vérifier lors de l'implémentation.
- R4. Ajouter **Ars Technica Tech Lab** (`https://feeds.arstechnica.com/arstechnica/technology-lab`) — labellisé `"Ars Technica"`.
- R5. Conserver les 3 sources existantes : OpenAI, Google DeepMind, Meta AI.

**Filtrage des repos GitHub**
- R6. Modifier la requête GitHub pour n'inclure que les repos créés dans les 7 derniers jours ET ayant déjà au moins **50 étoiles** (`stars:>50+created:>7days`). Ce seuil qualifie un "élan fort" pour un repo très récent.
- R7. Conserver le tri par étoiles décroissant et la limite de 5 repos.

**Affichage**
- R8. L'ordre d'affichage dans la grille reste **chronologique** (le plus récent en haut) — pas de changement côté frontend.
- R9. Augmenter `MAX_TOTAL` de 15 à **20** pour accommoder les nouvelles sources sans dégrader la diversité.

**Badges sources (VeilleGenAI.astro)**
- R10. Ajouter les entrées de couleur pour les nouvelles sources dans `SOURCE_CLASSES` :
  - `"Hugging Face"` — badge jaune (couleur HF : `bg-yellow-50 text-yellow-700 border-yellow-200` + dark variants)
  - `"Nvidia"` — badge vert (`bg-green-50 text-green-700 border-green-200` + dark variants)
  - `"Ars Technica"` — badge amber (`bg-amber-50 text-amber-700 border-amber-200` + dark variants)
  - `"Google AI"` — badge bleu clair (même palette que "Google" existant)

## Success Criteria

- La veille affiche des articles de 7 sources distinctes (OpenAI, DeepMind, Meta AI, HuggingFace, Google AI, Nvidia, Ars Technica).
- Aucun repo GitHub avec moins de 50 étoiles n'apparaît.
- Les 4 nouveaux badges source s'affichent correctement en light et dark mode.
- `npm test` passe (les fonctions pures ne sont pas modifiées).
- `npm run build` passe sans erreur.

## Scope Boundaries

- Pas de scoring ou ranking — l'ordre reste chronologique.
- Pas de random shuffle — décision reportée à une itération future si nécessaire.
- Pas de AMD (pas de flux RSS fiable identifié).
- Le seuil `stars:>50` est fixe — pas de configuration dans `config.json` pour cette itération.
- Les articles de veille n'ont pas de champ de score ajouté au JSON.

### Deferred to Separate Tasks

- Scoring/ranking par pertinence : une itération future si les visiteurs demandent "les meilleurs articles" plutôt que "les plus récents"
- Affichage aléatoire (random shuffle) : non retenu pour ce cycle
- AMD : à réévaluer si un flux RSS fiable est trouvé (blog.amd.com, ROCm blog)
- Anthropic : badge déjà codé dans VeilleGenAI.astro, source à ajouter quand un flux officiel existe

## Dependencies / Assumptions

- Les URLs RSS des nouvelles sources doivent être vérifiées fonctionnelles lors de l'implémentation (tester `curl -I` ou fetch en local).
- Le flux Nvidia Developer (`developer.nvidia.com/blog/feed/`) est supposé exister — à confirmer.
- La catégorie de contenu Ars Technica (tech-lab) est orientée infrastructure/IA ; si trop généraliste, filtrer les items par mot-clé en post-processing (à décider en implémentation).

## Next Steps

→ `/ce:plan` pour structurer l'implémentation (fetch-veille.js + VeilleGenAI.astro).
