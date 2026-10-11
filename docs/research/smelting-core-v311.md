# V311 — fonderie et fusion des armes : référence Core

Recherche du 11 octobre 2026, après V310 commité/poussé en `4092589e`. Les sources primaires fixent le contrat de la [fusion locale](../gameplay/smelting-v311.md). Elles ne constituent pas une validation du produit Elsewhere.

## Provenance

Installation primaire `E:/Steam/steamapps/common/RimWorld`, version **1.6.4871 rev590** ; assembly `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA-256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Six classes fraîchement extraites par ILSpyCmd8.2.0.7535 : `Verse.Thing`, `GenRecipe`, `RecipeDef`, `RecipeWorkerCounter`, `ThingFilter` et `GenMath`. La [provenance privée](../../tmp/functional-v311-reference/provenance.json) conserve commandes, empreintes des classes et des dix XML relus, ainsi que la tentative échouée `RimWorld.RecipeWorkerCounter`, corrigée en namespace `Verse`.

Les XML Core courants ont été lus directement dans `Data/Core/Defs`, sans les modifier. Les faits ci-dessous ne proviennent ni d’un miroir web ni d’un ancien tableau de couverture. Les règles de trajet et d’interruption Unity ne sont pas déduites de ces six classes : Elsewhere réemploie son propre circuit de production déjà physique. Aucun DLC, mod, campagne naturelle ou performance n’est certifié par cette recherche.

## Machine, énergie et chaleur

`ThingDefs_Buildings/Buildings_Production.xml`, définition **ElectricSmelter**, lignes1061–1142 : emprise3×1,170Steel et2ComponentIndustrial, Construction4, WorkToBuild3500, MaxHitPoints180. Interaction à l’avant, terrainHeavy, PassThroughOnly et coût de passage50. L’appareil consomme700W, possède commutation, panne et court-circuit de pluie ; lueur rayon6, orange217/112/33. Il diffuse9unités de chaleur/s et0,32/tick de travail, appartient au rôleWorkshop et applique0,8 hors atelier. PrérequisElectricity.

La minification est héritée de **BenchBase**, ligne125, avec `minifiedDef=MinifiedThing` ; ElectricSmelter ne l’annule pas. Elle fait donc partie de la définition Core, sans adaptation locale à justifier. Core propose aussi fusion de scorie, vêtements et destruction : leur présence dans le XML ne livre pas ces recettes dans Elsewhere.

Transposition locale confirmée :350ticks de construction neutre,160ticks de recette neutre ; coût de passage5, traversable sans place de travail sur l’emprise. L’électricité reste un socle libre, faute de projetElectricity local. Heavy suit les contrôles locaux de terrain sec et d’obstacles ; aucun nouveau registre d’affordances n’est ajouté. Chaleur active permanente1,5/tick et chaleur de geste3,2×fraction/tick, réparties dans la région thermique selon le modèle commun. L’appareil éteint n’offre pas de mode manuel ralenti.

## Recette et travail

`RecipeDefs/Recipes_Production.xml`, **SmeltWeapon**, ligne79 : une arme, WorkAmount1600, vitesseSmeltingSpeed, produit spécialSmelted ; aucun workSkill ni minimum de compétence. `WorkGiverDefs/WorkGivers.xml`, **DoBillsSmelter**, ligne1176 : métierCrafting, priorité interne80, Manipulation requise. Cette priorité interne ne remplace pas la priorité choisie par le joueur.

`Stats/Stats_Pawns_WorkRecipes.xml`, **SmeltingSpeed**, ligne7 : base1, minimum0,1, facteurWorkSpeedGlobal, poidsSight0,3 plafonné à1 et Manipulation1. Elsewhere garde WorkSpeedGlobal neutre et calcule `max(.1, manipulation×(.7+.3×min(1,sight)))`, puis les facteurs communs d’environnement. Manipulation nulle demeure une incapacité à travailler. Aucune XP ou qualité de sortie n’est ajoutée. Artisanat doit être activé, y compris pour l’ordre direct selon le contrat local existant ; cette restriction du menu local n’est pas revendiquée comme une règle universelle des ordres forcés Core.

## Filtrage et rendement

[ThingFilter.Allows](../../tmp/functional-v311-reference/Verse.ThingFilter.cs) arrondit les PV relatifs au centième via [GenMath.RoundedHundredth](../../tmp/functional-v311-reference/Verse.GenMath.cs), puis vérifie les bornes inclusives après clamp. Le helper appelle Mathf.Round ; le contrat local reprend l’arrondi au pair des demi-entiers :35/280=12,5% devient12%, pas13%. Qualité et état servent à choisir l’arme admise ; ils ne modifient pas son rendement.

[Thing.Smeltable et SmeltProducts](../../tmp/functional-v311-reference/Verse.Thing.cs) contrôlent le caractère fusible de la définition et de sa matière, puis parcourent les coûts ajustés. Les coûts fusibles non intricate rendent25% par arrondi stochastique ; les composants intricate sont perdus. Le paramètre efficiency n’est pas utilisé par cette méthode. [GenRecipe](../../tmp/functional-v311-reference/Verse.GenRecipe.cs) appelle ce chemin pourSmelted. Les bases et définitions des armes, Steel/Plasteel et composants ont été relues dans les XML répertoriés dans la provenance.

| Arme locale | Métal Core résolu | Résultat de la fusion |
| --- | --- | --- |
| Revolver |30acier |7–8acier |
| Fusil à verrou |60acier |15acier |
| LanceurEMP |75acier |18–19acier |
| Couteau en plastacier |30plastacier |7–8plastacier |

Un seul métal admissible par arme actuelle signifie un seul appel d’arrondi. `GenMath.RoundRandom` litRand.Value même pour un rendement entier : le fusil consomme aussi un tirage. Le helper local projette le PRNG avant la transaction et ne l’engage qu’avec la consommation et la création du produit ; aucun aperçu ou refus ne doit tirer le hasard.

[RecipeWorkerCounter.CanCountProducts](../../tmp/functional-v311-reference/Verse.RecipeWorkerCounter.cs) refuse le comptage des specialProducts. Les factures de fusion acceptent donc nombre/forever, sans mode « jusqu’àX » ; les autres recettes conservent ce mode lorsqu’il est comptable.

## Adoption et limites locales

Adoption : une fonderie alimentée, filtres de types/PV/qualité, collecte d’une arme entière, staging et travail réels, récupération du métal puis rangement/réemploi. Les quatre types sont initialement **false**, défaut protecteur local nécessitant un choix explicite. Aucune désignation individuelle ou nouveau champWeaponState n’est ajouté.

Armes source/held/placed gardent ID et condition ; seules les armes au sol peuvent être choisies initialement. Interdiction, plage devenue incompatible, incapacité, coupure, facture ou poste retiré interrompent le circuit commun avec conservation de l’objet/cargo et de l’arête engagée. La progression peut être perdue avant consommation : aucun inachevé de fusion n’est inventé. La sortie métallique ne porte aucun dossier d’arme et ne prétend pas prouver une provenance historique absente.

Différés : armures et sorties multiples, textiles, scories, destruction sans récupération, reliques/DLC et catalogue complet Core. Le casque pare-balles fournirait deux métaux ; l’ajouter au cargo unique en abandonnant l’un d’eux serait incompatible avec le contrat. Les contrôles produit et le parcours intégré des Aulnes seront consignés uniquement dans la [note gameplay](../gameplay/smelting-v311.md), après leur exécution ROOT.
