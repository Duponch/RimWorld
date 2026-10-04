# Compétence Minage — V204

Schéma 186. [Recherche Core](../research/mining-skills-core-v204.md), [minage physique](mining.md), [compétences](skills.md), [lumière](light-work.md), [preuve et limites](../history/validation-mining-skills-v204.md).

## Travail et profil

`skills.mining` est facultatif. Une absence historique présente un niveau 8 neutre, zéro XP et aucune passion, sans créer de pratique passée. Les nouvelles personnes des profils locaux commencent au niveau 8, avec des passions choisies par scénario, sans prétendre reproduire une distribution de biographies Core. Le premier tick réellement travaillé crée le profil absent.

Le mineur doit rejoindre le contact existant, pouvoir travailler et réserver la roche. La vitesse suit `(0,04 + 0,12 × niveau) × Manipulation × (0,5 + 0,5 × min(Vue, 1)) × lumière`, avec minimum 0,1 après les facteurs ; l'incapacité de manipuler empêche le travail. Le corps déjà évalué au tick est réutilisé. La durée du coup est capturée, en flottant Core et avec arrondi aux pairs, puis conservée jusqu'à son impact. Le premier coup lit la vitesse avant l'apprentissage ; les suivants la lisent après les gains des ticks effectivement travaillés. Lumière et capacités ne sont jamais appliquées deux fois. Les dégâts restent 80 pour les murs naturels et les quatre minerais qui héritent de cette catégorie Core.

Le gain de base est 0,07 XP par tick Core, soit 700 milli-XP par tick local. Passion, apprentissage global, saturation quotidienne, dette d'oubli et reset utilisent le moteur commun. Marche, attente et interruption ne produisent aucune XP. Un refus du dépôt final conserve le travail réellement effectué mais n'accorde aucun produit.

## Rendement au fil des coups

La statistique MiningYield utilise la courbe Core vérifiée, la Vue plafonnée à 1 (poids 0,2), la Manipulation plafonnée à 1 (poids 0,3), puis le plafond 1,25. Chaque coup engagé contribue proportionnellement aux PV réellement enlevés ; changer de mineur ne transfère pas tout le rendement au dernier intervenant.

`Tile.miningYield` est une fraction cumulée facultative sur un minerai endommagé seulement. L'absence avec dégâts historiques représente leur contribution neutre `miningDamage / MaxHP`, sans écrire d'état rétroactif. Le cumul local en doubles normalisés à quinze décimales adapte les flottants Core. Sa borne est `1,25 × miningDamage / MaxHP`, avec tolérance numérique bornée. Le dernier coup inclut les PV restants, puis arrondit stochastiquement la quantité, avec minimum d'un produit pour un minerai. Les fragments naturels conservent leur tirage indépendant de 25 % ; compétence et capacités ne changent pas ce rendement.

Le tirage global local déjà présent à l'extraction est prévisualisé puis engagé seulement après admission physique du produit et de son identité. Il sert au résultat local : les tirages internes inutiles de dégâts et les flux distincts du programme Core ne sont pas reproduits. Un refus conserve roche, cumul et PRNG. Annulation et changement de travail conservent les dégâts et le cumul mais libèrent la préparation du coup suivant selon le contrat existant.

## Persistance et présentation

185 est validé strictement avant migration neutre vers 186. Aucun profil, contribution, gain, ressource ni tirage n'est ajouté à une ancienne sauvegarde. Le minimum historique de `pickTicks` reste 100 jusqu'à 185 ; 186 autorise les coups rapides positifs, sans modifier ceux déjà capturés. Les valeurs et clés futures sont rejetées dans les anciens schémas.

Le cache terrain conserve les cinq primitives communes par cellule et les contributions minières dans un registre clairsemé ; il compare aussi le cumul au même tick. Checkpoints, deltas et propriétaires hors carte contrôlent le profil ; les snapshots adoptés restent indépendants. Le rendu ignore le rendement : aucun shader, lot graphique, mesh par mineur ou upload par image n'est ajouté. Bio et Travail présentent niveau, passion, XP, vitesse avant lumière et statistique de rendement ; le tooltip distingue cette statistique du résultat moyen de plusieurs mineurs.

La 50e scène publique préparée compare les niveaux 0, 8 et 20, les gisements et leur rangement, avec les vraies commandes et transitions. Contrôles : contact, courbes, incapacités, apprentissage, changements de mineur, petits rendements, refus atomiques, coup rapide, annulation, sauvegarde/migration et snapshots ; parcours natif et présentation des coups. Les visiteurs et secours civils archivés contrôlent aussi leur profil aux checkpoints/deltas. La régression transversale et le pilote commun périodique sont motivés par l'intégration au moteur de compétences, pas présentés comme une parité exhaustive.

## Limites

Difficulté de rendement minier variable, PNJ Core avec plancher spécifique, dégâts externes, toits de massif, effondrements et biographies aléatoires restent distincts et différés. Le gain ou coût général CPU/GPU ne découle pas de l'absence de nouveau shader ; les mesures publiées doivent borner leur scène et leur sous-coût.
