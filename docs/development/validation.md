# Validation du prototype

## État courant : cartes moyennes 250² — 13 septembre 2026

Le défaut jouable est 250×250, avec 200² et les dimensions compactes conservées. Les anciennes sauvegardes gardent leur terrain et leurs identités. Les [mesures appariées de simulation, communication et rendu](map-scale.md) distinguent l'ancien défaut 64², l'ancien moteur dont seules les bornes sont étendues, et le nouveau moteur. Elles documentent également les coûts supplémentaires de mémoire et de préparation ; aucune absence générale de régression n'est revendiquée.

**Noyau : 14/14 scénarios passent en 19,14 s**, dans quatre fichiers : huit familles de simulation, trois de génération, deux de contrats GPU et une de transport des snapshots. Les familles existantes comprennent toujours 60 000 ticks avec conservation ; la génération couvre maintenant 60 paysages, 13 dimensions rectangulaires, 12 départs de camp et un trajet dépassant les anciennes tailles de carte. La comparaison CPU de contrôle vérifie séparément l'égalité complète des générations et continuations. Les tests Vitest de contrats GPU ne lancent pas les shaders.

Après ce passage, la frontière de présentation a reçu un indicateur explicite de remplacement de carte. L'intégration a ensuite détecté un défaut d'ordre des clés JSON dans la reconstruction des deltas : les valeurs étaient égales, mais le snapshot n'avait plus exactement la représentation de la sauvegarde autoritaire. La reconstruction préserve désormais l'ordre du checkpoint et le scénario de codec exige aussi l'égalité JSON intégrale. **Ce scénario ciblé repasse sur le code final en 746 ms** ; la simulation, déjà vérifiée, n'a pas changé depuis le passage global.

**Les trois parcours navigateur passent dans un même appel `npx playwright test`**, en environ 1,2 minute, après cette correction :

| Parcours | Navigateur | Durée |
|---|---|---:|
| Portage physique, réserve filtrée, couchages, sauvegarde/reprise exacte pendant livraison | Chromium normal | 14,1 s |
| Commandes répétées, chargement invalide atomique, vraie migration V1, interface compacte | Chromium avec SwiftShader | 41,6 s |
| Défaut 250², créations 128²/200²/250², sauvegarde/rechargement 250², restauration intégrale de l'ancienne colonie 32² | Chromium normal | 12,5 s |

Ces durées sont des contrôles fonctionnels, pas des benchmarks. Le test des grandes cartes compare les mondes complets, pas uniquement leur dimension ou leur hash. Les parcours inspectent les erreurs console et de pipeline.

**Build final TypeScript/Vite réussi** : jeu 973,26 ko minifiés / 268,66 ko gzip ; worker 38,94 ko ; simulation partagée 10,58 / 4,58 ko ; laboratoire GPU 18,29 / 7,29 ko. L'avertissement du bundle principal supérieur à 500 ko demeure visible. Ni les dépendances ni les kernels de navigation GPU n'ont changé dans cette tranche.

La préparation des rapports a révélé deux défauts d'instrumentation graphique : un parcours quittait entièrement la carte et un retour Playwright sérialisait le renderer. Les profils affectés sont explicitement exclus ; seules les comparaisons nettoyées sont retenues dans [map-scale.md](map-scale.md). Les limites de cette machine et les pointes encore observées font partie du résultat.

