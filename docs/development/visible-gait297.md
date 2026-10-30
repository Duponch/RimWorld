# Phase de marche cohérente avec la position affichée — schéma 297

**30 octobre 2026 — correctif intégré et vérifié localement.** Ce lot concerne la cadence des jambes lors du lissage spatial. Il ne change ni la vitesse du jeu ni la cadence de simulation. La fluidité générale et la dette de débit ×6 restent ouvertes ; [statut des mouvements V492](movement-parity-v492-status.md).

## Défaut et correction

La position visible d’un colon converge vers sa cible confirmée avec `PawnTweener297`. La phase de marche utilisait pourtant la distance de cette cible à l’origine de l’arête. Entre deux livraisons, le corps pouvait continuer à avancer tandis que la phase des jambes restait figée ; lors d’une nouvelle cible, cette phase pouvait sauter. Un remplacement naïf de la cible par la pose, toujours mesurée depuis la nouvelle origine, ne préserve pas la continuité entre les arêtes.

Le correctif change seulement [PawnTweener297](../../src/render/PawnTweener297.ts) et [PawnLayer](../../src/render/PawnLayer.ts). Le Tweener expose des deltas X/Z calculés entre ses positions Float32 effectivement affichées et un indicateur de nouvel historique. La pose réutilisée garde exactement les trois champs `x/y/z`. PawnLayer cumule la distance visible avec le coefficient artistique existant ; la phase est bornée à un tour pour préserver sa précision dans une longue partie.

Le cumul survit aux changements d’arête et aux Full du même acteur. Un nouvel acteur, un reset de carte ou une transition de corps déjà traitée comme reset remet ce cumul à zéro, avec deltas nuls. En pause, la phase reste immobile. Le décodage de la marche pendant une transition accroupie suit celui du shader existant. Hors marche, la valeur d’action précédente reste utilisée, notamment pour le combat.

La phase des membres et son coefficient sont des choix artistiques locaux : ce lot ne revendique aucune règle native RimWorld pour les jambes. Il conserve les cibles, calculs de position et coefficient de lissage existants ; aucun changement de Core, vitesse, Timeline, alpha de lissage, traitement des commandes ou RNG. Le code ajoute quatre octets par slot de capacité et des scalaires réutilisés, sans nouvelle allocation par image, Map, recherche ni trigonométrie. Un `hypot` de déplacement visible remplace celui de la cible ; cela ne constitue pas à lui seul une preuve de coût CPU identique.

## Preuves acquises et limites

Trois diagnostics sur flux de présentation **déclarés, sans World ni parcours Native**, ont été acquis séparément. Ils montrent notamment que le ressort spatial peut continuer à converger pendant une cible constante. Ils n’établissent pas à eux seuls une saccade visible dans la partie humaine.

Deux autres contrats utilisent la vraie PawnLayer et le vrai Engine297, avec de vrais ordres et de vraies arêtes. Le même fichier de tests a donné **2FAIL en 33,234s avant**, puis **2PASS en 24,560s avec le candidat**. L’oracle indépendant lit les attributs de racine effectivement affichés et la phase, sans utiliser les nouveaux getters du correctif. Il couvre plusieurs images au même Core, la seconde arête réellement atteinte au Core19, la pause, une adoption Full du même acteur depuis une recharge Whole et le reset explicite de la couche. Core, RNG, identités et Whole restent exacts pendant les images sans simulation. Le reset de couche ne vaut pas qualification d’un changement de carte Native.

Les trois diagnostics et les deux contrats réels ne doivent pas être additionnés comme cinq parcours de bout en bout. Aucun de ces résultats ne prouve un gain FPS/GPU, une instantanéité des clics ou la résolution globale de la fluidité.

Une lecture hors ligne de la fenêtre ×1 historique du 28 octobre a trouvé **119 plateaux de Timeline**, représentant **63,35% du segment observé**, avec un maximum de **158,3ms**. Cette trace ne contient pas les poses d’acteurs : elle ne prouve ni l’immobilité du ressort spatial ni la cause des saccades actuelles. Les callbacks et soumissions CPU ne sont pas des FPS physiques. Ce correctif de phase ne ferme pas cette autre limite de livraison temporelle.

