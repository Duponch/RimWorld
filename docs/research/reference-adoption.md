# Adoption du référentiel utilisateur

Lecture et décisions : **13 septembre 2026**. Les fichiers de `docs/reference/originals` deviennent notre référence fonctionnelle principale pour développer Lisière, en complément des [recherches précédentes](rimworld-reference.md) et de l'[observation du jeu](visual-reference.md). Ils orientent nos contrats et nos critères de réalisation. Les décisions utilisateur, les observations vérifiées et les mesures du projet continuent de guider leur adaptation.

Cette note conserve les décisions aux dates indiquées. Les états de prototype décrits dans ses sections historiques ne remplacent pas l’[inventaire actuel](../gameplay/implementation-status.md). Les originaux ont été reclassés le 14 septembre dans `docs/reference/originals`, sans modification ; leur [manifeste](../reference/originals/manifest.json) permet de le vérifier.

## Ce qui a été reçu et examiné

| Document | Contenu vérifié | Usage |
|---|---|---|
| [Documentation HTML](../reference/originals/Documentation_developpement.html) | 36 chapitres, huit figures embarquées, 47 sources. | Lecture par domaine et navigation dans les explications. |
| [Documentation PDF](../reference/originals/Documentation_developpement.pdf) | 49 pages ; même rapport que le HTML. Texte comparé et pages structurantes inspectées visuellement. | Lecture paginée et schémas. Ce n'est pas une recherche indépendante du HTML. |
| [Référentiel Excel](../reference/originals/Referentiel_developpement.xlsx) | Neuf feuilles : synthèse, 181 contrats SYS, 95 familles CAT, 227 champs STAT, 52 constantes CONST, 36 commandes UI, 196 propositions TEST, 29 écarts GAP et 47 sources. | Retrouver les contrats, interactions, critères et inconnues du chantier courant. |

Les 227 champs de statistiques ne contiennent pas de valeurs de profils (`Statistiques!G2:G228`). Les contrats sont marqués non évalués et les tests non exécutés. Ces inventaires décrivent le dossier ; ils ne mesurent ni l'exhaustivité de RimWorld, ni l'avancement du prototype. Les originaux sont conservés sans modification.

Le rapport prend RimWorld PC 1.6 comme référence éditoriale. L'[annonce officielle 1.6.4850 du 8 juin 2026](https://ludeon.com/blog/2026/06/update-1-6-4850-released/) a été recontrôlée : elle mentionne notamment des corrections de livraisons, d'obstacles et de cadences. Cela confirme l'annonce, sans certifier la version d'un exemplaire exécuté ni tous les coefficients du dossier. Son miroir de code communautaire cite un assembly `v1.6.9438.38202` dont l'identité avec ce correctif commercial n'est pas établie.

Les marques **R** (comportement relevé dans une source), **P** (proposition de réimplémentation) et **V** (à valider) du chapitre 1 sont conservées lors de la lecture. R reste une affirmation sourcée, avec son niveau de preuve ; elle ne signifie pas « reproduit et vérifié dans Lisière ».

## Décisions qui infléchissent le développement

**G0 reste à fermer ; les interactions élémentaires de survie passent désormais en priorité**, à la demande utilisateur. Le corpus précise la chaîne : définitions et unités → propriété et empreintes → étapes de travail → réservations → transferts → effets → sauvegarde/reprise. Après [la chaîne matérielle](../development/material-logistics.md), [les repas et couchages physiques](../development/needs.md) appliquent ces contrats aux besoins. [ROADMAP](../ROADMAP.md) conserve le calendrier canonique et les éléments encore absents.

