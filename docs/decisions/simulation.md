# Décisions — simulation

Décisions datées à lire avec le [contrat actuel](../development/architecture.md). Les contrats plus récents remplacent les passages explicitement historiques.

## ADR-005 — Ressources et réservations explicites

**Adopté, réalisé dans le schéma 2.** Le stock global autoritaire de la première tranche est remplacé par des piles physiques avec propriétaire unique : sol, porteur ou chantier. Collecte, transport et construction sont des familles séparées. Les tâches réservent une quantité source et une capacité de destination, puis exécutent prélèvement, portage et dépôt. Le constructeur attend les matériaux réellement livrés. `stock` et `job.escrow` sont désormais des vues contrôlées, sans double comptage.

Interrompre libère les engagements futurs ; la cargaison est déposée au colon et les matériaux déjà livrés restent au chantier. Annuler un plan dépose ses matériaux sur place ; achever incorpore ces quantités au bâtiment. Les stockages sont encore des cellules indépendantes avec filtres, priorité et capacité. Le plan de mur bloque le passage dès sa désignation ; déplacement automatique des objets, zones communes et étapes de chantier plus fines restent ouverts. Contrat : [material-logistics.md](../development/material-logistics.md) ; adaptations : [decisions.md](../gameplay/decisions.md).

## ADR-006 — Sauvegarde versionnée

**Adopté, schéma 2 courant avec migration explicite depuis 1.** Le JSON contient graine et RNG, tick, IDs, grille, entités, piles et propriétaires, stockages, orientations, tâches de transport, routes, cadences, réservations, `logisticsCursor` et événements. L'entrée est validée comme `unknown`, avec bornes, identités uniques, vues dérivées et cohérence des liens. Le chargement est préparé dans une variable temporaire et n'écrase le monde qu'après validation.

La migration valide d'abord le schéma 1. Le stock global devient des piles déterministes près du camp, l'escrow devient de la matière livrée ; les priorités existantes sont conservées et Transport reçoit 3. Les anciens lits gardent une empreinte `legacy-single` 1×1 sans déplacer les voisins. Une construction interrompue V1 peut conserver sa progression sans escrow : elle doit être réapprovisionnée avant de poursuivre. Terrain et IDs existants ne sont pas régénérés. L'égalité de continuation s'applique au schéma 2, sans promesse de reproduire le futur de l'ancien moteur.

Le renderer et la vitesse de lecture ne font pas partie du résultat métier sauvegardé. Sauvegarder n'arrête pas le jeu ; l'état correspond au traitement de la demande dans le worker. Les clés `lisiere.save.v1` et `lisiere.previous.v1` sont conservées pour retrouver les parties existantes ; le schéma est dans le JSON. Créer une colonie écrit d'abord la copie précédente et refuse le remplacement si cette écriture échoue. Export/import, autosauvegardes tournantes, manifeste de contenu/générateur et migrations ultérieures restent à développer.

## ADR-012 — Boucle matérielle, reprise et budgets de planification

**Livré dans le schéma 2 ; consolidation G0 en cours.** Cette tranche réalise une partie d'ADR-011 à partir des chapitres 2/4/5/9/10/21/30/32 et SYS-005/020..022/041..061/113..117. Les objets possèdent une seule quantité autoritaire dans `World.piles`. Le petit catalogue immuable est limité aux matériaux et constructions utiles ; il ne devient pas un moteur de contenu générique.

Un colon a un travail ou une tâche de transport, jamais les deux simultanément. Les réservations sont dérivées des tâches sérialisées ; l'adoption vérifie source, quantité, accès et capacité ensemble. Les matériaux livrés survivent aux interruptions et une construction n'est exécutée qu'après approvisionnement. La progression historique V1 sans matériaux reste valide en attente. Les détails de reprise et de migration sont dans [simulation.md](../development/simulation.md) et [material-logistics.md](../development/material-logistics.md).

Le planificateur partage huit BFS et 32 768 couples source/destination examinés par tick. Des agrégats locaux évitent de recalculer chaque quantité pour chaque couple ; aucun tableau du produit complet piles × destinations n'est créé. Au-delà de cette fenêtre, `logisticsCursor` reprend le balayage de façon déterministe et persistante. Le classement porte alors sur les candidats vus : ce budget ne garantit ni meilleur choix global immédiat, ni durée murale constante. Des index persistants invalidés par événement restent une évolution à mesurer.

