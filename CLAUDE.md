# Club GenAI Home — Guide opérationnel

Site vitrine statique pour le Club GenAI Bordeaux, construit avec Astro 4 et déployé sur GitHub Pages. Les données (meetup, projets, veille) sont stockées dans des fichiers JSON dans `src/data/`, mis à jour automatiquement chaque lundi par GitHub Actions et rendus au moment du build.

## Architecture

```
src/data/config.json    ← édité manuellement (meetup, identité GitHub)
src/data/projects.json  ← généré par .github/scripts/fetch-projects.js
src/data/veille.json    ← généré par .github/scripts/fetch-veille.js
```

Un push sur `main` déclenche le workflow `deploy.yml` qui rebuild et déploie le site sur GitHub Pages.

## Champs de config.json

| Champ | Type | Effet |
|-------|------|-------|
| `meetup_url` | URL HTTPS | Lien du prochain meetup (CTA hero + card Actualités + icône Nav) |
| `meetup_label` | Texte | Texte du bouton CTA dans le hero (ex : `"Meetup GenAI #12 — Agents & RAG"`) |
| `meetup_date` | `YYYY-MM-DD` ou `""` | Date formatée dans la card Actualités ; vide = date masquée |
| `meetup_location` | Texte | Lieu affiché dans la card Actualités |
| `github_user` | Nom d'utilisateur | Compte GitHub dont les repos `club-genai-*` sont listés |
| `github_repo_prefix` | Texte | Préfixe de filtrage des repos (ex : `"club-genai"`) |

## Mettre à jour le lien meetup

Éditer `src/data/config.json` directement dans l'UI GitHub (icône crayon) ou via git :

```json
{
  "meetup_url": "https://www.meetup.com/.../events/12345",
  "meetup_label": "Meetup GenAI #12 — Agents & RAG",
  "meetup_date": "2026-05-15",
  "meetup_location": "SFEIR Bordeaux"
}
```

Le commit déclenche automatiquement `deploy.yml` → site mis à jour en ~2 min.

## Déclencher un refresh des données manuellement

```bash
gh workflow run update-data.yml
```

Le workflow est idempotent : s'il a déjà tourné aujourd'hui (même date UTC), il s'arrête sans rien faire. Pour forcer un refresh le même jour, édite temporairement `src/data/veille.json` en changeant `updated_at` à une date passée avant de relancer.

## Déclencher un rebuild manuel

```bash
gh workflow run deploy.yml
```

Note : un push sur `main` déclenche aussi `deploy.yml` automatiquement. Pas besoin de relancer manuellement après un push.

## Exécuter les scripts localement

Les scripts doivent être lancés depuis la racine du repo. `GITHUB_TOKEN` est recommandé pour éviter le rate-limiting (5000 req/h authentifié vs 60/h anonyme).

```bash
# Projets GitHub
GITHUB_TOKEN=<token> node .github/scripts/fetch-projects.js

# Veille GenAI
GITHUB_TOKEN=<token> node .github/scripts/fetch-veille.js
```

Les scripts écrivent directement dans `src/data/` via un pattern tmp+rename (atomique). Ils ne font rien si le résultat est vide (protection contre le rate-limiting).

## Cron et heure française (DST)

Le workflow `update-data.yml` déclare deux crons :

```yaml
- cron: '0 6 * * 1'  # 7h00 CET  (hiver, UTC+1)
- cron: '0 5 * * 1'  # 7h00 CEST (été,   UTC+2)
```

Cela couvre 7h00 heure française toute l'année sans modifier le workflow à chaque changement d'heure. Un check d'idempotence empêche un double-run lors des semaines de transition (dernier dimanche de mars et dernier dimanche d'octobre).

## Système de thème (dark mode)

Le site supporte un mode sombre optionnel activé par l'utilisateur.

| Élément | Valeur |
|---------|--------|
| Clé localStorage | `theme` |
| Valeurs | `"dark"` ou `"light"` |
| Classe cible | `dark` sur l'élément `<html>` |
| Défaut | light mode (prefers-color-scheme ignoré) |

**Comportement :** au clic sur le toggle (icône lune/soleil dans la Nav), la classe `dark` est ajoutée ou retirée sur `<html>` et le choix est sauvegardé dans `localStorage`. Au chargement suivant, un script `is:inline` dans `<head>` lit `localStorage.getItem('theme')` et applique la classe avant le rendu CSS (anti-FOUC).

**Pour un agent — forcer un thème via Playwright MCP :**

```js
// Activer dark mode (session uniquement, ne persiste pas si localStorage n'est pas écrit)
await page.evaluate(() => {
  document.documentElement.classList.add('dark');
  localStorage.setItem('theme', 'dark');
});

// Revenir en light mode
await page.evaluate(() => {
  document.documentElement.classList.remove('dark');
  localStorage.setItem('theme', 'light');
});
```

Note : `localStorage` est scopé à l'origine (`t0sa.github.io`). Toute modification est persistée pour les navigations suivantes sur le même origin.

## Palette de couleurs (`tailwind.config.mjs`)

### Light theme
| Token Tailwind | Hex | Usage |
|---|---|---|
| `cream` | `#faf9f5` | Fond principal |
| `cream-card` | `#f0ede6` | Fond des cards |
| `charcoal` | `#141413` | Texte principal |
| `stone` | `#b0aea5` | Texte secondaire / muted |
| `sand` | `#e8e6dc` | Bordures / séparateurs |
| `terracotta` | `#d97757` | Accent / CTA |
| `terracotta-dark` | `#b85c3a` | Accent au hover |

### Dark theme
| Token Tailwind | Hex | Usage |
|---|---|---|
| `dark-bg` | `#141210` | Fond principal |
| `dark-card` | `#1e1c18` | Fond des cards |
| `dark-text` | `#f0ede6` | Texte principal |
| `dark-muted` | `#8a8580` | Texte secondaire / muted |
| `dark-border` | `#2d2b26` | Bordures / séparateurs |

L'accent `terracotta` / `terracotta-dark` est partagé entre les deux thèmes.

## Données documentées

- `docs/solutions/` — solutions aux problèmes rencontrés, organisées par catégorie (`runtime-errors/`, `best-practices/`, `ui-bugs/`, `security-issues/`…), avec frontmatter YAML searchable (`module`, `tags`, `problem_type`). Pertinent lors d'une implémentation ou d'un débogage dans une zone documentée.
- `docs/plans/` — plans d'implémentation actifs et archivés
