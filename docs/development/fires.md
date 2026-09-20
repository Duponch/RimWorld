# Incendies, dégâts et extinction

Le sous-ensemble V87 est **livré et validé dans son périmètre**. La [recherche et ses arbitrages](../research/fire-bundle-reference.md) identifient les règles du Core 1.6.4871, leurs adaptations et les limites. Ce contrat ne certifie ni tout le catalogue incendiaire ni une fréquence garantie de sinistres.

## Boucle et frontières

Le feu est un objet autoritaire distinct du foyer de cuisine. La météo peut produire une frappe de foudre, laquelle applique un impact Flame borné et peut allumer des combustibles. Un intérieur très chaud peut également s'enflammer. Le feu grandit, se propage, endommage, chauffe la pièce et recule sous les précipitations ou les coups d'extinction. Aucune obligation de feu avant une date donnée n'est ajoutée au narrateur.

La zone **Foyer** et la priorité **Extinction** donnent aux colons libres du travail physique. Un ordre direct cible un feu, y compris hors foyer. Les blessés, captifs et animaux gardent leurs rôles ; une personne en feu interrompt ses activités et réagit avant son activité ordinaire. Après l'incendie, les soins, réparations et reconstructions utilisent les voies existantes.

| Module | Responsabilité |
|---|---|
| `fire-rules.ts`, `fire.ts` | État, calendrier Core, tirages privés, propagation, braises, attachement, pluie, chaleur, foudre et mèches de batterie. |
| `fire-content.ts` | Capture du contenu combustible d'un lot synchrone, obstacles et ligne courte ; invalidation après destruction ou dépôt effectif provoqué par une brûlure. |
| `thing-damage-rules.ts`, `thing-damage.ts`, `thing-destruction.ts` | PV/inflammabilité du catalogue retenu, dégâts aux ressources/piles/bâtiments, destruction et pertes matérielles. |
| `fire-damage.ts` | Brûlures anatomiques et protection Heat, communes aux dossiers médicaux humains et animaux. |
| `firefighting.ts`, `firefighting-animals.ts` | Travail au contact, interruption conservative, réaction autonome, budget de navigation partagé. |
| `fire-navigation.ts` | Coûts perçus dérivés, sans changement de durée physique d'une arête. |
| `fire-save.ts` | Formes, identités, horloges, exclusivités et registres de pertes. |

La météo possède son propre calendrier et transmet `rainRate` ainsi que la cellule et le sous-tick Core d'un éclair. Le noyau feu ne choisit pas une seconde météo. La chaleur emprunte les volumes thermiques existants ; la destruction d'un support réconcilie toit, pièces et réseau électrique au même pas. Les sources servies sont gelées pendant les contrôles natifs.

## Feu et chaleur

Une flamme de sol commence au minimum à 0,1 et reste plafonnée à 1,75. Une flamme attachée peut naître plus petite. Les pulses de 15 ticks Core, le cycle complexe de 150 et les braises possèdent des échéances persistées. Un pas local couvre dix ticks Core ; il ne devient pas une seconde réelle.

Le cycle complexe utilise le combustible de la cellule et applique dégâts, croissance et chaleur. Les cibles et matériaux sont détaillés dans la recherche. La propagation ne commence qu'au-dessus de 1, avec tirage proche/lointain 80/20 et intervalle `max(75, 150−(taille−1)×40)`. La branche lointaine conserve son motif asymétrique vérifié, sa ligne d'accès et un transit à 1,5 case/seconde. Elle ne traverse pas immédiatement un mur. Le vent ne multiplie pas la propagation : aucune telle règle n'a été trouvée dans le code local relu.

La chaleur injectée vaut `taille×160` par cycle complexe, réduite à 15 % sur une porte, puis répartie sur le volume existant. Une région intérieure à **plus de 240 °C** permet l'auto-inflammation : échantillonnage `ceil(aireCarte×0,0006)` cellules par tick Core, puis tirage lié à la température et à l'inflammabilité. Lisière emploie une permutation déterministe dérivée de la graine et du tick. Sans région chaude, ce chemin ne construit aucun index des ressources et ne parcourt aucune cellule candidate.

