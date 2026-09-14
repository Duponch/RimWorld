# Sélection et ordres directs — vérification Core

Recherche du 14 septembre 2026. Cible : RimWorld de base 1.6. Le corpus reste un guide de comportement ; cette vérification ne certifie ni tous les fournisseurs d'ordres, ni toutes les versions du jeu.

## Corpus et décisions

Chapitres 8 et 9 du rapport utilisateur, relus via les extractions de `docs/reference/originals`. `Systemes` et `Tests` : SYS/TEST-031..034 (sélection/contexte), 041..042 (travail), 047..050 (réservation/interruption/ordre forcé). SYS/TEST-035..036 (mobilisation/ciblage) attendent G3. SYS-174 reste la cible future pour sélectionner le propriétaire d'un équipement.

| Contrat | Décision V17 |
|---|---|
| Sélection individuelle, rectangle, Maj et double-clic | Adopter pour les colons ; rectangle en coordonnées écran dans les deux projections. La sélection d'autres familles d'objets reste absente. |
| Contexte dépendant du colon et de la cible | Adopter un menu de travail individuel. Une sélection de groupe ne distribue pas artificiellement un travail unique. |
| Éligibilité distincte du rang | Adopter : vérifier accès, réservation, désignation et métier avant acceptation ; ne pas transformer une priorité 0 en aptitude. |
| Interruption et file | Adopter pour un travail exécutable : réservation immédiate, Maj ajoute après l'activité actuelle, revalidation au démarrage. Conserver matière et déplacement engagé. |
| Transport, cuisine et chaînes de construction | Différer leurs fournisseurs contextuels quantitatifs. Un ordre de finition exige déjà ses matériaux et une emprise libre ; aucun « terminer toute la construction » implicite. |

## Sources recoupées

- [Controls, wiki communautaire](https://rimworldwiki.com/wiki/Controls) : clic, Maj, double-clic et rectangle ; Maj avec le bouton droit pour la file. Page annoncée incomplète, utile pour les commandes PC mais insuffisante pour leurs cas limites.
- [Orders, wiki communautaire](https://rimworldwiki.com/wiki/Orders) : travail manuel sur un colon autorisé, interruption ordinaire immédiate, file après l'activité courante ; les besoins et horaires ordinaires attendent la fin des ordres. Les besoins continuent de diminuer. Les urgences doivent être traitées par leurs systèmes, pas supprimées par un drapeau de commande.
- [WorkGivers, miroir daté de code](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/FloatMenuOptionProvider_WorkGivers.cs) : fournisseur de travail non multisélection, contrôles métier/capacité/interdiction/accès, refus pour travail déjà engagé. Cela ne signifie pas que tous les autres menus contextuels de RimWorld sont individuels.
- [Pawn_JobTracker](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/Pawn_JobTracker.cs) et [JobQueue](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/JobQueue.cs) : réserve avant insertion, remplacement ou ajout selon le modificateur, état forcé persistant. `Notify_WorkTypeDisabled` et `RemoveAllWorkType` distinguent le métier désaffecté d'une incapacité : **passer la priorité à 0 conserve les ordres forcés déjà acceptés**. La V17 reprend cette distinction ; les incapacités restent absentes.
- [Correctif officiel 1.6.4850, Ludeon, 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : corrections du cache de construction face aux ordres forcés et des livraisons. Justifie la revalidation des commandes ; ne décrit pas à lui seul tout le fonctionnement du menu.

Le miroir n'est pas une publication officielle ni une preuve du binaire actuellement installé ; sa révision précède le correctif de juin. Aucun code commercial n'est incorporé. Confiance élevée sur les gestes et la distinction sélection/travail ; moyenne sur tous les détails d'interruption entre fournisseurs, encore à vérifier lors de leur ajout.

## Limites et adaptations connues

- La 3D conserve clic droit glissé pour la caméra et clic droit immobile pour le menu. Un proxy projeté du corps permet de sélectionner à travers le feuillage ; pas de parcours de tous les triangles, ni d'autorité donnée au mesh. Les silhouettes couchées et la sélection d'accessoires demanderont leurs propres proxies.
- La file locale est bornée à 32 travaux en attente par colon, avec refus explicite au-delà. C'est une borne du projet, pas une valeur attribuée à RimWorld.
- Seuls abattage, coupe, récolte, semis libres et finition d'un chantier approvisionné disposent du fournisseur actuel. Approvisionnement, dégagement, transport, combustible, cuisine, utilisation forcée d'un objet et maintien d'une priorité locale autour d'une cible restent à développer.
- Pas de mobilisation ni d'ordre de déplacement civil inventé. Santé, crises et interruptions hostiles manquent encore ; seul l'effondrement de fatigue déjà simulé interrompt ici l'ordre en urgence.

Le [contrat courant](../development/player-orders.md) et l'[inventaire](../gameplay/implementation-status.md) décrivent les règles réellement livrées.
