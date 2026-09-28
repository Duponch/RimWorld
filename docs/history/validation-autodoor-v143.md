# Validation des portes automatiques V143 — 28 septembre 2026

Le [relevé Core 1.6.4871](../research/autodoor-core-v143.md) distingue la porte automatique de la porte manuelle : recherche de 600 points, 25 unités du matériau principal, 40 aciers fixes, deux composants ordinaires, Construction 6 et consommation de 50 W. Le [contrat Lisière](../development/autodoor-v143.md) explicite la conversion des travaux et les deux écarts encore ouverts : panne mécanique aléatoire et remplacement direct d'un mur.

## Règles livrées

La recherche ouvre un nouveau plan sans modifier les portes existantes. Les sept matières locales conservent leurs facteurs de travail ; l'acier choisi comme matériau principal fusionne correctement les deux lignes en 65 aciers, auxquels s'ajoutent deux composants. Le chantier utilise livraison, réservation, restitution et compétence réelles. La porte construite occupe une case, partage les règles des pièces, toits, coins, tirs, animaux et acteurs avec les autres portes, et consomme 50 W du réseau. Elle ne possède pas d'interrupteur individuel.

L'alimentation réduit à un quart le temps d'ouverture ; bois et acier s'ouvrent dès l'approche confirmée, la pierre reste lente au seuil. Sans courant, le passage reste possible à la vitesse manuelle et avec les mêmes permissions. Une coupure ou reprise en cours d'ouverture conserve sa fraction et change seulement la durée restante. Le test couvre aussi une traversée engagée, l'obstruction et la poursuite identique après sérialisation. Une sauvegarde V141 est validée **avant** la migration neutre vers V143 ; elle n'acquiert ni recherche ni porte, et ses champs V143 déclarés sous V141 sont rejetés.

## Contrôles exécutés

- **Noyau et systèmes voisins : 73/73 tests** dans 16 fichiers : nouvelles règles V143, icônes, portes historiques, réseau et coupure, pièces, toit, température, prison, combat, mêlée et enclos.
- **Oracles historiques corrigés : 44/44 tests** dans 11 fichiers, dont migrations V84/V101/V105, production, médecine, commerce et lots visuels. Les corrections portent sur les fixtures et assertions devenues anciennes : champs ajoutés par des schémas ultérieurs, calendrier, filtres de facture, fragments naturels et nouveaux lots résidents. Elles ne détendent pas la validation des sauvegardes ni les règles du moteur.
- **Chromium/WebGPU : 1/1 parcours natif**. Depuis l'interface, la recherche se termine par le moteur, le joueur pose un plan, le colon livre et construit, la porte raccordée affiche 50 W, puis une démolition coupe réellement son alimentation. Inspection, politiques de porte, sauvegarde/rechargement, validation du monde et absence d'erreur navigateur sont vérifiés. Des captures rapprochées alimentée/sans courant ont été examinées.
- `npm run typecheck`, `npm run build` et `git diff --check` passent. Le build signale les gros chunks déjà présents ; ce n'est pas une erreur de compilation.

Un essai de la **suite historique complète** a été interrompu après identification de plusieurs anciens oracles périmés et de longues simulations qui monopolisaient l'hôte. Les échecs reproduits dans les onze fichiers ci-dessus ont été corrigés puis rejoués ensemble. Cette preuve ne prétend donc pas que l'intégralité des anciens tests est verte.

## Coût et limites

Les deux vantaux par porte demeurent dans le **lot instancié résident** ; ils lisent la même horloge de présentation que les portes manuelles. Deux petits témoins lumineux rejoignent le lot de VFX de structures seulement quand le courant est actif. Les données d'instance sont réécrites lors d'un changement de porte, d'alimentation ou de caméra pertinente, pas pour chaque image d'animation ; aucun objet Three individuel, recherche de chemin ou tirage métier par image n'a été ajouté. Le bilan électrique et le maintien des portes restent calculés au tick, de sorte que des colonies dotées de nombreuses portes ont un coût CPU et GPU supplémentaire réel. Aucun microbanc GPU isolé ou comparaison générale de FPS n'a été effectué ; les valeurs affichées pendant le parcours natif ne prouvent ni cadence stable à 240 FPS ni débit ×6.

Core porte aussi `CompBreakdownable` et permet la pose sur un mur existant. V143 ne simule pas cette panne indépendante des PV et ne remplace pas le mur en une commande ; ces deux différences sont à traiter dans des lots futurs avec leur propre persistance et des règles de restitution prévalidées.
