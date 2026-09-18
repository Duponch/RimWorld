# Validation V58 — rencontre, fuite et soins

Finalisée le 19 septembre 2026 (journaux horodatés UTC le 18 au soir). Mode jour, main, sans agent supplémentaire. [Contrat](../development/encounters.md), [recherches et divergences](../research/encounter-reference.md).

## Parcours et corrections

- Passe complète avant la revue finale : **262/262 tests, 65 fichiers, 222,03 s**, pilote civil de plusieurs jours inclus. [Sortie](../../artifacts/tests-v58.txt). Puis ajout du parcours complet hostile → blessure → défense → secours → médicament → suivi sur **6 200 ticks**, et d’un cas d’invalidation du couvert ; ces ajouts ont été validés dans la passe ciblée finale, pas dans une nouvelle passe complète.
- **41/41 tests ciblés, sept fichiers, 6,18 s** après les corrections et l’optimisation : rencontre, captures du décor, tir, ralentissement, mobilisation, portes, ordres. [Sortie](../../artifacts/encounter-targeted-v58.txt). Reprise exacte aux phases de visée/vol, transport, fuite chargée ; bilan de matière, refus atomiques, appartenance, proche hostile/coins/portes, refuge par pièce et ordre imposé qui remplace la fuite.
- Build TypeScript/Vite réussi : 279 modules, avertissement existant du chunk graphique de 1,107 Mo minifié. [Sortie](../../artifacts/encounter-build-v58.txt). Pas de mise à jour des dépendances.
- La revue a supprimé une fausse interdiction de toute superposition hostile : une personne à terre peut se relever sous un passant. La permission reste contrôlée au départ de l’arête, sans invalider sa continuation. La borne de fin de fuite inclut la fin arrondie de l’arête capturée ; le test à trajet fractionnaire a détecté l’arrondi manquant, corrigé avant livraison. Le refuge de test exigeait aussi le matériau obligatoire de sa porte ; la fixture a été corrigée, pas le validateur affaibli.

**Vraie UI native : 21,3 s (23,1 s avec lancement)**. Création optionnelle, trois portraits/tableaux uniquement, inspection ennemie sans commandes coloniales, politique Ignorer, tir réel à 1× et 6×, défense ordonnée, activation du médecin, rechargement pendant transport puis traitement. Pas de dommage injecté pour cette chaîne. Une scène complémentaire observe la fuite en conservant la cargaison : 630 frames de fuite, dont 151 de marche chargée, aucun saut dépassant la borne indépendante de vitesse. 3 573 frames au total, 206 échantillons de projectile visible et 777 de visée hostile, aucune erreur navigateur/GPU. [Bilan](../../artifacts/encounter-ui-v58.json), [sortie](../../artifacts/encounter-ui-run-v58.txt). Capture de soins inspectée localement ; l’inspecteur Santé long peut encore recouvrir le panneau des ressources.

Les premiers essais UI ont révélé deux erreurs du parcours de test : bouton Charger encore désactivé après injection tardive du fichier, puis transport déjà fini avant l’observation. Le parcours passe maintenant par une vraie sauvegarde initiale et n’active le médecin qu’après le combat. Le premier timeout de 150 s a terminé sa commande ; aucun processus laissé actif. Le test a des délais d’action bornés. La longue partie UI civile de trois jours n’a pas été rejouée ; dernière preuve V56, vérification civile numérique incluse ci-dessus.

## Charge et optimisation mesurées

Windows 11 10.0.26200, Ryzen 5 3600, Node 24.11.1, Chromium natif WebGPU AMD RDNA-1, 1440×1000. Tests de charge exécutés séquentiellement, sans autre suite lancée par cet agent. Charge externe du PC non quantifiée : pas une preuve de machine totalement isolée.

Carte naturelle 250², 3/30/100 acteurs, tiers tireurs dirigés, tiers sentinelles qui répliquent, moitié des civils restants à proximité pour fuir, autres aux travaux. Santé réelle, aucun rétablissement artificiel. 240 ticks ; vingt premiers exclus des percentiles CPU mixtes/encodage, conservés dans la mesure distincte du combat actif. Le témoin CPU n’a pas d’ordres de tir joueur, mais garde les ennemis autonomes : ce n’est PAS une simulation sans combat. Aucun nouveau travail d’extraction achevé dans cette courte fenêtre ; ne pas annoncer une production minière d’après des intentions engagées.

