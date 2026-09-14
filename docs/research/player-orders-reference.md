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
| Transport, cuisine et chaînes de construction | V18 adopte rangement et livraison forcés ; dégagement, combustible et cuisine restent différés. Un ordre de finition exige déjà ses matériaux et une emprise libre ; aucun « terminer toute la construction » implicite. |

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
- Abattage, coupe, récolte, semis libres, finition, rangement et livraison disposent de fournisseurs. Dégagement, combustible, cuisine, utilisation forcée d’un objet et maintien d’une priorité locale autour d’une cible restent à développer.
- Pas de mobilisation ni d'ordre de déplacement civil inventé. Santé, crises et interruptions hostiles manquent encore ; seul l'effondrement de fatigue déjà simulé interrompt ici l'ordre en urgence.

Le [contrat courant](../development/player-orders.md) et l'[inventaire](../gameplay/implementation-status.md) décrivent les règles réellement livrées.

## Relecture V18 — transport et construction, 14 septembre 2026

Chapitres 9/10 et lignes SYS/TEST-047..054 et 056 relus : réservation par quantité, conservation lors des transferts, capacité compatible, interruption et chantier. Décision **adopter** ces contrats ; les statuts du corpus ne sont pas des validations locales. SYS-055 (inventaire), 057..061 (réparation, démontage, réinstallation, remplacement, minage) restent différés.

Recherches fraîches : Hauling/Orders du wiki, puis lecture des fournisseurs du miroir à révision épinglée et recoupement avec l'annonce officielle. Les discussions de joueurs et pages de mods trouvées par recherche ne servent pas de règle de code. Les fichiers du miroir ont été téléchargés à nouveau pour cette étape ; ils ne sont pas incorporés au jeu.

- [HaulAIUtility, révision 2d50803](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse.AI/HaulAIUtility.cs) : accès/réservation/manipulation, recherche de meilleur stockage, compte adapté à la capacité, prise opportuniste d'objets compatibles. Adopter accès, source et stockage ; notre portage fixe et nos trajets unitaires restent incomplets.
- [StoreUtility, même révision](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/StoreUtility.cs) : pour les réserves acceptant l'objet et appartenant au joueur, le drapeau forcé conserve la priorité courante. Il ne rend donc pas valable un transfert circulaire entre deux réserves équivalentes. La différence liée aux bâtiments de faction étrangère attend ce système.
- [ConstructDeliverResources](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/WorkGiver_ConstructDeliverResources.cs) : sélection de matière accessible, prise en compte d'objets déjà portés, files de sources et de chantiers proches. Livrer et finir restent des sous-travaux distincts. Notre fournisseur livre une quantité depuis une pile à un chantier, sans promettre la chaîne entière. Le réemploi direct en main et les tournées restent absents.
- [Correctif officiel 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) : les corrections de livraisons et de cache forcé restent pertinentes pour tester les annulations et invalidations ; elles ne fournissent pas un nouvel algorithme à copier.

**Écarts assumés :** pas de vol/annulation d'une réservation d'un autre colon par l'ordre forcé ; quantités et capacités physiques restent garanties par nos réservations. Le miroir présente des exceptions `forced` aux réservations et aux matières en route, mais ne suffit pas à certifier leur interaction dans le correctif actuel. Avant d'ajouter une reprise de tâche d'autrui, il faudra vérifier ce comportement et conserver les mêmes bilans. Le portage de 10 unités, le rangement mono-pile et l'absence de tournée sont hérités du moteur et restent à compléter, sans être présentés comme fidèles à RimWorld.

Confiance élevée sur la distinction livraison/finition et les contraintes physiques ; moyenne sur les détails de choix, interruption forcée entre colons et optimisations opportunistes. Aucun test contre un binaire commercial ni parité numérique globale n'est revendiqué.