Les interprétations graphiques restent dans la présentation : lit 1×2 orienté, piles et réserves en lots par chunk, cargaisons interpolées avec les colons sur GPU. La physique de meshes ne décide pas d'un prélèvement ou dépôt. Les repas à distance, le sommeil sur place, le blocage immédiat des plans de murs et la congestion active limitée restent des écarts explicites dans [decisions.md](../gameplay/decisions.md).

La preuve combine conservation indépendante à chaque tick, deux agents partageant une pile, reprises aux frontières du portage, livraison partielle, interruptions/annulations et migrations V1. Les parcours navigateur et contrôles graphiques sont qualifiés séparément dans [validation.md](../development/validation.md). Le benchmark schéma 2 inclut désormais transport et stockage : ses durées ne constituent pas un A/B du précédent benchmark de collecte à stock global.

## ADR-014 — Désignation de terrain par rectangle

**Livré en G0.** Les chapitres 5/8/10 et SYS-031..037/041..061 distinguent interaction, désignation et travail futur. Une commande `area` transporte l'action et les deux extrémités de grille ; le worker revalide les cibles compatibles et applique l'ensemble sans tick intermédiaire. Une réponse unique fournit le bilan. Les commandes unitaires restent disponibles pour les règles existantes et l'inspection.

La requête pure `queryArea` partage les règles de sélection entre aperçu et moteur. Un index transitoire évite le produit cases × ressources et ne fait pas partie de la sauvegarde. Le renderer peut le conserver pour un snapshot ; il l'invalide au suivant. Le rectangle est une intention non persistée : perte de focus, changement de carte ou interruption du geste le supprime. L'aperçu utilise l'instancing de surfaces, la caméra reste fixe pendant le geste, et la simulation ne lit aucune géométrie Three.

Le schéma 2 reste inchangé : aucun champ persistant n'est ajouté. Une annulation vise l'identité du chantier une seule fois et conserve toute la matière ; le retrait d'une réserve supprime sa politique locale et invalide les livraisons correspondantes. Une création chevauchant une réserve existante ne modifie pas ses filtres. Les zones nommées et politiques partagées restent un chantier ultérieur qui exigera une décision de migration explicite.

Contrats, mesures et limites : [area-designations.md](../development/area-designations.md). Le benchmark compare les mondes complets aux commandes unitaires hors journal ; les scénarios de conservation et les parcours du vrai worker couvrent les conséquences métier. Une commande rapide ne prouve pas le budget de milliers de travaux exécutés ni celui du rendu de toutes leurs désignations.


## ADR-015 — Besoins réalisés par des tâches physiques

**Adopté.** La correction des interactions élémentaires précède les zones nommées. Les jauges ne consomment plus un stock à distance et la proximité d'un lit ne produit aucun repos supplémentaire. `needs.ts` orchestre réservation, trajet, acquisition et ingestion, ou attribution de couchage, trajet et sommeil. Le module reçoit les services de navigation bornée, interruption et événements du moteur ; il ne dépend ni du renderer ni du DOM.

Le schéma 3 persiste les nouvelles intentions et phases. La validation V2 précède sa migration ; les anciennes positions et quantités restent intactes. Les tâches de besoin sont exclusives du travail, mais partagent les réservations de matière et le budget de recherche. Les dépôts conservent l'identité des objets. La représentation GPU lit les phases et l'orientation du lit, sans calcul d'os sur CPU.

Les actions sont livrées sur le catalogue actuel ; les coefficients provisoires, horaires et profils non livrés restent identifiés dans [needs.md](../development/needs.md). Une future calibration ne doit pas se présenter comme une conversion silencieuse des anciennes sauvegardes. Le détail des seuils et du repli au sol constitue une décision révisable, pas une équivalence complète de RimWorld.


## ADR-016 — Repas à table, modules de présentation et audits continus

**Adopté.** [dining.md](../development/dining.md) détaille les décisions de mobilier, repas, confort, mémoire et migration V4. `needs.ts` orchestre ; `eating.ts` transfère/consomme ; `dining.ts` choisit/réserve ; `wellbeing.ts` applique les effets. Les nouveaux modules répondent à des responsabilités présentes, sans ECS ou framework de jobs spéculatif.

Le rendu des personnages quitte la scène principale : `PawnLayer.ts` conserve poses et attributs GPU, `FurnitureLayer.ts` les constructions procédurales, `primitives.ts` les lots/disposals, `FrameMetrics.ts` les durées bornées. Le compteur FPS est permanent et indépendant de l'état de la simulation. Ces frontières accueillent les futurs assets et meubles sans agrandir continuellement le même fichier.

