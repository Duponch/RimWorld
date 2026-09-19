# Plan de développement

V63 — [vêtements physiques et protection corporelle](development/armor.md) : chemise/gilet obtenables, habillage/retrait, couches et armure anatomique, apparence GPU/portrait. Prolonge combat et soins ; aucun jalon G0–G5 clos.

Le parcours assemble les requêtes ligne/couvert, profils du revolver, impacts V54 et vols V55. Le lot V56 vérifie les ordres, la continuation et la présentation à 1×/6×, puis la charge mixte 3/30/100 acteurs. Les pointes à forte charge restent dans les preuves ; traiter leurs causes observées avant d’augmenter la densité du premier affrontement.

État : 19 septembre 2026. **ROADMAP est l’unique calendrier G0–G5.** G0 en consolidation, G1 et G2 partiels ; G3 commence par ses fondations humaines. Aucun jalon complet. [Inventaire réel](gameplay/implementation-status.md), [validation](development/validation.md), [index](README.md).

## Priorité actuelle

**Mode nuit renouvelé le 19 septembre à la demande utilisateur, pendant V60.** Terminer et publier le lot engagé, puis enchaîner les prochaines étapes depuis main sans attendre de relance, jusqu’à retour au mode jour ou arrêt explicite. Garder un commit/push par lot cohérent et une notification aux livraisons significatives.

**Point de validation V62 :** 291/291 globaux, 22/22 ciblés finaux, UI sommeil → impact → réveil/sortie à 1×/6× et charge mixte 3/30/100. À cent acteurs CPU p95 38,21 ms, images p95 12,2 ms, pic 121,3 ms ; pas de garantie 6×. [Preuves V62](history/validation-disturbance-v62.md).

**Point de validation V61 :** 285 tests globaux puis 20 contrôles ciblés réussis, UI mouvement/combat à 1×/6× et audit mobile 3/30/100. À cent acteurs CPU p95 tous ticks 38,72 ms, images p95 12,1 ms avec pic 116,2 ms ; ne pas garantir 6× soutenu. [Preuves V61](history/validation-pursuit-v61.md).

**Historique de validation V60 :** la garde minage/abattage passe avant et après le lot, sans attente après amorçage ni saut. L’échec V59 reste dans ses preuves historiques. Acquisition optimisée à cent acteurs, mais p95 CPU ~30 ms et pointes natives conservées : profiler encore avant de densifier les combats. [Preuves V60](history/validation-automatic-combat-v60.md).

Le parcours UI civil de trois jours passe également, avec production et stocks de pierre puis maintenance achevée après sommeil normal. Le pilote entretient maintenant une petite zone minière quand les fragments manquent ; ses échecs antérieurs restent documentés. V61 ajoute ensuite l’approche visible, après relecture des chapitres 17/20/21 et des correctifs officiels postérieurs au miroir. Les limites de parité restent explicitement consignées.

**Prochaine livraison visée : premières pensées explicables.** Revoir le calcul d’humeur actuel et brancher les causes déjà vécues (douleur, faim/fatigue, repas sans table et confort d’habillement pertinent) avec consultation des causes, durée/mémoire quand le jeu de référence l’exige et sauvegarde. Ne pas introduire une nouvelle jauge abstraite ni annoncer relations/crises complètes ; vérifier attentes, courbes et cumul avant de choisir le périmètre exact. Puis relations/personnalités selon leurs producteurs. Fabrication textile, politiques et usure quotidienne restent identifiées à compléter ; l’électricité détaillée reste différée.

**V63 livrée :** manipulations, sol saturé, migration, impacts et UI 1×/6× vérifiés ; pilote, reprise de maintenance après sommeil et audits documentés dans les [preuves](history/validation-apparel-v63.md). Les limites d’habillement restent dans le [contrat](development/armor.md).

**Cadence de livraison :** les extractions techniques restent utiles à l'intérieur d'un lot, mais le prochain bilan de développement doit privilégier une action visible. Regrouper scénario métier, continuation et contrôle UI à 1×/6× ; mesurer la charge mixte une fois le parcours intégré. Ne pas rejouer les suites de simulation pour une correction documentaire. Aucune réduction des contrats physiques ou des vérifications de règles n'est déduite de cette organisation.