Les précipitations avec `rainRate>0,01` retirent 0,1 de taille par cycle complexe aux feux exposés. Le toit ordinaire protège le contenu intérieur ; les murs et portes qui portent ce toit restent exposés. La neige des Weathers participe au même `rainRate`, sans introduire une épaisseur de neige ni une règle de fonte non livrée. L'eau naturelle éteint ; aucun sol construit inflammable n'est ajouté par ce lot.

La foudre utilise un impact Flame local de rayon 1,9. Une batterie encore présente peut amorcer une mèche sur dommage Flame : 5 % si son énergie est strictement supérieure à 500 Wd, y compris la fraction de stockage. L'échéance de 70 à 149 Core survit à l'extinction et à une décharge ultérieure. À expiration : impact Flame de rayon 1,5 à moins de 3 sur une cellule de son emprise, puis prélèvement maximal de 400 Wd, borné au stock restant. Ce mécanisme n'est pas le court-circuit pluvieux, qui reste absent.

## Extinction et réaction corporelle

Le planner compare la priorité Extinction aux travaux réellement disponibles ; à priorité égale, son rang précède Patient. Une priorité Patient plus forte mais sans besoin médical actuel ne bloque pas tout travail d'extinction. Le contrôleur urgent peut interrompre un travail ordinaire réellement engagé de priorité égale ou plus faible. Les ordres forcés existants restent prioritaires ; un nouvel ordre direct explicite les remplace après préplanification d'un dépôt possible.

Le pompier marche jusqu'à une case de contact accessible. Le contact diagonal interdit tout passage à travers un coin solide. Un coup retire 0,32 de taille, sans eau consommée ni XP, et ne frappe pas au tick de naissance du feu. Le cooldown nominal de 66 Core est servi à la prochaine frontière locale : cadence effective minimale de **70 Core**. Cette adaptation est conservée explicitement ; elle n'est pas présentée comme une égalité de cadence exacte au Core.

Le secours automatique d'un humain allié ou captif hébergé en feu peut sortir du foyer jusqu'à quinze cases Manhattan. Le mode mobilisé conserve seulement le réflexe au contact. Deux acteurs au contact peuvent intervenir ; un trajet lointain vers un feu déjà pris en charge est évité. La coopération complète du Core, la priorité opportuniste à la cellule suivante et l'ordre successif sur plusieurs feux restent partiels : l'ordre de cette tranche vise **un feu** et borne le travail à 600 secondes.

Une flamme attachée libère les réservations et interrompt les tâches. Si un dépôt est impossible, la cargaison demeure réellement portée sous le contrat d'interruption. L'arête engagée et ses fractions restent intactes. Le contrôleur brûlant peut ensuite choisir une courte course accessible ou une auto-extinction de 150 Core. La décision probabiliste a lieu après le trajet et l'attente, pas à chaque tick de marche. Les animaux utilisent la même forme de réaction avec leur budget et leurs portes propres. L'incapacité suspend ces gestes ; un autre colon peut toujours éteindre un humain au sol.

À extinction, l'intention de panique et son chemin restant sont retirés, tandis que l'arête déjà capturée finit normalement. L'extinction animale par un colon et le plongeon dans l'eau sont absents. La distribution des trajets de panique est une adaptation bornée à notre navigation, pas une reproduction intégrale du ThinkTree.

## Dégâts, conservation et réparations

Les brûlures utilisent les parties extérieures du vrai modèle anatomique et l'armure Heat à pénétration nulle. Une brûlure saigne à zéro, cause de la douleur et peut cicatriser ou s'infecter selon le contrat médical commun. L'allumage est distinct de la lésion : une blessure `burn` seule ne crée pas une flamme.

Une pile possède ses PV pour **toute sa quantité**. Une séparation copie ses dégâts ; une fusion calcule les PV restants pondérés par les quantités, arrondis au plafond. Vêtements et armes réutilisent leurs PV physiques. La destruction retire toute la pile, sans remettre à zéro les âges des objets survivants.

L'usure d'armure produite par une brûlure réserve aussi la capacité entière de son registre de pertes avant toute mutation médicale, de vêtement ou du PRNG. Les quantités potentiellement détruites sont cumulées par ItemId ; si leur ajout dépasse l'entier exact maximal, l'impact est refusé sans mutation. Cette garde de saturation numérique extrême a été ajoutée après le parcours annuel validé ; aucune borne comparable n'a été approchée pendant cette campagne. Les compteurs ordinaires conservent leurs tirages et leurs effets.

