# Plan de développement

État : 17 septembre 2026. **ROADMAP est l’unique calendrier G0–G5.** G0 en consolidation, G1 et G2 partiels ; G3 commence par ses fondations humaines. Aucun jalon complet. [Inventaire réel](gameplay/implementation-status.md), [validation](development/validation.md), [index](README.md).

## Priorité actuelle

Le camp possède matériaux, construction, nourriture, repos, loisirs, toits, température locale et première électricité. V45 y ajoute capacités physiques, blessures et incapacité. V46 ajoute les secours physiques et lits médicaux. V47 ajoute le traitement sans médicament, le repos médical volontaire et Médecine. V48 ajoute l’alimentation assistée physique. V49 ajoute les auto-soins ordinaires. V50 ajoute les décisions urgentes et la revue au lit ; la recherche corrige la cible trop large d’interruption universelle. Il manque encore les médicaments et les conflits. L’habitat a été approfondi trop longtemps avant ces boucles. L’ordre ci-dessous traverse les jalons selon leurs dépendances ; il ne faut pas finir chaque appareil de G2 avant de commencer G3.

1. **Personnes utiles au gameplay** : Construction, passions et apprentissage V43 livrés ; les compétences suivantes seront branchées sur leurs vraies actions, sans valeurs décoratives. Compléter les effets manquants explicitement, en particulier les capacités physiques. Ne pas retarder le corps et les soins pour terminer tout le catalogue des traits.
2. **Corps, capacités et blessures** : interruptions de fatigue/cargaison sécurisées en [V44](development/interrupted-cargo.md) ; [socle anatomique](development/body.md) et [santé intégrée V45](development/health.md) livrés : anatomie adulte, lésions, guérison, douleur/saignement, état à terre/décès, effets sur marche/travail/ingestion, interruptions et sauvegarde. Premier dommage de toiture construite livré, soins complets et gestion des dépouilles encore absents ; aucun remplacement par une vie globale générique. [Préparation et points de vigilance](research/health-preparation.md).
3. **Secours et soins** : [transport du blessé, couchage médical et métier Médecin V46](development/rescue.md) livrés. [Traitement physique sans médicament, repos médical volontaire et Médecine V47](development/tending.md) livrés. [Alimentation assistée V48](development/feeding.md) livrée, également pour un blessé mobile au repos médical. [Auto-soins ordinaires V49](development/self-tending.md) livrés. [Décisions urgentes et revue au lit V50](development/urgent-care.md) livrées. Prochaine tranche : médicaments/politiques, puis équipement/premier combat. Expiration des autres tâches et réaction aux dégâts seront étudiées avec ces comportements ; aucune interruption universelle présumée. Puis maladies et complications à mesure que leurs producteurs arrivent. [Recherche des secours](research/care-preparation.md) et [traitements revérifiés](research/tending-reference.md).
4. **Équipement et premier combat** : propriété des armes/vêtements distincte de la cargaison, mobilisation, ordres et adversaire simple ; impacts utilisant la santé, lignes de tir/couverture, poursuite/fuite et présentation GPU cohérente. Pas de catalogue militaire complet avant une boucle jouable.
5. **Pensées, traits et relations** : causes consultables, avis dirigés, premiers événements sociaux et crises, en réutilisant les situations effectivement vécues. Enrichir ensuite narration/incidents et progression économique.
6. **Retour sur l’habitat et les ressources** : interrupteurs physiques, conduits, batteries et froid électrique, recettes/recherche, météo/saisons et biomes. Ces systèmes restent nécessaires ; leur profondeur vient après les premières boucles humaines.

Chaque lot commence par corpus et recherche fraîche. Les audits rétroactifs peuvent modifier cet ordre sur preuve. Voir [motif et sources de la réorientation](research/skills-reference.md). Les extensions restent après G5.

## Contrats de progression

La grille plane 3D low poly, les interactions physiques, l’UI de référence et le [corpus](research/reference-adoption.md) restent la cible. Les [adaptations](gameplay/decisions.md) sont explicites. Carte 250², simulation déterministe, travail ordonné, sauvegardes migrées strictement et rendu GPU sont des frontières maintenues, pas des raisons de retarder indéfiniment le gameplay.

Tests regroupés par contrats : conservation, continuation, espace, véritable partie UI/worker et charge. Enrichir le pilote de colonie aux nouvelles boucles ; profiler régulièrement 3/30/100 colons avec activités mixtes et scènes chargées, sans prétendre couvrir toutes les combinaisons. Garder les pointes et échecs observés dans les preuves, même si une reprise passe.

