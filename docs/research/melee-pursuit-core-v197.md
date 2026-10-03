# Poursuite de mêlée — relevé Core 1.6.4871 pour V197

Recherche du **3 octobre 2026**, à la suite du signalement d'un assaillant désarmé qui s'arrête régulièrement en poursuivant un civil blessé et lent. **Les branches Core inspectées ne prescrivent aucune pause périodique de récupération pendant une poursuite sans tentative de coup.** Le renouvellement d'une décision ou d'un chemin ne suffit pas à justifier une telle immobilité. Un résultat de recherche de chemin absent, une collision, une porte ou un état réellement occupé peuvent toutefois arrêter le déplacement ; il ne faut donc pas annoncer que Core ne connaît aucune attente.

## Témoin et méthode

Installation primaire lue seule : `E:/Steam/steamapps/common/RimWorld`. `Version.txt`, relu le 3 octobre, porte **1.6.4871 rev590**. Empreinte SHA-256 recalculée de `RimWorldWin64_Data/Managed/Assembly-CSharp.dll` : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les types ciblés ont été relus avec ILSpyCmd **8.2.0.7535**, sans décompiler l'assembly entier. Sorties locales sous `tmp/v197/core-*.cs` ; aucun code ou XML propriétaire n'est publié dans cette note ni intégré à Lisière.

Lectures préalables : [mêlée](../development/melee.md), [poursuite](../development/pursuit.md), [raids](../development/raids.md), leurs recherches [mêlée](melee-reference.md), [poursuite](pursuit-reference.md), [raid](raid-reference.md), et les preuves historiques [V59](../history/validation-melee-v59.md), [V61](../history/validation-pursuit-v61.md), [V68](../history/validation-raids-v68.md). Les sections Mêlée V59 et Approche ennemie V61 de l'archive des instructions sont relues sans modification. Le HTML original du corpus, chapitres 20 et 21, distingue contact admissible, perturbation du déplacement, accessibilité, recherche et suivi ; domaines **SYS/TEST-098..112 et 113..117**, sans clôturer ces identifiants. [Adoption du référentiel](reference-adoption.md) conserve leur provenance historique.

## Méthodes inspectées et résultats

| Classe et méthodes locales | Constat pertinent |
|---|---|
| `Verse.AI.JobDriver_AttackMelee.MakeNewToils`, `IsContinuation`, `Notify_PatherFailed` | Le job utilise `FollowAndMeleeAttack`. Sa continuité dépend de l'identité de `targetA`. Le compteur concerne les tentatives lancées ; une branche explicite peut remplacer une cible perdue par une porte proche. Aucun cycle d'attente n'est ajouté au simple suivi. |
| `Verse.AI.Toils_Combat.FollowAndMeleeAttack` | Suit la **Thing** cible en mode `Touch`, sauf place d'arrêt explicite `targetB`. Réamorce le chemin si la destination change ou si le suivi est arrêté alors que le contact manque. N'appelle l'action de coup que si `CanReachImmediate(target, Touch)` est vrai. Le contrôle d'accessibilité à cadence hash 250 n'ajoute pas de temps de repos. Cible disparue/invisible/inaccessible, puis cible à terre non achevable, terminent la tâche. |
| `Verse.AI.Toils_Goto.GotoThing` | Démarre le suivi vers la cible et attend l'arrivée physique ; ce n'est pas un délai de récupération. Le job de mêlée utilise directement la boucle de suivi ci-dessus. |
| `Verse.AI.Pawn_PathFollower.StartPath`, `PatherTick`, `TryEnterNextPathCell`, `SetupMoveIntoNextCell`, `NeedNewPath`, `SetNewPathRequest`, `GenerateNewPathRequest`, `ResetToCurrentPosition`, `StopDead`, `CostToMoveIntoCell`, `CostToPayThisTick` | Sépare la demande asynchrone, le chemin disponible et la progression vers la prochaine cellule. Le renouvellement ordinaire conserve le chemin disponible et la fraction de déplacement engagée. Les états occupés, collisions et passages particuliers peuvent suspendre la progression. |
| `RimWorld.JobGiver_AIFightEnemy.TryGiveJob`, `MeleeAttackJob` | L'attaque de mêlée expire dans 360–480 ticks Core avec contrôle de remplacement et condition d'ennemis proches. Ce sont des règles de réexamen de job, pas une récupération de coup. |
| `Verse.AI.Pawn_JobTracker.JobTrackerTickInterval`, `CheckForJobOverride`, `ShouldStartJobFromThinkTree`, `StartJob`, `CleanupCurrentJob` ; `Verse.AI.JobDriver.Cleanup`, `IsContinuation` | Une proposition de même définition, reconnue comme continuation et issue du même nœud fournisseur, **ne remplace pas le job courant**. Le contrôle à expiration ne force donc pas une interruption périodique de la poursuite conservée. L'annulation souple d'une stance n'annule que la préparation ; elle ne supprime pas une récupération. |
| `RimWorld.Pawn_MeleeVerbs.TryMeleeAttack`, `TryGetMeleeVerb` ; `Verse.Verb.TryStartCastOn`, `WarmupComplete`, `TryCastNextBurstShot` ; `RimWorld.Verb_MeleeAttack.TryCastShot` | Le lancement refuse un acteur occupé ; la cible doit être frappable. Une tentative de mêlée engagée, y compris ratée ou esquivée, mène à la récupération calculée du verbe. Le cache de choix d'outil de 60 ticks n'est pas une attente de mouvement. |
| `Verse.Pawn_StanceTracker.FullBodyBusy`, `CancelBusyStanceSoft`, `StanceTrackerTick` ; `Verse.Stance_Busy.StanceBusy`, `StanceTick`, `Expire` ; `Verse.Stance_Cooldown` ; `RimWorld.StaggerHandler.StaggerFor`, `StaggerHandlerTick` | `Stance_Cooldown` est une stance occupée ; `PatherTick` ne progresse pas pendant `FullBodyBusy`. Le ralentissement de la victime relève d'un autre composant, qui réduit le coût payé par tick et laisse le mouvement progresser. |

