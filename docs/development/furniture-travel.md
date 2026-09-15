# Transit et arrêt sur le mobilier — V22

V40 : le refroidisseur passif utilise le profil traversable sans arrêt, supplément 3 ticks locaux et non-répétition commune. Une case, pas de surface de pile ni de toit porteur ; [contrat](passive-cooling.md).

[Recherche Core et incertitudes](../research/furniture-travel-reference.md). Ce contrat complète [sol/mouvement](spatial-motion-storage.md) et [chantiers](construction.md), sans modifier les permissions d'objets/zones V21.

## Profils

| Objet | Traverser | Arrêt ordinaire | Supplément local d'entrée | Supprime la répétition |
|---|---|---|---:|---|
| Mur | Non | Non | — | Non |
| Table de taille V31 | Oui | Non | 5 ticks | Oui |
| Table | Oui | Non | 4,2 ticks | Oui |
| Lit | Oui | Non ; sommeil réservé autorisé | 4,2 ticks | Oui |
| Feu | Oui | Non | 4,2 ticks | Oui |
| Tabouret | Oui | Oui | 3 ticks | Oui |
| Piquet | Oui | Oui | 1,4 tick | Non |
| Cadre | Oui | Non | 1,4 tick | Non |
| Plan | Oui | Oui, sous contraintes du service | 0 | Non |

Une entrée depuis un autre meuble qualifiant supprime le supplément, même entre définitions différentes. Une entrée depuis le sol le paie ; sortir sur le sol n'ajoute rien. Durée : `3 × distance euclidienne + supplément`, capturée dans `motion.terrainDelay`. Les coordonnées restent celles de la grille ; l'arête engagée ne change pas si le contexte est modifié. Les vitesses de base et les autres coûts environnementaux restent partiels.

## Responsabilités et destinations

`furniture-travel.ts` centralise profils, vérification ponctuelle sans allocation d'empreinte, suppléments et capture des coûts/cellules sans arrêt. `WeightedSearch` compare des coûts dirigés dépendant de la cellule précédente. La file de Dial est dimensionnée par le supplément maximal capturé. `CandidateAccess` prouve toujours seulement la connectivité ; sa recherche pondérée partage le même instantané. Aucun cache commun à plusieurs ticks/acteurs.

`routeToJob` et les candidats de travail excluent les cellules sans arrêt. `routeToCell` conserve son rôle de destination exacte : le consommateur doit vérifier le service, notamment l'exception du lit. Cuisine, repas, loisirs et sommeil au sol utilisent leurs contrôles de destination. Les plans restent plus restrictifs pour certains choix de services déjà existants ; ce n'est pas une implémentation complète des modes d'arrivée Core.

`transit-exit.ts` laisse finir un trajet à travers le meuble avant toute nouvelle action stationnaire. Après annulation ou disparition d'un objectif, il cherche une sortie standable sur la frontière des ouvrages, respecte les services réservés et utilise le budget ordinaire. Pas de téléportation, pas de poussée des autres colons. Un budget épuisé ou l'absence de sortie peut entraîner une attente ; aucune garantie de fluidité universelle n'est déduite de ce repli. Une tâche ou une cargaison encore valide est conservée. Les services devenus incompatibles sont libérés selon le contrat conservatif existant.

Depuis l'audit sous V34, cette énumération capture les cellules sans arrêt une fois, après libération éventuelle du service, au lieu de rescanner chaque meuble pour chaque voisin. Ordre des buts inchangé ; capture jetée avant toute mutation. [Contrat de durée de vie](spatial-queries.md).

`Pawn.transitExit?: true` mémorise ce trajet lorsqu'aucune tâche métier ne suffit à le représenter. La sauvegarde exige une arête physique ; l'arrivée sur une cellule admissible efface l'intention. Les commandes qui libèrent le travail l'effacent, sans modifier l'arête en cours. Le dormeur à son lit réservé conserve son usage ; sa traversée ne prend pas le lit d'un autre.

## Présentation GPU

`furniture-motion.ts` crée un petit index de hauteurs par snapshot. `PawnLayer` renseigne les hauteurs dans **aFrom/aTo existants**, au même moment que les extrémités de trajet. `pawn-presentation.ts` fournit une formule TSL partagée par corps, cargaison et anneaux. X/Z et orientation restent ceux du déplacement autoritaire ; seul Y monte durant le premier tiers ou descend durant le dernier tiers. Le proxy de sélection applique la même formule de hauteur.

Aucun nouveau lot de personnages ni attribut d'instance ; pas de mise à jour de squelette CPU. Il existe néanmoins un coût de préparation par snapshot et quelques opérations shader : mesurer, ne pas annoncer un coût total nul. Le lit et la position assise gardent leurs poses de service. Les transitions vers ces poses et les passants superposés restent stylisés, sans évitement physique.

## Migration V21 → V22

Valider **V21 avant migration**, avec ses tables solides et anciennes durées. Une sauvegarde portant déjà un colon sur une table ne peut se prétendre V21 valide. Changer ensuite la version ; garder positions, horloge, PRNG, matière et arêtes engagées. Leurs anciens suppléments peuvent être absents ou valoir 1,4 : ne pas les recalculer depuis le nouveau décor.

Une ancienne place de repas désormais interdite passe en recherche de place après prélèvement, avec la portion conservée. Les postes de cuisine/loisirs et couchages au sol incompatibles sont libérés ; si le dépôt nécessaire est impossible, le chargement échoue avant adoption. Les autres engagements restent en place et la file est réconciliée. V22 accepte uniquement les suppléments capturés autorisés (1,4/3/4,2), leurs durées et délais cohérents. La même clé de stockage est conservée ; migration explicite, pas de régénération de carte.

## Vérification

Deux scénarios `furniture-travel.test.ts` : oracle indépendant des coûts dirigés dans quatre orientations, arêtes capturées, accès progressif, transit/arrêt, portages opposés, interruption sur table, conservation et continuation. La famille spatiale conserve les traversées de lits ; construction contrôle une place de repas réservée depuis un checkpoint synthétique. Le pilote ordinaire suit aussi les suppléments et sorties dans son bilan.

Le parcours natif de déplacement observe les attributs réellement soumis, leur partage corps/cargaison/anneau, la vitesse par arête, le portage sur table et la reprise dans le worker. Ce n'est pas une lecture des sommets calculés sur GPU. Captures inspectées, trois jours par UI et audits séparés : voir [validation courante](validation.md).

V31 ajoute le supplément 5 de la table de taille ; V30 refuse cette valeur avant migration. Le même oracle dirigé couvre ses trois cases dans quatre rotations. La hauteur du plateau est de 0,85 m, partagée avec les piles et poses de transit. [Contrat](stonecutter.md).
