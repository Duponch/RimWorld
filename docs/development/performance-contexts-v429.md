# V429 — performances dans plusieurs contextes

Lot qualifié par reprises, prêt pour publication ; aucune publication V429 à ce stade. La V428 publiée est `8ca17603`, déploiement `e4e82954`. Schéma263 inchangé. Les gains×1 sont acquis sur trois références ; le confort général et les200FPS stables restent ouverts, particulièrement au départ neuf×6. Aucun contenu jouable nouveau ni réduction du réglage graphique.

## Références

La comparaison reprend Les Aulnes publiques V394 au10733, Les Éclaircies V419 au1730 et le vrai départ trois colons créé par les menus V419, conservé au35. Aucun nouvel état favorable n'est fabriqué. Les fichiers d'entrée et leurs SHA sont consignés dans `tmp/performance-matrix-v429/sim-audit/input-inventory.json` et dans chaque reçu natif.

| Entrée | Personnes | Structures | Travaux | Ressources | Climat |
| --- | ---: | ---: | ---: | ---: | --- |
| Les Aulnes |15|2454|128|17912|historique1|
| Les Éclaircies |3|416|13|28208|géographique4|
| Départ neuf |3|162|0|28371|géographique4|

Les nombres décrivent les fichiers d'entrée, avant migration. Le mécanisme naturel V428 acceptait déjà le climat1 des Aulnes ; son ouverture au climat4 ne constitue donc pas le même gain potentiel. Le départ35 conserve un facteur thermique nul sur sa flore, contrairement aux Éclaircies1730. Taille de population, travail et croissance diffèrent réellement ; leur histoire de préparation reste celle des notes V394/V419.

## Référence native V428

`v429-matrix-baseline-gc-2026-10-18T21-11-21.153Z-22020` passe210,553s : trois imports UI stricts, six fenêtres×1 et trois exports complets. Chrome155 headless avec WebGPU matériel AMD, Ryzen5 3600/RX5700XT,2560×1440/DPR1. Qualité équilibrée, textures/herbe/diorama/pièce/occlusion actifs, ombres2048/60Hz, son coupé. Les mêmes gestes UI établissent une vue perspective large inclinée ; la cible initiale réelle de chaque carte est conservée et chaque pose enregistrée. Fixe puis300gestes rapides sur la même continuation ; durée demandée4s, durée réelle consignée. Pas de profileur ni timestamps GPU dans ces fenêtres. Les1738sources sont vérifiées exactement avant/après chaque partie.

L'utilisateur a fermé sa page du jeu ; Firefox/YouTube restait signalé, et la mise en pause de la vidéo a été recommandée sans confirmation supplémentaire reçue. Ce facteur concurrent n'est pas attribué causalement à un résultat. Le premier lancement `baseline01`, dépourvu de l'option Node de collecte mémoire requise par le pilote, a été interrompu avant mesure ; il ne compte pas comme contrôle réussi. Aucun navigateur de ce lancement ne subsistait au relevé des processus suivant.

| Partie×1 | FPS fixe / rotation | CPU image fixe / rotation | RAF p99 fixe / rotation | Maximum fixe / rotation |
| --- | ---: | ---: | ---: | ---: |
| Les Aulnes |184,65 /162,61|3,28 /4,08ms|25,0 /25,0ms|54,2 /29,2ms|
| Les Éclaircies |165,88 /124,43|4,73 /6,28ms|25,0 /33,3ms|37,5 /37,5ms|
| Départ neuf |180,93 /104,59|4,30 /7,26ms|16,7 /25,1ms|20,9 /33,3ms|

Une image>50ms est observée aux Aulnes fixes ; aucune dans les cinq autres fenêtres. Les rotations durent4,4523/4,5810/4,5990s, avec724/570/481images. En rotation, application d'état moyenne9,69/17,73/8,10ms, admission0,89/1,33/0,71ms, pas Worker30,48/25,12/15,18ms et encodage7,94/17,89/20,16ms. Ces chronomètres se recouvrent ; ne pas les additionner. Le débit observé vaut0,973/0,982/0,978×. Le départ neuf est le plus lent en rotation malgré son application et sa simulation moins coûteuses : il faut conserver le rendu parmi les priorités.

