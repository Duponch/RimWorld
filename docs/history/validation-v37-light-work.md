# Validation courante — lumière, travaux et déplacements V37

15 septembre 2026. [Contrat](../development/light-work.md), [sources et décisions](../research/light-work-reference.md), [état fonctionnel](../gameplay/implementation-status.md). Les [preuves de présentation lumineuse V36](../history/validation-v36-environment-lighting.md) restent datées ; leur audit graphique n'est pas présenté comme rejoué sous V37.

## Simulation et persistance

La suite complète a exercé **119 tests dans 40 fichiers en 127,63 s** : 112 succès, sept échecs de fixtures/attentes après changement des durées et du schéma. Après corrections, les six fichiers concernés ont passé **21 tests en 26,94 s**. Les migrations synthétiques retirent les nouveaux champs et reconstituent explicitement les anciennes arêtes ; aucune sauvegarde invalide n'est acceptée pour faire passer les tests. Les pilotes cœur de cinq à huit jours sur trois graines ont passé pendant la suite complète.

La dernière revue a ajouté l'ouverture d'un obstacle entre deux travailleurs dans le même tick et une sauvegarde V36 historiquement valide avec progression minière en attente. Le lot lumière/minage/production/simulation/milieu a passé 18 tests sur 19 ; le dernier échec provenait des métiers désactivés dans la nouvelle fixture, corrigés avant les deux tests lumière réussis. Après alignement de l'arrondi minier sur `Math.Round` (mi-valeurs vers l'entier pair), **six tests lumière/minage ont passé en 2,74 s**. Tous les échecs observés sont résolus ; la suite entière n'a pas été relancée après ces changements ciblés.

Les deux scénarios lumière couvrent neuf familles de travaux, fraction après interruption et sauvegarde, défrichage distinct du chantier, lumière au colon plutôt qu'à la cible, allumage/extinction, invalidation dans un même tick, coups capturés avec reliquat, diagonales et délais de mobilier additifs, continuation et rejets des nouveaux champs sous anciens schémas. Les invariants de matière et de réservation restent contrôlés dans les scénarios existants.

## Partie jouée et rendu natif

Le [pilote UI de trois jours](../../artifacts/colony-light-work-three-days.json) a passé en **6,1 minutes** sur Chromium natif WebGPU, carte 250² graine 42, viewport 1440×1000. Il agit par commandes d'interface, sans injection de ressources : **21 repas cuisinés**, trois colons observés dans leurs lits, cultures renouvelées, 28 cases couvertes, atelier de taille, porte, murs de bois et pierre, rangement et déplacement du piquet. À la fin : 50 acier rangés et 30 incorporés à l'atelier, 35 blocs rangés. Bois conservé, bilan alimentaire réconcilié et rechargements quotidiens exacts. Le diagnostic du pilote comprend lumière locale et facteur capturé des arêtes. [Capture finale inspectée](../../artifacts/colony-three-days.png).

Le lot natif de six tests a donné cinq succès et un échec de mesure du déplacement chargé. Ont passé : croisement civil/reprise/trois lits, trajectoires GPU et orientation vers quatre arbres, production au poste, contrôle des pixels et pilote ci-dessus. La cible de déplacement avant l'aube est désormais 16 cellules/s à 6×, avec le même seuil d'erreur de 0,01 ; elle n'est plus la vitesse neutre de 20.

Le contrôle du mobilier comparait des positions de part et d'autre du rechargement, puis sur la première image partiellement couverte par le tampon de reprise. Il sépare maintenant les époques explicites et les frontières du tampon/temps confirmé ; ces images peuvent avancer moins, jamais plus que leur vitesse. **Le test corrigé a passé en 14,5 s** : seuil de vitesse continue inchangé, corps/cargaison/sélection sur attributs communs, montée et plateau chargés observés, destinations et sauvegarde validées. Aucun changement du moteur de rendu pour contourner ce test. Les six parcours natifs sont donc résolus, pas six succès dans une unique exécution finale.

## Audit CPU : 3, 30 et 100 travailleurs

[Banc reproductible](../../scripts/light-work-bench.ts), [avant optimisation](../../artifacts/light-work-cpu-before.json), [mesure finale](../../artifacts/light-work-cpu.json). Ryzen 5 3600, Windows, Node 24.11.1 ; aucune charge lourde concurrente de cet agent, sans rendu. Carte naturelle 250² graine 42, quatre roches et un arbre désignés par colon ; nuit sans feu ou un feu allumé par colon. Besoins, trajets, travaux, produits et reprise réels ; fixtures de charge synthétiques. Watchdog de 90 s par cas, arrêt au terme des travaux. Validation et empreintes hors temps mesuré ; maxima incluent le démarrage.

| Colons | Milieu | Avant : p95 tick | Après : p95 / p99 / max tick (ms) | Résultat |
|---:|---|---:|---|---|
| 3 | nuit sans feu | 1,75 | 0,98 / 4,32 / 13,77 | 12 roches, 36 bois |
| 3 | un feu par colon | 1,56 | 1,56 / 5,04 / 9,55 | 12 roches, 36 bois |
| 30 | nuit sans feu | 7,59 | 6,61 / 11,64 / 25,47 | 120 roches, 360 bois |
| 30 | un feu par colon | 9,75 | 7,71 / 12,91 / 19,91 | 120 roches, 360 bois |
| 100 | nuit sans feu | 19,01 | 12,01 / 17,76 / 20,29 | 400 roches, 1200 bois |
| 100 | un feu par colon | 45,48 | 20,11 / 29,65 / 37,56 | 400 roches, 1200 bois |

Le coup final réussi supprimait son travail après avoir demandé la lumière pour un coup suivant inutile. Entre plusieurs extractions, cette demande reconstruisait le contexte invalidé. La capture suivante est maintenant demandée uniquement si le minage continue, y compris en cas de dépôt final refusé. Les **40 empreintes SHA-256**, réparties sur les six cas, sont identiques avant/après, avec les mêmes trajets, ticks de fin, quantités et continuations sauvegardées. Cela ne remplace pas une preuve de tous les états possibles.

Des pointes restent présentes et le p95 à cent travailleurs éclairés dépasse encore 16,67 ms, intervalle disponible pour maintenir six fois la vitesse locale de dix ticks/s. Cette mesure CPU n'est ni un FPS ni une garantie de cadence à 6×. L'audit graphique AMD RDNA-1 de la tranche précédente reste consultable ; pas de nouveau shader, buffer graphique ou pipeline ajouté ici. Le compteur FPS reste visible.

## Compilation et documents

Compilation TypeScript/Vite réussie : 188 modules, worker 223,36 kB, bundle jeu 1 074,76 kB (301,76 kB gzip). Aucune dépendance ajoutée ; avertissement préexistant de chunk supérieur à 500 kB conservé. Le contrôle documentaire a vérifié 133 documents, 1 401 liens locaux, 25 domaines et cinq familles de validation. Les trois originaux restent identiques octet par octet. Les contrats courants, guide, inventaire, catalogue et adoption du corpus décrivent V37.

G0 reste en consolidation, G1 partiel et G2 en cours. Durées neutres locales, compétences/capacités, facteurs de croissance du travail agricole et catalogue complet restent des limites explicites. Prochain lot : températures extérieure/intérieure et vieillissement alimentaire sous température variable, avant la chaîne du froid équipée.
