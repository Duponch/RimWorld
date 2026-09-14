# Identités géologiques — V27

[Recherche et décisions](../research/geology-reference.md). Cinq types Core sont disponibles pour les massifs et pierres décoratives des nouvelles cartes. Ce lot prépare le minage ; il n'ajoute pas encore de tâche de mineur.

## Génération et données

`src/sim/geology.ts` définit les identités, leurs noms, le choix du site et un champ régional déterministe. Deux ou trois types distincts sont choisis ; le meilleur de leurs champs interpolés désigne la roche locale. Les échelles de 80 et 30 cases sont une adaptation artistique et spatiale, indépendante des silhouettes de massifs. Les résultats sont inscrits dans `Tile.stone` sur `terrain: rock` et `Resource.stone` sur les pierres au sol. Ajouter ces échantillons n'avance ni le PRNG de partie ni les tirages des plantes et du relief.

Les cinq types ne sont pas cinq nouveaux matériaux consommables. Leurs points de vie, produits, statistiques de construction et recettes seront introduits avec leurs interactions. Le terrain sous les massifs reste brun dans cette étape ; le prochain lot doit séparer roche pleine et sol découvert avec les règles de déplacement/fertilité correspondantes. Les toits ne sont pas encore simulés.

## Persistance et worker

V26 est validée strictement avant passage à V27. Les champs `stone` sont facultatifs pour conserver les anciennes cartes non typées sans déplacer ni régénérer quoi que ce soit. Présents, ils exigent un type connu et un porteur rocheux ; V1–V26 les refusent. Le générateur actuel renseigne toutes ses roches. Une sauvegarde V27 peut légitimement mélanger des objets historiques non typés et du contenu typé.

Le cache des snapshots conserve séparément terrain et identité. Un changement de type seul produit un delta ; une suppression explicite du type revient au contenu historique. Les deltas conservent les tableaux des images précédentes et refusent un type sur une plante ou un sol ordinaire. Aucune géologie n'est recalculée au chargement.

## Présentation et coût

`stone-palette.ts` est purement graphique. Les teintes changent dans les attributs existants ; aucun matériau, maillage ou appel de rendu supplémentaire par espèce. Le masque compact de `RockLayer` détecte aussi les changements d'identité ; ses slots et buffers survivent aux retraits/restaurations. Une modification touche au plus neuf cellules de surface, avec les coûts de comparaison/indices déjà décrits dans [rochers et plantes](rocks-and-plants.md).

Les pierres isolées utilisent le même type en proximité et panorama. Un remplacement de leur identité reconstruit le chunk de proximité concerné ; leur identité n'évolue pas chaque tick. L'inspection indique le type ou l'origine historique non définie, et ne prétend plus afficher une quantité récoltable pour un décor inexploitable.

## Validation et suite

Les scénarios existants de génération, surface rocheuse et snapshots sont enrichis : continuité statistique, cinq types rencontrés, cartes de bord, absence de mutation/RNG, sauvegarde exacte, rejet des champs invalides, delta d'identité seul, retrait/restauration et buffers résidents. Le court parcours UI inspecte les cinq types puis recharge une carte historique. Le pilote de colonie reste inchangé dans ses décisions : aucune nouvelle commande ne lui est disponible ; son exécution de plusieurs jours vérifie les boucles existantes avec le nouveau contenu.

Le banc `rock-edit-bench.mjs <rapport.json> [legacy]` compare les couleurs typées au témoin historique sur la même topologie/caméra. Ses excavations sont des injections graphiques, jamais du minage jouable. Voir [preuves](validation.md) pour les résultats, limites et contrôles effectivement réalisés. La prochaine étape traite accès/travail du mineur, progression persistante, produit au sol, terrain révélé, ordres et logistique ; les dépendances de toit doivent rester explicites.
