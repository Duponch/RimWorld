# Validation V91 — milieux vivants et ressources utiles

Lot développé sur `main` à partir de V90 `f047a99`, Core sans extensions ni mods. Les contrats de [flore](../development/biomes-flora.md), [faune](../development/fauna-diversity.md) et [matières](../research/biome-products-reference-v91.md) bornent la livraison. Les fichiers locaux Core et sauvegardes témoins restent en lecture seule ; aucun XML propriétaire, code décompilé ou fichier personnel brut n'est publié.

## Nouveautés obtenables

Trois choix de milieu local, douze plantes sauvages avec formes et usages propres, cinq herbivores obtenables, renouvellement prospectif, nouvelles viandes, fruit d'agave et trois cuirs supplémentaires. Ces matières alimentent les cinq familles vestimentaires existantes : quinze nouvelles combinaisons, vingt-cinq au total. Corps, produits, âges alimentaires, matières incorporées, auteur, qualité, portage et équipement restent physiques. Le lièvre des neiges a un profil testé mais n'est pas obtenu dans les trois biomes livrés.

Les cartes anciennes gardent paysage, climat, animaux, filtres et inventaires ; la migration stricte V90→V91 n'ajoute que le numéro de schéma. Les nouveaux sites utilisent une provenance révision 2, le nouveau départ une révision 6. Les climats sont trois sites témoins contextualisés, pas des moyennes ou défauts mondiaux.

## Campagne courte regroupée

Le rapport [biomes-tests-v91.json](../../artifacts/biomes-tests-v91.json) ferme **138/138 contrôles dans 32 fichiers** : génération, flore, faune, corps, combat animal, chasse, boucherie, cuisine, hygiène, confection, matériaux, politiques, sols, climat, migrations, snapshots et présentation.

Les situations préparées exécutent ensuite les vrais travaux. La chaîne dromadaire relie collecte d'une dépouille, boucherie, reprise en cours de travail, plusieurs piles, cuisson et ingestion. Les trois nouveaux cuirs suivent confection, sauvegarde d'un ouvrage inachevé, finition avec qualité et habillement physique. Le compteur de factures est vérifié sur matières stockées, cargaison et produits hors réserve. Des frontières distinctes couvrent saturation, quantités, âge pondéré, identité maximale et PRNG non consommé par un dépôt refusé.

La colonie V90 immuable est chargée depuis `colony-v90.json.gz`, comparée champ par champ à la migration neutre puis poursuivie exactement en double. Les paysages révision 1 gardent une empreinte déterministe. Les trois reliefs du nouveau départ permettent un premier camp, après dégagement réel des plantes basses : trois plans de lit, réserve entièrement disponible et vingt cases de culture.

### Défauts diagnostiqués et conservés dans le bilan

- L'initialisation immédiate du cache des produits créait un cycle d'import ; elle devient paresseuse, avec les mêmes résultats de comptage.
- La coupe de dégagement V91 avait supprimé le rendement des buissons historiques ; le chemin ancien est restauré, assertion conservée.
- Deux fixtures fabriquaient une ancienne version avec des filtres V91 ; elles retirent les champs futurs avant sérialisation, sans assouplir les validateurs.
- Le pilote exigeait une aire vide dans une flore désormais dense ; il ordonne la coupe et attend les vrais travaux avant la réserve. Aucun paysage n'est effacé pour faire passer le pilote.
- La revue centrale a corrigé la fusion pondérée d'âge des viandes, la limite d'identité avant chaque insertion, la coupe rectangulaire des jeunes arbres et le coût thermique des plantes dans l'intervalle neutre.

Les premières sorties en échec restent locales dans `tmp/v91-*.log`; ce bilan distingue corrections du produit et réparations du pilote. Aucun échec n'est masqué par le retrait d'une assertion métier.

## UI, performances et contrôle final

Les trois parcours de biome passent dans Chromium natif : menu, génération, inspection/repérage des espèces, ordre de chasse puis annulation, simulation à 6× et sauvegarde/restauration exacte. [Rapport UI](../../artifacts/biomes-native-v91.json). Les captures boréales et arides montrent les formes végétales/animales et le libellé du milieu corrigé.

Après profilage, transport des changements de croissance en Float64 exact et redimensionnement des plages de sommets résidentes ; 18 contrôles bridge/site/flore et quatre contrôles de rétention passent après ces changements. Ils recouvrent des contrats déjà comptés dans les 138 tests : ne pas additionner ces nombres comme des preuves indépendantes.

Les [mesures détaillées](../research/performance-v91.md) conservent passages initiaux, intermédiaire et profil. Dans les nouvelles parties à trois colons, image p95 tempéré 58,3 ms, boréal 20,8 ms, aride 20,5 ms ; pics jusqu'à 279,2 ms. À cent colons/cent animaux, CPU final p95 131,95 ms, image native p95 25 ms, pic 120,7 ms et débit **2.414×/6×**. Le gain isolé de clonage ne démontre pas une accélération globale du moteur. Oracles de charge, état et stabilité GPU passent.

Build et typage finaux réussis ; le build conserve l'avertissement de taille du module principal (~1,25 Mo minifié). Contrôle documentaire réussi : 347 documents, liens locaux et trois sources originales byte-identiques. Présentation native mine/coupe de 45 secondes chacune, changements de vitesse 6×/1×/3× : aucun saut ni occupation solide détectés, p95 image 8,4/8,5 ms sur ces scènes historiques. Ces scènes ne mesurent pas la densité des nouveaux biomes. [Récapitulatif des contrôles finaux](../../artifacts/biomes-final-checks-v91.json).

## Portée et limites

Aucune nouvelle campagne naturelle de vingt jours n'est imposée à ce lot : les contrôles temporels sont bornés, les reprises exactes et les situations rares explicites. Cela ne démontre pas l'autonomie annuelle de chaque biome ni l'équilibrage intégral de leurs populations. Les campagnes naturelles restent périodiques selon les contrats touchés.

Élevage, reproduction, prédateurs, laine/lait, soins vétérinaires, humidité/succession végétale, neige accumulée, autres biomes et monde restent absents. La dormance Core des espèces sans graphisme défeuillé reste partielle. Les grands fronts production/stockage, vie sociale, narrateur/économie, monde et quêtes restent distincts dans ROADMAP.

G0 en consolidation ; G1/G2/G3 partiels ; G4 engagé ; G5 absent. Aucun jalon global n'est clos par le nombre de contenus ajoutés.