Les trois preuves sont complètes et sans erreur, avec comparaison navigateur entière et validation stricte : Aulnes10792 SHA `e6077354acdfdd08e116ffda2b609352e6d6ef55a9734385f30ff76ed72ee0d7` ; Éclaircies1790 SHA `d939932f4bc85c3221a36224d6593303ec421ce25fd09e49e397412cfa1f0ab5` ; départ96 SHA `671e52fb5685ee2dea230b89b0921552d0babd24ffafae89cbb8e023e86df479`. Pas de nouvelle recharge finale après ces exports. Données sous `tmp/performance-matrix-v429/baseline02`.

Une courte fenêtre par condition ne prouve ni200FPS stables, ni l'affichage physique, ni un gain face à V427. La première matrice établit les poses de référence V429 et ne se substitue pas aux comparaisons historiques V428 dont le protocole diffère.

## Diagnostic et modifications candidates

Deux profils MAIN supplémentaires Aulnes/départ passent144,462s (`v429-matrix-profiles-2026-10-18T21-15-07.770Z-19020`). Leurs FPS instrumentés ne remplacent pas les fenêtres natives ci-dessus. En rotation, le départ cumule environ3021ms échantillonnées dans le rendu, dont2469ms dans la soumission des objets (999ms ombres), contre2408/1839/642ms aux Aulnes. L'application d'état est au contraire plus faible au départ (142 contre252ms). Les bornes de végétation ne représentent qu'environ1,6ms dans chacun de ces deux profils ; leur optimisation seule ne peut expliquer une amélioration générale. Analyse pondérée conservée sous `tmp/performance-matrix-v429/render-audit`.

Les bornes de chaque plage de végétation sont désormais retenues sur CPU. Une croissance relit les seules plages modifiées, puis réunit leurs volumes conservateurs ; les positions, normales, indices et objets GPU restent identiques. Le repli complet demeure pour une plage non couverte. Les tests privés passent8cas en19,659s, types en7,518s ; croissance, retrait, retour, déplacement, hydroponie et recul sont comparés à la préimage V428. Banc alterné de1024arbres : médiane6,500→5,150ms, moyenne6,484→5,655ms ; le maximum est moins bon (8,531→9,865ms). Il s'agit du coût ciblé, pas des FPS. Les sphères sont légèrement plus larges : le coût du rejet graphique reste à mesurer. Sources intégrées, qualification native finale encore ouverte.

Le second candidat ajoute un journal dérivé des cases effectivement modifiées dans le Worker de présentation. L'encodeur public, les importeurs et les sauvegardes restent complets. Les curseurs sont indépendants ; remplacement du tableau, historique dépassé ou invalidation globale imposent un parcours complet. Une exception impose un checkpoint à toute reprise explicite. Le risque principal reste l'oubli d'un chemin d'écriture : revue indépendante de dix writers directs et sept transactions globales, sans exhaustivité prétendue. Premier typage privé rouge sur le test des anciennes campagnes (union avec campagne sans carte), corrigé par le garde réel `hasLoadedRoot`, sans cast ni retrait d'assertion. Qualification ciblée et banc acquis ci-dessous ; gain général non déduit du microbanc.

Une ablation séparée compare des secteurs de rendu64 et128 sur le même départ, avec les mêmes sources de bornes, sans changement de qualité. Elle vise le coût de soumission observé ; des secteurs plus grands peuvent augmenter les triangles exécutés, modifier l'ordre de dessin et alourdir une reconstruction. L'essai ne vaut pas décision d'intégration.

### Journal qualifié sur le chemin ciblé

Reprise des types7,574s puis11cas/3fichiers40,364s acquis (`v429-journal-private-types-reprise`, `v429-journal-private-tests`). Le banc séparé passe35,077s :8paires d'échauffement puis32paires alternées par partie, encodage seul chronométré, clones/comparaisons/SAVE hors mesure. Tous les paquets entiers sont égaux. Un véritable `placeCollapsedRock256` sur une case existante libre produit également le même delta et un SAVE strict ; cet effet préparé n'est pas présenté comme un effondrement naturellement joué. Aucun tick de simulation n'est avancé dans ce banc.

| Encodeur médian, ms | Parcours public complet | Journal fermé |
| --- | ---: | ---: |
| Les Aulnes |14,7545|4,1466|
| Les Éclaircies |26,2666|12,1983|
| Départ trois colons |25,2222|11,3799|

