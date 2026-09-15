# Minage physique — V28

[Vérification de référence](../research/mining-reference.md), [géologie](geology.md), [logistique](material-logistics.md), [mouvement](spatial-motion-storage.md).

## État et transitions

`Tile.miningDamage` appartient à la roche ; absence signifie intacte. `mining-rules.ts` centralise PV, coup de 80, cadence neutre de 10 ticks et probabilité de fragment de 25 %. Un job `mine` réserve une seule case pleine. `job.progress` compte la préparation du prochain coup, jamais la santé de la roche. Annulation et interruption remettent cette préparation à zéro mais conservent les dégâts. Une sauvegarde conserve aussi la préparation engagée.

Le colon rejoint l’une des huit cases de contact, s’y arrête et regarde sa cible. Le corps garde les règles de coins solides pour ses déplacements. Les dégâts n’apparaissent qu’après arrivée ; les besoins, horaires et ordres forcés utilisent leurs contrats existants. Chaque extraction réveille les planificateurs et invalide les obstacles locaux au tick, permettant d’avancer dans le massif désigné.

`mining.ts` prépare le dernier coup et le tirage sans modifier le PRNG. Le produit éventuel et son dépôt doivent être admissibles avant engagement ; un refus conserve roche et PRNG. L’extraction remplace la case pleine par `rough-stone` avec la même identité et dépose éventuellement un fragment sur cette case. Le sol existe dans la simulation, reste non fertile, constructible et utilisable pour une réserve. Ni toit ni effondrement ne sont simulés dans les massifs actuels.

## Fragments et transport

Six ItemId : `granite-chunk`, `limestone-chunk`, `marble-chunk`, `sandstone-chunk`, `slate-chunk`, `legacy-chunk`. Catégorie `chunk`, limite de pile 1, nutrition zéro. Ils ne deviennent ni bois, ni nourriture, ni blocs taillés. Les anciennes vues `World.stock`/escrow restent consacrées aux deux catégories historiques ; les piles sont l’autorité pour les fragments et leur inspection.

Le filtre `StorageFilters.chunk` absent vaut refus. Architecte → Ordres → **Transporter les fragments** pose `haulRequested` sur les piles au sol ; les tâches automatiques les prennent ensuite vers une réserve admissible. Sans désignation, pas de rangement automatique. Le clic droit utilise le fournisseur quantitatif existant ; le dégagement d’un chantier reste possible sans désignation de rangement. Prise, portage, interruption, dépôt, file et sauvegarde gardent type et quantité. Le drapeau de transport disparaît à la prise ; il ne constitue pas un inventaire personnel.

Les fragments ralentissent l’entrée de 4,2 ticks locaux, avec non-répétition entre objets qualifiants. Ils sont traversables mais exclus des arrêts ordinaires. Le sol brut ajoute un minimum continu de 0,2 tick : coût maximal terrain/objet, pas leur somme. Le coût de sol ne disparaît pas entre deux meubles/fragments. Recherche et durée d’arête appliquent la même règle ; le délai capturé reste valide si le fragment est retiré pendant le passage. Autres terrains et statistiques de déplacement restent incomplets.

## Persistance, snapshots et rendu

V27 est validée strictement avant migration vers V28 ; Minage reçoit priorité 2. La carte, ses objets, ses routes et ses anciennes identités restent inchangés. Une roche historique sans type reste sans type ; son profil provisoire est 500 PV et son produit `legacy-chunk`. Les schémas antérieurs refusent dégâts, sol brut, fragments, filtre et priorité de minage. Le validateur rejette aussi dégâts hors PV, catégorie incompatible, pile de plusieurs fragments et livraison d’un fragment à un chantier de bois.

Le delta de terrain transporte aussi les dégâts, y compris leur suppression après extraction ; les snapshots déjà adoptés restent immuables. Le maillage ignore les changements de PV. Les massifs conservent leurs buffers et seules les cellules voisines d’une ouverture sont réécrites. Le plan de sol rocheux est déjà présent sous le massif : l’extraction ne reconstruit pas les chunks du terrain. `terrain-state.ts` compare les surfaces sans créer de chaîne ou tableau pour la carte entière à chaque dégât ; un vrai changement de sol ou de roche reste détecté. Les fragments utilisent les lots d’instances existants ; la cargaison garde les trajectoires GPU communes au corps et à la sélection. Les six variantes de cargaison ajoutent de la géométrie constante au lot partagé, aucun mesh par colon.

## Validation et suite

Trois scénarios profonds de minage vérifient cinq roches, contact diagonal, annulation, dommages persistants, reprise au coup près, snapshots, ouverture progressive, produit typé, transport demandé, réservations, sol non cultivable et mouvement pondéré. Le pilote de colonie ouvre quatre cases après installation du camp et range les fragments obtenus ; les bilans bois/nourriture restent indépendants. Le parcours UI utilise les vrais outils, priorités, réserve et sauvegarde. Mesures CPU/snapshots et rendu avec 3/30/100 mineurs : voir [validation](validation.md).

Restent : conversion des pierres décoratives historiques, taille des fragments, blocs et matériaux de construction, minerais, compétences/capacités/XP, dégâts externes, lissage, sous-sols variés, toits, effondrements et couverture de combat. La mécanique livrée ne ferme pas la famille « roches » ni G2.
