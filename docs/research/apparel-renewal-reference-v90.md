# V90 — confection et renouvellement de l’habillement

21 septembre 2026. **Recherche préparatoire seulement : aucun comportement décrit comme cible V90 n’est livré par ce document.** La base déjà validée reste V89. Le périmètre recommandé relie les deux matières déjà obtenables, un catalogue vestimentaire borné, un atelier électrique, l’usure portée et le remplacement physique. Il ne transforme pas cette tranche en filière métallurgique ni en catalogue complet de RimWorld.

## Décision recommandée

V90 devrait livrer une chaîne jouable unique : **coton ou chasse → tissu ou cuir léger → facture et ouvrage inachevé → vêtement de qualité → port et effets physiques → usure → remplacement selon une politique partagée**.

Le lot comprendrait :

- les recettes existantes de tenue tribale et de chemise, généralisées du seul tissu au **tissu ou cuir léger**, sans mélange de matières dans une pièce ;
- trois nouvelles familles Core : **pantalon**, **cache-poussière (`duster`)** et **parka**, chacune réellement fabricable dans les deux matières ;
- un **établi de tailleur électrique** alimenté, deux fois plus rapide que le manuel lorsqu’il reçoit du courant et aussi lent que lui hors tension ;
- l’usure quotidienne des vêtements portés, distincte de l’usure par impact déjà livrée ;
- des politiques d’habillement partagées permettant de choisir familles, matières, qualité et pourcentage de PV, avec port/retrait automatiques accomplis par les gestes physiques existants ;
- la conservation de la qualité, de la matière, des PV, de l’auteur, du travail, des filtres et des décisions automatiques à la sauvegarde.

Ce choix produit **dix combinaisons matière × famille fabricables** à partir de cinq familles utiles, au lieu d’ajouter des variantes cosmétiques inertes. La chemise et le pantalon forment une tenue peau complète ; la tenue tribale constitue l’alternative initiale incompatible ; le cache-poussière et la parka apportent un choix de couche extérieure pour chaleur/protection ou froid ; le gilet pare-balles V63 reste compatible entre ces couches mais n’est pas rendu fabricable dans ce lot.

## Base Lisière à conserver

Les contrats présents imposent la forme de l’extension :

- V71 fournit `cloth` par culture/récolte physique du coton. V79 fournit `light-leather` par chasse, dépouille et boucherie du lièvre. Les deux sont déjà des textiles, en piles de 75, transportables et stockables ; le cuir n’a encore aucune recette.
- V72 fournit l’emplacement d’artisanat, `unfinished-tribalwear`, `cloth-tribalwear`, l’auteur, la progression, l’annulation à 75 %, l’XP Artisanat et six qualités produites.
- V73 fournit **Vêtements complexes** à 600 points, le tailleur manuel 3×1, `unfinished-shirt` et `cloth-shirt`. Le nouveau profil Atterrissage forcé connaît déjà ce projet ; les parties historiques peuvent l’avoir recherché.
- V63/V72 fournissent le propriétaire `apparel`, les couches anatomiques, le port/retrait temporisé, la qualité/PV, la protection et l’usure par impact. V74 ajoute l’isolation active. V64 produit déjà les pensées « vêtements abîmés » sous 50 % et « en lambeaux » sous 20 %.
- V88 fait dépendre le prix des vêtements de leur qualité et de leurs PV, mais le petit visiteur ne couvre qu’un stock limité. Une nouvelle recette ne doit pas étendre silencieusement son catalogue.
- V89 conserve les vêtements sur le corps humain après décès. Cette propriété et la sépulture ne doivent pas être confondues avec un futur état « souillé par un mort ».

La structure actuelle encode la matière dans les identifiants `cloth-shirt` et `cloth-tribalwear`, et encode seulement `cloth` dans les inachevés. La généralisation doit préserver les ItemId historiques et l’identité des piles : voir la migration ci-dessous.

## Sources locales Core 1.6.4871