**Contrôle graphique final 250² réussi à 13:41:17 UTC**, WebGPU sur AMD/RDNA-1, sans erreur console/GPU : portage physique, mur et lit 1×2 achevés, quatre orientations, occultation sans mutation de la simulation, interface compacte et reprise de poses au chargement. Le chargement garde terrain et IDs identiques mais augmente le tick et déplace un colon ; les poses initiale et finale sont immédiatement égales à sa position restaurée. Le [rapport courant](../../artifacts/render-probe.json) et [l'inspection visuelle](render-validation.md) précisent les captures réellement examinées. Les mesures de performance ont précédé le correctif d'ordre des clés du codec ; leurs timestamps restent inchangés.

## Historique : tranche matérielle G0, schéma 2 — 13 septembre 2026

Cette section décrit les preuves de la tranche matérielle avant le passage aux cartes 250². Les sections suivantes sont **historiques** : leurs nombres, backends et simplifications décrivent les versions alors testées. La boucle matérielle est livrée ; G0 conserve les limites détaillées dans [ROADMAP](../ROADMAP.md) et [les choix de gameplay](../gameplay/decisions.md).

`npm test` réussit avec **13/13 scénarios en 10,46 s** : huit familles de simulation, trois de génération et deux de contrats GPU. Les huit familles incluent 60 000 ticks sur cinq graines avec bilan matière et invariants à chaque tick. Elles couvrent partage et fusion de piles, réservations de quantités et capacités, interruptions aux transitions de portage, livraison partielle, reprise exacte, empreintes et migrations V1 actives ou interrompues. Les régressions finales couvrent aussi une capacité abaissée avec report vers une réserve de priorité égale, un colon inactif bloquant seulement la destination, et une recherche de 40 000 couples reprise après la fenêtre de 32 768 via le curseur sauvegardé. Les tests de contrats GPU n'exécutent pas les kernels sur un appareil.

Le build TypeScript/Vite réussit. Les tailles produites sont :

| Sortie JavaScript | Minifiée (ko) | Gzip (ko) |
|---|---:|---:|
| Jeu | 968,25 | 266,85 |
| Worker | 37,21 | — |
| Module de simulation partagé | 10,51 | 4,56 |
| Laboratoire GPU | 18,29 | 7,29 |

Ces tailles ne mesurent ni chargement réseau ni fluidité. L'avertissement de taille du bundle principal reste visible.

Les **trois parcours navigateur passent lors de passages ciblés successifs**, sur les mêmes sources finales :

| Parcours | Navigateur | Durée du test |
|---|---|---:|
| Transport réel, pause pendant le portage, sauvegarde/reprise exacte, annulation depuis la seconde cellule du lit | Chromium normal, adaptateur sélectionné automatiquement | 20,4 s |
| Frontières de commandes, chargement invalide atomique, migration d'une vraie sauvegarde V1, interface compacte | Chromium avec SwiftShader | 54,8 s |
| Cartes 64²/128² et restauration intégrale de la colonie précédente | Chromium normal | 28,3 s |

Ces durées ne sont pas des benchmarks. L'ancien parcours matériel logiciel observait parfois une cargaison, puis la demande de pause arrivait après son dépôt. Le helper envoie désormais la pause dans la même observation navigateur que la détection du portage et attend la pause autoritaire. Le passage matériel utilise Chromium normal ; le test de frontières conserve le backend logiciel. Un résultat « trois parcours passés » n'affirme pas qu'ils ont été exécutés dans un unique appel global.

Le [diagnostic graphique archivé](../../artifacts/render-probe-material.json), daté du **13 septembre 2026 à 12:44:44,892 UTC**, rapporte **WebGPU sur AMD/RDNA-1**, sans erreur. Il capture une cargaison de sept bois appartenant au colon 734, puis construction réelle d'un mur et d'un lit 1×2, en pause au tick 420. Le script attend deux images avant les captures ; le code du jeu est inchangé. Un [contrôle ciblé des aperçus aux quatre orientations](../../artifacts/placement-preview-probe.json) n'a révélé aucun défaut. Captures et portée dans [render-validation.md](render-validation.md). Cela valide le chemin graphique exercé, sans preuve de performance de centaines de personnages, de rigs glTF ou de rendu et navigation compute simultanés.

### Mesure finale du noyau matériel

[Données brutes schéma 2](../../artifacts/simulation-benchmark.json), **13 septembre 2026 à 12:39:49,525 UTC**, Node v24.11.1, Windows x64, AMD Ryzen 5 3600, 12 processeurs logiques, 17 131 188 224 octets de mémoire système. Le protocole emploie cinq mondes neufs par population, carte ouverte 64², collecte distante et stockage dimensionné pour tout le bois. Il mesure le premier tick, 200 ticks supplémentaires par lots de 20, puis vérifie les résultats à 1 001 ticks. Le monde inactif est distinct ; le portage est limité à dix unités.

| Colons | Premier tick médian (ms) | Tick actif médian (ms) | p95 des moyennes de lots (ms/tick) | Tick inactif médian (ms) | Travaux achevés à 1 001 | Bois stocké à 1 001 |
|---:|---:|---:|---:|---:|---:|---:|
| 3 | 0,849 | 0,013 | 0,076 | 0,013 | 3/3 | 36/36 |
| 30 | 1,481 | 0,025 | 0,405 | 0,013 | 30/30 | 336/360 |
| 100 | 1,485 | 0,055 | 0,956 | 0,020 | 100/100 | 1 038/1 200 |
| 300 | 2,041 | 0,914 | 2,244 | 0,040 | 300/300 | 2 783/3 600 |

Les achèvements et quantités stockées sont les moyennes des cinq répétitions. La conservation est vérifiée dans chaque répétition. **Collecte achevée ne signifie pas stockage achevé** : à 300 colons, 2 783 des 3 600 bois sont en réserve à la fin de la fenêtre. Les quantités restantes existent encore ailleurs ; cette mesure ne ferme pas le chantier de congestion. Les maxima du premier tick et observations d'affectation restent dans le JSON.

Le p95 porte sur des moyennes de lots, pas sur les pointes individuelles. Le test inclut besoins, BFS, travail et transport CPU ; il exclut GPU, rendu, navigateur, DOM, échanges worker et persistance. Ces chiffres ne donnent aucun FPS. L'ajout du transport change le scénario par rapport au schéma 1 : **aucune comparaison A/B** n'est déduite de l'écart avec les [données initiales](../../artifacts/simulation-benchmark-initial.json).

## Historique : adoption documentaire du corpus utilisateur — 13 septembre 2026

Les trois fichiers de `docs/new_docs` ont été examinés : lecture des 36 chapitres HTML, extraction et comparaison du PDF de 49 pages, inspection visuelle de dix pages structurantes, lecture des neuf feuilles du classeur et contrôle de ses identifiants/compteurs. HTML et PDF contiennent le même rapport. Les 181 premiers TEST ont été comparés à leurs fiches SYS : ce sont des critères reformulés, et aucun des 196 TEST du dossier n'est donné comme exécuté. L'annonce officielle 1.6.4850 a été recontrôlée ; les constantes et la parité complète n'ont pas été vérifiées en jeu.

Les décisions, renvois erronés et annexes absentes sont dans [reference-adoption.md](../research/reference-adoption.md). ROADMAP, matrice, architecture, stratégie de tests et consignes de reprise ont été harmonisés autour de ces références. Cette livraison est documentaire : aucun code ni comportement du jeu n'a changé. Les contrôles portent sur les liens locaux, la traçabilité et la cohérence des jalons ; les suites de simulation et navigateur n'ont pas été relancées. Les résultats ci-dessous restent ceux de leurs exécutions antérieures.

## Historique : extension spatiale, interface et navigation GPU — 13 septembre 2026

Le générateur spatial, les dimensions 3D, l'organisation d'interface et le laboratoire de navigation ont été ajoutés après la validation initiale consignée plus bas. `npm test` réussit avec **13/13 scénarios** : 8 de simulation, 3 de génération et 2 de contrats/oracle de navigation. Le soak de 60 000 ticks fait toujours partie des huit scénarios de simulation. Les familles et leur portée sont dans [testing.md](testing.md).

`npm run build` réussit avec deux entrées : jeu et laboratoire. Le JavaScript du jeu représente 956,22 ko minifiés / 263,02 ko gzip ; le laboratoire 22,59 ko / 9,26 ko. Le worker fait 17,21 ko. Ces tailles de fichiers ne sont pas une mesure de chargement réseau. L'avertissement de taille du bundle du jeu demeure visible.

La validation matérielle du calcul GPU couvre **110 requêtes sur 18 fixtures répétées**, puis invalidation en vol, concurrence et capacités ; aucune divergence de coût ou de chemin admissible et aucune erreur GPU. Les mesures de lots, conditions et limites sont dans [gpu-navigation.md](../research/gpu-navigation.md). Les tests Vitest seuls ne prouvent pas l'exécution des shaders. L'essai WebGPU logiciel n'a pas trouvé d'adaptateur et reste non validé.

L'interface du laboratoire a été exercée séparément sur le GPU AMD/RDNA-1 : paysage 64², obstacle 250², résultat vérifié contre Dijkstra et édition invalidant le chemin. [Diagnostic du laboratoire](../../artifacts/navigation-lab-smoke.json). Aucune performance de foule ni de rendu simultané n'est déduite de ces contrôles.

Le contrôle final du jeu sur WebGPU, après réglage de l'angle de caméra et correction de la surface du socle, réussit également sans erreur : collecte, construction réelle de mur/lit, coupe, feuillage et priorités accessibles. Le diagnostic attend explicitement la pause autoritaire avant de comparer l'état ; cliquer sur Pause sans attendre son acquittement créait une course dans la version précédente du script. [Rapport graphique et captures](render-validation.md).

**Les trois parcours d'intégration ont réussi lors de passages ciblés successifs** : collecte → trois lits réellement achevés → alerte supprimée → sauvegarde/reprise exacte et annulation ; rafale de priorités, chargement invalide atomique et organisation 1280×720/768×900 ; création des cartes 64²/graine 271 et 128²/graine 4 294 967 295 puis restauration intégrale de la colonie 32² avec son ordre et sa priorité désactivée. Les deux premiers utilisent SwiftShader avec repli WebGL 2. Le troisième lance Chromium normal et s'achève en 17,7 s sur cette machine ; cette durée n'est pas un benchmark.

Le parcours 128² sous SwiftShader a dépassé son budget global de 90 s, malgré les derniers états et assertions consultés corrects. Le point précis du dépassement n'a pas été isolé ; on ne déclare donc pas ce backend validé pour ce parcours. Un [diagnostic des extraits observés](../../artifacts/integration-software-diagnostic.json) est conservé ; le zip complet a été effacé par le run suivant, ce qui limite l'analyse rétrospective. Le transfert des états au protocole Playwright utilise une chaîne JSON, et leur comparaison intégrale évite de parcourir des milliers d'objets dans le matcher. Ce changement préserve la comparaison exacte ; aucune assertion de conservation n'a été remplacée par une simple longueur ou un hash.

Le générateur a également fait l'objet d'une exploration de 480 cartes. Une graine enfermant le départ a conduit à une réparation de passage vers la région principale de sa rive. Le contrat régulier contrôle 36 paysages quantifiés et neuf continuations de parties. [Détail de génération](world-generation.md). Les anciennes sauvegardes sont chargées sans régénération ; un nouveau départ avec une ancienne graine peut changer de paysage.

Les séquences de la vidéo fournie réellement consultées et leurs limites sont consignées dans [visual-reference.md](../research/visual-reference.md). Elles fondent la structure d'interface et l'interprétation des volumes ; elles ne constituent pas une validation de combat, de fuite ou des diagonales de RimWorld.

## Historique : validation initiale

### Environnement initial

Première validation réalisée le 13 septembre 2026, Windows x64, Node 24.11.1. Dépendances exactes dans package-lock.json. Le serveur Vite utilise localhost ; aucune publication distante n'a été faite.

### Contrôles fonctionnels initiaux

`npm run check` a réussi sur la version finale des règles : **8/8 scénarios de simulation, build TypeScript/Vite et 2/2 scénarios d'intégration**. Les dernières corrections de présentation ont ensuite été vérifiées par l'inspection WebGPU ciblée et un nouveau build. Le bundle Three.js reste volumineux : environ 0,95 Mo minifié, 0,26 Mo gzip, avant cache HTTP. L'avertissement de taille du bundler reste visible ; il ne doit pas être masqué pour donner l'impression d'un chargement optimisé. Le découpage et le chargement des futurs assets seront évalués avec leur coût réseau réel.

Les huit scénarios de simulation couvrent déterminisme et sauvegarde en trajet, concurrence et conservation des matériaux, accessibilité/commandes invalides, épuisement et récupération, faim critique, nouvelle obstruction de chemin, 23 familles de corruptions de sauvegarde et soak sur cinq graines. Le soak totalise 60 000 ticks, soit dix jours cumulés ; il ne représente pas dix jours pour chacune des cinq colonies.

Deux scénarios d'intégration Chromium pilotent la carte et les commandes réelles. Ils couvrent production des ressources, construction, priorités, pause, restauration exacte d'un état en attente, annulation, chargement invalide atomique, aide et format compact. La frontière horloge/commandes est aussi exercée par une rafale d'actions de priorité. Captures dans artifacts/, traces conservées uniquement en cas d'échec.

### Défauts initialement détectés et corrigés

| Défaut | Correction et preuve |
|---|---|
| Priorité 3 choisie avant 1 alors que l'interface promettait l'inverse | Tri ascendant, 0 exclu ; scénario d'une collecte prioritaire plus lointaine qu'un chantier. |
| Envoi de commandes réinitialisant le temps réel du worker | Réinitialisation limitée aux changements d'horloge ; rafale d'actions dans l'intégration. |
| Retour BFCache conservant l'interface mais un worker détruit | Pas de destruction sur pagehide.persisted ; correction relue. Parcours retour/avance BFCache encore à automatiser. |
| Colon inactif bouchant indéfiniment un passage | Cession locale déterministe ; fixture de couloir et conservation de non-chevauchement. |
| Affectation simultanée de centaines d'acteurs provoquant une pointe de BFS | Maximum huit recherches par tick, ordre d'examen rotatif et test de progression de tous les travaux. |
| Rig dépassant les huit emplacements de vertex buffers du device testé | Attributs géométriques entrelacés, cinq buffers utilisés ; compilation et affichage WebGPU vérifiés. |
| Surfaces de dalles voisines se superposant | Dimensions ramenées à une cellule exacte ; inspection graphique ciblée. |

### Mesures initiales de simulation

Les [données brutes initiales](../../artifacts/simulation-benchmark-initial.json) concernent le moteur à stock global du schéma 1. Elles séparent premier tick d'affectation, travaux actifs et population inactive, avec issues métier contrôlées. Le [contrat courant de simulation](simulation.md) décrit désormais le schéma 2 ; le tableau en tête de ce document et le nouveau fichier de benchmark portent sur le transport physique. Aucun de ces résultats ne comprend rendu, GPU, interface, messages worker, sérialisation ou congestion générale d'une vraie colonie.

Les percentiles des lots de 20 ticks décrivent des **moyennes par tick de lot**, pas la queue de distribution de ticks individuels. Les différences entre runs reflètent aussi la charge de la machine ; comparer des modifications exige le même protocole et plusieurs répétitions.

### Rendu initial et limites de la preuve

Les tests d'intégration de cette première version utilisaient Chromium et SwiftShader, avec repli WebGL 2 observé. Ils validaient l'intégration et la compilation du chemin de compatibilité ; leurs FPS ne représentaient pas le GPU de l'utilisateur. Des passages séparés avaient validé le pipeline WebGPU sur AMD/RDNA-1, avec personnages et ombres sans erreur console. Le [compte rendu graphique](render-validation.md) et `render-probe.json` sont maintenant actualisés pour la tranche matérielle ; leur dernier contenu ne constitue pas une archive du premier passage.

Restent à valider avant annonce de performance : centaines d'acteurs animés et équipés, import glTF réel, transitions de clips, perte/restauration de device, vrai matériel de référence, coût des snapshots et profils p95/p99 de frames. Le compteur intégré ne mesure qu'une cadence d'images et un coût CPU récent de simulation.

### Portée des preuves historiques

Ces preuves concernent le prototype et les scénarios décrits. Elles ne certifient ni l'équivalence complète à RimWorld, ni la validité de toutes ses formules, ni toutes les combinaisons futures de mécaniques. Les prochaines fonctionnalités doivent étendre les invariants et scénarios correspondants.