Le témoin est le codec public factorisé de ce lot, pas le binaire V428. Les diminutions ciblées de54–72% ne sont pas des gains FPS. Reçu et données : `tmp/performance-matrix-v429/terrain-journal-bench/report.json`. Les24fichiers ont ensuite été intégrés après vérification exacte des préimages et de la candidate ; aucun schéma ou format sauvegardé ajouté.

### Secteurs graphiques128 : ablation, puis compromis rejeté pour la végétation

Les deux bras natifs passent77,020/80,030s sur le départ35. Source commune avec les bornes, pose entière strictement identique, seule valeur64→128 remplacée dans le module servi. En rotation, cadence114,22→165,01FPS, CPU image6,554→4,361ms, RAF p9929,2→16,7ms et maximum37,5→25,1ms ; aucune image>50ms. En fixe205,08→220,84FPS, CPU3,687→2,936ms. Dessins moyens en rotation260,2→137,8, triangles1,538→1,606million. Les300gestes durent4,8242 contre4,0847s : trajectoire demandée identique, vitesse d'exécution réelle différente. Un seul couple ne prouve pas le gain sur toutes les parties.

Le contrôle GPU séparé passe71,673/69,559s,100gestes bornés et fenêtres2s, couverture des requêtes complète sans erreur. Somme moyenne des passes par image : fixe3,100→3,014ms ; rotation4,251→4,052ms. En rotation, p956,962→7,289ms et p997,348→7,565ms : les pointes ne s'améliorent pas. Les FPS instrumentés ne sont pas repris comme cadence native. Les quatre parcours conservent un export final entier strict et les sources exactes.

La comparaison d'image stricte reste différente :55 769pixels/3 686 400, dont47du compteur FPS superposé. Le code des fragments prélève la même texture à partir de l'ordinal local de l'instance ; le regroupement redistribue donc le motif pigmenté sans changer sa résolution, les contours ou la matière. L'inspection visuelle suit surtout les petits fragments au sol ; elle n'attribue pas chaque pixel résiduel ni ne prouve une équivalence d'ombre exhaustive. Données et diagnostic conservés sous `tmp/performance-matrix-v429/chunk-pixels.json` et `render-audit/chunk-pixels-diagnostic.md`. Ce changement de variation de pigment est accepté ; aucun réglage de détail, texture, lumière, ombre ou occlusion n'est réduit. La taille128 était intégrée au lot uniforme, avant le retour à64 pour les ressources vivantes décrit ci-dessous ; les coordonnées de simulation restent inchangées.

Compilation produit acquise17,049s. Le lot uniforme a été gelé avec1741sources pour la présentation et une première matrice combinée. Les résultats suivants invalident son adoption telle quelle pour la végétation.

### Première matrice combinée : ×1 favorable, ×6 insuffisant

`v429-matrix-candidate-2026-10-18T21-38-20.189Z-15060` termine en255,789s avec trois imports stricts, douze fenêtres×1/×6, exports complets stricts et sources exactes. Cela qualifie les parcours fonctionnels, pas leurs performances. Les fenêtres×6 continuent après la paire×1, sans réimport ni équivalence de pose avec une référence V428×6. Le profilage est désactivé. Les résultats intermédiaires restent sous `tmp/performance-matrix-v429/candidate01`.

| Partie | FPS×1 fixe / rotation | FPS×6 fixe / rotation | Application×6 rotation moyenne / max |
| --- | ---: | ---: | ---: |
| Les Aulnes |203,53 /195,60|193,85 /159,56|14,91 /27,1ms|
| Les Éclaircies |209,72 /154,59|105,08 /102,32|35,03 /106,9ms|
| Départ neuf |233,15 /209,83|119,17 /20,25|114,69 /231,5ms|

Au départ neuf×6, les300gestes durent22,61s et135images dépassent50ms (maximum445,9ms). Le Worker continue pourtant à5,99×, avec encodage moyen3,63ms. Une cadence×1 supérieure à200FPS ne représente donc pas le confort général. Cette candidate n'est pas publiée.

Aux Aulnes×1, une application de79,1ms coïncide avec la naissance réelle d'une seule plante au10740 : le secteur128 contient1080ressources, dont506arbres, contre277/118dans le secteur64 antérieur. Cette naissance reconstruit tout le secteur ; la même transition V428 atteignait46,3ms. L'augmentation du volume reconstruit est vérifiée ; une contribution de collecte mémoire n'est pas isolée. Le regroupement128 est donc conservé pour le décor stable mais abandonné pour la végétation : `resourceChunkSize:64` sépare maintenant les deux responsabilités. Ce choix est encore à mesurer sur la matrice complète.

