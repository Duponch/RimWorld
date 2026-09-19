# Validation de l’accueil — V66, 19 septembre 2026

Le lot relie la première croissance de population au camp ordinaire ; périmètre et écarts explicités ci-dessous.

## Périmètre

Demande produite par le calendrier d’un camp ordinaire, lettre avec délai/choix, arrivée réelle après acceptation, vêtements/compétences/besoins communs et mémoire de refus. [Contrat](../development/arrivals.md), [référence confrontée](../research/arrival-reference.md). Fréquence et profils explicitement provisoires ; ni narrateur complet, ni prisonniers, ni nouveaux objets, ni raids.

## Scénarios et corrections détectées

Première passe globale : **319/320** sur 74 fichiers. Le pilote prolongé a détecté un journal de 81 événements après une demande, contre une limite persistante de 80 : limite corrigée dans le producteur et scénario de journal plein ajouté. Ensuite **6/6**, puis **5/5 finaux** après extension des arêtes et du cumul ; le groupe de six inclut le pilote sur trois cartes naturelles 250² : huit jours avec un quatrième colon, cinq jours pour chacun des deux témoins paisibles. Conservation bois/nourriture, repas, lits utilisés, travaux et reprise exacte restent exigés. Pas de nouvelle passe globale prétendue.

Les scénarios dédiés contrôlent identité unique et chemise extérieure, état personnel indépendant, rechargement d’offre et continuation, duplicata/refus atomiques, bord fermé puis rouvert, régime par défaut supprimé, délai exact, mémoire de refus décroissante, expiration même après décès et migration V65 neutre. La capture d’entrée respecte les arêtes encore engagées ; un ancien historique de déplacement n’occupe pas éternellement une bordure.

## Interface

Première passe : clic de lettre intercepté par le canevas, en raison du conteneur d’alertes sans événements pointeur. Correction ciblée sur la lettre. Une attente de déplacement sans besoin ni travail à accomplir a ensuite été remplacée par un véritable ordre de marche ; le pilote ordinaire contrôle séparément l’activité autonome. Passe suivante **réussie en 17,9 s** : worker natif, lettre, report, sauvegarde/reprise, accueil, portraits/tableau Travail, marche physique, refus et expiration aux vitesses 1×/6×. Aucune erreur navigateur. Passe finale **réussie en 21,1 s**, après correction des buffers GPU, incluant deux rechargements d’ancien camp suivis d’activation et le maintien du focus clavier pendant l’avancement des ticks. La lettre reste attachée hors du conteneur de statuts renouvelé ; le bouton d’activation ne reste pas désactivé après changement de partie. Captures de lettre et d’arrivant inspectées, texte/boutons lisibles et compteur FPS conservé. [Preuve finale](../../artifacts/arrival-ui-v66.json).

## Parcours de colonie par la vraie interface

Première exécution arrêtée après 3,2 minutes au tick 7 063, avant toute demande : assertion historique exigeant un facteur de marche ≥0,8. Le checkpoint conserve Mina sans blessure/crise, avec un gilet, et une arête nocturne capturée à 0,7975875. L’assertion ignorait le facteur vestimentaire V63 (4,48/4,6). Le contrôle utilise désormais 0,8 × facteur du vêtement de ce pilote qui équipe sans retirer le gilet ; les contrôles de lumière, besoins, conservation et travaux restent présents. Aucun changement de simulation. [Diagnostic conservé](../../artifacts/colony-arrival-v66-initial-failure.json). Le rejeu a ensuite atteint une arrivée normale acceptée, tick 10 065, puis le pilote a sélectionné Mina devant le feu au lieu de l’atelier de cuisine. L’inspection et le checkpoint le confirment : aucun bouton de facture ne doit apparaître sur une personne. Le pilote utilise désormais les clics successifs déjà proposés par le jeu, comme pour la réinstallation de mobilier, et attend l’acquittement visuel de la lettre avant la décision suivante. [Second diagnostic](../../artifacts/colony-arrival-v66-selection-failure.json). Aucun raccourci de simulation ou suppression d’assertion métier.

