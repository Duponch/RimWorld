# Habitation, confort et beauté — référence V90

Recherche du 21 septembre 2026, **préparation seulement**. Ce document propose un lot Core borné ; il ne déclare aucun contenu livré. Il prolonge les contrats de [construction](../development/construction.md), [matières de construction](../development/construction-materials.md), [transport de meubles](../development/furniture-travel.md), [transfert](../development/furniture-transfer.md), [logistique](../development/furniture-logistics.md), [pièces](../development/rooms.md), [repas](../development/dining.md), [besoins](../development/needs.md), [humeur](../development/mood.md), [environnement de travail](../development/work-environment.md), [salissures](../development/cleanliness.md) et [catalogue jouable](../gameplay/content-catalogue.md). La [ROADMAP](../ROADMAP.md) reste seule autorité de calendrier.

## Sources, version et niveau de confiance

La référence numérique primaire est l'installation locale **RimWorld 1.6.4871 rev590** : `Version.txt`, Defs de `Data/Core/Defs` et `Assembly-CSharp.dll`, SHA-256 déjà établie `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Inspection en lecture seule ; aucun XML propriétaire, code décompilé ou fichier de partie n'est reproduit ici. Les fichiers consultés incluent les définitions de meubles, plantes décoratives, besoins, pensées, statistiques, recherches et matériaux. Les classes inspectées comprennent `Need_Beauty`, `Need_Comfort`, `BeautyUtility`, `StatPart_Quality`, `QualityUtility`, `RoomStatWorker_Beauty`, `RoomStatWorker_Impressiveness` et `ThoughtWorker_RoomImpressiveness`.

La hiérarchie de preuve est la suivante :

