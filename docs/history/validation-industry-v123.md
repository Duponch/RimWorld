# Validation V123 — première chaîne industrielle avancée

Le lot relie or et plastacier minables sur les **nouveaux** sites, marchand exotique à piles physiques, recherches Microélectronique → Multi-analyseur → Fabrication, trois bâtiments alimentés et facture de composant à l'établi. Le [contrat livré](../development/industry-v123.md) sépare les définitions [Core relevées](../research/industry-core-v123.md) des adaptations de Lisière. Les composants avancés sont disponibles par échange mais leur fabrication reste absente.

## Conservation et reprise

Le schéma 123 valide d'abord la sauvegarde déclarée V122. La migration ajoute les prochaines occasions du marchand exotique aux calendriers déjà présents, sans placer de minerai, d'objet, de recherche ou de travail dans une ancienne colonie. Les nouvelles données sont refusées dans un fichier se déclarant V122. La démonstration `v123/industrie.json` provient d'une copie de la scène V101 ; les fichiers historiques restent inchangés.

La scène préparée contient un établi construit et alimenté, Ada Artisanat 10, une facture « faire une fois » et 90 aciers, mais aucun composant ni ouvrage initial. Après reprise, le moteur transporte réellement 12 aciers, crée un ouvrage lié à l'auteur, puis produit un composant. Le test recharge pendant le travail, poursuit les deux branches et compare leur sérialisation exacte. L'annulation prévalide les sorties, restitue 75 % par part incorporée, et un refus laisse l'état intact. Le pont de snapshots transporte les deltas de progression de `componentWork` sans imposer une resynchronisation complète à chaque avancement.

## Contrôles exécutés sur les sources finales

| Contrôle | Résultat |
| --- | --- |
| `npx vitest run tests/research-v123.test.ts tests/component-fabrication-v123.test.ts tests/exotic-trade-v123.test.ts tests/industry-demo-v123.test.ts tests/mining.test.ts tests/site-generation.test.ts tests/research.test.ts tests/bridge-snapshot.test.ts tests/bridge-piles-v95.test.ts` | 9 fichiers, 35 tests réussis. Recherche, réservations, recette, annulation, géologie, commerce, migration, conservation et démonstration. |
| `npm run build` | TypeScript et production Vite réussis. Avertissement existant de taille des chunks, sans échec. |
| `npx playwright test tests/integration/research.spec.ts tests/integration/ui-labels-v118.spec.ts tests/integration/mining.spec.ts` | 3 parcours Chromium/WebGPU réussis : recherche et interactions antérieures. |
| `npx playwright test tests/integration/industry-v123.spec.ts` | 1 parcours Chromium/WebGPU réussi : chargement exact de la scène, outils Architecte, sélection du poste, coût affiché, démarrage réel d'ouvrage, sauvegarde valide et aucune erreur de page/GPU. |

Le premier essai du parcours V123 a révélé que la facture ne montrait pas son coût alors que les factures d'armes le faisaient. Le panneau affiche maintenant « 12 acier · Artisanat 8 » ; seul ce parcours a été relancé après cette correction de présentation. Les deux anciens tests de minage nécessitaient une fixture déclarant V27/V28 sans champs des versions récentes ; leurs champs postérieurs ont été retirés de **la copie de fixture du test**, puis le groupe complet a réussi. Les règles minières n'ont pas été assouplies.

La production et les réservations restent dans la simulation, pas dans l'image. Les nouveaux meubles et minerais utilisent les lots résidents ; aucun maillage individuel par bâtiment ou recherche par image n'a été ajouté. Le delta de progression de l'ouvrage évite des checkpoints redondants. Ces constats de structure et le test ciblé du pont ne sont **pas** une mesure de FPS ou de débit CPU : ce lot n'établit aucun gain général ni un coût GPU nul. La cible 240 FPS/6× sous forte population demeure ouverte. Aucune campagne de plusieurs jours naturels n'est revendiquée pour cette chaîne : la reprise exacte et les transitions physiques du scénario borné couvrent les contrats touchés.

La version locale est la seule vérifiée ici. Le site Netlify n'a pas été mis à jour : les crédits du projet restent épuisés et aucune publication prête n'a été vérifiée.