| Sujet et référence | Décision du projet | Application ou condition de réexamen |
|---|---|---|
| Définitions/instances, commandes et propriétaire unique ; chap. 2/4/30, SYS-001..010 | **Adopter** les contrats. Un objet a une identité et un seul propriétaire ; les compteurs lisent cet état. UI et IA obtiennent les mêmes raisons de refus. | G0 : petit registre des objets utiles, références validées et résultats de commandes structurés. Pas de moteur de contenu universel construit d'avance. |
| Empreintes, couches et points d'interaction ; chap. 5, SYS-020..022 | **Adopter**, avec notre grille plane. L'occupation ne se déduit pas du mesh. | G0 : lit orienté 1×2, accès de service ; V21 ajoute profils objets/zones, plans sur réserve et retrait conservatif de cellules. [Relecture V21](occupancy-reference.md). Passage et coûts du mobilier restent à compléter ; pièces/toits G2. |
| Travail et logistique ; chap. 9/10, SYS-041..061 | **Adopter** la distinction éligibilité/classement/exécution et les transferts conservatifs. Interrompre libère les engagements futurs, sans annuler ce qui a déjà été livré. | G0 : piles fractionnables, destination réservée, portage distinct de l'inventaire personnel, plan/matériaux/progression/bâtiment. Déconstruction des bâtiments présents livrée en V24 ; V25 ajoute réinstallation de quatre meubles ; logistique des paquets et minage restent ouverts. |
| Priorités et contexte ; chap. 8/9, UI-027, CONST-042..045 | **Adapter** vers 0 désactivé et 1..4 actives, avec départage stable et refus expliqués. L'ordre forcé respecte les contraintes matérielles. | Priorités 0..4 livrées ; V17 ajoute sélection multiple et contexte individuel avec file sur travaux exécutables. Clic droit immobile ouvre le menu ; glissé tourne la caméra, pendant un rectangle il annule. V18 ajoute les fournisseurs de rangement et de livraison : SYS/TEST-048..054 et 056 adoptés pour quantité, dépôt et phases ; ramassage opportuniste et tournée différés explicitement. V19 adopte coupe/déplacement sur chantier et ravitaillement forcés ; SYS/TEST-128 vérifié contre les sources Core, sa source Odyssey ne suffisant pas. V20 adopte cuisine forcée respectant factures/ingrédients et dégagement agricole sans Transport ; SYS/TEST-062..064/067 et 070..075. La file et les références zone/cellule sont adaptées à notre moteur ; portage et exclusivité stricte restent partiels. V23 adopte le maintien sur une cellule pour les fournisseurs présents, sans rayon de voisins, après relecture des chapitres 8/9 et SYS/TEST-031..034/047..050 ; durée adaptée à nos ticks, autres fournisseurs différés. [Relecture V20](cooking-orders-reference.md). [Relecture V19](context-services-reference.md). [Relecture précise et limites](player-orders-reference.md), SYS/TEST-031..034 et 047..050. |
| Temps, faim et statistiques ; chap. 3/4/14, CONST-001..009 | **Vérifier puis adapter** les unités et cadences. Ne pas appliquer une variation par tick sans conversion de durée. | Avant calibration G1 : décider temps logique, journée et nutrition ; documenter conversions/migration. Le prototype reste à 10 Hz, 6 000 ticks/jour et besoins en pourcentage. |
| Régimes alimentaires ; chap. 8/9/14, SYS-077, TEST-077 | **Adopter** les autorisations partagées avant choix, **adapter** les préréglages au catalogue, **différer** provenance et exceptions liées aux systèmes absents. | [Contrat V13](../development/food-policies.md), [vérification récente](food-policies-reference.md). |
| Horaires et sommeil ; chap. 8/9/14, SYS-044/079, UI-026, STAT-069, TEST-044/079 | **Adopter** les 24 intentions et actions physiques ; **adapter** les cadences, **adopter** les premiers loisirs V15 ; **différer** les traits et les autres familles. | [Contrat des horaires](../development/schedules.md) et [loisirs V15](../development/recreation.md) et [recherche des seuils](schedules-reference.md). |
| Navigation ; chap. 21, SYS-113..117 | **Adopter** accessibilité/recherche/suivi, modes d'arrivée, profil de franchissement et révisions. **Adapter** : accès progressif et routes pondérées à la demande livrés sous schéma V13 ; A* et régions restent une proposition à évaluer. | [Contrat et relecture de circulation](../development/spatial-motion-storage.md) : passage civil livré en V14, réservations de service maintenues ; collisions hostiles différées. [Recherche renouvelée](civil-traffic-reference.md). Le laboratoire GPU reste indépendant ; son intégration exige adoption déterministe au tick et rejet des résultats périmés. |
| Génération ; chap. 6/7, SYS-016..019 | **Adapter** les étapes versionnées, contexte de site et validations topologiques. Séparer les flux aléatoires lorsque leur usage le justifie. | Enrichir progressivement le contrat du générateur local. Monde jouable G5 ; aucun globe préalable à G0. Les anciennes cartes sont chargées telles quelles, jamais réparées silencieusement. |
| Interface et 3D ; chap. 8/29, SYS-031..040/172..177 | **Adopter** sélection logique, modes d'entrée et visibilité sans effet sur les règles. **Adapter** métrique, caméra et rendu aux décisions utilisateur. | Maintenir l'organisation RimWorld. Garder caméra orientable, Three/WebGPU/TSL et animation GPU ; dimensions dans `scale.ts`. Des angles de caméra discrets proposés par le rapport ne deviennent pas une contrainte. |
| Combat et santé ; chap. 13..20, SYS-081..112 | **Adopter** corps/capacités et séparation intention, émission, impact, santé. **Vérifier** coefficients, arrondis et comportement de cible mobile avant implémentation. | G3, après logistique et habitat. L'animation reste une présentation ; aucune balistique physique 3D ni munition générique n'est présumée. |
| Narration, quêtes et voyages ; chap. 24..27 | **Adopter** événements distincts des notifications, transactions et récompenses uniques, identité conservée entre propriétaires. | G4 pour histoires/commerce, G5 pour transferts entre cartes. Les sites étrangers peuvent rester abstraits. |
| Extensions, catalogue et outils annoncés ; chap. 28/31/34/35 | **Différer** les extensions après G5 ; **vérifier** les valeurs et annexes manquantes à leur besoin réel. | Jeu de base prioritaire. Aucun catalogue complet ni outil d'export disponible n'est déduit d'une ligne du rapport. |

