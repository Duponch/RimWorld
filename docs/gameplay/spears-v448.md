# V448 — Lances dans les six matières

État : **publiée ; qualification ciblée, présentation et parcours natif acquis par reprises**. Schéma 272. Typage/build, paquet et disponibilité HTTPS vérifiés. Aucun gain FPS, catalogue de mêlée complet ou achèvement d’ensemble annoncé.

## Résultat joueur et périmètre

La recherche existante **Lames longues, 400 points après Forge**, ouvre la fabrication des lances aux deux forges existantes. Un artisan de niveau **4** apporte **75 unités homogènes** de bois, acier, plastacier ou uranium, ou **750 unités d’argent ou d’or**, puis commence un ouvrage identifiable. Auteur, matière, reçus, facture et progression survivent à l’interruption et à la recharge. La finition produit une seule arme avec sa qualité et son état, à ranger puis équiper par les circuits physiques existants.

Lames longues reste recherchable au bureau ordinaire ; aucune recherche supplémentaire n’est ajoutée pour la lance. L’emplacement d’artisanat et l’atelier d’usinage ne proposent pas cette recette. Les six variantes portent le catalogue local de 16 à **22 identités d’armes**, avec **35 projets de recherche inchangés**. Ces comptes ne mesurent pas la complétion de l’ensemble 2.

## Référence, provenance et décisions

