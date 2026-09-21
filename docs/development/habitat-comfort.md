# Habitat, confort et beauté — contrat V90

Ce contrat décrit le périmètre V90 intégré au moteur. Les valeurs et adaptations proviennent de la [recherche Core 1.6.4871](../research/habitat-comfort-reference-v90.md). Il prolonge la [construction](construction.md), les [matériaux](construction-materials.md), les [pièces](rooms.md), le [repas à table](dining.md), la [propreté](cleanliness.md), les [besoins](needs.md) et l'[humeur](mood.md). La ROADMAP reste le seul calendrier.

## Contenu réellement jouable

Le catalogue ajoute sept constructions utilisables : chaise de salle à manger, fauteuil, table de chevet, commode, table 2×2, table 2×4 et pot de fleurs. Les tables partagent le service de repas physique de la table 1×2. Les chaises et fauteuils partagent les places assises ; une proximité sans occupation ne donne aucun confort.

| Objet | Empreinte | Matières et coût | Travail Core ; minimum | Usage |
|---|---:|---|---:|---|
| Chaise de salle à manger | 1×1 | 45 bois ou acier | 8 000 ; Construction 4 | siège de repas, confort normal 0,70 |
| Fauteuil | 1×1 | 110 tissu ou cuir léger | 14 000 ; Construction 5 | siège de repas, confort normal 0,80 |
| Table de chevet | 1×1 | 30 bois, acier ou blocs | 1 000 | +0,05 au lit dont la tête est adjacente |
| Commode | 2×1 | 50 bois, acier ou blocs | 2 000 | +0,05 aux lits dont le centre est dans un rayon de six cases et en ligne de vue |
| Table carrée | 2×2 | 50 bois, acier ou blocs | 1 500 | table de repas, huit places géométriques au plus |
| Table longue | 2×4 | 95 bois, acier ou blocs | 3 000 | table de repas, douze places géométriques au plus |
| Pot de fleurs | 1×1 | 20 bois, acier ou blocs | 250 | support physique d'une hémérocalle |

Les matériaux sont acquis dans les filières existantes : arbres puis bois, extraction puis acier, taille puis blocs, coton puis tissu, chasse et boucherie puis cuir léger. Le fauteuil exige plusieurs piles sans augmenter la pile maximale de 75. Le choix de matière appartient au chantier ; réservations, portage, restitution, dégâts, feu, désinstallation et sauvegarde conservent cette matière.

Chaise, fauteuil, table de chevet et commode exigent **Mobilier complexe**, projet de 300 points. Tables 2×2/2×4 et pot n'en dépendent pas. Le nouvel Atterrissage forcé révision 5 connaît Mobilier complexe à la création. Une ancienne partie n'acquiert ni recherche, meuble ni matière à la migration ; elle peut terminer le projet par le bureau.

## Qualité et identité des meubles

Lit, tables, tabouret, chaise, fauteuil, table de chevet et commode reçoivent une qualité à l'achèvement : déplorable, médiocre, normal, bon, excellent, chef-d'œuvre ou légendaire. Le tirage utilise la compétence Construction et le flux aléatoire sauvegardé, après prévalidation de l'achèvement. Un refus, une interruption ou une case saturée ne publie aucune qualité et ne consomme pas un tirage de finition.

La qualité multiplie le confort et la beauté positive selon les tables vérifiées dans la recherche. Elle module aussi l'efficacité de repos du lit. La matière reste un facteur séparé : le marbre ajoute sa beauté, les lits en pierre gardent leur pénalité de repos. Table de chevet et commode ajoutent leur bonus avant le facteur de qualité du lit ; leur propre qualité n'amplifie pas ce bonus.

La qualité fait partie de l'identité du meuble. Désinstallation, paquet, portage, stockage, réinstallation, dégâts et sauvegarde ne la recalculent jamais. Les meubles provenant d'un schéma ancien sont interprétés en qualité normale, sans tirage rétroactif ; un schéma ancien refuse tout champ V90.

## Confort utilisé

Le plafond du besoin vient seulement du meuble effectivement occupé. Le sommeil lit le lit possédé ou admis, y compris les deux installations de chambre lorsqu'une ligne de vue relie leurs emprises ; murs, roche et portes fermées la bloquent, les portes ouvertes la laissent passer. La commode mesure les centres réels des emprises. Un repas et le bureau de recherche lisent le siège réellement utilisé. Passer près d'une chaise, cuisiner debout ou travailler sur un chantier ne donne aucun confort. Les autres postes de travail assis ne sont pas encore branchés au besoin ; leur présence dans l'environnement de travail ne suffit pas.

