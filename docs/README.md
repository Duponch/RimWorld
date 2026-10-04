# Documentation de Lisière

**V208 — loisirs télévisés, schéma 190, livré dans le périmètre ciblé.** [Contrat](development/television-v208.md), [recherche Core](research/television-core-v208.md), [preuve](history/validation-television-v208.md), [guide](gameplay/player-guide.md#regarder-la-télévision--v208). Construction matérielle, sièges frontaux réservés, courant et lassitude distincte ; visionnage au lit différé.

**V207 — couvert bas construit, schéma 189.** [Contrat](development/sandbags-v207.md), [recherche Core et adaptations](research/defensive-cover-core-v207.md), [preuve bornée](history/validation-sandbags-v207.md), [guide](gameplay/player-guide.md#construire-et-utiliser-un-couvert-bas--v207). Cinq tissus, chantier physique, couvert directionnel, dégâts et entretien ; la 53e scène **« Sacs de sable · construction et couvert »** est préparée. Tissu seul, positions tactiques adaptées ; barricades et SandbagRubble différés. Les contrôles ciblés passent ; parcours natif matériel et présentation passent, scène publiée, sans conclusion CPU/GPU générale. Après commit local, attendre la relance en mode jour.

**V206 — production de repas de survie, schéma 188, livré dans le périmètre ciblé.** [Contrat](development/packaged-survival-v206.md), [recherche Core et adaptation](research/packaged-survival-core-v206.md), [suivi des contrôles V206](history/validation-packaged-survival-v206.md), [guide](gameplay/player-guide.md#produire-des-repas-de-survie--v206). Une facture unitaire produit l’objet existant pour approvisionner les voyages. La 52e scène **« Repas de survie · production et voyage »** est publique et préparée ; ses résultats sont bornés dans la preuve, sans présumer campagne naturelle ni performance générale.

**V205 — lit d’hôpital, schéma 187.** [Contrat](development/hospital-bed-v205.md), [recherche Core et adaptation](research/hospital-bed-core-v205.md), [preuve V205](history/validation-hospital-bed-v205.md), [guide](gameplay/player-guide.md#construire-et-utiliser-un-lit-dhôpital--v205). La 51e scène publique préparée **« Lit d’hôpital · recherche et soins »** contient trois colons ; recherche, construction et traitement restent à accomplir.

**V203 — débouché textile, schéma 185.** [Contrat](development/caravan-sales-v203.md), [recherche Core](research/caravan-sales-core-v203.md), [preuve ciblée](history/validation-commercial-sales-v203.md), [guide](gameplay/player-guide.md#vendre-des-textiles-au-comptoir--v203). Chargement, vente, caisse du poste et retour des invendus réutilisent les propriétaires physiques V193. La 49e scène publique est préparée ; planète, groupes et commerce général restent ouverts.

**V202 — éruption solaire, schéma 184.** [Contrat électrique](development/solar-flare-v202.md), [référence Core](research/solar-flare-core-v202.md), [preuve bornée](history/validation-solar-flare-v202.md), [réserves et secours](gameplay/player-guide.md#traverser-une-éruption-solaire--v202). La 48e scène publique prépare une occasion mondiale future ; début, délestage et reprise restent physiques.

**V201 livré — animal sauvage en rage, schéma 183.** [Contrat](development/manhunter-v201.md), [recherche Core et adaptations](research/manhunter-core-v201.md), [preuve bornée](history/validation-manhunter-v201.md), [fuite, abri et défense](gameplay/player-guide.md#faire-face-à-un-animal-en-rage--v201). La 47e scène **« Animal en rage · abri et défense »** prépare le vrai démarrage après reprise. ThreatSmall, riposte et prédation restent distincts ; aucune Scaria, meute ou clôture de G3/G4.

**V200 — jauges et retouches visuelles, schéma 182 inchangé.** Lire le [contrat](development/needs-grass-clouds-v200.md), la [référence Core/API](research/needs-grass-clouds-v200.md) et la [preuve ciblée](history/validation-needs-grass-clouds-v200.md) : 17 repères hors Humeur, pigment terrain partagé et sang des seules racines tachées, rayon central des nuages à 31 %. Les règles de besoins et de sang physique ne changent pas.

**V199 — dossiers compacts et informations au survol, schéma 182 inchangé.** Lire le [contrat UI](development/colonist-ui-v199.md), le [relevé des quatorze captures et du Core](research/colonist-ui-core-v199.md) et la [preuve ciblée](history/validation-colonist-ui-v199.md). Palette pastel conservée ; les informations non simulées restent absentes.

**V198 — continuité et diagnostic CPU, schéma 182 inchangé.** Lire le [contrat](development/movement-continuity-v198.md), la [recherche Core et technique](research/navigation-cpu-gpu-v198.md) et la [preuve](history/validation-movement-v198.md). Distinguer attente normale au refuge, arrêt de contrôleur et coût du solveur ; le laboratoire GPU reste isolé.

**V197 — correction de continuité en mêlée, schéma 182 inchangé.** Lire le [contrat](development/melee-pursuit-v197.md), la [recherche Core](research/melee-pursuit-core-v197.md) et la [preuve](history/validation-melee-pursuit-v197.md). Les tests distinguent maintenant durée de poursuite, pauses indues et récupération réelle, au lieu du seul résultat final.

**V196 — sang, dépouilles et douleur, schéma 182 inchangé.** Lire le [contrat](development/visual-blood-v196.md), la [recherche Core/technique](research/visual-blood-core-web-v196.md) et la [preuve](history/validation-visual-blood-v196.md). La 46e colonie de test prépare les rendus et laisse accomplir repas, portage et coups. Le jeu réutilise les lots existants ; les coûts supplémentaires de données/sommets/pigment et les limites de culling sont explicités. La texture fine du terrain sur l’herbe est différée. [V195](development/healroot-domestic-v195.md) reste le point d’entrée de la culture médicinale.

La première expédition commerciale reste dans le périmètre du [contrat V193](development/caravan-trade-v193.md), de la [recherche Core](research/caravan-trade-core-v193.md) et de sa [preuve ciblée](history/validation-commercial-v193.md). Les possessions quittent et reviennent physiquement avec leur propriétaire ; devis, charge et stock du comptoir restent distincts des ressources coloniales. Les contrôles ciblés ne valent ni campagne naturelle ni commerce mondial exhaustif.

La boucle jouable du renard roux reste celle du [contrat V190](development/predation-v190.md) et de la [recherche Core](research/predation-core-v190.md) : poursuite, coups, dépouille et ingestion anatomique au contact. L’[inventaire](gameplay/implementation-status.md), la [roadmap](ROADMAP.md) et la [validation](development/validation.md) séparent contenu, priorités et preuves. Les contrôles graphiques de la [preuve V190](history/validation-predation-v190.md) restent datés ; leur réutilisation pour les contrats inchangés ne constitue pas une nouvelle exécution V191.

Contrats récents : [corrections visuelles et sonores V185](development/visual-audio-v185.md), [orage sec localisé V184](development/flashstorm-v184.md), [mix sonore V175](development/audio-v175.md), [continuité alimentaire du pilote V174](development/colony-food-continuity-v174.md), [gastronomique carnivore ×4 V173](development/lavish-carnivore-bulk-v173.md) et [végétarien ×4 V172](development/lavish-vegetarian-bulk-v172.md). Leurs résultats et limites figurent dans les preuves propres à chaque domaine. La [recherche préparatoire healroot](research/healroot-core-next.md) est historique ; le contrat V178 fixe son périmètre réalisé.

## Trouver la bonne information

| Besoin | Point d’entrée |
| --- | --- |
| Installer et lancer | [README du dépôt](../README.md) |
| Jouer | [Guide joueur](gameplay/player-guide.md) |
| Savoir ce qui est livré ou manque | [État fonctionnel](gameplay/implementation-status.md) |
| Choisir le prochain chantier | [ROADMAP](ROADMAP.md) |
| Vérifier un résultat | [Validation courante](development/validation.md), puis preuve du domaine concerné |
| Choisir les contrôles | [Stratégie de tests](development/testing.md) |
| Rechercher une règle Core | [Adoption du corpus](research/reference-adoption.md), puis recherche du domaine |
| Examiner le contenu | [Catalogue](gameplay/content-catalogue.md) et [matrice des 25 domaines](gameplay/systems-matrix.md) |
| Comprendre une adaptation | [Décisions de gameplay](gameplay/decisions.md), [architecture](development/architecture.md) |

## Organisation

- **gameplay/** décrit l’expérience présente et la cible. Une ligne de matrice ou une définition de catalogue n’est pas une livraison.
- **development/** fixe les contrats et les frontières techniques. Le [gastronomique mixte ×4 V171](development/lavish-meal-bulk-v171.md), le [raffiné carnivore ×4 V170](development/fine-carnivore-bulk-v170.md), le [raffiné végétarien ×4 V162](development/fine-vegetarian-bulk-v162.md), le [raffiné mixte ×4 V161](development/fine-meal-bulk-v161.md) et le [simple ×4 V160](development/simple-meal-bulk-v160.md) sont livrés dans leurs périmètres prouvés. Le [gastronomique végétarien ×4 V172](development/lavish-vegetarian-bulk-v172.md) est livré dans le périmètre de sa [preuve](history/validation-lavish-vegetarian-bulk-v172.md) ; le [carnivore ×4 V173](development/lavish-carnivore-bulk-v173.md) est livré dans le périmètre de sa [preuve](history/validation-lavish-carnivore-bulk-v173.md).
- **research/** conserve sources, versions et incertitudes. **reference/originals/** conserve le [corpus reçu](reference/originals/manifest.json) avec contrôle d’intégrité.
- **history/** conserve les preuves et leurs conditions exactes ; une validation passée ne certifie pas automatiquement une révision ultérieure.
- **decisions/** conserve les choix de conception et leurs remplacements.

## Reprendre le développement

Lire l’état fonctionnel et la feuille de route, puis le contrat et la recherche du domaine. Après un changement, actualiser le contrat, les points d’entrée concernés et la preuve de validation. `python scripts/check-docs.py` contrôle les liens, le corpus original et l’accord des six en-têtes courants avec le schéma du code ; il ne détermine pas si une affirmation fonctionnelle est à jour. Les synthèses et tables antérieures à V145 restent consultables dans l’[archive de l’index](README-pre-v145.md).
