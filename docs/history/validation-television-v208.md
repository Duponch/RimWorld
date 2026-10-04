# Validation V208 — Télévision cathodique

4 octobre 2026. Base locale `0ffb0624` (V207). [Contrat](../development/television-v208.md), [recherche primaire](../research/television-core-v208.md). Schéma 190. Les résultats ci-dessous sont bornés aux contrôles effectivement exécutés.

Le lot ouvre une cinquième famille de loisirs avec construction et visionnage physiques. Le visionnage au lit, l'ordre direct, les écrans avancés, leurs programmes animés et leur son dédié restent différés. La charge pondérale du mobilier transporté n'est pas modélisée.

## Règles et contrôles ciblés

Core local 1.6.4871 rev590, XML et binaire identifiés dans la recherche : coût 80 acier + quatre composants, Construction 7, 10 000 travaux Core, 100 PV, 200 W, rectangle frontal 5×3 et cap huit. La construction est adaptée à 1 000 ticks locaux neutres ; le parent Électricité au socle déjà disponible, tandis que Mobilier complexe demeure requis. La revalidation de pièce/siège/visibilité pendant le visionnage est une adaptation de maintien. Pas de qualité ni de panne aléatoire à composant sur cet appareil.

**149 tests uniques dans 30 fichiers passent par reprises**, dont **31 nouveaux cas V208 dans sept fichiers**. Recherche au contact, refus avant prérequis, livraisons réelles, seuil Construction, coûts/restitutions, dégâts et réparation sans ingrédients, paquet porté/repose, orientations, même pièce/visibilité/vision, cap huit, sièges/services, gain après arrivée seulement, interruptions électriques et reprise exacte sont exercés. Le schéma 189 est validé strictement avant ajout de tolérance zéro/ennui faux aux propriétaires actifs de la carte et des voyages ; archives de départ historiques inchangées. Checkpoints/deltas invalides conservent l'ancien World.

Un **défaut produit** détecté au premier groupé était la préférence de siège appliquée après l'arrêt au but le plus proche : une chaise moins bien orientée pouvait l'emporter. Les buts correctement orientés sont maintenant choisis avant l'unique recherche ; le repli sur une chaise autrement orientée réutilise le composant exploré si les premières sont inaccessibles. Le témoin supplémentaire exige une seule recherche avec budget un, une destination réellement accessible et déplacement ordinaire ensuite.

Les **réparations d'oracles historiques** retirent seulement la famille neutre future des rétro-fixtures construites à partir d'un World courant et attendent son ajout au chargement. Les tests sociaux utilisent leur version courante ; le catalogue électrique compte désormais la CRT. Les refus de champs futurs, coûts et assertions métier sont conservés, sans modification d'octets des anciennes sauvegardes. Rapports `tmp/v208/targeted-a.json` à `targeted-d.json` ; les échecs intermédiaires demeurent dans leurs rapports. Le premier lancement Vitest a été empêché avant exécution par `spawn EPERM` dans le bac à sable, puis repris avec autorisation.

Les **54 payloads publics** passent empreinte SHA-256 après décodage, migration stricte, validation et aller-retour exact au schéma courant, sans réécriture historique. La nouvelle scène « Télévision · recherche et loisirs » contient trois colons, recherche à 998/1 000, acier/composants au sol et sièges, sans appareil ni chantier achevé ; sa préparation ne prouve pas les actions futures. Rapport `tmp/v208/catalogue.json`.

## CPU isolé

Sources simulation/script/helper et référence Git gelées, empreintes avant/après identiques. Node 24.11.1, Windows 10.0.26300, Ryzen 5 3600. Mesures réalisées seules, avant le navigateur. Scène historique `mixed-100` 250², tick 2 000, 104 humains, 670 structures et 10 077 ressources, strictement migrée ; oracles sur 62 500 cellules et quatre bornes. Capture et requêtes directes/indexées restent exactes face à V207 ; les 549 divergences direct/index historiques sont comptées, sans être présentées comme une correction V208. Tous les PRNG et le World sérialisé restent inchangés.

