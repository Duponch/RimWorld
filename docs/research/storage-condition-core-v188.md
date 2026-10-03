# Qualité et points de vie dans les réserves — recherche V188

Lecture du 3 octobre 2026, Core d'abord. Le contrat précédent est celui des [filtres par objet V101](storage-filters-reference-v101.md) ; les chapitres 10/11 du [corpus](reference-adoption.md), SYS/TEST-051..061, distinguent admission, capacité, transport et propriétaire. Leurs statuts ne valent pas une preuve locale.

## Sources et certitude

L'installation locale **Core 1.6.4871 rev590**, lue sans modification, fournit `ThingFilter.Allows`, `GenMath.RoundedHundredth`, `FloatRange.IncludesEpsilon`, `GenThing.GetInnerIfMinified` et les capacités des objets. SHA-256 de `Assembly-CSharp.dll` : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les relevés ciblés sont conservés sous `tmp/` ; aucun asset Core n'est intégré au jeu.

Les lectures Internet primaires du [miroir de ThingFilter](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/ThingFilter.cs) et de [GenMath](https://github.com/Chillu1/RimWorldDecompiled/blob/master/Verse/GenMath.cs) recoupent la structure des prédicats. Ce miroir ne certifie pas la version de l'installation. La [documentation Unity de Mathf.Round](https://docs.unity3d.com/ScriptReference/Mathf.Round.html) confirme l'arrondi des moitiés vers l'entier pair ; l'IL local recoupe son appel à `Math.Round`. Ces lectures ne prouvent pas une parité générale des réserves.

## Décisions

| Règle vérifiée | Décision locale |
| --- | --- |
| Filtre d'objet, qualité et PV se cumulent. | **Adopter** l'intersection avec les catégories et la liste blanche V101. |
| L'objet minifié est remplacé par son contenu pour lire son état. | **Adopter** qualité et dégâts du bâtiment dans `World.packed`, sans nouvel ItemId de meuble. |
| Qualité testée seulement sur un objet possédant cette capacité. | **Adopter** les sept qualités des armes, vêtements et meubles concernés ; ignorer le critère pour les autres objets, sans qualité normale synthétique. |
| PV testés seulement lorsque la définition possède des PV. | **Adopter** les PV maximaux actuels, incluant le matériau du bâtiment ; absence de capacité distincte de 100 %. |
| Ratio float32, arrondi au centième, clamp, inclusion avec epsilon `1e-5`. | **Adopter** le résultat aux bornes de pourcentage entier : division et multiplication float32, moitiés vers l'entier pair, inclusion. La politique d'habillement garde son ratio brut propre. |
| Un filtre ne téléporte ni ne détruit les objets déjà déposés. | **Adopter** une priorité source zéro si cette instance est refusée, et revalider la destination au contact. |
| L'état d'un produit est fixé à sa fabrication. | **Adopter** une seule génération de qualité ; la proposition au seul ItemId reste un préfiltre, le produit réel décide ensuite. Refus de stockage conserve le dépôt physique de secours. |

**Adapter** l'interface à des plages activables par case/rectangle, qualité inclusive et PV entiers 0–100. L'absence de plage conserve le comportement historique. Les caches de navigation peuvent rester communs ; les caches d'admission doivent distinguer les états pertinents, vivre seulement pendant une décision et ne modifier aucun PRNG.

**Différer** étagères, filtres de fraîcheur/contamination, vêtement porté par un mort, stockage par type de meuble et zones nommées. La fusion d'une pile conserve les règles existantes d'identité/quantité/dégâts ; le filtre porte sur l'objet entrant. Le présent lot ne promet pas que l'état moyenné après fusion demeure admissible à tout instant, ni une parité exhaustive de `ThingFilter`.

La lecture locale de `ResourceCounter.UpdateResourceCounts` et de `SlotGroup.HeldThings` confirme que les plages d'admission d'une réserve ne filtrent pas son compteur : les objets physiquement posés restent comptés. `RecipeWorkerCounter.CountValidThing` consulte les plages de la facture, distinctes de celles du stockage. **Conserver** les compteurs historiques locaux sans leur ajouter les critères V188 ; les filtres de qualité/PV propres aux factures restent différés. L'ancienne distinction locale des repas selon catégorie/liste n'est pas recalibrée dans ce lot.

Le [contrat V188](../development/storage-condition-v188.md) sépare réalisation et preuve. Une scène préparée, un oracle de filtre et un microbanc ne prouveront ni une campagne naturelle, ni un gain général CPU/GPU.
