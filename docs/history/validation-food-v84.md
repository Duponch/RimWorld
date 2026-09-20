# Filière alimentaire durable — validation V84

20 septembre 2026, sur `main`, après V83 `ca6016b`. **Lot validé dans le périmètre ci-dessous.** G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent ; aucun jalon complet.

## Périmètre et référence

Pommes de terre et maïs, cuisinières bois/électrique, table de boucherie, alimentation physique et malnutrition humaine/animale sont réunis dans une seule livraison. Les contrats et recherches sont liés depuis [cultures](../development/food-crops.md), [postes](../development/food-workstations.md) et [malnutrition](../development/malnutrition.md).

L'[audit de progression](../research/colony-progression-observed.md) mesure 87 sauvegardes anonymisées d'une colonie Core historique, J5 à J210, en trois segments. Tutoriel/Phoebe/Easy en 1.6.4633 ne devient pas une moyenne ni un calendrier Cassandra/Récit d'aventure. Les états de stock, récoltes, champs réellement actifs et personnes en caravane restent distingués. Aucun fichier personnel brut, XML propriétaire ou source décompilée n'est publié.

## Campagne regroupée

La [campagne finale](../../artifacts/food-contracts-v84.json) passe **91 contrôles dans 22 fichiers** : production, ateliers, cultures, alimentation, conservation, santé humaine/animale, thermique, construction, ordres, snapshots et migrations. Build et typage passent également ; le build conserve l'avertissement de taille du paquet principal (1,18 Mo minifié, environ 337 ko compressé). La relance des cinq contrôles textiles passe après correction du nom des preuves. Le contrôle documentaire passe sur 301 documents et 3176 liens locaux ; les trois originaux du corpus restent identiques octet par octet.

La vraie fixture V83 `tests/fixtures/scenario-v83.json.gz` provient de notre propre parcours natif V83 : monde Lisière 250² au tick 1118, 1 948 869 octets décompressés, SHA-256 `26c152c06f0f60afec167ddc25f0240eaa2ef9377ee0aa6f0297fc6f9821b0a5`. Sa migration ne change que le numéro de schéma. Les données V84 cachées sous un schéma ancien sont refusées.

Défauts et corrections conservés :

- Première campagne : 62/63, une fixture annoncée V83 contenait les nouvelles politiques alimentaires. Correction de la fixture, aucune tolérance ajoutée au validateur.
- Une première blessure/exposition thermique au même tick que la pulsation de faim pouvait créer un dossier trop tard. Les producteurs font désormais avancer la physiologie avant l'impact ; acquisition unique, absence de doublon et continuation sont testées.
- Déconstruction réelle d'un générateur avec cuisson électrique en file : le test reproduit `Invalid queued work reservation`. Le courant est réconcilié avant les files en fin de tick. Les cargaisons et ingrédients restent conservés, avant et après recharge. Le test produit d'abord un vrai repas électrique.
- La fixture de cargaison électrique identifiait d'abord la pile source au lieu de l'objet porté : elle utilise maintenant `carryPileId`. L'assertion de conservation est maintenue.
- Table en bois : 95 bois et 1400 ticks Core après facteur matériau 0,7 sur la base 2000 ; le premier calcul omettait ce facteur.
- L'affichage du combustible héritait des 10 bois/jour du feu ; il expose désormais 160 bois/jour de préparation, zéro consommation au repos.

## Interface native

[Parcours natif](../../artifacts/food-native-v84.json) réussi en environ **1,9 minute**, Chromium WebGPU natif, 1440×1000, sources gelées. Le pilote commun construit les trois postes par Architecte, tourne leurs emprises, choisit pommes de terre/maïs, ajoute les factures et prépare deux repas au bois avec les légumes fournis. Un repas peut ensuite être mangé pendant le semis : le compteur `producedMeals` mesure la production constatée, pas un stock final de deux repas.

L'alimentation assistée se joue à 1× puis 6×, depuis des états cliniques contrôlés. Un vrai repas est porté et ingéré ; nourriture positive et malnutrition résiduelle coexistent, comme prévu. Sauvegardes/recharges exactes ; aucune erreur de page. Ces cliniques n'attestent pas une famine naturellement survenue dans la colonie longue. L'électricité et la boucherie produisent dans les contrôles CPU et les bancs mixtes, pas dans cette clinique.

Le premier passage natif s'arrêtait après les trois constructions et supposait à tort la recharge déjà terminée. Une attente explicite du trajet/ravitaillement conserve cette assertion. Le log et la trace initiaux restent dans `tmp/v84-native-first.log` et `tmp/v84-native-first-trace.zip`.

Captures : [postes et cultures](../../artifacts/food-stations-v84.png), [patient nourri à 1×](../../artifacts/food-care-1x-v84.png), [patient nourri à 6×](../../artifacts/food-care-6x-v84.png). Elles montrent des fixtures déclarées, pas un camp obtenu depuis une dotation réelle.

## Charge CPU, worker et rendu

