# Déplacements des animaux : coût physique et présentation — schéma 297

**30 octobre 2026.** Correction des écarts identifiés dans le coût et la continuation des déplacements animaux, ainsi que leur présentation entre deux livraisons. Schéma297 conservé ; aucune identité exhaustive de l’IA animale avec RimWorld n’est revendiquée.

Les animaux avaient deux problèmes distincts. Leurs déplacements conservaient une ancienne traduction des allures et leur route attendait le passage du contrôleur autonome, à six passages par seconde, pour engager la case suivante. En outre, leur présentation pouvait rester immobile entre deux arrivées de données, même sans limitation LOD active. Le lot traite séparément le prix et l'enchaînement des déplacements, puis le lissage de leur affichage.

## Référence et règles retenues

La référence primaire relue par Root est **RimWorld Core 1.6.4871 rev590**, assemblage local identifié par le préfixe SHA **DLL5cf1**. Les lectures ciblées portent sur `Pawn.TicksPerMove`, `Pawn_PathFollower.CostToMoveIntoCell`, `CostToPayThisTick` et `PatherTick`, puis sur les producteurs et pilotes des emplois concernés. Aucun code propriétaire n'est intégré au projet.

Le coût commence par la vitesse propre à l'espèce, avec les facteurs d'âge et de déplacement actuellement représentés. Le moteur de référence convertit cette vitesse en coût à 60 Core par seconde. La diagonale utilise **1,41421**, les conditions météorologiques interviennent dans le coût de base, puis le terrain et les obstacles admissibles ajoutent leur prix. Le plafond de 450 intervient avant l'allure. `Walk` applique le double du coût avec un minimum de **50 Core** ; `Jog` ne reçoit pas cette pénalité. Le paiement du vol intervient ensuite. `CostToPayThisTick` impose également un paiement minimal égal au coût total divisé par 450, y compris hors ralentissement : un coût brut Walk de 900 ne signifie donc pas 900 Core réellement nécessaires.

Les arrondis simples précision sont appliqués aux étapes numériques identifiées dans ces méthodes. Le lecteur borne aussi le successeur IEEE de 450, obtenu explicitement, car le quotient flottant peut dépasser légèrement 450. Il ne s'agit pas d'une tolérance choisie pour faire accepter une sauvegarde.

La lecture de `PatherTick` confirme la conservation d'un dépassement payé lors du passage d'une case à la suivante. La continuation locale garde ainsi la fin fractionnaire de l'arête précédente lorsqu'elle vient réellement de se terminer. Elle évite de perdre systématiquement la fraction restante à chaque frontière Core ; la détection locale de continuité reste cependant fondée sur la fin récente du segment, sans identifiant persistant de job. Un nouveau job choisi au macro peut encore reprendre au plus un Core récent : ce cas n’est pas une identité native démontrée.

L'allure `Jog` par défaut a été vérifiée pour les trajets de ponte, d'accouplement, de retour à une zone autorisée et d'entretien de ruche. Les producteurs et pilotes relus n'y substituent pas `Walk`. Les attaques de ruche sont également couvertes par la lecture de `JobGiver_AIFightEnemy.MeleeAttackJob` et de `JobDriver_AttackMelee`, sans substitution de l'allure par défaut. Les autres branches du sélecteur existant sont conservées ; les suivis externes ne deviennent pas vérifiés par déduction de ces seuls cas.

## Adaptation du moteur et conservation

Un propriétaire physique poursuit les **chemins déjà décidés** sur l'horloge réelle à 60 Core par seconde. Il ne rejoue pas l'IA à cette fréquence : choix de destination, recherche de route, quotas, besoins, reproduction, production, transactions de cargaison et tirages des décisions restent dans leurs propriétaires habituels. L'index des animaux actifs est reconstruit aux frontières et invalidations prévues ; les cellules et portes restent consultées avant l'engagement du prochain pas.