Notre convention de case de 1 m, humain de 1,75 m et mur de 2,80 m reste un choix de transposition, cohérent avec les réserves des pages 7–9. La taille corporelle logique n'est pas une mesure en mètres (`Statistiques!E98:F98`). Lors de l'adoption, les cartes proposées étaient 32/64/128, défaut 64. Le chantier suivant a corrigé ce défaut de prototype : **250² est désormais jouable par défaut**, 200² disponible, anciennes tailles conservées. Les [comparaisons et mesures](../history/map-scale-v2.md) justifient cette livraison ; les fixtures du dossier ne suffisaient pas à la déclarer acquise.

Le noyau TypeScript dans un worker, les représentations GPU et les frontières de remplacement Rust/WASM restent pertinents. Les modules du rapport sont des responsabilités à respecter ; ils n'imposent ni un port C#, ni un framework ECS généraliste, ni une classe pour chaque ligne du classeur. Réexaminer ces choix sur un coût mesuré ou un besoin concret. Décision persistante : [ADR-011](../development/architecture.md#adr-011--adoption-critique-du-référentiel-utilisateur).

## Relecture de l’environnement après V7

Chapitres 3/6/7/12/29 et SYS-012/016..022/028/070..075/131/172..177 : [audit renouvelé](environment-review.md). **Adapter** le cycle visuel et la caméra 3D ; **adopter comme cible**, sans déclarer livrés, climat, diversité du biome et propriétés des sols/roches/plantes. UI-005 garde les distances logiques inchangées. La croissance à lumière simplifiée devra être révisée avant les semis. La source Odyssey associée à SYS-131 ne suffit pas à définir la météo Core.

