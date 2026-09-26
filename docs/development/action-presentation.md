# Orientation et gestes visibles — V112/V117

## Contact et gestes selon la hauteur — V117

La position de travail reste la case décidée par la simulation. Lorsqu'une cible voisine est confirmée, le corps, la charge portée, le feu attaché et l'anneau de sélection peuvent avancer ensemble de **0,42 case au maximum**, en gardant au moins 0,55 case du centre de la cible (0,72 pour un poste). Ce décalage purement visuel s'interpole en 0,24 seconde de temps de présentation confirmé ; le départ sur une arête confirmée repart de la pose atteinte et rejoint son vrai point d'arrivée. L'annulation revient à la case sans accumulation. Lors d'un instantané, le nouveau départ de l'interpolation reprend la position réellement présentée et, une fois l'approche achevée, ses deux extrémités sont identiques : la remise à zéro du mélange ne recentre donc pas brièvement le colon. Le chemin, les collisions, la portée métier et la sauvegarde ne sont pas altérés. Un travail au sol garde les pieds dans sa case.

Semer, récolter, traiter un objet au sol et achever une proie basse utilisent une pose fléchie avec bras mobiles. La mêlée contre un lièvre reçoit une frappe basse ; contre une personne, elle garde la pose antérieure. Cuisine, fabrication et recherche conservent leur poste mais animent leurs bras plus lisiblement. La tête bouge légèrement pendant la marche. Toutes ces variantes utilisent les pièces et attributs du lot humain existant ; il n'y a pas de squelette, scène ou texture par colon.

L'arbre réagit seulement au progrès **confirmé** d'une coupe réservée à un colon qui travaille. À l'extension du bras, tronc et feuillage pivotent brièvement à l'opposé de lui, puis reviennent à leurs positions et normales de base en 0,55 seconde. La même horloge de présentation que le colon régit cette réponse : une pause la fige, une interruption l'efface. Le maillage fusionné demeure résident et seuls les intervalles de sommets touchés sont réenvoyés au GPU. Une croissance ou une reconstruction de chunk recalcule la base, sans inclinaison cumulée. L'effet n'inflige aucun dégât supplémentaire et ne déplace aucun arbre dans la simulation.

Ces gestes améliorent le contact perçu, mais ne garantissent pas une collision anatomique exacte entre chaque main, objet et forme 3D. Le suivi des poses et les mises à jour partielles d'un arbre frappé peuvent coûter du CPU/GPU ; voir les [contrôles V117](../history/validation-action-contact-v117.md).

[Référence Core 1.6.4871 et limites](../research/action-visual-reference-v112.md). Cette tranche concerne la **présentation** des décisions déjà prises par la simulation. Chemins, cases, cibles, durées de travail, équipement physique, dégâts et sauvegardes gardent leur autorité actuelle.

## Orientation

Les humains et animaux gardent la translation de leur arête confirmée. Leur modèle interpole seulement l'angle vers la nouvelle direction, par le chemin le plus court, en 0,24 seconde de temps de présentation confirmé. Un demi-tour reste volontairement rapide. Si la direction change encore pendant cette rotation, le nouveau départ utilise l'angle déjà atteint. En pause, l'angle cesse d'avancer ; une nouvelle carte repart de sa pose initiale. Corps, charge portée et repères partagent le même état d'orientation. Le Core 1.6.4871 emploie quatre directions sans ce lissage : c'est une adaptation de notre scène 3D.

## Travail et armes

Les travaux existants choisissent quatre silhouettes de bras dans le maillage humain résident : coup levé pour miner, frappe latérale pour abattre, geste court pour construire et mains au plan de travail pour fabriquer. Les poses utilisent le temps de scène et les tâches déjà connues ; elles n'ajoutent ni progression ni résultat métier. Les autres activités gardent leurs poses existantes. Les sons, poussières, copeaux et effets spécialisés du Core ne sont pas reproduits intégralement.

Ni la pioche ni la hache n'est un équipement requis ou montré par les travaux correspondants du Core. Lisière n'en crée donc pas pour cette tranche. Le fusil, revolver et couteau restent les objets physiques réellement équipés et les mêmes pièces que celles au sol : le fusil passe d'un port diagonal lisible à la visée, puis montre un bref recul au tir. Le projectile existant continue de porter le tir ; aucun flash supplémentaire n'est ajouté dans cette tranche. Montrer l'arme équipée même au repos, et projeter ses pièces dans le portrait HUD/Bio, est une adaptation demandée : le portrait Core cache l'arme. La projection SVG se régénère au changement d'identité, de tenue ou d'arme, jamais à chaque image.

## Coût et frontières

Les variantes utilisent les attributs, le maillage et les lots instanciés existants. Aucun squelette CPU individuel, nouvel objet par colon, flux GPU additionnel, nouveau tirage métier ou nouveau champ de sauvegarde n'est introduit. La géométrie des pièces d'arme sur le personnage conserve désormais l'axe et les dimensions de leur forme physique. Les branches de shader et le suivi d'angle ont malgré tout un coût potentiel ; les mesures avant/après et leurs limites figurent dans les [preuves V112](../history/validation-action-visual-v112.md). Ce contrat n'affirme pas un coût strictement nul ni une parité d'animation avec Unity.