Référence primaire lue en lecture seule : **RimWorld Core 1.6.4871 rev590**, installation `E:/Steam/steamapps/common/RimWorld`, `Version.txt` relu le 21 septembre 2026. Définitions ciblées : vêtements divers et couvre-chefs, matières tissu/cuir, bâtiments de production, statistiques de matières et projets de recherche. Classes relues dans l’assembly installé avec ILSpyCmd 8.2 : `ApparelProperties`, `Pawn_ApparelTracker`, `ApparelPolicy`, `OutfitDatabase`, `Pawn_OutfitTracker`, `JobGiver_OptimizeApparel`, `ThoughtWorker_ApparelDamaged`. Aucun XML propriétaire ni code décompilé n’est reproduit ici ; les tableaux sont des relevés reformulés.

Confiance **élevée** sur les données locales de cette révision et sur les branches explicites des classes citées. Les pages publiques servent de corroboration et d’explication, pas de remplacement du binaire local. Confiance **moyenne** sur l’équivalence avec un correctif public ultérieur et sur l’équilibrage de Lisière avant campagne commune.

### Familles retenues

| Famille | Matière | Coût | Travail Core | PV de base | Couche et couverture | Délai Core |
|---|---:|---:|---:|---:|---|---:|
| Tenue tribale, déjà livrée | tissu ou cuir | 60 | 1 800 | 100 | peau ; torse et jambes | 90 |
| Chemise boutonnée, déjà livrée | tissu ou cuir | 45 | 2 700 | 100 | peau ; torse, cou, épaules et bras | 90 |
| **Pantalon** | tissu ou cuir | 40 | 1 600 | 100 | peau ; jambes | 120 |
| **Cache-poussière** | tissu ou cuir | 80 | 10 000 | 200 | extérieure ; torse, cou, épaules, bras et jambes | 180 |
| **Parka** | tissu ou cuir | 80 | 8 000 | 180 | extérieure ; torse, cou, épaules et bras | 180 |

Le pantalon et la chemise sont compatibles car leur couverture ne se recoupe pas sur la même couche. La tenue tribale entre en conflit avec les deux. Cache-poussière et parka se remplacent mutuellement. Les deux restent compatibles avec le gilet pare-balles, couche intermédiaire torse/cou. Une amputation n’ouvre aucun emplacement ; au moins une partie couverte doit subsister, conformément au noyau V63.

Les délais entiers ci-dessus se convertissent exactement à dix ticks Core par tick local : 9, 9, 12, 18 et 18 ticks locaux. Les couvre-chefs à 48 ticks Core nécessiteraient une politique d’arrondi ou un accumulateur fractionnaire supplémentaire ; ils sont donc différés plutôt que discrètement arrondis.

### Matières et statistiques

| Matière obtenable | Armure matière Sharp / Blunt / Heat | Isolation matière froid / chaleur | PV de la pile | Détérioration extérieure Core | Acquisition Lisière |
|---|---:|---:|---:|---:|---|
| Tissu | 0,36 / 0 / 0,18 | 18 / 18 °C | 80 | 4 PV/jour | coton mûr, dix unités |
| Cuir léger | 0,54 / 0,14 / 1,50 | 12 / 12 °C | 60 | 2 PV/jour | boucherie physique du lièvre |

Les PV de la pile textile ne deviennent pas les PV du vêtement. Le tissu conserve le facteur de PV par défaut 1 ; le cuir léger fixe également ce facteur à 1. Les cinq familles ont donc les PV du tableau précédent dans ces deux matières. Les deux matières ont un facteur de travail neutre 1.

Les statistiques normales des trois nouvelles familles se calculent à partir des coefficients Core du vêtement et de la matière :