Le départ35→1128 ne présente aucune naissance survivante et une seule disparition dans l'export final. Cette observation ne suffit pas à expliquer ses applications répétées de114ms ; le profil MAIN×6 sur le compromis hybride est acquis séparément ci-dessous. Les naissances puis disparitions intermédiaires ne sont pas déduites des seuls exports.

Présentation acquise158,402s (`v429-presentation-2026-10-18T21-34-00.998Z-19220`) : minage et abattage, changements de vitesse et pauses réels, aucun saut, excès de déplacement continu ou occupation solide. Le journal ne change plus après ce contrôle. Les réparations de fixtures de projection et de partition sont distinctes du produit ; leurs premiers rouges restent conservés.

### Profil du blocage×6 et validation ciblée du compromis hybride

`v429-hybrid-x6-profile-2026-10-18T21-49-08.127Z-22824` passe118,785s : départ réel35, continuation×1 puis×6, deux profils MAIN uniquement sur×6, export complet strict et gel hybride exact. Ces FPS instrumentés ne sont pas utilisés comme référence comparative. Sur la rotation, l'application cumule10879ms échantillonnées ; l'apparence naturelle en représente8432ms (77,5%), contre442ms (4,1%) pour ResourceLayer. Les réinitialisations ordinales et par ID sont répétées. La collecte mémoire totalise1436ms dans le profil complet et contribue aux pointes ; elle n'explique pas à elle seule les parcours identifiés.

Le mécanisme statique identifié est la limite4N du journal structurel : deux publications thermiques modifiant Nplantes coûtent4N+8valeurs et ne peuvent y cohabiter. Quand un suffixe différé nécessite une arête déjà évincée, la voie par ID perd la chaîne, reconstruit une capture ordinale entière puis une seconde capture par ID. Le journal ordinal existant conserve pourtant encore la preuve que membres et ordre sont stables. Le correctif de continuation à partir de cette preuve est intégré après qualification ciblée ci-dessous ; aucune limite mémoire, règle de croissance ou validation de sauvegarde n'est relâchée. La causalité du gain natif reste à mesurer.

La passe hybride `v429-hybrid-targeted-2026-10-18T21-46-01.828Z-20844` obtient50/51cas. Le dernier échec venait d'une fixture qui avançait66ticks sans simulation, violant le garde de détérioration au25e. Réparation du test seulement : publications au même tick avec mutations réelles, éviction ancienne et suffixe récent explicitement vérifiés. Reprise du seul cas acquise19,756s (`v429-eviction-clock-reprise`), typage complet acquis14,112s. Les comparaisons de projection gardent les propriétaires et paquets entiers ; les bornes graphiques gardent la couverture de tous les sommets, avec rayon conservateur. Les premiers33rouges d'oracles et leur diagnostic préexistant restent sous `oracle-test-repairs`.

Le prototype séparé de masque d'indices passe4cas en12,798s, mais n'est pas intégré : il vise une petite partie du coût observé, tandis que le profil désigne les captures naturelles globales comme priorité.

La continuation ordinale est ensuite intégrée après revue indépendante et4cas privés acquis12,288s : vrai dépassement du budget ID, suffixe ordinal conservé, zéro nouvelle initialisation des deux agendas, résultats/changements/références exacts face au lecteur historique. Toit/terrain et refus de copie inconnue, réordonnancement, changement de population, checkpoint ou historique expiré restent couverts. Régression naturelle existante :31cas acquis et1microbanc optionnel non demandé, en72,983s (`v429-natural-regression`). Un seul module naturel change ; les calculs de croissance et les budgets des journaux restent inchangés.

Le témoin natif hybride avant ce correctif, sans profileur, passe101,220s (`v429-hybrid-before-fresh`). Départ×1 fixe225,18/rotation203,23FPS ; ×6 fixe87,94/rotation18,58FPS. En rotation×6, application moyenne114,52ms/max335,5ms, RAF p99262,6ms/max458,4ms et129images>50ms. Les300gestes durent22,7678s et la simulation avance820ticks à6,00×. Export entier strict SHA `9b19da4175436e568465c1600fc730d8e4cb1e479ec0eb27331094f4e4230885`, sans changement du gel hybride. Ce témoin sépare le correctif naturel du changement de taille des secteurs ; il reste distinct de la référence V428.