**Parcours complet final réussi en 7,5 minutes**, départ ordinaire 250², calendrier normal et 190 décisions par la vraie UI. Au tick 18 060 : quatre personnes, quatre couchages utilisés, cinq vêtements portés, table/trois tabourets, 28 cases couvertes, 15 cultures, atelier/porte/générateur/lampe ; 23 repas cuisinés et 21 consommations observées. La maintenance après la nuit atteint le tick 20 115 : zéro travail restant, deux fragments rangés, cinquante acier et trente-cinq blocs stockés, trente médicaments conservés. Bilan bois et nourriture vérifié ; aucune erreur navigateur. [Preuve complète](../../artifacts/colony-three-days-v66.json). La dernière stabilisation du nœud de lettre est couverte par l’UI courte finale, sans refaire ce parcours dont la simulation est inchangée.

## Charge et limites

Première mesure native interrompue sur **cinq créations de pipelines** à l’arrivée : deux ombres, corps, cargaison et sélection. `PawnLayer` reconstruisait les trois meshes et leurs matériaux à chaque changement de taille. Correction : identités de meshes/matériaux conservées, croissance géométrique des buffers seulement au franchissement de capacité, poses partagées entre corps/cargaison/anneau, compte actif exact et nettoyage des poses retirées. `pawn-buffers.ts` isole l’allocation. Deux scénarios de rétention passent, dont 3→4→5→16→17→33→2→0→3 avec matériaux conservés et attributs partagés ; UI 1×/6× rejouée après correction. Aucun changement de simulation ne justifie une quatrième exécution du long camp.

Audit CPU puis natif, successivement ; sources gelées pour le natif. Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1, WebGPU AMD RDNA1, fenêtre 1440×1000, forêt 250². Acteurs armés/vêtus, poursuite, tirs et travaux ; crises préchargées sur 1/5/17 civils. CPU : douze continuations de 120 ticks, deux échauffements exclus, dix acceptations et 1 200 ticks/300 encodages mesurés par population ; un p95 d’acceptation sur dix valeurs reste indicatif. Natif : acceptation réelle par UI pendant capture, puis 240 ticks à 6× ; pas de second test/build lourd concomitant.

| Acteurs avant→après | Acceptation CPU p95/max (ms) | Tick CPU p95 / p99 / max (ms) | Encodage p95 (ms) | Image native p95 / p99 / max (ms) |
|---|---|---|---|---|
| 3→4 | 8,50 | 6,00 / 15,45 / 30,39 | 2,96 | 8,40 / 12,50 / 50,00 |
| 30→31 | 4,93 | 22,59 / 38,23 / 49,77 | 2,94 | 12,60 / 24,90 / 54,20 |
| 100→101 | 4,57 | 40,28 / 50,23 / 72,85 | 3,10 | 20,80 / 33,40 / 125,00 |

**Zéro pipeline nouveau aux trois franchissements de capacité**, validation des états et aucune erreur navigateur. La mesure native finale passe en 45,4 s. À cent acteurs, callbacks de snapshots p95 8,20 / max 37,80 ms ; adoption de scène p95 8,40 / max 18,80 ms. Le p95 CPU dépasse le budget de 16,67 ms du 6× et une pointe d’image de 125 ms subsiste : **aucune garantie de 6× ou de fluidité parfaite**. La suppression des compilations ne résout pas tous les coûts du moteur.

Le premier audit après correction exportait encore la carte entière par CDP pendant la capture : il observait des maxima 116,6 / 158,4 / 141,7 ms. Cette [mesure conservée](../../artifacts/shooting-native-v66-instrumented.json) n’est pas effacée. Le banc final attend seulement le compteur de personnes à l’accueil et exporte les 62 500 cases après la fin de capture, en gardant accueil et pause dans la fenêtre. Cela élimine une perturbation connue de l’observateur ; ce n’est pas une optimisation du jeu et toutes les différences ne lui sont pas attribuées. [CPU complet](../../artifacts/arrival-cpu-v66.json), [natif final](../../artifacts/shooting-native-v66.json).

 Les offres de stress à forte population sont contrôlées : le producteur provisoire ne génère pas de nouvelle offre à partir de douze colons vivants. Le contrôle d’acceptation mesure N→N+1, pas une fréquence d’incidents. Aucun changement du lissage, des interruptions ou de la synchronisation minage/abattage : preuve V65 réutilisée pour ces contrats, sans la présenter comme rejouée.

Build final TypeScript/Vite réussi (314 modules ; avertissement de bundle >500 kB connu). Contrôles documentaires et intégrité des trois originaux conservés.

G0 consolidation ; G1/G2/G3 partiels ; premier incident de G4, G5 absent. Aucun jalon clos. Mode jour, prochaine tranche : menace et conséquences dans le camp ordinaire.
