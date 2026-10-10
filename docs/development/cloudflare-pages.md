# Elsewhere sur Cloudflare Pages

Publication demandée le 10 octobre 2026 pendant le chantier de performances V296. Le nom affiché devient **Elsewhere** ; moteur, règles, qualité et schéma 218 restent inchangés. La première publication porte V295 ; la mise à jour courante contient la [préparation des bâtiments V299](aulnes-performance-v299.md), avec la préparation graphique V296 conservée.

## Adresse et publication

- Projet Pages : `elsewhere`, branche de production `main`.
- Adresse stable attribuée par Cloudflare : <https://elsewhere-cq7.pages.dev/>.
- `npm run build:pages` vérifie TypeScript puis compile le jeu dans `dist/` ; le laboratoire `navigation.html` reste disponible en développement et dans le build historique, mais n’entre pas dans cette publication.
- `npm run deploy:pages` reconstruit puis publie sur la branche de production avec Wrangler 4.149.0, épinglé dans le lockfile.
- Authentification via `wrangler login`, hors dépôt. Permissions utilisées : `account:read`, `user:read`, `pages:write` ; Wrangler ajoute son accès de renouvellement. Aucun jeton dans les fichiers du projet.
- Publication directe des assets compilés. Un push Git ne déclenche pas automatiquement une publication Pages.

Le projet initial a été créé avec `wrangler pages project create elsewhere --production-branch main --force` : dans cette version de Wrangler, ce drapeau choisit explicitement Pages au lieu de la délégation automatique vers Workers. Il n’est pas nécessaire pour les publications suivantes du projet existant.

## Fichiers et compatibilité

Seul `dist/` est publié. Les 63 références publiques et leurs 66 fichiers de catalogue/sauvegarde restent identiques. Les sauvegardes sont des scènes publiques préparées pour le jeu ; aucune partie privée du navigateur n’est envoyée au déploiement.

Le Worker de simulation est compilé dans un fichier hashé et chargé depuis la même origine HTTPS. Il n’y a pas de serveur de simulation Cloudflare : la simulation et le rendu tournent sur la machine du joueur. L’hébergement ne constitue donc pas une optimisation CPU ou GPU.

Le nom visible change dans les titres, menus, HUD, écran de chargement et descriptions de départ. Les clés `lisiere.save.v1`, `lisiere.previous.v1`, la base IndexedDB `lisiere-saves`, le format `lisiere-save`, les chemins d’assets et les textes d’archives restent compatibles. Le navigateur sépare les données par origine : une sauvegarde de localhost ou de l’ancien site n’apparaît pas automatiquement sur Pages. Le catalogue intégré est immédiatement disponible ; le menu permet aussi d’importer un fichier de sauvegarde compatible.

Pages gère son fallback SPA sans règle proxy globale dans `_redirects`, afin de ne pas intercepter scripts, Worker et JSON. Les règles `_headers` n’ajoutent pas de valeurs Cache-Control contradictoires pour les assets UI. Le fallback Netlify historique est conservé dans `netlify.toml`.

## Vérification de la première publication

- Build Pages et typage : PASS, 9,486 s après correction du type de l’entrée Vite ; premier échec conservé.
- Scénarios de départ, codec de sauvegarde et catalogue : 16 cas dans trois fichiers, PASS, 72,302 s.
- Package statique : 239 fichiers, 105 362 885 octets ; plus gros fichier 6 498 033 octets. Les 66 fichiers de sauvegardes/catalogues ont les mêmes SHA-256 dans `public/` et `dist/`. Aucun laboratoire, source map ou secret détecté par la revue ciblée.
- Déploiement Pages : PASS, 15,617 s ; publication `3350805c` et adresse stable accessibles. Les sept fichiers vérifiés sous HTTPS (HTML, favicon, CSS, JS principal, Worker, catalogue et Les Aulnes) répondent 200 avec le MIME attendu et sont identiques au build local, rapport `tmp/elsewhere-pages/http-I2LZpV/report.json`.
- Parcours public dans le navigateur intégré : menu Elsewhere, catalogue, Les Aulnes ouvertes en pause ; ×6 demandé et continuation visible de 15:44 à 18:52, avec production de 35 biocarburants. Sauvegarde manuelle, rechargement complet de la page, sélection de la sauvegarde puis reprise en pause à 18:52, 14 colons et ressources affichées conservés. Aucune erreur/alerte console remontée. Ce contrôle UI n’est ni une comparaison byte-exact de tous les états internes, ni un benchmark ×6/FPS.
- Documentation : PASS, 1,525 s. Les dépendances préexistantes gardent leurs versions ; Wrangler est la seule dépendance directe ajoutée.

Sorties locales de cette livraison sous `tmp/elsewhere-pages/` et `tmp/validation-runs/elsewhere-*`. Le profil V296 lancé avant l’interruption reste dans `tmp/performance-v296/profile/main-8Psn1o` : parcours terminé et recharge 9068 exacte, mais delta de profil négatif interdisant toute attribution CPU. Aucun candidat d’optimisation V296 n’est livré dans cette publication.

## Mise à jour V296

Le 10 octobre, la même adresse stable reçoit la publication `ce930a0c`, contenant les trois modifications graphiques V296 validées. Build Pages et typage : PASS11,359s ; déploiement : PASS15,484s. Vérification HTTPS des sept fichiers : PASS0,718s, réponses 200 et bytes identiques à `dist/`. Les 66 fichiers publics de sauvegarde/catalogue restent identiques au build et le laboratoire est absent. Le Worker de simulation reste inchangé ; seuls le JS principal et son HTML de référence sont nouveaux. Les contrôles graphiques, les quatre sauvegardes/reprises et les gains locaux sont détaillés dans la note V296 ; le parcours UI de première publication n'est pas présenté comme un nouveau test de cette version.

## Publication regroupée V297–V299

V297 et V298 sont des diagnostics sans publication. Après le commit/push produit V299 `c4f4f8ce`, une seule mise à jour reçoit la publication `39a1cdf9`, à la même adresse stable. Build Pages/typage final PASS8,233s ; déploiement PASS13,654s ; contrôle HTTPS PASS0,863s, sept fichiers 200/MIME/bytes identiques à `dist/`, rapport `tmp/elsewhere-pages/http-2Ihv7K/report.json`. Trois fichiers sont envoyés, 234 étaient déjà présents. Les66fichiers de sauvegarde/catalogue sont identiques et le laboratoire est absent. L'avertissement Git dirty de Wrangler correspond au dossier utilisateur non suivi `references_UI`, qui n'est pas publié.

Les contrôles Chrome/compatibilité et les gains V299 sont dans sa note ; la vérification HTTPS n'est pas un nouveau benchmark en ligne ni un nouveau parcours UI. Les mises à jour Pages continuent d'être regroupées ; un push reste indépendant du déploiement.

## Références

[Publication directe Pages](https://developers.cloudflare.com/pages/get-started/direct-upload/), [priorité des redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [fallback SPA](https://developers.cloudflare.com/pages/configuration/serving-pages/), [en-têtes](https://developers.cloudflare.com/pages/configuration/headers/).
