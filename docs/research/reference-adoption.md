# Adoption du référentiel utilisateur

V60 — chapitres 16–21, SYS/TEST-035, 098..107, 110..112, UI-009/010 relus dans les originaux HTML/XLSX : **adopter** tir libre à l’arrêt, trois réactions civiles, priorité des ordres et cible pondérée ; **adapter** cadence locale, cône sur grille et approche physique ; **différer** réveil défensif, autres armes, poursuite/postes ennemis et raids. [Recherche fraîche](automatic-combat-reference.md). Aucun domaine global déclaré conforme ou terminé.

V59 — chap. 13–15/20–21, SYS/TEST-085/089..091/098..112/113..117, UI-009/010 : adopter outils naturels/arme, contact, toucher puis esquive, conséquences anatomiques ; adapter horloge/poses GPU et arrêt continu en 3D ; différer catalogue militaire, terrain offensif, surprise, armure et tactique générale. [Recherche fraîche et désaccords de sources](melee-reference.md). Durée du stun calibrée, pas certifiée.

V58 — chap. 17/20/21 relus directement dans l’original HTML ; SYS/TEST-035, 098..107, 111..117, UI-007..011 : **adopter** appartenance distincte, permissions, collision hostile, réponse Fuir/Ignorer et tirs anatomiques ; **adapter** refuge déterministe, extrémités 3D et sentinelle de scénario ; **différer** mêlée, poursuite, réaction Attaquer, diplomatie et raids. [Recherche fraîche](encounter-reference.md). Aucun SYS global fermé.

V57 — chapitres 16/19/20/21 relus (chronologie, impacts, coûts dynamiques), SYS/TEST-099..107 et 111..117, UI-009/010 : **adopter** ralentissement temporaire et continuation ; **adapter** trajectoire 3D par morceaux sans changer le passé ; **différer** autres corps, hostilité, réactions et armures. [Sources et bornes corrigées](stagger-reference.md). Aucun statut de famille du corpus déclaré validé globalement.

V56 — chapitres 13/17–20, SYS/TEST-085/099..107/111..112, UI-009/010 : [tir dirigé revérifié](shooting-reference.md), [contrat](../development/shooting.md). Adopter cycle et XP/conséquence distincts ; adapter fractions Core, ordre simultané et poses 3D ; différer hostilité, réactions, armures et jauges ; pouvoir d’arrêt repris en V57. Les entrées V53–V55 suivantes conservent la décision de leur lot ; leurs anciennes absences de commande/XP/rendu sont remplacées par cet état V56.

Projectile sous V54 — chapitres 17–19, SYS/TEST-099..107/111..112 : [branches et contacts revérifiés](projectiles-reference.md), [noyau isolé](../development/projectiles.md). Adopter cible/couvert/raté, identité de cible mobile et branches distinctes d'interception ; adapter sous-pas Core, PRNG et masque de bits ; ajouter la capture des cibles actuelles sous V54 avec recouvrement de toute l'empreinte et exclusion du portage. V55 conserve désormais vols/arrivées dans World et les snapshots ; relations copiées sans factions livrées. Différer phases du tireur, UI-009/010, dépouilles et adversaire. Neuf scénarios de noyau et cinq de scène ne ferment pas les SYS/TEST de combat.

Décor sous V54 — chapitres 5/10/18/19, SYS/TEST-061/102/103/106/119 : [remplissages et visibilité revérifiés](combat-world-reference.md), [capture World](../development/combat-world.md). Adopter les valeurs, le plus grand remplissage et l'état logique des portes ; adapter égalités par identifiant et cailloux décoratifs sans couvert ; capturer les candidats actuels dans projectile-world ; différer les dégâts au décor et dépouilles. Pas de tir joueur ni de SYS clos.

V54 — chapitres 15/19/20, SYS/TEST-089..091/105/111..112 : [impact Bullet revérifié](bullet-impact-reference.md), [producteur et migration](../development/bullet-impact.md). Adopter pondération anatomique, préservation extérieure, propagation et Gunshot ; adapter transaction au tick et PRNG local ; différer armures, difficulté personnalisée, déclencheur/vol et réactions. Scènes médicales et UI ne valident pas encore une attaque joueur.

