# Club GenAI Home

[![Deploy to GitHub Pages](https://github.com/t0sa/club-genai-home/actions/workflows/deploy.yml/badge.svg)](https://github.com/t0sa/club-genai-home/actions/workflows/deploy.yml)
[![Update data](https://github.com/t0sa/club-genai-home/actions/workflows/update-data.yml/badge.svg)](https://github.com/t0sa/club-genai-home/actions/workflows/update-data.yml)

Site vitrine du **[Club GenAI Bordeaux](https://www.meetup.com/groupe-meetup-bordeaux-developpement-web/)** — communauté autour de l'IA générative. Meetups, projets open source et veille GenAI.

**→ [t0sa.github.io/club-genai-home](https://t0sa.github.io/club-genai-home/)**

---

## Stack

| Couche | Technologie |
|--------|-------------|
| Framework | [Astro 4](https://astro.build) — génération statique |
| Style | [Tailwind CSS v3](https://tailwindcss.com) — palette Anthropic-inspired, dark mode |
| Hosting | GitHub Pages via GitHub Actions |
| Données | Fichiers JSON dans `src/data/`, mis à jour automatiquement |

## Fonctionnalités

- **Actualités** — lien du prochain meetup, configurable dans `src/data/config.json`
- **Projets GitHub** — repos `club-genai-*` récupérés via l'API GitHub, affichage paginé
- **Veille GenAI** — articles OpenAI, Google DeepMind, Meta AI + repos GitHub trending, mis à jour chaque lundi à 7h (heure française)
- **Dark mode** — toggle lune/soleil, persistance localStorage, anti-FOUC

## Développement local

```bash
git clone https://github.com/t0sa/club-genai-home.git
cd club-genai-home
npm install
npm run dev        # http://localhost:4321
```

```bash
npm run build      # build statique → dist/
npm test           # tests unitaires (node:test)
```

## Mettre à jour le contenu

### Lien meetup

Éditer `src/data/config.json` directement sur GitHub ou en local :

```json
{
  "meetup_url": "https://www.meetup.com/.../events/12345",
  "meetup_label": "Meetup GenAI #12 — Agents & RAG",
  "meetup_date": "2026-05-15",
  "meetup_location": "SFEIR Bordeaux"
}
```

Un push sur `main` déclenche le rebuild automatiquement.

### Données (projets + veille)

Les données sont rafraîchies chaque **lundi à 7h (heure française)** par GitHub Actions. Pour forcer un refresh :

```bash
gh workflow run update-data.yml
```

## Structure

```
src/
  data/           ← JSON mis à jour par GitHub Actions
  components/     ← Nav, Hero, Actualites, ProjectList, VeilleGenAI, Footer, ThemeToggle
  layouts/        ← Base.astro (anti-FOUC, dark mode)
  pages/          ← index.astro
.github/
  scripts/        ← fetch-projects.js, fetch-veille.js
  workflows/      ← deploy.yml, update-data.yml
docs/
  solutions/      ← solutions documentées (bugs, best practices)
  plans/          ← plans d'implémentation
```

## Licence

MIT
