# V310 — secours et couchages animaux : référence Core

Recherche du 11 octobre 2026 après clôture V309 en 4c1707ad. Référence primaire et cadrage du lot V310 : emplacement animal gratuit normal/médical, secours des cinq espèces possédées, portage de la même identité, soins et nourriture physiques, sommeil avec repli au sol. Le pilote privé est préparé dans tests/helpers/animal-rescue-v310.ts et tests/integration/animal-rescue-v310.spec.ts ; sa rédaction ne constitue pas une exécution ni une preuve de livraison. Les règles proposées restent distinctes des résultats à documenter après contrôles ROOT.

## Provenance et limites

Installation primaire : `E:/Steam/steamapps/common/RimWorld`, `Version.txt` = **1.6.4871 rev590**. Assembly locale `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Extraction fraîche par ILSpyCmd 8.2.0.7535 déjà présent dans `tmp/reference-tools/ilspycmd-8.2`, via .NET6.0.29. Les classes décompilées restent sous tmp/functional-v310-reference ; les XML Core restent intacts. [provenance privée](../../tmp/functional-v310-reference/provenance.json) enregistre les empreintes et les deux tentatives de mauvais namespace.

Sources officielles consultées le 11 octobre 2026 :

- [Ludeon, Alpha12 — Animal Taming, 21 août 2015](https://ludeon.com/blog/2015/08/rimworld-alpha-12-animal-taming-released/) annonce les emplacements, boîtes et lits animaux, leur sommeil et les soins en lit. Son entraînement « Rescue » désigne un **animal qui porte un colon**, système distinct du colon qui secourt un animal étudié ici.
- [Ludeon, annonce1.3, 4 juillet 2021](https://ludeon.com/blog/2021/07/announcing-update-1-3-and-the-ideology-expansion/) mène au [changelog officiel1.3](https://docs.google.com/document/d/e/2PACX-1vRsxUoc5eA1dqi0nrMKxCuN8nt0So7_qvwwkkiyug6SLyjgJFNEu0XGBmQ7aCb9xgdnfy0t5CSkbPyL/pub), qui confirme l'affectation des lits animaux et leur désignation médicale. L'ouverture directe du document a échoué ; la chaîne du lien officiel via Steam a réussi.

Ces publications établissent les fonctions, pas les règles exactes du build1.6.4871 : celles-ci proviennent de l'assembly/XML installé. Aucun mod, DLC additionnel ou détail non relu de la simulation Unity n'est inféré. Les branches DLC visibles dans le code sont signalées, sans proposition d'implémentation locale. Le succès de décompilation n'est pas un test du gameplay Elsewhere.

## Admission et ordre du travail

`Data/Core/Defs/WorkGiverDefs/WorkGivers.xml` : **DoctorRescue**, métier Doctor, priorité60, capacité Manipulation, `directOrderable=false`. DoctorTendToAnimals50 et DoctorFeedAnimals40 suivent. Aucun minimum Animals, capacité Violence, arme ou coût de médecine au pickup dans ce fournisseur de secours. Le menu possède sa propre voie directe, malgré `directOrderable=false` du fournisseur.

[WorkGiver_RescueDowned](../../tmp/functional-v310-reference/RimWorld.WorkGiver_RescueDowned.cs) scanne les Pawn à terre (humains et animaux), utilise OnCell et Danger.Deadly ; skip s'il n'existe aucun Pawn de sa faction à terre hors lit. [HealthAIUtility](../../tmp/functional-v310-reference/RimWorld.HealthAIUtility.cs) exige pour l'automatique même faction, patient non interdit, absence d'ennemi dans **25 cases**, réserve/accès OnCell Danger.Deadly. La constante40 présente dans le WorkGiver est inutilisée : ce n'est pas la distance active.

`WantsToBeRescued` exige à terre, hors lit, hors charge/désactivation/caravane en formation, pas de désignation d'abattage ; refuse l'état mental sauf Scaria. Exceptions supplémentaires : mutant sans droit aux soins, rôle de rituel autorisant l'état à terre, nourrisson toujours à terre sans besoin médical. Les cas Scaria/DLC et caravanes restent hors périmètre proposé.

[FloatMenuOptionProvider_RescuePawn](../../tmp/functional-v310-reference/RimWorld.FloatMenuOptionProvider_RescuePawn.cs) fonctionne avec colon mobilisé ou libre, exige Manipulation et un seul sélectionné. `forced=true` saute les trois restrictions faction/interdit/ennemi du contrôle initial, mais garde besoin de secours et réserve/accès. Le menu exclut ensuite prisonnier, esclave, mech colonial, cible hostile, certains patients destinés à rejoindre la colonie et **NoCare**. Il cherche un lit puis essaie en ignorant les autres réservations ; sa validation finale et le job restent physiques. Ce chemin peut atteindre un animal sauvage non hostile ; restreindre Elsewhere aux cinq espèces **possédées** est une adaptation explicite et bornée.

**Nuance NoCare :** `WantsToBeRescued` ne lit pas la politique de soins. L'automatique peut donc théoriquement choisir un lit normal valide pour un animal NoCare. Le menu refuse NoCare et les lits médicaux exigent `ShouldEverReceiveMedicalCareFromPlayer`, qui refuse NoCare et abattage. Une règle locale uniforme « none interdit tout secours » serait une adaptation, pas une copie littérale de tous les chemins Core.

## Choix du lieu

[RestUtility](../../tmp/functional-v310-reference/RimWorld.RestUtility.cs) distingue trois contrôles :

- `CanUseBedEver` : non-mech, taille corporelle **actuelle** <= `bed_maxBodySize`, égalité humain/animal, restriction du caisson Deathrest. Un âge juvénile peut donc changer la compatibilité d'une boîte.
- `CanUseBedNow` : lit existant, même carte, non brûlant, compatible, place disponible ou patient propriétaire/occupant, droits d'affectation/partage, rôles prison/esclave et branches DLC. Lit médical : droit aux soins et besoin de repos médical ; lit normal : propriétaire autorisé ou place partageable. La pose du marqueur ne remplace pas ces contrôles.
- `IsValidBedFor` : contrôles précédents puis trajet du **porteur** OnCell **Danger.Some**, réservation/place, aucune réservation TakeToBed concurrente, non interdit au porteur et faction du lit compatible. La recherche du patient admet Danger.Deadly, mais le contrôle de la route au lit est plus restrictif.

`FindBedFor(patient,porteur,false,false,GuestStatus)` est la voie du WorkGiver. Ce n'est pas simplement « lit le plus proche » :

1. Besoin médical : lit médical courant valide, puis types triés par taille maximale croissante, qualité de traitement décroissante, efficacité du repos décroissante ; pour chaque type, passe dangerNone puisDeadly au lieu du lit, et plus proche candidat accessible depuis la position du patient.
2. Lit possédé valide, puis éventuel lit du partenaire (branche humaine).
3. Types normaux triés par taille maximale croissante puis repos décroissant ; passe dangerNone sans cadavre sur la case, dangerNone avec cadavre admis, puis dangerDeadly, chaque type donnant son plus proche candidat accessible. `IsValidBedFor` conserve cependant son trajet Danger.Some.

Un premier lot limité à un type d'emplacement animal peut adapter ce classement en médical → possédé → normal, distance puis ID stable, à condition de le déclarer. Les seuils/dangers Core ne correspondent pas directement aux champs `threat/flee/manhunter` actuels ; une correspondance locale explicite doit précéder leur usage, sans inventer une reproduction exacte des dangers Unity.

## Portage, propriété, interruption

[JobDriver_TakeToBed](../../tmp/functional-v310-reference/RimWorld.JobDriver_TakeToBed.cs) libère les réservations du patient puis réserve patient et places du lit. [Toils_Bed](../../tmp/functional-v310-reference/RimWorld.Toils_Bed.cs) revendique un **lit non médical avant pickup** ; propriété persistante, réservation transitoire et présence au lit sont trois notions distinctes. Une interruption de secours normal n'annule pas automatiquement cette propriété : la branche de désaffectation du FinishAction concerne la capture en prison.

Le job approche ClosestTouch, refuse la récupération avant pickup pour Rescue/Capture et les interactions physiques concurrentes, utilise `StartCarryThing`, rejoint le lit Touch avec revalidation, libère la réservation du lit puis dépose au lit. Il n'introduit ni durée de travail fixe, RNG de réussite, guérison ou soin au pickup dans cette classe. La prise physique elle-même dépend du helper de portage commun, non décompilé dans cette recherche.

Le FinishAction dépose toute chose portée directement à la position courante du porteur sur interruption. `RestUtility.TuckIntoBed` dépose à la position du lit, revalide son utilisation puis notifie le job/posture du patient. `TakeeRescued` est faux pour les animaux : le secours animal ne déclenche pas le souvenir/relation humaine `Notify_RescuedBy` et ne constitue pas un apprivoisement. Les effets exacts d'une mort/stun pendant le segment Unity ne sont pas établis ici ; Elsewhere doit les borner avec son contrat de trajectoires sauvegardées.

## Couchages et statistiques Core

XML : `Data/Core/Defs/ThingDefs_Buildings/Buildings_Furniture.xml`, lignes461–594. [BuildingProperties](../../tmp/functional-v310-reference/RimWorld.BuildingProperties.cs) donne par défaut `bed_maxBodySize=9999`, `bed_healPerDay=0`, humain=true et médical=false ; les définitions animales surchargent humain=false.

| Type Core | Coût/travail Core | Compatibilité et statistiques relues |
| --- | --- | --- |
| AnimalSleepingSpot | Aucun matériau ; WorkToBuild0 ;1×1 Standable, pas PV, pas rotation | MaxBodySize9999 par défaut, HealPerDay0, SurgerySuccessChanceFactor.7 ; marque au sol assignable |
| AnimalSleepingBox |25 matériau bois/métal/pierre ; Work180 ; HP75, masse3 | MaxBodySize.55 ; repos.93, confort.60, immunité1.05, chirurgie1 ; HealPerDay4 hérité |
| AnimalBed |40 textile/cuir ; Work400 ; HP140, masse5 | MaxBodySize9999 par défaut ; repos1, confort.75, immunité1.07, chirurgie1 ; HealPerDay4 hérité |

Boîte/lit héritent qualité, coût de traversée14 et PassThroughOnly. L'emplacement gratuit n'hérite pas de ces propriétés et n'a pas les bonus explicitement portés par les deux meubles. Les valeurs omises du spot (repos, confort, immunité) nécessiteraient résolution des StatDefs si ces meubles sont livrés ; ne pas inventer un bonus d'hôpital. Dans le catalogue local adulte : lièvre.2, gazelle.7, cerf1.2, dromadaire2.1, mufalo2.4 ; boîte.55 admet seulement le lièvre adulte des cinq, mais `animalBodySize`/âge reste le contrôle correct pour les jeunes. Aucun meuble au-delà du spot n'est proposé dans le premier lot ; si ajouté ensuite, les durées locales seraient adaptées à l'échelle10 déjà employée, pas présentées comme ticks Core identiques.

## Soins actuels et écarts Elsewhere

[WorkGiver_Tend](../../tmp/functional-v310-reference/RimWorld.WorkGiver_Tend.cs) exige lit pour un patient humain ; pour un animal, **toute posture non debout convient**, y compris au sol. [WorkGiver_TendOther_Animal](../../tmp/functional-v310-reference/RimWorld.WorkGiver_TendOther_Animal.cs) scanne les animaux avec hediff et réemploie ces règles. Le billet2015 décrit les soins en lit, mais ne doit pas devenir un veto au soin au sol contredit par le code actuel. Conserver le soin vétérinaire V277 au sol est compatible avec cette règle actuelle ; V279 conserve sa chaîne de nourriture physique déjà déclarée.

Lectures locales du produit V309 au 11 octobre2026, avant ajout V310 :

- `src/sim/bed-kinds.ts` admet uniquement bed/hospital-bed. `rescue.ts`/`rescue-state.ts` cherchent dans `world.pawns` : aucune destination ni relation de portage animal. Les contrats humain/capture/arrest/libération ne doivent pas être étendus implicitement.
- `animal-care.ts` admet cinq espèces possédées couchées/à terre et les claims médecin/médecine réels ; `animal-feeding-rules.ts`/services V279 apportent une portion physique. `wildlife-health.ts` utilise posture ground/standing et bonus de repos du sommeil : aucune référence de lit animal. `wildlife.ts` conserve faim, santé et urgence pendant le repos.
- `animal-leading.ts` partage déjà l'exclusivité des tâches de conduite/production et V309 ; le nouveau portage devra participer au même domaine d'identité que soins, feeding et abattage, sans moyen de contourner les réservations.

## Proposition bornée : adopter, adapter, différer

**Adopter** le secours médical de l'animal possédé à terre, une destination animale valide, les revendications/occupations distinctes, le portage au contact et le dépôt effectif, l'exclusion de l'abattage, aucune compétence Animals/Violence minimum et aucune guérison au pickup. Ajouter un emplacement animal gratuit compatible avec les cinq espèces ; garder soins/alimentation au sol.

**Adapter** dans un schéma prospectif : `Pawn.animalRescue` dédié pointe l'ID vivant unique dans Wildlife, sans copie dans Pawn ni pile vivante ; l'animal porté garde sa santé/âge/faim, cesse son mouvement autonome, synchronise position et segment avec le porteur. Avant santé/mort et après déplacement, un même lien propriétaire assure une seule présence physique. Reprise strict fichier+Decoder doit refuser deux porteurs, lit doublement occupé, faux ID, trajectoire divergente ou cargo concurrent. La mort déposera une seule dépouille via le pipeline existant, à la position physique conservée ; saturation du sol/piles ne doit pas perdre le corps. Suppression de spot/interruption libère la réservation, termine le segment déjà engagé puis dépose sans téléportation. Migration neutre : aucun ancien animal déplacé, lit créé ou nouvelle tâche spontanée rétroactive.

**Adapter explicitement** le classement des lits et le modèle de danger au moteur local, et décider la règle NoCare en distinguant les chemins Core. Affectation avant pickup peut être conservée, mais ne doit pas être confondue avec occupation. Le mode médical du spot ajoute une destination partagée sans propriété permanente ; son omission serait également une adaptation déclarée, pas un hôpital animal complet.

**Différer** boîtes/lits rembourrés, confort/qualité/immunité hospitalière, chirurgie animale, Scaria, secours d'animaux sauvages/étrangers, animal sauveteur d'humains, caravanes et DLC. Aucun nouveau public isolé : futur contrôle sur copie privée des Aulnes avec vraie continuation, sources/checkpoints historiques conservés. SYS/TEST121–125 liés aux animaux ne deviennent pas clos par cette recherche ; secours/couchage requiert sa preuve propre. Aucun FPS ou résultat de gameplay natif n'est certifié ici.


## Adaptations figées pour le pilote V310

Le contrat local expose animal-sleeping-spot, la commande order-animal-rescue(pawnId,animalId) et animal-spot-medical(spotId,enabled). Le secours direct exige Médecin activé et suit les mêmes interruptions que le planner ; contrairement au menu Core forcé, il ne contourne pas Doctor0/draft. Un spot médical exige care autorisé et besoin clinique, mais l'alimentation V279 reste indépendante de la politique de médicaments. L'état downed demeure médicalement downed au dépôt ; animalRest.sleep décrit sa place occupée sans transformer son corps en dormeur mobile. Le repos sur la marque gratuite garde les valeurs de repos au sol, sans nouveau bonus hospitalier.

Le pilote prépare un mufalo vivant portant deux contusions non pansées et70% de perte de sang initiale, trois médicaments,75riz et un lièvre sain fatigué. Le sang préparé explique l'incapacité et n'est pas issu d'une campagne de tirs ; les contusions sans saignement permettent une dose réelle et une fenêtre physique stable. À règles actuelles, descendre de70% à60% prend environ1800ticks sans saignement ; ROOT doit vérifier que le parcours finit avant récupération et garde toutes les gardes strictes. Un seul parcours32×32 teste pose normal/médical, vrai secours, recharge au milieu d'edge, libération du patient sur Doctor0, dépôt, dose/portion/cargo et sommeil. Aucune validation exécutée ni réussite native n'est revendiquée par ces fichiers préparés.