## Qualification et coût borné

L’intégration a donné 11PASS/1FAIL en 24,206s. Le seul refus concerne un ancien contrat V133 qui exige une interpolation GPU sans upload : son flux est synthétique et ré-ajoute lui-même la distance de l’arête à la phase. Le témoin antérieur, réexécuté seulement sur ce cas avec les deux préimages, échoue déjà sur le compteur d’upload (ligne56) ; le candidat échoue ensuite sur une congruence (ligne64). **Ces diagnostics ne sont pas identiques.** Le cas est désormais explicitement un adaptateur de rendu historique296, sans prétendre être un World/Engine/RAW valide, et garde toutes ses assertions. Sa reprise donne 1PASS/2skip. Douze finalités ciblées sont ainsi acquises par reprises, pas douze tests rejoués sur un unique état.

| Contrôle | Résultat |
|---|---|
| Deux contrats réels avant/après | 2FAIL33,234s puis 2PASS24,560s |
| Intégration et trois voisins | 11PASS puis reprise du cas legacy : 1PASS |
| Typage complet du projet | PASS18,195s |
| Build Pages code/HTML/CSS | PASS4,634s ; ressources publiques résolues en E, copies omises pour préserver le disque ; pas paquet ni déploiement |
| Publication Cloudflare | Aucune nouvelle publication ; dernière attestée V491 |

Une seule comparaison W1/C/W2 a exécuté les vraies méthodes sur les mêmes600frames, dix replays de chauffe puis cinq blocs de100 replays, soit300000 appels updateTravel et1500 adoptions Full/reset par bras. Préparation Engine hors mesure ; aucun Core joué dans les fenêtres. Les racines/yaw/travel Float32 et Whole sont exacts entre les trois bras. Seule la phase diffère intentionnellement.

| Total sur300000 appels | W1 | Correctif | W2 |
|---|---:|---:|---:|
| Wall, ms |410,159|414,225|450,684|
| CPU du fil, ms |421|421|453|
| CPU du processus, ms |499|532|562|

Le total candidat reste dans la variation des témoins, sans gain causal ni égalité CPU garantis. **Premier bloc candidat défavorable conservé** : wall115,599ms/CPUfil109ms, contre95,319/94ms et94,072/94ms. Aucune nouvelle matrice n’a suivi. La granularité du compteur CPU et les activités de fond ne permettent pas d’attribuer ce pic.

Ce microbench ne porte que sur un acteur dont le frontierCore3 reste tenu : il observe surtout la convergence puis le chemin à clé inchangée, avec beaucoup de deltas devenus nuls. Il ne représente pas la marche active continue, une colonie, les autres vitesses, les FPS/GPU ou la latence Native. Aucun recul net du total de ce chemin n’est établi ; la fluidité générale reste à qualifier séparément.

Les durées des tests fonctionnels incluent leur préparation ; elles ne sont pas une comparaison de coût. Les résultats CPU complets et la décision bornée sont dans gait-cost-root/{W1,C,W2}/report.json et root-decision.json ; les contrôles intégrés dans qualification/. Le garde de stockage a suspendu le départ du banc, puis de seuls anciens caches générés ont été retirés avant sa reprise ; voir [le suivi de stockage](storage-recovery-20261029.md).

Les preuves privées sont sous la racine Cvisualizations du checkpoint, dossier `action-fluency-20261030/` : `diagnostic-root-receipt.json`, `historical-window-review/receipt.json`, `gait-root-red-v1/vitest.json`, `gait-root-green-v1/vitest.json` et `gait-fix-author-v1/`. Le gel auteur est `f4a18963` ; préimages E `7fa5083d/4ca1187c`, candidats `eba5a7dd/2e564846`, spans inversibles exactement. Aucun fichier produit ou privé298 modifié par l’auteur.

La branche victoire298 reste privée. Un éventuel portage doit fusionner les seuls changements sémantiques, en conservant ses autres coutures ; recopier PawnLayer297 entier serait incorrect. Les six ensembles restent ouverts, l’autonomie poursuit la priorité de fluidité, et aucune mission QA d474 ni campagne humaine94de/T3328 n’a été utilisée ou avancée pour ce lot.