| Pièce normale | Matière | Sharp / Blunt / Heat | Isolation froid / chaleur |
|---|---|---:|---:|
| Pantalon | tissu | 7,2 % / 0 % / 3,6 % | 3,6 / 1,44 °C |
| Pantalon | cuir léger | 10,8 % / 2,8 % / 30 % | 2,4 / 0,96 °C |
| Cache-poussière | tissu | 10,8 % / 0 % / 5,4 % | 10,8 / 15,3 °C |
| Cache-poussière | cuir léger | 16,2 % / 4,2 % / 45 % | 7,2 / 10,2 °C |
| Parka | tissu | 7,2 % / 0 % / 3,6 % | 36 / 0 °C |
| Parka | cuir léger | 10,8 % / 2,8 % / 30 % | 24 / 0 °C |

**Vérifié :** le Core local applique ces coefficients de vêtement aux puissances de matière. **Adapté :** Lisière conserve ses facteurs de qualité déjà livrés, distincts pour armure et isolation, son plafond d’armure à 200 % et son PRNG sérialisé. Les PV restants ne réduisent ni armure ni isolation ; ils agissent sur pensées, valeur, politique et destruction.

Ce petit catalogue crée des décisions effectives avec les ressources présentes. Le tissu protège mieux du froid dans une parka ; le cuir léger protège davantage des impacts et de la chaleur, mais n’est pas présenté comme un cuir de qualité. Les futurs cuirs d’espèces ne doivent pas être recolorés en `light-leather` : ils appartiennent au front biologique et devront garder leurs propres propriétés.

## Ateliers et recherche

### Tailleur manuel existant

Le `tailor-bench` V73 correspond déjà au tailleur manuel Core dans les limites locales : 3×1, 75 bois ou acier, 2 000 Core de construction, facteur de vitesse 0,5 et projet Vêtements complexes. Il doit proposer les cinq recettes retenues. L’emplacement d’artisanat gratuit continue à ne proposer que la tenue tribale ; il ne devient pas un tailleur complet.

### Tailleur électrique proposé

Le Core local demande une emprise 3×1, 75 unités de matière bois/métal, 50 acier, 2 composants, 2 500 Core de construction, Construction 4 et 120 W. Il travaille à vitesse 1 alimenté et 0,5 sans courant. V90 devrait adopter ces valeurs : les 75 unités de matériau principal et les 50 acier/2 composants additionnels restent des livraisons physiques distinctes, agrégées seulement à l’affichage si le matériau principal est lui-même l’acier. L’état de courant est capturé au travail ; une coupure change le débit futur sans réécrire le travail déjà accompli.

Core exige **Vêtements complexes et Électricité**. Lisière possède Vêtements complexes et un réseau électrique jouable mais pas de projet Électricité distinct. **Adaptation recommandée :** exiger Vêtements complexes, Construction 4, les matériaux et un réseau réel ; ne pas inventer un projet uniquement pour faire écran. Une partie ancienne qui connaît déjà Vêtements complexes obtient prospectivement le plan, sans bâtiment, ressource ni points ajoutés.

Le projet Vêtements complexes reste à **600 points**, sans nouveau coût ni réécriture de son `completedAt`. Il ouvre déjà le tailleur manuel et la chemise ; V90 étend son catalogue aux pantalon, cache-poussière, parka et tailleur électrique. Cet élargissement est annoncé comme adaptation du projet existant, pas comme preuve d’un arbre Core complet.

## Factures, ouvrages, travail et qualité

Chaque facture choisit une famille et autorise séparément `cloth` et `light-leather`. Une pièce utilise une seule matière : le planificateur peut rassembler plusieurs piles du même ItemId, jamais mélanger tissu et cuir pour atteindre la quantité. Disponibilité, rayon, filtre, réservation de la quantité totale, dépôt de l’ouvrage et identité sont prévalidés avant consommation ou tirage.

L’ouvrage inachevé doit conserver : recette, ItemId de matière, quantité incorporée, parts des piles, auteur, progression entière et éventuelle facture liée. Une reprise liée attend son auteur et garde la matière d’origine ; une nouvelle facture ne peut pas convertir un inachevé de tissu en cuir. Une annulation restitue 75 % de **la matière incorporée**, pile par pile avec l’arrondi transactionnel existant. Une pièce achevée garde matière, qualité et PV maximum dérivé ; la fin bloquée ne consomme rien et ne relance pas la qualité.

