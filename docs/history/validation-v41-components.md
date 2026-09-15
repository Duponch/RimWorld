# Validation courante — V41

15 septembre 2026. Machines compactées et composants industriels, [contrat](../development/components.md), [recherche et incertitudes](../research/components-reference.md). Les preuves V40 sont conservées dans [l’archive refroidissement passif](../history/validation-v40-passive-cooling.md).

## Simulation, commandes et continuation

**128 tests réussis dans 42 fichiers** en 61,15 s, hors pilote long ; **pilote de cinq à huit jours réussi sur trois cartes naturelles** dans le lot regroupé précédent (156,96 s pour ce lot, 34 tests réussis et une fixture historique à corriger). Trois camps construisent leur atelier, extraient puis rangent **six composants**, maintiennent repas/repos/loisirs, matière et reprise exacte. Aucun composant ajouté par le pilote.

Les deux scénarios composants couvrent gisements 3–6, acier et topologie conservés, flux/IDs, migration V40 stricte, état invalide, 25 coups naturels, annulation sans réparation, dernier dépôt différé par saturation d’IDs, delta de minerai/dégât/sol, transport à deux colons, limite 49→50 puis seconde pile et reprise exacte en portage. Les anciennes attentes de version ont été actualisées. Une fixture V37 fabriquée depuis le générateur actuel contenait des machines V41 ; elle est revenue à un terrain légal de sa version, sans relâcher le validateur. Le contrôle initial de débordement a également été corrigé pour utiliser le dépôt sur une cellule, car `addGroundMaterial` est volontairement un répartiteur sur plusieurs cellules.

## Parcours visible

**Chromium natif : 1 parcours réussi, 27,2 s**. Minage/reprise du granite, transport désigné du fragment, acier puis machines : inspection 2 000 PV, travail visible après le premier coup sans produit anticipé, retrait final, compteur deux composants, objet porté, dépôt dans la réserve et rechargement exact. Captures `artifacts/components-deposit-ui.png`, `components-carried-ui.png`, `components-stored-ui.png` examinées. Aucune erreur de page/GPU sur ce parcours.

Une première tentative avait échoué à l’égalité du chargement pendant une modification du module surveillé par Vite. Le diagnostic isolé a trouvé des états exactement égaux ; le parcours complet a ensuite réussi avec les fichiers applicatifs stabilisés. Le rechargement automatique est une cause probable, non une preuve d’un défaut de sauvegarde corrigé. Ne pas modifier les modules applicatifs pendant un parcours navigateur mesuré.

## Audit de rendu en charge

Rapport `artifacts/components-render-v41.json`, 15 septembre à 20:56 UTC ; Ryzen 5 3600, GPU AMD RDNA-1, Chromium natif/WebGPU, 1 440×1 000, carte naturelle 250² avec chantier dégagé. Même protocole minier qu’avant : quatre cases et un arbre par colon, vitesse 6×, 90 images de chauffe. Fin de mesure après les quatre extractions par mineur, pas après toute la coupe ni un stockage collectif. Données exactes d’adoption séparées de la réception des snapshots ; aucune sérialisation de tout le monde pendant les images mesurées.

| Charge | Produit final | Image p95 / p99 / max | Application de scène p95 / max | Réception snapshot p95 / max |
|---|---:|---:|---:|---:|
| 3 mineurs, 12 cases | 24 composants | 8,4 / 12,4 / 20,9 ms | 6,7 / 15,9 ms | 0,6 / 3,1 ms |
| 100 mineurs, 400 cases | 800 composants | 16,7 / 20,9 / 37,5 ms | 13,8 / 22,7 ms | 4,1 / 8,1 ms |

Aux fenêtres de retrait de roche, p95/p99 atteignent **25 / 33,3 ms** à cent mineurs. **Zéro programme GPU créé pendant la mesure**, identités de géométrie/attributs/indices de roche et du sol conservées. Un lot de piles passe de 256 à 512 places à cent mineurs, sans compilation ; pas de croissance observée à trois. Appels de rendu p95 : 161 / 176 selon charge. Préparation initiale environ 2,1–2,2 s, remplacement 0,29–0,35 s, exclus du budget d’image ordinaire.

Ce résultat n’est ni une garantie de 60 FPS permanents à cent colons ni une comparaison A/B prouvant un surcoût nul. Le coût d’application de scène et les pointes groupées restent à surveiller dans les futurs lots. La chaîne de transport massive n’est pas mesurée par cette fixture ; la conservation et la réservation sont couvertes séparément.

Reproduction PowerShell : définir `MINING_COMPONENTS=1`, `MINING_COUNTS=3,100`, puis `node scripts/mining-render-bench.mjs artifacts/components-render-v41.json`, serveur local actif, sans autre test lourd ni modification des modules.

## Livraison et limites

Build TypeScript/Vite réussi ; 200 modules, worker 234,27 kB, jeu 1 080,65 kB (303,65 kB gzip). Avertissement de bundle >500 kB déjà connu. Index/liens et intégrité des trois originaux contrôlés. Les preuves ne prétendent pas couvrir tous les cas du jeu ni tous les défauts visuels ; le long parcours UI de trois jours n’a pas été répété pour ce prolongement d’une chaîne minière existante, couverte par pilote cœur et UI minière.

Fidélité : forte confiance sur produit/PV/piles, génération adaptée, passage 1,4 et portage dix unités encore provisoires. Pas de composants avancés, fabrication, commerce, usure, appareil électrique ou garantie de conformité totale. Voir [l’inventaire](../gameplay/implementation-status.md).
