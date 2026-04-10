---
date: 2026-04-10
topic: dark-mode
---

# Dark Mode — Club GenAI Home

## Problem Frame

Le site est actuellement 100 % light mode. L'objectif est d'offrir un mode sombre optionnel, activé explicitement par l'utilisateur via un toggle, cohérent avec la Direction Artistique Anthropic-inspired existante — palette chaude, sans tons bleu-gris froids. Le mode light reste l'expérience par défaut et maîtrisée ; le dark mode est une option de confort personnalisable, non une adaptation automatique aux préférences système.

Maquettes disponibles : Stitch project `15034475254751730230`, screens "Club GenAI - Home" (light + toggle visible) et "Club GenAI - Home (Dark Mode)".

## Requirements

**Palette dark mode**
- R1. Le dark mode utilise une palette chaude dérivée de la DA actuelle, sans tons froids :
  - `dark-bg` : `#141210` — fond principal
  - `dark-card` : `#1e1c18` — fond des cartes
  - `dark-text` : `#f0ede6` — texte principal (cream light devient texte)
  - `dark-muted` : `#8a8580` — texte secondaire
  - `dark-border` : `#2d2b26` — bordures
  - Accent terracotta `#d97757` / hover `#b85c3a` : **inchangés** dans les deux modes
- R2. Toutes les sections (Nav, Hero, Actualités, Projets, Veille, Footer) ont des variantes dark cohérentes avec la palette ci-dessus.

**Toggle button**
- R3. Un bouton de bascule est ajouté dans la Nav, entre le lien "Veille" et l'icône Meetup.
- R4. Le bouton affiche une icône **lune** en mode light (indique qu'on peut passer en dark) et une icône **soleil** en mode dark (indique qu'on peut revenir en light).
- R5. La taille, le style et le comportement hover du bouton sont identiques aux icônes sociales existantes (h-5 w-5, `text-stone`, `hover:text-terracotta`).
- R6. Le bouton est accessible : attribut `aria-label` dynamique — `"Passer en mode sombre"` en light mode, `"Passer en mode clair"` en dark mode.

**Persistance et comportement**
- R7. Le choix de l'utilisateur est sauvegardé dans `localStorage` (clé : `theme`). Les opérations `getItem` / `setItem` sont enveloppées dans un `try/catch` pour tolérer les environnements où localStorage est restreint (navigation privée, policies navigateur) sans bloquer le rendu.
- R8. Au chargement de la page, le mode sauvegardé est appliqué avant le premier paint via un script inline dans `<head>` (pas de flash). Si aucun choix n'est sauvegardé ou si localStorage est inaccessible, le site s'ouvre en mode **light**.
- R9. Le basculement est instantané (pas d'animation de transition obligatoire — optionnel si simple à ajouter).
- R10. La préférence système (`prefers-color-scheme`) n'est **pas** consultée — le site commence toujours en light en l'absence de choix explicite.

## Success Criteria

- Basculer de light en dark et inversement sans rechargement de page.
- Recharger la page conserve le dernier mode choisi.
- Les cartes, textes, bordures et icônes sont lisibles dans les deux modes.
- L'accent terracotta reste identique dans les deux modes.
- Aucun flash de contenu non stylé (FOUC) au chargement en dark mode.

## Scope Boundaries

- Pas de détection automatique de la préférence système (`prefers-color-scheme`).
- Pas d'animation de transition entre les modes (transition CSS optionnelle, non bloquante).
- Pas de thème supplémentaire (pas de "high contrast", pas de mode sépia).
- Le design du toggle suit la maquette Stitch ; pas de redesign de la Nav.

## Key Decisions

- **Palette chaude uniquement** : les valeurs dark ont des sous-tons bruns/orange pour maintenir la cohérence DA. Aucune valeur grise froide ou bleue.
- **Default : toujours light** : l'expérience de marque est maîtrisée. La préférence système (`prefers-color-scheme`) est délibérément ignorée — le dark mode est un choix explicite, pas une adaptation automatique.
- **Toggle dans la Nav** : emplacement le plus visible et cohérent avec les conventions de design actuelles.
- **Lune/soleil** : iconographie universelle et immédiatement compréhensible sans label textuel.

## Dependencies / Assumptions

- Tailwind v3 est déjà configuré avec `darkMode: 'class'` ou ce doit être ajouté (à vérifier en planning).
- Le script anti-FOUC doit s'exécuter dans le `<head>` avant tout CSS (inline script ou module bloquant).

## Outstanding Questions

### Deferred to Planning

- [Affects R8][Technical] Emplacement du script anti-FOUC dans `src/layouts/Base.astro` : doit être un `<script>` inline synchrone dans `<head>`, avant tout CSS. À vérifier que le output Astro (`static`) le permet sans defer automatique.
- [Affects R2, R5, R9][Technical — load-bearing] Stratégie dark mode : **classe `dark` sur `<html>` avec variantes `dark:` Tailwind** (recommandée pour rester dans le système de tokens existant) **ou CSS custom properties** (alternative si les variantes `dark:` génèrent trop de classes). Ce choix conditionne la réécriture de tous les composants — à trancher en début de planning avant de toucher les fichiers.

## Next Steps

-> `/ce:plan` pour structurer l'implémentation.
