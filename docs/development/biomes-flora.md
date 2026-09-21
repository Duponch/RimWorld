# Biomes et flore sauvage — contrat V91

V91 livre trois profils de nouvelle carte : forêt tempérée, forêt boréale et broussailles arides. Le choix agit sur le climat, la densité, les espèces vivantes, le fourrage, les baies, l'agave et le bois. Les valeurs et adaptations sont tracées dans la [recherche V91](../research/biomes-flora-reference-v91.md). Les règles antérieures de [génération](world-generation.md), [climat et plantes](site-climate.md), [feu](fires.md) et [faune](wildlife.md) restent les frontières communes.

## Provenance du site

`resolveSite(seed, {hilliness})` garde un `LocalSite` révision 1, forêt tempérée, et suit strictement le chemin V83. Il n'initialise aucune espèce ni écologie. `resolveSite(seed, {hilliness, biome})` produit un site révision 2. La factory de nouvelle partie fournit explicitement le biome choisi ; son défaut public est la forêt tempérée révision 2.

Les trois climats sont des profils complets :

| Biome | Profil | Moyenne / pluie | Coordonnées de référence |
| --- | --- | --- | --- |
| Forêt tempérée | `temperate-reference` | 16,2 °C / 900 mm | 22,21° N, 18,23° O |
| Forêt boréale | `boreal-reference` | 5,3 °C / 655 mm | 39,71° N, 13,47° E |
| Broussailles arides | `arid-reference` | 25,4 °C / 690 mm | 4,01° N, 27,74° E |

Calendrier, lumière, température extérieure et pluie lisent le même profil. Le changement de biome ne modifie pas le nombre de ticks par jour, les seuils de chaleur humaine, le vent, ni la fréquence propre des météos.

## Ressource végétale

Une plante sauvage V91 est une `Resource` portant `species`, croissance, `growthTick` et `plantLife`. Son `kind` reste une capacité physique : `tree`, `berries` ou `wild-plant`. La définition d'espèce est l'autorité pour durée, sol minimal, sensibilité à la fertilité, seuil de maturité, produit, quantité, nutrition, PV, inflammabilité et borne thermique haute.

Le catalogue comprend herbe, herbe haute, ronces, buisson de baies, chêne, peuplier, mousse, pin, bouleau, agave, saguaro et drago. Les arbres mûrs donnent le bois commun avec leur rendement propre. Les baies restent le produit historique renouvelable. L'agave mûr produit dix unités physiques `agave-fruit`, puis disparaît. Herbes, mousse et ronces n'ont aucun produit manuel : elles servent de nourriture vivante, de combustible végétal et d'obstacle à dégager.

`plantNutrition(resource, growth)` renvoie la nutrition totale encore présente et zéro pour une ressource non comestible. `grazingResult(resource, growth, requested)` borne l'ingestion, calcule la fraction de croissance consommée et indique la disparition. Ces requêtes ne mutent ni le monde ni le PRNG et ne dépendent pas de la faune.

Une commande Récolter exige une plante à produit et une croissance strictement supérieure à son seuil. Une commande Couper un arbre exige une croissance au moins égale à son seuil. La quantité finale conserve l'arrondi stochastique commun et ne consomme le PRNG de jeu qu'après prévalidation du dépôt. Un refus de dépôt laisse plante, quantité et PRNG inchangés. Une coupe de dégagement détruit une plante V91 sans produit ; les buissons historiques conservent leur rendement de coupe ; feu, gel destructeur et vieillissement ne créent jamais de récolte.

## Croissance, vie et dégâts

La croissance reste intégrée par intervalles de lumière, sans travail par plante à chaque tick. Fertilité et température utilisent la définition d'espèce. Les plantes arides explicitement tolérantes à la chaleur utilisent une borne de 75 °C ; les autres gardent 58 °C. Un toit suspend la progression. Le contrôle biologique sparse reste décalé par identité tous les 200 ticks.

