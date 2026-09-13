# Désignations rectangulaires — G0

Références utilisateur : chapitres 8 et 10 du rapport, SYS-031..037/041..061, UI-019..024 ; grille et empreintes du chapitre 5. Le corpus demande une séparation entre interaction, intention, validation et travail réel. Le rectangle 3D est notre adaptation de cette interaction ; les raccourcis et détails de parité avec une version précise de RimWorld ne sont pas certifiés par cette livraison.

## Contrat joueur

Abattage, récolte, annulation, création et retrait de cases de réserve acceptent un clic ou un rectangle inclusif. Le sens du tracé ne change pas le résultat. Les cases compatibles sont surlignées et comptées ; obstacles, ressources incompatibles et désignations existantes sont ignorés. La création d'une réserve est additive : elle conserve les réglages de toute réserve déjà présente. Modifier une politique existante reste une action d'inspection explicite.

Annuler un rectangle de chantiers retire chacun une seule fois, y compris un lit dont les deux cellules sont touchées. Les engagements futurs sont libérés ; matériaux portés et déjà livrés restent physiques, aux positions de dépôt prévues par la boucle matérielle. Un bâtiment achevé n'est pas détruit. La création d'un rectangle ne produit ni bois ni nourriture avant le travail des colons.

Murs et lits restent en placement individuel. Les réserves restent des cellules indépendantes, sans nom ni politique commune ; sélection multiple des colons et ordres forcés restent ouverts. Ces limites sont inscrites dans [les décisions](../gameplay/decisions.md).

## Commande et coût

`AreaCommand` transporte action, deux extrémités et, pour une réserve, ses filtres/priorité/capacité. Une seule requête passe au worker ; il revalide l'état au moment de l'exécution et publie un seul résultat. Une preview n'est jamais une autorisation persistée : une case peut changer entre le début du geste et son application. Le résultat donne le nombre d'entités affectées et de cases ignorées.

`queryArea` est une requête pure partagée par preview et moteur. Elle rejette action, extrémités et politique invalides avant d'allouer l'index. L'index transitoire contient un octet par case, construit par un parcours du terrain et des ressources/empreintes/réserves. L'énumération du rectangle suit l'ordre des lignes, z puis x ; elle ne recherche pas toutes les ressources pour chaque case. Un rectangle 250×250 est accepté. La grille, les IDs et les limites existantes de la carte restent l'autorité.

Le moteur prépare la liste admissible avant toute mutation. Une requête invalide, sans cible admissible ou dépassant la capacité des IDs est refusée sans modifier l'état. Un rectangle valide peut être partiellement applicable : ses cases ignorées ne constituent pas une transaction échouée. L'exécution est synchrone dans le worker, sans tick entre les cases. Annulations et retraits libèrent les transporteurs concernés, puis réveillent les planificateurs une seule fois. Le journal reçoit une entrée de synthèse.

Avant une annulation ou un retrait, le moteur réserve conservativement la capacité d'IDs nécessaire aux nouveaux dépôts de piles portées/livrées. Le calcul prend au plus un nouvel ID par pile à déposer ; une fusion réelle peut en demander moins. Une sauvegarde au plafond d'identités peut donc faire refuser l'opération avant tout retrait, au lieu de perdre des matériaux lors d'un dépôt impossible. Cette frontière est couverte dans le scénario de reprise.

Aucun nouveau champ persistant n'est nécessaire : le rectangle est une intention transitoire, son résultat utilise les travaux et cellules du schéma 2. Le JSON de reprise reste exact ; aucune migration de terrain ou de réserve n'est effectuée. Le protocole retourne le bilan dans la réponse de la commande, après publication du snapshot autoritaire.

## Interaction 3D et aperçu

L'ancrage doit être une cellule de carte visible. Le renderer capture le pointeur gauche pendant le geste, suspend les déplacements caméra et projette le pointeur sur le plan logique. Une extrémité passant au-delà du bord dans le canvas est ramenée au bord de la carte. Un relâchement au-dessus de l'interface ou en dehors du canvas abandonne le geste. Aucune commande ne doit apparaître au relâchement suivant une interruption.

