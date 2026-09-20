# V82 — création, reprise et premiers réglages de partie

20 septembre 2026, main, mode jour. Lot validé dans le périmètre décrit. Référence primaire : installation Core **1.6.4871**, fichiers et sauvegardes lus sans écriture ; [enquête](../research/core-reference-baseline.md), [rythme](../research/colony-pacing-reference.md), [contrat](../development/new-game-menus.md). Aucune source propriétaire ni sauvegarde personnelle brute publiée.

## Comportement intégré

Accueil sans colonie en cours ; scénario → narrateur/difficulté/mode → configuration locale → départ. Atterrissage forcé seul actif, adaptation partielle annoncée. Cassandra présélectionnée, Récit d’aventure et Rechargeable à tout moment requis ; autres choix grisés. Graine locale aléatoire éditable, carte 250², trois profils fixes. Monde, site et sélection de personnes complets restent absents.

`gameProfile` et scénario `crashlanded` persistés, distincts de Trois survivants. Arrivée à 06 h, temps écoulé zéro ; phase commune aux horaires, lumière/croissance, température et soleil. Six ticks locaux/s dans le bridge et le rendu, 6 000 ticks/jour : 16 min 40 s à 1×. Les anciennes parties conservent leurs ticks, calendrier civil, stocks et agendas ; leur débit réel est désormais lui aussi corrigé à six ticks/s.

Cible d’humeur +5 ; risque infectieux des colons ×0,75 au second tirage différé, pas à l’exposition initiale ni à la progression de maladie ; tir ami déjà 0,40. Occasions de raid J5,4, puis fenêtres de 4,6 jours dès J11 avec repos de six jours et espacement minimal 1,9 jour. Agenda indépendant des fins d’assaut. Sélection limitée aux raids, budget/composition historiques adaptés, richesse/adaptation absentes. Aucun accueil à délai fixe ni canicule garantie dans ce nouveau profil. Baies initiales tirées de 0,15 à 1,5 puis bornées à un ; pas de recalibration arbitraire du relief ou des arbres depuis un unique témoin.

Chargement à froid sans création factice, lecture/validation avant publication, pause acquittée, sauvegarde manuelle distincte de récupération. Refus restaure l’ancien emplacement de récupération ; erreur graphique après acceptation conserve le monde valide et son backup. V81 validée strictement avant migration neutre.

## Validation de simulation et de session

**80/80 contrôles sur 21 fichiers**, campagne centrale de 12,22 s. Contrats de profil/agenda/migration, infection/soins, humeur, calendrier/growth/schedules, session/rollback/concurrence et clock/poses GPU. Build et typage passent après la dernière correction ; avertissement Vite de gros bundle conservé, pas présenté comme une régression mesurée. Contrôle documentaire : 291 documents, liens locaux vérifiés, trois originaux préservés octet pour octet ; `git diff --check` sans anomalie.

Le contrôle nouveau de précision GPU a d’abord rencontré un écart de **6,10 µs** dû au float32 à 170,65 s ; l’oracle utilise désormais l’ULP mathématique 2⁻¹⁶ s au lieu d’une tolérance arbitraire de cinq µs. Les assertions de synchronisation et de frappe restent actives. Le diagnostic de récupération d’historique bloque 2,5 s au lieu de 1,6 s pour franchir encore plus de 64 ticks à 36 ticks/s ; aucune assertion métier retirée.

## Joueur partagé et huit jours naturels

Deux contrôles courts du pilote historique (préparation et ancre) puis un parcours **250², graine42, 48 000 ticks**, sans injection d’événement, ressource, besoin ou lésion : **3/3 réussis**, 121,02 s de campagne. Ce joueur réemploie les décisions d’abri/réserve/potager et prépare physiquement revolver/gilet ; il mobilise sur l’alerte, autorise les tirs, démobilise après l’assaut. Conservation du bois, nourriture, acier/composants et reprise exacte sur chaque checkpoint journalier sont contrôlées.

Correction du pilote établie avant ce parcours : `{kind, ...resource}` écrasait l’ordre demandé avec `tree` ou `berries` ; seules x/z sont copiées désormais. L’échec de l’ancien essai J7 reste dans la [preuve du diagnostic](reference-audit-2026-09-20.md). Cette correction ne modifie aucune règle de production.

| Transition observée | Tick écoulé |
|---|---:|
| Trois lits achevés | 750 |
| Dortoir couvert et fermé | 1 750 |
| Premier repas cuisiné avec baies | 2 000 |
| Stocks acier/composants rangés | 6 500 |
| Première occasion de raid et attaque | 32 400 (J5,4) |
| Assaut terminé observé par le pilote | 33 000 |
| Fin du parcours | 48 000 (huit jours) |