Le camp possède matériaux, construction, nourriture, repos, loisirs, toits, température locale et première électricité. V45 y ajoute capacités physiques, blessures et incapacité. V46 ajoute les secours physiques et lits médicaux. V47 ajoute le traitement sans médicament, le repos médical volontaire et Médecine. V48 ajoute l’alimentation assistée physique. V49 ajoute les auto-soins ordinaires. V50 ajoute les décisions urgentes et la revue au lit ; la recherche corrige la cible trop large d’interruption universelle. V51 ajoute médicaments et plafonds individuels ; acquisition complète des produits et conflits restent ouverts. L’habitat a été approfondi trop longtemps avant ces boucles. L’ordre ci-dessous traverse les jalons selon leurs dépendances ; il ne faut pas finir chaque appareil de G2 avant de commencer G3.

1. **Personnes utiles au gameplay** : Construction, passions et apprentissage V43 livrés ; les compétences suivantes seront branchées sur leurs vraies actions, sans valeurs décoratives. Compléter les effets manquants explicitement, en particulier les capacités physiques. Ne pas retarder le corps et les soins pour terminer tout le catalogue des traits.
2. **Corps, capacités et blessures** : interruptions de fatigue/cargaison sécurisées en [V44](development/interrupted-cargo.md) ; [socle anatomique](development/body.md) et [santé intégrée V45](development/health.md) livrés : anatomie adulte, lésions, guérison, douleur/saignement, état à terre/décès, effets sur marche/travail/ingestion, interruptions et sauvegarde. Premier dommage de toiture construite livré, soins complets et gestion des dépouilles encore absents ; aucun remplacement par une vie globale générique. [Préparation et points de vigilance](research/health-preparation.md).
3. **Secours et soins** : [transport du blessé, couchage médical et métier Médecin V46](development/rescue.md) livrés. [Traitement physique sans médicament, repos médical volontaire et Médecine V47](development/tending.md) livrés. [Alimentation assistée V48](development/feeding.md) livrée, également pour un blessé mobile au repos médical. [Auto-soins ordinaires V49](development/self-tending.md) livrés. [Décisions urgentes et revue au lit V50](development/urgent-care.md) livrées. [Médicaments et plafonds V51](development/medicines.md) livrés. V52 livre [la première principale physique](development/equipment.md), distincte de la cargaison. V53 ajoute mobilisation/démobilisation et déplacement tactique avec interruption/conservation ; tir dirigé V56 livré ; première sentinelle et réponse civile V58 livrées ; mêlée V59 et approche autonome visible V61 livrées pour le contenu actuel. Le combat ne doit pas sauter visibilité, couverture, capacités et phases de projectile. Ne pas approfondir maintenant la fabrication médicale avant cette boucle. Expiration des autres tâches et réaction aux dégâts seront étudiées avec ces comportements ; aucune interruption universelle présumée. Puis maladies et complications à mesure que leurs producteurs arrivent. [Recherche des secours](research/care-preparation.md) et [traitements revérifiés](research/tending-reference.md).
4. **Équipement et premier combat** : première arme V52, mobilisation/déplacements V53 et tir dirigé V56 livrés ; chemise/gilet et armure V63 ajoutés ; restent inventaire, autres vêtements/armes, autres ordres de combat ; sentinelle et fuite V58 ajoutées, approche visible V61 ajoutée ; catalogue de mêlée et stratégies de groupe à compléter. Impacts anatomiques, lignes/couverture et présentation GPU intégrés. Pas de catalogue militaire complet avant une boucle jouable.
5. **Pensées, traits et relations** : causes consultables, avis dirigés, premiers événements sociaux et crises, en réutilisant les situations effectivement vécues. Enrichir ensuite narration/incidents et progression économique.
6. **Retour sur l’habitat et les ressources** : interrupteurs physiques, conduits, batteries et froid électrique, recettes/recherche, météo/saisons et biomes. Ces systèmes restent nécessaires ; leur profondeur vient après les premières boucles humaines.

