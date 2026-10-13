# Elsewhere sur Cloudflare Pages

**Publication courante V336–V337 : `f604f7ac`, 13 octobre 2026, schéma232.** [Couchages et premières nuits](../gameplay/human-sleeping-spots-v336.md) et [disponibilité des colons](../gameplay/colonist-availability-v337.md), produit `7c18d244` commité/poussé. [Adresse stable](https://elsewhere-cq7.pages.dev/) et [déploiement](https://f604f7ac.elsewhere-cq7.pages.dev/). Une seule publication,104réponsesHTTPS exactes ; parcours natifs acquis, campagne durable encore à qualifier. Les publications suivantes sont historiques.

**Publication courante V332–V333 : `82fbe736`, 13 octobre 2026, schéma 230.** [Nouvelle partie préparée](../gameplay/new-game-preparation-v333.md) et [sauvegardes de campagne](../gameplay/save-library-v332.md), produit `54d20193` commité/poussé, une seule publication. [Adresse stable](https://elsewhere-cq7.pages.dev/) et [déploiement](https://82fbe736.elsewhere-cq7.pages.dev/). Typage/build, package exact et102réponsesHTTPS passent ; le contrôle long de présentation V333 reste rouge sur refus d'allocationWebGPU, indépendamment du parcours de création/recharge natif acquis. Les publications suivantes sont historiques.

Publication demandée le 10 octobre 2026 pendant le chantier de performances V296. Le nom affiché devient **Elsewhere**. La première publication porte V295. La publication historique V331 `74b6ca55` apporte le [LOD global des animations V331](animation-lod-v331.md), après les [ombres et animations réglables V330](render-performance-v330.md), les [commandes fixes de chambre V329](aulnes-performance-v329.md), la [géométrie confirmée réutilisée V328](aulnes-performance-v328.md), les [recherches d’étagères partagées V327](aulnes-performance-v327.md), les [quatre murs et la composition V326](aulnes-performance-v326.md), la [table et la chambre fixe V325](room-layout-v325.md), la [chambre et les éclairages V324](room-diorama-v324.md), les [paysages procéduraux V323](cardboard-diorama-v323.md) et les [étagères V320](../gameplay/shelves-v320.md), schéma229, avec l'UI antérieure restaurée. La refonte papier V317 reste sur la branche distante `codex/ui-papier-v317` ; ses anciennes publications restent des archives accessibles, sans être la version courante à l'adresse stable.

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

## Publication regroupée V307

Le commit produit `b7cc70aff84ad5a114ee6f971dc7db61985a0029` est poussé puis publié une seule fois en `9c006011` : [adresse stable](https://elsewhere-cq7.pages.dev/) et [publication](https://9c006011.elsewhere-cq7.pages.dev/). Build Pages et typage PASS10,508s ; package PASS1,590s,495fichiers/112633579octets, cinqPNG et leur provenance JSON exacts, fontes/SVG historiques et63références/66fichiers publics identiques. Laboratoire et sources privés absents. Rapport `tmp/elsewhere-pages/v307-package-cJkB7J/report.json`, SHA `B3C4C1EE`.

Déploiement PASS12,425s : neuf fichiers envoyés,484déjà présents, puis en-têtes et redirections. Git dirty concerne uniquement `references_UI`, exclu du commit et du package. Vérification HTTPS PASS3,982s :64réponses200/MIME/bytes exacts sur les origines stable et fraîche, incluant les cinq images générées, provenance et six fontes. Rapport `tmp/elsewhere-pages/v307-http-UC77lx/report.json` ; package/publics inchangés, erreurs vides. Les66fichiers distants ne sont pas tous téléchargés.

Le parcours Chrome avec gestes, six fontes aux deux résolutions et sauvegarde/reprise exacte est décrit dans la note V307. Le contrôle HTTPS ne constitue pas un nouveau parcours navigateur ni une mesure de performances en ligne. Aucun second déploiement pour le commit/push documentaire ; relance planifiée en pause.

## Publication V308 après les modèles, contours et HUD

Le produit `b22da5bc` est poussé puis publié une seule fois en `cd66026b` : [adresse stable](https://elsewhere-cq7.pages.dev/) et [publication](https://cd66026b.elsewhere-cq7.pages.dev/). Typage complet en mode `--singleThreaded` et build Pages final PASS17,315s ; la limite de mémoire du compilateur parallèle et ses reprises sont conservées dans la [note V308](../gameplay/presentation-models-v308.md).

Package PASS2,186s :502fichiers/112702035octets, sept nouveaux assets identiques à `public/`,63références/66fichiers publics exacts, laboratoire et sources privés absents ; rapport `tmp/elsewhere-pages/v308-package-PzMmnp/report.json`, SHA934CB5D9. Déploiement PASS13,368s : dix fichiers envoyés,490déjà présents, puis en-têtes et redirections. Le dossier utilisateur `references_UI` seul motive le marquage Git dirty et reste exclu du commit et du package.

HTTPS PASS4,301s :78réponses200/MIME/octets exacts pour39chemins sur les deux origines, incluant les quatrePNG et troisSVG V308 et les assets historiques sélectionnés. Rapport `tmp/elsewhere-pages/v308-http-wzokwi/report.json`, SHA6B6C2687 ; package et publics inchangés, erreurs vides. Les66fichiers distants ne sont pas tous téléchargés. Le contrôle HTTPS ne rejoue pas un navigateur ou un benchmark en ligne ; les contrôles natifs et le GAME sont dans la note V308. Aucun second déploiement pour le commit/push documentaire ; relance planifiée en pause.

## Références

[Publication directe Pages](https://developers.cloudflare.com/pages/get-started/direct-upload/), [priorité des redirects](https://developers.cloudflare.com/pages/configuration/redirects/), [fallback SPA](https://developers.cloudflare.com/pages/configuration/serving-pages/), [en-têtes](https://developers.cloudflare.com/pages/configuration/headers/).

## Publication regroupée V309–V311

Le11octobre2026, après les commits/pushs V309 `4c1707ad`, V310 `4092589e` et V311 `a927492a`, une seule publication `5f225003` rassemble abattage domestique, secours/couchages animaux et fonderie des armes : [adresse stable](https://elsewhere-cq7.pages.dev/) et [publication](https://5f225003.elsewhere-cq7.pages.dev/). Schéma222, migrations historiques à la lecture ; les63références/66fichiers publics restent identiques.

Typage final PASS14,441s, buildPages PASS2,254s ; package PASS1,315s,505fichiers/112808169octets,66publics exacts, modèlesV310/V311 et assets historiques exacts, laboratoire/sources privés absents. Rapport `tmp/elsewhere-pages/v311-package-kQM2iU/report.json`, HEAD produit `a927492a258c2eed86258b3c688156c99db8a513`. Wrangler4.149.0 : déploiement PASS13,382s,9fichiers nouveaux et494déjà présents, plus en-têtes/redirections. L’avertissement Git dirty concerne uniquement `references_UI`, absent du commit et du package. La lecture de version a rencontré le répertoire de logs sandboxé par défaut ; le déploiement utilise les logs privés sous `tmp/host-cache/wrangler-logs`, sans modifier les credentials.

HTTPS PASS4,019s :82réponses200/MIME/octets exacts sur les origines stable et fraîche, incluant les deux nouveaux modèles. Rapport `tmp/elsewhere-pages/v311-http-glOrBC/report.json` ; package/publics inchangés pendant le contrôle. Les66fichiers distants ne sont pas tous téléchargés. Les contrôles de jeu, recharges et acquisitions par reprises sont dans les notes [V309](../gameplay/slaughter-v309.md), [V310](../gameplay/animal-rescue-v310.md) et [V311](../gameplay/smelting-v311.md) ; le contrôle HTTPS n’est pas un nouveau parcours navigateur ou benchmark. Un commit/push documentaire consécutif enregistre ces preuves sans deuxième publication. Poursuite fonctionnelle autonome autorisée ; relance planifiée PAUSED.

## Publication groupée V312–315 après les pièges à pointes

Le 11octobre2026, le produit `804c04c4a574437d528d9fe709a11cf8dfc18e4e` est commité/poussé puis publié une seule fois en `c18dfc8d` : [adresse stable](https://elsewhere-cq7.pages.dev/) et [URL de publication](https://c18dfc8d.elsewhere-cq7.pages.dev/). Cette publication regroupe les zones autorisées humaines, lits doubles civils, crémation physique et pièges à pointes. Le package final est celui du typage15,791s/buildPages2,079s ; les contrôles de jeu, rouges et limites de chaque mécanique sont dans leurs notes.

Package **PASS1,685s**,508fichiers/112969995octets,63références/66fichiers publics exacts ; modèlesV313–315 et assets historiques byte-identiques, laboratoire/sources privés absents. Rapport `tmp/elsewhere-pages/v315-package-xmiRyE/report.json`. Wrangler4.149.0 publie en **17,057s** :7fichiers nouveaux et499déjà présents, plus en-têtes/redirections. L’avertissement Git dirty concerne seulement le dossier utilisateur `references_UI`, absent du commit et du package ; les logs Wrangler utilisent le chemin privé historique.

HTTPS **PASS5,063s** :44chemins sur les deux origines, soit **88réponses200/MIME/octets exacts**, rapport `tmp/elsewhere-pages/v315-http-3bOYg1/report.json`. Package et fichiers publics restent inchangés. Les66fichiers distants ne sont pas tous téléchargés ; disponibilité du package seulement, aucun nouveau parcours navigateur en ligne ni gainCPU/GPU/FPS. Le dernier parcours local ChromeWebGPU V315 passe127,068s avec dix recharges exactes, sans dotation. Le commit/push documentaire de ces preuves ne déclenche pas une deuxième publication ; relance planifiée **PAUSED**.

## Publication regroupée V316–V318 et retour de l'UI précédente

Le commit produit `0dd195a182f162d689652f8212e70b0c451b43f2` est poussé, puis une seule publication `be3827cf` regroupe le fourrage V316, les quotas d'abattage V318 et le retour à l'UI antérieure demandé par l'humain : [adresse stable](https://elsewhere-cq7.pages.dev/) et [publication](https://be3827cf.elsewhere-cq7.pages.dev/). L'UI papier V317 est préservée sur la branche distante `codex/ui-papier-v317` au commit `a7a6b465` ; aucun fichier papier n'est supprimé de cette branche et aucune priorité de sous-métier n'est implémentée.

Build Pages final avec typage PASS9,694s. Package PASS1,879s :511fichiers/113056813octets,63références/66fichiers publics exacts, sources privées et laboratoire absents ; assets historiques et trois portraits géométriques V316 exacts. [Rapport package](../../tmp/elsewhere-pages/v318-package-G4019f/report.json). Déploiement PASS13,609s : quatre fichiers envoyés,505déjà présents, puis en-têtes et redirections. L'avertissement Git dirty concerne uniquement le dossier utilisateur `references_UI`, absent du commit et du package.

Vérification HTTPS PASS5,207s :94réponses200/MIME/octets exacts sur les origines stable et fraîche, [rapport](../../tmp/elsewhere-pages/v318-http-TlDGaW/report.json). Package et publics inchangés pendant le contrôle. Tous les66fichiers distants ne sont pas téléchargés ; disponibilité réseau et correspondance des assets ne constituent pas un nouveau parcours navigateur de jeu ni un benchmark. Les huit reprises des Aulnes et le geste physique sont qualifiés séparément dans la note V318. Une seule publication pour ce lot ; l'enregistrement documentaire ne republie pas. La relance planifiée demeure PAUSED.

## Publication regroupée V319–V320

Le 11 octobre 2026, le produit `a1bb77ee538548034658dedfa6874540e5e53954` est commité et poussé, puis publié une seule fois en `20e234d0` : [adresse stable](https://elsewhere-cq7.pages.dev/) et [publication](https://20e234d0.elsewhere-cq7.pages.dev/). Il regroupe les corrections d'infobulles, de sélection de texte et de notifications V319, et les étagères physiques V320. Les sous-métiers restent reportés ; la branche papier demeure préservée.

Build Pages final avec typage **PASS 10,740 s**. Package **PASS 1,526 s**, 513 fichiers/113110031 octets ; 63 références/66 fichiers publics byte-identiques, deux nouveaux portraits d'étagères et assets historiques exacts, laboratoire et sources privés absents. [Rapport package](../../tmp/elsewhere-pages/v320-package-KXhr3z/report.json). Wrangler **4.149.0** confirmé, déploiement **PASS 14,164 s** : six fichiers envoyés, 505 déjà présents, puis en-têtes et redirections. L'avertissement Git dirty concerne uniquement `references_UI`, exclu du commit et du package. Les logs restent sous le chemin privé habituel, sans changement des credentials.

HTTPS **PASS 6,576 s** : 49 chemins sur les deux origines, soit **98 réponses 200/MIME/octets exacts**, [rapport](../../tmp/elsewhere-pages/v320-http-aENTOv/report.json). Le package et les fichiers publics restent identiques pendant le contrôle. Les 66 fichiers distants ne sont pas tous téléchargés ; ces vérifications ne constituent ni un parcours de jeu en ligne ni un benchmark. Les parcours Chrome WebGPU, recharges exactes, rouges et reprises sont consignés dans les notes V319/V320. Le commit/push documentaire consécutif enregistre la livraison sans deuxième publication. Poursuite fonctionnelle autonome autorisée ; prochaine priorité étudiée : barricades constructibles et rôle de clôture. Relance planifiée **PAUSED**.

## Publication V321 — diorama en carton

Le 11 octobre 2026, le produit `a623ea20587676ef50f43cb19a6f19265932c3cd` est
commité/poussé puis publié une seule fois en **b6ab8363** :
[adresse stable](https://elsewhere-cq7.pages.dev/) et
[publication](https://b6ab8363.elsewhere-cq7.pages.dev/). Cette priorité graphique
ajoute la boîte, sa table, ses décors de papier et une préférence ON/OFF avec
sorties anticipées. Simulation et schéma229 inchangés ; le coût graphique mesuré
reste explicitement consigné dans la [note V321](cardboard-diorama-v321.md).

Typage final **PASS6,910s**, build Pages **PASS2,468s**. Package **PASS2,175s**,
515fichiers/119137682octets,63références/66fichiers publics byte-identiques ;
deux textures et assets historiques exacts, laboratoire et fichiers privés
absents. [Rapport package](../../tmp/elsewhere-pages/v321-package-eK6V23/report.json).
Wrangler **4.149.0** confirmé, déploiement **PASS14,645s** : quatre fichiers
envoyés et509déjà présents, puis en-têtes/redirections. L’avertissement Git dirty
concerne seulement `references_UI`, exclu du commit et du package.

HTTPS **PASS8,214s** :51chemins sur les deux origines, soit **102réponses200/MIME/
octets exacts**, [rapport](../../tmp/elsewhere-pages/v321-http-nPJC3q/report.json).
Package et publics inchangés pendant le contrôle. Les66fichiers distants ne
sont pas tous téléchargés ; disponibilité réseau seulement, sans nouveau parcours
navigateur en ligne ni benchmark. Les quatre recharges de continuation exactes
et les captures sont celles du contrôle local ChromeWebGPU V321. Un commit/push
documentaire consigne la livraison sans deuxième publication. La relance reste
**PAUSED**.

## Publication V322 — relief et visibilité

Produit `a58e5b92699d77e6880b843d5b237105520e7bb2` commité/poussé puis publié une
seule fois en **b054f727** : [adresse stable](https://elsewhere-cq7.pages.dev/)
et [publication](https://b054f727.elsewhere-cq7.pages.dev/). Quatre murs hauts,
papier×2,5, masque géométrique iso/perspective et rebords bas conservés. Les coûts
mixtes et les limites de performance sont explicites dans la [note V322](cardboard-diorama-v322.md).

Typage9,913s/buildPages3,278s ; package PASS1,641s,515fichiers/119141579octets,
63références/66fichiers publics exacts, textures et assets historiques exacts,
sources privées/laboratoire absents ;
[rapport package](../../tmp/elsewhere-pages/v322-package-WF4R1t/report.json).
Wrangler4.149.0 confirmé, déploiement PASS14,201s : deux fichiers envoyés,
511déjà présents, plus en-têtes/redirections. L'avertissement dirty concerne
uniquement le dossier utilisateur `references_UI`, absent du commit et du package.

HTTPS PASS5,795s :102réponses200/MIME/octets exacts,51chemins sur les origines
stable et fraîche ; [rapport](../../tmp/elsewhere-pages/v322-http-XpX95Z/report.json).
Package/publics inchangés, sans téléchargement distant des66fichiers en entier
ni nouveau parcours navigateur ou benchmark. Les22poses locales et quatre
recharges de continuation exactes sont dans la note unique. Un commit/push
documentaire consigne cette livraison sans nouvelle publication ; relance **PAUSED**.

## Publication V323 — paysages procéduraux et théâtre céleste

Produit `79f92205` commité/poussé puis publié en `3e8769bd`, à la même
[adresse stable](https://elsewhere-cq7.pages.dev/) et à son
[URL de publication](https://3e8769bd.elsewhere-cq7.pages.dev/). Trois profils
de biomes, variantes par graine et soleil/lune sur tiges ;18lots conservés,
coûts mesurés et défaut caméra préexistant explicités dans la
[note V323](cardboard-diorama-v323.md). Schéma229 et simulation inchangés.

Build Pages/typage final PASS11,756s ;515fichiers/119148950octets identiques au
package inspecté avant nettoyage du seul saut de ligne source. Les63références
et66fichiers publics, textures et assets historiques restent exacts.
Déploiement PASS13,649s avec Wrangler4.149.0 : deux fichiers envoyés,511déjà
présents, plus en-têtes/redirections. Le dirty Git correspond uniquement à
`references_UI`, exclu du commit et du package.

HTTPS PASS4,776s :102réponses200/MIME/octets exacts,51chemins sur les deux
origines ; [rapport](../../tmp/elsewhere-pages/v323-http-0641ja/report.json).
Package/publics inchangés ; les66fichiers ne sont pas tous téléchargés à
distance. Aucun nouveau benchmark ou parcours de jeu en ligne revendiqué.
Un commit/push documentaire consigne la livraison sans deuxième publication ;
relance **PAUSED**, aucun nouveau lot engagé.

## Publication V324 : chambre et éclairages

Le produit `bd96e0cf` est poussé sur `main`, puis publié une seule fois en
`dcbff029` : [adresse stable](https://elsewhere-cq7.pages.dev/) et
[publication](https://dcbff029.elsewhere-cq7.pages.dev/). La chambre optionnelle,
les globes suspendus et les trois réglages d'éclairage sont décrits dans la
[note V324](room-diorama-v324.md), avec les contrôles natifs, les rouges et le
surcoût mesuré. Schéma229 et archives publiques conservés.

Build Pages et typage final **PASS11,273 s** ; package **PASS1,567 s**,515fichiers
et119185882octets. Les63références/66fichiers publics sont exacts, laboratoire
et sources privés absents. Rapport `tmp/elsewhere-pages/v324-package-R616rd/report.json`.
Wrangler4.149.0 déploie en **13,797 s** : deux fichiers nouveaux,511déjà présents,
puis en-têtes/redirections. `references_UI` seul motive le dirty Git et reste
exclu du commit et du package.

HTTPS **PASS5,151 s**,102réponses200/MIME/octets exacts pour51chemins sur les
deux origines ; rapport `tmp/elsewhere-pages/v324-http-jKJxs4/report.json`.
Package et publics inchangés. Ces contrôles ne téléchargent pas les66fichiers
distants ni ne rejouent le jeu ou le benchmark en ligne. Un commit/push
documentaire consigne la livraison sans deuxième publication ; relance
**PAUSED**, aucun nouveau lot engagé.


## Publication V325 — 12 octobre 2026

Produit **`00995fac`** commité/poussé sur `main`, déployé une seule fois en
**`666b3ef1`** sur [l’adresse stable](https://elsewhere-cq7.pages.dev/) et
[la publication](https://666b3ef1.elsewhere-cq7.pages.dev/). Table rectangulaire,
chambre proportionnée et fixe, six nuages sur trois arcs et masquage central
réglable : [contrôles et comparaison de coût](room-layout-v325.md).

Build Pages/typage **PASS 17,266 s**, package **PASS 2,345 s** : 515 fichiers,
119 191 064 octets, 63 références et 66 chemins de sauvegarde publics exacts ;
contenus privés absents. Rapport `tmp/elsewhere-pages/v325-package-yiOxgO/report.json`.
Wrangler 4.149.0 **PASS 13,022 s**, deux fichiers envoyés et 511 déjà présents,
puis en-têtes/redirections. `references_UI` reste non suivi et exclu.

HTTPS **PASS 5,943 s**, 102 réponses200/MIME/octets exactes sur les deux origines,
rapport `tmp/elsewhere-pages/v325-http-YfBuuH/report.json`. Package et publics inchangés ; aucun navigateur ni
benchmark en ligne rejoué, aucun second déploiement pour la clôture documentaire.
Relance **PAUSED**, aucun lot suivant engagé.


## Publication V327 — 12 octobre 2026

Produit **`b48f6c51`** commité/poussé sur `main`, déployé une seule fois en **`9ec327b9`** sur [l’adresse stable](https://elsewhere-cq7.pages.dev/) et [la publication](https://9ec327b9.elsewhere-cq7.pages.dev/). [Optimisation, mesures et limites](aulnes-performance-v327.md) : recherches d’étagères partagées pendant les validations MAIN, qualité/règles conservées.

Build Pages/typage **PASS 11,980 s**, package **PASS 2,007 s** : 515 fichiers,119192223octets,63références/66fichiers publics exacts. Rapport `tmp/elsewhere-pages/v327-package-jn7KTE/report.json`. Wrangler4.149.0 **PASS 11,128 s** : trois fichiers envoyés,510déjà présents, puis en-têtes/redirections. `references_UI/` reste non suivi et exclu.

HTTPS **PASS 4,574 s** :102réponses200/MIME/octets exactes sur51chemins des deux origines, rapport `tmp/elsewhere-pages/v327-http-VzQhln/report.json`. Package et publics inchangés ; aucun navigateur ni benchmark en ligne rejoué. Un commit/push documentaire consigne la livraison sans second déploiement ; relance **PAUSED**.

## Publication V328 — 12 octobre 2026

Produit **`ff10a939`** commité/poussé sur `main`, déployé une seule fois en **`e1cc34a8`** sur [l’adresse stable](https://elsewhere-cq7.pages.dev/) et [la publication](https://e1cc34a8.elsewhere-cq7.pages.dev/). [Optimisation, mesures et limites](aulnes-performance-v328.md) : index géométrique confirmé réutilisé dans le MAIN privé, mêmes règles/qualité et schéma229.

Build Pages/typage **PASS10,313s**, package **PASS2,308s** :515fichiers,119193597octets,63références/66fichiers publics exacts. Rapport `tmp/elsewhere-pages/v328-package-oJpw3T/report.json`. Wrangler4.149.0 **PASS13,479s** : deux fichiers envoyés,511déjà présents, puis en-têtes/redirections. `references_UI/` reste non suivi et exclu.

HTTPS **PASS5,028s** :102réponses200/MIME/octets exactes sur51chemins des deux origines, rapport `tmp/elsewhere-pages/v328-http-R9jAuF/report.json`. Package et publics inchangés ; aucun navigateur ni benchmark en ligne rejoué, tous les66fichiers distants ne sont pas téléchargés. Un commit/push documentaire consigne la livraison sans second déploiement ; relance **PAUSED**.

## Publication V329 — 12 octobre 2026

Produit **`92ff337c`** commité/poussé sur `main`, publié une seule fois en **`235b1f0b`** sur [l'adresse stable](https://elsewhere-cq7.pages.dev/) et [la publication](https://235b1f0b.elsewhere-cq7.pages.dev/). [Diagnostic, contrôles et limites](aulnes-performance-v329.md) : commandes fixes de chambre réemployées quand les globes sont hors frustum, repli ordinaire et mêmes règles/visuels conservés. Économie CPU proche ciblée, aucun gain FPS ×1 stable certifié.

Build Pages/typage **PASS12,028s**, package **PASS1,768s** :515fichiers,119196834octets,63références/66fichiers publics exacts. Rapport `tmp/elsewhere-pages/v329-package-tOrWNJ/report.json`. Wrangler4.149.0 **PASS14,680s** : deux fichiers envoyés,511déjà présents, puis en-têtes/redirections. `references_UI/` reste non suivi et exclu.

HTTPS **PASS7,614s** :102réponses200/MIME/octets exactes sur51chemins des deux origines, rapport `tmp/elsewhere-pages/v329-http-sioJn8/report.json`. Package et publics inchangés ; aucun navigateur ni benchmark en ligne rejoué, les66fichiers distants ne sont pas tous téléchargés. Un commit/push documentaire consigne la livraison sans second déploiement ; relance **PAUSED**, aucun nouveau gameplay engagé.

## Publication V330 — 12 octobre 2026

Produit **`4973830d`** commité/poussé sur `main`, publié une seule fois en **`a6993b4f`** sur [l'adresse stable](https://elsewhere-cq7.pages.dev/) et [la publication](https://a6993b4f.elsewhere-cq7.pages.dev/). [Analyse, réglages, contrôles et limites](render-performance-v330.md) : défaut humain Équilibré60Hz/2048, détail décoratif selon projection iso/perspective, mêmes règles et déplacements continus. Gain×1 proche modeste, aucun gain×6stable/240FPS certifié ; limites Chromium et une paire RGBA WebGL conservées dans la note.

Build Pages/typage **PASS9,589s**, package **PASS1,752s** :515fichiers,119210230octets,63références/66fichiers publics exacts. Rapport `tmp/elsewhere-pages/v330-package-SxRRSC/report.json`. Wrangler4.149.0 **PASS14,226s** : trois fichiers envoyés,510déjà présents, puis en-têtes/redirections. `references_UI/` reste non suivi et exclu.

HTTPS **PASS7,059s** :102réponses200/MIME/octets exactes sur51chemins des deux origines, rapport `tmp/elsewhere-pages/v330-http-JA2blU/report.json`. Aucun navigateur ni benchmark en ligne rejoué, les66fichiers distants ne sont pas tous téléchargés. Un commit/push documentaire consigne la livraison sans second déploiement ; relance **PAUSED**, aucun nouveau gameplay engagé.

## Publication V331 — 12 octobre 2026

Produit **`9e8b1b96`** commité/poussé sur `main`, publié une seule fois en **`74b6ca55`** sur [l'adresse stable](https://elsewhere-cq7.pages.dev/) et [la publication](https://74b6ca55.elsewhere-cq7.pages.dev/). [Couverture, tests, mesures et limites](animation-lod-v331.md) : LOD des acteurs/gestes/déplacements affichés, FX, nature et mobiles, cadence réelle et chemins proches natifs. Les règles continuent ; les gains au large restent qualifiés par les débits différents et la dispersion proche. Les rasters continus proches sont exacts sur WebGPU/WebGL2 ; le refus strict large et les coûts froids demeurent documentés.

Build Pages/typage **PASS12,649s**, package **PASS1,759s** :515fichiers,119272604octets,63références/66fichiers publics exacts. Rapport `tmp/elsewhere-pages/v331-package-IgdowR/report.json`. Wrangler4.149.0 **PASS21,624s** : deux fichiers envoyés,511déjà présents, puis en-têtes/redirections. `references_UI/` reste non suivi et exclu. CSS et Worker de simulation conservés.

HTTPS **PASS8,051s** :102réponses200/MIME/octets exactes sur51chemins des deux origines, rapport `tmp/elsewhere-pages/v331-http-vT3RDU/report.json`. Aucun navigateur ni benchmark en ligne rejoué, les66fichiers distants ne sont pas tous téléchargés. Un commit/push documentaire consigne la livraison sans second déploiement ; relance **PAUSED**, aucun nouveau gameplay engagé.

## Publication groupée V332–V333 — 13 octobre 2026

Produit `54d20193397ea77a3c4920463f58f206c24c6c81` commité/poussé, publié une seule
fois en `82fbe736` : [adresse stable](https://elsewhere-cq7.pages.dev/) et
[déploiement](https://82fbe736.elsewhere-cq7.pages.dev/). Cette livraison regroupe
les sauvegardes nommées/automatiques et le parcours de départ avec notre charte
actuelle, trois personnes parmi huit et climat réel de la tuile. Le schéma230
migre les anciennes campagnes sans nouveau climat ni dotation rétroactive.

Typage24,383s/buildPages3,448s et package1,857s passent :515fichiers/119349148octets,
63références/66fichiers publics byte-identiques, laboratoire et sources privées
absents. Rapport `tmp/elsewhere-pages/v333-package-0RlZoM/report.json`.
Wrangler4.149.0 passe15,386s, quatre fichiers nouveaux/509déjà présents, plus
en-têtes/redirections. Le seul état Git non suivi est le dossier humain
`references_UI/`, exclu du package et laissé intact.

HTTPS PASS7,810s :102réponses200/MIME/octets exactes sur51chemins des origines
stable/fraîche, rapport `tmp/elsewhere-pages/v333-http-4dFymc/report.json` ; package
et publics conservés. Les66fichiers distants ne sont pas tous téléchargés.
Le parcours local WebGPU de création/export/recharge est acquis, mais le
contrôle long de présentationV333 reste rouge sur attente de recharge puis
refus d'allocationWebGPU avant les gestes : [preuves et limites](../gameplay/new-game-preparation-v333.md).
Ni campagne entière, ni parité Core exhaustive, ni gainFPS ne sont annoncés.
Consolidation documentaire poussée sans seconde publication ; serveurs/navigateur
de test possédés fermés, relance **PAUSED**.

## Publication V334–V335 — carnet et arrivée physique

Le produit `59717fa7` est commité et poussé sur `main`. Une seule publication regroupe le carnet V334 et les capsules V335 ; ces dernières détiennent réellement les personnes et objets choisis jusqu’à leur ouverture. Les anciens départs ne reçoivent aucune capsule à la migration230→231. La disponibilité réseau ne certifie pas une première nuit ou une campagne naturelle entière.

Build Pages2,032s et typage séparé11,434s passent ; package1,493s :515fichiers/119392441octets. Les63références/66fichiers publics sont exacts ; aucun laboratoire, source ou fichier privé détecté par l’inspection ciblée. Rapport `tmp/elsewhere-pages/v335-package-yYKMu9/report.json`. `references_UI/` reste intact, non suivi et absent du package.

Wrangler4.149.0 passe17,517s, quatre fichiers nouveaux/509déjà présents, avec en-têtes et redirections. HTTPS PASS6,436s :102réponses200 avec MIME et octets exacts sur51chemins par origine stable/fraîche, rapport `tmp/elsewhere-pages/v335-http-IJuyNi/report.json`. Les66fichiers publics sont comparés localement ; ils ne sont pas tous téléchargés à distance. Build et publics conservés.

ChromeWebGPU75,073s acquiert la création250², la reprise en descente4 et le carnet/recharge37. Présentation commune Chrome129,891s acquise ; les anciens refus mémoire V333 et les erreurs Tint IR Chromium ne sont pas déclarés réparés. Sources/tests/pilotes gelés2842exacts, serveurVite5408 et navigateurs de contrôle possédés fermés. Documentation de clôture poussée sans seconde publication. Relance ACTIVE et poursuite autonome : couchages humains au sol, puis première nuit des trois biomes. Aucun gainFPS ni 240FPS annoncé.

## Publication V336–V337 — couchages et disponibilité

Les produits `27908b22` et `7c18d244ff0f3ac4ceb02a6df2bd92e0cc7d63a1` sont committés et poussés sur `main`. Une seule publication regroupe les emplacements de couchage humain au sol, le contrôle des trois premières nuits et les alertes de disponibilité des colons. Schéma232 ; les campagnes historiques sont migrées sans couchage ajouté, dotation ou modification des identités. La correction du bridge admet les voyageurs commerciaux originaux une seule fois en conservant les gardes de collision.

Build Pages et typage final PASS15,572s ; package PASS1,352s :516fichiers/119426714octets. Les63références/66fichiers publics sont byte-identiques ; laboratoire, sources et chemins privés ciblés absents. Rapport `tmp/elsewhere-pages/v337-package-mGVU0B/report.json`. Le dossier humain non suivi `references_UI/` est intact et exclu.

Wrangler4.149.0 PASS13,927s : quatre fichiers nouveaux/510déjà présents, en-têtes et redirections. Déploiement `f604f7ac`. HTTPS PASS7,289s :104réponses200/MIME/octets exacts sur52chemins par origine stable/fraîche ; rapport `tmp/elsewhere-pages/v337-http-kfAXM3/report.json`. Les66publics sont comparés localement, sans prétendre qu’ils ont tous été téléchargés. Package et publics inchangés.

Les [preuves V336](../gameplay/human-sleeping-spots-v336.md) comprennent trois nuits naturelles et douze recharges exactes ; les [preuves V337](../gameplay/colonist-availability-v337.md) comprennent six situations préparées et six recharges exactes. Sources/tests/pilotes2855exacts, navigateur et Vite5410 possédés fermés. Aucun gainFPS, campagne naturelle entière ou early access complète certifiés. Documentation de clôture poussée sans seconde publication ; relance ACTIVE et suite autonome : alimentation renouvelable, incidents naturels et reprises.

## Publication V339 et V341 — humeur et aide

Produits `832a0ff8` et **79661190ecc2ab041b69cd04849bc9adba0a51f1** commités/poussés sur main. Une seule publication livre l’alerte préventive d’humeur et l’aide partagée dès l’accueil, avec le guide intégré actualisé. V338 et V340 sont des lots QA-only ; la [qualification V340](../gameplay/second-colony-food-v340.md) reste partielle et ses branches blessées sont conservées. Schéma232 et publics historiques conservés.

Build Pages/typage final PASS21,682s ; [deux parcours d’aide V341](../gameplay/player-help-v341.md) PASS40,345s avec vraie création250², recharge28exacte et deux captures inspectées. Le rouge Tab37,940s est conservé. Les validations V339 gardent leur propre portée ; aucun contrôle moteur ou FPS inchangé rejoué pour l’aide.

Package PASS2,235s : **516fichiers/119429393octets**, 63sauvegardes/66chemins publics exacts, laboratoire et chemins privés ciblés absents ; rapport `tmp/elsewhere-pages/v341-package-FlTAXP/report.json`. Le dossier humain references_UI reste non suivi, intact et exclu du package. L’inspection ciblée ne vaut pas audit universel des secrets.

Wrangler4.149.0 PASS15,650s : trois fichiers nouveaux,511 déjà présents, en-têtes/redirections transmis. Déploiement **f75ea107**, [production](https://elsewhere-cq7.pages.dev/) et [adresse immuable](https://f75ea107.elsewhere-cq7.pages.dev/). HTTPS PASS13,537s : **104réponses200/MIME/octets exacts**, 52chemins sur chaque origine, rapport `tmp/elsewhere-pages/v341-http-Wiw4UU/report.json`. Les66publics sont comparés localement ; ils ne sont pas tous téléchargés à distance. Package/publics inchangés après vérification, erreurs[]. Le paramètre commit-dirty reflète le dossier humain non suivi ; seuls les assets contrôlés de dist sont téléversés.

Gel final2862exact. Navigateurs de contrôle fermés par leurs contextes, Vite5411 possédé arrêté ; sessions humaines préservées. Documentation de clôture poussée sans deuxième publication. Poursuite autonome ACTIVE : récupération après incident et réserves/campagne durable, préparation privée V342. Aucun gainFPS, secours des branches V340, campagne entière ou early access complète certifiés.