Artisanat, passions, traits, saturation, oubli, travail réellement effectué et distribution de qualité restent ceux de V72. Le matériau ne modifie pas la qualité tirée. Le tailleur électrique modifie la vitesse du poste, pas l’XP par unité de travail neutre. Les facteurs lumière, extérieur, pièce et température déjà communs aux tailleurs continuent de s’appliquer ; V90 ne doit pas réviser rétroactivement les recettes de cuisine ou de pierre.

La matière portée devient une propriété de l’instance, utilisée par protection, isolation, couleur, libellé et commerce. Carte, portrait et inspection lisent la même instance. Le rendu doit étendre le lot GPU corporel résident : jambes habillées et une couche extérieure partagée, avec couleur de matière ; aucun mesh, pipeline ou draw call par vêtement.

## Usure portée

`ApparelProperties.wearPerDay` vaut **0,4** dans le Core local. `Pawn_ApparelTracker` traite une journée de 60 000 ticks Core, applique `RoundRandom(0,4)` à chaque pièce portée et ne traite pas les personnes hors carte. Il en résulte un tirage par pièce et par jour : 40 % de perdre 1 PV, sinon zéro. La qualité ne modifie pas cette usure.

**Adopter l’effet, adapter le calendrier :** une journée Lisière vaut exactement 6 000 ticks locaux. Un calendrier par personne et un flux aléatoire `apparel` privé doivent être persistés ; les pièces sont parcourues par ItemId d’instance stable. Cela évite de déplacer les tirages des combats, maladies, météo ou visiteurs. Une pièce à zéro disparaît de son propriétaire unique, invalide toute tâche/réservation dérivée et ne restitue aucune matière.

L’usure portée se cumule avec les pertes par armure, feu et destruction déjà actives. Elle s’arrête pour une pièce au sol, en cargaison, dans un ouvrage inachevé ou portée par un mort conservé comme corps. La détérioration de stockage extérieur/pluie/eau reste différée : l’ajouter ici demanderait un système général pour toutes les piles, pas une exception vestimentaire.

Les seuils locaux et Core installés concordent : pensée modérée strictement sous 50 %, grave strictement sous 20 %. Le Core local ignore seulement les vêtements verrouillés par un autre système ; le port forcé manuel appartient à un gestionnaire distinct et n’annule pas cette pensée. Lisière peut donc conserver sa pensée sur toute pièce abîmée dans V90, car les verrouillages de quêtes ne sont pas livrés. Le port forcé par le joueur reste une décision de politique, pas une immunité psychologique à inventer.

## Politiques et remplacement physique

Une politique minimale est nécessaire : sans elle, l’usure ne forme qu’une minuterie de destruction et oblige à surveiller chaque colon. Elle doit rester plus petite que le système Core complet tout en couvrant le cycle produit.

Chaque politique partagée conserve un ID propre, un nom, les familles admises, les matières admises, une qualité minimale/maximale et une plage de PV en pourcentage. Chaque colon joueur possède un `apparelPolicyId`. Limite recommandée : 32 politiques et noms de 1 à 60 caractères, comme adaptation cohérente avec les régimes alimentaires, sans prétendre que ces bornes viennent de Core.

Deux préréglages suffisent :

- **Sans restriction** : toutes les pièces V90, tissu/cuir léger, toutes qualités, 1–100 % ;
- **Tenue entretenue** : mêmes pièces et matières, toutes qualités, **51–100 %** pour déclencher le retrait avant la pensée sous 50 %.

Créer, copier, modifier, affecter et supprimer suivent les transactions des régimes : IDs non réutilisés, copie sans lien mutable, suppression refusée tant qu’un colon joueur utilise la politique, entrée inconnue ou doublon refusé sans mutation. Les captifs, visiteurs et morts ne deviennent pas des utilisateurs ordinaires par migration.

Le Core local :

