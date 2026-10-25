# Structures de l’interface native V479

## Portée et état

Demande humaine : retrouver l’organisation des interfaces de la partie avant leur migration, conserver le carton peint en objets 3D, aérer les éléments et éviter les boutons étirés. Ce lot porte sur les menus **pendant la partie**. Il ne modifie ni Core, ni simulation, ni règles de recherche, ni schéma de sauvegarde.

**Qualification locale acquise :** contrôles ciblés, vraie GameSession, recharge entière exacte, typage et build passent. La première comparaison isolée a motivé une réduction des objets de Recherche. La série finale ne montre plus de hausse du CPU de survol au-delà des témoins, mais conserve des surcoûts au repos et à l’ouverture, détaillés ci-dessous. Aucun gain FPS global ni publication V479 n’est revendiqué.

La base est V478, commit `47652d6c`. Les **2 028 fichiers** copiés avant modification sont conservés dans `tmp/ui3d-structure-v479/baseline/`, avec `baseline-manifest.json`. Les références humaines `references_UI/` sont préservées. Le témoin natif a utilisé le port privé 5197 ; ce seul serveur de comparaison est fermé après vérification de son identité. L’aperçu humain 5196 reste disponible.

## Présentation restaurée

- **Ordres et Zones** : deux plateaux indépendants d’icônes 48×46, sans grande feuille de fond. Les intitulés et tooltips gardent leurs actions d’origine ; le choix d’un outil reste distinct de l’ouverture du plateau.
- **Architecte** : catégories à gauche, grille de constructions au centre, options à droite. Les catégories mesurent 54 px de haut et les cartes 148 px ; la grille reprend quatre colonnes, trois sous 980 px et deux sous 760 px, dans les limites de la largeur disponible. Les régions défilent séparément. La hauteur suit le contenu réel jusqu’au plafond disponible ; un petit catalogue ne laisse plus une grande feuille vide. Matériau, orientation et outil sélectionné restent accessibles.
- **Recherche** : onglet Principal, arbre et dossier du projet sélectionné. Le catalogue partagé reprend **42 projets et 30 liens**, avec sélection, lancement, suspension, prérequis et diagnostics de bureau. L’arbre possède ses barres de défilement horizontale/verticale ; la navigation clavier ramène le nœud choisi dans la zone visible.
- **Inspecteur de colon** : dossier au-dessus des onglets, puis portrait/résumé à gauche et actions en deux colonnes à droite. Le titre du dossier correspond à l’onglet actif. Bio conserve sa largeur 514 px et ses **12 jauges de compétences visibles**, dans une hauteur de 528–529 px selon le contenu, sous l’ancienne borne 686 px. Besoins/Santé conservent leur budget de contenu visible antérieur ; les anciennes bornes 717/627 px restent les gardes, sans agrandissement automatique sur grand écran.
- **Proportions communes** : textes ordinaires 13 px, secondaires 12 px, titres 17–18 px ; boutons/onglets 32 px et espacements ordinaires 8 px. Les actions prennent leur largeur naturelle, avec retour à la ligne si nécessaire. Les véritables matrices conservent leurs cellules alignées. Un libellé long du pied d’inspecteur peut occuper deux lignes sur 40 px.

Les pictogrammes reprennent les traits irréguliers, aplats peints et pastilles claires de la barre du bas. Le module commun couvre catégories, outils, recherches et actions ; les familles proches restent distinctes, avec un pictogramme visible pour un identifiant futur. Aucun bitmap externe n’est ajouté. L’interface reste faite de meshes natifs, avec clipping, hits et callbacks réaffectés aux modèles courants ; les acquis de cache/régions V478 sont conservés.

L’extraction des données et routes de l’ancien arbre conserve son oracle SVG : SHA `09c5f2eca5e6fad26f4de2370cc673aa1e2a434a871cd78d6d1acab343d863f9`. L’ancien placement superposait Prothèses et Armure de reconnaissance. Le rendu natif déplace seulement Prothèses vers `(184 ; 726,88)` et reroute son lien depuis Usinage ; les 29 autres routes et l’ancien rendu restent inchangés. Ce placement ne change aucune dépendance de recherche.