Une arrivée déclenche une seule fois ses effets déjà existants : tassement de neige et éventuel dépôt des traces réellement portées sous les pieds. Le reçu d'arrivée commence au Core effectivement chargé ; une recharge ne rejoue pas une arrivée antérieure. Les délais stun/strike sont retirés à leur véritable échéance avant les gardes métier fondées sur leur présence. Les porteurs, animaux tenus par un soigneur, femelles impliquées dans l'accouplement, suivis et propriétaires de groupe conservent leurs gardes. La garde d'abri pendant les retombées toxiques empêche également qu'une arrivée sous toiture soit immédiatement suivie d'un pas ordinaire découvert, avant la révocation macro du chemin.

Le prix définitif d'une **nouvelle** arête est capturé dans les champs numériques existants de sa motion. Le coût complet est représenté par `terrainDelay = 0` et `speedFactor = 30 × longueur_euclidienne / coût_Core`. Cela conserve l'équation du segment et ses intervalles de ralentissement sans ajouter de jeton humain ni emprunter la vitesse humaine 4,6. La vitesse de chaque animal reste liée à son espèce et à son état représenté.

Les anciennes arêtes ne sont ni converties ni recalculées lorsqu'un nouveau propriétaire de trajet apparaît ou pendant la sauvegarde/recharge. Le nouveau lecteur accepte l'union explicite de l'ancien domaine et du domaine prospectif de coût ; il continue de refuser courbes altérées, vitesses hors domaine et jetons étrangers. Le schéma produit reste 297. Cela garantit la lecture des anciens segments par le nouveau lecteur dans le périmètre contrôlé ; la relecture des nouveaux segments par un ancien exécutable 297 n'est pas garantie.

## Affichage et mesures déjà acquises

Le rendu applique aux racines des animaux libres vivants le lissage des positions confirmées entre les livraisons. Il conserve l'arrêt ordinaire en pause et réinitialise les historiques lors d'un véritable remplacement ou d'une recharge explicite. Les animaux portés, morts ou à terre restent dans leurs voies de présentation propres. Ce lissage ne joue aucun Core, n'augmente aucune vitesse physique et ne modifie pas la sauvegarde.

Les quatre contrats ciblés de rendu sont acquis dans `render-green.json` : progression affichée entre livraisons sans altération du World, remise à zéro lors d'une propre recharge, et conservation des voies de chute/repos pour un décès réellement produit et pour un animal cliniquement à terre. Ce résultat n'est pas une validation globale des animations de toutes les espèces.

Le banc de rendu v2 clos emploie les mêmes observations réellement acquises pendant 900 Core, avec 56 animaux, 900 images par condition, publications de 20 ms et ordre témoin/candidat/témoin. Le World de projection est réservé au rendu et n'entre ensuite ni dans Engine ni dans une sérialisation.

| Condition de rendu | Témoin 1 | Candidat | Témoin 2 | Surcoût observé du chemin mesuré |
| --- | ---: | ---: | ---: | --- |
| Proche, 900 images | 140,1655 ms | 203,7176 ms | 122,0438 ms | environ 0,071–0,091 ms/image |
| Intermédiaire, 900 images | 133,7628 ms | 163,8456 ms | 122,1153 ms | environ 0,033–0,046 ms/image |

Le coût supplémentaire est réel dans ce petit chemin CPU mesuré ; il ne faut pas annoncer un coût nul. Les compteurs de versions de buffers augmentent de 5 115 à 53 855 dans les deux conditions, avec les mêmes nombres de buffers/textures distincts. Ces compteurs ne mesurent ni des octets effectivement envoyés, ni la durée des transferts GPU. Les variations des témoins et les coûts processus/fil sont conservés dans le rapport original.

