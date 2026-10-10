# Elsewhere sur Cloudflare Pages

Publication demandée le 10 octobre 2026 pendant le chantier de performances V296. Le nom affiché devient **Elsewhere**. La première publication porte V295 ; la mise à jour courante contient les visuels V304, la préparation V305 et les [corrections d’herbe/HUD et préférences V306](../gameplay/presentation-controls-v306.md), schéma219 conservé.

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

## Publication V300 demandée immédiatement

Le 10 octobre, après le commit/push produit `8af919f9`, l'utilisateur demande explicitement de publier maintenant. La publication `155770bd` contient V300 à la même [adresse stable](https://elsewhere-cq7.pages.dev/) et à son [URL de publication](https://155770bd.elsewhere-cq7.pages.dev/). Build Pages/typage PASS 8,132 s ; déploiement PASS 14,007 s, trois fichiers envoyés et 234 déjà présents. L'avertissement de travail Git non suivi concerne `references_UI`, qui n'entre pas dans `dist/`.

Contrôle HTTPS PASS 3,159 s : `/`, HTML, favicon, CSS, JS principal, Worker, catalogue et Les Aulnes sur les deux origines, soit 16 réponses 200 avec les MIME et octets attendus. Rapport `tmp/elsewhere-pages/v300-http-6VGRW2/report.json`. Les 63 références/66 fichiers sont identiques entre `public/` et le package, laboratoire et sources privés absents ; package et sauvegardes ne changent pas pendant les contrôles. Le Worker conserve son hash V299. Les 66 sauvegardes distantes ne sont pas toutes téléchargées par ce contrôle ; aucun nouveau parcours de jeu en ligne ni benchmark n'est revendiqué. Les contrôles Chrome V300 sont dans sa note.

Les futures publications restent regroupées, sauf demande explicite de publication immédiate. Un commit/push documentaire consécutif à cette livraison ne déclenche pas un second déploiement. La relance planifiée reste en pause.

## Publication V301 après les zones et filtres de stockage

