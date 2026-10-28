# Audit ciblé Node.js - 28 octobre 2026

Le journal GitHub Actions du 27 octobre pour `main` au commit `6c6948084331aadc3348adff47cf0102f1e11d02` atteste `node: v24.21.0` (run `40492638299`, job `122150242872`). Cette version est antérieure au correctif 24.22.1. L'ancien `engines.node >=22.12.0` et la sélection CI `24` ne garantissaient donc pas un moteur corrigé. Ce constat concerne la compilation et les outils, pas une compromission établie.

## Correction minimale

- `.nvmrc` recommande exactement 24.22.1 et la CI lit ce fichier ; elle journalise aussi la version et le chemin du binaire réellement exécuté.
- `engines.node` et le manifeste racine du lockfile acceptent `^22.23.4 || ^24.22.1 || ^26.12.1`. Les versions ultérieures de ces mêmes majeures sont admises ; les majeures impaires et les futures majeures exigent une décision séparée.
- `.npmrc` active `engine-strict=true` : les installations npm ordinaires refusent les moteurs incompatibles. Cela ne remplace pas la sélection du binaire et ne bloque pas à lui seul `npm run` après un changement de Node avec un `node_modules` déjà présent. Sélectionner le moteur puis refaire `npm ci` ; ne pas contourner cette garde avec `--force`.

Aucune dépendance résolue, logique de jeu ou sauvegarde n'est modifiée. La version de `@types/node` représente des types TypeScript, pas le moteur. Le lockfile ne verrouille pas le binaire Node.

## Exposition et publication

`build:pages` produit un paquet statique `dist`, envoyé directement à Cloudflare Pages selon la procédure existante. Les Workers de simulation et présentation s'exécutent dans le navigateur du joueur. Aucun serveur Node de jeu, Pages Function ou serveur PHP n'est identifié dans ce dépôt. Les correctifs Node restent nécessaires sur les postes de développement, en CI, lors des installations HTTPS et sur le poste de publication. La date de compatibilité Wrangler ne choisit pas la version Node.

Ne pas lancer `deploy:pages` pendant la revue : ce script force `--branch main`, même depuis une branche Git dédiée. Cet audit ne fusionne ni ne publie le correctif. La CI existante ne contient pas d'étape de déploiement.

## Validation et limites

Sous Node 24.22.1 : `npm ci` et `npm run build:pages` réussissent. La vérification de la politique utilise le validateur réel `npm-install-checks` avec des versions simulées aux trois frontières ; elle ne constitue pas une exécution sur chaque moteur admis.

`test:quick` donne 31 réussites et 12 échecs dans 43 cas, répartis sur 9 fichiers. Les 12 mêmes noms de tests échouent au commit de base, avec les mêmes dépendances et Node 24.22.1 ; aucun code de simulation n'est modifié ici. Le contrôle documentaire global échoue aussi sur 554 références historiques vers des preuves `tmp/` non versionnées absentes d'une copie propre. Ces 554 lignes sont identiques au témoin, après création dans les deux copies du seul dossier de validation et de son registre vide. Ces limites ne sont pas présentées comme une suite verte et ne sont pas réparées dans ce lot de configuration. Aucun parcours graphique, test de présentation ou déploiement n'est exécuté pour ce changement d'outillage.

## Sources

- [Journal CI observé](https://github.com/Duponch/RimWorld/actions/runs/40492638299)
- [Avis officiel Node.js du 21 octobre](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)
- [Node.js 24.22.1 et composants mis à jour](https://nodejs.org/en/blog/release/v24.22.1)
- [Alerte Render sur les certificats](https://render.com/docs/advisory-emudhra)
