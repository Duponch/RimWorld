# Interface native en carton — V476 qualifiée localement

L’utilisateur a demandé la refonte complète UI/HUD/menus à partir de son prototype `diorama_carton_hud_3d_three_js_webgpu(3).html`. Il a rejeté le premier essai qui projetait la disposition et les contrôles DOM existants, puis explicitement autorisé la reprise : « Très bien, dans ce cas commence le travail ».

Précision humaine suivante : les proportions, dimensions, placements, structures et textes du prototype peuvent être adaptés. L’exigence porte sur son rendu de cartons découpés aux ciseaux, sa peinture et ses pictogrammes, avec de vrais objets et interactions 3D. Les contenus et actions du jeu sont conservés.

## Architecture actuelle

- `src/ui3d/prototype-art.ts` reprend les fonctions originales de découpe, peinture, feutre, pictogrammes, scotch et les douze boutons. Les ressources sont détenues et libérées explicitement.
- `NativeStage` place les objets dans une scène perspective attachée à la caméra. Le raycast, la sélection, la navigation des contrôles, les pages et le défilement sont calculés par cette scène. Aucun rectangle, contrôle ou clic de l’ancienne interface n’alimente ce chemin.
- L’interface native utilise le renderer du jeu pour sa composition en partie ; les écrans sans carte possèdent un renderer à la demande. Un cache GPU conserve le rendu éclairé des vrais objets jusqu’à leur modification. Les éléments immobiles n’entretiennent pas d’animation continue. Le compteur inclut la passe de sortie de Three.js : deux appels de rendu pour une composition stable dans les contrôles actuels.
- `native-contract.ts` décrit des données et actions, sans élément DOM. Les adaptateurs lisent les états confirmés et envoient les commandes existantes. La simulation et le schéma 293 ne changent pas.
- Le canvas de rendu, les textures procédurales Canvas2D, le service système de composition de texte et le sélecteur système de fichier restent des services du navigateur. Ils ne décident pas de la disposition ni des zones cliquables des boutons.
- L’ancien chemin reste un témoin de développement explicite `?ui=legacy`. Le premier essai de projection DOM est rejeté ; ses fichiers et preuves sont conservés séparément, sans gain revendiqué.

## Contrôles acquis et limites

Deux captures du prototype original avec la version locale de Three.js sont conservées dans `tmp/ui3d-v476/reference/`. Le fichier original emploie Three.js 0.170 ; le projet emploie 0.186. La différence est déclarée dans le manifeste.

La barre extraite présente les mêmes dessins, géométries et matériaux dans la scène isolée. Les écrans d’accueil natifs démarrent dans deux tailles de fenêtre sans erreur applicative. Un premier défaut d’initialisation du stockage et le survol indésirable du grand support ont été reproduits puis corrigés ; les échecs restent conservés. Les premières vérifications de clic et d’annulation de la barre passent ; une 404 de favicon du pilote reste dans son ancien échec et a été corrigée dans le pilote.

Les modèles natifs couvrent maintenant accueil/création géographique/candidats/chargement/options, Architecte, Travail, Planning, Assignations et leurs politiques, animaux/faune/recherche, quêtes/accueils, cartes et caravanes, factions, voyages et échanges individuels, commerce visiteurs/orbital, historique, inspections et commandes contextuelles, carnet et gestion des sauvegardes. Les réglages spécialisés relisent leurs vrais propriétaires : stockage lié, factures, soins/caissons, réacteur, enclos/pièges, zones et permissions des objets. Les alertes des anciens contrôleurs sont projetées depuis les faits actuels ; les nouvelles menaces utilisent le reçu confirmé du bridge.

L’ancienne interface ne sert pas de façade cachée à ces fonctions. Les anciens éléments sont retirés de la page active ; les diagnostics de développement n’exposent que des observations. La saisie attend sa validation avant une autre action ; Tab/ShiftTab suivent les objets natifs, et une valeur refusée conserve son brouillon. Le rectangle de sélection et les annulations au relâchement sur l’UI sont natifs.

### Qualification acquise au 25 octobre, 16:45 UTC