1. **Valeur actuelle locale** : la build 1.6.4871 installée décide des coefficients et héritages retenus.
2. **Comportement recoupé** : le miroir public [RimWorldDecompiled](https://github.com/Chillu1/RimWorldDecompiled), notamment les classes des besoins, de la qualité et des statistiques de pièce, confirme la structure des algorithmes. Son état public observé le 20 mai 2026 précède toutefois la build locale : il ne remplace pas la DLL locale.
3. **Documentation secondaire actuelle** : les pages du wiki sur les [meubles](https://rimworldwiki.com/wiki/Furniture), les [sièges](https://rimworldwiki.com/wiki/Chairs), le [confort](https://rimworldwiki.com/wiki/Comfort), la [beauté](https://rimworldwiki.com/wiki/Beauty), la [qualité](https://rimworldwiki.com/wiki/Quality) et les [pièces](https://rimworldwiki.com/wiki/Room) servent de recoupement lisible, pas d'oracle. Certaines tables mélangent Core et extensions ou portent encore des demandes de vérification.
4. **Versions anciennes** : les miroirs XML 1.2/1.3 et discussions antérieures ne fixent aucune valeur V90. Ils ne servent qu'à repérer une évolution éventuelle. La page wiki du pot de fleurs annonce par exemple trois jours pour l'hémérocalle, tandis que la définition locale actuelle donne `1,5 × 3 = 4,5` jours ; V90 retient **4,5 jours**.
5. **Observations de parties** : les sauvegardes et parcours historiques de Lisière montrent l'usage réel des chambres, réfectoires, postes et réserves. Ils ne fixent ni catalogue universel ni coefficient Core.

L'[annonce officielle de la mise à jour 1.6](https://ludeon.com/blog/2025/06/announcing-odyssey-and-update-1-6/) et le [correctif officiel 1.6.4850](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) situent la branche. Ils ne documentent pas les valeurs de mobilier ; la build locale, plus récente, reste la référence de ce dossier.

## État de Lisière avant V90

Le lit simple, la table 1×2 et le tabouret sont déjà construits physiquement en bois, acier ou cinq pierres, avec transport, minification, réinstallation, restitution, dégâts, feu et sauvegarde. Le lit conserve son propriétaire pendant le transport. La table et un siège adjacent évitent le souvenir « mangé sans table ». Le tabouret fournit un plafond de confort de 0,50 à table et au bureau de recherche ; le lit fournit 0,75 pendant le sommeil. Le confort monte de 60 points par heure et baisse de 4 points par heure. Les seuils d'humeur déjà livrés sont sous 10 % : −3, puis 60/70/80/90 % : +4/+6/+8/+10.

Cette base reste une **adaptation locale** : les meubles construits n'ont pas de qualité persistée, les autres postes de travail ne consomment pas uniformément un siège, et le lit historique est disponible même sans projet Mobilier complexe. Les pièces ont une topologie, un rôle et une propreté ; elles n'ont ni beauté, richesse, espace Core complet ni impression. Les dalles de pierre livrées V89 valent toutes +1 de beauté dans les Defs actuelles, mais cette valeur n'a encore aucun consommateur. Les salissures ont une propreté physique, mais leur pénalité de beauté n'est pas encore appliquée. Le commentaire de `wellbeing.ts` limite explicitement le mobilier à la qualité normale.

Les identités de pièce sont dérivées de la topologie et ne sont jamais des identités de sauvegarde. Le mobilier emballé garde en revanche l'identité complète de la structure. Ces deux choix doivent rester vrais en V90.

## Contrat Core à adopter

### Qualité des meubles

Les sept niveaux sont **affreux, médiocre, normal, bon, excellent, chef-d'œuvre, légendaire**. La construction de mobilier tire la qualité à l'achèvement réussi, à partir du niveau Construction effectif après le travail. Les centres de distribution locaux relevés aux niveaux 0 à 20 sont :

`0,70 ; 1,10 ; 1,50 ; 1,80 ; 2,00 ; 2,20 ; 2,40 ; 2,60 ; 2,80 ; 2,95 ; 3,10 ; 3,25 ; 3,40 ; 3,50 ; 3,60 ; 3,70 ; 3,80 ; 3,90 ; 4,00 ; 4,10 ; 4,20`.

Le tirage utilise la dispersion asymétrique déjà adaptée par Lisière pour la confection : gaussienne 0,6 sous le centre, 0,8 au-dessus, résultat arrondi et borné 0..5 ; un résultat légendaire subit le second tirage de limitation. Cette réutilisation conserve le PRNG sérialisé de Lisière ; elle ne prétend pas reproduire la séquence Unity.

| Statistique | Affreux | Médiocre | Normal | Bon | Excellent | Chef-d'œuvre | Légendaire |
|---|---:|---:|---:|---:|---:|---:|---:|
| Beauté positive | −0,10 | 0,50 | 1,00 | 2,00 | 3,00 | 5,00 | 8,00 |
| Confort | 0,76 | 0,88 | 1,00 | 1,12 | 1,24 | 1,45 | 1,70 |
| Efficacité de repos du lit | 0,86 | 0,92 | 1,00 | 1,08 | 1,14 | 1,25 | 1,60 |

La qualité multiplie la beauté de base positive ; elle ne transforme pas une valeur de base négative. L'offset de matière s'ajoute selon le pipeline de statistique Core : le marbre apporte +1 aux meubles de pierre concernés, bois, acier et les quatre autres pierres livrées n'ajoutent rien. Pour le fauteuil, le cuir léger et le tissu n'altèrent pas le confort ; leur profil matière doit néanmoins rester distinct pour PV, feu, couleur et beauté. La qualité du meuble appartient à son identité : désinstallation, portage, réservation, stockage et réinstallation ne la recalculent jamais.

Les bonus de table de chevet et de commode s'ajoutent au confort de base du lit **avant** le facteur de qualité du lit. Leur propre qualité ne modifie pas le bonus. Un lit normal passe donc de 0,75 à 0,80 avec l'un, puis à 0,85 avec les deux. Ces bonus ne changent pas l'efficacité de repos.

Le tirage et l'XP ne sont publiés qu'après validation de l'achèvement, de l'identité du chantier, de la matière, de la place et de la sauvegarde. Un chantier refusé, saturé ou interrompu ne consomme pas de hasard et ne crée pas une qualité fantôme.

### Confort utilisé

Le plafond de confort vient du meuble réellement utilisé durant les quinze derniers Core ticks dans la référence. Pour Lisière, l'autorité est l'occupation actuelle d'un lit ou d'un siège au point d'interaction : une chaise proche mais non utilisée n'apporte rien. Le confort monte toujours à 0,60 par heure et baisse à 0,04 par heure ; une qualité supérieure change le plafond, pas cette vitesse. Le besoin est borné à 100 %, même si la statistique du meuble dépasse 1.

Le consommateur commun doit couvrir : repas à une table, recherche et autres travaux stationnaires dont le poste possède un point d'interaction assis. Il doit remplacer l'exception codée pour le seul tabouret au bureau de recherche. Construction, transport, cuisine debout, nettoyage et passage à travers une chaise ne deviennent pas confortables par proximité. La matrice exacte des postes assis doit être fixée par une observation locale ciblée avant implémentation ; le moteur ne doit pas déclarer tous les ateliers assis par commodité.

### Beauté perçue et humeur

Le besoin commence à **0,40**. Sa cible instantanée est `borne(0,40 + beauté perçue moyenne × 0,10, 0, 1)`. La beauté perçue échantillonne les cellules visibles dans un rayon radial de **8,9**, avec séparation par pièce et portes selon la visibilité ; une personne aveugle ou hors carte reste à 0,50 dans le comportement Core observé. Le besoin monte de **0,32 par heure**, baisse de **0,08 par heure** et se fige pendant le sommeil.

| Niveau du besoin | Pensée | Humeur |
|---|---|---:|
| ≤ 1 % | environnement hideux | −15 |
| > 1 % et < 15 % | environnement très laid | −10 |
| 15–35 % | environnement disgracieux | −5 |
| 35–65 % | neutre | 0 |
| 65–85 % | joli environnement | +5 |
| 85–99 % | bel environnement | +10 |
| ≥ 99 % | environnement magnifique | +15 |

Cette perception doit inclure les contributeurs déjà physiques, pas seulement le nouveau catalogue : meubles et bâtiments, sols, plantes, piles au sol et salissures. Pour les traces déjà livrées, la build locale donne notamment terre/déchets −15 en intérieur, sang −30, cendres −10 et vomi −40. L'épaisseur d'une trace ne multiplie pas la beauté, comme elle ne multiplie pas la propreté de pièce. Un objet porté, incorporé à un chantier, enterré ou emballé n'est pas une pile visible sur sa cellule d'origine.

L'extérieur et l'intérieur peuvent avoir des valeurs distinctes. La terre naturelle locale est par exemple pénalisée en intérieur mais neutre à l'extérieur. Un unique tableau de « beauté d'objet » sans contexte serait faux. Les objets non encore audités restent exclus de l'affichage plutôt que dotés d'une valeur inventée ; la V90 ne peut être déclarée complète avant audit de tous les types actuellement obtenables.

### Beauté de pièce

La beauté de pièce additionne la beauté des cellules intérieures et des objets de bord adjacents, puis divise par une taille pondérée : `20 + taille / 2` sous 40 cellules, `taille` à partir de 40. Les seuils actuels sont :

| Valeur | Libellé |
|---:|---|
| < −3,5 | hideuse |
| −3,5 à < 0 | laide |
| 0 à < 2,4 | neutre |
| 2,4 à < 5 | jolie |
| 5 à < 15 | belle |
| 15 à < 50 | très belle |
| 50 à < 100 | extrêmement belle |
| ≥ 100 | incroyablement belle |

La pièce extérieure reliée au bord n'acquiert pas un score intérieur artificiel. Portes, coins, sols sous murs et bordures doivent suivre le même contrat de voisinage que propreté et température. La valeur est dérivée : elle n'est pas sauvegardée et n'offre pas à elle seule un souvenir d'humeur.

### Impression de pièce : référence connue, différé obligatoire

Core combine richesse/1500, beauté/3, espace/125 et `1 + min(propreté, 0) / 2,5`. Chaque facteur au-delà de ±1 est comprimé par logarithme naturel ; le score moyen est ramené à 35 % vers son facteur minimum, puis plafonné souplement par cinq fois le facteur d'espace. Le résultat est multiplié par 100. Les bandes sont 20/30/40/50/65/85/120/170/240. Une chambre donne −2 sous 20, rien entre 20 et 30, +1 entre 30 et 40, puis +2 à +8 ; réfectoire et salle de loisirs commencent seulement à +2 à 40. Les souvenirs durent un jour et ne s'empilent pas.

Lisière ne dispose pas encore d'une richesse de pièce complète ni de l'espace Core pour chaque structure, pile et plante. V90 doit donc **différer l'impression et ses souvenirs**. Une humeur calculée depuis la seule beauté serait fausse et rendrait les meubles trop puissants. La beauté de pièce reste utile et inspectable, tandis que le besoin personnel de beauté produit le bénéfice d'humeur de ce lot.

## Catalogue V90 recommandé

Le catalogue ajoute sept familles réellement jouables et requalifie les trois meubles existants. Les travaux indiqués sont des Core ticks de base avant facteur matière ; Lisière les convertit par sa règle commune de dix Core par tick local, après facteur et offset de matière. Les restitutions conservent le contrat moitié à la déconstruction et quart à la destruction, avec prévalidation et arrondi communs.

| Objet | Empreinte | Matières et coût | Travail ; minimum | Recherche | Statistiques normales et usage |
|---|---:|---|---:|---|---|
| Lit simple, existant | 1×2 | 45 bois, acier ou blocs | 800 | Mobilier complexe dans Core ; compatibilité locale ci-dessous | beauté 1, confort 0,75, repos 1 ; propriétaire, prison et médical conservés ; qualité agit sur les trois statistiques applicables |
| Table 1×2, existante | 1×2 | 28 bois, acier ou blocs | 750 | aucune | beauté 0,5 ; six places potentielles ; rôle réfectoire et repas réel |
| Tabouret, existant | 1×1 | 25 bois, acier ou blocs | 450 | aucune | beauté 1, confort 0,50 ; siège de repas ou de poste |
| **Chaise de salle à manger** | 1×1 | 45 bois ou acier, jamais pierre | 8 000 ; Construction 4 | Mobilier complexe | beauté 8, confort 0,70, 100 PV ; siège de repas ou de poste, qualité active |
| **Fauteuil** | 1×1 | 110 tissu ou cuir léger | 14 000 ; Construction 5 | Mobilier complexe | beauté 4, confort 0,80, 120 PV ; siège de repas ou de poste, qualité active |
| **Table de chevet** | 1×1 | 30 bois, acier ou blocs | 1 000 | Mobilier complexe | beauté 3, 75 PV ; +0,05 de confort à un lit dont la tête est cardinalement adjacente ; au plus une table par lit |
| **Commode** | 2×1 | 50 bois, acier ou blocs | 2 000 | Mobilier complexe | beauté 5, 120 PV ; +0,05 aux lits dont le centre réel est dans un rayon de 6 et dont une paire de cellules a une ligne de vue ; plusieurs lits servis, au plus une commode par lit |
| **Table 2×2** | 2×2 | 50 bois, acier ou blocs | 1 500 | aucune | beauté 1, 100 PV ; huit places potentielles ; même contrat de repas que la 1×2 |
| **Table 2×4** | 2×4 | 95 bois, acier ou blocs | 3 000 | aucune | beauté 2, 150 PV ; douze places potentielles ; même contrat de repas que la 1×2 |
| **Pot de fleurs** | 1×1 | 20 bois, acier ou blocs | 250 | aucune | 75 PV, fertilité 100 % ; support physique, sans beauté propre utile dans les matières retenues |
| **Hémérocalle en pot** | même cellule | aucun ingrédient ; travail de semis 540 | Cultures, sans minimum explicite | aucune | croissance 1,5 jour, durée totale actuelle 4,5 jours, lumière minimale 30 %, beauté 18 ; meurt puis exige un nouveau semis réel |

Les grandes tables restent traversables avec le coût de meuble Core adapté au rythme local ; elles ne deviennent ni sol ni mur. Le siège est une case occupable avec son ralentissement existant. Une chaise ne compte comme place de table que si sa cellule de travail est adjacente à une case de bord de la table, orientée ou non selon la règle Core ; une même chaise ne sert pas simultanément deux personnes. Les 8 et 12 places sont des capacités géométriques maximales, pas des colons créés ni des repas réservés d'avance.

Le pot est utile seulement avec le cycle complet : construction, semis par un cultivateur, lumière/température/croissance, beauté, sénescence, coupe et replantation. Une plante instantanée au moment de construire le pot serait une décoration gratuite. Pour éviter un transfert ambigu, V90 refuse de désinstaller un pot planté jusqu'à coupe physique de la plante ; cette règle est une adaptation prudente à documenter dans le futur contrat, pas une observation Core revendiquée. Le pot porte techniquement une qualité dans Core, mais elle ne change ni sa beauté nulle ni la fleur ; tant que la richesse de pièce est différée, Lisière peut conserver une qualité implicite normale pour le pot plutôt que montrer un niveau sans effet.

### Acquisition et boucle matérielle

- Le bois vient d'arbres réellement abattus, l'acier de la dotation ou du minerai, les blocs de fragments taillés après Taille de pierre.
- Le tissu vient du coton cultivé et récolté. Le cuir léger vient d'un lièvre chassé, d'une dépouille portée puis dépecée. Ces deux items sont déjà stockables, transportables, destructibles et échangeables ; les autoriser comme matière de fauteuil donne enfin un usage mobilier au cuir V79.
- Le choix de matière est enregistré dès la désignation. Les filtres, réservations, cargaisons et restitutions gardent l'item exact ; cuir et tissu ne sont pas convertis l'un en l'autre.
- Le fauteuil consomme 110 unités alors que la pile maximale locale reste 75 : le chantier doit réunir plusieurs piles sans augmenter la limite de pile. Son service n'autorise jamais une cargaison humaine de 110.
- Les qualités ne remplacent pas l'acquisition. Un meuble légendaire consomme les mêmes ingrédients, mais exige toujours le travail réel et le tirage d'achèvement.
- Le commerce de V88 ne doit proposer une nouvelle famille que si son entrée de stock et sa valeur sont explicitement ajoutées. La constructibilité locale suffit à V90 ; aucune probabilité de visiteur n'est redistribuée pour remplir ce catalogue.

## Recherche et scénarios

La définition locale actuelle de **Mobilier complexe** coûte **300 points**, niveau médiéval, et porte le tag `ClassicStart`. Le nouveau Crashlanded V90 devrait donc passer à une révision 5 qui connaît ce projet à la création, comme il connaît déjà Taille de pierre dans sa révision 4. Les scénarios historiques et anciennes sauvegardes n'acquièrent jamais cette connaissance par migration ; ils peuvent terminer la recherche normalement.

Le lit, la table 1×2 et le tabouret déjà disponibles restent disponibles. Les verrouiller rétroactivement invaliderait des plans, chambres, prisonniers et sauvegardes. Cette exception est une compatibilité locale annoncée, pas une affirmation sur Core. Les nouveaux fauteuil, chaise, table de chevet et commode sont verrouillés par Mobilier complexe ; les deux grandes tables et le pot ne le sont pas.

La recherche ne crée aucun meuble et la migration ne fournit aucun matériau. Une UI grisée sans projet actif ne vaut pas contenu. Chaque entrée livrée doit pouvoir être construite à partir d'une filière physique existante dans au moins un scénario pris en charge.

## Intégration et persistance

### État sauvegardé

- Chaque meuble construit qui utilise qualité sauvegarde un niveau 0..6 sur l'identité de structure. Le meuble emballé transporte cette même structure. Les anciens meubles sans champ sont interprétés **normal** sans tirage rétroactif ; les schémas antérieurs refusent le champ futur.
- Les chantiers gardent recette, matière, ingrédients incorporés, auteur de finition pertinent et travail. La qualité n'existe qu'après l'achèvement transactionnel.
- Chaque pion vivant sauvegarde son besoin de beauté borné. La migration V89→V90 l'initialise à 0,40, sans souvenir rétroactif et sans recalculer le passé. Les nouveaux pions commencent aussi à 0,40.
- La fleur en pot sauvegarde espèce, croissance/âge, échéance biologique et intention de semis/coupe. Une reprise ne rajeunit pas la fleur, ne double pas le travail et ne réactive pas une plante morte.
- Les liens lit–table de chevet–commode, les places de table, la beauté locale et la beauté de pièce sont dérivés de positions, emprises et topologie. Aucun identifiant de pièce ou lien de mobilier n'est sérialisé.
- Le projet Mobilier complexe suit le registre de recherche existant. La provenance du scénario décide seule de la connaissance initiale ; une migration ne réécrit pas le registre.

### Invalidations et coût

La beauté par cellule peut être tenue dans une couche dérivée, invalidée seulement quand change un contributeur : construction/fin/démolition, emballage/réinstallation, matière/qualité, dégâts si une statistique le prévoit, sol, plante, pile, salissure ou destruction. La beauté de pièce est recalculée avec la topologie touchée. Le besoin d'un pion lit cette couche dans son rayon et sa visibilité ; il ne reparcourt pas toutes les structures et piles de la carte à chaque tick.

Les liens de mobilier de lit sont recalculés pour les lits touchés par une pose, rotation, désinstallation ou destruction de table de chevet/commode. Ils ne nécessitent aucune recherche globale quotidienne. Les grandes tables utilisent le même index d'emprise, le même cheminement et le même système de réservations que les structures existantes. Le lot ne doit pas ajouter un graphe GPU, une matrice complète ou une allocation par meuble au repos.

Les mutations restent transactionnelles : avant de construire, déplacer, détruire ou défaire un meuble, prévalider place, identités, piles restituées, propriétaire, prison, réservations et capacité. Une destruction invalide immédiatement le siège, le lien de lit, la beauté et le rôle dérivés. Une personne assise dont le meuble disparaît doit libérer sa réservation sans téléportation ni confort résiduel.

### Migration V90

V89 doit être validée strictement avant toute migration. La migration ajoute le besoin de beauté neutre et l'interprétation de qualité normale ; elle n'ajoute ni fleur, ni meuble, ni matériau, ni souvenir, ni recherche. Les meubles déjà emballés et les lits attribués gardent leurs identités et propriétaires. Les structures anciennes conservent recettes, matières, dégâts et emprises. Les sauvegardes de version inférieure à 90 refusent qualité, beauté persistée, plante en pot et nouveaux types de structure.

## Différés explicites

| Contenu | Pourquoi il n'appartient pas à ce noyau V90 |
|---|---|
| Impression de pièce et souvenirs chambre/réfectoire/loisirs | Exigent richesse et espace complets pour tout le catalogue ; la beauté seule ne peut pas les remplacer. |
| Sculptures petite/grande/majestueuse et table de sculpteur | Exigent compétence et travail **Art**, factures, ouvrages inachevés, auteur, progression, histoire/qualité et trois emprises. Les ajouter comme simples bâtiments de Construction trahirait la boucle Core. |
| Lit double | Exige partage de lit, couple, deux propriétaires, sommeil/soins simultanés et UI correspondante ; la romance est absente. |
| Lit royal, lit d'hôpital, berceaux et mobilier animal | Ressources, recherches, soins, noblesse, enfants ou élevage hors périmètre. |
| Étagères, bibliothèques et armoires de stockage | Exigent plusieurs piles par cellule, recherche de destination, accès et rendu de conteneur ; ne pas les réduire à une décoration. |
| Rose | L'hémérocalle suffit à rendre le pot jouable ; la rose ajoute une seconde cadence à vérifier après le premier cycle complet. |
| Canapé et contenu Odyssey/Ideology/Royalty/Biotech/Anomaly | Périmètre demandé Core sans extensions ; aucun contenu DLC n'est converti en variante Core. |
| Peinture et styles | Exigent pigments, styles, commandes et persistance propres ; une couleur d'aperçu ne vaut pas une matière. |
| Commerce complet du mobilier et ruines | Les visiteurs V88 ne sont pas des négociants de gros ; aucune acquisition probabiliste n'est inventée. |

Les sculptures sont le prochain enrichissement logique de décoration : la build locale confirme, pour les trois tailles, des coûts de 50/100/400 matières, travaux de 18 000/30 000/105 000 et beautés de base 50/100/400. Ces valeurs restent de la recherche, pas des définitions V90 prêtes à afficher.

## Validation exigée

### Contrôles courts groupés

1. **Recettes** : chaque matériau autorisé/refusé, minimum Construction, verrou Mobilier complexe, plusieurs piles pour le fauteuil, travail matière commun et annulation conservatrice.
2. **Qualité** : tirage uniquement à la finition, distribution déterministe à graine fixée, facteurs beauté/confort/repos, marbre, interruption et refus sans consommation du PRNG ; transport/dégâts/sauvegarde gardent le niveau.
3. **Confort** : tabouret/chaise/fauteuil aux repas et postes réellement assis, réservations concurrentes, plafond par qualité, aucune aura ; lit avec zéro/un/deux auxiliaires, limites de distance/adjacence et destruction en cours d'usage.
4. **Beauté** : contributeurs positifs et négatifs, contexte intérieur/extérieur, visibilité par murs/portes, rayon 8,9, sommeil figé, seuils d'humeur exacts, sol et salissure ; aucune pile portée ou incorporée comptée au sol.
5. **Pièces** : petite pièce pénalisée, pièce ≥40 cellules, bord/porte/coin, ouverture vers l'extérieur, invalidation après déplacement/nettoyage/sol/fleur ; aucun identifiant de pièce sauvegardé.
6. **Grandes emprises** : rotations, accès aux douze places, coins, ralentissement, plans superposés, transport emballé sur une case, réinstallation et destruction sans place fantôme.
7. **Pot** : construction vide, semis physique, lumière insuffisante, croissance, beauté, mort à 4,5 jours, coupe/resemis, refus d'emballage planté, feu/dégâts et reprise aux trois phases.
8. **Migration** : V89 inchangée avant migration ; besoins à 0,40, mobilier historique normal, recherches et contenus non créés, Crashlanded révision 5 seul préconnu, schémas anciens rejetant les champs futurs.

### Campagne commune

La fixture propre `colony-v89.json.gz` poursuit son histoire avec son carnet et ses accès au froid. La campagne doit acquérir les matières au lieu de les injecter : bois ou blocs pour une chambre, coton ou cuir de chasse et boucherie pour un fauteuil, recherche si le scénario ne connaît pas Mobilier complexe. Elle construit au moins une chambre équipée, un groupe de repas à plusieurs sièges, un poste de travail assis et un pot replanté après sénescence. Elle observe confort, beauté personnelle, nettoyage, alimentation, température, énergie, visite, prison et sépulture sans forcer un événement rare.

Un cycle annuel n'est pas nécessaire : l'horizon doit couvrir plusieurs sommeils, repas, travaux, la pousse et les 4,5 jours de vie de l'hémérocalle, puis une sauvegarde/reprise. Les défauts reprennent au checkpoint réel concerné. Les validations contrôlées de qualité extrême, saturation et destruction restent séparées.

Les mesures distinguent moteur de beauté, oracles et diagnostics. CPU, natif et pilote lourd restent successifs ; les sources servies sont gelées pendant l'UI native. À 100 colons, mesurer séparément mise à jour des besoins, invalidations de pièce et recherche de sièges. Une amélioration n'est recevable que si décisions, ordre, réservations et PRNG restent équivalents.

## Risques à fermer avant implémentation

- **Ledger de beauté incomplet** : chaque sol, trace, ressource, pile, plante et structure actuellement obtenable doit recevoir sa valeur locale vérifiée. Ignorer les stocks ou les traces ferait mentir la pièce et le besoin.
- **Places assises des ateliers** : établir par observation 1.6.4871 quels postes existants utilisent effectivement un siège. La généralisation depuis le seul bureau de recherche est un risque fonctionnel.
- **Matières textiles de construction** : `ConstructionMaterial` ne connaît actuellement que bois, acier et blocs. L'étendre à tissu/cuir doit rester limité au fauteuil et réutiliser les items, réservations, feu et dégâts existants sans ouvrir ces matières à tous les murs ou lits.
- **Qualité partagée** : le générateur de confection est réutilisable, mais la compétence source devient Construction. Un module commun doit préserver la séquence du PRNG et les sauvegardes V72 ; copier la formule risquerait deux implémentations divergentes.
- **Pot emballé** : Core rend le pot minifiable, mais la conservation exacte de la plante pendant ce geste n'est pas établie par les Defs. Le refus explicite tant que la plante existe évite duplication/perte ; toute volonté d'imiter Core plus finement demande une observation ciblée avant codage.
- **Impression prématurée** : les coefficients Core sont connus, mais richesse/espace ne le sont pas pour Lisière. Ne pas afficher une valeur ou un souvenir partiel sous le nom d'impression.

Le lot recommandé est donc fermé à **sept nouvelles familles**, plus la qualité utile des meubles existants, le confort commun, le besoin personnel de beauté et le calcul de beauté de pièce. Il enrichit bois, acier, cinq pierres, coton, chasse/boucherie, recherche, cultures, nettoyage, chambres et repas sans attendre un catalogue final, tout en gardant l'impression et l'art pour une tranche qui peut les rendre entièrement physiques. À l'intégration V90, la beauté de pièce reste un calcul dérivé non exposé dans l'inspection ; seuls repas, lits et bureau de recherche alimentent le confort depuis leur meuble réellement occupé. Les autres ateliers assis restent à compléter.
