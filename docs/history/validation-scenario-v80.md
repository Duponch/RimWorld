# Validation — départ Trois survivants V80

20 septembre 2026. Périmètre : scénario, paysage initial, stocks/connaissances, sauvegardes et premières journées ; pas une certification de difficulté RimWorld ni une couverture exhaustive. [Contrat](../development/scenario-start.md), [recherche](../research/scenario-start-reference.md).

## Contrôles courts et revue

- Campagne groupée finale sur les sources intégrées : **24/24**, sept fichiers, 37,70 s. Scénario/dotation, génération historique et naturelle, sauvegardes/migration, snapshots, plantes et faune. Les passes préparatoires 21/21, 3/3 et la revue ciblée 6/6 restent dans les journaux, sans être comptées comme des tests supplémentaires.
- Préparation du pilote : **1 test, trois graines** 42/93/2048 ; cinq commandes réellement acceptées, réserve vide de 24 cases, trois lits planifiés, potager de 20 cases et ancre retrouvée après sauvegarde. Aucun parcours long déduit de ce contrôle.
- Build avec typage réussi ; avertissement de bundle principal >500kB conservé. Vérification documentaire réussie ; les trois originaux restent identiques octet par octet.
- Revue croisée : URL hors uint32 refusée au lieu d'être tronquée ; une création refusée ne remplace plus la sauvegarde «Colonie précédente». Les connaissances initiales sont présentées comme acquises, sans XP/travail inventés. Anciens fichiers UI et bancs demandent explicitement `scenario=camp`, tandis que `?e2e` seul garde le vrai défaut joueur.

## Vraie interface et présentation

`scenario-start.spec.ts` : **1/1**, Chromium natif/WebGPU,1440 × 1000, environ 1,1 min. Démarrage par défaut 250², technologies connues, menu, refus sentinelle 32² conservant état et sauvegarde précédente, alternance de scénarios avec mêmes graine et taille, cinq décisions du pilote commun, trois lits achevés, sauvegarde/rechargement exacts, progression 1×/6×. URL invalide vérifiée sur une page distincte. Aucune erreur JS/GPU recueillie.

[Capture](../../artifacts/scenario-start-v80.png), [mesures UI](../../artifacts/scenario-ui-v80.json). Trois personnes et 12 lièvres, terrain naturel de 3 751 ressources. Fenêtres de 10 s : image p95 **12,0 /12,1 ms**, p99 **12,1 /12,1 ms**, pics **108 /102 ms**, vitesses 1×/6×.103 / 621 ticks observés sur les fenêtres avec commandes/polling aux frontières. Ces pointes sont conservées : ce relevé court avec instrumentation UI n'est ni une garantie de fluidité parfaite ni un audit de foule.

Matériel de l'hôte : Ryzen 5 3600,16 Go, Windows, Node 24.11.1 ; Chromium natif sans SwiftShader forcé, backend WebGPU. L'adaptateur précis n'est pas redemandé dans cette capture ; les audits natifs précédents identifiaient AMD RDNA1. Ne pas déduire un nouveau débit à 100 acteurs de ce test à 3 personnes.

Le parcours historique de nouvelle colonie est également **1/1**, 21 s : tailles 128/200/250, graine maximale uint32, sauvegarde puis retour exact au camp compact. Première exécution refusée par son assertion de chantier : le helper `startPaused()` utilisait encore une URL sans scénario et ouvrait donc le nouveau terrain. Tous les points d'entrée historiques demandent désormais explicitement `scenario=camp`, y compris lorsque `size` précède `e2e`. Le test de défaut Survivants garde son URL sans scénario ; aucun traitement spécial du jeu pour le test n'a été ajouté.

## Génération et densités

[Audit sur cinq graines](../../artifacts/scenario-generation-v80.json)42/93/2048/81733/0 en250², hashes sources et conditions joints. Les sorties historiques, générateur puis faune, restent strictement identiques après neutralisation du seul numéro de schéma. Les nouveaux mondes sont valides et reproductibles ; aucun terrain n'est retouché pour loger personnes ou provisions.

Profil naturel : **2249–2652 arbres**, **193–216 buissons**, dont 76–88 récoltables initialement. Le profil ancien comptait 7 083–8 197 arbres et 3 158–3 366 buissons mûrs. Proportion d'arbres voisins immédiats 34–40 %, contre 72–79 % auparavant : indicateur spatial, pas gain de FPS. Douze lièvres demeurent une calibration d'espèce unique. Le site conserve une rivière ; les autres biomes restent absents.

