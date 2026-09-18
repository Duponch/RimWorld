# Validation V57 — pouvoir d’arrêt et trajectoires

18 septembre 2026. [Contrat](../development/stagger.md), [recherche fraîche](../research/stagger-reference.md). Lot en mode jour, sur main, sans agent supplémentaire. La dépendance « ralentir une arête déjà engagée » est livrée avant l’adversaire ; aucun ennemi ni raid annoncé.

## Vérifications fonctionnelles et corrections

- Passe complète : 255 tests réussis sur 256, en 156,40 s. L’unique échec était la nouvelle assertion de corruption de portage : elle attendait le diagnostic croisé, alors que le garde de durée rejetait déjà la donnée. L’assertion contrôle maintenant le refus public et le validateur croisé séparément, sans affaiblir la validation. Les quatre scénarios du fichier repassent en 2,06 s. Aucun code de simulation changé après la passe complète.
- Le pilote civil de plusieurs jours fait partie de cette passe. Il conserve sa progression et ne tire pas artificiellement sur ses propres colons ; l’épisode hostile attend l’adversaire. La longue UI de trois jours n’est pas annoncée comme rejouée pour ce lot ciblé.
- Build final réussi, avertissement existant de taille de chunk graphique (environ 1,105 Mo minifié). Quatre scénarios profonds nouveaux : oracle fin de distance sur 18 combinaisons, renouvellement/sauvegardes/migrations, vraie balle mobile et poses GPU, secours et expiration. Anciennes fenêtres refusées dans V56, migration d’une véritable arête historique inchangée.
- La revue finale a également trouvé un cas de hauteur sur meuble : les morceaux de trajet recommençaient la rampe verticale. Correction par fraction de distance originale dans le shader partagé et le proxy de sélection, sans nouveau lot ; +8 octets par personne. Les neuf scénarios ciblés (ralentissement, bridge, rétention graphique, transit mobilier) passent en 3,19 s, puis le build passe. Le scénario de ralentissement couvre maintenant montée et descente avec contrôle de continuité.
- La revue d’image a détecté un encodage erroné des chaînes Santé introduit lors de l’édition ; restauré depuis leur UTF-8 original, avec assertion du libellé dans la véritable UI. Ce défaut n’est pas resté masqué par les tests numériques.

Trois parcours Chromium natifs passent en **51,1 s** : déplacements/file/arrêt/reprise (26,6 s), tir puis soins (13,2 s), cible mobile ralentie avec sauvegarde et vitesses 1×/6× (9,8 s). Aucun diagnostic navigateur. [Mobilisation](../../artifacts/drafting-ui-v57.json), [tir/soins](../../artifacts/shooting-ui-v57.json), [ralentissement](../../artifacts/stagger-ui-v57.json), [capture Santé](../../artifacts/stagger-v57.png).

Après correction des hauteurs, trois contrôles natifs repassent en 1,1 minute : transit avec cargaison sur meuble (15,1 s), charge 3/30/100 (40,0 s), puis ralentissement (9,2 s). Le [parcours mobilier](../../artifacts/furniture-crossing-v57.json) conserve 3 494 échantillons, 180 frames de plateau chargé et 614 de montée, avec reprise exacte et partage des attributs ; [capture inspectée](../../artifacts/furniture-crossing-v57.png).

Le dernier parcours de ralentissement confronte 573 puis 210 poses rendues à une intégrale indépendante de la simulation ; 172 puis 75 échantillons pendant ralentissement. Erreur maximale inférieure à **0,000012 cellule**, destination atteinte aux deux vitesses. Corps/cargaison/sélection partagent les attributs. Cela prouve ces parcours, pas l’absence de tout saut dans toute situation.

## Mesures de charge

Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1 ; Chromium natif WebGPU AMD RDNA-1, fenêtre 1440×1000. Avant la mesure, échantillon de trois secondes : Discord 1,11 seconde CPU cumulée sur deux processus, ChatGPT 0,34, lanceur Epic 0,11 ; aucun autre jeu 3D observé actif. Ce n’est ni une machine entièrement isolée ni une mesure de toute sa charge GPU. Aucun programme utilisateur arrêté.

Audit existant enrichi : carte naturelle 250², 3/30/100 acteurs ; tiers tireurs, tiers cibles avec seize déplacements de quatre cellules, reste aux activités de camp. Santé, incapacités et PRNG réels, aucun soin artificiel. Le scénario court de 240 ticks ne termine aucune nouvelle extraction dans les bilans CPU ; activité ne signifie pas ressource produite. `MOVING_TARGETS=1`, `VALIDATION_VERSION=v57` ; preuves V56 intactes.