Les plantes détruites ne donnent aucune récolte. `damageResource` partage les PV entre feu et mortalité végétale, avec cause explicite ; seul le feu alimente son registre de pertes. Les bâtiments du catalogue retenu peuvent recevoir des dégâts et être réparés physiquement dans le foyer par Construction, selon le travail 80 puis 20 Core du contrat existant. Les plans et cadres ne reçoivent pas de nouveaux PV fictifs.

Si une plante disparaît pendant le défrichage préalable, seule cette étape et sa réservation caduque sont libérées. Le chantier, ses matériaux déjà incorporés, les autres ordres et l’arête engagée restent conservés ; un ordre prioritaire valide peut reprendre après réévaluation du chantier.

Une destruction est prévalidée avant le retrait fatal, notamment pour la place des restes. Les restitutions suivent la décision existante du projet : un quart des matériaux bruts de la recette pour les familles qui laissent des ressources, rien pour les autres. **L'acier brut restitué demeure une divergence avec les scories du Core** ; aucun nouvel objet scorie n'est inventé. Les pertes nettes de recette alimentent `World.destroyed`.

Le registre `World.fires.ledger` distingue :

- `items` : quantités d'ItemId effectivement détruites, indépendantes de consommation et pourriture ;
- `resources` : nombres de plantes détruites, par espèce ;
- `woodPotentialLost` : somme des `amount` des arbres détruits, soit du rendement potentiel disparu, jamais du bois déjà produit ;
- `structures` : bâtiments détruits par cette voie ;
- `batteryEnergyLost` : énergie perdue, en quanta de 1/120000 Wd, avec demi-quantum conservé ;
- `fuelTicksLost` : combustible restant disparu et `fuelTicksBurned` : consommation passée d'un appareil retiré, afin de ne pas perdre l'historique de bilan ;
- `ignitions` et `extinguished` : compteurs d'activité, pas quantités de matière.

Les sources/destinations de transport, postes, lits, meubles emballés, repas, soins, équipements et files sont réconciliés après disparition. Une autre cargaison n'est jamais détruite parce que sa station a brûlé. Le stock, le réseau et le support du toit se recalculent après les mutations réelles.

La destruction fatale prépare le retrait du bâtiment ou paquet, les dépôts des utilisateurs interrompus et les restes sur une même vue conservatrice du sol. Elle réutilise les règles ordinaires de dépôt et conserve les réservations non liées. Le commit applique ces places avant les interruptions médicales ou de toit ; celles-ci voient les nouvelles occupations. Un refus ne modifie ni bâtiment, cargaison, identités, registre de pertes ni tirages, même si aucun registre de feu n’existait encore. Les coups non fatals n’effectuent pas cette préparation.

## Persistance, contrôles et limites

Le schéma 86 est validé selon ses règles strictes avant migration vers 87. Aucun feu, dommage, passé climatique ou objet n'est créé rétrospectivement ; la priorité Extinction reçoit sa valeur initiale explicite. Les anciennes versions qui contiennent des champs feu/brûlure V87 sont rejetées avant migration.

Les identités de flammes et braises appartiennent au registre global. Horloges, phases, cibles, mèches, PRNG et registres sont persistés. Une réaction brûlante ne peut conserver une activité ordinaire ; l'extinction ne peut réserver une cible absente. Le validateur vérifie aussi les PV et les incompatibilités médicales, animales, de prison et de raid.

Les contrôles courts groupés couvrent travail et ordre, contact diagonal, refus de dépôt neutre, propagation/pluie, chaleur, dégâts/pertes, réparation, armure/brûlure, réaction animale, batterie et continuation. Le parcours commun distingue la traversée saisonnière **naturelle** de sa branche de feu **contrôlée**. Les preuves de cette campagne sont tenues centralement ; ce contrat ne les annonce pas terminées.

Restent absents : fumée et suffocation, cendres fonctionnelles/hygiène, mousse et extincteurs, gaz/armes incendiaires, pyromanie, dégâts universels/explosions générales, court-circuit, fonte d'une couche de neige, sols construits combustibles, destruction des corps humains retenus et extinction vétérinaire. Les profils couvrent les objets existants de Lisière ; ils ne constituent pas un catalogue Core exhaustif.