Le profil CPU a identifié les captures répétées de carte de tir après impact et les topologies de refuge reconstruites. `combat-shot-batch` conserve le décor pendant la transaction de combat seulement ; les piles à couvert positif sont comparées après chaque impact. Un dépôt d’arme sans couvert ne reconstruit plus la carte, un chunk déplacé/déposé la reconstruit ; les autres captures mobiles restent renouvelées. La topologie de refuge utilise un cache détenu par monde, avec vérification complète des barrières à chaque lecture. Test de non-régression sur dommages, dépôt/retrait/déplacement et capture du tick suivant.

À cent acteurs, CPU mixte p95 **33,12 → 23,92 ms** (environ −28 %). Compteurs d’ordres acceptés/refusés, émissions, impacts, décès/incapacités, ralentissements et ressources identiques avant/après pour les trois charges. Ce contrôle de compteurs ne prétend pas comparer chaque octet d’une exécution avant/après. [Avant](../../artifacts/shooting-cpu-encounter-v58-before.json), [après](../../artifacts/shooting-cpu-encounter-v58.json). Les libellés génériques des premiers relevés décrivent le banc allié historique ; `hostileTargets:true` et `variant` identifient la variante réelle. Le protocole final a été précisé.

| Acteurs | Tick mixte CPU p95 / p99 / max (ms) | Encodage p95 (ms) | Image native p95 / p99 / max (ms) | Scène p95 (ms) |
|---|---:|---:|---:|---:|
| 3 | 5.72 / 8.14 / 23.81 | 2.81 | 8.4 / 12.5 / 120.8 | 3.0 |
| 30 | 13.46 / 21.91 / 29.91 | 4.89 | 12.5 / 20.7 / 108.3 | 5.6 |
| 100 | 23.92 / 38.34 / 56.54 | 4.74 | 20.8 / 37.5 / 145.8 | 6.6 |

[Mesure native finale](../../artifacts/shooting-native-encounter-v58.json), [avant optimisation](../../artifacts/shooting-native-encounter-v58-before.json). Passe finale en 43,3 s, aucune erreur ni nouveau pipeline pendant la mesure, capacité de projectiles jusqu’à 512 et 176 draw calls maximum. La scène est incluse dans le CPU de frame ; le callback snapshot n’inclut pas le décodage IPC. Les passages natifs et CPU n’utilisent pas exactement la même séquence de commandes (rétargetage CPU toutes les 60 unités), et la fin native est observée par polling : ne pas soustraire leurs percentiles.

**Limites restantes :** 23,92 ms CPU p95 dépasse le budget de 16,67 ms d’un tick à 6×, avant communication/rendu. La mesure de combat actif, qui inclut le démarrage des fuites, atteint 207,94 ms maximum à cent acteurs. Le rendu atteint 145,8 ms maximum. Les candidats de refuge, cibles de projectile et communications restent des postes à profiler avant de densifier les combats. Aucun engagement de fluidité parfaite ni de vitesse maximale soutenue à cent acteurs.

## Récolte et vitesse

45 secondes de minage, puis 45 d’abattage natifs sur 250², trois colons, cycles 1×/6×/1×/3× par boutons. **40 + 42 travaux terminés**, 10 545 + 10 529 images, zéro attente de tampon, saut, pénétration rocheuse ou erreur. p95 image 4,3 ms, maxima 20,9 ms. Les 44 changements de vitesse atteignent le nouveau taux complet sous **35,7 ms**. Les disparitions sont contrôlées contre le temps de présentation, jamais en avance sur leur tick. Les diagnostics de premières arêtes futures au démarrage restent dans le rapport ; ils ne sont pas des attentes du tampon en mouvement.

[Rapport brut](../../artifacts/harvest-sync-v58.json). Les deux phases ont passé `assertHarvestPhase` avec vitesse/actions activées sur le rapport enregistré. Aucun seuil assoupli. La capture native peut toujours comporter des pointes dans d’autres configurations.

## État livré et suite

Première rencontre jouable optionnelle ; camp civil historique conservé. Soins, équipement principal, mobilisation et tir désormais utilisés contre une sentinelle. Restent notamment mêlée/poursuite/riposte complète, vêtements/inventaire, santé complète, social/animaux, météo/saisons/biomes, narrateur/raids/monde et vaste catalogue Core. Le NPC n’a ni besoins autonomes complets ni récupération d’arme ; une sentinelle remise debout mais désarmée peut rester passive et hostile.

G0 consolidation ; G1/G2 partiels ; G3 engagé ; G4/G5 ouverts. Aucun jalon clos, estimation globale toujours environ 20 % (15–25 %). Prochaine livraison selon ROADMAP : mêlée élémentaire, puis tir automatique/réaction Attaquer et poursuite. Mode jour maintenu.

Contrôle documentaire final : aucun lien local manquant dans les documents modifiés, trois originaux byte-identiques à HEAD, `git diff --check` propre.
