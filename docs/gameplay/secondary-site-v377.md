# V377 — Un second site persistant

15 octobre 2026, schéma 240. Lot produit qualifié dans le périmètre ci-dessous ; publication groupée avec le catalogue prévue, dernière production V376.

## Pour le joueur

Dans **Monde → Globe et groupe**, formez une expédition avec des personnes disponibles et des provisions présentes au sol. Après leur chargement, leur sortie et le voyage réel, **Entrer sur la carte** ouvre une autre carte terrestre. Les mêmes personnes et objets y arrivent : aucune nouvelle équipe ni dotation n’est créée. Le foyer continue de vivre.

Le panneau indique la carte affichée et propose **Afficher le foyer** ou **Afficher le second site**. Ces boutons changent la vue, jamais la position des personnes. Le retour demande une nouvelle formation, des provisions accessibles et une sortie physique ; les personnes rentrent puis déchargent. Le second paysage, ses travaux et les biens laissés demeurent pour la revisite. Sauvegarder/exporter conserve les deux cartes même lorsque la seconde est affichée.

Le panneau Monde réserve désormais la largeur réelle du HUD Temps : il ne recouvre plus Pause sur les dispositions desktop contrôlées.

## Référence et adaptations

[Alpha16 officielle](https://ludeon.com/blog/2016/12/rimworld-alpha-16-wanderlust-released/) documente plusieurs cartes simultanées, portraits groupés et formation de caravane. La [mise à jour gratuite1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) décrit Jump to…, les cartes actives et les camps temporaires. Notre **site secondaire persistant** est une adaptation bornée : il ne prétend pas reproduire ces camps temporaires ni le réglage Core du nombre de colonies. Les règles de personnes, entrée et transport réemploient le relevé Core1.6.4871rev590 de [V216](../research/planet-group-core-v216.md). Aucun code ou asset propriétaire copié.

Référence visuelle réellement inspectée : [caravane sélectionnée, annonce Steam officielle du4novembre2016](https://steamcommunity.com/games/294100/announcements/detail/516054012099474890). Globe, route, groupes de portraits et commandes permettent de comparer le découpage de l’interaction ; build exact inconnu et image antérieure à Alpha16, aucune preuve de disposition1.6 actuelle. Note et image restent privées sous tmp/multimap-v377/reference-ux-review.md.

## Autorité, sauvegardes et coûts

Une seule horloge, un seul allocateur d’identités, un flux métier et des politiques/recherches partagés. Chaque carte garde ses propriétaires physiques, réservations et environnement. La connaissance des personnes absentes est distincte de leur présence physique. L’annulation de recherche libère les tâches des deux cartes. Les deuils conservent leur portée locale et leur connaissance de campagne.

Le moteur avance les deux cartes une fois par tick confirmé. Les snapshots publient seulement la carte affichée et les identités connues ailleurs ; terrain, piles et tâches de la carte inactive ne sont pas envoyés au rendu. Le changement de vue renouvelle l’époque de présentation, même au même tick. Les contextes restent stables, sans clone du monde par image. Deux simulations ont néanmoins un coût supplémentaire : aucune mesure FPS générale ou charge250²×2 certifiée par les petites scènes de contrôle.

Le schéma239 est strictement validé avant migration neutre240 : ni site, personne, matière, recherche ni histoire ajouté. Les propriétés de présentation sont interdites aux sauvegardes. La sauvegarde courante valide séparément les deux cartes puis l’unicité globale des identités ; les vues à accesseurs ne contournent pas les gardes de données ordinaires. Au premier accès réel, les calendriers locaux sont prospectifs. L’expiration d’une éruption solaire partagée suit les deux passes électriques, sans changer l’ordre historique d’une partie à une carte.

## Limites

Un seul second site, un seul groupe ; pas encore de troisième carte, partage de groupe, renfort/secours, abandon ou récupération complète d’une expédition décimée. Le bois coupé peut rester au site ; son export général n’est pas ajouté à la liste de fret existante. Le retour garde les critères actuels de disponibilité du groupe. Le paysage original n’est pas un équivalent graine pour graine du Core.

Besoins, blessures, climat, faune, météo, maladies et plusieurs incidents locaux continuent. **Raids, mécanoïdes et visiteurs ambiants ne sont pas encore adoptés sur le second site** ; aucune parité Cassandra multicartes annoncée. Les capacités Core non représentées et l’équilibrage de campagne restent ouverts.

## Contrôles

Préparations explicitement nommées, sans reprise de la campagne historique98038. Sorties sous tmp/multimap-v377/ et tmp/validation-runs/v377-* ; les premiers rouges sont conservés.

- Frontières de propriétaires/politiques/recherche : quatre anciens fichiers acquis dans la première passe ; seuls les nouveaux oracles en échec ont été repris.
- Cinq cas multicartes PASS12,063s après correction de la vue de validation et du domaine saleté à l’entrée. Formation, coupe au contact, retour/revisite, sauvegarde/reprise, horloge, politiques, identités, climat et changement de vue au même tick couverts.
- Le voisin froid42 de la première fixture a réellement tué deux personnes préparées sans équipement adapté ; sortie tick14141 conservée. Le voisin tempéré52 est un cas distinct fixe et déclaré, sans modification de règle thermique ni guérison de cette branche.
- Treize cas transversaux dans trois fichiers PASS12,090s : deuil hors carte, inventaires et contexte géographique. Le quatrième nom demandé n’existait pas et ne compte pas.
- Corpus63 sauvegardes publiques PASS86,868s : migration, validation, roundtrip et Decoder, sources historiques immuables, sans avancée.
- Deux corrections de revue : calendrier maladie Cassandra admis dès l’entrée en pause ; fin d’éruption solaire après les deux cartes. Sept cas dans deux fichiers PASS21,415s. Typage sources et tests changés PASS17,144s après intégration.
- Natif01 RED28,414s sur attente initiale de chargement trop courte. Natif02 RED72,372s puis03 RED84,598s : Monde intercepte Pause. Le contournement Échap du pilote n’a pas suffi ; correction CSS de la réserve de largeur, sans clic forcé ni modification du World navigateur.

Parcours natif, présentation, build et livraison finale : résultats à compléter avant clôture.