La première couche BFS atteignant un but suffit pour départager les destinations de même distance, en conservant tous les parents de cette couche. Une carte partielle est réservée à ce contrat ; le travail général reste sur recherche complète. Les résultats sont confrontés à l'oracle complet et à des états finaux avant/après optimisation. Cette liberté technique ne change pas la navigation jouée en GPU : celle-ci reste CPU.

Chaque nouvelle mécanique exige une recherche ciblée, une liste d'écarts et des mesures proportionnées. Les messages de commit résument changement, validation et position dans G0–G5. Les résultats réels sont conservés dans validation.md ; aucun chiffre matériel n'est inféré d'une capacité théorique.

## ADR-018 — Identité alimentaire et profils sauvegardés

Le schéma V5 distingue `MaterialPile.item` de sa catégorie de filtre. Fractionnement, portage, dépôt et fusion conservent la définition et ses limites. `NeedTask.quantity` participe aux réservations partagées avec la logistique. La jauge 0–100 représente une nutrition adulte ; la valeur d’un aliment n’est pas une quantité de stock. [Contrat](../development/food-items.md).

Les règles alimentaires des anciennes parties sont nommées `legacy`, celles des nouvelles parties `adult` ; le profil est sérialisé. Une migration ne transforme pas une ancienne portion en ration moderne. Les helpers quittent le validateur pour `save-migrations.ts`. Les définitions d’objets sont communes à la simulation, aux piles et à l’inspection ; aucun nom traduit ne devient une clé. L’inventaire personnel et l’équipement utiliseront des propriétaires distincts, conformément au [contrat cible](../development/character-presentation.md), sans les confondre avec la cargaison existante.

## ADR-023 — Dégagement local et décision alimentaire

V9 adopte [ces règles vérifiées](../research/food-clearing-reference.md). `haul-aside.ts` trouve un dépôt agricole dans le budget du planner ; `hauling.ts`, extrait du moteur, exécute les transferts physiques. La destination `aside` réserve une capacité/type sur une case, comme le stockage, sans créer une réserve fictive. Elle relève de Culture. La simulation reste l’autorité ; aucun nouveau travail par image ou objet GPU n’est ajouté.

Le classement alimentaire est extrait dans `food-selection.ts`. L’objectif de recherche correspond au classement, pour que l’optimisation de proximité ne fasse pas disparaître les aliments préférés. La migration V8→V9 valide d’abord l’ancien état puis change la version ; aucune pile, trajectoire ou ingestion engagée n’est modifiée. Les décisions futures utilisent les nouvelles règles. La limitation connue du portage à dix unités reste explicite.

L’audit de dégagement a identifié les parcours complets répétés du planner. Il essaie désormais le premier travail admissible selon le même classement si le transport ordinaire n’a pas de priorité supérieure. Une recherche ciblée réussie suffit ; si le travail est inaccessible, sa composante parcourue est réutilisée pour le repli. Un résultat partiel ne classe jamais les autres travaux. La recherche de dépôt parcourt localement la composante structurelle de la source accessible et partage le budget de paires existant. La congestion temporaire reste gérée lors du déplacement.

## ADR-024 — Cuisine physique et recherches de travail par groupes

Date : 14 septembre 2026. La première production alimentaire suit une chaîne complète de collecte d’ingrédients, dépôt au poste, travail, consommation et rangement du produit. Le feu partage le transport existant et réserve le poste pendant recharge ou cuisine. Les factures et phases sont persistantes en V10 ; les recettes utilisant un ouvrage inachevé restent distinctes. Voir [contrat et migration](../development/cooking.md) et [vérification Core](../research/cooking-reference.md).

Les responsabilités restent séparées : données de recette, planificateur sans mutation, processeur de tâche, commandes, validation, UI et présentation. La capacité de stockage est mémorisée seulement pendant une décision ; aucun cache ne peut masquer un changement de réservation au colon suivant. Le combustible utilise des ticks entiers et un bilan brûlé, sans calcul flottant accumulé ni consommation liée au rendu.