- évalue un colon entre 6 000 et 9 000 ticks Core, soit 600–900 ticks locaux ;
- retire d’abord une pièce non admise si elle n’est ni forcée ni verrouillée ;
- ne cherche des candidats que dans un stockage, accessibles, réservables, autorisés et non en feu ;
- valorise armure Sharp + Blunt, état, besoin de chaleur et propriétés spéciales ; un candidat doit gagner au moins 0,05 ;
- multiplie fortement le gain d’une pièce qui remplit une couche libre ;
- maintient un vêtement forcé jusqu’à levée explicite, conflit avec un nouvel ordre forcé ou destruction.

V90 devrait adopter ce parcours et le sous-ensemble de score que ses systèmes savent expliquer : base, Sharp + Blunt, facteur de PV de la courbe locale Core, isolation froid lorsque le colon a réellement besoin de chaleur, qualité/matière déjà résolues. Les effets de royauté, idéologie, genre, esclavage, vide, vêtement d’un mort et utilitaires restent absents. La politique explicite choisit parka ou cache-poussière ; aucun faux score de chaleur n’est inventé.

Le contrôle reste physique : le candidat demeure au sol et réservé pendant le trajet/habillage ; le remplacement dépose l’incompatible selon son délai ; un retrait automatique dépose une pièce autorisée au transport, contrairement au retrait manuel actuellement interdit au sol. Sol saturé, accès perdu ou candidat disparu conservent la pièce portée et libèrent les réservations. Deux colons ne peuvent choisir la même instance.

Un ordre manuel **Porter** marque la nouvelle pièce `forced`; la politique ne la retire pas. **Effacer forcé** enlève seulement ce marqueur et provoque une réévaluation future, sans téléportation ni déshabillage immédiat. Une tâche automatique déjà engagée continue avec ses captures physiques si la politique change ; la décision suivante emploie la nouvelle politique.

`nextApparelCheckAt`, la source automatique/manuelle de la tâche et le marqueur forcé sont persistés. Le prochain contrôle utilise un flux propre ou un décalage stable par colon ; aucune boucle globale de tous les vêtements à chaque tick ni évaluation par image.

## Persistance et migration V89 → V90

La migration doit d’abord valider V89 strictement, puis ajouter seulement les structures nécessaires :

1. Aucun vêtement, matière, ouvrage, atelier, recherche, qualité, PV ou expérience n’est créé. Les bâtiments et recherches présents gardent leurs IDs, travaux et dates.
2. `cloth-shirt` et `cloth-tribalwear` restent des ItemId valides et stables. L’absence historique de `apparel.material` est migrée explicitement vers `cloth`; une nouvelle instance peut porter `light-leather`. Le libellé vient de famille + matière, pas du nom de l’ItemId.
3. Les inachevés historiques reçoivent `material:'cloth'`; quantités, `parts`, auteur, progression et `billId` restent identiques. Aucun inachevé n’est renommé, terminé ou remboursé.
4. Les recettes nouvelles utilisent des ItemId de famille sans matière pour éviter une explosion future du catalogue ; leurs instances portent la matière. Les anciens ItemId ne servent jamais à deviner le matériau après V90 : le champ validé est autoritaire.
5. Un flux `apparelRng` et une échéance d’usure sont initialisés prospectivement depuis l’état courant, sans rejouer les jours écoulés ni toucher `world.rng`.
6. Les politiques et leurs IDs utilisent un espace séparé de `nextId`. Les anciennes parties reçoivent les deux préréglages et une affectation valide mais gardent `apparelAutomation:false`; le joueur active explicitement le remplacement. Les nouvelles parties peuvent commencer actives sur Sans restriction. Cette adoption évite tout retrait automatique à la première reprise.
7. Les tâches V89 en cours gardent leur sens. Aucun nouveau champ de tâche V90 n’est accepté dans un schéma déclaré 89. V90 refuse matière inconnue, quantité incohérente, PV au-dessus du maximum dérivé, propriétaire multiple, couche conflictuelle, politique absente, date future invalide et état forcé sur une pièce non portée.