Le diagnostic de cadence V52 a produit une correction mesurée : comparaison ordonnée des ressources et reconstruction des identifiants seulement lors d’un changement structurel. Paquets et mondes reconstruits inchangés ; encodage d’abattage p95 7,5 → 5,1 ms dans les deux passages instrumentés. La garde complète suivant cette modification passe sans attente ni saut et avec 44 commandes sous 90 ms. Une mesure ne garantit pas l’absence universelle d’attente ; garder ces contrôles lors de la mobilisation et poursuivre les audits de charge aux changements utiles. Détails, limites et échecs antérieurs dans la validation.

Chaque lot commence par corpus et recherche fraîche. Les audits rétroactifs peuvent modifier cet ordre sur preuve. Voir [motif et sources de la réorientation](research/skills-reference.md). Les extensions restent après G5.

La [recherche de mobilisation](research/drafting-reference.md) consigne les adaptations V53 et les limites à reprendre avec le combat : hostiles, couvert, formation, actions civiles mobilisées et exceptions de sommeil. La [préparation du premier combat](research/combat-preparation.md) reprend les chapitres 17–20, les sources datées et les prérequis de ligne, projectile, anatomie et réaction civile ; les données numériques encore incertaines y restent signalées. Le mode tactique seul ne livre pas le combat.

## Contrats de progression

La grille plane 3D low poly, les interactions physiques, l’UI de référence et le [corpus](research/reference-adoption.md) restent la cible. Les [adaptations](gameplay/decisions.md) sont explicites. Carte 250², simulation déterministe, travail ordonné, sauvegardes migrées strictement et rendu GPU sont des frontières maintenues, pas des raisons de retarder indéfiniment le gameplay.

Tests regroupés par contrats : conservation, continuation, espace, véritable partie UI/worker et charge. Enrichir le pilote de colonie aux nouvelles boucles ; profiler régulièrement 3/30/100 colons avec activités mixtes et scènes chargées, sans prétendre couvrir toutes les combinaisons. Garder les pointes et échecs observés dans les preuves, même si une reprise passe.

## G0 — Socle et continuité

Contrats livrés : définitions immuables ciblées, propriété unique, pile au sol par cellule, réservations quantitatives, livraison avant construction, reprise exacte, commandes ordonnées et refus atomiques. Navigation CPU à huit voisins, progression euclidienne ; le laboratoire GPU est indépendant.

À compléter :

- Zones nommées et politiques partagées ; filtres enrichis au rythme du contenu.
- V17 : sélection multiple et file de travaux exécutables avec motifs de refus livrées. V18 complète transport et approvisionnement avec réservations quantitatives. V19 ajoute dégagement des chantiers et combustible forcés. V20 ajoute dégagement des piles sur semis et cuisine forcée. V23 complète le maintien sur la cellule pour les familles présentes. Restent autres familles sélectionnables et fournisseurs liés aux contenus absents ; [contrat](development/player-orders.md).
- Construction V16 : plan/cadre/ouvrage, dégagement des piles/plantes et approvisionnement par bâtisseur livrés. V21 ajoute coexistence par définition et plans dans les réserves. V22 ajoute franchissement/coûts/arrêt du mobilier présent. Restent autres profils et déplacement des personnes gênantes ; voir [contrat](development/construction.md).
- Étendre les profils de franchissement et cases de travail à mesure que les activités arrivent ; passage civil et distinction avec les réservations de lits/repas/postes livrés en V14. La présence d’un colon ne ferme plus un couloir. Collisions hostiles debout V58 ; autres profils à compléter avec G3 ; lisibilité 3D des superpositions encore partielle.
- Manifeste de contenu/générateur, journal complet des commandes datées, export/import et garanties d’évolution.

**Acceptation G0 :** trois colons développent un camp par des commandes explicables ; matériaux conservés à chaque transition, engagements sans duplication, continuation exacte pendant les transports, contrôle de charge reproductible. Les premiers scénarios passent ; les manques ci-dessus empêchent de déclarer le jalon clos.

## G1 — Survie quotidienne