Le 10 octobre, après le commit/push produit `92805fc5`, la publication `b9f77397` reçoit V301 à la même [adresse stable](https://elsewhere-cq7.pages.dev/) et à son [URL de publication](https://b9f77397.elsewhere-cq7.pages.dev/). Build Pages et typage du package final PASS8,812s ; inspection locale PASS0,739s,239fichiers/105420927octets,63références/66fichiers de catalogue et sauvegarde identiques à `public/`, laboratoire et sources privés absents. Déploiement PASS14,376s : quatre fichiers envoyés et233déjà présents. Le JS principal, CSS, Worker et HTML sont nouveaux ; le schéma219 du jeu est appliqué par migration à la lecture des références218 conservées. L’avertissement Git dirty concerne seulement le dossier utilisateur `references_UI`, exclu du package.

La vérification HTTPS passe en2,216s : huit chemins sur les origines stable et fraîche, soit16réponses200/MIME/octets exacts, rapport `tmp/elsewhere-pages/v301-http-lA6ocl/report.json`. Package et sauvegardes restent inchangés pendant cette vérification. Les contrôles du jeu, de ses filtres, de la reprise et des shaders sont dans la note V301 ; le contrôle HTTPS ne prétend pas rejouer le navigateur en ligne ou mesurer ses performances. Les66fichiers distants ne sont pas tous téléchargés. Un commit/push documentaire consécutif enregistre les preuves et ne déclenche pas une deuxième publication ; la relance planifiée reste en pause.

## Publication V302 demandée pendant V303

À la demande immédiate de l'utilisateur, le commit V302 `98265ef9` est publié en `81c1e74d`, à la même [adresse stable](https://elsewhere-cq7.pages.dev/) et à son [URL de publication](https://81c1e74d.elsewhere-cq7.pages.dev/). La compilation utilise une archive Git isolée de ce commit sous `tmp/elsewhere-pages/v302-source-98265ef9` ; le candidat V303 non validé dans l'arbre de travail reste exclu. Aucun fichier de travail n'est remplacé pour cette publication.

Build Pages/typage PASS9,168s ; package PASS0,862s,239fichiers/105422928octets et66fichiers publics exacts, laboratoire et sources privés absents. Déploiement PASS13,582s : quatre fichiers envoyés et233déjà présents. L'avertissement Git dirty concerne l'arbre parent contenant le candidat V303 et `references_UI`, absents du package isolé. La vérification HTTPS initiale FAIL1,018s reste conservée : `/` exact, mais la redirection `/index.html` retourne encore l'ancien HTML. Une nouvelle vérification après propagation PASS2,272s acquiert16réponses200/MIME/octets exacts sur les origines stable et fraîche, rapport `tmp/elsewhere-pages/v302-http-7JWLy9/report.json` ; package/publics restent inchangés. Les contrôles natifs V302 sont dans sa note ; aucun nouveau benchmark ou parcours de jeu en ligne n'est revendiqué. Aucun second déploiement pour le commit documentaire ; V303 reste un lot en cours autorisé, à publier après validation.

## Publication V303 après les corrections de carte

Le commit produit `0382e142` est commité et poussé, puis publié en `ad46371a` à la demande explicite de l’utilisateur : [adresse stable](https://elsewhere-cq7.pages.dev/) et [URL de publication](https://ad46371a.elsewhere-cq7.pages.dev/). Le build Pages final avec typage passe en8,110s. Package PASS1,017s :239fichiers/105438559octets,63références/66fichiers publics identiques, laboratoire et sources privés absents ; rapport `tmp/elsewhere-pages/v303-package-kh92It/report.json`. Déploiement PASS12,693s, quatre fichiers nouveaux et233 déjà présents. L’avertissement Git dirty concerne uniquement le dossier utilisateur `references_UI`, exclu du package.

Les huit chemins HTML/assets/Worker/catalogue/Aulnes sont vérifiés sur les deux origines :16réponses200 avec MIME et octets exacts, PASS2,549s, rapport `tmp/elsewhere-pages/v303-http-vAuojR/report.json` (SHA59BD2E2F). Package et publics restent inchangés pendant cette vérification. Les contrôles de jeu, captures, shaders et reprises sont ceux de la note V303 ; la vérification HTTPS ne constitue pas un nouveau parcours navigateur en ligne ni un benchmark. Le commit/push documentaire qui enregistre ces preuves ne déclenche pas une deuxième publication. Relance planifiée en pause, aucun lot suivant engagé.

## Publication V304 après la refonte visuelle

Le commit produit `6815b9db6686a6d92e16a63310daf5fc4652abec` est poussé, puis publié en `83641821` : [adresse stable](https://elsewhere-cq7.pages.dev/) et [URL de publication](https://83641821.elsewhere-cq7.pages.dev/). Typage final PASS11,760s et build Pages PASS2,429s. Package PASS1,263s :469fichiers/106916307octets,230nouveauxSVG identiques à `public/`,63références/66fichiers de sauvegardes et catalogue exacts, laboratoire et sources privés absents ; rapport `tmp/elsewhere-pages/v304-package-eNK4mS/report.json`.

Déploiement PASS14,526s :233fichiers envoyés et234 déjà présents, plus `_headers` et `_redirects`. L'avertissement Git dirty concerne uniquement `references_UI`, absent du commit et du package. Vérification HTTPS PASS4,031s : HTML, favicon, CSS, JS, Worker, catalogue, Aulnes et douze portraits/atlases/actions sur les deux origines, soit40réponses200 avec MIME et octets exacts. Rapport `tmp/elsewhere-pages/v304-http-4NTkPe/report.json`, SHA `DD199535` ; package/publics inchangés pendant la vérification. Les66fichiers distants ne sont pas tous téléchargés.

Les interactions, recharges, pixels WebGPU/WebGL et le coût réel de la refonte sont décrits dans la [note V304](../gameplay/visual-identity-v304.md). Le contrôle HTTPS ne constitue pas un nouveau benchmark ou parcours de jeu en ligne. Le commit documentaire consécutif ne déclenche pas de deuxième publication ; la relance reste en pause.

## Publication regroupée V305

Après le commit/push produit `ecbe76a7`, une publication unique `b0243966` regroupe les corrections de préparation et d’horloges graphiques : [adresse stable](https://elsewhere-cq7.pages.dev/) et [URL de publication](https://b0243966.elsewhere-cq7.pages.dev/). Typage PASS6,470s et build Pages PASS2,129s ; sources inchangées entre cette compilation et la publication. Package PASS2,198s :469fichiers/106920817octets,230SVG V304 et63références/66fichiers publics exacts, laboratoire et sources privés absents ; rapport `tmp/elsewhere-pages/v305-package-eNUpnE/report.json`.

Déploiement PASS15,528s : trois fichiers envoyés,464déjà présents, plus les en-têtes et redirections. L’avertissement Git dirty concerne `references_UI` et une métadonnée locale de BoxBatches ; ce dernier fichier a exactement le même blob Git `3106d8c1` que HEAD et n’a pas été modifié par le commit. Aucun de ces fichiers privés n’est publié.

Vérification HTTPS PASS3,347s,40réponses200/MIME/octets exacts sur les origines stable et fraîche : HTML, favicon, CSS, JS, Worker, catalogue, Aulnes et douze icônes/atlases/portraits. Rapport `tmp/elsewhere-pages/v305-http-ShKc3R/report.json`, package/publics inchangés pendant le contrôle. Les66fichiers distants ne sont pas tous téléchargés. Contrôles du jeu, gains et limites dans la note V305 ; cette vérification ne constitue pas un benchmark en ligne. Aucun second déploiement pour le commit documentaire, relance planifiée en pause.

## Publication regroupée V306

Le commit produit `a012cf32186a0bf755b35c8420bfc16625197ef9` est poussé puis publié en `05e05a28` : [adresse stable](https://elsewhere-cq7.pages.dev/) et [publication](https://05e05a28.elsewhere-cq7.pages.dev/). Build Pages et typage PASS14,623s ; package PASS1,862s,489fichiers/108427964octets,230SVG et six fontes exacts,63références/66fichiers de sauvegarde/catalogue identiques. La reprise de contrôle admet le seul README public de provenance des fontes, à bytes exacts ; le rouge de l’interdiction générique Markdown reste conservé.

Déploiement PASS13,574s :23fichiers envoyés,464déjà présents, puis en-têtes et redirections. Git dirty concerne seulement le dossier utilisateur `references_UI`, absent du commit et du package. Vérification HTTPS PASS3,655s :52réponses200/MIME/bytes exacts sur les origines stable et fraîche, incluant six TTF ; rapport `tmp/elsewhere-pages/v306-http-nP2cgJ/report.json`, SHA `809CA23E`, package et publics inchangés. Tous les66fichiers distants ne sont pas téléchargés par ce contrôle.

Les préférences, shaders, surfaces, sauvegarde/reprise et l’impact GAME sont détaillés dans la note V306. Le test réseau n’est pas un nouveau parcours de jeu ni un benchmark en ligne. Une seule publication pour ce lot ; le commit/push documentaire consécutif ne déclenche pas une deuxième publication. La relance planifiée reste en pause.

## Références

[Publication directe Pages](https://developers.cloudflare.com/pages/get-started/direct-upload/), [priorité des redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [fallback SPA](https://developers.cloudflare.com/pages/configuration/serving-pages/), [en-têtes](https://developers.cloudflare.com/pages/configuration/headers/).
