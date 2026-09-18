# Capture tactique du monde — sous V54

18 septembre 2026. [Recherche, propriétés et adaptations](../research/combat-world-reference.md). `combat-content.ts` attribue les remplissages logiques du catalogue actuel ; `combat-world.ts` expose leur capture aux [requêtes de tir](combat-queries.md). Initialement préparée sous V54, cette capture est utilisée par la [commande de tir V56](shooting.md).

## Frontière et durée de vie

`captureWorldShotGrid(world)` copie dimensions, tick, massifs, empreintes des ouvrages et cadres, plantes et fragments au sol. La capture ne conserve aucune référence mutable au monde ; consultation sans PRNG, réservation ou effet de santé. Un ancien rapport reste immuable après retrait d'une roche ou ouverture de porte.

Une capture sert à un lot synchrone de requêtes tant que le monde ne change pas. Recréer après minage, coupe, transfert, chantier ou modification de porte, même au même tick. Aucun cache global d'identité/tick et aucun travail par frame. Une phase d'impact qui détruit du décor devra invalider la capture avant la requête suivante. L'instantané précédent reste consultable comme historique, jamais comme état courant.

Capture en O(cases + objets/empreintes), lecture ponctuelle en O(1). Un tableau de slots référence des colonnes numériques privées ; les identifiants restent en Float64 pour préserver les entiers sûrs au-delà de 32 bits. Coefficients en Float64 sans arrondi de définition. Les objets de rapport et leurs clés ne sont créés que sur consultation, puis partagés par empreinte. Les massifs utilisent une sentinelle spatiale et des clés par case. Une capture par colon referait inutilement le même travail : la future intégration doit partager par lot sans mutation.

## Sens des données

Remplissage brut, obstruction de vue et probabilité de couvert sont différents. Le candidat de plus grand remplissage gagne par case ; égalité résolue par identifiant persistant. Une porte ouverte domine donc un fragment sur sa case mais fournit zéro blocage. Son animation, interdiction et maintien ouvert n'affectent pas cette règle.

Les cadres ont leur propre 0,20, sans obstruction de mur ; plans sans couvert. Toutes les cellules de meubles tournés participent ; les meubles historiques `legacy-single` gardent leur empreinte. Seuls les fragments posés donnent un couvert d'objet ; paquets et piles portées/en chantier sont exclus. Roches/filons pleins bloquent, sol découvert et eau non. Les petits cailloux décoratifs sont explicitement exclus, contrairement aux fragments transportables.

La hauteur 3D ne remplace pas ces propriétés. Le générateur est traversable mais opaque au tir. La capture ne calcule ni cible autorisée, posture, interception, dommage aux objets, santé ni hostilité. Les règles particulières des futurs contenus s'ajouteront à cette frontière ; elle n'est pas un moteur physique.

## Validation et coût

Quatre scénarios dans `combat-world.test.ts` enrichissent les huit scénarios de requêtes : catalogue/rotations et anciens meubles, superposition/porte/piles/plantes, mutations au même tick et limites d'une carte rectangulaire, puis vrai minage/coupe/construction par commandes avec cadre observé et continuation sauvegardée exacte. Ce dernier contrôle 40 acier et 12 bois restants, sans injection du résultat. Les fixtures géométriques des autres scénarios sont distinctes d'une sauvegarde validée.

Le banc `scripts/combat-world-bench.ts` conserve le décor généré 250² (environ 12 000 ressources), 3/30/100 mineurs et leurs désignations. Une zone géométrique contrôlée fournit passages libres, mur, porte alternée, atelier et arbre. Cinquante lots de chauffe puis cinq cents mesures ; capture incluse et partagée, génération/mutation exclues. Aucune simulation de combat, aucun worker/rendu ; ces acteurs n'effectuent pas cent tirs jouables.

La première mesure a montré que les allocations de rapports pour chaque plante dominaient. Après stockage en colonnes et matérialisation à la demande, résultats de requêtes identiques. [Mesure initiale](../../artifacts/combat-world-baseline-v54.json), [mesure finale](../../artifacts/combat-world-v54.json), Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1 :

| Candidats | Capture p95 avant → après | Total capture/requêtes p95 | p99 | Maximum |
|---|---:|---:|---:|---:|
| 3 | 3,2946 → 0,9954 ms | 1,0238 ms | 1,3420 ms | 1,4285 ms |
| 30 | 2,4282 → 1,0235 ms | 1,1015 ms | 1,3359 ms | 1,4386 ms |
| 100 | 2,3644 → 0,8929 ms | 1,0856 ms | 1,2667 ms | 1,4343 ms |

Une passe avant/après, pas une garantie de budget en combat réel. Pas de test UI ni de longue colonie rejoué pour ces modules non branchés : aucun affichage, commande, schéma ou horloge n'est modifié. L'intégration des attaques devra ajouter le parcours visible, les phases persistantes et la charge mixte prévue dans la ROADMAP.

V58 : `combat-shot-batch` réutilise la capture de tir au sein du seul appel synchrone `advanceWorldCombat`. Les impacts médicaux y modifient personnes et objets mobiles, jamais terrain, plantes, cadres ou bâtiments. Après chaque impact, comparer les piles au sol à remplissage positif (ID, cellule, remplissage) ; un changement invalide la capture, une arme déposée sans couvert ne le fait pas. Cibles mobiles et places d’arrêt sont toujours recapturées après impact ; nouvelle capture complète au tick suivant. Les futurs dégâts d’objet devront étendre cette invalidation.
