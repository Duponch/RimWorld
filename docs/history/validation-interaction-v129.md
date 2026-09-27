# Validation de la sélection et des dossiers — V129

27 septembre 2026. Sources du relevé : [Core 1.6.4871](../research/interaction-core-v129.md). Contrat : [sélection et inspection](../development/selection-inspection-v129.md). Révision des règles métier, du catalogue et du schéma de sauvegarde : **aucune**.

## Frontières vérifiées

- Les définitions Core distinguent le massif `Limestone`, le fragment naturel `ChunkLimestone` et les blocs taillés `BlocksLimestone`. Le fragment peut avoir plusieurs silhouettes graphiques, mais pas une seconde identité de caillou décoratif. Les nouveaux mondes n'émettent plus de `Resource.kind='rock'`. Une ancienne partie est d'abord validée selon son schéma, puis seules ces ressources décoratives inertes sont ôtées ; les fragments physiques, matières, identifiants et tirages restent conservés.
- Un clic sur terre nue désélectionne ; le survol y lit le terrain sans case teintée. Pile alimentaire et zone agricole superposées se parcourent par clics successifs. Le sol riche affiche sa fertilité au survol. L'arbre sélectionné montre ses quatre coins et la commande « Couper du bois » crée une vraie désignation. Le contour des champs reste visible en outil de zone ou à la sélection, sans liseré permanent.
- Les six dossiers de colon sont placés au-dessus du résumé. Le Journal filtre les événements réellement conservés ; Santé, Matériel, Social et Besoins affichent les faits persistés par le moteur. Les captifs gardent l'accès aux besoins et au Journal. Aucune masse de portage, parenté, opération chirurgicale ni armure globale n'est inventée pour imiter une capture Core.
- Le nouveau survol ne crée aucun objet GPU et évite la reconstruction de l'éclairage à chaque cellule traversée. Les équerres de sélection partagent une géométrie ; les fragments restent dans les lots instanciés. Il n'y a pas de mesure A/B FPS ou GPU qui prouve un coût nul, 240 FPS ou un débit ×6.

## Exécution

- `npm run test -- tests/map-selection-v129.test.ts tests/loose-rocks-v129.test.ts tests/inspection-dossiers.test.ts tests/journal-inspection-v129.test.ts tests/colonist-inspector.test.ts tests/bridge-snapshot.test.ts tests/generation-profile.test.ts tests/stylized-surfaces.test.ts` : **29 tests / 8 fichiers réussis**.
- `npm run build` : typage et bundle réussis ; avertissement de taille du gros paquet client déjà présent.
- Parcours Chromium/WebGPU natif `map-selection-v129.spec.ts` : repas, zone, sol nu, sol riche, arbre et ordre de coupe réussis. `colonist-dossiers-v129.spec.ts` : ordre des panneaux, Journal et rubriques réussis. Les anciens parcours `equipment.spec.ts`, `mood.spec.ts`, `prisoners.spec.ts`, `farming.spec.ts`, `deconstruction.spec.ts` et `textile.spec.ts` passent avec leurs attentes de sélection adaptées.
- Le parcours historique `scenario-start.spec.ts` n'est **pas vert** : ses premières attentes exigent encore « Options » désactivé et l'ancien ordre de tabulation, puis une révision de site 1 alors que le menu et le site courants ont évolué. Il échoue avant d'atteindre la vérification du survol modifiée ; le nouveau parcours ciblé teste directement terre ordinaire et terre riche. Trois anciens oracles unitaires V44/V51/V63 fabriquent aussi des schémas anciens à partir de politiques alimentaires modernes et échouent pour cette raison préexistante. Aucune validation de sauvegarde n'a été assouplie pour les faire passer.

## Écarts qui restent

Core permet le chevauchement civil de deux colons au repos ; la réservation des **destinations tactiques** est distincte. Le relevé n'indique pas d'interdiction globale à ajouter au moteur. La sélection multiple générale d'objets, les sous-menus et actions de tous les Thing, les textes français exhaustifs et les systèmes absents du moteur (famille, chirurgie, inventaire pondéral, historique social intégral) restent à comparer et implémenter. Ce lot rapproche les interactions observées, sans revendiquer un clone intégral de toutes les fiches Core.