L'analyse hors ligne des captures Native confirme le défaut puis la nouvelle alimentation de présentation sur les paires comparables d'une même arête. Dans la capture témoin, les quatre animaux observés totalisent 659 paires où le front de données reste tenu, et aucune progression affichée durant ces paires. Dans la capture candidate, 926 paires progressent alors que ce front reste tenu ; aucune paire ayant un front avancé n'est tenue dans ce sous-ensemble. Les deux captures conservent chacune 480 images et leur propre état réellement joué/rechargé. Ce sont des états consécutifs, avec des dénominateurs différents, pas deux entrées aléatoires identiques permettant d'en tirer un pourcentage causal de performances.

Ces animaux étaient observés au niveau proche, cache LOD inactif : leur blocage ne peut pas être attribué à la seule cadence LOD de 12 Hz. Les valeurs sont des entrées réelles de présentation et de géométrie CPU, sans lecture GPU des jambes ni preuve des FPS physiquement affichés. Ni ce banc, ni cette analyse Native ne démontre un gain de FPS global ou une absence de régression globale.

## Qualification de la physique et optimisation

Les39 nouveaux cas couvrent la présentation, les coûts simples précision, les urgences, la continuation réelle auCore12, le passage macro suivant, la recharge entière àphase7, l’arrivée/filth unique, l’incapacité et les délais réels45/50, les portes finissant auCore5 et leurs transports, les impacts420Core sur anciens et nouveaux segments, la révocation d’abri et la navigation sans capture inutile. Leur passage intégré doit être lu dans le reçu final du lot.

Deux refus de sauvegarde après un impact réel420Core ont été reproduits puis corrigés : le producteur autorisait déjà cette durée animale, alors que le segment actif était encore refusé au-delà de95Core. Le nouveau lecteur297 conserve les mêmes coûts capturés et porte seulement ce plafond au maximum réel420. Les anciens schémas et le stagger95 ne sont pas élargis.

La première comparaison600Core a montré un surcoût candidat :1877,601 /2327,435 /2135,226ms. Deux travaux inutiles ont été retirés sur la seule voie physique : capture immédiate de standabilité (structures/jobs/piles) alors qu’aucune requêtefree n’était faite, et création d’un lecteur d’aires non consulté. Les permissions de point et les règles de recherche restent conservées. Deux contrats isolent cette économie et comparent les obstacles réels.

Une seule comparaison de contrôle a ensuite été réalisée,600Core par bras sur la même copie publique des Éclaircies,56animaux. Chargement/validation/export sont hors fenêtres ; chaque fin est validée et rechargée à l’octet.

| Bras | Temps écoulé de la boucle | CPU processus | CPU fil |
| --- | ---: | ---: | ---: |
| W1 | 2024.065 ms | 3266 ms | 2031 ms |
| P | 2043.986 ms | 3063 ms | 2032 ms |
| W2 | 1989.312 ms | 3171 ms | 1984 ms |

Le candidat a+0,98/+2,75% de temps écoulé,+0,05/+2,42% de CPU fil et−6,22/−3,41% de CPU processus par rapport aux deux témoins. Ces métriques ne permettent pas d’attribuer un gain global, ni d’affirmer un coût strictement nul ; le surcoût initial n’est plus retrouvé à cette ampleur. La cadence nominale, les FPS, les commandes et la dette×6 antérieure restent des mesures distinctes.

L’optimisation conserve exactement le même Whole candidat final17900 :SHA`dc9a83c0762e133bee105f0faf4f9ed7209026c613c8dc139f2aabcc98cb5ba1`. Aucun chemin, besoin, bien, tirage ou conséquence n’a été effacé pour améliorer la mesure. Les résultats témoins sont également exacts entre eux ; ils ne sont pas artificiellement assimilés au candidat dont les règles ont changé.

Trente cas voisins passent dans le contrôle ciblé. Dix-neuf anciens refus des suites de repos ont été reproduits avec les mêmes noms et diagnostics sur les sources produit précédentes ; ils sont conservés, sans déclaration de suite globale verte ni affaiblissement des gardes. Les premières attentes erronées de durée et les erreurs de préparation des fixtures ont été corrigées TEST-ONLY et leurs rapports initiaux conservés ; ce ne sont pas des RED produit.