Le validateur doit aussi contrôler qu’un inachevé est homogène et que la somme de ses parts vaut son coût, que le produit correspond à sa recette, que les bornes de progression utilisent le travail propre à la famille, et qu’une tâche automatique pointe une pièce encore réservée et une politique existante.

## Validation proposée

### Contrats courts

- formules des cinq familles × deux matières × six qualités produites ; protection anatomique et isolation sans dépendance aux PV restants ;
- compatibilité chemise/pantalon/gilet/couche extérieure et conflits avec tenue tribale ou seconde couche extérieure ; amputations et destruction au dernier PV ;
- factures tissu/cuir, refus du mélange, filtres/rayon, collecte de plusieurs piles, sol saturé, interruption, auteur, reprise, annulation 75 %, produit et qualité transactionnels ;
- tailleur manuel ×0,5 ; électrique ×1 alimenté et ×0,5 hors courant ; coupure/reprise sans perte de progression ni d’XP ;
- usure quotidienne seedée, aucune usure rétroactive ou au sol, cumul avec impact et feu, pensée aux frontières exactes 50/20 % ;
- CRUD/affectation des politiques, plage 51–100 %, pièce forcée, candidat de réserve, réservations concurrentes, accès perdu, retrait automatique transportable, changement de politique pendant une tâche ;
- prix/stockage : matière conservée au transport, commerce et feu ; aucune extension silencieuse du stock visiteur.

### Sauvegarde et reprise

Comparer l’état exact avant/après sérialisation pendant : collecte textile, création d’inachevé, travail au tailleur électrique alimenté puis coupé, vêtement automatique réservé, ancien vêtement déjà déposé, échéance d’usure imminente et politique modifiée. Rejouer chaque cas depuis le checkpoint, puis comparer monde, PRNG par domaine, IDs, événements et objets.

La migration dédiée part d’une fixture V89 propre et de `colony-v89.json.gz` : zéro différence hors champs additifs/matière explicitement migrée ; aucun retrait, point de recherche ou vêtement nouveau. Une sauvegarde V89 portant des champs V90 doit être refusée.

### UI, parcours et charge

Le parcours UI doit obtenir du tissu par coton et du cuir léger par une vraie boucherie, fabriquer au moins une pièce de chaque matière, la porter, régler une politique 51–100 %, constater un remplacement physique, sauvegarder et reprendre. Les ressources disponibles dans le checkpoint commun doivent être inspectées ; une ressource absente s’obtient par les commandes ordinaires, elle n’est pas injectée pour raccourcir le parcours.

L’usure aléatoire rare et les refus de sol gardent des frontières contrôlées séparées. Le parcours naturel n’a pas à attendre arbitrairement qu’un tirage quotidien use une pièce. Une pièce déjà réellement abîmée par la campagne peut servir au remplacement ; sinon le scénario clinique fournit la preuve.

Mesures successives, jamais concurrentes : CPU 3/30/100 colons portant plusieurs couches, puis rendu natif, puis campagne commune. Mesurer séparément recherche de candidats, score, navigation et DOM des politiques. Les contrôles sont décalés et bornés ; aucune passe par image, reconstruction de géométrie ou examen de toute la carte à chaque tick. Les sources servies restent gelées pendant les passages natifs.

## Ce qui est différé

- couvre-chefs, veste redondante, manteaux/capes DLC, vêtements d’enfant et utilitaires ;
- laine, synthétoffe, hyperfibre, diabolus, autres cuirs et leurs espèces/biomes ;
- souillure par un mort, lavage, teinture, genre, nudité complète, styles, idéologie et exigences royales ;
- détérioration extérieure/pluie/eau, réparation, recyclage, fonte et destruction volontaire des vieux vêtements ;
- paramètres Core complets de filtre, sélection des artisans, compter les équipés dans une facture et toutes les préférences du score automatique ;
- fabrication du gilet, pantalon/veste pare-éclats, casques, armure de plaques et armures avancées.

