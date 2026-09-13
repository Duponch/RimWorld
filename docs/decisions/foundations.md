# Décisions — foundations

Décisions datées à lire avec le [contrat actuel](../development/architecture.md). Les contrats plus récents remplacent les passages explicitement historiques.

## ADR-001 — Grille de gameplay plane, représentation 3D

**Adopté.** Les cellules utilisent x/z et une grille row-major. Les coordonnées des personnages sont entières dans la simulation. Le rendu interpole leurs déplacements ; sa hauteur n'ajoute pas d'étage navigable. Les volumes low poly facilitent les angles de caméra, mais les chemins et l'occupation restent faciles à vérifier. Étages, escaliers et terrain déformable exigeraient une décision séparée.

## ADR-002 — TypeScript strict dans un worker

**Adopté.** Three.js, DOM et horloge sont absents du noyau. Les modules `engine`, `pathfinding` et `serialization` permettent tests headless et un remplacement ciblé. Le modèle utilise des tableaux d'entités typées plutôt qu'un framework ECS généraliste. À cette échelle, l'absence de dépendances et la lisibilité priment ; les futurs index spatiaux et tableaux SoA peuvent être introduits derrière l'API.

Un worker garde le thread d'interface disponible ; ce choix n'accélère pas magiquement le calcul total. Les échanges ont un coût. Les deltas révisionnés d'ADR-013 évitent désormais la copie récurrente des données inchangées. Buffers transférables et pools restent à évaluer si leurs gains justifient leur complexité. Voir [la documentation des workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers).

## ADR-007 — Rust/WASM et compute selon mesures

**Reporté avec critères.** Envisager Rust pour navigation, régions ou diffusion si un profil représentatif dépasse le budget après optimisation algorithmique. Comparer mêmes entrées et mêmes résultats, coût JS↔WASM inclus, appels par lots. Commencer monothread dans le worker ; SharedArrayBuffer et rayon impliquent isolation cross-origin et protocole atomique.

Pour le GPU, commencer par quelques centaines d'acteurs représentatifs avant culling/compaction/indirect. Mesurer séparément simulation, échanges, soumission et temps GPU. Aucun objectif de performance ne devient une garantie sans appareil et scénario de référence. Voir [le protocole de benchmark](../research/rendering-and-performance.md#protocole-de-validation-et-de-benchmark).

## ADR-011 — Adoption critique du référentiel utilisateur

**Adopté comme orientation, mise en œuvre par jalon.** Les trois documents reçus dans `docs/reference/originals` sont la référence fonctionnelle principale. La [note d'adoption](../research/reference-adoption.md) distingue comportements sourcés, propositions et inconnues, puis les relie au calendrier unique [G0–G5](../ROADMAP.md). HTML et PDF contiennent le même rapport ; le classeur fournit contrats et critères, sans preuve d'exécution. Les sources de nombres sont à qualifier pour la version et les unités retenues.

Ils renforcent les frontières existantes : état autoritaire dans le worker, rendu observateur, identités stables, invariants et validation indépendante. Leur A* avec régions est une proposition de comparateur pour ADR-010. Leur découpage conceptuel ne justifie pas d'introduire d'avance tous les composants, un ECS générique ou C#/WASM. Les critères de mesure d'ADR-007 restent applicables ; conventions spatiales et organisation d'interface restent celles d'ADR-008/009.

**Contrats de G0 et état de réalisation :** le petit catalogue, la propriété des piles, les réservations de quantité/capacité, les transferts, les empreintes orientées et la migration sont livrés dans ADR-012. Les commandes et le fantôme partagent la validation de placement ; les diagnostics de travaux sont présents mais partiels. L'inventaire personnel, les conteneurs spécialisés, les cases de service réservées, les ordres forcés, le journal complet et les versions de contenu/générateur restent à réaliser. Le schéma 2 ne signifie pas que tous les contrats proposés sont couverts.

Avant G1, une décision séparée fixera les unités de temps/nutrition, leurs conversions et l'intégration des cadences. Les constantes du corpus ne sont pas compatibles par simple copie avec 10 Hz, 6 000 ticks/jour et des jauges en pourcentage. De même, séparer à terme RNG métier par domaine et RNG cosmétique demandera une version de règles et une preuve de continuation ; cette séparation n'est pas déjà livrée.

Traçabilité d'une évolution : chapitre et identifiant utile du classeur, décision motivée, état réel, scénario de validation et condition de réexamen. Les extensions restent après G5. Les erreurs de renvoi et annexes indisponibles sont consignées dans la note d'adoption ; les originaux sont préservés.

