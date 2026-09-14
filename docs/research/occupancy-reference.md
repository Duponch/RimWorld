# Objets, mobilier et zones — relecture V21

14 septembre 2026. Corpus chapitres 5 et 10, SYS/TEST-020..022/051/053/054/056, UI-001..005 : distinguer couche d’occupation, empreinte, propriété, stockage et dégagement physique. Les propositions du corpus ne prouvent pas les exceptions individuelles des meubles.

## Sources confrontées

Miroir communautaire épinglé `2d508035082e7cb0c8e29e230d26bda6e546928f` (20 mai 2026), lu de nouveau pour ce chantier :

- [GenConstruct.BlocksConstruction](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/GenConstruct.cs) : surface, passabilité et drapeau de dégagement forcé distinguent les objets gênants.
- [ThingDef.CanOverlapZones](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/ThingDef.cs), [Thing.SpawnSetup](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/Thing.cs), [ZoneManager](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/ZoneManager.cs) : les plans/cadres héritent de la compatibilité du bâtiment cible ; la création retire les cellules incompatibles des zones couvertes, pas leur matière. Le moteur original contrôle aussi la continuité des zones.
- [StoreUtility.NoStorageBlockersIn](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/RimWorld/StoreUtility.cs) : une zone autorisée ne garantit pas un dépôt admissible ; une construction cible non stationnable peut empêcher un apport. [GenPlace](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/GenPlace.cs) et [GenSpawn](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/GenSpawn.cs) distinguent aussi surface d’objets, surface de repas et retrait au placement.

Recoupements : [zones de stockage](https://rimworldwiki.com/wiki/Stockpile_zone), [étagères et ancienne utilisation des tabourets](https://rimworldwiki.com/wiki/Shelf), [table 1×2](https://rimworldwiki.com/wiki/Table_(1x2)), [lit](https://rimworldwiki.com/wiki/Bed), [feu](https://rimworldwiki.com/wiki/Campfire), [piquet](https://rimworldwiki.com/wiki/Horseshoes_pin), wiki communautaire consulté à nouveau. La table est explicitement franchissable, contrairement à notre collision au moment du lot V21 ; ce point est corrigé par V22.

Le miroir de [définitions historiques Core](https://github.com/RimWorld-zh/RimWorld-Core/tree/85954e64ea75334f51e33e27a4128809191e430e/Core/Defs/ThingDefs_Buildings), juillet 2018, précise les héritages : tabouret/piquet stationnables sans surface spéciale ; table franchissable avec surface Eat et zones interdites ; lit franchissable sans surface d’objets et zones interdites ; feu franchissable sans surface d’objets. Ces définitions sont **anciennes** : elles recoupent les règles, mais ne certifient pas les valeurs chargées par un exemplaire commercial 1.6. Le code de mai 2026 précède aussi le correctif officiel 1.6.4850 de juin. Aucun code commercial n’est copié.

Confiance élevée sur la distinction objets/zones et l’absence de destruction au placement d’un plan ; moyenne sur l’intégralité des héritages et exceptions du catalogue courant. La vérification d’un binaire Core installé reste absente. Les pages de mods trouvées ne servent pas de règles par défaut.

## Décisions et limites

**Adopter** les profils des six constructions présentes : murs/lits/feux dégagent les objets ; tables/tabourets/piquets peuvent conserver une pile compatible. Murs/lits/tables retirent les cellules de réserve ou de culture couvertes dès le plan ; tabourets/piquets autorisent une réserve utilisable. Le feu peut recouvrir une zone mais ne constitue pas une destination de rangement admissible. Le dessin d’une zone après le bâtiment applique la même compatibilité. Une pile existante reste réelle jusqu’au dégagement, et les réservations de transport sont réconciliées.

**Adapter en 3D** l’affichage : objets sur la surface de la table/tabouret, à côté du piquet, dimensions visuelles bornées. La même pile possède toujours une seule cellule et un seul ID. Les objets affichés sur une table ne deviennent ni une étagère ni une réserve supplémentaire.

**Livraison en deux tranches** : V21 corrige la coexistence et les zones ; [V22](furniture-travel-reference.md) ajoute passage, coûts, exclusions d’arrêt et hauteur GPU. Les anciennes valeurs du miroir XML ne sont pas reprises automatiquement. Cette séparation réduit la portée des migrations sans déclarer le catalogue complet.

**Différer** zones communes nommées/séparation automatique en composantes, réserves sous végétation, déplacement des personnes gênantes, construction sur autres bâtiments/ordres, étagères à plusieurs piles et catalogue étendu. Un refus conservateur de réservation de service reste documenté ; ne pas appliquer toutes les exceptions découvertes aux seuls meubles actuels.

[Contrat courant](../development/construction.md), [preuves](../development/validation.md), [plan unique](../ROADMAP.md).