Ce dernier report est structurel. Le Core local place le gilet à la table d’usinage : 30 tissu, 60 acier, 1 composant, 9 000 Core, Artisanat 4. La table demande 150 acier, 5 composants et 350 W ; Forge → Usinage → Armure pare-éclats représentent 700 + 1 000 + 1 200 points avec leurs autres contenus. Ajouter seulement la recette du gilet contournerait la filière d’armurerie que ROADMAP demande de traiter pour elle-même. L’annonce officielle 1.6 confirme aussi le rééquilibrage propre des armures pare-éclats et la couverture torse/cou du gilet : ce domaine mérite un lot cohérent.

## Critère d’arrêt V90 recommandé

Le lot est terminé lorsque la colonie peut, depuis des ressources réellement acquises, fabriquer et porter une pièce en tissu et une en cuir léger parmi les cinq familles, utiliser le tailleur électrique avec coupure/reprise, laisser l’usure créer un besoin de renouvellement, puis faire accomplir un remplacement conforme à la politique par trajet, retrait, habillage et rangement physiques ; l’ensemble doit reprendre exactement après sauvegarde et conserver protection, isolation, qualité, matière et identité.

Cette preuve ne revendique ni catalogue vestimentaire complet, ni armurerie, ni équilibre universel des matières. Elle livre une boucle renouvelable substantielle avec les systèmes présents.

## Sources publiques

- [Ludeon — Alpha 7, Things Made of Stuff](https://ludeon.com/blog/2014/10/alpha-7-things-made-of-stuff-released/) : source primaire historique pour coton, cuirs et vêtements fabriqués dans une matière choisie ; elle ne donne pas les valeurs 1.6 actuelles.
- [Ludeon/Steam — annonce de la mise à jour 1.6](https://store.steampowered.com/news/posts/?appgroupname=RimWorld&appids=294100&enddate=1752076799&feed=steam_community_announcements) : source primaire pour le rééquilibrage des armures pare-éclats et la suppression des épaules du gilet.
- [Ludeon — mise à jour 1.6.4566](https://ludeon.com/blog/2025/08/update-1-6-4566-improves-gravships-shuttles-and-more/) : montre que l’optimisation de tenue actuelle comporte des exceptions Odyssey/vide ; elles ne sont pas importées dans le périmètre Core de Lisière.
- [RimWorld Wiki — Apparel](https://rimworldwiki.com/wiki/Apparel) : corroboration actuelle des couches, armure, usure moyenne de 0,4 PV/jour, effets des matières et remplacement ; la définition locale reste autoritaire.
- [RimWorld Wiki — Apparel policies](https://rimworldwiki.com/wiki/Apparel_policies) : corroboration des politiques partagées, du choix automatique et du port forcé.
- [RimWorld Wiki — Electric tailor bench](https://rimworldwiki.com/wiki/Electric_tailor_bench) et [Hand tailor bench](https://rimworldwiki.com/wiki/Hand_tailor_bench) : coûts, courant, vitesses et recettes, confrontés aux Defs locales.
- [RimWorld Wiki — Lightleather](https://rimworldwiki.com/wiki/Lightleather) : provenance du lièvre, propriétés et usages textiles, confrontés à la matière locale.
- [RimWorld Wiki — Duster](https://rimworldwiki.com/wiki/Duster) : couverture, travail, matière et rôle thermique/protecteur du cache-poussière.
- [ILSpyCmd 8.2.0.7535](https://www.nuget.org/packages/ilspycmd/8.2.0.7535) : outil employé pour la lecture locale ciblée ; ses sorties restent des données de travail non publiées.

Références internes : [textiles V71](textile-reference.md), [confection V72](tailoring-reference.md), [vêtements/protection V63](apparel-reference.md), [contrat de confection](../development/tailoring.md), [contrat d’armure](../development/armor.md), [catalogue jouable](../gameplay/content-catalogue.md) et [ROADMAP](../ROADMAP.md).
