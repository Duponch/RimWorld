# Atelier, équipement et rangement — V101

Lot du 25 septembre 2026, mode jour. Référence Core 1.6.4871 et corpus original, avec sources Internet recoupées : [production](../research/production-reference-v101.md), [stockage](../research/storage-filters-reference-v101.md). Les sauvegardes personnelles ne servent pas d’échéancier universel.

## Nouveautés et limites

Atelier construit, recherches Usinage/Armurerie, revolver et fusil fabriqués, interruption électrique et ouvrage conservé, équipement physique ; stockage par objet en complément des catégories. Les armes existaient déjà. Le lot n’ajoute pas les armures, tous les ateliers, l’économie industrielle complète ou de nouveaux incidents. G0 en consolidation, G1/G2/G3 partiels, G4 partiel, G5 absent ; aucun jalon global clos.

La démonstration `public/test-saves/v101/atelier.json` est explicitement préparée : recherches acquises, site et matières fournis. Le générateur construit ensuite réellement l’atelier en 1 244 ticks, puis valide une reprise exacte ; aucune facture exécutée, 90 acier et 5 composants disponibles. Elle facilite les essais sans se substituer à une partie naturelle.

## Contrats courts

- 48 contrôles regroupés : ouvrage d’arme, conservation/annulation, filtres, migration V90→91→101 neutre, snapshots, production/cuisine/confection, meubles, réseau et commutation, stockage commercial, ordres directs.
- Deuxième groupe : 35/36 initialement. Le seul échec était l’oracle indépendant des emprises, qui ne connaissait pas encore les trois cases de l’atelier. Ajout de ses offsets explicites dans les quatre orientations ; aucune réduction de l’oracle.
- Dernier groupe : 22/22 sur atlas, emprises, commutation, sauvegardes de production et lumière. Les groupes se recoupent ; ces nombres ne s’additionnent pas en tests uniques.
- Frontières finales : [15/15](../../artifacts/machining-final-boundaries-v101.json), dont les six sauvegardes publiques V98 inchangées, leur migration et leur continuation. Puis [4/4](../../artifacts/machining-research-boundaries-v101.json) sur migration/recherche, incluant le refus d'une fabrication sans Armurerie ; les armes obtenues autrement restent admises. Surfaces élevées de l'atelier vérifiées dans les quatre orientations : 4/4 contrôles de déplacement/meubles.
- Parcours profond `machining-v101` : vrais travaux de construction, deux types d’ingrédients, pénurie d’un composant non remplacée par l’acier, seuil Artisanat, interruption par commutation physique, reprise exacte, deux armes distinctes puis équipement. Recherche : prérequis et fin de travail depuis un seuil préparé.
- Lumière : bleu de l’atelier, superposition RGB correcte, extinction/rétention. Mondes sans source bleue : chemin scalaire historique conservé, pas d’allocation G/B.

Trois corrections transversales découvertes : les recettes V90 pantalon/cache-poussière/parka étaient omises des listes de tâches sauvegardées ; le tailleur électrique emballé était omis des postes avec factures ; le diagnostic historique du lit fournissait 12 bois pour un coût de 45. Les fixtures et les anciennes versions gardent leurs limites propres. Le pilote du lit fournit maintenant 37 bois supplémentaires pour conserver aussi l’oracle original de quatre bois restants. Aucun changement des priorités métier pour masquer l’échec.

## Interface et publication

Trois parcours Chromium avec GPU natif réussis : recherche par les vrais contrôles, construction/alimentation → deux armes → équipement → sauvegarde/rechargement (2,4 minutes), et réserve par objet rangeant le revolver en laissant le fusil dehors. La reprise ciblée stockage + ordre direct historique termine à 2/2 (31,7 secondes), après correction du contraste du sélecteur de priorité. Captures locales `machining-research-v101.png`, `machining-guns-v101.png`, `machining-storage-v101.png`.

Le parcours de fabrication a d'abord échoué avant initialisation sur `ERR_NO_BUFFER_SPACE` lors du chargement d'un module Vite : trace conservée localement, attente de démarrage rendue explicite et bornée. La reprise a ensuite trouvé un véritable oubli de liaison UI : matériau acier non transmis pour l'atelier ; correction, ainsi que l'admission des quatre orientations. Le parcours complet a été rejoué jusqu'au succès. Aucun délai métier ou assertion de conservation n'a été supprimé. La revue finale a complété le fantôme 3×1, les hauteurs de déplacement/piles et le contexte de production dans l'inspecteur.