Les espèces dont la définition Core fournit une représentation sans feuilles — herbe, ronces, baies, chêne, peuplier, mousse, bouleau et saguaro — deviennent sans feuilles sous leur seuil individuel. Herbe haute, pin, agave et drago gardent leur représentation ; leur dormance biologique Core sans graphisme alternatif n'est pas simulée. Vieillissement, obscurité et dégâts partagent `plantLife` et `Resource.damage`. Les arbres utilisent neuf durées biologiques pour leur limite d'âge, les autres huit, sauf le saguaro qui conserve quarante. Les PV et l'inflammabilité viennent de l'espèce. La destruction remplace `world.resources`, annule les travaux concernés et libère le repas animal visant cette plante.

Couvert de tir : arbre 0,25, baie 0,20, agave 0,20, saguaro 0,35, autres plantes basses zéro. Cette règle est indépendante de la hauteur de rendu et de la navigation.

## Génération et renouvellement

Terrain, minerai et fragments précèdent les plantes. La génération V91 ne pose rien sur eau, roche, sol sans fertilité ou pile existante. Elle applique densité du biome, fertilité, bosquets et part des poids réellement livrés. Les poids Core absents réduisent la population ; ils ne deviennent pas davantage d'herbe, de bois ou de nourriture. Un tirage incompatible avec le sol échoue sans redistribution.

`initializeWildFlora(world, site)` capture la capacité réellement créée et amorce un PRNG séparé. `advanceWildFlora(world)` effectue un contrôle borné tous les 60 ticks. Son rythme dépend du nombre de plantes manquantes et des 20/25/27 jours de repousse du profil. Il n'examine jamais chaque plante à chaque tick.

Une nouvelle plante exige une cellule fertile sans sol construit, eau, roche, toit, zone de culture, plante, structure ou chantier sur toute leur empreinte, pile au sol ou meuble emballé. Son ajout remplace le tableau `world.resources` afin que les index de vie végétale et de température soient reconstruits au prochain accès. Le plafond est la capacité de génération sauvegardée ; saturation n'avance aucun tirage de placement ou d'espèce.

## Persistance et validation

`World.flora` conserve `{revision, biome, rng, nextCheck, adoptedAt, capacity}`. Le validateur exige un site révision 2 du même biome, un flux non nul, une cadence cohérente, une capacité entière au plus égale à la surface et au plus ce nombre de plantes présentes. Chaque plante d'espèce doit avoir le type et le rendement de sa définition, une croissance bornée, un checkpoint passé ou présent et une vie biologique.

L'absence de `World.flora` reste valide uniquement pour un site qui n'est pas révision 2 et sans aucune espèce. Le schéma V90 refuse tous les champs V91. Une ancienne partie est validée dans son ancien schéma puis migrée sans flore : pas de génération, renouvellement, âge, gel, produit, climat ou tirage inventé. Aucun mécanisme d'adoption rétroactive n'est livré.

Les flux de flore et de faune sont indépendants. Sauvegarder au milieu d'une pousse, d'un travail ou avant un contrôle écologique conserve exactement leurs calendriers et PRNG. Les caches dérivés ne sont pas sérialisés.

## Vérification et limites

Le contrôle court [biomes-flora.test.ts](../../tests/biomes-flora.test.ts) couvre :

- empreinte SHA-256 du paysage historique révision 1, sans espèce ni état écologique ;
- double génération des trois biomes, catalogue autorisé, douze espèces et trois profils climatiques ;
- croissance, nutrition, broutage, inflammabilité et destruction d'une plante basse ;
- dégagement réel d'une plante par un chantier ;
- récolte agave vers une pile `agave-fruit`, arbre immature refusé puis chêne mûr vers 46 bois, avec reprise exacte ;
- renouvellement bloqué par une zone de culture, insertion prospective, remplacement du tableau, saturation, capacité invalide et reprise du flux privé.

Ce contrôle n'est ni une campagne d'équilibrage, ni un benchmark, ni une preuve de fréquence sur 250². La validation V91 regroupe ensuite contrôles centraux, parcours UI et campagne commune ; aucun nouveau pilote autonome de vingt jours n'est ajouté.

Restent hors périmètre : humidité cellulaire, plantes aquatiques, succession et reproduction, semis sauvage, maladie végétale, neige accumulée, toundra, jungle, marais et déserts supplémentaires. Les espèces partagent encore une courbe de croissance adaptée et des formes de présentation compactes ; elles ne créent pas un tampon GPU maximal par espèce.
