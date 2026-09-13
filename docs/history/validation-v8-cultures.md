# Validation historique — v8-cultures

Résultats des versions indiquées, pas une validation du code actuel. Voir [les preuves courantes](../development/validation.md).

## V8 — Première culture et validations regroupées (13 septembre 2026)

[Contrat de culture](../development/farming.md), [recherche fraîche](../research/farming-reference.md). La validation est organisée en un lot initial puis des reprises ciblées, sans nouvelle partie longue pour chaque correction graphique. Les rapports d’échec intermédiaires sont conservés, pas remplacés par une affirmation de passage dès le premier essai.

Le [lot principal de simulation](../../artifacts/farming-core.json) a validé 31/34 scénarios. Les corrections ciblées ont couvert les attentes V8, la date de maturité et la capacité de réserve du nouveau scénario : [première reprise](../../artifacts/farming-core-corrections.json), [deux attentes restantes](../../artifacts/farming-core-final.json). Le timeout de 30 s d’un ancien scénario à invariants par tick a été porté à 60 s et le parallélisme Vitest limité à deux workers ; ce délai n’est pas un budget de performance du moteur. Le [contrat de culture](../../artifacts/farming-contract-final.json) ajoute le champ inaccessible ; les [contrats mouvement/aliments](../../artifacts/farming-motion-food-final.json) vérifient le jitter, le riz cru et les souvenirs ; les [instances finales](../../artifacts/farming-resident-final.json) passent également. Le catalogue de tests courant contient 35 scénarios, couverts par ce lot et ces reprises ; ce n’est pas une promesse d’absence de bugs.

Le joueur ordinaire développe trois cartes naturelles de 250² pendant cinq jours, dont la graine 42 prolongée à huit jours. Un scénario indépendant de champ simule huit jours sans avancer artificiellement sa croissance : défrichage, six semis, 36 riz mûrs, transport observé et second semis, besoins actifs et reprise exacte. Les petits scénarios de sauvegarde contrôlent aussi semis interrompu, autorisations, suppression de zone, checkpoint V7 et continuité V8.

Côté navigateur : [lot initial](../../artifacts/farming-ui.json), [reprise des parcours concernés](../../artifacts/farming-ui-final.json), [mouvement/ciel/culture après correction](../../artifacts/farming-motion-ui.json) et [culture avec buffers définitifs](../../artifacts/farming-gpu-final.json). Les 11 parcours courants sont couverts ; le pilote de culture a été corrigé pour dézoomer quand Architecte masque une extrémité, et les attentes de schéma/priorités ont été actualisées. La partie de trois jours utilise réellement commandes, vitesse, sauvegarde et interface, sans injection d’inventaire ou d’horloge : **3 lits, 1 table, 3 tabourets, 6 murs, 15 plants, 18 repas observés, 3 colons ayant dormi au lit**. Bilan final : 41 bois, 72 aliments physiques, aucun ordre en attente, nourriture minimale 35,07 et repos minimal 86,16. Conservation du bois et rapprochement des aliments consommés/produits passent. Les 15 plants sont encore en croissance, pas artificiellement récoltés au jour 3.

Le contrôle de translation a reproduit une réserve de snapshots épuisée (une image immobile). [MotionTimeline](../development/spatial-motion-storage.md) passe de 250 à 400 ms d’avance de lecture ; aucune accélération de rattrapage ni modification de simulation. Après correction : 215 échantillons, erreur maximale de vitesse 0,000204 unité/s à cible 20, erreur d’orientation au travail 4,38×10⁻⁸ rad, quatre cibles, aucune erreur WebGPU. Contrepartie : 150 ms de latence visuelle supplémentaire au démarrage/reprise ; un arrêt de worker dépassant la réserve reste une limite explicite.

Build TypeScript/Vite final réussi : jeu 1 013,49 ko (gzip 281,63 ko), worker 76,23 ko ; avertissement connu du lot JavaScript >500 ko. Le dernier changement de capacité GPU ne modifie aucune règle de simulation.

### Audit de rendu ciblé

Ryzen 5 3600, GPU AMD/RDNA-1, Chromium WebGPU matériel, 1440×1000, carte 250² graine 42, simulation en pause. [Script reproductible](../../scripts/farming-render-bench.mjs), [avant optimisation](../../artifacts/farming-render-before.json), [mesure finale](../../artifacts/farming-render-benchmark.json). Même zone dégagée, même caméra et heure : 0 → 1 000 → 0 plants ; 30 images de transition, 90 de chauffe, au moins 300 images et six secondes de régime établi par phase. Ce fixture graphique ne mesure pas le débit d’une simulation de 1 000 cultivateurs.

| État final | Appels | Triangles | Frame p95 | setWorld CPU |
|---|---:|---:|---:|---:|
| Champ vide | 120 | 165 037 | 8,4 ms | 5,2 ms |
| 1 000 plants mûrs | 121 | 183 037 | 8,4 ms | 6,7 ms |
| Après retrait | 120 | 165 037 | 8,4 ms | 4,2 ms |

L’ajout initial coûtait 23,1 ms dans setWorld et présentait une transition p95 de 116,7 ms (max 191,7). Le prétraitement de la forêt est désormais évité si seuls les plants changent ; les matrices de riz emploient un stockage GPU à taille dynamique et la capacité de carte est réservée/précompilée sous l’écran de chargement. Aucun mesh ni remplacement de buffers lié à la capacité n’est requis au premier semis ou au passage de 128 à 129 plants. La transition finale avec 1 000 plants a un p95 de 8,4 ms, max 79,2 ms, contre 91,7 ms pour le contrôle vide ; la soumission CPU maximale est 8,6 ms contre 8,9 ms au contrôle. Le protocole transporte aussi la fixture par automatisation ; l’origine exacte des pics résiduels n’est pas isolée. Ces mesures ne justifient pas de promettre une fluidité parfaite dans toute circonstance. Le GPU proprement dit n’est pas chronométré séparément.

Compromis : pour une carte 250², environ 4,75 Mio de matrices/couleurs réservées côté CPU et autant côté GPU, nombre dessiné limité aux emplacements utilisés, aucune ombre projetée par les petits plants. Les tests de buffers et le retrait vérifient qu’un lot vide ne dessine rien. Pleine carte cultivée, autres GPU, climat variable et centaines de travailleurs restent des périmètres à mesurer.