- Typage acquis en 37,584 s (`tmp/validation-runs/ui3d-v476-type-final-2026-10-25T16-41-29.880Z-12236/`).
- 68 cas distincts ciblés acquis par reprises sur art/cache, sélection, sauvegardes, modèles monde/inspection/commerce/accueil, téléchargement, GameSession et création géographique ; trois cas purs d’alertes passent ensuite en 34,010 s. La suite complète du dépôt n’a pas été exécutée. Le nouveau cas de réserve périphérique reste à exécuter.
- Le premier groupe de 34 cas avait deux attentes GameSession obsolètes : l’argument existant `snow-phased-v1` manquait des oracles. Attentes strictes corrigées, aucun changement de GameSession.
- Groupe de 68 : 58 passent et dix échouent sur les préparations d’accueil/commerce (`native-models-r2`). Reprise : dix passent et deux préparations restent rouges (`arrival-trade-fixtures-r3`). Dernière reprise filtrée : les deux passent en 33,505 s (`fixture-corrections-r4`). Les échecs et journaux restent conservés. Les préparations corrigent des sauts d’horloge d’usure, une frontière occupée rendue impassable et un bois refusé par le marchand ; aucune garde ou assertion métier n’a été assouplie.
- Barre isolée : clic, relâchement hors bouton, arrêt des animations, validation asynchrone avant Appliquer et refus acquis. Tab est acquis après correction du pilote pour attendre la validation asynchrone avant Entrée : `native-fixture-tab-r2`, 11,075 s.
- Un parcours Éclaircies antérieur a acquis une vraie modification de priorité par les boutons natifs. Les dix autres panneaux ont ensuite été ouverts. Une première reprise a trouvé l’initialisation inutile de l’ancien contrôleur de zones ; elle est supprimée du chemin natif. Le dernier arrêt du pilote cherchait une sauvegarde créée mais hors des lignes visibles ; le pilote parcourt maintenant réellement la liste.

Le premier essai de composition GPU avait présenté une inversion verticale ; l’UV du plan a été corrigé, et les captures suivantes sont orientées correctement. Ces preuves sont distinctes des tests simulés du cache.

### Parcours et conservation acquis

Le parcours `native-save-reload-r5` passe en 104,639 s : copie nommée par saisie native, export, chargement de la copie, second export, Options et Aide. Les deux fichiers de 14 557 884 octets ont le même SHA-256 `6ab31672bfcbfedb96449f5b602cd2798fc99100c7c27967b338f4bd4caf1973`. Ils restent dans `tmp/ui3d-v476/native-2026-10-25T16-53-47.985Z/` (le dossier exact est également consigné par le rapport du pilote). Les anciens arrêts du pilote sont conservés : clic pendant une opération encore grisée, puis contrôle de disponibilité trop tôt pendant la reconstruction du renderer. Les diagnostics exposent maintenant l’état occupé et les contrôles désactivés, sans action supplémentaire.

`native-real-creation` passe en 100,912 s : vraie génération géographique avec graine 476250, globe tourné/zoomé/sélectionné par pointeur, choix admissible et confirmation du lieu, huit candidats observés par défilement, choix des originaux 4/1/2 et renommages natifs. Les mêmes trois noms sont retrouvés chez leurs propriétaires réels dans la nouvelle carte WebGPU 250², y compris les capsules encore fermées. Captures et projection confirmée : `tmp/ui3d-v476/native-creation-2026-10-25T16-56-09-760Z-28440/`. Aucun contrôle HTML actif dans ces parcours ; aucune commande de création ni ticket fabriqué par le pilote.

Un cas supplémentaire de réserve à plusieurs cellules passe : depuis une cellule périphérique, agrandir/réduire et supprimer ciblent l’identité logique de la zone, tandis que ses réglages gardent l’identité physique requise. Un cas de notification de caravane périmée passe aussi. **73 cas distincts ciblés acquis par reprises** ; suite complète non exécutée.

### Mesures comparatives

Deux séries sans profilage CPU échantillonné utilisent les octets originaux des Éclaircies, le même World initial exporté, caméra/orbite/réglages identiques, Chrome visible WebGPU, 1440 × 1000, DPR 1, son et musique désactivés. Contextes isolés neufs ; aucune source servie modifiée pendant chaque série. W1 et W2 sont l’interface HTML de développement actuelle, C l’interface native ; ce n’est pas une comparaison des deux paquets de production. Les trois secondes de préparation restent en pause ; la fenêtre inclut le départ de vitesse et ses premiers travaux réels. Le débit est celui des ticks confirmés, pas une déduction des FPS.

| Fenêtre | p99 mural W1 / C / W2 (ms) | Maximum W1 / C / W2 (ms) | Débit réel W1 / C / W2 |
|---|---|---|---|
| 20 s, ×1 demandé | 56,5 / 40,6 / 44,5 | 91,7 / 74,2 / 101,7 | 0,841 / 0,982 / 0,983 |
| 20 s, ×3 demandé | 55,6 / 49,8 / 55,1 | 88,3 / 105,7 / 75,8 | 2,366 / 2,332 / 2,566 |
| 20 s, ×6 demandé | 59,0 / 51,5 / 64,4 | 193,6 / 98,2 / 89,9 | 2,924 / 3,021 / 2,374 |
| Reprise 40 s, ×3 demandé | 59,6 / 58,7 / 59,8 | 115,7 / 92,1 / 257,5 | 2,004 / 2,002 / 2,032 |

