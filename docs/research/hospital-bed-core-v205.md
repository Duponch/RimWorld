# Lit d’hôpital V205 — recherche Core

Relevés du **4 octobre 2026** pour le lot borné **lit d’hôpital en acier**, schéma prévu **187** après validation stricte de 186. Cette recherche établit les règles de référence et les adaptations retenues ; elle n’est pas une preuve de livraison, de campagne naturelle ou de performance. Moniteur vital, dalles stériles, nouvelles maladies et fabrication médicale restent hors périmètre.

## Provenance et méthode

Installation consultée en lecture seule : `E:/Steam/steamapps/common/RimWorld`, `Version.txt` = **1.6.4871 rev590**. SHA-256 d’`RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, recalculé ce jour : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Inspection ciblée par ILSpyCmd **8.2.0.7535**, outil déjà présent sous `tmp/reference-tools/ilspycmd-8.2/ilspycmd.dll`. Les reconstructions de travail restent sous `tmp/v205/core`, sans publier de source propriétaire ni modifier l’installation. Aucun test produit, benchmark ou parcours navigateur exécuté pour cette recherche.

Defs lus sous `Data/Core/Defs/` :

| Fichier | SHA-256 recalculé |
|---|---|
| `ThingDefs_Buildings/Buildings_Furniture.xml` | `cea362ca9451f0762f8a104b2344bd540b5f6e8663dd9a4e75f3c39b46607c55` |
| `Stats/Stats_Building_Special.xml` | `e57298ad955777e288239b2e7804def1b1f0d3cf7290bba5b723fff684c7d1ce` |
| `Stats/Stats_Basics_General.xml` | `c4d702421c19796993483ddd43f9869c54bb7afa1414232a568829ced5218d87` |
| `Stats/Stats_Pawns_General.xml` | `ec1df1afb1f24c3d812b3224f803354b613a226e3934ea1e235c9b195181f507` |
| `ResearchProjectDefs/ResearchProjects_3_Microelectronics.xml` | `db6bb20fa684b6fcae2b572fee5edb7cee08b3ac20cf20283ee84dbf10fd90ec` |
| `ResearchProjectDefs/ResearchProjects_2_Electricity.xml` | `4775a1ebf4c263fb4515f53c22db05ce0388299c28340cee5d66c10891c6a44e` |

Compléments consultés : `ThingDefs_Items/Items_Resource_Stuff.xml` pour l’acier et `ThingDefs_Buildings/Buildings_Misc.xml` pour distinguer le moniteur vital du lit. Classes examinées dans l’assembly local : `RimWorld.Building_Bed`, `RimWorld.BuildingProperties`, `RimWorld.RestUtility`, `RimWorld.TendUtility`, `RimWorld.StatPart_BedStat`, `RimWorld.StatPart_Resting`, `RimWorld.StatPart_Quality`, `RimWorld.StatWorker_SurgerySuccessChanceFactor`, `Verse.ResearchProjectDef`, `Verse.Pawn_HealthTracker`, `Verse.Hediff_Injury`, `Verse.HediffSet` et `Verse.ImmunityRecord`. Les points de consommation précis sont détaillés ci-dessous ; les XML seuls ne prouvent pas quand un bonus s’applique.

La recherche Internet précise a recoupé la [publication officielle de la version 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/), datée du 11 juin 2025, et le [correctif officiel 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/), daté du 8 juin 2026. La première signale une contribution médicale réduite au classement d’une pièce comme hôpital ; ce rôle de pièce ne devient pas un multiplicateur clinique supplémentaire. La seconde ne documente pas de changement du lit dans son changelog. Ces publications sont antérieures au **1.6.4871 local** et ne certifient donc pas ses coefficients ; les chiffres retenus proviennent des Defs et de l’IL attestés. Aucun nombre n’est fondé seulement sur un wiki ou un ancien miroir.

## Corpus et contrats existants

Corpus principal conservé : [chapitre 15, « Médecine et chirurgie »](../reference/originals/Documentation_developpement.html), **SYS/TEST-089..096**, avec **SYS/TEST-095** pour chirurgie ; chapitres 8/9 pour jobs, ressources, accès et réservations, chapitre 10 **SYS/TEST-056/058/059** pour chantier, retrait et réinstallation, chapitre 13 **SYS/TEST-085** pour compétences, chapitre 14 **SYS/TEST-079** pour repos, **076..078** pour faim et ingestion. Les lignes originales du [classeur](../reference/originals/Referentiel_developpement.xlsx) ont été relues : **UI-017** concerne soins/secours au clic droit, **UI-018** la capture avec statut/lit/accès, **UI-019/020** les plans et rotations, **UI-024** le stockage physique. **UI-021** concerne récolte/coupe et n’est donc pas attribué à la recherche dans ce lot. Ces identifiants orientent les assertions et ne sont pas clos globalement par V205. L’[adoption du corpus](reference-adoption.md) distingue ses propositions d’une règle Core vérifiée et d’une validation locale.

Le chapitre médical exige une chaîne patient/affection/médecin/accès/médicament autorisé/matériel/lit/conditions/compétence et des réservations réelles. Il distingue transport, traitement, repos et chirurgie. Un lit construit ne réalise aucune de ces opérations à distance. Les originaux sont inchangés.

Contrats relus : [secours et lits médicaux](../development/rescue.md), [santé](../development/health.md), [lésions](../development/injuries.md), [traitements](../development/tending.md), [infections](../development/infections.md), [habitat et qualité](../development/habitat-comfort.md), [matières de construction](../development/construction-materials.md), [chirurgie V192](../development/surgery-v192.md), recherches et preuves associées. Obligations V45–V51 recherchées dans l’[archive des instructions](../history/agent-instructions-through-v144.txt), sans modification. Conserver la coupure d’intervalle médical au changement réel de posture/service, famine bloquant les deux guérisons, PRNG sauvegardé, apprentissage seulement depuis les actes, qualité fixée à finition et identité conservée au paquet.

## Définition, coût et recherche

`HospitalBed` hérite de `BedWithQualityBase`, puis `BedBase` et `FurnitureBase`. Il reçoit `Building_Bed`, une qualité, l’affectation de couchage et la minification. Il **n’hérite pas** de `ArtableBedBase` : ne pas lui inventer une œuvre d’art à qualité élevée.

| Propriété | Core local, base normale sans installation liée |
|---|---|
| Emprise et couchage | **1×2**, une place humaine ; rotations ordinaires |
| Matière | **40** unités de catégorie `Metallic`, en plus du coût fixe |
| Coût fixe | **80 acier + 5 composants industriels** |
| Variante acier retenue | **120 acier + 5 composants**, total des deux contributions acier |
| Travail de construction | **2 800 unités Core**, soit **280 ticks locaux** uniquement à vitesse neutre |
| Construction minimale | **8** |
| PV | **150** ; acier ×1, qualité sans facteur de PV dans cette statistique |
| Masse | **35 kg** |
| Repos | **1,00** avant facteur de qualité |
| Confort | **0,80** avant installations et qualité |
| Bonus naturel de guérison propre au lit | **10 PV/jour** dans `bed_healPerDay`, ajouté à la guérison de base/posture |
| Immunité | **×1,11** |
| Qualité de soin | **+0,10** additif |
| Réussite chirurgicale | **×1,10** avant autres facteurs |
| Usage médical initial | `bed_defaultMedical=true` |
| Transit | `PassThroughOnly`, `pathCost=42`, remplissage 0,4 |
| Énergie | Aucun composant électrique sur le lit |

La base de flammabilité vaut 1 ; la matière acier la multiplie par 0,4. Ne pas confondre ce produit avec un lit non combustible. Les autres métaux Core ont leurs facteurs distincts ; la restriction V205 à l’acier est une réduction de catalogue explicite. Bois, pierre ou textile ne constituent pas des variantes Core de ce lit.

Projet `HospitalBed` : **1 200 points**, niveau Industrial, prérequis visible **MicroelectronicsBasics**, prérequis cachés **SterileMaterials et ComplexFurniture**, bâtiment requis **HiTechResearchBench**. `Verse.ResearchProjectDef.PrerequisitesCompleted` vérifie **aussi** chaque `hiddenPrerequisites.IsFinished` : « caché » ne signifie pas décoratif. `CanStartNow` vérifie en outre la présence d’un banc approprié. `SterileMaterials` coûte **600 points**, exige **Electricity** et débloque réellement les dalles stériles.

**Adaptation V205 retenue :** conserver les **1 200 points**, **Microélectronique**, **Mobilier complexe** et le **banc haute technologie** existants ; omettre explicitement le verrou Matériaux stériles, car ni ce projet ni son contenu ne sont livrés. Aucun projet vide, sol stérile fictif ou recherche rétroactive. Le réexamen doit accompagner la livraison cohérente du projet de 600 points et de ses véritables dalles. Cette omission diverge du graphe Core attesté ; elle n’est pas présentée comme une équivalence stricte.

## Qualité, confort et consommation des bonus

Les facteurs suivants viennent des `StatPart_Quality` des StatDefs, appliqués à la statistique réelle du lit :

| Statistique | Déplorable | Médiocre | Normal | Bon | Excellent | Chef-d’œuvre | Légendaire |
|---|---:|---:|---:|---:|---:|---:|---:|
| Confort | 0,76 | 0,88 | 1 | 1,12 | 1,24 | 1,45 | 1,70 |
| Repos | 0,86 | 0,92 | 1 | 1,08 | 1,14 | 1,25 | 1,60 |
| Réussite chirurgicale | 0,90 | 0,95 | 1 | 1,05 | 1,10 | 1,15 | 1,30 |

**Qualité de soin +0,10**, **immunité ×1,11** et **bed_healPerDay=10** ne varient pas avec la qualité. Le bonus chirurgical est donc, par exemple, 1,10×1,05 pour un lit bon, avant lumière/propreté/extérieur. Le confort utilise table de chevet et commode déjà représentées : leurs offsets s’ajoutent avant la qualité du lit ; la qualité de ces installations ne multiplie pas leur offset. Un hôpital normal avec ces deux installations donne une base de confort de 0,90. Leur présence ne modifie ni repos, ni guérison naturelle, ni immunité.

`TendUtility.CalculateBaseTendQuality` lit **`patient.CurrentBed()`** : médecin × puissance du médicament, puis offset du lit, puis **×0,7 en auto-soin**, puis clamp au plafond du médicament. Ainsi +0,10 n’est pas dix pour cent multiplicatifs ; le plafond peut en absorber tout ou partie. Ni un lit proche, ni une réservation, ni un patient porté n’accordent le bonus. La variation additive et l’XP de tending existantes gardent leur ordre propre ; pas de nouvelle XP pour le meuble.

`StatPart_BedStat.BedMultiplier` lit le lit seulement si **`pawn.InBed()`**, avec un chemin caravanier séparé hors périmètre. `ImmunityRecord.ImmunityChangePerTick` applique `ImmunityGainSpeed` au gain de maladie, pas à une guérison instantanée. Filtration, faim et repos restent des facteurs distincts. `StatPart_Resting` applique séparément **×1,1** au repos admissible ; pour un adulte neutre réellement au lit, 1,11×1,1 vaut **1,221**, contre 1,07×1,1 = **1,177** dans le lit ordinaire. Ce n’est pas un remplacement des autres facteurs et ce n’est pas un bonus acquis pendant la marche.

La chirurgie V192 consomme déjà le lit réel, sa qualité, lumière à l’ancre, extérieur et propreté de pièce au résultat, puis borne sa probabilité finale à **0..0,98**. Ajouter la base ×1,10 une fois à ce chemin ; ne pas multiplier une deuxième fois par la qualité ou la propreté. Un meilleur lit ne donne pas une garantie de réussite et n’anesthésie pas le patient. La dose, le travail, l’XP et les suites postopératoires restent leurs transitions physiques.

## Guérison, sommeil et apprentissage

`Pawn_HealthTracker.HealthTickInterval` utilise une frontière hash **600 ticks Core** pour la guérison des êtres de chair, seulement hors famine. La guérison naturelle part de **8 PV/jour**, ajoute **4** si la posture n’est pas debout, puis **`CurrentBed().def.building.bed_healPerDay`** si un lit est réellement utilisé. Les stades médicaux, `HealthScale` et `InjuryHealingFactor` s’appliquent ensuite. Une blessure naturellement guérissable est sélectionnée ; le résultat n’est pas distribué à toutes les plaies.

Pour un adulte neutre : **8 debout**, **12 allongé au sol**, **16 dans un lit ordinaire**, **22 dans le lit d’hôpital**. L’amélioration hospitalière naturelle est **+6 PV/jour**, ou **×1,375** contre le lit ordinaire, et non ×2,5 sur toute la guérison. À une frontière de 600 Core, l’écart est **0,06 PV**, soit **60 milli-PV locaux**. Une seconde sélection indépendante d’une blessure soignée reçoit **8×(0,5+clamp01(qualité)) PV/jour**. Le lit ne multiplie pas à nouveau cette contribution ; il peut l’améliorer indirectement via la qualité du soin réellement exécuté.

La qualité du lit et le sommeil n’amplifient pas `bed_healPerDay`. Sommeil et posture restent distincts : le besoin de repos ne gagne que durant le sommeil effectif, tandis que la guérison profite de la posture admissible éveillée. Infections et immunité conservent leurs propres cadences et cibles, sans confusion avec PV anatomiques. Cicatrices permanentes, racines absentes et décès ne sont pas réparés par le lit.

La guérison passive n’appelle aucun apprentissage de Médecine. Construction, tending et chirurgie gardent leur apprentissage respectif ; une récupération plus rapide peut réduire les occasions de soin, sans dose ou XP compensatoire inventée. Le déclin de compétence déjà représenté continue selon son contrat, sans nouvelle règle propre à l’hospitalisation.

## Patients, prisonniers et réservations

`Building_Bed.SpawnSetup` applique le médical par défaut **une fois** (`alreadySetDefaultMed`), et pas à chaque rechargement. `BuildingProperties.bed_canBeMedical=true` par défaut, `Building_Bed.GetGizmos` propose le changement et son setter `Medical` retire les propriétaires permanents. Le lit d’hôpital peut donc devenir un lit ordinaire par commande : sa définition et ses statistiques demeurent hospitalières. Conserver le rôle explicitement enregistré lors de désinstallation/réinstallation ; ne pas réimposer le défaut à un meuble existant.

Les rôles **médical** et **prisonnier** sont indépendants. `RestUtility.CanUseBedNow` exige concordance du rôle prisonnier, vraie cellule de prison, place disponible, bâtiment présent et non brûlant, usage médical admissible, restrictions sociales et permissions applicables. `IsValidBedFor` vérifie accès du voyageur et réservation selon le nombre réel de places, avec une réservation de transport concurrent explicitement contrôlée. Le même patient/lit/chevet ne peut pas fournir deux services simultanés.

`RestUtility.Reset` classe les **définitions** de lits médicaux par taille corporelle admissible, offset de tending décroissant puis efficacité de repos décroissante. `FindBedFor` conserve d’abord le lit médical déjà occupé s’il reste valide ; sinon, pour un besoin médical, cherche les lits médicaux par ces types, avec danger et accessibilité. HospitalBed passe donc avant Bed dans le profil adulte commun. Il ne choisit pas globalement le meilleur exemplaire par qualité individuelle : le plus proche accessible du type est recherché. En absence de lit médical admissible, le repli passe par le lit possédé, partenaire Core puis lits ordinaires accessibles. `FindPatientBedFor` est un chemin distinct : conserve le médical courant, cherche un médical accessible, puis revient à `FindBedFor`.

**Adaptation spatiale maintenue :** accès/navigation déterministes et contact à l’ancre/chevet cardinal de Lisière, contrairement aux contacts Core OnCell/ClosestTouch ; absence de partenaire et lits multiples, danger et classement déjà bornés. V205 doit reconnaître la nouvelle définition dans secours, repos patient, sommeil ordinaire lorsque rôle désactivé, capture/prison, soins, alimentation et chirurgie sans nouvelle téléportation. Préférer l’hôpital accessible lors d’une nouvelle décision, conserver le service médical valide déjà engagé et le repli ordinaire. Construire un meilleur lit ne provoque pas de transfert spontané d’un patient installé.

## Périmètre adopté et réexamens

**Adopter :** vrai chantier acier/composants, Construction 8, qualité et PV conservés, retrait/paquet/réinstallation, rôle médical initial, patients et prisonniers, contacts et réservations communs, repos/confort, bonus de tending, immunité, guérison naturelle et chirurgie chacun à son point de consommation.

**Adapter :** acier seul, temps Core×10, nombres médicaux entiers existants, contacts/navigation 3D et graphe de recherche sans Matériaux stériles. **Différer :** moniteur vital, autres métaux, art du mobilier, dalles stériles/projet associé, catalogue de maladies, fabrication médicale et hôpital exhaustif. Le moniteur Core possède sa propre consommation de **80 W** et ses offsets +0,07 soin/+0,02 immunité/+0,05 chirurgie : aucun de ces effets n’est accordé au lit seul ni simulé par un bouton grisé.

**Vérifier dans la preuve de livraison :** conservation des 120 acier/5 composants et du PRNG de finition ; accès/repli/réservations ; capture du vrai lit pendant les intervalles médicaux ; soins/plafonds et chirurgie sans double facteur ; rôle explicite conservé au paquet ; impossibilité d’introduire définition/projet futurs dans 186 ; migration strictement neutre sans ouvrage, recherche, dose, maladie, XP ou histoire rétroactifs. Aucun gain général CPU/GPU, autonomie naturelle ou parité hospitalière exhaustive ne découle de cette lecture.