Socle de requêtes sous V53 — chapitres 17/18, SYS/TEST-098/101..103/106/119 : règles de ligne, penchement, couvert et rapport adoptées dans [deux modules isolés](../development/combat-queries.md), testées par oracle et scénarios locaux. Aucune intégration d'attaque, migration ou validation globale du combat ; comparaison à l'exécutable actuel ouverte. Les tableaux restent des cibles.

Statistiques isolées sous V53 — chapitres 13/17–20, SYS/TEST-085/099..101/105/111..112 : [profils de revolver, capacités et unités revérifiés](ranged-statistics-reference.md). Adopter les qualités et offsets, adapter la journée Core par dix, différer compétence active et phases ; Gunshot ajouté en V54. L'ancien XML 45/35 % n'est pas la précision contemporaine 55/40 %. Tests numériques et anatomiques ne ferment aucun SYS/TEST global.

Préparation après V53 — chapitres 17–20, SYS/TEST-098..107, 110..112, 118..120 et UI-009/010 : **adopter comme cible** la séparation ligne/couvert, émission/vol/impact et conséquences anatomiques ; **adapter** horloge et présentation 3D ; **vérifier** définitions d'arme, tissus, interruptions, réactions et collision après correctifs ; **différer** catalogue militaire, armures équipées, boucliers et explosions. [Recherche fraîche](combat-preparation.md). Aucune de ces entrées ne devient livrée par cette préparation.

V53 — chap. 8/20/21, SYS/TEST-035, UI-007/008/011 et SYS/TEST-113..117 : adopter mode/destinations distincts, besoins et trajets physiques ; adapter arêtes 3D, dépôt saturé et repli sans couvert ; différer attaque/hostiles/formation et commandes civiles mobilisées. [Sources fraîches et incertitudes](drafting-reference.md), [contrat intégré](../development/drafting.md).

