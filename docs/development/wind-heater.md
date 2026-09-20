# Éolienne, radiateur et météo — contrat V87

Lot V87 validé dans son périmètre ; [preuves](../history/validation-environment-v87.md). Recherche canonique : [énergie/climat](../research/wind-energy-bundle-reference.md) et [météo de surface](../research/weather-reference.md). Les campagnes et le calendrier de livraison restent centraux.

## Production et emplacement

Une éolienne coûte 100 acier et 2 composants, 330 ticks locaux de travail neutre, Construction 4 et Électricité. Corps 7×2 orientable, ancre au centre de sa première rangée, largeur across −3..3, longueur along 0..1. Le dégagement comprend dix rangées devant et six derrière, 112 cellules hors corps. Les deux couloirs peuvent se superposer ; aucun bénéfice d'orientation dans le vent partagé sans direction.

Un arbre, une roche pleine, un toit ou un bâtiment dont la définition bloque le vent compte une cellule. La table Core du catalogue est explicite : mur, porte, climatiseur, radiateur, générateur à bois, turbine et batterie bloquent ; mobilier bas, ateliers, tas de fragments, lampe, conduit, interrupteur, refroidisseur passif, foyer et panneau solaire ne bloquent pas. Une même cellule ne compte qu'une fois. Une cellule hors carte est ignorée, comme le contrôle d'obstruction Core ; les contraintes ordinaires de placement restent appliquées au corps.

Production potentielle : `2300 W × min(vent, 1.5) × max(0, 1 − 0.2 × cellulesBloquées)`, maximum 3 450 W. Ce dernier facteur est linéaire. Le contrôle électrique a lieu tous les 25 ticks locaux ; compteur et watts calculés sont persistés. Les watts sont arrondis au plus proche, adaptation commune au solaire (écart maximal 0,5 W). L'aperçu peut montrer un potentiel nouveau avant le prochain contrôle comptable.

Le vent est commun au site et indépendant du PRNG des personnes. Il possède graine et origine en temps **écoulé**, pas en date civile. Son bruit cohérent à quatre octaves conserve fréquence Core 0,00004, lacunarité 2, persistance 0,5, échelle 1,5, biais 0,5 et bornes 0,04..2 ; son implémentation de gradients/graines est propre à Lisière. Ce contrat ne certifie ni les mêmes échantillons que LibNoise, ni une distribution empirique calibrée sur plusieurs mondes. La météo interpolée multiplie le vent ; en orage le bas de la plage est relevé à 1,25 sans ajouter 1,25 au maximum.

La coupe automatique, initialement désactivée, produit des désignations ordinaires de coupe tous les 200 ticks locaux selon une phase stable par turbine. Le colon doit réellement atteindre et couper chaque arbre. Aucun arbre ni matériau ne disparaît au clic ; demander la coupe n'améliore pas immédiatement la puissance. Pas d'arbres cultivés ni de filtre botanique avancé revendiqués.

La turbine transmet le réseau même arrêtée. Elle n'a pas d'interrupteur personnel Core : utiliser l'interrupteur physique du réseau. Elle n'est pas réinstallable, ne supporte pas un toit, exige un sol Heavy, conserve transit +5 ticks locaux et interdit l'arrêt dans son corps.

## Chauffage et énergie

Radiateur 1×1 sans rotation : 50 acier, 1 composant, 100 ticks locaux de travail, Construction 5 et Électricité ; 100 PV, masse 6, inflammabilité 0,5, support Light, remplissage 0,4, transit +3 et arrêt interdit. Réinstallable, interrupteur physique et thermostat indépendants. Consigne 21 °C par défaut ; commandes relatives −10/−1/+1/+10 ou remise à 21, bornées −273,15..1 000 °C au worker.

Sous courant, la chaleur vaut 21 unités par seconde Core, pleine efficacité sous 20 °C puis linéaire jusqu'à zéro à 120 °C. Elle est distribuée au nombre réel de cellules d'air de sa région et plafonnée à la consigne. Pas de chaleur retenue dans le réservoir extérieur. Comme le climatiseur existant, l'intégration continue par pas de 10 Core remplace les impulsions Core de 250 ticks : adaptation déclarée, pas changement du débit nominal. La demande est 175 W en chauffe et 17,5 W en veille ; perte de courant ou disparition du volume arrête la chauffe.

La batterie conserve son unité historique 1/120 000 Wd. Le drapeau sparse `half:true` ajoute une demi-unité, soit 1/240 000 Wd, pour représenter exactement la charge à rendement 50 % avec une veille de 17,5 W. Le champ disparaît à reste nul ; la capacité 600 Wd inclut ce reste. Sans demi-unité, l'ancienne répartition entière reste byte-identique. Autodécharge 5 W, décharge, emballage et consommation d'explosion partagent la quantité réelle. Aucun stock n'est créé à la migration.

## Continuation et frontières

Les champs de radiateur/turbine/météo/vent et le demi-quantum sont refusés avant V87. Un ancien monde sans météo/vent garde ses règles antérieures tant que l'adoption explicite centrale n'est pas faite. L'adoption commence le temps clair à la date courante et n'invente ni tempête passée ni énergie ; le calendrier du site est un autre état.

`tests/weather-energy.test.ts` regroupe les conditions météo, transitions/reprises, températures, exposition intérieure/extérieure, emprises tournées, cinq obstructions, attente de coupe, veille/fonctionnement et conservation. Ces contrôles de frontière complètent le pilote commun et les vrais clics centraux ; ils ne constituent pas une nouvelle partie complète ni une garantie de fréquence d'orage.

`tests/environment-loop.test.ts` vérifie également la préparation commune : un colon éteint un foyer, paie et construit le radiateur et l'éolienne orientée, coupe son arbre gênant, puis continue exactement après sauvegarde. La pièce, le câble, la batterie chargée et les matières premières y sont préparés explicitement. Le parcours `tests/integration/environment.spec.ts` reprend cette préparation avec de vrais clics, les cinq réglages du thermostat, la consommation de veille affichée à 17,5 W et un checkpoint de pluie avec air intérieur froid. Ce dernier conserve les horloges ; il ne représente ni un hiver parcouru ni une occurrence naturelle d'incendie. Sa validation native reste centrale et distincte du préflight de simulation.