## Acquisitions disponibles

Les heures ci-dessous sont en UTC, le 25 octobre 2026. Les fixtures de présentation utilisent un monde préparé 32×32, seed 479311 ; la vraie session Éclaircies 250×250 est qualifiée séparément.

| Contrôle | Résultat disponible | Preuve |
|---|---|---|
| Anciennes dispositions DOM/CSS réelles | PASS, **22,186 s**, départ 22:51:14 | `tmp/ui3d-structure-v479/legacy-layout-fixture-2026-10-25T22-51-14.067Z/` |
| Typage avant la dernière optimisation | PASS, **39,891 s**, départ 23:00:09 | Journal d’exécution du lot V479 |
| Présentation/interactions natives WebGPU, 1440×1000 et 960×800, avant la dernière optimisation | PASS, **34,562 s**, départ 23:01:12 ; rapports et captures conservés et examinés | `tmp/ui3d-structure-v479/fixture-2026-10-25T23-01-12.285Z/` |
| Tests ciblés, avant la dernière optimisation | **138 cas, 15 fichiers, PASS en 77,200 s** | Journal d’exécution du lot V479 |
| Typage après mutualisation des cartes, avant le correctif de garde décrit ci-dessous | PASS, **26,452 s** | Journal d’exécution du lot V479 |
| Présentation/interactions natives WebGPU après mutualisation des cartes, mêmes résolutions | PASS, **25,533 s**, départ 23:15:07 | `tmp/ui3d-structure-v479/fixture-2026-10-25T23-15-07.625Z/` |
| Reprise ciblée après correction de la garde UI | **29 cas PASS, 30,022 s**, départ 23:24:24 ; dont 3 nouveaux | Journal `23:24:24.898Z`, lot V479 |
| Vraie GameSession Éclaircies 250×250 | PASS, **113,905 s** pour la commande ; **110,441 s** internes | `tmp/ui3d-structure-v479/game-2026-10-25T23-25-41.587Z-25740/` ; commande `ui479-actual-game-guard-fixed-23:25:40.968Z-32012` |

**141 cas distincts sont acquis par reprises : 138 initiaux et 3 nouveaux.** Les 29 derniers incluent des cas déjà acquis et ne s’ajoutent pas intégralement à ce total. Les 138 tests ne sont pas présentés comme un rejeu complet après les dernières modifications. Le typage final passe en **28,136 s**, journal `ui479-type-qualified-2026-10-25T23-30-36.362Z-14592` ; le build Vite passe en **8,761 s**, journal `ui479-vite-qualified-2026-10-25T23-31-35.196Z-6936`.

La session réelle utilise Éclaircies au tick **1730**, schéma **293**, sans réparation de World ni dotation de recherche. Le parcours acquiert les plateaux Ordres/Zones, les catégories Architecte et son choix de matériau/orientation ; Bio/Besoins/Santé en 1440×1000 et 960×800, Journal/Matériel ; l’arbre et Principal ; la sélection de recherche sans mutation de World, puis le lancement et la suspension par de vraies commandes acquittées. Les choix purement UI laissent la sauvegarde entière exactement inchangée. Le fichier entier après suspension est exactement conservé par rechargement, ainsi que les préférences de police et d’escamotage. Sept exports complets figurent dans `report.saves` ; le fichier d’entrée reste conservé séparément. Les contrôles se déroulent en pause, son et musique coupés ; ils ne mesurent pas la cadence de simulation.

