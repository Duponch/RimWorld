# Validation courante — V42

16 septembre 2026 (recherches et premiers essais le 15). [Contrat électrique](../development/power.md), [sources et adaptations](../research/power-reference.md). Preuves V41 conservées dans [l’archive composants](../history/validation-v41-components.md).

## Simulation et reprise

Le lot complet a réussi **131 tests hors pilote long** et trouvé un défaut dans ce pilote. Après correction, le lot transport/électricité/bridge/pilote a réussi **8 tests**, dont les cinq à huit jours sur **trois cartes naturelles**, en 147,74 s. Les contrôles électriques ont été rejoués après optimisation des réseaux stables et ajout du bilan thermique ; le dernier lot lumière/travaux/rendu/électricité réussit **8 tests dans quatre fichiers** en 2,82 s. Les autres familles du lot initial n’ont pas été relancées sans changement les concernant.

Le défaut détecté : la route desservait toute l’empreinte 2×2 du générateur, mais la livraison ne reconnaissait que l’ancre. Le colon arrivait avec du bois sur une autre face et gardait son engagement sans pouvoir le finir. Correction de la condition d’arrivée ; les quatre faces et la reprise pendant les 24 ticks de ravitaillement sont désormais testées. Le pilote vérifie le fonctionnement des appareils, pas seulement leur présence.

Les scénarios couvrent matériaux mixtes, réservoir neuf vide, débit entier 22 bois/jour, déconstruction et pertes, minification de lampe, parents valides et invalides, portée carrée, raccordement conservé, surcharge à 34 lampes, panne/reprise, PRNG, migrations strictes, source chaude arrêtée et lampe sans chaleur. L’oracle de lumière indépendant existant reste exécuté ; un cache neuf est aussi comparé cellule par cellule après mutations éloignées/proches. Les anciens tableaux restent immuables ; le canal graphique d’opacité évolue même quand le tableau lumineux est conservé.

## Partie réellement jouée

**Deux parcours natifs réussis en 7,0 min** : trois jours par la vraie interface (6,5 min), puis construction/alimentation/déconstruction/rechargement électrique (25,5 s). Carte 250², seed 42 : 3 lits, table et 3 tabourets, 7 murs, porte, feu, piquet, atelier, générateur et lampe ; 15 plants de riz et 28 cases couvertes. **200 acier extraits, 150 incorporés, 50 rangés ; six composants extraits, deux incorporés, quatre rangés.** 35 blocs restants, 20 repas cuisinés, 18 ingestions observées, trois colons ayant dormi. Générateur ravitaillé, lampe allumée, aucun ordre restant ; bilans bois/aliments et reprises exactes réussis. [Preuve compacte](../../artifacts/power-colony-v42.json).

La scène électrique dédiée vérifie lumière logique 50 % puis 0 %, quantités consommées/restituées, inspection et FPS ; captures `power-lit.png` et `power-dark.png` examinées. **Aucun programme GPU nouveau** pendant construction/allumage et retrait de la source. [Rapport natif](../../artifacts/power-ui-v42.json). Ces parcours précèdent la dernière optimisation du cache lumineux ; celle-ci conserve les règles et dispose de ses oracles et de l’audit natif ci-dessous.

## Performance mesurée

Ryzen 5 3600, AMD RDNA-1, Node 24.11.1, Chromium/WebGPU natif, 1 440×1 000. Carte naturelle 250² avec patches dégagés, quatre machines compactées et un arbre désignés par mineur, vitesse 6× ; 90 images de chauffe. Sources électriques dans un patch séparé, toutes actives avant mesure. Témoin de même carte sans appareils, sans tests lourds concurrents. L’application de scène mesure **applyWorld**, distinct de la réception des snapshots.

| Charge finale | Image p95 / p99 / max | Application de scène p95 / max | Appels de rendu p95 |
|---|---:|---:|---:|
| 3 mineurs + 3 générateurs/lampes | 4,3 / 8,4 / 20,9 ms | 6,7 / 18,1 ms | 136 |
| 100 mineurs, témoin sans appareils | 16,6 / 20,9 / 33,4 ms | 13,5 / 22,9 ms | 170 |
| 100 mineurs + 100 générateurs/lampes | 16,6 / 20,9 / 37,5 ms | 14,1 / 25,2 ms | 172 |

Toutes les extractions terminent : 24 ou 800 composants, cent mineurs simultanément au travail observés dans les grosses charges, toutes les lampes restent alimentées. **Zéro programme GPU nouveau**, aucune erreur navigateur/GPU. Huit changements simultanés de cent lampes produisent huit mises à jour de texture ; application jusqu’à 27,5 ms et image jusqu’à 33,5 ms. Le jeu n’est donc pas garanti sous 16,7 ms en toute circonstance. [Mesures finales et protocole](../../artifacts/power-render-v42.json).

L’audit a motivé deux corrections de coût : sauter les recherches d’allumage des réseaux déjà équilibrés, puis ne pas rediffuser tous les halos lorsqu’une roche éloignée change la topologie des pièces. Sur la paire mesurée avec cent appareils, cette dernière correction ramène l’application p95 **20,6 → 14,1 ms**, l’image p99 **29,2 → 20,9 ms** et le maximum **66,7 → 37,5 ms**. Le canal d’opacité conserve sa propre invalidation. [Comparaison conservée](../../artifacts/power-light-optimization-v42.json). Une paire de mesures ne prouve pas un gain identique sur tout matériel ni un coût nul. Le transport massif et la construction simultanée de cent réseaux ne sont pas mesurés par cette fixture.

Reproduction : serveur local actif, puis `node scripts/power-render-bench.mjs`, sans autre test lourd ni modification des modules.

## Synchronisation et livraison

La première garde de présentation a détecté une répétition du curseur pendant **une image de 4,2 ms** en abattage. Aucun saut, retrait anticipé ou délai de commande supérieur à 100 ms ; le message générique « Delayed speed controls » provenait ici du critère de starvation, pas du délai des commandes. [Observation conservée](../../artifacts/power-presentation-first-v42.json). Le seuil strict n’a pas été assoupli. **La reprise complète après optimisation réussit** : 9 950 images de minage et 10 273 d’abattage, aucune starvation ni saut/occupation solide/retrait anticipé, délais maximum des changements de vitesse **29,5 / 21,1 ms**. [Preuve finale](../../artifacts/power-presentation-v42.json). La cause du phénomène isolé du premier essai n’est pas établie ; ce second passage ne prouve pas qu’il est impossible et le contrôle reste obligatoire.

Build TypeScript/Vite réussi : 207 modules, worker 241,83 kB, jeu 1 083,64 kB (304,67 kB gzip). Avertissement de bundle >500 kB préexistant. Index/liens et intégrité des trois originaux contrôlés. V42 n’ajoute pas d’appareil aux anciennes sauvegardes. Conduits, interrupteurs physiques, batteries, froid électrique, recherche/compétences et incidents restent absents ; rayon brut de lampe provisoire, [inventaire complet](../gameplay/implementation-status.md).