Compilation et typage finaux acquis18,928s (v429-final-build), présentation finale acquise160,438s (v429-final-presentation), sur les1741sources exactes du gel final-source-freeze.json. Minage10646images et abattage10598images, pauses et changements de vitesse réels : aucun saut, excès de déplacement continu ou occupation solide. La matrice final01 termine en272,987s, avec trois références chacune en×1 et×6, sans profilage. Les résultats fonctionnels sont acquis ; le départ×6 demeure un échec de confort.

### Matrice intermédiaire final01 : gains×1, limite majeure×6 conservée

Les six poses initiales×1 et les trois fichiers d'entrée sont identiques à baseline02. Qualité et matériel restent ceux décrits plus haut. Les fenêtres font environ4s ; une paire courte par référence ne garantit ni stabilité prolongée ni absence d'effet d'une application concurrente. Les vitesses×6 sont des continuations, sans témoin V428×6 comparable. Aucun gain isolé n'est attribué à un seul changement du lot.

| Partie×1 | FPS fixe V428→V429 | FPS rotation V428→V429 | RAF p99 rotation | Maximum rotation |
| --- | ---: | ---: | ---: | ---: |
| Les Aulnes |184,65→189,88|162,61→181,08|25,0→25,0ms|29,2→33,2ms|
| Les Éclaircies |165,88→211,24|124,43→167,05|33,3→20,9ms|37,5→37,5ms|
| Départ trois colons |180,93→221,66|104,59→203,63|25,1→12,6ms|33,3→16,7ms|

Le CPU image en rotation baisse respectivement4,08→3,53ms,6,28→4,55ms et7,26→3,74ms. Il n'y a aucune image>50ms dans ces six fenêtres de rotation. En fixe, Les Aulnes gardent toutefois une pointe plus mauvaise :54,2→62,6ms, une image>50ms dans chaque bras. La naissance réelle de plante reste coûteuse (application46,3→52,9ms), même après avoir limité les ressources à64. Les200FPS de moyenne du départ×1 ne valent donc pas200FPS stables ni un résultat général.

| Partie×6 finale | FPS fixe / rotation | Application moyenne rotation | RAF p99 / maximum rotation | Images>50ms rotation |
| --- | ---: | ---: | ---: | ---: |
| Les Aulnes |182,92 /165,50|13,89ms|25,1 /33,3ms|0|
| Les Éclaircies |137,22 /102,17|27,04ms|50,0 /58,3ms|4|
| Départ trois colons |96,23 /22,01|110,24ms|241,7 /275,1ms|125|

Au départ×6,300gestes demandés sur4s prennent21,2162s : cette fenêtre rouge n'est ni exclue ni remplacée par la mesure×1. La simulation atteint6,00×, tandis que l'affichage se bloque. Le repli ordinal réduit peu la moyenne d'application par rapport au témoin hybride114,52→110,24ms ; ce couple court, aux continuations différentes, ne démontre pas la résolution du coût dominant. Le lot ne remplit pas encore l'objectif de confort global.

Trois exports entiers finaux stricts, comparaison navigateur complète et validation du monde, sans erreur et gel1741fichiers exact avant/après : Aulnes11133 SHA `76ef9403249b67e3075ec94ae3ba71c47a765f4f9ad52ccd29d9a89c564c7e34` ; Éclaircies2186 SHA `d9f38d382b21dfe70440f0434274342d2a917590a3298f8e7a4b7d766e60f206` ; départ1090 SHA `4911e04cac561390e22e363fbd974fa6730d7449f6888b59c7bbc24cad4c2e47`. Sources et résultats conservés dans `tmp/performance-matrix-v429/final01`, comparaison compacte dans `render-audit/final01-comparison.md`. Ces contrôles établissent la conservation sur les parcours exécutés, pas une recharge finale supplémentaire ou une couverture exhaustive.

Un diagnostic Node séparé du dernier export passe10,881s : chargement strict au1090, checkpoint réel, unique lecture naturelle. Les17250prévisions ID sont installées sans refus numérique. Ce résultat ne réfute pas un refus ou une reconstruction à un tick antérieur. Dans la mesure native, le coût reste autour de115–123ms avant1002 puis descend en fin de parcours ; la coïncidence avec le facteur thermique1 motive une sonde privée distinguant réinitialisations et traitement dense réussi. Aucun nouveau correctif n'est déduit de la seule corrélation.

