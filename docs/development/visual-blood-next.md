# Prochain chantier demandé — sang et présentation des acteurs

Demande utilisateur du **3 octobre 2026**, reprise à sa relance en mode jour dans [V196](visual-blood-v196.md). Le périmètre original ci-dessous conserve ses conditions ; le contrat et la [preuve](../history/validation-visual-blood-v196.md) distinguent résultat livré et texture fine de l’herbe différée. Aucun chantier autonome suivant n’est autorisé.

## Résultat attendu

- Le sang présent au sol doit aussi marquer les brins d'herbe de cette surface.
  Les corps humains et animaux doivent porter des traces cohérentes avec leurs
  blessures et leur saignement, en conservant identité et état clinique.
- Un animal mort conserve son modèle, ses proportions, sa fourrure et ses
  couleurs de vivant. Il est couché comme pendant le sommeil, avec les yeux en
  croix ; supprimer le rendu gris, aplati ou cubique constaté par l'utilisateur.
  La pose graphique ne modifie ni l'anatomie, ni la dépouille, ni son rendement.
- Vérifier les sons de douleur animaux déjà présents et ajouter des râles humains
  aux coups ou blessures confirmés. Éviter les doublons lors d'une reprise ou
  d'un snapshot ; conserver variations, spatialisation et budgets du son courant.
- Faire suivre aux couleurs des brins d'herbe les variations peintes du terrain,
  **seulement si cela n'ajoute pas de coût de rendu**, conformément à la condition
  utilisateur. Examiner d'abord la réutilisation ou la préparation des couleurs
  existantes ; si un coût supplémentaire est nécessaire, ne pas livrer cet effet.
- Vérifier si les colons montent actuellement sur les chaises et autres obstacles
  franchissables. Si c'est confirmé, supprimer cette montée visuelle : traverser
  le meuble en restant au niveau de marche. Confronter précisément la règle à
  RimWorld Core, sans supprimer coût logique, accès, collision des murs ou
  réservations des interactions assises.

## Contraintes de reprise

Lire les contrats de [présentation](playability-validation.md), de
[préparation GPU](shadow-preparation.md), du [son courant](audio-v175.md), de
[fourrure et fragments](visual-audio-v185.md), ainsi que les sources actuelles
des acteurs, carcasses, herbe et filth avant de confirmer les causes. Les
recherches et contrôles du lot sont désormais consignés dans V196 ; leur portée
reste bornée par sa preuve. Préserver la modification utilisateur de l'herbe déjà committée.

Conserver les lots et matériaux résidents, les changements au tick confirmé,
les options sans texture et les propriétaires des buffers. Aucun mesh, squelette
ou recherche métier supplémentaire par acteur et par image. Distinguer coût de
préparation, uploads lors d'un changement et coût CPU/GPU permanent ; ne pas
annoncer un coût nul sans preuve. Contrôles ciblés, puis mesures et inspection
matérielle successives, selon les contrats réellement touchés.