Deux premiers parcours réels échouent en **115,214 s** et **115,579 s**, dossiers `game-2026-10-25T23-16-04.788Z-19372/` et `game-2026-10-25T23-20-31.031Z-25332/`, conservés. Le clic de lancement atteint bien sa cible mais aucune commande n’est transmise : le callback garde une ancienne valeur `busy` vraie capturée pendant l’export de sauvegarde. La garde de `native-panels` lit désormais l’état courant à l’activation. Trois tests couvrent les deux transitions de cette garde et la transmission effective. Le correctif concerne seulement l’UI, sans modifier Core ni contourner la garde du moteur.

Les premiers échecs restent conservés : typage d’une hauteur inférée comme littéral 32 ; fixtures de recherche fournissant un dossier optionnel non préparé et ancien oracle des plateaux ; tentative d’ouverture de l’ancien Main expirée avant acquisition UI ; première fixture DOM bloquée par son écran de chargement. Les corrections de fixture ne requalifient pas ces essais. La première fixture native passée en 30,018 s précède les derniers ajustements de proportions ; la reprise 34,562 s ci-dessus porte les nouveaux contrôles. Aucun échec de préparation n’est utilisé comme mesure de performance.

## Première comparaison de coût : version initiale remplacée

Le pilote `scripts/ui3d-structure-performance.mjs` a acquis une comparaison **W/C/W** entre V478 figée et la première version structurée V479 : Ordres, Mobilier d’Architecte et Recherche. Banc NativeStage isolé dans un vrai hôte WebGPU, 1440×1000 DPR1, sans simulation, WorldRenderer, Worker ou GameSession ; repos 3 s puis survol 4 s/20 déplacements sur des cibles sémantiques identiques. Le rapport indique `isolated-ui-wcw-acquired`, **145,804 s** internes, **150,704 s** pour la commande. Les 18 RAW sont relus et vérifiés par SHA256 dans `tmp/ui3d-structure-v479/current-load-ui-ready-2026-10-25T23-06-58-659Z-21836/analysis.md`.

| Survol, première version V479 | CPU principal/image, témoins → candidat | Pixels de cache, témoins → candidat |
|---|---|---|
| Ordres | 1,851–2,148 → **2,173 ms** | 34,55–52,89 → 14,18 M |
| Mobilier d’Architecte | 1,925–2,409 → **2,459 ms** | 114,49–115,53 → **240,54 M** |
| Recherche | 2,269–2,432 → **3,020 ms** | 83,17–83,35 → 63,25 M |

Le CPU/image du candidat dépasse les deux témoins dans les six phases repos/survol. Au survol, l’écart au témoin le plus coûteux est **+1,1 % Ordres, +2,0 % Architecte et +24,2 % Recherche**. Les p99/max sont également plus hauts que les deux témoins pour Architecte/Recherche. Le repos conserve cependant **zéro recapture** pour toutes les variantes. La baisse des appels de dessin ne suffit pas à valider l’équivalence de coût.

Architecte recapture environ **2,1 fois** plus de pixels. Une capture complète ajoute seulement 1,44 M des 240,54 M pixels ; la hausse vient principalement des 924 régions partielles. Le dernier patch mesure 928×352 contre 1408×96 au témoin. Les cartes de 148 px et les cibles sur deux rangées rendent plausible une union plus haute des poses animées et tooltips ; ce dernier rectangle ne mesure pas toute la distribution des dommages et ne suffit pas à une attribution exclusive.

Recherche comporte initialement 444 objets/102 textures contre 228/69 au témoin. L’ouverture modèle+peinture atteint **103,3 ms murales contre 40,8–52,3 ms** ; ce n’est ni un compteur CPU effectif ni une durée d’exécution GPU. Les lectures CDP du CPU encadrent les images avec une frange de 60,2–195,5 ms, soit 1,7–5,48 % ; CPU/image garde ce coût de protocole. Ces limites n’autorisent pas à effacer les surcoûts observés.

