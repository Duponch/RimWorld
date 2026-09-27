# Sélection, roches libres et dossiers — V129

27 septembre 2026. [Relevé Core et sources](../research/interaction-core-v129.md). Ce lot corrige les interactions visibles sans ajouter de nouvelle décision métier, recette ou règle de collision.

## Sol et objets

Le terrain et un revêtement construits sont lus au **survol**, en bas à gauche : nom, vitesse de déplacement, fertilité, lumière et objets de la case. Le survol ne sélectionne rien et le mode Inspecter ne teinte plus la case. Un clic sur la terre nue efface la sélection. Arbre, fragment physique, repas, meuble, chantier, massif minable et zone restent des cibles distinctes ; les clics répétés parcourent les objets superposés dans un ordre déterministe. La pile et la zone conservent chacune leur fiche et leurs commandes. La fiche d'une plante donne les ordres réels de coupe, récolte ou arrachage seulement quand leurs prédicats métier le permettent. Les objets et massifs sélectionnés reçoivent quatre coins de sélection ; une zone sélectionnée montre son contour, qui n'est plus permanent en mode ordinaire.

Core possède un seul **fragment naturel** par type de pierre : `ChunkLimestone` pour le calcaire, distinct du massif `Limestone` et des blocs fabriqués `BlocksLimestone`. Les nouveaux mondes historiques produisent une pile physique de fragment à la place d'un rocher décoratif ; les sites modernes la produisaient déjà. Le lot de fragments reprend une silhouette facettée arrondie plutôt que les cubes. Au chargement, la validation du schéma précède l'effacement des anciens `Resource.kind='rock'` inertes. Cette normalisation ne crée ni pile, ni ID, ni tirage PRNG, et n'altère pas les fragments existants.

## Dossiers

Le panneau détaillé d'un colon est placé **au-dessus** des onglets, eux-mêmes au-dessus d'un résumé et des commandes. Les six rubriques suivent l'ordre Journal, Matériel, Social, Bio, Besoins, Santé ; un captif garde en plus Prisonnier. Le Journal utilise seulement les échanges/événements réellement consignés dans la fenêtre d'historique conservée, avec filtres social et combat. Santé sépare capacités et affections anatomiques ; Matériel sépare équipement, vêtements et inventaire physique ; Social affiche les deux opinions sans relation inventée ; Besoins donne une jauge d'humeur et les pensées classées. Les commandes existantes restent branchées.

Cette structure ne signifie pas une identité complète de Core. Le moteur ne persiste pas un journal intégral des coups/conversations, les relations familiales et amoureuses, les masses et portages en kg, le total d'armure Core, ni les opérations chirurgicales. Le dossier n'affiche pas des valeurs simulées inexistantes. Les autres fiches d'objets et onglets demandent encore une comparaison cas par cas ; voir [l'état d'implémentation](../gameplay/implementation-status.md).

## Coût et sauvegarde

Le repère des objets utilise une seule géométrie réutilisée, reconstruite au changement de cible ou de contour ; aucun maillage par objet. Le survol est calculé immédiatement au changement de cellule et au plus quatre fois par seconde sur les nouveaux snapshots, avec remplacement DOM seulement si le texte change. Son éclairage dérivé est réutilisé pendant 250 ms entre les cases parcourues, évitant un balayage complet de la carte à chaque mouvement de pointeur. Les grands contours agricoles sont recalculés à leur changement, pas à chaque image. Les formes des fragments sont deux instances dans un lot GPU partagé. Aucun gain FPS ni temps GPU nul n'est déduit de ces choix sans mesure comparative.

Le schéma courant et les fixtures historiques restent inchangés. Les anciens rochers décoratifs disparaissent seulement **après validation** d'une partie chargée ; la quantité de pierre physique disponible ne change pas rétroactivement. [Contrôles et limites](../history/validation-interaction-v129.md).
