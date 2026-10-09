# V277 — soins vétérinaires des troupeaux

Schéma212, ouverture prospective aux cerfs, gazelles, mufalos et dromadaires déjà possédés. Le lièvre conserve ses soins historiques ; aucune nouvelle domestication, lit, chirurgie ou opération de secours animale n’est ajoutée.

Le médecin rejoint l’animal endormi ou à terre et physiquement arrêté. La politique médicale existante autorise ou interdit les soins et plafonne le type de médicament ; une dose disponible est réservée, collectée, portée puis consommée par le traitement commun. Les soins sans médicament restent possibles selon la politique et les disponibilités réelles. Aucune commande manuelle « soigner maintenant » n’est inventée.

Blessures, moignons frais et infections de plaie utilisent les vraies anatomies de chaque espèce, leurs PV, saignement, guérison et immunité. Le soin au sol ne donne aucun bonus de lit hospitalier ou de moniteur vital. Les maladies humaines grippe, paludisme et peste ne deviennent pas animales.

Le repos médical couvre aussi les plaies déjà pansées mais guérissables et les infections sans immunité acquise. Faim, danger et déplacement engagé restent prioritaires : un pansement ne garantit ni immobilisation durable ni guérison. Le médecin reprend par les tâches physiques existantes, sans double réservation du patient ou de la dose. Interruption et sauvegarde conservent les médicaments réellement portés.

L’inspection Santé présente politique, attente de posture/sécurité, soigneur actuel, collecte, approche, travail et récupération. **L’alimentation assistée d’un animal immobilisé reste absente** : ces soins ne préviennent pas à eux seuls la famine.

Primaires locales Core1.6.4871rev590 : `Data/Core/Defs/WorkGiverDefs/WorkGivers.xml` (`DoctorTendToAnimals`, Doctor, priorité50 ; alimentation distincte priorité40), décompilations privées `tmp/care-reference/RimWorld_WorkGiver_Tend.cs` et `RimWorld_JobDriver_TendPatient.cs` (patient animal non debout, contact, durée600Core/vitesse médicale), `tmp/backgrounds-reference-v210/RimWorld.HealthAIUtility.decompiled.cs` (repos après pansement). Étude : `tmp/veterinary-v277-reference/scope.md`. Horloge locale10Core/tick ; risque initial d’infection animale ×.1 historique conservé.

## Validation

125 cas uniques dans19fichiers passent par reprise ciblée, dont29nouveaux : cinq anatomies, vraie collecte/consommation, XP, planner/replay, infections/immunité, récupération/faim/cicatrices, danger/segment engagé, décès et cargaison sur sol saturé. Les gardes fichiers et Decoder couvrent migration211→212 neutre, espèces futures/sauvages, doubles claims patient/conduite et réservations partagées avec les deux chirurgies. Les62sauvegardes publiques restent chargeables ; les65fichiers publics sont inchangés.

Le groupe initial125cas garde son rouge sur une attente de fixture : l’infection distincte des plaies consomme une deuxième dose, conformément au pipeline commun. La reprise du seul fichier passe en4,966s. Le premier typage garde aussi son rouge sur l’assignation littérale211 d’un ancien test, corrigée par une assertion de type effacée ; typage et build finaux passent en7,006s. Journaux privés `tmp/validation-runs/v277-*` conservés.

Chromium matériel WebGPU1440×1000 joue une visite réelle en19,629s : politique demandée dans l’UI, médicament collecté et porté, marche jusqu’au mufalo, pansements puis récupération. Trois sauvegardes/rechargements sont exacts aux ticks3010(portage),3077(travail) et3130(après soin) ; une dose consommée, deux plaies encore présentes et pansées, erreurs vides. Captures et rapport privés : `tmp/veterinary-v277-native-BovCXQ/`, script `tmp/veterinary-v277-smoke.mts`. Navigateur et serveur5310 possédés sont fermés. Cette visite préparée ne constitue ni campagne naturelle, guérison complète, alimentation assistée ou mesure de FPS.