La sonde native séparée passe110,890s (`v429-natural-native-diagnosis`), export strict au1150 et1741sources exactes. Ses FPS restent diagnostiques. Elle tranche : une seule initialisation ordinale et une seule ID au chargement35, puis198lectures ID toutes réussies, aucun refus, exception ou réinitialisation pendant les quatre fenêtres. En rotation×6,106lectures réussies traitent2 230 055présences modifiées,1 401 823captures d'entrées et1 392 089prévisions d'échéance pour seulement1637changements visuels. Les85reprises de preuve ordinale sont réussies et ne sont pas des reconstructions d'agenda. La correction précédente est donc utile à la continuité, mais ne supprime pas le travail dense thermique. Les intégrales/entrées de croissance répétées et les remplacements d'entrées d'agenda sont les deux cibles ciblées suivantes ; aucune baisse de cadence ni approximation d'apparence n'est proposée.

### Réduction du coût des prévisions denses

Trois changements sont ensuite intégrés, avec revue indépendante : le calcul littéral de croissance réutilise ses entrées existantes dans une passe de prévision synchrone ; les captures emploient le lecteur de substrat gelé déjà livré ; l'agenda conserve la cellule et l'entrée du tas quand elles restent valables. Les intégrales naturelles/artificielles gardent des clés de tick distinctes, ancre comprise. Seul le tick d'une copie locale est modifié ; cette copie, ses caches et ses callbacks ne sont jamais stockés dans le World ni dans une prévision. La formule publique et son ordre arithmétique restent textuellement identiques. Une priorité réellement modifiée réordonne le tas ; retrait, déplacement et absence d'échéance gardent leurs opérations exactes. Ce travail réduit les calculs/allocation redondants, sans sauter une observation, changer une règle thermique ou promettre un coût constant sur un flux dense. Reçu d'intégration : `tmp/performance-matrix-v429/natural-pass-integration.json`. Qualification ciblée et nouvelle mesure natives restent nécessaires après cette intégration.

La passe intégrée obtient49cas acquis et1microbanc optionnel non demandé en109,014s (`v429-natural-pass-targeted`), sur sept fichiers : intégrales et observations exactes aux ticks variés, climats0/1/2/4, éclipse, anciennes branches numériques, substrats/caves/ancres, propriétaires de cellules et tas comparés à un oracle trié, ainsi que les régressions naturelles existantes. Le premier build est rouge uniquement sur l'annotation d'une fixture numérique historique : son numéro de schéma variable ne satisfait pas le type World courant littéral263. Le rouge est conservé ; aucune assertion, règle publique ou admission de sauvegarde n'est détendue.

La fixture utilise ensuite une copie numérique historique explicitement non admise comme SAVE ; reprise de son seul cas acquise11,781s, six autres cas de ce fichier non sélectionnés, compilation/typage acquis21,151s. Les1741sources de `natural-pass-source-freeze.json` sont figées pour la matrice final02. La suite naturelle complète déjà acquise n'est pas rejouée pour cette réparation d'annotation/fixture seule.

### Dernière matrice final02 et décision de livraison

`v429-natural-pass-matrix-2026-10-18T22-27-23.511Z-11156` passe251,754s. Les trois entrées et les six poses×1 sont exactement appariées à la référence V428 baseline02. Les changements combinés du lot sont mesurés ensemble, sans attribuer leur gain à un seul composant. Les limites de matériel, fenêtres courtes, Chrome headless matériel, sources DEV et activité Firefox/YouTube non confirmée en pause restent celles du protocole ci-dessus. Ce n'est pas une mesure de toutes les parties ni du paquet Pages après compilation.

| Partie×1 | FPS fixe V428→V429 | FPS rotation V428→V429 | CPU rotation | RAF p99 / maximum rotation final |
| --- | ---: | ---: | ---: | ---: |
| Les Aulnes |184,65→205,71|162,61→194,12|4,08→3,21ms|20,9 /29,2ms|
| Les Éclaircies |165,88→209,52|124,43→173,42|6,28→4,41ms|20,8 /33,3ms|
| Départ trois colons |180,93→227,79|104,59→204,40|7,26→3,71ms|12,5 /16,7ms|