Le confort continue à monter de 0,60 par heure vers le plafond et à baisser de 0,04 par heure hors d'un meuble confortable. Le besoin reste borné à 100 %. La qualité change le plafond et l'efficacité du repos, pas les vitesses du besoin.

## Beauté personnelle et beauté de pièce

Chaque personne vivante sauvegarde un besoin de beauté de 0 à 100, initialisé à 40 pour une nouvelle personne. La cible est dérivée de la beauté visible autour du pion dans un rayon de 8,9 cases et de la séparation des pièces. Le besoin monte de 0,32 par heure, baisse de 0,08 par heure et se fige pendant le sommeil.

Le calcul intègre les éléments audités et physiques : meubles, matériaux, sols, hémérocalle, piles au sol, paquets, corps et traces. Un objet porté, incorporé à un chantier, enterré ou emballé n'existe pas aussi sur son ancienne cellule. Une trace épaisse ne multiplie pas sa beauté négative. Les types non audités restent neutres plutôt que recevoir une valeur inventée.

Les seuils d'humeur sont : au plus 1 % −15 ; sous 15 % −10 ; sous 35 % −5 ; de 35 à moins de 65 % neutre ; 65–85 % +5 ; 85–99 % +10 ; au moins 99 % +15. La contribution rejoint le calcul d'humeur existant et reste explicable dans l'inspection.

La beauté de pièce est une valeur dérivée de sa topologie, de ses cellules intérieures et de ses bordures ; elle n'est pas sauvegardée. Le noyau calcule les bandes hideuse, laide, neutre, jolie, belle, très belle, extrêmement belle et incroyablement belle, mais l'inspection joueur ne les expose pas encore. Une pièce extérieure reliée au bord n'obtient pas un score intérieur artificiel.

L'impression de pièce, la richesse, l'espace Core complet et leurs souvenirs d'humeur ne sont pas livrés. La beauté personnelle ne sert pas de substitut caché à ces systèmes.

## Pot et hémérocalle

Construire un pot ne crée aucune plante. Un cultivateur sème physiquement l'hémérocalle par la file ordinaire de Cultures. La plante exige au moins 30 % de lumière, grandit selon lumière et température, atteint sa maturité biologique en 1,5 jour et son âge total de référence en 4,5 jours. Une plante vivante ou vieillissante apporte 18 de beauté ; une plante morte est coupée physiquement avant un nouveau semis.

Le pot sauvegarde l'autorisation de semer, l'espèce, la croissance, l'âge, la dernière pulsation et les PV. Il ne peut pas être désinstallé tant que la plante n'a pas été coupée. Cette restriction est une adaptation conservatrice locale. Une reprise ne rajeunit pas la fleur et ne double ni le semis ni la coupe.

## Persistance, migration et performance

Le schéma V90 persiste qualité, besoin de beauté et état de fleur. La migration valide d'abord V89 ; elle ajoute seulement beauté 40 aux personnes et qualité normale aux lectures des anciens meubles. Elle ne crée aucune recherche, construction, fleur, ressource, humeur passée ou souvenir.

Les scores de beauté et liens de service des chambres sont dérivés et ne sont pas sérialisés. Le moteur met à jour le besoin tous les vingt ticks et construit une carte partagée par tous les colons de la pulsation ; l'intégration actuelle invalide encore entièrement cette carte à chaque pulsation. Ce coût doit être mesuré et pourra être remplacé par les invalidations locales déjà prévues par le cache, à résultats identiques. Le rendu ajoute les formes aux lots résidents existants : aucun scan n'est exécuté par image et aucun pipeline n'est créé par meuble ou plante. Les mesures CPU, worker, rendu natif et campagne restent successives ; un bon résultat sur trois colons ne vaut pas une garantie à cent.

## Limites explicites

V90 ne livre pas lits doubles, lits d'hôpital, royaux ou pour animaux, sculptures, art, tapis, étagères, commodes de stockage, tables de jeu, richesse/impression complètes, souvenirs de chambre/réfectoire, échec de construction, inspiration créative, couleur personnalisée ni catalogue Core complet. Les autres biomes et leur végétation sont seulement [préparés](../research/biome-diversity-reference-v90.md).
