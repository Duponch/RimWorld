# Référence solaire Core — V85

Enquête du 20 septembre 2026, RimWorld **Core sans extension**. Le panneau solaire a un contrat local suffisamment établi pour compléter le réseau et les batteries. La lumière du site reste partielle dans Lisière : cette livraison ne reproduit pas encore la météo, les saisons ou les éclipses. Le [contrat électrique](../development/power.md) décrit l'implémentation ; cette page conserve sa provenance, ses décisions et ses limites.

## Sources et degré de certitude

- Installation locale en lecture seule : `E:/Steam/steamapps/common/RimWorld`. `Version.txt` relu : **1.6.4871 rev590**. Les sauvegardes rev591 et les parties 1.6.4633 sont identifiées séparément dans la [référence de partie](core-reference-baseline.md).
- Définitions locales : `Data/Core/Defs/ThingDefs_Buildings/Buildings_Power.xml`, `Buildings_Base.xml`, `ResearchProjectDefs/ResearchProjects_2_Electricity.xml` et `WeatherDefs/Weathers.xml`.
- Classes de cette installation consultées avec ILSpyCmd 8.2.0.7535 : `CompPowerPlantSolar`, `CompPowerPlant`, `Verse.SkyManager` et `Verse.WeatherWorker`. L'héritage de `BuildingBase` a été vérifié pour ne pas ajouter un interrupteur personnel absent. Aucun XML propriétaire, extrait décompilé ou sauvegarde personnelle brute n'est publié.
- Confrontation Internet fraîche : [Solar generator](https://rimworldwiki.com/wiki/Solar_generator), révision consultée oldid161823, et [Wind turbine](https://rimworldwiki.com/wiki/Wind_turbine), oldid179675. Ces pages comportent des indications incomplètes ou à vérifier ; les valeurs de la version locale priment. Un miroir de code plus ancien ne certifie pas cette version.
- L'[annonce officielle 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) mentionne une correction de réseau conservé après un transfert de carte ; elle motive la vigilance sur les connexions périmées, sans prouver les coefficients solaires. L'[annonce officielle 1.6 et Odyssey](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) distingue la mise à jour Core du contenu de l'extension : ses conditions particulières ne sont pas importées ici.

Le corpus utilisateur, consulté par [reference-adoption](reference-adoption.md), apporte les chapitres **10** (construction, livraison, travail et interruption) et **22** (réseau, production, demande, stockage et commutation). **SYS-127 / TEST-127** : adopter l'absence de connexion fantôme après déconstruction. **SYS-128 / TEST-128** : garder la panne de combustible comme cause distincte ; un panneau solaire n'en possède pas. La source S11 mentionnant Odyssey ne suffit pas à certifier un producteur Core. Les contrats sont adoptés, l'architecture reste libre et les vérifications sont regroupées.

## Règles établies dans la version locale

| Domaine | Référence Core 1.6.4871 |
| --- | --- |
| Construction | 100 acier, 3 composants ; travail neutre de 2 500 ticks Core ; Construction 6 |
| Recherche | `SolarPanels`, 600 points, niveau Industrial, prérequis `Electricity` ; aucune dépendance à `Batteries`, aucune connaissance solaire initiale dans `ClassicStart` |
| Emprise | 4×4, non orientable, non réinstallable |
| Passage | `PassThroughOnly`, surcoût 50 ticks Core, arrêt interdit, remplissage 0,5 ; zones incompatibles, support Medium |
| Bâtiment | 300 PV, inflammabilité 0,7 ; panne et composant EMP présents dans la référence |
| Électricité | Production maximale 1 700 W, sans combustible ; transmission sur son emprise |
| Commutation | Aucun `CompFlickable` personnel, y compris par héritage ; la coupure du réseau passe par un interrupteur distinct |

La présence d'une définition de panne ou d'EMP dans cette table n'annonce pas ces systèmes dans Lisière. Le wiki signale encore une vérification sur l'EMP : la présence locale du composant est confirmée, sans valider dans ce lot toutes ses interactions de combat.

La puissance désirée suit `1 700 × CurSkyGlow × cases_sans_toit / 16`. Chaque cellule de l'emprise est prise en compte. Dans Core, tout toit compte, construit ou naturel. À pleine lumière, le potentiel vaut 1 700 W sans toit, 1 593,75 W avec une cellule couverte, 850 W avec huit, et zéro avec seize. Une lampe, une ombre graphique d'arbre ou de montagne et une orientation artistique du panneau ne changent pas ce calcul. Le seuil de lumière de 51 % employé pour la croissance des plantes ne s'applique pas au solaire.

`CurSkyGlow` provient de la lumière céleste, avec plafond météorologique et interpolation ; certaines conditions et certains événements peuvent le modifier. Cela ne justifie pas un multiplicateur arbitraire pour chaque pluie, brume ou neige. Une température basse ou un ciel visuellement sombre ne suffisent pas à déduire une puissance sans consulter ce modèle.

## Adoption et adaptations Lisière

`solarPowerOutput(world, structure)` calcule le potentiel à partir de `naturalLight(calendarTick(world))` et de la couverture autoritaire des seize cellules. `powerWatts(structure, world)` applique ensuite l'état électrique. Le dispatch arrondit le potentiel au watt entier pour le bilan de stockage entier : écart maximal de 0,5 W, adaptation explicitement acceptée. Aucun tirage aléatoire, temps réel ou pixel rendu n'entre dans le calcul.

Le profil lumineux actuel représente **45° N à l'équinoxe**. Le décalage de départ à 06 h et les calendriers historiques passent tous par `calendarTick`. La latitude choisie sur un globe, les saisons, la météo complète et les éclipses sont absentes ; le panneau n'invente aucun de ces états. La lumière ambiante artistique qui rend la nuit lisible à l'écran ne produit pas d'électricité.

Les toits naturels ne sont pas encore modélisés. Le panneau interroge `isRoofed` pour les toits construits, sans transformer le décor rocheux en couverture cachée. Étendre les toits ou la lumière du site devra modifier leurs oracles communs, puis leurs effets sur le solaire, sans substituer des tests de couleur ou d'ombre GPU.

L'ancre interne est le coin minimal `(x,z)`, l'emprise couvre `x..x+3` et `z..z+3`, le centre graphique est `(x+1,5,z+1,5)`, et l'orientation vaut zéro. Cette convention diffère de l'ancre centrale paire de RimWorld ; prévisualisation, placement et collision utilisent la même emprise. Le rendu original consiste en panneaux bas sur cadres. Les géométries restent résidentes ; l'évolution du soleil ou de la charge d'une batterie ne reconstruit pas les bâtiments.

Le travail neutre de construction est converti en **250 ticks locaux**, et le surcoût de passage en **5 ticks locaux**, selon la conversion commune de dix ticks Core par tick local. Le projet Lisière `solar-power` conserve 600 points ; `batteries`, 400 points, reste indépendant. Un arrêt physique de réseau est une demande de travail, distincte de l'état déjà réalisé ; il ne crée pas de commande personnelle sur le panneau ou la batterie. Voir les recherches [réseau](power-grid-reference.md) et [batteries](power-battery-reference.md).

## Pourquoi différer l'éolien

Les données locales de `CompPowerPlantWind`, `WindTurbineUtility`, `CompAutoCutWindTurbine`, `PlaceWorker_WindTurbine` et `Verse.WindManager` établissent plusieurs dépendances supplémentaires. La puissance est issue d'un **vent commun à la carte**, dérivé du temps, de son identité et de la graine, puis modifié par la météo et les conditions. Ce n'est ni une moyenne constante de wiki ni un tirage indépendant par éolienne.

La base nominale est 2 300 W et le facteur exploitable est plafonné à 1,5, donc le maximum local est **3 450 W**. L'emprise est 7×2, avec une zone à dégager de 112 cellules hors bâtiment : sept de largeur, dix devant et six derrière. Chaque cellule bloquée par un toit ou un objet bloquant le vent retire 20 % de la puissance avant obstruction ; cinq cellules annulent la production. Le contrôle est périodique, l'auto-coupe crée des travaux physiques, et l'orientation change la zone à dégager.

Le lot V85 diffère l'éolien avec ces dépendances, au lieu d'inventer un producteur nocturne constant. Vent persisté, transitions météorologiques, obstruction, auto-coupe et inspection causale devront former son contrat. Le réglage initial exact de l'auto-coupe n'est pas établi par cette enquête. Les biomes et vents particuliers d'Odyssey restent exclus.

## Rythme observé et validation

La [colonie historique observée](colony-progression-observed.md) est en Core 1.6.4633, tutoriel/Phoebe/Easy, avec retours de sauvegarde. Première présence observée : éolienne J12,9689 (instantané précédent J5,0382), batterie J16,7428 (précédent J14,6321), solaire J37,0174 (précédent J25,4905). Ces intervalles ne datent pas la construction précise, ne prouvent pas le fonctionnement effectif et ne décrivent pas une colonie Cassandra moyenne. Aucun délai de recherche ou événement n'est accéléré pour montrer tout le système à J7.

Les contrôles solaires regroupent aube/jour/nuit, couverture partielle et complète, lumière artificielle sans effet, continuation et stabilité géométrique. Le parcours natif utilise une préparation annoncée de matériaux et recherches presque terminées, puis de vrais clics pour achever les recherches, construire le réseau, charger une batterie, poser un toit, enregistrer une demande de commutation et retirer un câble sous un mur. Sa frontière nocturne avance explicitement l'heure d'un checkpoint validé : elle n'est pas une journée intégralement jouée. Le pilote naturel long et les mesures mixtes sont des preuves séparées.

Les sauvegardes anciennes conservent leurs cartes, calendriers et possessions ; aucune nouvelle batterie, charge ou connaissance solaire n'est inventée par migration. Pannes, EMP, courts-circuits/pluie, incendies, saisons et éclipses restent des limites explicites du lot électrique.
