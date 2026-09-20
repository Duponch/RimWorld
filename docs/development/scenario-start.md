# Nouvelle partie — Atterrissage forcé partiel et profils historiques

**V89 validée dans son périmètre.** La nouvelle provenance `crashlanded` révision 4 ajoute Taille de pierre aux connaissances initiales, sans modifier sa dotation matérielle V88. La connaissance suit le tag local Core `ClassicStart` relevé dans la [recherche des sols](../research/cleanliness-floors-reference-v89.md#couches-recherche-et-combustion) ; Forge reste à rechercher. L'intoxication alimentaire et son facteur de difficulté sont intégrés. Les [preuves V89](../history/validation-hygiene-v89.md) distinguent le contrôle du nouveau départ de la continuation avec reprises de la colonie V88 ; cette dernière ne reçoit aucune connaissance rétroactive.

**V88 validée dans son périmètre**, le 20 septembre 2026. La révision 3 ajoute argent, fusil à verrou et couteau en plastacier au nouveau départ, avec le calendrier des visiteurs. Les [preuves V88](../history/validation-trade-v88.md) sont distinctes des [preuves V83](../history/validation-site-v83.md) pour le site et des [preuves V80](../history/validation-scenario-v80.md) pour Trois survivants. La [référence locale Core](../research/core-reference-baseline.md), la [recherche de scénario](../research/scenario-start-reference.md) et le [contrat des menus](new-game-menus.md) conservent sources, versions et écarts. [ROADMAP](../ROADMAP.md) reste l'unique calendrier.

Le nouveau parcours propose **Atterrissage forcé, Cassandra Classique partielle, Récit d'aventure et Rechargeable**. Les choix de difficulté et de sauvegarde sont requis, malgré leur unique possibilité active. L'interface annonce l'adaptation partielle et sa dotation réelle ; elle ne promet ni tous les objets Core ni le narrateur complet.

## Profils séparés

**Atterrissage forcé**, identifiant `crashlanded` révision 4 en V89, conserve le `gameProfile` révision 1 : `cassandra-partial`, `adventure-story`, `reloadable`. La révision 1 des départs V82, la révision 2 des départs V83–V87 et la révision 3 des départs V88 restent historiques, sans complément de dotation ni technologie au chargement. **Trois survivants** conserve l'identifiant `survivors`, sa provenance et ses règles historiques. Le **camp pédagogique** et la **sentinelle** restent des scénarios de diagnostic accessibles explicitement aux parcours qui en dépendent. Le nouveau menu ne les présente pas comme des variantes Core livrées. Un scénario ne se déduit jamais d'une sauvegarde historique ou de la présence d'objets.

Le choix visible annonce trois adultes aux profils locaux fixes, forêt tempérée et relief local choisi, provisions, technologies connues et limites de narration. Le menu public crée une carte **250²**. La graine numérique est proposée aléatoirement hors simulation puis transmise explicitement à l'usine déterministe ; elle reste éditable et relançable. Ce n'est pas une graine de planète Core. Formats compacts et anciens scénarios restent des outils de diagnostic. Monde, biomes complets, huit candidats, biographies et difficulté détaillée ne sont pas présentés comme disponibles.

## Dotation et technologies

| État initial | Quantité et propriété |
| --- | --- |
| Personnes | 3 adultes, profils locaux distincts de compétences/traits. |
| Bois | 300 unités au sol. |
| Acier | 450 unités au sol. |
| Composants | 30 unités au sol. |
| Argent | 800 unités physiques au sol, monnaie des échanges. |
| Repas emballés | 50 unités physiques, `survival-meal`. |
| Médicaments | 30 unités industrielles. |
| Armes | 1 fusil à verrou, 1 revolver et 1 couteau en plastacier au sol, à équiper physiquement. |
| Protection | 1 gilet au sol, à enfiler physiquement. |
| Habillement | 3 chemises en tissu, une portée/personne ; aucune copie au sol. |
| Recherche | Vêtements complexes, Climatisation et, pour la révision 4 V89, Taille de pierre connus au tick 0 ; aucune XP/travail fictifs. |

Quantités totales par objet, pas par pile. Respecter limites de pile, compatibilité et une pile/cellule, sans effacer une ressource pour faire une place. Personnes, vêtements et piles ont des identités/propriétés cohérentes ; l'inventaire participe aux bilans habituels. Aucun lit, réserve, chantier ou repas consommé créé pour le joueur. Départ après arrivée, sans capsule ni cryptosommeil simulés. Argent, fusil et couteau ont été introduits dans Crashlanded révision 3 et sont conservés dans la révision 4 ; Trois survivants et les révisions 1/2 ne les reçoivent pas au chargement. Leur prix, équipement et usage suivent les [contrats de commerce](trade.md) et d'[armes](../research/weapons-v88.md).

Le nouveau profil commence au **tick écoulé 0, heure civile 06:00**. `calendarTick` relie lumière, croissance végétale, horaires et température quotidienne ; les échéances médicales, mouvements, conservation et incidents restent exprimés en temps écoulé. Depuis V87, les nouvelles parties naturelles adoptent le [climat annuel documenté](site-climate.md), avec le témoin tempéré 16,2 °C, 900 mm, 22,21° N et 18,23° O ; ce n'est pas un site moyen de RimWorld. Les anciennes parties dépourvues de climat conservent leur phase et leur modèle antérieurs jusqu'à adoption explicite. Le débit nominal commun est de **six ticks locaux/s**, 6 000 ticks/jour, soit 16 min 40 s par jour à 1×. La correction V82 du débit réel n'a pas converti les dates persistées ; dix ticks Core restent un tick local.

Les trois projets acquis de la révision 4 suivent ce sous-ensemble industriel Core. Taille de pierre porte ses 300 points et `completedAt:0` dans `research.stonecutting` ; ce n'est pas du travail effectué par les trois arrivants. Forge (700 points), Batteries et Panneaux solaires restent à rechercher : l'acquisition initiale ne s'étend pas implicitement à chaque nouveau projet. Les dalles de pierre exigent aussi Construction 3 ; la recette historique de blocs reste accessible selon son contrat antérieur. Le camp pédagogique conserve son cycle complet. L'accès général à l'électricité reste partiel, conformément au [contrat de réseau](power.md).

Différences assumées : pantalon/casque pare-balles et animal domestique absents ; pas de stock distant Core de 720 acier/7 repas/3 débris. Chemises en tissu et vêtements Core en synthétoffe ne sont pas équivalents. Aucune compensation silencieuse en armes, médicaments ou lièvres domestiqués. Objets immédiatement autorisés faute de système d'interdiction. Marges de survie et défense locales, pas parité du scénario complet.

## Paysage et installation

Le profil sépare terrain et pose du scénario. Il conserve les conventions de [génération](world-generation.md), [grille/déplacements](spatial-motion-storage.md) et [faune](wildlife.md), mais retire les aides du camp : clairière 7×7, deux arbres/un buisson fixes, affaissement du relief autour d'un centre présumé.

Choisir après génération un point dans une composante praticable reliée au bord. Personnes et dotation exigent des cellules admissibles/accessibles et assez d'espace, avec obstacles/coins communs. En cas d'impossibilité, échec explicable avant publication ; aucun passage creusé silencieusement au chargement. La garantie ne rend pas toutes les poches accessibles et ne place pas chaque ressource près du camp.

V83 : forêt tempérée sans rivière, relief Plat/Petites collines/Grandes collines, deux ou trois pierres liées à la graine et provenance `site` persistée. Terre ordinaire, riche, gravier et pierre brute ont des propriétés distinctes ; fragments physiques, filons et végétation sont décrits dans le [contrat de génération](world-generation.md). Les anciens profils conservent leur vallée avec rivière. Ni essences complètes ni écosystème Core équivalent ne sont annoncés. Plafond de départ **12 lièvres sur 250²**, poses admissibles nécessaires ; ce n'est pas un budget Core multiespèce ni une garantie sur toute dimension.

V83 conserve pour les **baies** le tirage de maturité corrigé en V82, uniforme 0,15–1,5 borné à1 ; le profil Survivants historique garde0,15–1. Les positions et densités suivent maintenant les passes du site, avec les adaptations documentées ; aucun arbre ne reçoit un faux système d'âge. La croissance après création garde ses règles biologiques et sa lumière réellement disponible, sans objectif de récolte imposé à J7.

Génération unique, sans entretien par frame. Mesurer arbres/baies/minerais, sols, roche, accès, distances et temps sur plusieurs graines ; distinguer simulation/navigation/rendu. Le camp historique n'est pas réétalonné parce que le défaut UI change.

## Persistance et continuation

Scénario/version constituent une provenance, pas une commande rejouée au chargement. Conserver carte, objets, personnes, technologies, calendriers et RNG réellement obtenus. **V81 est strictement validée avant migration V82 neutre** : aucun `gameProfile`, décalage civil, stock, technologie, animal ou calendrier ajouté. Les champs V82 injectés dans V81 sont refusés. Le nouveau profil nécessite une création explicite ; `crashlanded` sans son profil appliqué, ou un profil Core greffé sur `survivors`, est invalide.

V82 est strictement validée avant migration V83 neutre : aucune carte régénérée, aucun `site` déduit, aucune nouvelle fertilité injectée. Le site est obligatoire pour les révisions 2, 3 et 4 de Crashlanded et interdit sur les autres provenances. Le nouveau placement exclut les fragments physiques existants. Correction rétroactive V82 : le sommeil des lièvres consulte désormais la même heure civile que les colons, y compris sur une partie V82 chargée ; les délais physiologiques restent écoulés.

V87 est strictement validée avant migration V88 neutre. La révision 3 et ses nouveaux objets sont refusés dans un format antérieur à V88 ; la migration n'ajoute ni objet ni calendrier de visites. L'usine du nouveau Crashlanded active les [visiteurs](visitors.md) au tick zéro, avec leur occasion introductive. Une ancienne partie les adopte seulement par commande explicite, sans rattrapage de l'introduction ni modification de son scénario.

V88 est strictement validée avant migration V89. La révision 4 et les champs des recherches Taille de pierre/Forge sont refusés dans un format antérieur à V89. Aucune ancienne provenance n'est réécrite et aucune de ces connaissances n'est accordée à la migration, y compris à un Crashlanded révision 3. Les nouveaux risques alimentaires sont prospectifs : ni contamination de pile ni maladie passée ajoutée. Une future ingestion crue suit désormais le risque du type alimentaire réel ; les provisions préparées anciennes ne deviennent pas contaminées par le chargement.

La commande worker transporte le choix et le relief. Même graine, dimensions, générateur et profil reproduisent le départ. Recharger ne redonne jamais les provisions. Ne pas confondre flux aléatoires du terrain/personnes/faune/incidents avec l'aléa visuel.

## Pression et acceptation

Le nouveau profil applique les effets présents de Récit d'aventure : **+5 à la cible d'humeur des colons**, **×0,75 au second tirage différé d'infection de la faction du joueur**, tir ami 0,40 déjà utilisé. V89 ajoute **×0,75 au risque d'intoxication à l'ingestion** : risque des aliments crus pour les humains et fraction contaminée des repas préparés pour les humains/lièvres concernés. Ce facteur ne modifie pas les deux essais de contamination à la cuisson. Les profils historiques sans `gameProfile` utilisent le facteur neutre 1 ; les Crashlanded anciens avec ce profil appliquent sa difficulté aux expositions futures. [Règles alimentaires et limites](food-poisoning.md). Les rendements agricoles/miniers/boucherie et la vitesse de recherche restent inchangés, comme les facteurs 1 du profil relevé. Richesse/adaptation et calcul de budget restent absents : l'étiquette ne certifie pas une difficulté globale équivalente.

La [cadence de raids](raids.md) propose une occasion introductive à J5,4, puis des fenêtres à J11 + 10,6 × n  : 4,6 jours actifs, 6 de repos, 1–2 occasions espacées d'au moins 1,9 jour. Les occasions impossibles ou occupées sont consommées ; la fin d'un groupe ne déplace pas les fenêtres. Les grandes menaces restent limitées aux raids de composition locale, y compris après J20 : sélection complète et budget de 40 points non livrés. V88 ajoute séparément l'occasion de visite à J2,5 et les agendas de visiteurs/passants, conditionnés par leurs accès et tirages ; aucune garantie de visite ou de marchand à chaque date. Petite menace introductive, catégorie Misc complète, incidents de maladie et diplomatie restent absents. Accueil fixe et canicule garantie du camp ne sont pas activés sur `crashlanded`, et leurs commandes d'activation y sont refusées. Les autres scénarios gardent leurs calendriers historiques.

Campagne intégrée décrite dans les [preuves V83](../history/validation-site-v83.md) :

- Plusieurs graines 250² et formats compacts : pose admissible, aides artificielles absentes, bilan exact, personnes/technologies et reproductibilité.
- Sauvegarde/reprise : anciennes parties inchangées, scénario confirmé, aucune seconde dotation, continuation identique.
- Premiers jours : réserve, couchages, abri et source alimentaire engagés par commandes ; consommations/dépenses/production/santé, journal et checkpoints. Ne pas retirer les 50 repas/300 bois pour fabriquer une urgence.
- UI réelle : création, explication, carte/personnes/possessions, projets connus, pause/vitesses. Un camp de test ne prouve pas ce départ.
- Coûts : génération, simulation/worker et rendu distingués, mesures successives sans HMR ; charge et limites annoncées.

Résultats et seuils locaux appartiennent à la preuve du lot. Quelques jours joués ne valident ni une campagne complète, ni tous les contenus manquants, ni la difficulté de RimWorld.