Build/typage réussis, documentation et trois sources originales vérifiées. Production Netlify **`6ab5b90aeb6ac4082e8bde84`**, 31 fichiers : [publication](../../artifacts/netlify-v101.json), [contrôle public](../../artifacts/netlify-smoke-v101.json). Bundle public conforme au build, 61 outils avec PNG (l'atelier réutilise explicitement un pictogramme existant), curseurs/gestion/sauvegarde sans erreur JS/GPU.

Le [contrôle public de la démonstration](../../artifacts/machining-public-v101.json) compare les six fichiers JS/CSS publics octet par octet au build et l'entrée HTML après retrait du seul commentaire informatif ajouté par Netlify. Sa première comparaison HTML brute a identifié cette transformation d'hébergement, sans divergence des bundles. Il télécharge aussi les 26 223 octets de la démonstration, vérifie leur empreinte, importe par Charger, puis sauvegarde un monde exactement identique au tick 3 244, schéma 101, en pause. Les projets et l'outil d'atelier sont accessibles. Script reproductible `scripts/machining-public-v101.mjs`. Aucune injection de diagnostic dans le bundle de production.

## Performance

Même banc CPU `scripts/research-bench.ts`, mondes naturels 250², 3/30/100 personnes en recherche/confection/minage, 100 ticks d’échauffement puis 650 mesurés. Exécutions successives, sans navigateur de mesure concurrent. [Avant](../../artifacts/research-cpu-v101-before.json), [après](../../artifacts/research-cpu-v101-after.json).

| Personnes | Tick p95 avant | Tick p95 après | Snapshot p95 avant | Snapshot p95 après |
| ---: | ---: | ---: | ---: | ---: |
| 3 | 3,544 ms | 3,113 ms | 7,443 ms | 6,598 ms |
| 30 | 8,213 ms | 7,351 ms | 3,992 ms | 3,784 ms |
| 100 | 19,055 ms | 16,737 ms | 5,251 ms | 5,634 ms |

Résultats métier conservés : 1/10/33 vêtements terminés et 4/40/132 extractions. Ce banc ne contient pas les nouveaux ateliers et ne prouve pas leur coût en masse. Une seule paire avant/après ne prouve pas un gain causal ; le snapshot à cent acteurs est légèrement plus coûteux sur ce passage. Ne pas en déduire 240 FPS, 6× tenus ou une optimisation générale achevée.

[Mesure native](../../artifacts/research-render-v101.json) successive sur le même scénario, Chromium WebGPU AMD RDNA-1, 1440×1000, sources gelées, 90 images d'échauffement puis 650 ticks demandés, sans autre charge de validation lourde. Le temps worker correspond aux moyennes de pas publiées par lots, pas à un percentile indépendant de chaque tick.

| Personnes | Image p95 / pic | Worker par lots p95 | Débit / 6× demandé |
| ---: | ---: | ---: | ---: |
| 3 | 6,1 / 18 ms | 3,30 ms | 5,926× |
| 30 | 6,1 / 24 ms | 8,20 ms | 5,927× |
| 100 | 12 / 30 ms | 19,24 ms | 5,882× |

Aucune erreur JS/GPU, monde invalide ou compilation de pipeline pendant les fenêtres mesurées ; géométrie des acteurs stable. Le banc reste une charge recherche/confection/minage sans animaux : il ne remplace pas les audits mixtes historiques et ne garantit pas ces débits pour toute colonie.

## Méthode

Recherche groupée, développement de contrats indépendants en parallèle et intégration centrale. Réutilisation des résultats acquis ; corrections ciblées des validateurs/listes fermées, puis parcours de clics communs, sources servies gelées. Aucun nouveau contrat annuel n’exigeait de rejouer des saisons. Les erreurs de fixture et les refus d’accès de l’environnement (`spawn EPERM` avant démarrage de Vitest) sont distingués des défauts produit ; le lancement autorisé hors bac a exécuté les contrôles normalement.
