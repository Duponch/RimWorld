# Nouvelle partie — Atterrissage forcé partiel V83 et profils historiques

**V83**, le 20 septembre 2026. La [référence locale Core](../research/core-reference-baseline.md) et le [contrat des menus](new-game-menus.md) gouvernent le nouveau départ. Les [preuves V80](../history/validation-scenario-v80.md) restent celles de Trois survivants : elles ne valident pas rétroactivement le nouveau profil. La [recherche de scénario](../research/scenario-start-reference.md) conserve sources, versions et écarts. [ROADMAP](../ROADMAP.md) reste l'unique calendrier.

Le nouveau parcours propose **Atterrissage forcé, Cassandra Classique partielle, Récit d'aventure et Rechargeable**. Les choix de difficulté et de sauvegarde sont requis, malgré leur unique possibilité active. L'interface annonce l'adaptation partielle et sa dotation réelle ; elle ne promet ni tous les objets Core ni le narrateur complet.

## Profils séparés

**Atterrissage forcé**, nouvel identifiant `crashlanded` révision 2 (révision 1 conservée pour les départs V82), reçoit un `gameProfile` révision 1 distinct : `cassandra-partial`, `adventure-story`, `reloadable`. **Trois survivants** conserve l'identifiant `survivors`, sa provenance et ses règles historiques. Le **camp pédagogique** et la **sentinelle** restent des scénarios de diagnostic accessibles explicitement aux parcours qui en dépendent. Le nouveau menu ne les présente pas comme des variantes Core livrées. Un scénario ne se déduit jamais d'une sauvegarde historique ou de la présence d'objets.

Le choix visible annonce trois adultes aux profils locaux fixes, forêt tempérée et relief local choisi, provisions, technologies connues et limites de narration. Le menu public crée une carte **250²**. La graine numérique est proposée aléatoirement hors simulation puis transmise explicitement à l'usine déterministe ; elle reste éditable et relançable. Ce n'est pas une graine de planète Core. Formats compacts et anciens scénarios restent des outils de diagnostic. Monde, biomes complets, huit candidats, biographies et difficulté détaillée ne sont pas présentés comme disponibles.

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

Quantités totales par objet, pas par pile. Respecter limites de pile, compatibilité et une pile/cellule, sans effacer une ressource pour faire une place. Personnes, vêtements et piles ont des identités/propriétés cohérentes ; l'inventaire participe aux bilans habituels. Aucun lit, réserve, chantier ou repas consommé créé pour le joueur. Départ après arrivée, sans capsule ni cryptosommeil simulés. La dotation disponible reste celle du profil Survivants ; V82 ne substitue aucun objet manquant.

Le nouveau profil commence au **tick écoulé 0, heure civile 06:00**. `calendarTick` applique le même décalage à la lumière, la croissance végétale, les horaires et la température quotidienne. Les échéances médicales, mouvements, conservation et incidents restent exprimés en temps écoulé. Les anciennes parties gardent leur phase civile antérieure ; latitude 45°, équinoxe et température de vallée restent des simplifications. Le débit nominal commun passe à **six ticks locaux/s**, 6 000 ticks/jour, soit 16 min 40 s par jour à 1×. Cela corrige le débit réel sans convertir les dates persistées ; dix ticks Core restent un tick local.

Les deux projets acquis suivent ce sous-ensemble industriel Core. La fenêtre Recherche peut donc n'avoir aucun projet restant : l'expliquer, sans verrou fictif. Le camp pédagogique conserve son cycle complet. Ajouter ultérieurement un projet ne signifie pas qu'il est déjà connu.

Différences assumées : argent, fusil, couteau, pantalon/casque pare-balles et animal domestique absents ; pas de stock distant Core de 720 acier/7 repas/3 débris. Chemises en tissu et vêtements Core en synthétoffe ne sont pas équivalents. Aucune compensation silencieuse en revolvers, médicaments ou lièvres domestiqués. Objets immédiatement autorisés faute de système d'interdiction. Marges de survie et défense locales, pas parité du scénario complet.

## Paysage et installation

Le profil sépare terrain et pose du scénario. Il conserve les conventions de [génération](world-generation.md), [grille/déplacements](spatial-motion-storage.md) et [faune](wildlife.md), mais retire les aides du camp : clairière 7×7, deux arbres/un buisson fixes, affaissement du relief autour d'un centre présumé.

Choisir après génération un point dans une composante praticable reliée au bord. Personnes et dotation exigent des cellules admissibles/accessibles et assez d'espace, avec obstacles/coins communs. En cas d'impossibilité, échec explicable avant publication ; aucun passage creusé silencieusement au chargement. La garantie ne rend pas toutes les poches accessibles et ne place pas chaque ressource près du camp.