L’audit 3/30/100 colons montre des explorations de toute la carte pour connaître les destinations d’une décision, ainsi que des capacités recalculées pour chaque paire source/destination. Une recherche par groupes d’interaction s’arrête après avoir trouvé le meilleur accès de chaque candidat. Une destination enfermée par quatre voisins solides/occupés, sans accès depuis le départ, est exclue par preuve locale. Un groupe restant inaccessible exige encore le parcours du composant ; les conflits actifs ne sont pas déclarés résolus.

Les chemins et départages sont confrontés à la recherche complète sur 120 cartes, dont circulation temporaire. Les empreintes et résultats métier des charges de 300 ticks restent identiques avant/après les optimisations, pour les trois populations ; cette preuve est limitée à ces scénarios. Des compteurs de recherche facultatifs sont retournés aux audits, hors World, sans horloge ni influence sur les décisions. Le coût de 100 acteurs reste un chantier mesuré, pas une garantie de framerate.

## ADR-025 — Occupation dense par recherche et diagnostics de cuisine

Date : 14 septembre 2026. Le profil V10 confirme que la boucle de voisins reste dominante. Chaque recherche construit maintenant un masque dense temporaire à partir des obstacles et occupations courants ; les tests de voisins lisent ce masque au lieu de consulter plusieurs fois un Set. Le masque ne survit pas à la recherche, ne modifie pas la grille de l’appelant, et ne masque donc ni déplacement ni changement de topologie. Ordre, coûts, départages et budget de huit recherches restent identiques. Quinze états sérialisés complets restent byte-identiques avant/après sur trois populations jusqu’à 1 000 ticks.

Une file avec masque de seaux non vides a été mesurée puis écartée : son gain supplémentaire était trop faible/incertain pour retenir la complexité. La congestion fonctionnelle reste ouverte ; la [relecture des collisions](../development/spatial-motion-storage.md#relecture-de-la-circulation--14-septembre-2026) confirme que notre occupation exclusive est plus stricte que la référence.

Les diagnostics quittent `engine.ts` pour des requêtes pures. Les libellés cuisine/recharge et motifs de facture décrivent uniquement des faits connus ; ni recherche de chemin sur le thread de rendu ni mutation de simulation. Aucun changement de schéma : ces textes et le masque temporaire ne sont pas persistants.

## ADR-026 — Âge alimentaire ancré et interruption conservatrice

Décision du 14 septembre 2026. [Référence vérifiée](../research/food-preservation-reference.md), [contrat V11](../development/food-preservation.md). Le climat constant permet de calculer l’âge depuis un ancrage, sans réécrire toutes les piles par tick. Les fusions utilisent les quantités réelles ; expiration avant action empêche consommation ou recette fantôme. Un chef dont la cargaison survivante ne peut être déposée conserve une tâche interrompue valide, sans référence à l’ingrédient disparu. V10 migre frais au tick chargé puisque son âge historique est inconnu. Les futures températures devront intégrer les périodes thermiques ; aucune file d’événements d’expiration n’est introduite sans coût mesuré.

## ADR-027 — Horaires distincts des besoins physiques

Date : 14 septembre 2026. Les commandes peignent une intention de 24 heures ; le processeur de besoins décide ensuite des tâches physiques. Fatigue, sélection/occupation du couchage et tableau UI sont des responsabilités séparées. Les boutons gardent leur identité entre snapshots. Le compteur d'épuisement et une interruption en attente sont sauvegardés avec le PRNG ; les tirages ne dépendent pas du rendu. V12 conserve explicitement le profil historique pour les anciennes parties, sans modifier leurs tâches au chargement. [Contrat](../development/schedules.md), [sources et limites](../research/schedules-reference.md).

## ADR-028 — Régimes partagés et engagements alimentaires

14 septembre 2026. Les autorisations d'ingestion appartiennent à une politique partagée, référencée par le colon ; aucun couplage avec stockage ou factures. Le filtre intervient avant le score et les buts de navigation, y compris pour la cargaison de tâche. Un repas engagé conserve son contrat physique ; changer la politique ne crée ni restitution ni annulation de réservations. Le prochain choix utilise les nouvelles autorisations. [Sources et incertitudes](../research/food-policies-reference.md).

Les identifiants ont un compteur séparé des entités, afin que V12→V13 préserve leurs IDs, routes et RNG. Validation atomique et plafonds locaux limitent la taille des politiques dans les snapshots sans introduire de cache d'autorisation susceptible de devenir périmé. Le rendu ne modifie pas les modèles ni les buffers ; la table maintient ses sélecteurs entre snapshots. [Contrat et migration](../development/food-policies.md).
