# Acier compacté — contrat V29

V41 ajoute les [composants industriels](components.md) au registre commun des gisements. L’acier conserve son flux, ses recettes et son rendement.

Recherche, provenance et limites : [vérification Core](../research/steel-reference.md). Dépend de [minage](mining.md), [géologie](geology.md), [logistique](material-logistics.md) et [mouvement](spatial-motion-storage.md).

`Tile.ore='steel'` identifie un gisement plein, séparément de `Tile.stone`, sa roche encaissante. Champ autorisé uniquement sur `terrain='rock'`, à partir de V29. `ore.ts` contient définition et génération ; elle s’exécute après le relief et la géologie, ne change ni accessibilité, ni ressources végétales, ni IDs, ni PRNG de travail. Les groupes connectés sont séparés d’au moins une case cardinale ; tailles 30–40, densité du site provisoire. Un petit massif peut manquer d’acier, sans création artificielle d’un nouveau massif.

Le job de minage et ses réservations restent communs. PV 1 500, coup 80, cadence neutre dix ticks locaux, donc 190 ticks de travail effectif sans trajet. Dégâts conservés sur la case, préparation du coup sur le job. L’extraction prévalide un dépôt de **40 acier** avant suppression du gisement et engagement du tirage. Le sol brut conserve `stone`, perd `ore` et `miningDamage`. Aucun fragment de pierre n’est généré en plus. Les futurs rendements variables ou dégâts externes exigent une évolution du suivi des dégâts avant livraison.

`ItemId='steel'`, catégorie `steel`, pile de 75, nutrition nulle. Les piles sont l’autorité ; le compteur de gauche somme l’acier physique hors chantier. L’ancien `World.stock` bois/nourriture demeure une vue historique ; les recettes V30 lisent directement les piles typées. Livraison autorisée aux chantiers qui demandent de l’acier, jamais en substitution du bois ni comme combustible. Transferts, réservations et sauvegardes conservent item et quantité. Les piles se divisent/fusionnent au cours du transport ordinaire, sans désignation supplémentaire.

`StorageFilters.steel` absent signifie refus, notamment après migration. La nouvelle case de filtre apparaît dans Architecte et l’inspection d’une réserve ; les commandes revalident le booléen. Les formulaires ne changent pas silencieusement les anciennes réserves. Le pilote de colonie vise deux gisements après les quatre cases de pierre, puis 80 acier rangés ; il choisit des cases libres, et ne suppose pas que le décor a laissé vide une coordonnée fixe.

La pile d’acier se traverse et permet un arrêt. Coût continu de 1,4 tick, non supprimé par deux meubles successifs ; recherche entière 467 avec base 1 000. Les valeurs continues partagent actuellement la carte `floors` du profil de navigation avec le sol : cette carte signifie un plancher de coût non répétable, pas une nouvelle autorité de terrain. Le maximum s’applique, sans additionner acier et sol. Les arêtes déjà engagées conservent leur délai capturé.

V28 est validée avant passage à V29, sans ajout de minerai, de pile, de filtre ou de quantité. Les anciens schémas refusent les nouveaux champs/contenus ; le validateur actuel refuse minerai hors massif, type inconnu, dégâts hors PV et livraison d’acier à un ancien chantier. Le delta de terrain ajoute une cinquième composante optionnelle `ore`, avec validation et suppression explicite à l’extraction. Les snapshots antérieurs demeurent immuables.

Le rendu teinte et facette les sommets déjà présents dans RockLayer : aucun nouveau matériau, lot ou buffer pour les gisements. Les dégâts n’actualisent aucune géométrie ; extraction locale comme V28, terrain déjà dessiné dessous. Piles d’acier en barres dans les lots instanciés existants ; une variante constante de cargaison GPU partagée, aucun objet graphique par colon. La [préparation des ombres](shadow-preparation.md) reste active.

Validation : scénario profond minage enrichi (génération, dégâts/reprise, saturation, produit, 75+5 après fusion, type réservé, marche, migration), ressources GPU conservées et pilote multi-jours. Les exécutions réellement obtenues sont dans [validation](validation.md).

**Restent absents** : fabrication de blocs, autres ateliers/minerais, recherche jouable, compétences/capacités et dégâts externes, masse réelle de portage, toits, lissage, strates et stocks initiaux Crashlanded. V31 livre la table de taille avec sa recette constructive mixte.

## Usage constructif V30

L’acier est utilisable pour les cinq familles à matériau substituable de V30, puis la table de taille V31. Les [recettes et transferts](construction-materials.md) conservent son type, y compris dans les restitutions ; les [ingrédients mixtes de l’atelier](stonecutter.md) sont livrés, la fabrication de blocs reste à développer.
