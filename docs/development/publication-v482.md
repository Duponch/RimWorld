# Publication des UI carton et des lots V481–V482

**Publication acquise le 26 octobre 2026 à08:35UTC : `b969b256`, schéma295, produit `61d63e51`.** [Adresse stable](https://elsewhere-cq7.pages.dev/) et [déploiement immuable](https://b969b256.elsewhere-cq7.pages.dev/). Cloudflare confirme l’environnement Production, branchemain, source61d63e5. Cette publication est demandée explicitement par l’utilisateur, avant la reprise du chantier en cours.

Le site reçoit les interfaces natives en carton qualifiées jusqu’à [V480](native-ui-identity-v480.md), les [retombées toxiques V481](../gameplay/toxic-fallout-v481.md), le [roman physique et sa lecture V482](../gameplay/novel-v482.md), ainsi que le correctif vérifié de continuité anti-incendie. La production précédente était V475 `2e222a29` ; un push Git n’avait pas déclenché de publication Pages.

## Provenance du paquet

Le chantier V483/schéma296 est en cours dans le répertoire principal et n’est pas qualifié. Aucun de ses fichiers n’est publié. Une copie séparée est extraite du commit exact `61d63e51430c7be463dd3cb980ed695fffed6efa` :5043fichiers de sources, tests, scripts, ressources publiques et configuration, dont2043sources produit. Chaque contenu est vérifié contre son blob Git avant le build et après publication. Le schéma de la copie est295 et les modules wall-door296 y sont absents. Les4498fichiers du chantier principal sont vérifiés inchangés pendant l’opération.

Le typage frais de cette copie passe en17,518s ; le build Pages en7,320s. La vérification du paquet passe en1,614s :552fichiers,154258561octets,547ressources publiques,68entrées au catalogue et71chemins publics de sauvegarde/catalogue. Tous les contenus statiques hors HTML et quatre sorties compilées nommées restent identiques au précédent paquet de production. Laboratoire, sources, instrumentation privée et chantier296 sont exclus.

| Sortie compilée | Nom publié |
| --- | --- |
| Application | `index-Bkp8Mih_.js` |
| Styles | `index-CJ8so_MJ.css` |
| Simulation | `simulation.worker-Bi9ILmdF.js` |
| Présentation | `presentation.worker-BrDRrAtE.js` |

Une seule publication effective avec Wrangler4.149.0 passe en16,880s :5fichiers envoyés,545réemployés, puis règles headers/redirects. L’avertissement Git sale correspond au répertoire parent qui contient le chantier296 ; la provenance du paquet extrait est contrôlée séparément, octet par octet, et son commit est passé explicitement à Cloudflare.

Les20réponses HTTPS ciblées passent en8,876s sur les deux origines : statuts200, MIME et octets exacts pour HTML, favicon, styles, application, deux Workers, manifeste, sauvegarde Les Aulnes et un visuel public. Le contrôle porte sur la disponibilité des fichiers ; aucun nouveau parcours navigateur public, gain FPS ou coût GPU n’est déduit de la publication. Les validations fonctionnelles restent celles des lots qualifiés.

Preuves conservées sous `tmp/publication-v482/` : `inputs-before.json`, `inputs-after.json`, `deployments-before.json`, `deployments-after.json`, `unfinished-v483-custody.json`, paquet et rapport HTTP. Les journaux sous `tmp/validation-runs/` distinguent typage, build, paquet, envoi et HTTPS. Aucun serveur ni sauvegarde humaine n’est modifié.

Le contrôle documentaire de la copie publiée passe en2,331s :1131documents,10767liens locaux, six en-têtes au schéma295 et originaux de référence inchangés. Les deux essais précédents sont conservés : le premier lisait le schéma296 du chantier principal ; la copie isolée manquait ensuite des liens vers les preuves historiques. Après le déploiement, les documents courants et des liens en lecture vers ces preuves sont ajoutés à la copie uniquement pour cette vérification ; les5043contenus de construction et le paquet publié restent ceux déjà contrôlés.

## Reprise

Reprendre V483 à sa qualification : porte sur mur fini, vraie déconstruction puis approvisionnement et construction, avec intention successeur persistante. Ses sources et tests sont écrits mais non exécutés au moment de cette publication. La vérification des piles livrées dans le garde résident reste à fermer, puis typage, contrats ciblés et parcours natif. Les six ensembles, campagnes durables, SYS069 et confort global restent ouverts ; la demande humaine de poursuite autonome demeure active.
