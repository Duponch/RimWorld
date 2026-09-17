# Requêtes de tir — socle isolé sous V53

18 septembre 2026. [Recherche et limites de version](../research/combat-preparation.md), chapitres 17–20 et SYS/TEST-098/101..103/106/119. **Ces modules sont testés mais pas appelés par la partie.** Ils ne livrent ni ordre de tir, ni projectile, ni ennemi. Schéma, sauvegardes et cadences civiles restent V53.

## Frontières

`src/sim/combat-space.ts` expose une grille en lecture seule : dimensions, obstruction visuelle et couvert par cellule. Aucun adaptateur `World` n'attribue encore de remplissage tactique aux plantes, objets ou meubles du catalogue. L'intégration devra relever ces définitions ; nos valeurs synthétiques de tests ne sont pas celles de ces objets. La visibilité reste distincte des meshes et de la navigation.

Le fournisseur appartient à l'appelant, pour une décision synchrone. Aucun cache d'identité, de tick ou de ligne ne survit implicitement à une mutation. Une porte fermée doit être vue à la requête suivante, même au même tick. Les résultats gardent des copies de cellules et coefficients ; un changement ultérieur ne réécrit pas un ancien rapport.

Les requêtes ne consomment pas le PRNG, ne modifient pas le monde et ne réservent rien. Les commandes futures devront vérifier acteur, cible, hostilité et état avant le calcul, puis revalider à l'émission. Un rapport probabiliste seul ne donne jamais l'autorisation de tirer.

## Ligne et portée

Le parcours des frontières de cellules travaille en entiers, sans liste globale de rayons. Aux intersections exactes de coins, le côté est choisi selon une orientation canonique de la paire, de sorte que le segment central soit réversible. Origine et cible sont exclues des obstacles intermédiaires ; l'admissibilité propre de la cible reste un autre contrôle. Cette visibilité ne remplace pas les exclusions de coins de la marche.

Le calcul cherche d'abord depuis le tireur, puis les origines exposées par un coin et les couverts bas tournés vers la cible. Un personnage cible peut fournir ses propres cellules exposées. Une cible pleine peut être atteinte par ses bords proches. La requête de segment seule ne prouve pas toute la règle d'attaque d'un objet.

La portée est testée **avant** les origines alternatives, vers la case la plus proche de l'empreinte fournie. Se pencher ne prolonge pas la portée. La distance du rapport reste celle des positions logiques ; sur une cible multiple elle peut différer de celle utilisée pour autoriser la portée. Les échecs distinguent bornes, portée et obstruction.

## Couvert et probabilité

`src/sim/combat-report.ts` rassemble les contributions voisines : angle, pénalité diagonale, proximité et remplissage. Le couvert plein vaut 0,75 ; une porte ouverte contribue zéro. Les passages se multiplient. Un objet occupant plusieurs cellules n'est pas dédupliqué arbitrairement. La cellule du tireur est exclue du blocage global, mais peut rester dans les candidats de raté du rapport de référence ; cette distinction est conservée.

La sélection pondérée reçoit un tirage explicite dans [0,1[ ; elle n'avance pas secrètement le PRNG pendant une inspection. L'ordre local est nord/est/sud/ouest puis sud-est/nord-est/nord-ouest/sud-ouest, avec z positif au nord dans cette convention mathématique. Cet ordre ne promet pas une identité de graines avec RimWorld.

La visée reçoit la précision finale du colon et les quatre valeurs d'arme, aux distances 3/12/25/40. Elle sépare tireur, arme, taille, météo, fumée, exécution, posture et passage du couvert. Aucun calcul d'XP, courbe de compétence ou coefficient d'une arme concrète n'est livré. Pas de pénalité universelle d'obscurité Core. La posture est séparée pour que le projectile ne la tire pas deux fois. Estimation finale bornée à [0,1], plancher intermédiaire distinct.

Le facteur de distance d'interception libre est séparé : zéro jusqu'à une distance carrée de 25, un à partir de 144. Ce helper n'implémente pas toutes les branches de tir ami.

## Validation et coût

`tests/combat-queries.test.ts` regroupe **six scénarios** : 117 649 combinaisons segment/obstacle sur grille 7² comparées à un oracle continu segment/rectangle indépendant ; coin, porte modifiée en place, portée/empreinte et bord de cible pleine ; couvert angulaire/composition ; proximité/cellule du tireur et distribution pondérée ; calcul indépendant de visée et seuils de posture ; absence de mutation et borne locale de lectures sur 250². La première vérification de types a trouvé une inférence incorrecte du tableau figé des directions ; corrigée sans changer les assertions métier. Scénarios et TypeScript passent.

`scripts/combat-query-bench.ts` mesure seulement ces requêtes. [Données brutes](../../artifacts/combat-queries-v53.json) : Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1. Quatre cartes synthétiques 250², vues libres, mur, porte alternée et bord exposé ; cent lots de chauffe puis mille lots mesurés par effectif. Construction et mutation de porte exclues.

| Candidats par lot | Requêtes | p95 du lot | p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 3 000 | 0,0241 ms | 0,1017 ms | 0,3489 ms |
| 30 | 30 000 | 0,0980 ms | 0,1766 ms | 0,3314 ms |
| 100 | 100 000 | 0,2223 ms | 0,2679 ms | 0,5125 ms |

Une passe, résultats et lectures contrôlés. Ce ne sont ni cent combattants simulés, ni un audit worker/rendu. Pas de suite UI ou de long pilote civil pour ces modules non branchés ; ils deviennent nécessaires avec commandes, tirs persistants et effets visibles. Adaptation du monde, acquisition de cibles et projectiles restent à mesurer lors de l'intégration.

## Suite du lot

[ROADMAP](../ROADMAP.md) demeure canonique. Restent données tactiques du contenu, précision/compétence et lésions Bullet, appartenance/hostilité, préparation/récupération, sauvegarde du vol, impacts et réactions civiles. Les coins et bords sont confrontés au miroir identifié, pas à un exécutable commercial récent ; conserver ce point dans les futurs essais comparatifs. Aucun SYS global n'est clos.
