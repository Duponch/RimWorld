# V278 — arrêter un colon et lui rendre sa liberté

Schéma213. Boucle locale : un colon adulte en crise admissible peut faire l’objet d’une tentative d’arrestation par un autre colon libre démobilisé, puis être porté en prison, recevoir nourriture et soins, et être libéré hors cellule sur la même carte. La personne, sa faction et sa provenance de recrutement sont conservées.

## Décision et parcours

Dans le menu contextuel d’un colon sélectionné, **Arrêter** indique la chance actuelle et le refus éventuel. Ordre direct uniquement : pas de file. Un lit de prison libre dans une pièce fermée et des accès réels sont nécessaires ; commander l’arrestation ne garantit pas son succès.

La chance est recontrôlée au contact, avec Social et Manipulation du gardien. Pour l’adulte de référence, `clamp((.6+.075×Social)×(.1+.9×clamp(Manipulation/.95,0,1)),.6,1)` ; cible à terre ou Violent interdit : acceptation automatique si son admission est par ailleurs autorisée. Une crise agressive hostile ne peut pas être arrêtée ainsi : Berserk est exclu. Un refus peut déclencher une fureur violente, sans détention fictive.

L’acceptation entraîne prise en charge puis portage réel. Le statut de détenu commence à la prise en charge ; la crise est réinitialisée sans catharsis gratuite. Les commandes libres restent indisponibles pendant la détention. Les possessions et cargaisons sont conservées par les transactions existantes, y compris si le sol manque de place ; besoins et blessures ne sont pas effacés.

L’inspection prison garde deux décisions pour un colon : **Soins et nourriture** ou **Libérer**. Aucun recrutement n’est nécessaire. Un geôlier disponible porte le colon hors de la cellule ; au dépôt, la même personne retrouve sa liberté sur la carte. Une personne à terre attend son relèvement et continue d’avoir besoin de soins. Les prisonniers étrangers conservent leur libération vers la sortie et leur recrutement historiques.

## Primaires et limites

Core1.6.4871rev590 : `Data/Core/Defs/Stats/Stats_Pawns_Social.xml:47–83`, ArrestSuccessChance base1/min.6/max1, Social et Manipulation ; `tmp/social-reference/StatWorker.cs` et `PawnCapacityFactor.cs`. Admission : `tmp/mini-turret-reference-next/Verse.AI.GenAI.decompiled.cs:73–102`. Contact/portage : `tmp/combat-reference/RimWorld_JobDriver_TakeToBed.cs`, job Arrest dans `tmp/drafting-reference/Jobs_Work.xml:76`. Libération même faction hors cellule, sans bord imposé : `tmp/drafting-reference/RimWorld_RCellFinder.cs:556–590`, puis `Verse.AI.JobDriver_ReleasePrisoner` et `RimWorld.GenGuest` de la DLL locale. SHA256 DLL `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Relevé privé : `tmp/arrest-v278-reference/scope.md`.

Adaptations explicites : acteur démobilisé comme la capture directe existante, adultes et crises déjà livrés seulement, horloge10Core/tick et accès déterministes locaux. Détention coloniale bornée à la carte jusqu’à libération : **évasion/révolte de ces colons non livrées**, contrairement au Core ; une sortie future demanderait une archive de personne complète. Les étrangers conservent leurs évasions/révoltes. Culpabilité, diplomatie, arrestation de visiteurs, GiveUpExit et mémoire Core `WasImprisoned` ne sont pas ajoutés. Aucune conversion en outlaw pour contourner les droits de contrôle.

## Validation

151 cas dans 22 fichiers passent par reprise ciblée, dont 34 nouveaux : admission et chance, refus/fureur, propriétaires des possessions, interruption, commandes du détenu, libération locale, prisonniers étrangers, lecteurs fichiers/Decoder et 62 sauvegardes publiques. Le groupe initial passe 150/151 en70,130s ; la reprise des dix cas du noyau passe en5,836s après correction de l’attendu de Manipulation (.44 après épaule arrachée et douleur, plutôt que .5). Le rouge de typage initial6,980s concerne deux fixtures ; le build final avec typage passe en7,642s. Journaux privés `tmp/validation-runs/v278-*` conservés.

Chromium matériel WebGPU1440×1000 passe en23,709s : ordre depuis le menu contextuel, arme réellement déposée, arrestation et portage puis libération. Sauvegardes/rechargements exacts aux ticks3036 (portage arrestation),3127 (détenu),3222 (portage libération) et3271 (libre). Le même ID retrouve le contrôle de mobilisation ; aucune archive de départ créée, erreurs vides. Rapport et captures privés `tmp/arrest-v278-native-emfe64/`, navigateur et port5311 possédés fermés. Les 62payloads/65fichiers publics restent inchangés. Scène préparée puis réellement jouée ; aucune fréquence naturelle, campagne longue ou mesure FPS déduite.