V83 : forêt tempérée sans rivière, relief Plat/Petites collines/Grandes collines, deux ou trois pierres liées à la graine et provenance `site` persistée. Terre ordinaire, riche, gravier et pierre brute ont des propriétés distinctes ; fragments physiques, filons et végétation sont décrits dans le [contrat de génération](world-generation.md). Les anciens profils conservent leur vallée avec rivière. Ni essences complètes ni écosystème Core équivalent ne sont annoncés. Plafond de départ **12 lièvres sur 250²**, poses admissibles nécessaires ; ce n'est pas un budget Core multiespèce ni une garantie sur toute dimension.

V83 conserve pour les **baies** le tirage de maturité corrigé en V82, uniforme 0,15–1,5 borné à1 ; le profil Survivants historique garde0,15–1. Les positions et densités suivent maintenant les passes du site, avec les adaptations documentées ; aucun arbre ne reçoit un faux système d'âge. La croissance après création garde ses règles biologiques et sa lumière réellement disponible, sans objectif de récolte imposé à J7.

Génération unique, sans entretien par frame. Mesurer arbres/baies/minerais, sols, roche, accès, distances et temps sur plusieurs graines ; distinguer simulation/navigation/rendu. Le camp historique n'est pas réétalonné parce que le défaut UI change.

## Persistance et continuation

Scénario/version constituent une provenance, pas une commande rejouée au chargement. Conserver carte, objets, personnes, technologies, calendriers et RNG réellement obtenus. **V81 est strictement validée avant migration V82 neutre** : aucun `gameProfile`, décalage civil, stock, technologie, animal ou calendrier ajouté. Les champs V82 injectés dans V81 sont refusés. Le nouveau profil nécessite une création explicite ; `crashlanded` sans son profil appliqué, ou un profil Core greffé sur `survivors`, est invalide.

V82 est strictement validée avant migration V83 neutre : aucune carte régénérée, aucun `site` déduit, aucune nouvelle fertilité injectée. Le site est obligatoire pour la révision 2 de Crashlanded et interdit sur les autres provenances. Le nouveau placement exclut les fragments physiques existants. Correction rétroactive V82 : le sommeil des lièvres consulte désormais la même heure civile que les colons, y compris sur une partie V82 chargée ; les délais physiologiques restent écoulés.

La commande worker transporte le choix et le relief. Même graine, dimensions, générateur et profil reproduisent le départ. Recharger ne redonne jamais les provisions. Ne pas confondre flux aléatoires du terrain/personnes/faune/incidents avec l'aléa visuel.

## Pression et acceptation

Le nouveau profil applique les effets présents de Récit d'aventure : **+5 à la cible d'humeur des colons**, **×0,75 au second tirage différé d'infection de la faction du joueur**, tir ami 0,40 déjà utilisé. Les rendements agricoles/miniers/boucherie et la vitesse de recherche restent inchangés, comme les facteurs 1 du profil relevé. Intoxication alimentaire, richesse/adaptation et calcul de budget restent absents : l'étiquette ne certifie pas une difficulté globale équivalente.

La [cadence de raids](raids.md) propose une occasion introductive à J5,4, puis des fenêtres à J11 + 10,6 × n  : 4,6 jours actifs, 6 de repos, 1–2 occasions espacées d'au moins 1,9 jour. Les occasions impossibles ou occupées sont consommées ; la fin d'un groupe ne déplace pas les fenêtres. Après J20, les occasions restent limitées aux raids de composition locale : sélection complète et budget de 40 points non livrés. Visiteurs, petite menace introductive, Misc, maladies et factions restent absents. Accueil fixe et canicule garantie du camp ne sont pas activés sur `crashlanded`, et leurs commandes d'activation y sont refusées. Les autres scénarios gardent leurs calendriers historiques.

Campagne intégrée décrite dans les [preuves V83](../history/validation-site-v83.md) :

- Plusieurs graines 250² et formats compacts : pose admissible, aides artificielles absentes, bilan exact, personnes/technologies et reproductibilité.
- Sauvegarde/reprise : anciennes parties inchangées, scénario confirmé, aucune seconde dotation, continuation identique.
- Premiers jours : réserve, couchages, abri et source alimentaire engagés par commandes ; consommations/dépenses/production/santé, journal et checkpoints. Ne pas retirer les 50 repas/300 bois pour fabriquer une urgence.
- UI réelle : création, explication, carte/personnes/possessions, projets connus, pause/vitesses. Un camp de test ne prouve pas ce départ.
- Coûts : génération, simulation/worker et rendu distingués, mesures successives sans HMR ; charge et limites annoncées.

Résultats et seuils locaux appartiennent à la preuve du lot. Quelques jours joués ne valident ni une campagne complète, ni tous les contenus manquants, ni la difficulté de RimWorld.