Types, buildPages CODE, observation finale et enregistrement Git sont consignés dans le reçu de livraison. Aucun déploiement Cloudflare n’est induit par ce commit.

## Limites de fidélité et preuves privées

Les règles étudiées sont rapprochées de leur primaire ; cela ne prouve pas l'identité du contrôleur animal entier. L'errance locale bornée, la sélection de destinations/régions, certains suivis conduits par d'autres propriétaires, et les politiques historiques explicitement adaptées restent distincts des seuls coûts d'une arête. La composition locale des facteurs d'âge/capacité ne constitue pas une réimplémentation exhaustive de chaque étape de `StatWorker`. La capture scalaire d'un coût et de ses intervalles ne prouve pas non plus l'identité bit à bit de toutes les soustractions flottantes itératives de `nextCellCostLeft` dans tous les états possibles.

Les performances de cette tranche sont à séparer de la dette déjà ouverte **PERF-V492-X6** et de tout problème de transition Home. Le rendu, les FPS, le débit de simulation et la latence d'une commande sont quatre mesures différentes. La campagne humaine protégée et la mission QA de continuation n'ont pas été utilisées comme fixtures pour faire réussir ce lot.

Les preuves privées de cette rédaction sont conservées sous `action-fluency-20261030/animal-correction-20261030/` dans le scratch de la session :

- `render-bench-author-v2/run-2026-10-30T10-45-09.185Z-22844/report.json` : six fenêtres et compteurs CPU ; trace et export réel conservés avant mesure.
- `native-render-offline-same-edge.json` : analyse bornée des captures Native, sources/RAW/gzip et propre recharge exacts.
- `render-green.json` : quatre contrats ciblés acquis.
- `source-map-final.json`, `physical-navigation-lazy-author`, `save-author-v3`, `product-installation.json` et reçu de livraison : graphe final et sauvegardes des préimages.

Ces chemins désignent des preuves de session, pas des fichiers publiés ni une autorisation de rejouer les campagnes.

## Résultat intégré et contrôle dans le jeu

Le lot intégré passe65cas ciblés en121,278s :39nouveaux et26voisins de coût/transport/route. Aucun échec ni skip dans cette sélection. Les quatre autres cas de repos déjà acquis et les19refus historiques reproduits ne sont pas maquillés en suite globale verte. Typage complet17,275s ; buildPages CODE3,726s, public résolu sans recopie ; contrôle documentaire acquis. Les avertissements de découpage de modules du build sont conservés.

Le contrôle réel combiné a continué uniquement son propre dernier état0b17, puis observé480présentations uniques sur2,712s : six animaux proches,899changements de racine et6positions retenues dans les paires comptées. Le jeu est ensuite réellement mis en pause, exporté puis rechargé à l’octet : RAW9985f0c4f0cb2bb009cb472d73742d772ff340e8f4410dd4cc39f328dad34ec4, gzip8d78b92a601145320c6b50af612c4f0ea4a954cf3cc77acf64107abc97865cfb. Sources2080exactes avant/après, zéro erreur page ou application recueillie. Deux avertissements THREE sur attributaTo restent consignés ; la capture montre les acteurs, sans qualifier tous les pixels ou toutes les occasions de compilation GPU.

Les trois essais préalables n’ont pas joué de Core depuis l’état chargé : lancement refusé, budget atteint au chargement, puis création des caches refusée. Le quatrième utilise un dossier temporaire court et le même code/entrée/observateur ; il aboutit en78,480s. Ces échecs de contrôle sont conservés et ne deviennent pas des PASS rétroactifs. L’observation est celle des entrées CPU soumises au rendu, distincte des FPS globaux et de l’identité exhaustive de l’IA.

Préimages des9sources existantes conservées avant les11écritures source et10tests nouveaux. Aucun asset, sauvegarde humaine, mission de campagne ou fichier de victoire privée n’est remplacé. Le lot est enregistré dans Git ; cela ne constitue pas une nouvelle publication Cloudflare.