Échap, bouton droit pendant le tracé, changement d'outil, ouverture d'un dialogue, changement de carte, perte de focus ou annulation du pointeur suppriment l'intention. Un deuxième bouton de souris peut apparaître dans `pointermove.buttons` sans nouveau `pointerdown` : les deux chemins sont traités. Le bouton droit conserve la rotation de caméra hors tracé. Échap annule d'abord le geste ; une seconde pression ferme le panneau selon le fonctionnement existant.

Le rectangle de fond et les cellules compatibles sont présentés par meshes de surface. Le maillage des cellules utilise l'instancing et grandit par capacité ; il est réutilisé entre gestes puis libéré avec le renderer. Les matrices sont mises à jour lors d'un changement de rectangle ou snapshot pendant le geste, pas à chaque frame. Les personnages conservent leur animation GPU. La couleur et l'aperçu n'ont aucun effet sur les obstacles ou les réservations.

## Vérification

Un scénario de simulation approfondi compare l'admissibilité aux commandes unitaires préexistantes, dans quatre sens de tracé et avec empreintes de lits, obstacles et politiques existantes. Il couvre refus sans mutation, carte 250² entière, débordement d'IDs, reprise exacte, retrait pendant prélèvement/portage et annulation d'un lit approvisionné au milieu d'un autre chantier. Les bilans de matière et invariants restent indépendants des compteurs affichés.

Un parcours navigateur 250² exerce aperçu réellement visible, interruptions, chevauchements préservant les réglages, retrait/reprise et collecte réelle après rotation de caméra. Le parcours matériel antérieur utilise aussi le rectangle pour ses réserves. Les résultats effectivement exécutés et leurs limites sont dans [validation.md](validation.md).

## Mesure CPU de la commande

Reproduction : `node --experimental-strip-types scripts/area-designation-bench.ts`. Le [rapport du 13 septembre 2026, 14:06:56 UTC](../../artifacts/area-designation-benchmark.json) utilise Node 24.11.1, Windows 10.0.26200, Ryzen 5 3600, carte 250²/graine 42, 12 411 ressources et trois colons. Aucune suite navigateur ou autre benchmark du projet ne tournait pendant cette mesure. Les clones et validations sont hors chronométrage. Les requêtes ont deux échauffements puis dix échantillons ; les commandes un échauffement puis cinq paires mesurées en alternant leur ordre.

| Rectangle | Arbres désignés | Requête avec index, médiane | Requête réutilisant l'index, médiane | Commande groupée, médiane | Commandes unitaires, médiane |
|---|---:|---:|---:|---:|---:|
| 8×8 | 2 | 1,262 ms | 0,012 ms | 2,401 ms | 0,485 ms |
| 32×32 | 156 | 1,702 ms | 0,013 ms | 1,846 ms | 10,395 ms |
| 250×250 | 8 024 | 1,151 ms | 0,331 ms | 3,541 ms | Non mesuré |

Le contrôle unitaire reçoit déjà les cibles admissibles : son temps exclut leur découverte. Les mondes finaux complets sont comparés hors chronométrage, à l'exception du journal (une synthèse versus des entrées individuelles). Le cas carte entière n'a pas de comparaison unitaire ; aucun gain relatif n'est inventé. Les petites sélections paient la création d'un index et peuvent coûter plus cher que quelques commandes unitaires. Une fois préparé, l'index peut être réutilisé pour le tracé tant que le snapshot reste le même.

Ces valeurs mesurent uniquement le CPU Node lors de la requête et de l'application. Elles n'incluent ni IPC worker, ni géométrie de l'aperçu, ni rendu des nouveaux ordres, ni coût des ticks qui les exécuteront. Une désignation rapide de 8 024 arbres ne garantit pas une colonie fluide avec 8 024 travaux actifs ; le budget de planification et les limites de congestion restent ceux de G0.