## Le renouvellement du chemin n'est pas un repos

`PatherTick` vérifie `NeedNewPath` à **30 ticks Core hashés**. Une cible mobile est conservée comme objet ; sa position est relue lors de cette vérification. Le déplacement toléré depuis la dernière position visée dépend de la distance actuelle :

| Distance actuelle à la cible | Déplacement de cible déclenchant le renouvellement |
|---:|---:|
| ≤7 cellules | >0,5 cellule |
| >7 et ≤10 | >2 cellules |
| >10 et ≤17 | >3 cellules |
| >17 et ≤30 | >5 cellules |
| >30 | >10 cellules |

Ce tableau reformule les comparaisons de distances au carré du binaire. D'autres branches demandent un nouveau chemin : extrémité devenue inadmissible près de la cible, chemin absent/épuisé, obstacle, danger, porte, diagonale empêchée, ou heuristique régionale après 75 nœuds consommés. **Une cible qui change de cellule n'impose pas à elle seule de s'immobiliser pendant 30 ticks.**

`SetNewPathRequest` remplace la demande en cours, sans détruire `curPath`. La requête part de `nextCell`, c'est-à-dire de l'extrémité déjà engagée. Pendant l'attente, le chemin disponible continue à payer son coût et à progresser. À réception du nouveau chemin, `PatherTick` remplace celui-ci ; il n'initialise une nouvelle cellule que si le segment courant n'existe pas ou est déjà terminé. `SetupMoveIntoNextCell` reporte également le surplus de coût payé sur l'arête suivante.

**Limite réelle :** si l'acteur est marqué en déplacement mais n'a aucun `curPath`, `PatherTick` attend un résultat. Un départ initial, un reset physique après obstacle ou une route consommée avant la réception peuvent donc attendre la recherche asynchrone. Aucune durée de récupération de mêlée n'est associée à cette attente. Cette lecture n'a pas mesuré la latence du pathfinder en partie ni la visibilité d'une telle attente à l'écran.

## Les arrêts effectivement justifiés

- **Tentative de coup au contact :** `TryCastNextBurstShot` installe `Stance_Cooldown` même si le résultat de mêlée est raté ou esquivé. `FullBodyBusy` suspend ensuite le mouvement. Le XML Core `ThingDefs_Races/Races_Humanlike.xml` donne deux secondes nominales aux poings, dents et tête, soit 120 ticks Core avant les ajustements applicables au verbe. Ce nombre ne décrit pas universellement toutes les armes et statistiques.
- **Ralentissement de la victime :** `Verb_MeleeAttack.TryCastShot` applique 95 ticks de stagger après la tentative à une victime vivante et présente, même si le coup manque. Le facteur de déplacement par défaut est 0,17 ; `StaggerDurationFactor` module la durée. Ce mécanisme n'est pas une récupération périodique du poursuivant.
- **Blocage matériel :** autre pawn réellement bloquant, porte attendant son ouverture, bâtiment infranchissable, état occupé/étourdi, ou absence de chemin calculé. L'attente sur un pawn hostile peut conduire à une attaque distincte après 180 ticks sans déplacement ; ce seuil ne s'applique pas à une cible mobile simplement hors contact. Les portes peuvent créer leur propre cooldown d'ouverture, sans être des coups.

## Recoupement Internet primaire

La [publication officielle 1.6 du 11 juin 2025](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/), ouverte le 3 octobre 2026, annonce le pathfinding multithreadé et regroupé par lots. Elle corrobore la séparation demande/résultat observée dans le témoin installé, sans donner les tolérances ni cadences de poursuite.

Le [correctif officiel 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), ouvert à nouveau le 3 octobre, mentionne les corrections de passage des bloqueurs amis/ennemis et de contournement de pawns bloquants. Il ne définit aucun repos périodique en poursuite. Les nombres et embranchements de cette note viennent du binaire local **1.6.4871**, ultérieur à ce correctif ; les miroirs tiers et wiki des recherches V59/V61/V68 ne les certifient pas.

## Décisions de diagnostic pour Lisière

**Adopter** la distinction entre poursuite continue, recherche de chemin, attente d'obstacle et récupération consécutive à une tentative. **Adapter** le suivi à l'horloge et au budget local déterministes sans attribuer au Core un délai arbitraire de replanification. La cadence 360–480 d'un mandat ne justifie pas d'effacer puis recréer périodiquement sa route et son coup lorsque la même cible reste valide. La recherche V61 documentait déjà ses attentes locales de 20/4 ticks comme des adaptations ; elles ne deviennent pas des constantes Core.

**Vérifier** dans un témoin Lisière séparé la chronologie : chaque immobilité doit être rapprochée d'une tentative, d'un état occupé, d'un segment, d'une collision, d'un changement de cible ou d'un résultat de recherche absent. Observer seulement une blessure finale ne distingue pas ces causes. Une cible lente blessée ne prouve pas non plus, à elle seule, que le poursuivant dispose d'une meilleure vitesse effective sur le terrain traversé.

Cette enquête lit les branches pertinentes ; **elle ne reproduit pas le signalement en partie Core, ne diagnostique pas à elle seule le code de Lisière, ne mesure aucun coût CPU/GPU et ne revendique aucune parité complète**. Aucun produit, schéma, fixture historique ou test de campagne n'est modifié par cette recherche.
