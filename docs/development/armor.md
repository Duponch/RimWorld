# Protection corporelle — noyau préparatoire sous V62

**Statut : code isolé testé ; aucune protection jouable encore branchée.** La prochaine livraison reste l'habillement physique et ses effets. Aucun changement de schéma, de sauvegarde, d'objet obtenu ou de comportement de combat par cette extraction. [Recherche renouvelée](../research/apparel-reference.md), [preuves](../history/validation-armor-boundary.md), [priorité canonique](../ROADMAP.md).

## Frontière

`src/sim/armor.ts` compile une couverture anatomique immuable puis résout un impact sur des instances explicitement fournies. Il ne connaît ni World, ni propriétaire, ni horloge, ni rendu. Un profil rassemble couches, parties couvertes et dernière couche ; il se construit une fois par définition. La compatibilité utilise l'intersection réelle des parties couvertes, y compris les groupes aux noms distincts qui se recouvrent. La couverture n'est pas héritée des parents anatomiques.

L'entrée contient des statistiques déjà résolues par matière/qualité, l'identité et les PV de chaque pièce, la partie exacte touchée, les dégâts et leur pénétration. Le tableau conserve l'ordre stable de portage pour les égalités de dernière couche. Le tri local ne modifie jamais ce tableau. Une pièce multicouche n'est traitée qu'une fois. Le module applique ensuite la protection corporelle fournie ; il ne simule pas des implants ou une race supplémentaire.

La sortie est une transaction : dégât final, catégorie finale et changements de PV demandés aux pièces touchées. Les entrées ne sont pas modifiées ; une destruction n'est engagée que par le futur propriétaire de la transaction. Le classement et la statistique de la pièce sont ceux d'avant son usure. Après conversion de Sharp en Blunt, les couches suivantes continuent à lire la statistique Sharp capturée. Une déviation arrête les pertes des couches plus profondes. La protection de chaleur est une catégorie de dégâts, pas l'isolation thermique d'un vêtement.

Les tirages sont fournis par l'appelant, validés dans [0,1[ ; les formes invalides sont rejetées avant tout tirage. Une exception après tirage n'altère aucun vêtement, mais **le callback RNG a pu avancer** : l'appelant doit utiliser un PRNG local et ne l'engager qu'après réussite, avec dossier médical et usure. Aucune sauvegarde n'est exposée à mi-transaction. L'arrondi stochastique consomme un tirage même à l'entier. L'armure nulle consomme aussi son jet. Les valeurs d'armure du noyau admettent les résidus dépassant 100 % ; le plafond de statistique Core appartient au producteur du profil, encore absent.

## Intégration restante

1. Instances de vêtements, acquisition, propriétaire séparé, réservations, manipulation physique, annulation et sol saturé ; validation du schéma précédent avant migration neutre.
2. Profil matière/qualité et parties exactes ; l'habillement reste porté à terre. Détruire une pièce ne crée pas de ressource fantôme. Distinguer usure de combat et usure quotidienne.
3. Tir, mêlée et effondrement passent la pénétration et la bonne catégorie. Protection après choix de partie, avant propagation ; conversion de blessure sans changer de worker anatomique. Conserver pouvoir d'arrêt, récupération de l'attaquant et réveils V62, y compris les impacts déviés selon leur événement sonore.
4. Identité carte/portrait commune, attributs GPU stables, sol et apparence appliqués au même temps de scène. Le vêtement cosmétique historique ne vaut pas protection.
5. Scénario physique sauvegardé à chaque phase, pilote de colonie équipé par commandes, UI réelle 1×/6× et audit mixte une fois les consommateurs branchés. Le noyau testé seul ne clôt ni GAP-007 ni G3.