| Acteurs | Tick mixte CPU p95 / p99 | Encodage CPU p95 | Image native p95 / p99 / max | Application scène p95 |
|---|---:|---:|---:|---:|
| 3 | 3,69 / 8,13 ms | 4,02 ms | 8,3 / 12,5 / 91,6 ms | 5,9 ms |
| 30 | 9,79 / 25,12 ms | 5,49 ms | 8,4 / 16,7 / 95,9 ms | 6,2 ms |
| 100 | 20,49 / 40,83 ms | 6,63 ms | 16,7 / 33,4 / 120,8 ms | 8,5 ms |

[Simulation/encodage et témoin sans tirs](../../artifacts/shooting-cpu-v57.json), [worker/rendu natif](../../artifacts/shooting-native-v57.json). Tableau de la passe native finale, 40,0 s dans le groupe ci-dessus. 1/10/33 personnes effectivement ralenties, 5/50/172 arêtes retimées observées dans la scène. Aucun nouveau pipeline durant les mesures, capacité réelle de balles jusqu’à 256, maximum 171 appels de dessin.

La passe CPU alterne monde avec tirs et témoin sans tirs, mêmes trajets initiaux ; après blessures, les mondes divergent volontairement. À cent acteurs, le témoin a lui-même un p95 de 21,78 ms ; on ne peut soustraire naïvement les percentiles pour annoncer un coût propre du ralentissement. Le natif mesure les commandes initiales et les frames de transition ; les pointes jusqu’à 120,8 ms restent une dette de fluidité à profiler. La scène est incluse dans le CPU de frame ; le callback snapshot n’inclut pas le décodage IPC. Le protocole et la charge concurrente diffèrent de V56 : aucun gain causal « 58,7 → 16,7 ms » revendiqué.

## Garde de récolte et changements de vitesse

Avant modification V57, reprise instrumentée V56 sans autre jeu 3D : 45 secondes de minage puis 45 d’abattage, 44 changements de vitesse au total. Zéro attente du tampon, saut, occupation rocheuse ou erreur ; images p95 4,3 / 8,4 ms, maxima 24,9 / 29,4 ms ; réponse complète de vitesse maximale 22,4 / 31,8 ms. [Reprise V56](../../artifacts/harvest-sync-v56-recheck.json). L’échantillon de charge alors observé comprend Firefox et Chromium : pas une preuve de machine sans autre activité.

Les [échecs V56](validation-shooting-v56.md#contrôle-de-fluidité-et-conditions-de-mesure) sont conservés. Cette reprise ferme la vérification différée dans ces conditions ; elle n’attribue pas rétrospectivement tous les délais à une application externe. Première garde V57 après changement des trajectoires : zéro attente/saut/occupation rocheuse/erreur sur 10 786 puis 10 711 images ; p95 4,3 ms aux deux activités, maxima 16,6/25,0 ms ; réponse de vitesse maximale 24,8/23,5 ms. [Données](../../artifacts/harvest-sync-v57.json). Après correction graphique des hauteurs, la [garde finale V57](../../artifacts/harvest-sync-v57-final.json) passe également : 10 761/10 722 images, zéro attente du tampon, saut, occupation rocheuse ou erreur, p95 4,3 ms pour chaque activité ; maxima 16,7/20,9 ms. Les 44 changements de vitesse donnent une réponse complète sous 24,8 ms. Aucun seuil assoupli.

## État du plan

G0 en consolidation, G1/G2 partiels, G3 premières boucles humaines et tir commandé ; G4/G5 ouverts. Prochaine livraison : adversaire, relations d’hostilité, permissions/collisions et réaction civile, puis blessure/secours/retour au camp dans le pilote. Toujours absents : mêlée/armures, vêtements/inventaire personnel, santé complète, social, animaux, narrateur, monde et vaste catalogue Core. Estimation globale inchangée, environ 20 % (15–25 %), sans convertir un lot technique en point de pourcentage.

Contrôle documentaire final : liens locaux, identifiants de domaines et familles de validation vérifiés ; trois originaux byte-identiques. `git diff --check` et TypeScript passent. Les captures de Santé et du franchissement mobilier ont été inspectées.