[CPU](../../artifacts/food-chain-cpu-v84.json), puis [natif](../../artifacts/food-chain-render-v84.json), successivement : AMD Ryzen 5 3600, adaptateur AMD RDNA-1 exposé par Chromium, carte 250², 3/30/100 colons et autant de lièvres. Préparation contrôlée : recherche/minage, postes construits, intrants et dépouilles fournis, cultures mûres puis récolte/ressemis, malnutrition légère chez des cultivateurs nourris. Ce profil diffère de la charge chasse V83 ; il ne prouve pas un gain comparatif.

| Acteurs humains + animaux | CPU tick p95 / max | Encodage p95 | Image p95 / max | Worker p95 des moyennes de lots | Débit réel, cible 36 ticks/s |
|---|---:|---:|---:|---:|---:|
| 3 + 3 | 2,83 / 15,84 ms | 4,22 ms | 8,4 / 29,2 ms | 4,10 ms | 35,45 |
| 30 + 30 | 14,20 / 33,58 ms | 6,42 ms | 16,7 / 41,7 ms | 14,45 ms | 35,30 |
| 100 + 100 | 44,13 / 113,84 ms | 7,55 ms | 20,7 / 50 ms | 45,90 ms | 30,78 |

CPU : 650 ticks par charge, 100 ticks de chauffe sur une instance distincte. Natif final : 90 images de chauffe, puis respectivement **659 ticks en 18,589 s, 664 en 18,812 s et 661 en 21,472 s**, jusqu'à la pause ; l'encadrement des clics entre dans le temps observé. Cela représente environ 5,91×, 5,88× et 5,13×, pour une demande de 6× : **6× non tenu à cent personnes**. À cette charge, le p99 image est 29,2 ms, avec un maximum de 50 ms ; le maximum CPU pur de 113,84 ms reste conservé. Les mesures worker sont des moyennes de lots publiés, pas des percentiles indépendants par tick.

Le premier cadrage montrait surtout les bureaux et laissait les postes alimentaires hors champ. Son [rapport](../../artifacts/food-chain-render-initial-view-v84.json) et ses captures `food-chain-load-initial-view-v84-{3,30,100}.png` restent conservés. Le cadrage final englobe recherche, positions initiales des colons, postes alimentaires, générateurs et cultures, avec marges pour l'interface. Caméra réglée **avant** le préchauffage, immobilité vérifiée pendant la mesure ; les 3/30/100 centres de colons restent dans le rectangle utile en fin de parcours. Le niveau de détail distant **overview est actif à cent**, contrairement aux deux petites charges : ces nombres ne sont donc pas une mesure de cent personnages vus de près. [Vue générale à cent](../../artifacts/food-chain-load-v84-100.png). La [capture rapprochée des premières parcelles alimentaires](../../artifacts/food-chain-stations-v84-100.png) est prise après la mesure, comme les vues rapprochées à 3 et 30 ; déplacement de caméra, zoom et attente de cette capture sont exclus des percentiles. Aucun gain face à V83 ni face au premier cadrage n'est déduit de ces conditions différentes.

Pas de nouveau pipeline capturé pendant la mesure, tampons stables, états valides et résultats métier atteints. À cent personnes, **32 boucheries** sont terminées, 34 plants de chaque culture ressemés et toutes les cuisinières ont produit ; 65 des 68 repas demandés sont terminés, deux factures restent en cours et 49 repas sont encore présents. La récupération de malnutrition reste partielle. Les postes/intrants/dépouilles et cultures mûres sont fournis : ce banc court ne démontre pas une alimentation autonome. Poste utilisateur non isolé ; le processus RimWorld est encore présent lors du relevé suivant, sa charge de fond n'est pas quantifiée.

## Parcours réel et limites

Le pilote `crashlanded-colony` vise 24 jours depuis la dotation réelle, 80 cases de riz, cuisinière, table de boucherie, chasse limitée, réserve couverte puis 24 pommes de terre et 24 maïs. Aucun aliment, animal, combustible ou événement n'y est injecté. Préflight : 120 ticks, 19 commandes, 80 cases de riz acceptées, monde valide. Le compteur de récoltes corrèle désormais l'événement, le travail achevé et la disparition du plant ; broutage/coupe ne doivent pas simuler une deuxième récolte. Une ambiguïté produit un diagnostic plutôt qu'un résultat silencieux.

Premier parcours : arrêt à **J22,708**, tick 136250, après environ 501 secondes de test. Les checkpoints quotidiens progressaient normalement ; il ne s'agissait pas d'une commande bloquée. Après le troisième raid, Ada restait sans traitement et perdait assez de sang pour tomber à terre. Les stocks contenaient encore 19 rations, 9 repas simples et 472 riz : cette chute ne résultait pas d'un manque d'aliments.

