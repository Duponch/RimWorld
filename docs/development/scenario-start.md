# Nouvelle partie — Trois survivants V80

Contrat V80 du 20 septembre 2026. [Preuves de création, sauvegarde, UI et trois jours sur trois graines](../history/validation-scenario-v80.md). La [recherche](../research/scenario-start-reference.md) conserve sources, versions et écarts. [ROADMAP](../ROADMAP.md) reste l'unique calendrier.

**État après enquête du 20 septembre :** ce contrat décrit toujours le gameplay V81. La cible utilisateur devient Atterrissage forcé / Cassandra / Récit d'aventure avec des [menus dédiés](new-game-menus.md), encore non livrés. La [référence locale 1.6.4871](../research/core-reference-baseline.md) confirme désormais l'heure initiale locale de 6 h et révèle l'écart de débit réel (16 min 40 par jour Core contre 10 min ici), ainsi que les écarts de génération et de cadence. Aucun de ces points n'est corrigé par un changement de nom ou de documentation.

## Profils séparés

**Trois survivants**, profil version 1, devient le choix normal de nouvelle partie. Départ original inspiré de Crashlanded Core, adapté au catalogue jouable. Le **camp pédagogique** historique demeure sélectionnable pour ses parcours guidés et recherches ; la **sentinelle** reste un contrôle distinct. Un scénario ne se déduit jamais d'une sauvegarde historique ou de la présence d'objets.

Le choix visible annonce trois adultes, vallée tempérée, provisions, technologies connues et pression provisoire. Tailles jouables 200²/250², 250² par défaut, séparées des diagnostics compacts. Monde, biomes complets, huit candidats, biographies et difficulté détaillée ne sont pas présentés comme disponibles.

## Dotation et technologies

| État initial | Quantité et propriété |
| --- | --- |
| Personnes | 3 adultes, profils locaux distincts de compétences/traits. |
| Bois | 300 unités au sol. |
| Acier | 450 unités au sol. |
| Composants | 30 unités au sol. |
| Repas emballés | 50 unités physiques, `survival-meal`. |
| Médicaments | 30 unités industrielles. |
| Arme | 1 revolver au sol, à équiper physiquement. |
| Protection | 1 gilet au sol, à enfiler physiquement. |
| Habillement | 3 chemises en tissu, une portée/personne ; aucune copie au sol. |
| Recherche | Vêtements complexes et Climatisation connus au tick 0 ; aucune XP/travail fictifs. |

Quantités totales par objet, pas par pile. Respecter limites de pile, compatibilité et une pile/cellule, sans effacer une ressource pour faire une place. Personnes, vêtements et piles ont des identités/propriétés cohérentes ; l'inventaire participe aux bilans habituels. Aucun lit, réserve, chantier ou repas consommé créé pour le joueur. Départ après arrivée, sans capsule ni cryptosommeil simulés. L’horloge conserve `tick = 0`, soit 00:00 dans notre cycle ; c'est un écart avec les 6 h locales vérifiées depuis dans Core 1.6.4871. Aucun décalage global de saison/latitude/heure n’est ajouté dans V80/V81.

Les deux projets acquis suivent ce sous-ensemble industriel Core. La fenêtre Recherche peut donc n'avoir aucun projet restant : l'expliquer, sans verrou fictif. Le camp pédagogique conserve son cycle complet. Ajouter ultérieurement un projet ne signifie pas qu'il est déjà connu.

Différences assumées : argent, fusil, couteau, pantalon/casque pare-balles et animal domestique absents ; pas de stock distant Core de 720 acier/7 repas/3 débris. Chemises en tissu et vêtements Core en synthétoffe ne sont pas équivalents. Aucune compensation silencieuse en revolvers, médicaments ou lièvres domestiqués. Objets immédiatement autorisés faute de système d'interdiction. Marges de survie et défense locales, pas parité du scénario complet.

## Paysage et installation

Le profil sépare terrain et pose du scénario. Il conserve les conventions de [génération](world-generation.md), [grille/déplacements](spatial-motion-storage.md) et [faune](wildlife.md), mais retire les aides du camp : clairière 7×7, deux arbres/un buisson fixes, affaissement du relief autour d'un centre présumé.

Choisir après génération un point dans une composante praticable reliée au bord. Personnes et dotation exigent des cellules admissibles/accessibles et assez d'espace, avec obstacles/coins communs. En cas d'impossibilité, échec explicable avant publication ; aucun passage creusé silencieusement au chargement. La garantie ne rend pas toutes les poches accessibles et ne place pas chaque ressource près du camp.

Vallée locale avec rivière, sols et géologie. Densités d'arbres/baies calibrées sur plusieurs graines ; densité Core de plantes ≠ probabilité d'arbre. Végétation moins uniforme pour rendre navigation et installation lisibles, sans annoncer chênes/peupliers/écosystème complets. Plafond de départ **12 lièvres sur 250²**, poses admissibles nécessaires ; ce n'est pas un budget Core multiespèce ni une garantie sur toute dimension.

Génération unique, sans entretien par frame. Mesurer arbres/baies/minerais, sols, roche, accès, distances et temps sur plusieurs graines ; distinguer simulation/navigation/rendu. Le camp historique n'est pas réétalonné parce que le défaut UI change.

## Persistance et continuation

Scénario/version constituent une provenance, pas une commande rejouée au chargement. Conserver carte, objets, personnes, technologies, calendriers et RNG réellement obtenus. Valider strictement l'ancien schéma avant migration ; ne pas inventer stocks, technologies, animaux ou identité de départ. Les anciennes parties continuent ; Survivants nécessite une création explicite.

La commande worker transporte le choix. Même graine, dimensions, générateur et profil reproduisent le départ. Recharger ne redonne jamais les provisions. Ne pas confondre flux aléatoires du terrain/personnes/faune/incidents avec l'aléa visuel.

## Pression et acceptation

Calendriers d'arrivées, raids et climat : réglage prototype explicite. Pas d'étiquette de difficulté Core ; richesse/adaptation, saisons, maladies, prédateurs et autres contraintes restent incomplets. Ne pas simuler une équivalence en changeant discrètement besoins/rendements/statistiques.

Campagne ciblée, résultats détaillés dans la preuve :

- Plusieurs graines 250² et formats compacts : pose admissible, aides artificielles absentes, bilan exact, personnes/technologies et reproductibilité.
- Sauvegarde/reprise : anciennes parties inchangées, scénario confirmé, aucune seconde dotation, continuation identique.
- Premiers jours : réserve, couchages, abri et source alimentaire engagés par commandes ; consommations/dépenses/production/santé, journal et checkpoints. Ne pas retirer les 50 repas/300 bois pour fabriquer une urgence.
- UI réelle : création, explication, carte/personnes/possessions, projets connus, pause/vitesses. Un camp de test ne prouve pas ce départ.
- Coûts : génération, simulation/worker et rendu distingués, mesures successives sans HMR ; charge et limites annoncées.

Résultats et seuils locaux appartiennent à la preuve du lot. Quelques jours joués ne valident ni une campagne complète, ni tous les contenus manquants, ni la difficulté de RimWorld.