Agriculture et croissance, récolte renouvelable, cuisine avec recettes et files de fabrication, conservation des aliments, couchages réservés et trajets vers les lits, horaires et vrais besoins. Les relations de temps et de ressources doivent créer des arbitrages lisibles. Introduire traits et compétences seulement avec leurs effets mesurables.

Le corpus précise cette tranche : croissance intégrée sur le temps favorable, factures avec critères d'ingrédients et de comptage, repas réellement accessibles/transportés/ingérés, besoins séparés des jobs qui les satisfont. Ajouter l'explication des statistiques sur les premières valeurs effectivement utilisées. L'expiration des trois aliments périssables est livrée ici ; les effets des pièces, du refroidissement et de l'électricité relèvent de G2.

**Acceptation :** colonie autonome plusieurs jours avec alimentation produite et consommée ; effets vérifiables de compétence, distance, stock insuffisant et interruption. Le tutoriel doit expliquer les raisons d'un échec de survie.

## G2 — Habitat et environnement

Minage, déconstruction, portes, pièces et toits, températures intérieur/extérieur, saisons, météo persistante, électricité et incendies. Développer les types de sols, les cinq roches naturelles de base et les minerais, les espèces et biomes locaux avec leurs propriétés ; différencier sol découvert, bloc rocheux, chunk et matériau taillé. Le cycle visuel déjà livré ne vaut pas simulation de ces systèmes. La topologie des enceintes est livrée pour l’inspection, avec vérification des obstacles et recalcul global mesuré, séparée de la navigation. Les premiers consommateurs de production et de température sont livrés ; autres consommateurs, climat complet et invalidation locale de la topologie générale restent à développer. Prévoir coupe visuelle des toits/murs dès l'introduction de pièces.

Adapter la scène E du corpus : porte détruite/reconstruite, pièce fusionnée, alimentation coupée et feu déclenché. Les causes de panne et les changements de topologie doivent être partagés avec les travaux et la navigation. Les dégâts de toiture aux personnes sont ajoutés en V45 ; autres producteurs restent à développer avec G3 ; une injection de feu de test n'exige pas déjà le narrateur G4. Les environnements complexes des extensions restent ultérieurs.

**Acceptation :** une pièce fermée change effectivement température et confort ; une porte ou brèche invalide la bonne région ; feu, énergie et stocks interagissent sans simulation liée aux FPS.

## G3 — Personnages et conflits

Santé anatomique, capacités dérivées, soins, blessures et douleur ; combat avec ordres directs, visibilité, couverture et projectiles ; moral avec pensées, relations et crises. Animaux avec alimentation, comportement et reproduction pourront utiliser le même socle d'acteur avec des besoins distincts.

Ordre interne : identité/corps/capacités et blessures → secours/soins → équipement/premier combat → pensées/relations, selon la priorité actuelle ci-dessus. Le résolveur sépare intention, préparation, émission, projectile, impact et santé. Les scènes B/C du corpus sont des réserves de cas ; les coefficients et règles de cible mobile issus du miroir de code demandent vérification avant adoption. L'animation et les collisions de meshes n'ont aucune autorité sur les dégâts.

**Acceptation :** une blessure affecte réellement déplacement/travail/combat ; un soin et un équipement changent le résultat ; comportements et règles de ciblage restent reproductibles aux frontières d'obstacle et de portée.

## G4 — Histoires et progression

Incidents, rythme de tension, menace liée au contexte de colonie, factions, visiteurs, commerce, recherche et événements sociaux. Garder conditions, poids et causes observables pour équilibrer le storyteller. La difficulté doit être une décision de conception documentée, sans prétendre recopier des coefficients non vérifiés.

Séparer événement de domaine et notification, état de quête et texte, panier commercial et transfert confirmé. Enregistrer échéances, identité des participants, choix de récompenses et RNG nécessaires. La richesse et les budgets d'incidents lisent les objets existants ; une récompense déjà remise ne peut être rejouée au chargement. L'artisanat général et les déblocages prolongent les recettes de survie de G1.