Mesures ponctuelles 27–45 ms paysage,39–70 ms usine complète selon graine ; cinq points non isolés, pas de percentiles robustes ni gain généralisé revendiqué. Les détails de distances, ressources exploitables, accès et réserves sont dans l'artefact. L'audit lourd V79 à 100 personnes / 100 animaux reste la dernière preuve de charge mixte (CPU p95 62,29 ms, image p95 29 ms) : il ne tient pas 6×. V80 change la création, pas les algorithmes de navigation/tir de cet audit.

## Parcours de colonie

`survivor-colony.test.ts` : **5/5**, dont deux contrôles de préparation/transition et trois parcours de trois jours sur **42, 93 et 2048**, 151,09 s. Les tests conservent les bilans bois/aliments/acier/composants, les besoins et la reprise exacte sur 100 ticks à chaque journée. Tous les ordres sont ceux du joueur ; aucune dotation ni besoin n'est modifié par le pilote.

| Résultat au tick 18 000 | 42 | 93 | 2048 |
| --- | ---: | ---: | ---: |
| Lits sous toit | 3 | 3 | 3 |
| Murs / porte / cases couvertes | 15 / 1 / 25 | 15 / 1 / 25 | 15 / 1 / 25 |
| Riz planté | 20 | 20 | 20 |
| Acier / composants / médicaments rangés | 450 / 30 / 30 | 450 / 30 / 30 | 450 / 30 / 30 |
| Rations restantes | 32 | 33 | 32 |
| Repas réellement ingérés par personne | 6 | 6 | 6 |
| Premiers trois lits achevés, tick observé | 2 000 | 2 000 | 750 |
| Abri achevé, tick observé | 3 000 | 3 750 | 3 000 |
| Matériaux rangés, tick observé | 3 750 | 9 750 | 5 000 |

[Journée par journée, graine 42](../../artifacts/survivor-colony-v80-42.json), [93](../../artifacts/survivor-colony-v80-93.json), [2048](../../artifacts/survivor-colony-v80-2048.json). Le jardin est engagé, mais **aucun repas simple n'est produit pendant ces trois jours** ; sept baies sont récoltées puis consommées sur 93. Ces résultats ne prouvent pas une boucle alimentaire autonome dans ce nouveau scénario. Les preuves cuisine/chasse précédentes restent distinctes ; une première semaine et la défense de ce départ restent à jouer.

**Échec conservé :** les trois premières exécutions avaient développé quatre ou cinq lits et laissé le dortoir inachevé. L'ancre du pilote suivait le plus petit identifiant d'un lit, alors qu'un plan/cadre change d'identité à l'achèvement. La politique décalait son propre plan. Correction du pilote par coordonnées stables, contrôle court de vraie construction et sauvegarde, puis rejeu complet des trois parcours ; aucune assertion d'abri n'a été retirée. [Échec 42](../../artifacts/survivor-colony-v80-initial-42.json), [93](../../artifacts/survivor-colony-v80-initial-93.json), [2048](../../artifacts/survivor-colony-v80-initial-2048.json). La simulation n'a pas été modifiée pour faire réussir cette politique. `SURVIVOR_CHECKPOINT` permet une reprise avec son journal et ses bilans.

La preuve UI précède cette correction de politique, mais son seul lot initial de cinq commandes est inchangé. Les transitions de l'ancre et les phases suivantes ont été contrôlées dans les parcours cœur, pas présentées comme une nouvelle simulation intégrale de trois jours dans le navigateur.

## Limites

Catalogue initial incomplet, profils écrits, une espèce animale, flore sans catalogue d'espèces et unique profil tempéré. Départ à minuit local, saisons/planète/difficulté/narrateur Core non reproduits. La viabilité de troisjours ne prouve ni autonomie alimentaire durable ni difficulté universelle. G0 en consolidation ; G1/G2/G3 partiels, G4 engagé, G5 absent.

## Cadence du lot

Environ 34 minutes de reprise à publication, dont recherche/conception et audits courts menés en parallèle, puis intégration et validation groupée. Les exécutions longues utiles totalisent environ cinq minutes avec le rejeu du pilote ; UI et vérifications ciblées s'y ajoutent. Deux reprises évitables ont été identifiées : ancre du pilote et URL historique oubliée. Ce seul lot ne mesure pas un gain généralisable de vitesse ou de tokens. La préparation médicale suivante reste de la recherche, pas du gameplay V80.