Diagnostic sur les états réellement atteints : les trois lits du pilote avaient leur tête contre le mur nord et aucune case de chevet accessible. La priorité Médecine était déjà à 1, mais aucun soignant ne pouvait y traiter un patient. Les fichiers `tmp/crashlanded-failed-uncared-v84-42.json` et `tmp/crashlanded-day22-uncared-v84-42.json` conservent respectivement la chute et l'état précédent le raid. Le pilote corrige l'orientation des lits vers l'allée et la prise en charge des blessés par les commandes ordinaires ; aucune règle de blessure, de chevet ou de consommation n'est adoucie.

Les premières observations restent identifiées comme celles du parcours arrêté : première récolte de riz à J7,045, premier repas contenant ce riz à J7,070, dernière ration consommée à J7,078, et les 80 cases récoltées deux fois avant J16. À J22, les compteurs atteignent 1314 riz et 264 pommes de terre récoltés, 92 repas contenant du riz, sans maïs mûr. Elles ne remplacent pas le résultat du rejeu complet corrigé.

Le [diagnostic depuis J22](../../artifacts/food-care-diagnostic-v84.json) passe jusqu'à J24 en 48,9 secondes. Les trois lits ont été réinstallés un à un, avec les mêmes identités et emprises, sans nouvelle construction ni perte de matière ; le préflight conserve leurs trois accès réels dans `tmp/v84-bedside-preflight.json`. Le rapport détaillé de cette reprise reste dans `tmp/crashlanded-care-diagnostic-full-report-v84.json`, son empreinte accompagne le résumé public. Cette reprise ne remplace pas le rejeu complet.

Le [rejeu intégral](../../artifacts/crashlanded-colony-v84-42.json) passe depuis zéro : **144000 ticks, 24 jours écoulés, 439,1 secondes de test** (441,9 secondes commande complète), graine 42, `resumed:false`. Chaque checkpoint quotidien est rechargé, avancé de 100 ticks en double puis comparé exactement. L'affichage civil indique alors « Jour 25 », puisque les repères de cette enquête comptent le temps écoulé depuis l'arrivée.

| Observation du parcours corrigé | Résultat réellement obtenu |
|---|---|
| Abri et cuisine | Trois lits abrités, cuisinière à bois à J0,25, table de boucherie à J1, réserve couverte ; une vraie chasse puis boucherie à J1,29 |
| Riz | Première récolte J7,0458, premier repas contenant ce riz J7,0675 ; les 80 cases récoltées deux fois avant J16 ; 1434 unités récoltées au total, 933 utilisées dans 94 repas |
| Diversification | 24 pommes de terre et 24 maïs ; première récolte de pommes de terre J21,2722, 264 unités obtenues et 114 cuisinées ; maïs toujours immature, croissance moyenne 55,66 % |
| Repas et réserves | 119 repas préparés à la cuisinière, 112 mangés ; 7 repas, 501 riz, 150 pommes de terre et 19 rations encore présents à J24 |
| Indépendance des rations | Dernière ration consommée J7,0413 ; entre J17 et J24, 14 ingestions hors rations par colon. Les rations sont restées disponibles, sans confiscation |
| Colons et combats | Trois colons vivants et actifs après trois raids ; soins physiques et 6 médicaments utilisés, dont un ordre de traitement après le deuxième raid. Jauges de nourriture et de repos au-dessus de zéro à chaque observation |

Les ingestions hors rations peuvent aussi être crues ; la cuisson du riz possède ses compteurs séparés. Les matières sont conservées, nourriture incluse avec récoltes, cuisson, ingestion, pourriture et consommation animale distinguées. Cette colonie n'a pas dû traverser une famine : les conséquences médicales et la récupération après pénurie sont établies dans les scénarios et cliniques contrôlés. Une seule graine, un climat fixe, une population de trois et des recettes limitées ne certifient pas une économie générale ni la progression complète de la partie historique.

La [restauration native de cette colonie réelle](../../artifacts/food-colony-native-v84.json) passe en **17,3 secondes** (18,8 secondes commande complète) : vrai bouton Charger de l'accueil, inspections des trois champs et des deux postes construits, sauvegarde/recharge exacte, puis **126 ticks à 6×** et nouvelle recharge exacte. Aucune modification du checkpoint, aucun ajout de matière, aucune erreur de page. [Capture de la colonie à J24](../../artifacts/food-colony-native-v84.png). Le parcours complet de 24 jours reste un pilote CPU par commandes ; cette session native est une restauration et continuation, pas 24 jours joués dans le navigateur.

La campagne de régression textile écrivait encore un checkpoint courant sous un nom V74. Le nouveau résultat est conservé sous V84, les trois preuves V74 sont restaurées depuis leur version publiée, et les sorties du test utilisent désormais le schéma courant ou `VALIDATION_VERSION`. Aucun résultat historique n'est remplacé par une exécution récente.

Hygiène/salissures/nettoyage/intoxication, recettes avancées, élevage, soins vétérinaires, réseau électrique complet, saisons, commerce et prisonniers restent absents ou partiels. La chaîne ne certifie ni tout Core ni une colonie autonome à toutes tailles et sur tous sites. Recherche/analyse et développement ont été parallélisés ; ces preuves ne mesurent aucun gain global de temps ou de consommation.