Première série acquise en 1 139,564 s : `tmp/ui3d-v476/native-performance-2026-10-25T16-59-10-434Z-31080/`. La dérive des témoins interdit d’attribuer les améliorations au seul natif. Le premier ×3 a une pointe et un débit à contrôler ; la reprise de 456,168 s conserve une différence de débit d’environ −0,06 % / −1,45 % par rapport aux deux témoins et des p99 proches : `tmp/ui3d-v476/native-x3-confirmation-2026-10-25T17-18-37-362Z-31484/`, chemin exact dans le journal `ui3d-v476-ui-x3-confirmation`. Aucune baisse significative établie dans cette reprise ; **aucun gain global ni confort général acquis**. ×3 et ×6 demandés ne sont pas toujours effectivement tenus, y compris par les témoins.

Les RAW conservent RAF, vrais débuts muraux, callback terminal, ticks confirmés et affichés séparés, ainsi que CDP `TaskDuration` et `ThreadTime`. `TaskDuration` est une durée de tâches MAIN, pas le CPU OS. `frameCpu` est un intervalle mural synchrone. Les compteurs du cache lus avant/après débordent la fenêtre active et excluent la reconstruction d’encre ; ils ne mesurent pas le coût total UI. Aucun temps GPU direct mesuré, aucune généralisation aux autres cartes, résolutions, campagnes ou panneaux ouverts.

Une capture native en pause sans cache est conservée. La comparaison de la barre (1440 × 105 pixels, y=895) entre cache et rendu direct donne 99,780 % des composantes RGB identiques, p95 d’erreur nul et erreur moyenne 0,00470 / 255 ; les différences maximales isolées atteignent 18. Reçu `tmp/ui3d-v476/cache-pixel-comparison.json`. Ce contrôle borne la composition visuelle de cette barre ; il ne prouve pas une égalité de tous les pixels de l’écran ni un coût GPU nul.

Après les mesures, deux raccords d’arrivée commerciale sont fermés : la notification de caravane ouvre le dossier natif du groupe réel au comptoir, et l’arrivée du voyage commercial individuel conserve la pause et l’onglet approprié avant le retour du chemin natif. Le peintre historique caché n’est plus appelé par cette notification. Le renderer, les dessins, le cache, les horloges de simulation et le transport mesurés ne changent pas ; les manifestes des mesures décrivent explicitement l’état antérieur à ces deux raccords. Le nouveau modèle passe ses cinq contrôles ciblés en 30,025 s.

### Clôture locale

La récupération graphique passe en 189,868 s sur les sources finales : `tmp/ui3d-v476/native-recovery-2026-10-25T17-31-49-520Z-25748/`. Le pilote provoque d’abord `reportFailure`, puis une vraie destruction du GPUDevice de la scène du jeu. Le canvas natif autonome reste visible et redessine les boutons d’incident ; un vrai clic rétablit un nouveau renderer, un nouveau device et un nouveau cache. Travail réapparaît. Les deux exports après récupération restent strictement identiques à l’export entier initial, avec le même SHA-256 `6ab31672…` ; aucune réparation de partie n’est effectuée.

Compilation finale TypeScript + Vite acquise en 54,401 s (`ui3d-v476-build-2026-10-25T17-35-36.005Z-10960`). `git diff --check` et contrôle documentaire acquis ; ce dernier passe en 8,694 s avec le Python fourni par le runtime. Le premier lancement par l’alias système `python` n’avait pas exécuté le contrôle (EACCES), et reste journalisé. Les contrôles physiques minage/abattage n’ont pas été rejoués : les horloges, le bridge et les phases de travail ne changent pas ; les commandes et les vitesses empruntent leurs API existantes. Les tests ciblés ne remplacent pas la suite complète ni une campagne naturelle.

La migration des surfaces et actions examinées est acquise localement. La revue des actions et ces parcours ne prouvent pas une parité exhaustive de toute information historique. Les comparaisons ciblées ne montrent pas de baisse significative confirmée ; elles n’établissent ni un coût UI nul ni une absence universelle de régression. Les limites de confort déjà ouvertes du jeu restent ouvertes.

Quatre lignes vides finales sont retirées avant enregistrement ; le JavaScript émis avant/après est strictement identique avec le transformateur TypeScript de Node. Reçu `tmp/ui3d-v476/line-ending-normalization.json` ; contrôle final de la différence indexée acquis. Aucune nouvelle qualification de comportement n’est déduite de ce nettoyage.

V475 reste la version en production. Aucune publication V476 n’a eu lieu. Les sauvegardes, preuves antérieures et `references_UI/` humain restent préservés.
