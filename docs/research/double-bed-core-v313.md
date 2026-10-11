# V313 — référence des lits doubles

Core installé de RimWorld **1.6.4871 rev590**, lu le 11 octobre 2026. Assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`, exact avant et après les treize extractions réussies. Classes, XML, provenance et contrat préparatoire conservés dans `tmp/double-bed-v313-reference`.

`Buildings_Furniture.xml` définit DoubleBed : 2×2, 85 unités de matériau, WorkToBuild1500, MaxHitPoints200, beauté2, confort0,75 et BedRestEffectiveness1. Les héritages donnent les matériaux bois/métal/pierre, la traversabilité PassThroughOnly, pathCost42, les chevets/commodes et la recherche ComplexFurniture. Le coût de travail local suit la conversion historique par dix et les facteurs de matériau.

`BedUtility` et `Building_Bed` donnent deux cellules de tête suivant la rotation et deux occupants physiques. Le rang du propriétaire dans AssignedPawnsForReading choisit la place Core. La commande locale garde un slot durable explicite : le départ du premier propriétaire ne renumérote pas le second. L’ancre locale est la tête0 ; la tête1 suit le côté du rectangle. Le même calcul fournit sommeil, secours et centre du corps rendu.

`CompAssignableToPawn_Bed` permet l’affectation manuelle de deux colons libres sans imposer une relation amoureuse. Les restrictions idéologiques de partage sont distinctes et hors de cette tranche. `RestUtility` et `Pawn_Ownership` privilégient le lit possédé et le partage automatique avec un partenaire. Localement, l’affectation manuelle est libre ; l’admission automatique d’une place dans un lit partiellement possédé exige une relation lover/spouse déjà réelle. Aucun lien ou tirage social n’est créé.

`JobGiver_GetRest`, `JobDriver_LayDown`, `Toils_Bed` et `Toils_LayDown` séparent trajet et posture installée, puis appliquent le repos à chaque personne. La nouvelle branche locale utilise qualité/matériau/confort ; la formule historique des lits simples reste conservée. Les calendriers de souvenirs locaux continuent sans ajouter une récompense pour dormir à deux. `RoomRoleWorker_Bedroom` compte les meubles et leurs propriétaires : deux personnes dans un double restent un seul meuble.

`CompAssignableToPawn` et `Building_Bed` conservent ou libèrent les propriétaires lors de la désinstallation, de la réinstallation, du changement de rôle et de la destruction. Le format local conserve bedId/slot pendant l’emballage physique ; départ hors carte, mort et destruction nettoient la place concernée. Une nouvelle affectation réelle doit rester prioritaire sur une ancienne archive.

Le Core autorise des lits doubles médicaux ou de prison. **V313 livre seulement un double civil** et refuse explicitement ces rôles, y compris dans les fichiers et le Decoder. Secours, repos non opératoire, pansements et alimentation peuvent utiliser sa place physique. Les opérations rejoignent les lits simples ou hospitaliers déjà pris en charge ; un patient déjà à terre dans le double n’est pas déplacé automatiquement pour une opération. RoyalBed, BedrollDouble, couchage double au sol, idéologie et nouvelle interaction amoureuse restent hors tranche.

Le contrat livré, les contrôles et les limites sont rassemblés dans [la note V313](../gameplay/double-beds-v313.md).