## Un seul calendrier, avec traçabilité

[ROADMAP](../ROADMAP.md) est le calendrier canonique ; la [matrice des domaines](../gameplay/systems-matrix.md) en reprend les jalons. Les IDs locaux **S00–S24** sont des domaines ; **S01–S47** dans le corpus sont des sources bibliographiques. Utiliser le préfixe SYS, TEST, UI, CONST, STAT ou GAP du classeur pour éviter toute confusion. Ses priorités P0/P1 ne sont pas nos jalons.

| Jalon et domaines locaux | Entrées utiles du classeur | Scénario à enrichir à mesure de la livraison |
|---|---|---|
| G0 fondations, S00–S01 | SYS-001..010/178..181 ; UI-034 ; TEST-192 | Reprise exacte, refus sans mutation, état cosmétique indépendant. |
| G0 occupation/navigation, S02 | SYS-016..022/113..117 | Empreinte tournée, case de service, corridor modifié, résultat périmé. Régions G2. |
| Interface transversale, S03 | SYS-031..040/172..177 ; UI-001..006/019..021/035..036 | Sélection/commande après rotation, refus expliqué, occlusion visuelle seule. |
| G0 travail, S04 | SYS-041..050 ; UI-011..013/027 | Deux agents, quantités partagées, interruption à chaque transition. |
| G0 logistique/construction, S05–S06 | SYS-005/022/037/051..061 ; UI-013/019..024 | Source fractionnée, destination pleine/détruite, filtre changé, livraison et sauvegarde. |
| G1 besoins/politiques, S07–S08 | SYS-026..027/039/044/076..080 ; UI-016/026 ; TEST-189 | Ingestion réelle, lit inaccessible, horaire distinct du besoin ; nombres adaptés aux unités. |
| G1 agriculture/cuisine, S09 | SYS-062..067/070..075 ; UI-021/025 | Ingrédients admissibles, croissance favorable, récolte et coupe distinctes. |
| G2 habitat/environnement, S10–S12/S16 | SYS-023..025/028/126..131 | Scène E : pièces, portes, réseaux, chauffage et feu ; blessures G3. |
| G3 personnes, S13–S14/S19 | SYS-081..097/148..150 ; UI-017..018/028 | Soins interrompus, capacités, pensées et opinions dirigées. Recrutement/factions G4. |
| G3 combat, S15 | SYS-035..036/098..112/118..120 ; UI-007..011 ; TEST-182..188/190..191/193 | Scène B, branches du modèle choisi et distributions ; aucun coefficient adopté par défaut. |
| G3 faune, S18 | SYS-121..125 ; services partagés besoins/santé | Régime, prédation, enclos, reproduction, charge représentative. |
| G4 progression, S17/S20/S21 | SYS-013/062..069/132..137/145..147 ; UI-032..033 ; TEST-194 | Incident admissible, récompense unique, recette/recherche persistante, commerce atomique. |
| G5 monde/objectifs, S22–S23 | SYS-011..015/136..144 ; UI-029..031 ; CAT-052 | Scène D : propriété entre cartes et caravane. L'objectif final original reste à concevoir. |
| Après G5, S24 | SYS-029..030/151..171 | Modules choisis ultérieurement. TEST-195 concerne un croisement de DLC ; TEST-196 une régression de pont d'un correctif, à qualifier séparément. |

Les huit étapes du chapitre 33 se répartissent ainsi : 1–2 et la logistique de 3 vers G0 ; production/cultures de 3 et besoins de 4 vers G1 ; habitat de 7 vers G2 ; santé/social de 4 et combat de 5 vers G3 ; narration/factions de 6 vers G4, voyages de 6 vers G5 ; extensions de 7 après G5. La couverture du contenu et la 3D de l'étape 8 progressent avec chaque domaine, puis se consolident en G5. Elles ne sont pas une raison de reporter l'observation graphique à la fin.

