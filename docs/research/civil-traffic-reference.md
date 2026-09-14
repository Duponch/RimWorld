# Passage civil et réservations — vérification du 14 septembre 2026

Périmètre : RimWorld Core, colons ordinaires sans menace. Corpus chapitres 5/9/10/21/32, SYS-020..022/041..061/113..117, familles F1/F2/F3. Le chapitre 21 distingue accès, route et suivi et précise qu'une personne n'est pas nécessairement un obstacle permanent. La restriction générale du prototype était un écart à corriger, pas une exigence de la 3D.

## Sources confrontées

| Source consultée | Observation et portée |
|---|---|
| [Basics](https://rimworldwiki.com/wiki/Basics), guide Core communautaire | Le passage à travers les autres colons existe ; un ordre de position en combat n'est pas une réservation générale de toute cellule traversée. |
| [Drafting](https://rimworldwiki.com/wiki/Drafting), wiki communautaire | La collision dépend de l'état de combat ; en collision, les adversaires bloquent et les groupes superposés cherchent à se disperser. Cette page ne décrit pas tous les prédicats internes. |
| [PawnUtility](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/PawnUtility.cs), miroir épinglé au 20 mai 2026 | `ShouldCollideWithPawns` retourne faux pour un pawn ordinaire sans hostiles proches récemment. `PawnBlockedBy` combine ensuite posture/mouvement, taille, relation et activité. Ne pas réduire ce code à « tous les alliés traversent toujours » en présence de combat. |
| [Pawn_PathFollower](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/Pawn_PathFollower.cs) et [ReservationManager](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/ReservationManager.cs), même miroir | Le suivi consulte la collision ; les réservations de cibles, piles et tâches sont un autre mécanisme. Réserver une utilisation ne transforme pas un utilisateur civil en mur. Les fichiers ont été téléchargés de nouveau pour cette tranche ; aucun code du miroir intégré au jeu. |
| [Annonce officielle 1.6.4850](https://steamcommunity.com/games/294100/announcements/detail/687507011804333828), [texte du correctif conservé par SteamDB](https://steamdb.info/patchnotes/23627282/) | Correctifs du 8 juin 2026 concernant les bloqueurs amis/ennemis et les incohérences de contournement. Ils sont postérieurs au miroir : les conditions de combat actuelles doivent être revérifiées à leur implémentation. L'annonce officielle n'a exposé qu'une image au lecteur Web ; le détail textuel consulté vient de SteamDB. |

Certitude élevée sur l'existence du passage civil et la séparation avec les réservations. Certitude moyenne sur l'exhaustivité des exceptions de la version commerciale actuelle. Les deux pages du même wiki et les différents fichiers d'un même miroir ne sont pas des sources entièrement indépendantes. Pas de promesse de conformité totale.

## Décision locale

**Adopter** le passage entre les colons civils actuellement présents, qu'ils marchent, travaillent, mangent, dorment ou restent inactifs. Supprimer les contournements et déplacements forcés d'un colon inactif, puisque son corps n'est plus un obstacle. Les diagonales conservent leurs coins solides et durées géométriques. Aucun coût supplémentaire de traversée d'une personne n'est inventé.

**Adopter** des réservations d'utilisation distinctes : propriétaire/dormeur d'un lit, destination de repas, poste et facture, quantités de piles et destinations de transport. Traverser leur cellule ne donne aucun de ces droits ni bonus. Un effondrement au sol ne s'approprie pas un lit ou poste sous le colon. Deux utilisateurs ne peuvent réserver le même service ; plusieurs objets au sol restent interdits.

**Adapter la présentation 3D explicitement** : le corps et la cargaison suivent toujours leur arête individuelle sur GPU. Des modèles peuvent momentanément s'interpénétrer, voire rester superposés lorsque deux activités civiles partagent une cellule ; aucune séparation physique artificielle ou téléportation n'est ajoutée. La lisibilité des superpositions est encore partielle ; une future séparation visuelle devra rester dans l'espace autorisé et préserver vitesse, orientation et sélection. Les portraits permettent toujours de sélectionner chaque individu.

**Différer** collisions hostiles, mobilisation, tailles corporelles, poussée de combat et dispersions jusqu'aux systèmes correspondants. Avant leur livraison, remplacer la politique civile explicite par un profil de collision déterministe commun à recherche, exécution et validation. Le laboratoire GPU demeure indépendant.

Le [contrat V14](../development/spatial-motion-storage.md) décrit migration et implémentation. Les tests prouvent notre cohérence et continuation ; ils ne sont pas des observations de toutes les situations du jeu de référence.
