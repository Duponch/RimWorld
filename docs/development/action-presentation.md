# Orientation et gestes visibles — V112

[Référence Core 1.6.4871 et limites](../research/action-visual-reference-v112.md). Cette tranche concerne la **présentation** des décisions déjà prises par la simulation. Chemins, cases, cibles, durées de travail, équipement physique, dégâts et sauvegardes gardent leur autorité actuelle.

## Orientation

Les humains et animaux gardent la translation de leur arête confirmée. Leur modèle interpole seulement l'angle vers la nouvelle direction, par le chemin le plus court, en 0,24 seconde de temps de présentation confirmé. Un demi-tour reste volontairement rapide. Si la direction change encore pendant cette rotation, le nouveau départ utilise l'angle déjà atteint. En pause, l'angle cesse d'avancer ; une nouvelle carte repart de sa pose initiale. Corps, charge portée et repères partagent le même état d'orientation. Le Core 1.6.4871 emploie quatre directions sans ce lissage : c'est une adaptation de notre scène 3D.

## Travail et armes

Les travaux existants choisissent quatre silhouettes de bras dans le maillage humain résident : coup levé pour miner, frappe latérale pour abattre, geste court pour construire et mains au plan de travail pour fabriquer. Les poses utilisent le temps de scène et les tâches déjà connues ; elles n'ajoutent ni progression ni résultat métier. Les autres activités gardent leurs poses existantes. Les sons, poussières, copeaux et effets spécialisés du Core ne sont pas reproduits intégralement.

Ni la pioche ni la hache n'est un équipement requis ou montré par les travaux correspondants du Core. Lisière n'en crée donc pas pour cette tranche. Le fusil, revolver et couteau restent les objets physiques réellement équipés et les mêmes pièces que celles au sol : le fusil passe d'un port diagonal lisible à la visée, puis montre un bref recul au tir. Le projectile existant continue de porter le tir ; aucun flash supplémentaire n'est ajouté dans cette tranche. Montrer l'arme équipée même au repos, et projeter ses pièces dans le portrait HUD/Bio, est une adaptation demandée : le portrait Core cache l'arme. La projection SVG se régénère au changement d'identité, de tenue ou d'arme, jamais à chaque image.

## Coût et frontières

Les variantes utilisent les attributs, le maillage et les lots instanciés existants. Aucun squelette CPU individuel, nouvel objet par colon, flux GPU additionnel, nouveau tirage métier ou nouveau champ de sauvegarde n'est introduit. La géométrie des pièces d'arme sur le personnage conserve désormais l'axe et les dimensions de leur forme physique. Les branches de shader et le suivi d'angle ont malgré tout un coût potentiel ; les mesures avant/après et leurs limites figurent dans les [preuves V112](../history/validation-action-visual-v112.md). Ce contrat n'affirme pas un coût strictement nul ni une parité d'animation avec Unity.