## G0 — Socle et continuité

Contrats livrés : définitions immuables ciblées, propriété unique, pile au sol par cellule, réservations quantitatives, livraison avant construction, reprise exacte, commandes ordonnées et refus atomiques. Navigation CPU à huit voisins, progression euclidienne ; le laboratoire GPU est indépendant.

À compléter :

- Zones nommées et politiques partagées ; filtres enrichis au rythme du contenu.
- V17 : sélection multiple et file de travaux exécutables avec motifs de refus livrées. V18 complète transport et approvisionnement avec réservations quantitatives. V19 ajoute dégagement des chantiers et combustible forcés. V20 ajoute dégagement des piles sur semis et cuisine forcée. V23 complète le maintien sur la cellule pour les familles présentes. Restent autres familles sélectionnables et fournisseurs liés aux contenus absents ; [contrat](development/player-orders.md).
- Construction V16 : plan/cadre/ouvrage, dégagement des piles/plantes et approvisionnement par bâtisseur livrés. V21 ajoute coexistence par définition et plans dans les réserves. V22 ajoute franchissement/coûts/arrêt du mobilier présent. Restent autres profils et déplacement des personnes gênantes ; voir [contrat](development/construction.md).
- Étendre les profils de franchissement et cases de travail à mesure que les activités arrivent ; passage civil et distinction avec les réservations de lits/repas/postes livrés en V14. La présence d’un colon ne ferme plus un couloir. Collisions hostiles à développer avec G3 ; lisibilité 3D des superpositions encore partielle.
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

- **Assets et 3D** : décor/bâtiments/objets en code, placeholders remplacés progressivement, personnages squelettiques GPU et apparence commune carte/portraits. Blender seulement lors des sessions demandées. Les [échelles](research/spatial-design.md) et empreintes doivent rester cohérentes.
- **Performance** : audits courts aux changements de boucle/rendu, percentiles et machine consignés. Distinguer simulation, snapshots, rendu et GPU ; aucune garantie depuis une capacité de buffer. V22 : poursuivre le coût de planification à cent acteurs et surveiller l’erreur ponctuelle d’allocation au chargement WebGPU 250², non reproduite dans les deux contrôles suivants. Les [ressources graphiques conservées](development/render-lifecycle.md) restent le contrat pour l’abattage.
- **Navigation GPU** : [laboratoire](research/gpu-navigation.md), comparaison CPU et régions, rendu concurrent, révisions et adoption déterministe au tick. Pas de lecture GPU bloquante par colon.
- **Fidélité** : nouvelle recherche par mécanique et relectures rétroactives ; conserver chapitre/ID, provenance et décision. Plusieurs sols, roches, plantes et biomes restent prévus en G2 ; le ciel ne clôture pas météo/climat.
- **Tests et docs** : peu de scénarios profonds, pilote de colonie entretenu ; contrôles regroupés suivant [testing](development/testing.md). Mettre à jour contrats, guide, inventaire et preuves sans recopier les mêmes règles dans tout le dossier.

## Questions de conception ouvertes, sans bloquer le socle

Objectif d'une partie, tonalité fictionnelle, contraintes de verticalité, taille maximale de colonie/carte, profondeur des interactions sociales et matériel cible restent à préciser en jouant les prochains jalons. Aucun ajout d'étages, multijoueur, moteur physique global ou cloud obligatoire n'est présumé.

## Estimation de charge — 15 septembre 2026

Ordre de grandeur de co-lead demandé après trois jours de développement : **10–15 % du travail total**, **3–6 semaines supplémentaires pour une alpha avec une vraie boucle de colonie**, **3–6 mois supplémentaires pour approcher la cible Core en 3D**. Hypothèses : périmètre actuel, rythme soutenu avec sessions autonomes et retours joueur réguliers. Ce sont des fourchettes de planification à forte incertitude, pas des dates promises, une mesure du code ou un inventaire exhaustif de contenu. Elles incluent intégration, tests, correction et contenu ; elles ne supposent pas un débit constant extrapolé des premiers jours. Le niveau de finition final peut déplacer sensiblement la borne haute.

La masse restante concerne surtout G3–G5 : santé/corps/capacités, combat, équipement, relations/humeur, animaux, recherche/événements/commerce, monde et fins de partie ; G1/G2 restent eux-mêmes partiels. Réévaluer à partir du débit de lots réellement joués et intégrés, notamment après santé/combat. Le nombre de schémas, de commits ou de cases cochées ne mesure pas l'effort restant.