**Acceptation :** des parties seedées produisent des chaînes de conséquences variées mais expliquées, sans événements impossibles, seuils absurdes ou blocage de progression.

## G5 — Monde et consolidation

Carte du monde, voyages et caravanes, échanges entre cartes, objectifs longs, migrations de sauvegarde, accessibilité, optimisation à centaines d'acteurs, configuration graphique et intégration des assets définitifs. Comparer à la matrice des domaines du jeu de base avant d'étendre le périmètre aux DLC.

La scène D du corpus guide les transferts : une personne ou pile garde son identité et un propriétaire unique entre carte, caravane et rencontre. Les sites mondiaux peuvent être abstraits ; aucune simulation intégrale des colonies étrangères n'est présumée. Le monde devient jouable à ce jalon, mais le contrat de génération locale doit déjà pouvoir recevoir un contexte de site versionné sans exiger sa réalisation immédiate.

**Acceptation :** partie longue, reprise après versions, tests multi-cartes, budgets de performance sur appareils choisis, documentation de toutes les mécaniques livrées.

## Chantiers transversaux

Audit V48 : à cent acteurs en clinique, les pointes d’image restent observables pour alimentation et traitements déjà présents. Suivre séparément coût des transferts/scène/HUD et rendu lors du prochain audit mixte ; zéro compilation GPU ne suffit pas à prouver l’absence de saccades. [Mesures et limites V48](history/validation-feeding-v48.md).

Audit V51 : coût DOM de caméra au repos supprimé après profilage. Les courtes charges natives conservent néanmoins des pointes jusqu'à 87,1 ms ; poursuivre réception des snapshots, matrices/parcours de scène et DOM sur une charge mixte plus longue avec le prochain lot de personnages. Le gain ciblé n'est pas une validation globale de fluidité. [Données V51](history/validation-medicines-v51.md).

- **Assets et 3D** : décor/bâtiments/objets en code, placeholders remplacés progressivement, personnages squelettiques GPU et apparence commune carte/portraits. Blender seulement lors des sessions demandées. Les [échelles](research/spatial-design.md) et empreintes doivent rester cohérentes.
- **Performance** : audits courts aux changements de boucle/rendu, percentiles et machine consignés. Distinguer simulation, snapshots, rendu et GPU ; aucune garantie depuis une capacité de buffer. V22 : poursuivre le coût de planification à cent acteurs et surveiller l’erreur ponctuelle d’allocation au chargement WebGPU 250², non reproduite dans les deux contrôles suivants. Les [ressources graphiques conservées](development/render-lifecycle.md) restent le contrat pour l’abattage.
- **Navigation GPU** : [laboratoire](research/gpu-navigation.md), comparaison CPU et régions, rendu concurrent, révisions et adoption déterministe au tick. Pas de lecture GPU bloquante par colon.
- **Fidélité** : nouvelle recherche par mécanique et relectures rétroactives ; conserver chapitre/ID, provenance et décision. Plusieurs sols, roches, plantes et biomes restent prévus en G2 ; le ciel ne clôture pas météo/climat.
- **Tests et docs** : peu de scénarios profonds, pilote de colonie entretenu ; contrôles regroupés suivant [testing](development/testing.md). Mettre à jour contrats, guide, inventaire et preuves sans recopier les mêmes règles dans tout le dossier.

## Questions de conception ouvertes, sans bloquer le socle

Objectif d'une partie, tonalité fictionnelle, contraintes de verticalité, taille maximale de colonie/carte, profondeur des interactions sociales et matériel cible restent à préciser en jouant les prochains jalons. Aucun ajout d'étages, multijoueur, moteur physique global ou cloud obligatoire n'est présumé.

## Estimation de charge — 18 septembre 2026

**Environ 20 % du travail total, fourchette 15–25 %**, pour une reproduction substantielle du jeu de base en 3D, avec contenu, intégration, corrections et finition. C'est un jugement de planification du co-lead, pas une mesure objective, un pourcentage de code, de fidélité certifiée ou d'objets disponibles. Les domaines ont des poids différents et partagent des dépendances : ne pas faire la moyenne des lignes ci-dessous. La borne basse reste plausible tant que combat et narration ne produisent pas de partie complète. G0–G2 partiels, G3 engagé, G4/G5 principalement absents ; aucun jalon clos.

