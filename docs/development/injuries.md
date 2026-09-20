# Module des lésions

**Actif depuis V45 via le [contrat de santé](health.md), complété en V81.** Le module isolé initial V44 reste séparé de la propriété World ; `Pawn.health` et `health-save.ts` ajoutent horloge, activité et migration stricte. Le premier dommage jouable était la toiture construite ; tirs, mêlée et chasse utilisent désormais leurs producteurs distincts. Secours et soins physiques sont livrés en V46–V51. V81 branche les [infections de plaies](infections.md) sur ce noyau partagé humain/lièvre. [Recherche du module](../research/injuries-reference.md).

## Responsabilités

- `injury-rules.ts` : sept familles actuelles (coupure, écrasement, fissure, contusion, balle, morsure, entaille d’achèvement), propriétés des parties, unités et seuils. Les métadonnées peau/solide ne sont pas des matériaux de rendu.
- `injury-types.ts` : lésions identifiées, racines manquantes, perte sanguine, horloge et décès du dossier. Pas de barre de vie globale ni copie des 64 parties saines.
- `injury-state.ts` : impact déjà résolu, retrait anatomique, projection des capacités, douleur/saignement et résultat physiologique d’un soin.
- `injury-evolution.ts` : évolution sur un intervalle à contexte constant ; sélection de plaies, guérison et évolution sanguine.
- `injury-validation.ts` : validation stricte du dossier isolé. Elle ne valide ni les réservations du monde ni une migration de `Pawn`.
- `infection-*` : risque des nouvelles plaies, conditions infectieuses séparées, immunité commune, traitements renouvelables et validation dédiée ; voir [le contrat canonique](infections.md).

Le producteur doit résoudre cible/partie, protections et éventuelle conservation d’un membre extérieur à un PV **avant** `addResolvedInjury`. Les dégâts retenus restent dans la lésion même au-delà des PV d’un os protégé : son plancher anatomique n’est pas une immunité à la douleur ou au traumatisme. Pour une partie non racine à zéro PV arrondi, les lésions et retraits descendants sont remplacés par une seule racine manquante. Le torse reste une lésion létale, pas une entrée d’amputation.

Les identités médicales sont locales au dossier, monotones et distinctes des objets. Coupures distinctes ; écrasements non soignés/non permanents fusionnables avec l'ancien seuil de cicatrice conservé et l'âge remis à zéro. Le choix PRNG appartient au propriétaire ; pas de `Math.random`, pas d'équivalence de séquence avec Unity promise. Un consommateur ne modifie pas un dossier partagé avec un snapshot.

La fusion conserve aussi le risque infectieux de la plaie survivante, sans nouveau tirage. Une plaie guérie perd son risque encore en attente ; une infection déjà déclarée demeure indépendante. Perdre une partie retire les risques et infections de son sous-arbre. Les plaies historiques dépourvues de champ de risque restent neutres après migration. Une cicatrice devenue permanente après l’impact conserve l’échéance choisie auparavant, conformément à la branche de référence retenue.

## Temps, arrondis et décès

Les PV utilisent des millièmes entiers. Douleur et évolution sanguine utilisent des numérateurs entiers pour préserver les seuils ; `BLOOD_UNIT=300 000 000` représente toute la perte sanguine, pas un pourcentage affichable directement. Cette résolution reproduit exactement un tiers/jour et les taux retenus. Les PV anatomiques arrondis suivent la règle au pair du socle. Quantification des tirages de cicatrice au millième et PRNG propre sont des adaptations numériques documentées.

60 ticks Core deviennent six ticks du jeu ; 600 deviennent 60, en préservant le jour de 6 000 ticks. Le propriétaire fournit une phase stable 0..59, une posture effective et l’état de famine. L’intervalle doit être coupé dès qu’ils changent. La posture `bed` signifie un lit réellement utilisé ; ce module ne prouve pas son accès. Le bonus de soin est une seconde sélection après guérison naturelle, et non une distribution à toutes les lésions. Les résultats `tendInjury`/`tendMissingPart` sont des opérations physiologiques internes, **pas des commandes de soin à distance**.

V81 étend ce contexte avec faim, repos, bonus de repos réellement admissible et graine stable du patient. Les infections évoluent à leur cadence distincte, en milliardièmes de gravité/immunité ; elles ne retirent pas de PV anatomiques. Leur douleur n’est pas divisée par l’échelle corporelle du lièvre. Les conséquences de gravité sont évaluées avant le gain d’immunité : atteindre l’immunité au même pas qu’une gravité létale ne ressuscite pas le patient. `tendInfection` reste, lui aussi, un résultat interne d’une action physique.

Le dossier sain avance sans parcours anatomique. Le passage d’un seuil sanguin réévalue le risque vital ; les variations entre seuils ne recalculent pas toutes les capacités. Une lésion ajoutée réévalue immédiatement ce risque. Après décès, dossier et horloge médicale sont figés ; le propriétaire conserve l’identité et prend en charge dépouille, cargaison et notifications. Le module ne supprime aucun colon et ne crée aucun cadavre. `downed` et `mobile` sont dérivés ; `health.ts` les applique maintenant aux actions et à la présentation.

## Validation et limites

Huit scénarios de blessures, plus sept d’anatomie : seuils, côtés, organes/solides, racines perdues, coagulation, guérison par posture et famine, soin nul/élevé, cicatrices permanentes, dégâts létaux progressifs et arrêt irréversible. Le parcours de plusieurs jours couvre chaque partie non conceptuelle, sauvegarde JSON du dossier **et du PRNG**, puis continuation en lot contre pas unitaires. Il s’agit d’une validation du module, pas de la sauvegarde du monde ou d’une partie joueur médicale.

Le banc `scripts/injury-bench.ts` mesure 3/30/100 dossiers, 0/1/20/100 petites coupures, phases réparties et copies séparées. La famine imposée maintient les plaies pendant la mesure ; il ne mesure ni une charge de soins, ni navigation, worker ou GPU. [Mesures et limites](../history/validation-health-preparation-v44.md#module-médical-isolé--16-septembre).

Intégration au monde, sauvegarde, interruption et premiers dommages livrés en [V45](health.md), avec ses adaptations explicites. Secours, soins physiques et alimentation du patient sont livrés en V46–V51 ; tirs, mêlée et chasse ont depuis leur boucle jouable. V81 ajoute une première infection et son immunité, avec validation complémentaire décrite dans [infections](infections.md). Autres maladies, prothèses, chirurgie et blessures non destructrices de bagarre restent absentes ; les soins vétérinaires ne sont pas livrés. Les preuves V44/V45 ci-dessus ne valident pas ces ajouts ultérieurs.
