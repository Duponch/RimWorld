# Exécutants des factures — référence Core V461

Lecture du22octobre2026 pour une base ordinaire : choisir qui peut commencer une facture existante, sans changer ses produits, ses intrants, sa qualité ou son auteur. Cette référence distingue l’admission future du travail déjà confirmé. Elle ne qualifie pas le lot ni l’ensemble du système de production.

## Sources et périmètre

Installation lue en place : **Core1.6.4871 rev590**, `E:/Steam/steamapps/common/RimWorld/Version.txt`. Assembly `RimWorldWin64_Data/Managed/Assembly-CSharp.dll`, SHA256 frais `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Lectures ciblées par ILSpyCmd8.2 et recherche des seuls appels concernés par Mono.Cecil ; aucun décompilage global, code ou asset propriétaire intégré au produit. Les notes privées de provenance sont `tmp/thermal-mood-v460/next-bill-reference.md` et `bill-recipe-skills.md` ; les classes lues sont conservées à titre privé dans `bill-core/`.

Classes de référence : `RimWorld.Bill`, `Bill_Production`, `Bill_ProductionWithUft`, `BillDialogUtility`, `Dialog_BillConfig`, `WorkGiver_DoBill`, `BillUtility`, `Building_WorkTable`, `PawnsFinder`, `Verse.RecipeDef`, `MapPawns`, `Verse.AI.JobDriver_DoBill`, `Toils_Recipe`, `Pawn_JobTracker`, `ThinkNode_QueuedJob` et `Job`. Les champs générés de recettes sont recoupés avec `Verse.RecipeMakerProperties` et `RimWorld.RecipeDefGenerator`.

Recherche Internet officielle actualisée le22octobre : [Ludeon, annonce1.7 du12octobre](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/). Elle situe la nouvelle branche et son moteur ; elle ne prouve pas les règles détaillées de la version1.6 installée, qui restent issues des XML/IL identifiés. Les sources secondaires et miroirs ne remplacent pas cette provenance.

Corpus relu : [chapitre11 original](../reference/originals/Documentation_developpement.html#chap-11), SYS/TEST-062..064 et UI-025, dans la continuité de [l’usinage et de ses factures](production-reference-v101.md). Le chapitre propose opérateur, plage de compétence, filtres et conservation des ouvrages ; son statut ne vaut pas validation locale. Les références médicales et les restrictions de travailleurs DLC ne sont pas ouvertes par cette tranche.

## Règles natives adoptées

Les réglages appartiennent à la **base Bill**, même lorsqu’ils sont présentés dans la fenêtre d’une Bill_Production. L’intervalle initial autorise les niveaux0à20 ; aucune personne n’est imposée. La plage est inclusive. Elle concerne la compétence de travail de la recette, indépendamment de sa vitesse, de ses minima, du métier qui lui fournit des travailleurs et de son gain d’expérience.

Si une personne est nommée, le prédicat d’admission compare son identité : la plage préférée n’est pas appliquée en plus. Les minima de la recette restent vérifiés séparément, ainsi que les conditions physiques, recherches et capacités. Un nom ne permet donc pas à un artisan trop faible de fabriquer un produit interdit par son minimum. La commande manuelle passe aussi par cette admission au moment où elle construit un nouveau travail.

Le menu natif montre la plage seulement en mode « Toute personne admissible » et lorsque la recette possède une compétence. Choisir un nom masque la plage sans l’effacer ; revenir au mode général restaure les bornes mémorisées. Une recette sans compétence n’obtient pas artificiellement une plage Artisanat. Les champs `allowedSkillRange` et la référence `pawnRestriction` sont persistés et copiés ; ils ne contiennent ni nouveau Pawn ni affectation de tâche.

### Compétences des55recettes locales

La correspondance a été relue pour toutes les clés actuelles de `PRODUCTION_RECIPES`, sans introduire les recettes Core absentes :

| Compétence de recette | Familles locales | Nombre de clés |
|---|---|---:|
| Cuisine | Repas unitaires/séries, rations, pemmican, croquettes, boucherie et moût |19|
| Artisanat | Confection, armes, armures, prothèses industrielles, composants, récupération mécanique et taille de pierre |26|
| Artistique | Petite et grande sculpture |2|
| Intellectuel | Médicament industriel |1|
| Aucune | Fusion de scorie/arme/armure, raffinage bois/organique, crémation et combustion de vêtements |7|

Les repas et produits alimentaires viennent de `RecipeDefs/Recipes_Meals.xml`, `Recipes_Food.xml`, `Recipes_Butchery.xml` et `Drugs/Alcohol_Beer.xml`. Artisanat provient notamment des bases de vêtements et d’armes, des prothèses et des recettes de production ; les sculptures de `ThingDefs_Buildings/Buildings_Art.xml`. Les héritages et les champs du recipeMaker sont suivis jusqu’à leur valeur effective.

Deux cas empêchent une déduction à partir de la colonne Travail :

- La **taille de pierre** possède bien Crafting malgré un facteur d’apprentissage nul. Une plage peut filtrer ses travailleurs sans leur accorder de nouvelle XP.
- Le **médicament industriel** possède Intellectual, avec des minima distincts Crafting4 et Intellectual4 (`ThingDefs_Items/Items_Resource_Manufactured.xml`). Elsewhere l’ordonnance déjà dans Artisanat et apprend déjà Intellectuel à la complétion. Le filtre porte sur Intellectuel ; ce lot ne corrige aucune prétendue absence d’XP et ne modifie pas ces minima.

Le moût reste Cuisine malgré le nom DrugCookingSpeed de sa vitesse. Inversement, fusion et raffinage ne reçoivent pas une compétence parce que leur catégorie locale est Artisanat. La correspondance ne change ni cadence, recette, tirage de qualité ni expérience.

## Engagements, interruption et file manuelle

Les drivers natifs de collecte et fabrication ne relisent pas le nom ou la plage à chaque tick. Modifier seulement ces préférences n’annule donc pas un travail déjà confirmé, même si son auteur franchit la borne haute par apprentissage. La suspension et les autres causes d’échec physiques gardent leurs règles distinctes. Une sortie déjà créée reste un objet à déposer, pas une nouvelle fabrication à admettre.

Après une véritable interruption, une nouvelle recherche de travail relit admission et minima avant la reprise de l’ouvrage. Son Creator reste son auteur. Choisir une autre personne ne lui transfère pas l’inachevé : la facture peut attendre, et ce blocage doit être expliqué. Les règles locales préexistantes de liaison des ouvrages ne sont pas élargies ou réécrites par cette préférence.

Un ordre manuel **déjà construit puis mis en file** conserve également son admission. La promotion native reprend le même Job ; `ThinkNode_QueuedJob` et `Job.CanBeginNow` ne rappellent pas l’admission de facture, et le driver n’ajoute pas ce contrôle. Les nouvelles commandes et nouvelles recherches après interruption relisent le choix ; changer le nom/plage ne vide pas la file confirmée. Les gardes locaux historiques d’accès, minima, réservation ou disponibilité de poste restent distincts et conservés.

Ce point impose un raccord explicite : le `bill-update` historique d’Elsewhere libère les tâches et retire les ordres de la facture. La commande dédiée d’exécutant ne doit pas emprunter ce chemin pour un simple changement d’admission. Les sauvegardes doivent accepter l’état légal d’une tâche engagée dont l’auteur ne passerait plus le nouveau prédicat de départ.

## Choix humain et propriétaires

Le menu natif puise dans les colons libres de toutes les cartes, pas seulement les personnages spawn sur la carte observée. `MapPawns.FreeColonists` inclut les humains vivants contenus dans ses holders : un caisson installé peut donc conserver un candidat nommé. Une caravane hors carte ne devient pas un nouveau candidat par ce menu. Le métier désactivé est signalé mais reste choisissable ; une incapacité permanente désactive l’option. Nommer quelqu’un ne réactive jamais sa priorité.

La référence déjà confirmée suit une autre règle : partir en caravane, entrer en caisson ou changer de carte ne signifie pas mourir ou changer de faction. Le nom reste lié au même humain ; il n’agit pas depuis son propriétaire lointain. L’interface peut conserver l’option sélectionnée absente des nouveaux candidats et expliquer son indisponibilité, sans inventer un Pawn à partir d’un nom de connaissance.

Les autorités existantes de campagne et de propriétaires d’Elsewhere distinguent carte, capsules, caissons, voyages, rencontres, pertes et archives. La facture garde seulement l’identifiant de référence ; aucun transfert, copie d’humain, maître animal ou propriétaire supplémentaire n’en découle. L’admissibilité locale exige toujours le vrai acteur à portée de son poste.

### Référence définitivement indisponible

La recherche ciblée des appels natifs établit un nettoyage **événementiel** : `BillUtility.Notify_ColonistUnavailable` est appelé lors de mort, changement de faction et enlèvement, puis réexamine les factures actives. `Bill.ValidateSettings` efface le nommé lorsque l’une de ces causes est constatée et le signale. `Building_WorkTable.SpawnSetup` valide aussi les réglages à la réinstallation/reprise ; le retrait d’un groupe de stockage peut déclencher une validation générale.

Cette voie inclut ateliers des cartes, minifiés et cargaisons de caravanes actifs ; elle ne réécrit pas les snapshots d’archives. Aucun polling de BillStack, lecteur UI ou changement de vue n’est une cause de nettoyage établie. Un placement local avant planification après une mutation terminale peut être adapté explicitement aux responsabilités du moteur ; il ne doit pas être présenté comme une cadence native à chaque tick. Les validateurs et lecteurs de sauvegarde restent purs.

## Adaptations et frontières locales

Adopter : identité du nommé, priorité du nom sur la plage préférée, workSkill exact, minima séparés, bornes inclusives, engagements conservés et vrais propriétaires. Adapter : IDs locaux au lieu de références CLR, métier Artisanat regroupé, champs prospectifs et brouillon d’interface appliqué explicitement. Différer : esclaves/mécanoïdes/DLC, copie et nom des factures, plages d’autres systèmes, seuil de reprise et nouvelles recettes.

Le domaine prospectif V461 utilise le schéma283 ; son absence conserve l’admission historique des factures. L’ancien282 est strictement validé avant migration neutre : aucun opérateur, point de compétence, nouvelle tâche ou progression n’est ajouté. Anciennes branches et schémas futurs restent fermés. Les factures des postes installés, minifiés ou transportés doivent suivre les mêmes gardes de forme et de référence ; leur propriétaire réel ne change pas.

Le choix RPC du Worker est une projection readonly des autorités présentes ; les noms et descriptions sont rendus par texte. Il est demandé à l’ouverture utile du contrôle, sans parcours mondial par image. Le brouillon d’exécutant est indépendant de la facture générale ; les actualisations d’autorité ne l’appliquent ni ne l’effacent implicitement. La commande dédiée ne part que depuis l’action Appliquer ; Annuler restaure les valeurs confirmées. Aucune garantie d’accessibilité, de production immédiate ou de prochaine qualité n’est déduite de l’option choisie.

Les preuves produit, parcours UI, sauvegardes et limites de performance appartiennent à la note de qualification du lot. Cette recherche ne remplace aucun de ces contrôles et n’annonce aucun gain FPS, catalogue exhaustif ou clôture des six ensembles.