| Aspect de la cible | Avancement estimé | Ce qui explique le travail restant |
|---|---:|---|
| Socle simulation, navigation, persistance et commandes | 60–70 % | Contrats et migrations actifs ; profils hostiles, multi-cartes, journal complet et comportement sous charge à poursuivre. Navigation GPU encore expérimentale. |
| Survie quotidienne, besoins et travail | 50–65 % | Boucles physiques utilisables ; variété alimentaire/agricole, métiers, interruptions et besoins à compléter. |
| Construction, logistique et habitat | 40–55 % | Matériaux, plans/cadres, transport, pièces/toits, lumière/température présents ; catalogue, réparation, sols, risques et électricité complète manquants. |
| Génération, végétation, biomes et climat | 20–35 % | Site local déterministe et premières filières ; nombreuses espèces, biomes, saisons, météo et toits naturels absents. |
| Anatomie, santé et soins | 35–50 % | Blessures/capacités/secours/soins intégrés ; maladies, infections, immunité, chirurgie, prothèses et dépouilles restent importantes. |
| Compétences, traits et identité | 15–25 % | Construction, Médecine et Tir actifs ; neuf autres compétences, biographies, traits et effets croisés absents. |
| Équipement, vêtements et inventaire | 10–20 % | Une principale physique ; inventaire personnel, vêtements, armures, masse et grand catalogue absents. |
| Combat | 5–15 % | Tir, santé, pouvoir d’arrêt et sentinelle de scénario désormais jouables ; Fuir/Attaquer/Ignorer et collisions intégrés. Mêlée V59, tir automatique/Attaquer V60 et approche ennemie visible V61 livrés ; armures, réveil défensif, stratégies de groupe et raids restent absents. |
| Humeur et relations | 5–10 % | Quelques besoins/souvenirs ; pensées complètes, crises, personnalités et réseau social absents. |
| Production, recherche et contenu | 10–20 % | Deux filières de production ; ateliers, nombreuses recettes, économie matérielle et recherche absents. Ce n'est pas un ratio d'objets : aucun catalogue exhaustif vérifié. |
| Animaux et élevage | 0–5 % | Aucun animal jouable ; le socle spatial/médical est réutilisable, ses règles animales ne sont pas développées. |
| Narration, factions, commerce, monde et objectifs | 0–5 % | Pas de raids, narrateur, diplomatie, marché, planète, caravane ou fin de partie. |
| Rendu, interface, audio et finition | 30–45 % | Scène 3D GPU, caméras, UI du camp et FPS présents ; assets définitifs, portraits habillés, effets, audio, accessibilité et UI des systèmes absents restent à réaliser. |

**Ordres de grandeur calendaires supplémentaires**, du point de vue utilisateur avec sessions de développement régulières, plages autonomes autorisées, retours de jeu et périmètre Core stable : **4–8 semaines pour une alpha cohérente** avec survie, combat, soins et premières menaces/progression ; **4–8 mois pour approcher un jeu de base substantiel en 3D**. Une reproduction exhaustive et sa finition peuvent dépasser cette seconde fourchette. Pas de date de fin fiable avant d'avoir mesuré une boucle menace → blessure → soins → reprise, puis sa répétition sur plusieurs jours. Les estimations incluent recherche, contenu, intégration et régressions ; elles ne supposent pas un agent travaillant continuellement en mode jour.

Le 15 septembre, la projection était 10–15 %, 3–6 semaines pour une alpha et 3–6 mois pour la cible Core. Les soins ont avancé depuis, mais les derniers lots de combat ont surtout produit des fondations techniques. L'élargissement des délais reconnaît ce coût d'intégration et les vastes domaines encore absents ; il ne signifie pas que le reste sera linéairement proportionnel aux premiers jours. Réévaluer après le premier affrontement réellement joué et le premier épisode de colonie incluant une menace. Le nombre de versions/commits ne sert pas d'indicateur d'avancement.