**Cette version initiale est remplacée après ces résultats.** La dernière optimisation peint le petit bouton de lancement de recherche sur la surface de sa carte, utilise une zone `Hit.region` locale pour garder son action/tooltip distincts et retire la zone de survol de ligne qui doublonnait celle de la carte. Les petites surfaces, objets et textures dédiés au bouton ne sont plus nécessaires. La zone suit exactement la pose du carton parent ; clavier, état désactivé et callbacks actuels sont conservés. Les contrôles natifs et la vraie partie ci-dessus qualifient cette version.

L’essai antérieur `current-load-ui-2026-10-25T23-03-22-357Z-1812/` reste incomplet après une attente `networkidle`, commande **164,592 s**. Les RAW/erreurs conservés ne constituent pas une comparaison W/C/W et ne sont pas joints aux résultats admis.

## Comparaison finale des sources qualifiées

Série W/C/W acquise en **135,985 s**, dont **131,019 s** internes, sous `tmp/ui3d-structure-v479/shared-surface-ui-2026-10-25T23-28-00-849Z-18172/`. Le rapport, ses sources et les 18 RAW restent figés ; `analysis.json` et `analysis.md` vérifient leurs SHA et conservent toutes les phases. Rapport SHA256 `298af29847a2fc2e41e5f23f405ada5be426ce114c77793ff7577a619279b0d7`.

| Interface | CPU/image au survol : témoins → candidat | CPU/image au repos : témoins → candidat |
|---|---|---|
| Ordres | 1,914–1,979 → **1,659 ms** | 1,024–1,041 → 1,026 ms |
| Mobilier d’Architecte | 2,018–2,149 → **2,029 ms** | 0,955–0,977 → 0,923 ms |
| Recherche | 2,056–2,136 → **1,987 ms** | 0,918–0,928 → **1,018 ms** |

Les trois interfaces restent à **deux appels de dessin UI et zéro recapture au repos**. Recherche conserve **234 objets et 67 textures**, contre 228/69 au témoin ; la version initiale comptait 444/102. Ces compteurs sont stables pendant repos et survol. Les deux acquisitions ne constituent pas une comparaison causale du seul correctif, mais la suppression des surfaces redondantes est vérifiée dans la scène.

Des coûts restent observés. Le repos Recherche dépasse les témoins de **0,090–0,100 ms/image**, soit 9,7–10,9 % dans ce banc isolé. L’ouverture modèle+peinture atteint **57,5 ms contre 49,4–51,8** pour Architecte et **60,8 ms contre 47,8–56,4** pour Recherche ; passages uniques en temps mural, hors mesures de survol. Architecte recapture **253,63 M pixels contre 114,65–115,94 M**, environ ×2,2, malgré moins d’appels de dessin moyens ; ses grandes cartes et les régions réunissant plusieurs animations augmentent les surfaces recalculées. Toutes les captures finales sont partielles, au même format HDR/MSAA4.

Le survol est donc contenu dans ce relevé, sans garantir un coût strictement identique en toute situation. Les mesures CDP englobent encore **59–123,2 ms** de protocole autour des fenêtres d’images ; aucune correction arbitraire n’en est soustraite. Aucun temps GPU ni coût physique de VRAM n’est déduit de ces chiffres.

## Charge concurrente et limites

L’utilisateur a annoncé une partie League en parallèle et conserve Brave avec streaming. Les 24 frontières de processus n’observent **aucun exécutable de partie « League of Legends »**, mais les clients League/Riot et Brave sont présents. Le drapeau de stabilité des PID de partie compare ici des ensembles vides ; il ne prouve pas une charge de jeu égale. La charge du streaming n’est pas égalisée non plus. Les anciens résultats V478 avec League fermé ne sont pas utilisés comme témoins de ce lot.

La comparaison porte sur deux interfaces natives ; elle n’établit pas une équivalence avec l’ancienne UI HTML. Elle ne mesure ni FPS global, ni régularité de la partie, ni temps d’exécution GPU, ni VRAM physique. Le contrôle fonctionnel de la vraie GameSession reste séparé. Aucune absence générale de surcoût n’est affirmée ; les limites mesurées restent explicites.