A/B/B/A, quatre rondes, huit échantillons par version de trois captures, quatre chauffes par version. Capture + validation des sites : p50 **0,9895 ms → 0,9804 ms**, p95 **1,0847 ms → 1,3995 ms** ; moyenne **0,9560 ms → 1,0235 ms**. Dispersion trop importante et protocole trop court pour conclure à un gain ou à un surcoût général. Aucune télévision n'est active dans ce témoin historique.

En absolu, scène 250² préparée avec huit personnes/huit sièges/quinze candidates et courant réellement établi : topologie déjà acquise renvoyée une seule fois par capture, 100 chauffes puis 16 échantillons de 100 captures/requêtes. Capture + quinze validations : p50 **0,01362 ms**, p95 **0,02800 ms**. Routage, choix/maintien des spectateurs, reconstruction de topologie, tick complet, worker, adoption, CPU image, RAF, GPU et FPS sont exclus. Cette mesure n'établit aucun coût nul. Rapport `tmp/v208/cpu.json`.

## Navigateur, présentation et livraison

**Parcours préparé Chromium matériel WebGPU 1/1 sur la version finale** ; le pilote refuse un adaptateur de secours ou logiciel. Chargement depuis Colonies de test, projet au bureau réel, Architecte/plan, prises et dépôts, construction, Horaires, trajet et gain au siège, pose assise face à l'écran, sauvegarde/rechargement, commande d'arrêt puis actionnement physique, libération des spectateurs, reprise de l'alimentation et du loisir. Aucun World n'est modifié depuis le navigateur pour accomplir ces actions. Zéro erreur de page/console constatée.

Huit parties CRT et un câble du réseau existant s'ajoutent au lot mobilier : même géométrie résidente et nombre de pipelines stable lors de la construction. Le témoin vérifie les poses au tick confirmé et le gain absent des trajets. Cela ne mesure pas le temps GPU ni les FPS généraux. Rapport `tmp/v208/native-r4.log`, capture `tmp/v208/native-r4/television-v208-V208-resea-1f986-itches-it-through-native-UI/television-v208.png`.

**Réparations de pilote natives distinctes du produit** : le premier délai de 45 secondes à 1× était incompatible avec 1 000 ticks neutres à six ticks/seconde, hors transport. Le diagnostic de la scène par transitions réelles termine à tick 4 235 après recherche à 3 071 ; le parcours utilise désormais le bouton 6×. L'oracle des huit parties omettait le câble sauvegardé ; la rotation attendue respecte aussi les tours continus. Un troisième parcours s'est arrêté sur un clic masqué : Échap depuis une cellule d'horaire annule la peinture et ne ferme pas Planning. La trace conservée a montré la cause avant reprise ; bouton de fermeture réel, délais d'action et collecte finale bornés. Les assertions métier restent en place. Rapports intermédiaires conservés ; le worker bloqué et ses seuls navigateurs enfants ont été arrêtés, sans toucher au jeu utilisateur.

**Présentation 250² minage/abattage réussie**, transitions 1×/6×/1×/3×, zéro saut, excès de trajet continu ou occupation solide. p95 RAF **4,3 ms / 8,3 ms** respectivement sur ces scènes instrumentées ; ce ne sont ni des temps CPU/GPU isolés ni des promesses de FPS. Rapport `tmp/v208/presentation.log`.

**Build et typage réussis : 707 modules.** L'avertissement historique de chunks dépassant 500 kB demeure. **Documentation : 710 documents, 7 022 liens, six en-têtes courants au schéma 190 ; trois sources originales byte-identiques.** Guide/catalogue, inventaire, matrice, roadmap, contrats/recherche et preuves reliés ; aucune clôture G0–G5 déduite de ce lot.

Recherche, implémentation, correctif produit, réparations d'oracle/pilote et contrôles exécutés restent distingués. Aucun contrôle exhaustif, campagne naturelle longue, ambiance sonore TV ou coût général CPU/GPU annoncé. Commit local seulement, puis attendre la relance en mode jour.
