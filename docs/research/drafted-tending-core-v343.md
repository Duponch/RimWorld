# V343 — soins mobilisés : référence Core et tranche locale

13 octobre 2026. Cette recherche distingue un ordre clinique explicite du travail médical automatique. Elle fonde le périmètre V343 ; les résultats de ses contrôles appartiennent à leur note de validation. Aucune guérison ou parité exhaustive n’est déduite d’une lecture de code.

## Provenance primaire

Installation `E:/Steam/steamapps/common/RimWorld`, **1.6.4871 rev590**. Assembly `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Deux classes ont été extraites avec ILSpyCmd8.2.0.7535 déjà installé, sans installer ni actualiser l’outil. La [provenance privée](../../tmp/early-access-v342/field-tending-reference/provenance.json) conserve les chemins, commandes et empreintes ; les sources décompilées restent dans ce dossier privé ignoré.

| Extraction conservée | SHA256 |
| --- | --- |
| `RimWorld.FloatMenuOptionProvider_DraftedTend.cs` | `a8d42947e8be715a6051063a80c0ba6fff7d8e666209591a85ff806bcaac8e0d` |
| `RimWorld.JobDriver_TendPatient.cs` | `8087ad55c4b704eba25c1169f8b7e79640509a1ae1c9802c086bdee746ea3588` |

Ces empreintes désignent les sorties conservées, qui incluent l’avis final de mise à jour du CLI ; cet avis ne fait pas partie du code Core. Le détail d’analyse reste dans `tmp/early-access-v342/field-tending-reference/findings.md`.

[Ludeon, annonce1.3 du 4 juillet 2021](https://ludeon.com/blog/2021/07/announcing-update-1-3-and-the-ideology-expansion/) présente les médicaments portés en inventaire et utilisés sur le champ de bataille. Cette publication soutient l’existence générale du système ; les admissions et cadences ci-dessous proviennent du build1.6 installé.

## Contrats établis dans Core1.6

Le provider réserve cette entrée aux personnes mobilisées, avec sélection unique et manipulation requise. Il distingue l’incapacité au métier Doctor d’une priorité numérique désactivée. Le patient doit avoir une lésion soignable et être accessible en `ClosestTouch`, avec danger maximal `Deadly`. Les auto-soins gardent leur permission spécifique ; une crise agressive est refusée sauf branche Scaria.

Dans `IsValidTendTarget`, un patient downed est admis avant le contrôle d’hostilité. D’autres patients non hostiles sont acceptés selon statut et faction. Aucun lit n’est exigé par cette voie. Cela ne retire pas le garde du fournisseur automatique : le `WorkGiver_Tend` primaire déjà conservé sous `tmp/allowed-areas-v312-reference/RimWorld.WorkGiver_Tend.cs` exige toujours `InBed()` pour soigner un autre humain.

Le premier médicament est choisi dans l’inventaire réel du soignant, via `FindBestMedicine(..., onlyUseInventory:true)`. Sinon le choix devient sec ; lorsqu’un médicament existe, une alternative sans médicament reste proposée. L’ordre crée `TendPatient`, avec identité du patient et marqueur `draftedTend`. Le driver réserve patient et consommable. Une continuation commencée avec médicament peut ensuite rechercher d’autres doses par la sélection ordinaire : inventaire seul n’est pas une règle universelle de ravitaillement.

Le contact vaut `OnCell` pour soi, `InteractionCell` au lit et `ClosestTouch` hors lit. Le travail tactique sur autrui conserve sa posture avec `WaitWith`, sans imposer le sommeil ; une perte de portée immédiate interrompt le service. La durée dépend de `600 / MedicalTendSpeed`, puis la résolution commune finalise le traitement. `usesMedicine` et le mode de contact sont sauvegardés ; `Verse.AI.Job` conserve aussi `draftedTend`.

## Adoption et limites V343

La tranche locale retient une commande distincte, **sans médicament**, sur un autre humain du World pris en charge par `isCarePatient`, downed ou déjà couché dans un couchage réel. Le médecin reste mobilisé et capable de Doctor ; le refus de violence ne refuse pas les soins, et priorité Doctor0 ne bloque pas cet ordre explicite. Approche, place cardinale accessible, réservation et travail restent physiques. Le contact cardinal est l’adaptation3D locale.

Les permissions médicales existantes, notamment **Aucun soin**, demeurent applicables. C’est une adaptation conservatrice : le provider Core et la continuation playerForced ne suivent pas exactement toutes les admissions du soin automatique. La posture du patient reste intacte. Durée, lot sec, qualité, XP, effets cliniques et PRNG réemploient la résolution existante ; soigner ne restaure pas immédiatement tous les PV.

Patient debout, auto-soin tactique, inventaires médicaux, ravitaillement tactique, ennemis downed non pris en charge, animaux, mécanos et branches DLC restent différés. La commande ne sécurise pas le lieu, ne remplace pas le secours vers un lit et ne garantit aucune survie sous menace active.