Aucune image>50ms dans les six fenêtres×1 finales. Aux Aulnes en fixe, la pointe54,2ms du témoin passe41,7ms ; la naissance de plante conserve une application39,6ms. Les200FPS stables ne sont donc toujours pas acquis, même quand la moyenne dépasse200. En rotation×1, l'encodeur Worker moyen vaut4,39ms/4,53ms/2,12ms respectivement ; le pas de simulation vaut28,23ms/21,19ms/9,70ms. Ces coûts Worker distincts ne s'additionnent pas directement au CPU image et ne prouvent pas le débit×6.

| Partie×6 finale | FPS fixe / rotation | Application moyenne / max rotation | RAF p99 / max rotation | Images>50ms rotation |
| --- | ---: | ---: | ---: | ---: |
| Les Aulnes |188,01 /163,22|12,72 /22,2ms|29,2 /37,6ms|0|
| Les Éclaircies |134,14 /116,12|23,31 /49,3ms|45,8 /58,3ms|3|
| Départ trois colons |122,00 /31,49|99,86 /199,4ms|170,7 /241,7ms|93|

Les poses×6 ne sont pas exactement appariées entre final01 et final02 : écart maximal de position0,482488aux Aulnes,1,39745aux Éclaircies,0,303901au départ. Les plages de ticks et durées changent aussi. Le départ passe de22,01à31,49FPS en rotation et110,24à99,86ms d'application dans ces relevés, mais ces différences ne sont pas annoncées comme gain causal isolé. Ses300gestes demandés sur4s prennent encore15,7516s, ticks294–858, simulation5,95×. Les93longues images gardent ce parcours rouge. Les Aulnes×6 rotation ne s'améliorent pas (165,50→163,22FPS) ; Éclaircies×6 fixe conserve une pointe158,4ms contre125,1ms auparavant. Aucun de ces résultats défavorables n'est écarté.

Exports complets stricts, comparaison navigateur entière, validation du monde, erreurs absentes et sources exactes avant/après : Aulnes11133 SHA `76ef9403249b67e3075ec94ae3ba71c47a765f4f9ad52ccd29d9a89c564c7e34` (même état que final01) ; Éclaircies2187 SHA `9c0d6c947b92dced6296538b9e6880b559c27021bc8555bc3a57f0664f53dad7` ; départ898 SHA `8b0c7b2f63dd6979e9b0d9fe14423f0ce816a1b514fe8ede0c3402ae53518b58`. Reçus sous `tmp/performance-matrix-v429/final02`, analyse détaillée et champs exacts sous `render-audit/final02-comparison.md` et JSON associé.

Décision : livrer les gains×1 acquis sans attendre une refonte supplémentaire, en conservant explicitement l'échec de confort×6. La prochaine responsabilité à extraire est la préparation numérique de l'apparence naturelle hors du thread de rendu, avec résultats attachés au tick confirmé et application graphique bornée. Le flux thermique dense et les reconstructions de secteur restent à traiter ; déplacer ce calcul ne promet ni une économie CPU totale ni200FPS. Le profilage et les comptes acquis justifient cette cible plus large, sans lancer ici une migration de langage ou diminuer les détails graphiques. Aucun contenu jouable nouveau ni changement de schéma263 dans ce lot.

Dernière présentation acquise en156,934s (`v429-natural-pass-presentation`) : minage10746images, abattage10685images, pauses et vitesses réelles, zéro saut, excès de déplacement continu ou occupation solide. Minage : p99 de4,3ms, maximum25,1ms ; abattage : p99 de8,3ms, maximum33,3ms. Le gel1741sources est encore exact après ce contrôle. Cette scène ciblée qualifie ces chronologies ; elle ne remplace pas les résultats rouges de la matrice naturelle×6. Les suites ciblées, reprises d'oracles, revue, compilation, présentation et mesures sont acquises avec les limites nommées ; aucune suite exhaustive ni campagne naturelle longue supplémentaire n'est revendiquée. Contrôle documentaire acquis en12,959s (`v429-docs`).

Le banc dense des trois sauvegardes a échoué avant ses mesures : sa préparation avançait18ticks sans les transitions de simulation et la sérialisation stricte a correctement refusé des échéances végétales expirées. Le rouge v429-dense-edge-bench-2026-10-18T21-59-57.684Z-25264 est conservé. Sa réparation privée distingue désormais la sauvegarde initiale stricte de la requête numérique préparée ; reprise différée, aucun gain de ce banc qualifié.