## Réserves et errata conservés hors des originaux

- **Tests proposés, pas exécutés.** TEST-001..181 reproduisent les fiches SYS correspondantes : configuration issue du nom/module, action reprenant le contrat et résultat reprenant le cas critique. La comparaison a été faite cellule par cellule. Ce sont des critères à transformer en assertions métier dans nos familles F1–F5, pas 181 scénarios profonds prêts à coder. Les 15 propositions suivantes sont plus précises, mais parfois synthétiques ou propres à un DLC/correctif. Voir [leur intégration à la stratégie de tests](../development/testing.md#exploiter-les-scénarios-du-référentiel).
- **Provenance numérique à confirmer.** Les 52 constantes renvoient au miroir décompilé. Des sources de champs sont trop larges : `Statistiques!H59:I74` cite la faim pour repos/social/politiques ; `H204:I228` cite Odyssey pour des notions dont honneur, gènes, recrutement et richesse. Retrouver la source du comportement réellement adopté, avec version et unités, avant de qualifier un nombre de vérifié.
- **Erratum RNG.** Figure 7, PDF page 29 et SVG HTML : le renvoi S19 désigne ArmorUtility ; le texte RNG renvoie à S22, Rand. Conserver cette correction dans notre lecture. Nos flux RNG par domaine restent une proposition d'architecture, sans promesse de séquence identique à RimWorld.
- **Annexes absentes.** Les chapitres 31/35 (PDF pages 38/42), `Synthese!A18/A21` et GAP-029 annoncent Markdown, données, scripts Python et squelette C#. Ils ne sont pas parmi les trois fichiers reçus. Les huit figures sont disponibles dans HTML/PDF, mais pas comme fichiers SVG séparés. Ne pas dépendre de ces outils ni les déclarer exécutés.
- **Couverture ouverte.** Chapitre 34 et feuille Ecarts : catalogue résolu, navigation exacte, génération identique, variantes numériques, UI exhaustive et combinaisons de DLC restent à établir. Ces inconnues limitent nos affirmations de fidélité ; elles ne bloquent pas la construction autonome du socle.

## Routine pour le prochain développeur

Avant de modifier un domaine, lire son chapitre et les SYS/UI/TEST concernés, puis regarder la règle actuellement livrée dans le guide et le code. Noter dans le document du domaine : référence, comportement visé, décision adopter/adapter/différer/vérifier, justification, preuve disponible et condition de réexamen. Une entrée inconnue conserve son statut jusqu'à observation ou vérification de source.

Implémenter une tranche avec ses effets réels, enrichir les scénarios existants selon le risque, puis actualiser guide joueur, architecture, ROADMAP et preuves. Ne pas marquer une fonctionnalité livrée depuis une description du corpus. Une divergence motivée reste une décision de conception possible ; les contrats de conservation, de reprise et d'explication doivent rendre ses conséquences visibles et vérifiables.

## Vérification ciblée du mobilier et des repas — 13 septembre 2026

La [recherche repas/confort](dining-reference.md) corrige les généralisations sur le rayon de table, l’origine après prélèvement et l’orientation du siège. Le [contrat local](../development/dining.md) ajoute la réservation et la marche à la place avant ingestion, distingue confort et souvenir, et expose passabilité 3D et paramètres à confirmer. Chapitres 5/10/14, SYS-076..080, UI-016/026 et TEST-189 restent des références de domaine, pas une affirmation de couverture totale. Les fichiers utilisateur originaux restent inchangés.

## Relecture collecte et partie longue — 13 septembre 2026

[Partie représentative et écarts](colony-progression.md) reprend chap. 9/10/14/30/32, SYS-041..061/076..080 et UI-013/019..026. Le pilote confronte commandes et bilans sur plusieurs jours ; il ne certifie pas notre calibration économique. La disparition des buissons est désormais un écart prioritaire explicite. La présentation conserve ses buffers et n’a aucune autorité sur la matière.

## Complément : catalogue, équipement et alimentation V5

Les chapitres 1/4/11/31/34 n’apportent pas un catalogue individuel exhaustif ni un manifeste de version ; [couverture vérifiée](../gameplay/content-catalogue.md). Les chapitres 2/8/13/20/29, SYS-055, UI-014/015 et CAT-034..037 sont adoptés comme contrat d’inventaire/équipement ; la synchronisation des portraits est explicitée dans [character-presentation.md](../development/character-presentation.md), encore prévue.

CAT-005/011/015, SYS-076..078 et TEST-076..078 orientent les [aliments V5](../development/food-items.md). Adoption des quantités et de la nutrition, adaptation du temps à 10 Hz et maintien explicite des anciens profils ; préférences complètes, agriculture et conservation différées. Les arrondis et facteurs contextuels ont été revérifiés ; le nombre de tests du corpus ne définit pas celui de notre suite.

## Mise à jour spatiale V6

Le [contrat sol, mouvement et rendu distant](../development/spatial-motion-storage.md) remplace les descriptions antérieures de piles multiples au sol et du BFS cardinal. La migration V5→V6 est explicite ; le comportement des buissons reste un chantier ouvert.

## Suivi V7 : plantes et présentation rocheuse

Chapitre 12 / SYS-071, SYS-072, SYS-075 : croissance, maturité, récolte distincte de coupe et fertilité adoptées pour le buisson sauvage ; climat et autres espèces différés. [Recherche critique](plant-growth.md) et [contrat](../development/rocks-and-plants.md). SYS-072 ne signifie pas que toute coupe donne zéro ressource : la vérification du travail commun confirme le rendement possible avant destruction. Chapitres 5/29 : empreinte logique inchangée, rochers facettés et surfaces partagées adaptés à la 3D ; tests existants de rétention enrichis.

## V10 : première production alimentaire

Chapitre 11/32, SYS-062..064, TEST-062..064, UI-025 et scène A : [recherche cuisine/combustible](cooking-reference.md), [contrat](../development/cooking.md). Adopter rassemblement physique, transformation transactionnelle, modes/ordre des factures et reprise exacte ; adapter l’horloge, le réservoir entier et la place de service 3D. Différer les paramètres avancés de facture, autres recettes, ouvrages persistants, compétences, intoxication et conservation. SYS-065..067 ne sont pas clôturés. La distinction produit inachevé/travail actif corrige une lecture trop générale du corpus : chaque recette a son contrat d’interruption.

## V15 : loisirs physiques

Chapitre 14, SYS-080/TEST-080, STAT-060/061, CAT-050 et UI-026 : [vérification récente](recreation-reference.md), [contrat](../development/recreation.md). Adopter activité physique, accès, choix pondéré, satisfaction et lassitude avec hystérésis ; adapter cadence et recherche locale de place, conserver les attentes extrêmement basses comme profil provisoire. Différer familles restantes, richesse, pièces, météo et compétences. Les renvois STAT vers Need_Food ne prouvent pas les règles de Need_Joy ; la divergence 2/3 contre 0,65 est consignée. F1/F2/F3 enrichis, aucune suite créée automatiquement par ligne du corpus.

## V16 : plans, cadres et dégagement

Chapitre 10, **SYS-056/TEST-056**, avec SYS-005/020..022/051/053/054 : **adopter** intention, livraison, finition et dégagement physique ; **adapter** navigation et protection des volumes en 3D ; **différer** coexistences riches, minage, réparation, remplacement et réinstallation (SYS-057..061). [Relecture de plusieurs sources](construction-reference.md) : le blocage immédiat des plans était un écart, corrigé. Les 14 ticks Core d’entrée dans un cadre sont convertis à l’horloge locale sans certifier toutes les vitesses. [Contrat et migration](../development/construction.md).

V22 — chapitres 5/21, SYS-020..022 et SYS-113..117 : [nouvelle recherche mobilier](furniture-travel-reference.md). Adopter distinction transit/arrêt, suppléments et non-répétition ; adapter volumes GPU et recherche déterministe ; différer autres profils et coûts environnementaux. Les TEST associés enrichissent l’oracle spatial, les portages, services et reprises existants. Les anciennes valeurs XML 2018 ne prévalent pas sur les fiches actuelles sans vérification.

## Adoption V24 — retrait des ouvrages

Chapitre 10, **SYS-058 / TEST-058** : **adopter** travail/récupération sans double remboursement ; **adapter** réservations à nos usages actuels, placement connecté et refus conservatif si le sol est saturé. **Vérifier** via [recherche fraîche](deconstruction-reference.md), miroir épinglé et wiki. **Différer** SYS-057 réparation, SYS-059 réinstallation, SYS-060 remplacement et SYS-061 minage ; ni catalogue complet ni calibration des compétences ne sont implicites. Les scénarios existants de construction/colonie sont enrichis et quatre scénarios ciblés couvrent les transitions du retrait. Les statuts du corpus ne valent toujours pas résultat local.

## Adoption V25 — objets installés conservés

Chapitre 10, **SYS-059 / TEST-059** : **adopter** identité, retrait, transport, rotation et pose ; **adapter** contact 3D et cadence du retrait ; **vérifier** la chaîne exécutée, pas seulement le WorkTotal affiché. [Recherche fraîche](furniture-transfer-reference.md) et [contrat](../development/furniture-transfer.md). **Différer** Transport seul, rangement/dégagement automatiques des paquets, qualité, dégâts et catalogue complet. Les mentions « réinstallation différée » des décisions V16/V24 ci-dessus décrivent leur périmètre historique, remplacé pour ces quatre meubles par V25.

## Adoption V26 — logistique des objets entiers

Chapitre 10, **SYS/TEST-051..054 et SYS/TEST-059** : **adopter** rangement filtré, meilleure priorité, dégagement proche et réinstallation par Transport ; **adapter** recherche déterministe et contact 3D ; **différer** propriétés/filtres détaillés, étagères, interdictions et reste du catalogue. [Nouvelle recherche](furniture-logistics-reference.md) : le dégagement ne recherche pas d'abord la meilleure réserve distante ; restriction locale des filtres de dépôt explicitée. [Contrat](../development/furniture-logistics.md). Remplace les limites de fournisseurs/logistique V25 ci-dessus. Les scénarios de propriété/ordres et le pilote existant sont enrichis ; le paquet ne crée ni matériau ni inventaire personnel.

## V27 — régions géologiques

Chapitres 5–7/10/29 ; **SYS/TEST-016..019/061, CAT-059/060** : adopter les cinq types Core et la distinction des produits ; adapter le choix du site et les champs régionaux ; différer sols révélés, minage, minerais, toit et taille. [Relecture précise](geology-reference.md). Les identités seules ne satisfont ni SYS-061 ni son test de support de toit. Les métadonnées historiques absentes restent absentes.

## V28 — minage, sol brut et produits

Chapitres 5–7/10/21/29, **SYS/TEST-061**, **CAT-059/060**, logistique **SYS/TEST-051..054** : adopter accès, dégât persistant, produit typé et demande de transport ; adapter la cadence locale, les anciennes roches et le dépôt conservatif ; différer minerais, taille, sous-sols, toits/effondrements. [Recherche fraîche](mining-reference.md), [contrat](../development/mining.md). Le test de support de toit du corpus reste non exécuté. Les scénarios existants de colonie et de navigation sont enrichis ; les statuts du corpus ne valent pas validation locale.