Transport sous V52 : contrats de synchronisation déjà adoptés (chap. 2/3/5/10/21/29/32) inchangés. Comparaison ordonnée de copies et voie structurelle séparée, sans nouvel algorithme de gameplay ni migration ; [relecture technique](presentation-timing-reference.md#encodeur--contrôle-du-17-septembre-sous-v52), [preuves avant/après](../development/validation.md).

V52 — chapitres 2/8/13/20/29, UI-014 et SYS/TEST-055 : adopter propriétaire séparé, transfert physique et ancienne arme conservée ; adapter dépôt saturé, récupération/attache 3D ; différer UI-015, CAT-034..037, GAP-007 et inventaire complet. [Recherche fraîche](equipment-reference.md), [contrat](../development/equipment.md).

V51 — chapitres 8/9/11/15, SYS/TEST-051..054 et 094/096, CAT-018 : adopter plafonds, puissance, doses et groupes ; adapter contact/temps ; différer acquisition complète, inventaire personnel, collecte opportuniste et complications. [Recherche fraîche](medicines-reference.md), [contrat](../development/medicines.md).

V50 — chapitres 8/9/15, SYS/TEST-044 et 094/096 : adopter filtre de priorité et réévaluation des soins, adapter cadence/sortie 3D, différer expiration/réaction aux dégâts des autres tâches. La [recherche fraîche](urgent-care-reference.md) corrige la cible trop large de préemption médicale universelle ; [contrat](../development/urgent-care.md).

V49 — chapitre 15, SYS/TEST-094 et 096, chapitres 8/9 relus : adopter permission, réservations et traitement commun ; adapter sortie du mobilier 3D ; différer préemption médicale générale et médicaments. [Recherche renouvelée](self-tending-reference.md), [contrat](../development/self-tending.md).

**Alimentation assistée V48 (17 septembre 2026)** : chapitres 14/15, SYS/TEST-077, 094 et 096, réservations 8/9. Adopter chaîne physique et régime du patient ; adapter contact cardinal, temps local et poses ; différer inventaires/distributeurs, animaux, malnutrition et maladies. [Recherche](feeding-reference.md) : le miroir calcule 26 %, le wiki suggère 27 % ; choix motivé sans certitude universelle. [Contrat](../development/feeding.md). Six scénarios croisés et clinique de cinq jours, pas une suite par entrée.

**Soins V47 (17 septembre 2026)** : chapitre 15 SYS/TEST-094 et 096, chapitres 8/9 relus. Adopter patient/médecin, trajet/service, capacités, interruption et continuation ; adapter chevet cardinal 3D et temps entier ; différer médicaments, alimentation assistée, auto-soins, chirurgie et maladies. Le [contrat](../development/tending.md) et la [recherche fraîche](tending-reference.md) confrontent wiki, définitions et chemins de traitement : qualité additive, XP avant qualité, durée capturée, Patient distinct de Repos au lit. Ces choix enrichissent cinq scénarios profonds, pas une suite par entrée du corpus.

V45 — chapitre 15, SYS/TEST-089..091, 094, 096..097 : adopter anatomie, lésions, capacités et interruptions ; adapter horloge, dossiers sparse et fin d’arête allongée ; différer soins physiques, ramper et gestion de dépouilles. Chapitres 5/21 : premier producteur par toiture construite. [Recherche fraîche](health-reference.md), [contrat et limites](../development/health.md). Le module initial V44 reste la base physiologique ; ses tests ne suffisent pas à valider la partie intégrée.

V44 — chapitres 8/9/14, SYS/TEST-044/079 et réservations 031..034/047..054 ; chapitre 15 SYS/TEST-096 pour la suite médicale. Adopter interruption/propriété séparées, adapter dépôt local et cadence déphasée, différer incapacité médicale et secours. [Sources recoupées](interrupted-cargo-reference.md), [contrat livré](../development/interrupted-cargo.md).

Socle anatomique sous V43 — chapitre 15, SYS/TEST-089..091 et 096 : adopter arbre et capacités distinctes ; adapter IDs/évaluation immuable ; différer activation, blessures et soins ; interruption de fatigue sécurisée en V44, interruption médicale ajoutée en V45. [Recherche recoupée](body-reference.md), [statut technique précis](../development/body.md).

V43 — chapitre 13, SYS-085 / TEST-085 : [compétences vérifiées](skills-reference.md), [contrat](../development/skills.md). Adopter niveau/XP/passion/capacité distincts ; adapter horloge et profils initiaux, Construction premier consommateur ; différer onze autres compétences, biographies, traits, qualité/échecs et santé. La priorité G3 commence maintenant, sans attendre la fin de l’habitat G2.

V42 — chap. 22 et scène E/32, SYS/TEST-126..128, CAT-047 et CAT-006 : adopter ressources physiques, puissance, connexion invalidée et motifs distincts ; adapter temps/PRNG/rendu ; différer conduits, commandes d’interrupteur et stockage. [Recherche fraîche et certitude](power-reference.md).

V41 — chapitres 5–6/9–11/22, SYS/TEST-016, 048–054, 061 et CAT-006/060 : adopter extraction et conservation des composants, adapter génération/rendu/cadence, différer autres acquisitions et appareils. [Recherche et réserves](components-reference.md).

V40 — chapitre 22, SYS/TEST-126 et 128, chapitre 10 SYS-058 : adopter source froide, alimentation et retrait physique ; adapter cadence et rendu 3D ; différer réseau, recherche et santé thermique. [Vérification spécifique](passive-cooling-reference.md). La règle générique du corpus sur deux côtés ne s’applique pas au refroidisseur passif.

Synchronisation sous V38 — chapitres 2/3/5/10/21/29/32, SYS-005/020..022/051..061/113..117/172..177 : conserver trajets et phases physiques ; adapter exclusivement leur transport/présentation. [Recherche et degré de certitude](presentation-timing-reference.md). Aucun nouveau contenu ni règle de récolte.

Température V38 — chapitres 5/6/14/22/32, SYS/TEST-023..025 et 126..131, scène E : adopter les seuils distincts, air/portes/toiture et continuité alimentaire ; adapter intégration, reconstruction par recouvrement et requêtes bornées ; différer appareils/réseaux, saisons/météo, santé et intégrale agricole extrême. [Recherche renouvelée](temperature-reference.md), [contrat](../development/temperature.md). Aucun statut R/P/V du corpus ne vaut validation locale.

Toiture V35 — chapitres 5/10/21/22, SYS/TEST-023..025 et 061, scène E : adopter couverture distincte du sol, supports et travail physique ; adapter graphe/cadence/rendu ; différer plafonds naturels, dégâts et thermique. [Recherche fraîche](roofing-reference.md), [contrat](../development/roofing.md). Les mentions de toiture différée dans les bilans datés ci-dessous décrivent ces lots antérieurs, pas le statut courant.

Audit sous V34, 15 septembre 2026 : chapitres 5/14/21, SYS-020..022, SYS-080 et SYS-113..117 relus pour occupation, arrêt et recherches de candidats. Contrats conservés par évaluation différée et capture locale ; incohérence des loisirs sur fragments corrigée. [Recherche et décisions](spatial-query-reference.md).

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
| Combat et santé ; chap. 13..20, SYS-081..112 | **Adopter** corps/capacités et séparation intention, émission, impact, santé. **Vérifier** coefficients, arrondis et comportement de cible mobile avant implémentation. | G3, après les premières boucles de logistique et d’habitat, sans attendre leur catalogue complet. L'animation reste une présentation ; aucune balistique physique 3D ni munition générique n'est présumée. |
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

Les chapitres 1/4/11/31/34 n’apportent pas un catalogue individuel exhaustif ni un manifeste de version ; [couverture vérifiée](../gameplay/content-catalogue.md). Les chapitres 2/8/13/20/29, SYS-055, UI-014/015 et CAT-034..037 sont adoptés comme contrat d’inventaire/équipement ; la synchronisation des portraits est explicitée dans [character-presentation.md](../development/character-presentation.md), commencée pour la principale V52 ; vêtements et avatars définitifs restent prévus.

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

Acier V29 : chapitres 5–6/10/11 et SYS/TEST-016, 061–064, CAT-059/060 relus. Adoption des identités et transferts physiques ; génération locale adaptée ; toits, compétences, ateliers et blocs différés. La [recherche fraîche](steel-reference.md) relève le prérequis de 30 acier de l’atelier et la contradiction 120/100 ticks entre wiki historique et miroir de code. Aucun SYS de famille n’est déclaré terminé par ce seul contenu.

## Matériau des ouvrages V30

Chapitre 10, SYS/TEST-056, 058, 059 et UI-019/020/024 relus : **adopter** choix du matériau, quantités réellement livrées et identité réinstallée ; **adapter** temps local et apparence 3D ; **différer** réparation/remplacement, compétence, qualité et atelier mixte. La [recherche fraîche](construction-materials-reference.md) corrige le coût historique des nouveaux lits et distingue les propriétés encore absentes. Les propositions de tests enrichissent les parcours de construction/colonie existants.

V31 : relecture chapitres 5/10/11, SYS/TEST-020..022/051..064 ; [atelier de taille et contradictions des sources](stonecutter-reference.md). Adopter empreinte, matériaux et transfert ; adapter unités/présentation ; différer les recettes de taille et la recherche. Le XML historique donne un coût de passage 70, les données actuelles 50 : la divergence est tracée.

## Production de pierre V32

Chapitre 11 relu ; **SYS/TEST-062..064, UI-025** : adopter transactions, filtrage et reprise selon recette ; adapter horloge, catégories et rendu ; différer paramètres avancés/objets inachevés d'autres recettes, capacités et recherche. [Nouvelle confrontation](stonecutting-reference.md) : facture générale compte tous les blocs, X fois compte les opérations. Une recette sans objet inachevé conserve les ingrédients après interruption, pas ses ticks de travail hors sauvegarde. Les scénarios de colonie et production sont enrichis sans suite automatique par ligne du corpus.

## Construction pierre V33 — 15 septembre
Chapitre 10, SYS/TEST-056, 058, 059 et UI-019/024 relus dans les originaux : adopter choix de matière, livraison quantitative, retrait et identité du meuble ; adapter 3D/horloge ; différer fondations détaillées, réparation, remplacement, qualité et autres statistiques. Vérification actuelle de l’exclusion de pierre à la table de taille et du repos réduit des lits, facteurs de construction distincts de fabrication : [sources et décisions](stone-buildings-reference.md).

## V34 — portes manuelles

Chapitres 5/10/21, SYS-020..024 et SYS-113..117 : adopter accès/recherche/suivi distincts, attente avant passage et état persistant ; adapter cadence, protection volumique et rendu GPU. [Recherche renouvelée](doors-reference.md), [contrat](../development/doors.md). Différer remplacement direct, pièces/toits/température et profils d'acteurs absents. Les scénarios de navigation, construction, colonie et UI sont enrichis ; aucun statut du corpus ne vaut preuve locale.

## Pièces sous V34 — première tranche

Chapitres 5/10/21/**22**, SYS/TEST-023..025, S10 et scène E relus : adopter enceintes, portes comme seuils et distinction air/transit ; adapter la topologie et sa durée de vie ; différer toits, thermique, rôles et statistiques. [Recherche récente](rooms-reference.md), [contrat livré](../development/rooms.md). L’inspection expose les fusions/divisions ; aucune acceptation globale de S10 n’est annoncée. Les seuils d’intérieur différents et les limites de grandes pièces sont explicitement relevés pour les prochains consommateurs.

## V36 — lumière et premiers rôles

Chapitres 5/10/11/12/21/22, SYS/TEST-023..025 et 062..064, UI-025, SYS/TEST-070..072 relus. **Adopter** les facteurs distincts et la continuité matérielle ; **adapter** unités, caches et rôles au catalogue civil présent ; **différer** autres métiers, rendu lumineux local, thermique, social et statistiques absentes. [Recherche fraîche](work-environment-reference.md) : correction des confusions entre minimum statistique et courbe de lumière, entre critères de pièce et entre moyenne/max RGB. Les scénarios de production et le pilote existants sont enrichis.

## Présentation de la lumière sous V36

Chapitres 5/22/29 relus, SYS/TEST-023..025 et UI-005 : adopter séparation entre couverture et visibilité ; adapter l’éclairage des volumes, les surfaces et les poses GPU ; différer brouillard de guerre, coupe automatique par pièce et effets absents. La [recherche fraîche](environment-lighting-reference.md) distingue le champ de gameplay et le compositing visuel Core. Aucun nouveau statut global validé ; contrôles enrichis dans la famille UI/environnement existante.

## V37 — lumière des travaux et déplacements

Chapitres 5/9–12/21–22 ; SYS/TEST-020..025, 041..050, 056/058/059/061, 070..072 et 113..117 : adopter statistiques à la position du colon et continuation des actions ; adapter horloge, accumulation et navigation ; différer capacités, paramètres de croissance du travail des plantes et autres profils. La [recherche fraîche](light-work-reference.md) distingue travail continu, capture minière et capture d’arête. Les scénarios existants et le pilote sont enrichis, sans considérer ces familles complètes.

## V39 — température des plantes

Chapitre 12, SYS/TEST-070, 071, 072, 075 relus dans les originaux. **Adopter** temps favorable, facteurs locaux, sélection des semis et récolte indépendante ; **adapter** les intervalles sauvegardés à 10 Hz ; **différer** survie au gel, feuilles, autres espèces et saisons. [Recherche fraîche et contradiction 6/10 °C](plant-temperature-reference.md), [contrat](../development/plant-temperature.md). Les scénarios thermiques et agricoles existants couvrent les interactions ; le pilote conserve ses bilans en climat tempéré. L’inspection sous toit est corrigée, l’écart de voisinage cardinal/diagonal au semis reste consigné.

## Secours V46 — 17 septembre

Chapitre 15, SYS/TEST-094 et 096, chapitres 8/9 : adopter patient unique, réservation de lit, trajet et interruption ; adapter contacts 3D, état sparse persistant et trajectoire GPU ; différer traitement, alimentation assistée, politiques et dangers aux tranches suivantes. [Contrat](../development/rescue.md), [recherche fraîche et degré de certitude](care-preparation.md). Les entrées de tests ont enrichi six scénarios croisés, pas une suite par ligne du corpus.