Référence primaire locale relue le **21 octobre 2026 : RimWorld Core 1.6.4871 rev590**, installation `E:/Steam/steamapps/common/RimWorld/`. SHA-256 frais de `RimWorldWin64_Data/Managed/Assembly-CSharp.dll` : `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. Les empreintes des XML et la distinction entre valeurs lues et calculées sont conservées dans le relevé privé `tmp/spear-v448/reference.md`.

La lance est définie dans **MeleeNeolithic.xml**, avec héritage de **BaseMeleeWeapon_Sharp_Quality**, et non dans MeleeMedieval.xml. Les lectures couvrent aussi ce dernier, BaseWeapons, Stuff, ouvrages, postes, recherche, manœuvres, dégâts et fusion. La méthode **AdjustedArmorPenetration** a été relue fraîchement dans l’assemblage identifié ; les autres calculs réutilisent les autorités déjà relevées pour les [épées V446](longswords-v446.md). Aucun code ni asset propriétaire n’est intégré au produit.

La recherche Internet primaire réutilise l’[annonce officielle Ludeon du 12 octobre 2026](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/), relue le 21 octobre : branche principale 1.6 et bêta instable 1.7 restent distinctes. Cette annonce ne fournit pas les constantes de la lance ; celles-ci proviennent du Core local identifié. Le dernier numéro public exact distribué par Steam reste non attesté. Les discussions et le wiki ne remplacent pas cette autorité numérique.

Le [corpus humain](../research/reference-adoption.md), son [document original](../reference/originals/Documentation_developpement.html) et son [référentiel original](../reference/originals/Referentiel_developpement.xlsx) restent préservés. Par continuité V444–446 : chapitres 11/20/29 ; **SYS/TEST-062..066/068, UI-025** pour production ; **SYS/TEST-055, UI-014** pour équipement ; **SYS/TEST-085/089..091/098..117, UI-009/010** pour contact et mêlée. Adopter matières, auteur, qualité, propriétaires et règles d’armure vérifiées ; adapter cadence, métier commun et représentation originale ; différer les familles absentes. Aucun identifiant global du corpus n’est clos par ce lot.

## Matières et fabrication

Le coût nominal Core est **75 Stuff**, le travail **12 000 ticks Core** avant matière. Argent et or ont un volume unitaire de **0,1**, d’où 750 unités physiques. Les catégories Metallic et Woody admettent exactement les six matières ci-dessous dans ce périmètre Core ; jade et blocs Stony restent exclus. Le filtre initial autorise acier, plastacier et uranium ; bois, argent et or sont désactivés mais activables.

| Matière | Unités physiques | Travail Core | Travail local nominal | PV maximum | Inflammabilité |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bois | 75 | 8 400 | 840 | 65 | 1 |
| Acier | 75 | 12 000 | 1 200 | 100 | 0,4 |
| Plastacier | 75 | 26 400 | 2 640 | 280 | 0 |
| Uranium | 75 | 22 800 | 2 280 | 250 | 0 |
| Argent | 750 | 12 000 | 1 200 | 70 | 0,4 |
| Or | 750 | 10 800 | 1 080 | 60 | 0,4 |

Les durées précèdent capacités, poste, environnement et interruptions. L’horloge locale représente **dix ticks Core par tick local** ; ce changement de représentation ne doit pas appliquer deux fois un facteur de vitesse. GeneralLaborSpeed et Crafting sont les autorités Core. La priorité locale commune **Artisanat**, y compris pour le combustible de forge, demeure une adaptation déclarée du découpage des métiers.

Chaque lance pèse **2 kg**, quelle que soit sa matière ; la qualité ne multiplie pas les PV maximum. La recette `make-spear` et l’ouvrage `unfinished-spear` doivent réutiliser le domaine de forge : même auteur, reçus réels, progression et tirage final unique de qualité. Plusieurs matières autorisées dans le filtre ne peuvent pas être mélangées pour payer un seul ouvrage. Annuler rembourse 75 % de chaque reçu avec l’arrondi existant ; une destruction ordinaire ne constitue pas cette annulation.

## Mêlée, pointe et cadence

Deux outils Core produisent **trois verbes physiques** : le manche offre **Blunt et Poke**, puissance de base **13** ; la pointe offre **Stab**, puissance **23**. Les trois ont un délai de base de **2,6 secondes**. La lance ne possède aucun outil de lame Cut. Poke utilise la catégorie d’armure contondante malgré son traitement anatomique de coup interne ; la pointe Stab utilise la catégorie tranchante.

| Matière | Facteur contondant | Facteur tranchant | Délai avant arrondi Core |
| --- | ---: | ---: | ---: |
| Bois | 0,9 | 0,4 | 2,6 s |
| Acier | 1 | 1 | 2,6 s |
| Plastacier | 0,9 | 1,1 | 2,08 s |
| Uranium | 1,5 | 1,1 | 2,86 s |
| Argent | 1 | 0,85 | 2,6 s |
| Or | 1 | 0,75 | 2,6 s |

Le dégât combine puissance, facteur de matière approprié, qualité et facteurs d’attaquant déjà représentés. La **pointe possède une pénétration explicite de 0,50**, multipliée par le multiplicateur de dégâts de l’arme : dans ce contrat, la qualité. **Le facteur tranchant de matière et les facteurs de dégâts de l’attaquant ne multiplient pas cette AP explicite.** La pointe Normal a donc 50 % de pénétration dans les six matières, même si son dégât varie. Pour les qualités Déplorable à Légendaire, l’AP pointe vaut **40 / 45 / 50 / 55 / 60 / 72,5 / 82,5 %**. Elle ne se déduit pas du dégât arrondi de l’impact.

Les deux verbes du manche n’ont pas d’AP explicite : leur pénétration est **dégât ajusté × 0,015**, comme dans la branche implicite existante. Les valeurs décimales, les tirages, l’armure et les lésions restent distincts ; aucun DPS garanti ou égalité bit à bit avec le moteur Core n’est annoncé.

La conversion native secondes → ticks Core arrondit la récupération au tick entier : base **156 Core**, plastacier **125** après 124,8, uranium **172** après 171,6. La cadence et les poses locales doivent suivre cette récupération confirmée, avec sa matière et son verbe capturés ; retirer ou changer l’arme ne doit pas recalculer une récupération déjà engagée. Le contact existant est conservé : la lance n’ajoute pas une portée à deux cases.

## Récupération, économie et conservation

La fusion métallique rend **25 % du coût physique**, avec arrondi stochastique : **18 ou 19 unités** d’acier/plastacier/uranium, **187 ou 188 unités** d’argent/or. Qualité et usure n’en modifient pas le rendement. Le bois ne fond pas. Inflammabilité physique et recette de brûlage sont distinctes ; le brûlage des armes par facture reste différé dans ce lot.

Le prix de base additionne coût physique des matières et travail Core × 0,0036 : bois **120,24**, acier **185,7**, plastacier **770,04**, uranium **532,08**, argent **793,2**, or **7 538,88**, avant qualité, usure et finalisation. Ne pas arrondir ces bases avant qualité/usure. Les modificateurs et plafonds de qualité, la courbe de PV, l’arrondi de marché et le prix effectif de transaction réutilisent les chemins économiques existants. Aucun assortiment marchand ou équipement PNJ supplémentaire ne se déduit de l’ajout de ces armes ; les producteurs de PNJ gardent leur adaptation provisoire.

Le schéma **272** valide strictement **271 avant migration du seul numéro**. Aucune lance, recherche, facture, matière, progression, permission ou consommation de PRNG rétroactive. Le contrat doit couvrir armes finies, recette, ouvrage, reçus, outils capturés, filtres et pertes dans leurs propriétaires réels : cartes, voyages, caissons, archives et voies publiques/checkpoint/delta. Les résultats des [caissons V447](cryptosleep-v447.md), des anciennes armes et de leurs migrations restent des acquis historiques séparés ; ils ne prouvent pas la qualification de la lance.

## Présentation et coûts

Le choix retenu réutilise **le rig original commun, le lot résident d’armes et l’atlas de cargaison**, avec une forme de lance originale partagée entre six pigments et un ouvrage simplifié. Les trois verbes alimentent les gestes et ombres existants depuis le tick confirmé. Aucun asset Core n’est repris et aucun rig autonome n’est créé pour chaque arme ou personnage.

Cette réutilisation concerne un chemin de rendu déjà partagé ; elle n’implique pas un coût nul. Le rig ordinaire reste à **3 190 sommets** ; le premier port de lance active une extension commune de **252 sommets**, soit **3 442** pour la lance seule et **4 404** avec les trois familles antérieures. Les six pigments partagent cette extension ; le nombre de meshes et les attributs d’instances restent conservés dans les deux ordres d’extension contrôlés. Ces comptes structurels ne mesurent ni le temps du premier port ni le coût GPU général ; aucune mesure de mémoire ou de gain FPS n’en est déduite. Les captures de propriétaire et valeurs de matière doivent rester bornées aux transitions utiles ; aucun nouveau parcours de terrain ou calcul métier par image n’est requis par le contrat. **Aucun relevé FPS/GPU V448 n’est acquis ici**, et les mesures historiques V446 ou des Forges ne sont pas attribuées à ce lot.

## Qualification et livraison

**124 cas distincts acquis sur 126 sélectionnés, dans 17 fichiers, par reprises.** La passe groupée dure **220,353 s** : 123 verts, un nouveau rouge d’oracle de test et deux anciens rouges. Les nouveaux chemins de production, migration, récupération et présentation passent ; les six matières sont réellement transportées, travaillées, interrompues, rechargées, rangées et équipées depuis des apports finis déclarés. La forge à combustible sépare son bois brûlé de la matière de l’ouvrage. Les deux dépôts partiels de fusion rejouent acier et argent avec les mêmes objets et tirages.

Le nouveau rouge bois/médiocre supposait à tort que les poids bruts totalisaient toujours 1. Dans ce cas, cinq outils sont dans la catégorie supérieure et aucun dans la catégorie intermédiaire : le total brut est 0,75 et le sélecteur utilise déjà ce total. **Seul le test est corrigé**, avec cinq quantiles et les cinq outils sélectionnables contrôlés ; reprise de ce seul cas acquise en **11,063 s**, sans modification du combat commun. Le premier typage rouge en **13,869 s**, sur une affectation de version dans le fichier de test de combat, reste également conservé ; la vue historique est désormais indépendante.

Les deux anciens échecs de `tests/melee.test.ts` sont conservés : « V58 migration… » échoue avec **Invalid historical map registry**, et « thirty actors… » avec **Deterioration interval was skipped**. Le même fichier sur les sources exactes V447/HEAD précédent reproduit les mêmes deux erreurs, avec six verts, en **13,073 s** ; aucune régression V448 ne leur est attribuée. Journaux sous `tmp/validation-runs/v448-targeted-…`, `v448-wood-weight-reprise-…` et `v448-baseline-melee-…`. Aucun total de réussite de la suite entière n’est annoncé.

Les trois témoins271 sont reconstruits après migration ordinaire des payloads publics Forges/Aulnes/Éclaircies, puis validés strictement avant passage du seul numéro : ce ne sont pas des archives natives V447 nouvellement collectées. Les anciennes armes, reçus et recherches restent exacts ; aucun stock, droit ou PRNG n’est créé. Les rejets prospectifs couvrent vrais propriétaires, filtres même faux, transport public/checkpoint/delta et carte temporaire inactive. La mutation `bombWaves` est une enveloppe volontairement invalide pour exercer la frontière, pas une explosion jouée. Les voisins V447 rejouent aussi les mêmes personnes et horloges, dont l’anesthésie en caravane et le vrai retrait de carte avec arbre dans un holder.

**Parcours natif acquis en 73,656 s**, Chrome **155.0.8059.85/WebGPU**, 1440×1000, **2 124 sources servies gelées**. Il reprend l’ouvrage198 réellement travaillé à 95 % au3758, auteur168, poste184, 75acier. La cible alliée199 est préparée explicitement, avec nouveau corps/identifiant et sans biens ; aucun coup ou produit n’est préparé. Les vrais contrôles de facture vérifient les trois matières actives et le retrait de la facture ajoutée ; l’export entier reste exact hors identifiant retiré.

La même fabrication produit la lance201, **médiocre/100PV**, rangée au3872 en23,6 puis portée au3874 sans changement d’état. Un vrai ordre confirme **steel-spear-shaft-poke**, impact38865Core, récupération jusqu’à39021Core, et une contusion réelle de la jambe gauche de la cible. Le monde entier est exporté puis rechargé exactement au3887. Les **61 échantillons sur256,2ms** conservent un seul rig3442 et le tick3887 ; l’export entier après images de pause reste égal. La pointe/AP et les deux autres verbes sont qualifiés par les cas CPU, pas par une attaque native prétendue dans ce parcours. Captures de port et d’impact inspectées. Rapport : `tmp/spear-v448/native-ui/2026-10-21T18-36-17-723Z/` ; préparation privée12,079s, hors124cas produit.

Les réglages effets et musique sont **false avant import et après recharge** ; Chrome est lancé avec `--mute-audio`. Aucune erreur GPU capturée. **Deux notifications ResizeObserver** sont conservées dans `tmp/spear-v448/vite-error.log`, à20:36:57 et20:36:58. La liste finale du pilote est vide après navigation et ne prouve donc pas leur absence sur toute la session ; aucune cause ni innocuité n’est affirmée.

La première préparation de présentation commune échoue en **39,116 s** : ROOT avait fourni l’URL du menu ordinaire sans `e2e`, alors que le pilote attend `__lisiere`, exposé seulement dans ce mode. Aucun temps de gameplay n’est qualifié par cet essai. Reprise avec l’URL de test correcte, mêmes sources gelées, **acquise en162,895s** : 45secondes de minage puis45 d’abattage, départ250²/trois colons, vitesses1/6/1/3. Aucun saut, excès continu ou occupation rocheuse dans ces fenêtres. Intervalles image p50/p95/p99/max : minage **4,2/4,3/8,4/33,2ms**, abattage **4,2/4,3/8,4/45,9ms**. Rapport `tmp/test-runs/v448-presentation-reprise-2026-10-21T18-39-06.100Z-10308/artifacts/harvest-sync-verification.json`. Contrôle de synchronisation seulement : ni comparaison V447 ni mesure des Forges ou du débit×6 général. Deux réglages audiofalse, Chrome muet.

**Build Pages incluant typage acquis en18,501s** après le gel final. Les2 124 empreintes sources restent exactes après les deux contrôles natifs ; serveur ROOT5173 et navigateurs de contrôle arrêtés. Aucun changement des préférences audio publiées.

Stockage : trois seuls anciens caches SSR compilés, fermés et reconstruisibles du19octobre sont supprimés après vérification de leurs chemins absolus, signature générée et absence de contrôle actif : **135 995 005octets /6100fichiers**. Reçu `tmp/spear-v448/removed-compile-caches.json`. Sources, sauvegardes, captures, journaux, conversations et dossier humain `references_UI/` conservés.

Périmètre prévu : apports finis et vrais contacts aux deux forges, six matières et filtre initial, refus de mélange/pénurie/interdiction, auteur et ouvrage après interruption/recharge, produit unique avec qualité, rangement/port du même identifiant, trois verbes et AP explicite/implicite, changement d’arme pendant récupération, fusion et dépôts partiels, migration neutre et refus des marqueurs futurs dans les vrais propriétaires. Une préparation de poste, connaissances, compétences ou stocks doit être déclarée ; elle ne vaut pas acquisition naturelle ni campagne durable.

ROOT conduit seul les contrôles lourds successifs et gèle les sources servies avant le navigateur. Le court parcours doit partir d’un ouvrage réellement travaillé puis finir, ranger, équiper et utiliser la même lance ; toute cible préparée est déclarée. **Effets sonores et musique coupés avant chaque lancement ou reprise ; navigateur de contrôle muet.** Les réglages publiés des joueurs ne sont pas modifiés.

Le catalogue complet de mêlée, les autres matières de couteaux, le brûlage par recette, les inspirations/styles/reliques et les extensions restent ouverts ou hors périmètre. La lance ne livre aucun vaisseau ni victoire. **L’ensemble 2 reste principal ; les six ensembles, les campagnes durables et la cible de fluidité en charge ne sont pas clos.** Le [plan de complétion Core](../development/core-completion-plan-20261020.md) reste la référence.

## Livraison

Produit sélectionné et poussé sur `origin/main` : **`6fda9dfe5c355b86c5570811acef197dfcc2c3d2`**. Paquet acquis en **1,812s**, `tmp/elsewhere-pages/v448-package-AkQ4An/` : **552fichiers, dont550actifs, 152 200 531octets**. Les71chemins publics de catalogue/sauvegarde et68fiches restent exacts. Tous les actifs statiques et la feuille compilée sont identiques à V447 ; seule l’entréeHTML et les trois bundles JavaScript changent. Les actifs/source de contrôle et le dossier humain `references_UI/` sont absents du paquet.

Déploiement acquis en **20,763s** : [version091ef9cb](https://091ef9cb.elsewhere-cq7.pages.dev), [site principal](https://elsewhere-cq7.pages.dev). Quatre actifs téléversés,546déjà présents ; l’avertissement de répertoire non propre correspond au seul dossier humain non suivi, conservé hors commit et paquet. **20réponses HTTPS exactes en8,194s**, dix chemins sur chacune des deux origines : entrée, CSS, favicon, bundle, deuxworkers, catalogue et deuxicônes de forge. Rapport `tmp/elsewhere-pages/v448-http-Dz3Yj3/`. Ce contrôle atteste disponibilité, octets et MIME, sans prétendre rejouer le gameplay distant ; l’intégralité des sauvegardes est contrôlée localement.

Les documents de livraison seuls sont actualisés après publication, sans recompiler le produit. Contrôle documentaire : **1 079documents,10 027liens**, six en-têtes courants272, trois originaux du corpus strictement identiques. Le gel de2 124sources reste exact ; sauvegardes, historiques et préférences des joueurs sont conservés.

Ce lot est clos dans sa portée déclarée ; **l’ensemble2 et les six ensembles restent ouverts**. Le prochain relevé préparatoire porte sur les glaives, après **Forge** déjà existante, et ne constitue pas une fonction livrée.