Bilan : trois colons vivants, sept repas simples cuisinés, 77 unités récoltées, huit rations encore présentes, vingt plants à **79,2–80,0 % de croissance**. Aucun riz récolté dans ce parcours : les vingt cases sont un premier potager, pas une alimentation durable démontrée. Terrain, date de semis, lumière et température devront être confrontés à la référence en poursuivant cette observation, sans accélérer la croissance pour atteindre une date arbitraire. Un seul parcours de huit jours ne définit pas un « joueur moyen », un équilibrage universel ou un scénario Crashlanded complet. [Rapport](../../artifacts/crashlanded-colony-v82-42.json).

## UI native et performances

Parcours natif groupé **réussi (1,3 min)** : vrai accueil froid sans monde ni canvas, choix obligatoires/retours/clavier, viewport480×800 sans débordement, graine refusée, double clic créant un seul monde, profil exact au tick0/06:00, cinq décisions physiques et trois lits, sauvegarde/reprise, pause du menu y compris Espace/F1, chargements froids courant et véritable checkpointV81. Les refus de JSON invalide et de version future conservent exactement monde et deux emplacements. Aucune erreur console/page. Sources figées, un renderer à la fois, CPU/long pilote/natif successifs. [Rapport](../../artifacts/scenario-ui-v82.json), [accueil](../../artifacts/scenario-home-v82.png), [choix](../../artifacts/scenario-story-v82.png), [fenêtre étroite](../../artifacts/scenario-config-narrow-v82.png), [jeu](../../artifacts/scenario-start-v82.png), [ancienne partie](../../artifacts/scenario-historical-v82.png).

Premier essai natif refusé à juste titre : les technologies connues étaient affichées « Terminée » car la projection ne reconnaissait que `survivors`. `research-panel` reconnaît aussi `crashlanded`, sans retirer l’assertion « Acquise au départ » ; parcours entier rejoué. [Échec conservé](../../artifacts/scenario-ui-v82-failed-1789896133260.json). La relecture du résultat a aussi remplacé les exceptions JSON techniques par un refus compréhensible en français ; le parcours complet a de nouveau réussi après cette dernière correction d’interface.

Petit départ, fenêtres successives de dix secondes lors du dernier parcours : **5,97 / 36,03 ticks/s** pour cibles6/36 ; image p95 **8,4 / 8,4 ms**, maximum **12,6 / 12,7 ms**. Un lancement mesuré à **4,26 s** regroupe génération, transmission et préparation graphique ; ce n’est pas un percentile de génération. WebGPU natif, Chromium153, viewport1440×1000. La [passe précédente](../../artifacts/scenario-ui-v82-before-error-polish.json) reste conservée : p95 **8,7 / 12,8 ms**, maximum **16,7 / 24,8 ms**. Ces fenêtres courtes variables ne garantissent pas une fluidité parfaite.

Banc natif mixte, AMD RDNA1 et Ryzen5 3600 :

| Personnes | Image p95 / maximum (ms) | Moyenne de tick des lots worker p95 / maximum (ms) | Adoption snapshot p95 (ms) |
|---:|---:|---:|---:|
| 3 | 4,3 / 20,9 | 1,90 / 21,9 | 0,10 |
| 30 | 8,5 / 29,3 | 11,00 / 46,1 | 0,10 |
| 100 | 20,8 / 50,0 | 25,33 / 62,4 | 1,90 |

Les 1/5/17 patients sont soignés, 1/10/33 vêtements finis et recherche progressée ; buffers stables, aucun pipeline tardif, aucune erreur ni état invalide. 650 ticks visés par effectif, 90 images d’échauffement, demande6× ; débit global observé d’environ35,2–35,6ticks/s. La statistique worker est une moyenne de lot publié, pas un percentile indépendant de chaque tick. Aucun gain général ni fluidité parfaite déduit : charge sans animaux, pics conservés, navigation/tirs encore à surveiller. [Données](../../artifacts/infection-render-v82.json).

CPU : même fixture médicale/ateliers que V81, 650 ticks par effectif, 100 ticks d’échauffement séparés, snapshots toutes les cinq étapes, carte250². À 3/30/100 personnes : tick p95 **0,86 / 6,67 / 18,31 ms**, maximum **9,37 / 30,41 / 37,65 ms** ; snapshots p95 **1,66 / 3,80 / 6,14 ms**. Les 1/5/17 patients reçoivent un soin et les ateliers continuent. Mesure unique, sans animaux ; pas de gain général inféré sur navigation/tirs. [Données/matériel](../../artifacts/infection-cpu-v82.json).

## État global et limites

G0 en consolidation ; G1/G2/G3 partiels ; G4 engagé, G5 absent. Aucun jalon clos, estimation fonctionnelle inchangée dans ROADMAP. Déjà jouables : survie physique, travaux, culture/cuisine, chasse/boucherie, recherche/confection, combat et soins/infection. Restent notamment catalogue initial complet, biomes/espèces/ressources calibrés, monde/site/personnes, narrateur/difficulté complets, météo/saisons/incendies, prisonniers, commerce et caravanes. Ce lot livre une entrée dans le jeu et des corrections vérifiées, pas une conformité totale au Core.
