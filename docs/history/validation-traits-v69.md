# Validation V69 — personnalité active

19 septembre 2026. Première tranche de l’étape 3, six traits et leurs consommateurs existants ; les interactions/opinions restent ouvertes. [Contrat](../development/traits.md), [recherches](../research/traits-reference.md). G0 consolidation, G1/G2/G3 partiels, G4 accueil/raid partiel, G5 absent. Aucun jalon clos.

## Scénarios et colonie

Première passe ciblée **25/25** (3,41 s), puis construction/soins/tir/mêlée/réparations et pilote : **50/50**, dix fichiers, **35,16 s**. Cinq nouveaux scénarios regroupent familles incompatibles/inconnus, frontières strictes et proportionnelles, gel du sommeil, vraie entrée en errance à humeur 40 pour Nerveux, absence d’exposition du témoin neutre, passion/saturation/oubli/minuit/plafond, producteurs physiques des quatre compétences, reprise et snapshots, offre et migration neutre. Les tests de producteurs comparent à même compétence et même passion, sans attribuer un gain pendant le trajet.

Le premier lancement sandbox de Vitest a refusé le sous-processus Vite (`spawn EPERM`) avant toute exécution. Relance autorisée réussie. Le contrôle TypeScript a également détecté des rétrécissements de type dans les nouvelles fixtures après suppression d’un état facultatif et une annotation de bâtiment trop étroite : fixtures corrigées ; pas d’assertion métier supprimée.

Pilote maintenu : cinq jours, graine 42, 250², profils ordinaires actifs et quatrième colon accueilli. Le pilote choisit les affectations en tenant compte de l’apprentissage en cas d’égalité et prévoit une heure de loisirs pour les personnes nerveuses. Construction, repas, ressources, horaire, sauvegarde, raid et reprise sont contrôlés. Raid tick **22 600**, issue **23 080** ; mêmes échéances qu’en V68, aucun colon blessé sur cette graine. Les soins sont donc prouvés séparément par les scénarios physiques de clinique/rencontre, pas attribués à ce parcours. [Rapport](../../artifacts/raid-colony-v69.json). Le checkpoint de raid et son lecteur UI utilisent désormais le même `VALIDATION_VERSION`, afin de ne pas relire une ancienne préparation.

## Interface native

UI WebGPU à **1× et 6×**, premier passage réussi en **28,5 s**. Vérification du nouveau camp réellement créé par le worker, traits et pensées inspectables, choix d’horaire réel, deux chantiers comparables ordonnés par la UI, reprise en construction, deux lits achevés sans matériaux résiduels et nouvelle offre produite par le worker. Traits annoncés avant acceptation et conservés sur l’arrivant/sauvegarde. À travail/compétence identiques, les XP constatées sont 245 000 contre 35 000 milli-XP, ratio 7 entre facteurs 1,75 et 0,25. Aucun message navigateur en erreur. [Rapport](../../artifacts/traits-ui-v69.json).

Ce test emploie une préparation contrôlée des chantiers et un calendrier raccourci pour observer les transitions. Ce n’est pas une nouvelle exécution monolithique de cinq jours dans le navigateur. La capture visuelle a motivé un ajustement de lisibilité : traits en premier dans Biographie et titre conservé pendant le défilement. Aucun shader ni pose changé.

## Charge mixte mesurée

Mesures successives, sans pilote concurrent ; sources gelées pendant la capture native. Ryzen 5 3600, Windows 11 10.0.26200, Node 24.11.1 ; WebGPU natif AMD RDNA1, 1440×1000, vitesse 6×. `RAIDS=1 BARRIERS=1 APPAREL=1 TRAITS=1 VALIDATION_VERSION=v69` active les mêmes charges que V68, avec traits sur les 3/30/100 acteurs initiaux. Un assaillant neutre rejoint la carte, soit 4/31/101 acteurs. 240 ticks, vrais dégâts/réparations/minage, sans reset ; l’assaillant est encore en approche, ce n’est pas cent combattants. CPU : premiers vingt ticks séparés ; natif : quatre-vingt-dix frames de chauffe.

| Acteurs après arrivée | Tick CPU p95 / p99 / max (ms) | Encodage p95 (ms) | Image p95 / p99 / max (ms) |
|---|---|---|---|
| 4 | 3,20 / 6,41 / 11,03 | 3,45 | 8,40 / 12,40 / 24,90 |
| 31 | 3,86 / 16,05 / 17,86 | 3,22 | 8,40 / 16,80 / 33,30 |
| 101 | 15,63 / 23,96 / 39,84 | 3,37 | 33,30 / 50,10 / 70,90 |

[CPU](../../artifacts/shooting-cpu-v69.json), [worker/scène/rendu](../../artifacts/shooting-native-v69.json). À 101 acteurs, adoption de scène p95 10,70 ms, callback snapshot p95 14,70 ms ; ils ne doivent pas être additionnés au temps d’image. Aucun nouveau pipeline ni erreur navigateur. Passage natif réussi en 44,6 s. Le p95 CPU est inférieur à la mesure V68, le p95 image supérieur : passages uniques avec JIT/GC/OS, **aucun gain attribué aux traits**, aucune promesse de 6× stable. Les pointes restent ouvertes.

La garde autonome de récolte V68 n’est pas rejouée : ce lot ne change pas trajet, suppression de ressource, pose ou horloge. Les interruptions de crise sont exercées dans la famille existante. La mesure courte ne remplace pas cette garde ni une couverture exhaustive des activités.

## Contrôles de livraison

Compilation TypeScript/Vite réussie après intégration (325 modules ; avertissement de bundle volumineux connu). Sources originales du corpus conservées. Contrôle documentaire : 245 documents, 2 528 liens locaux, 25 identifiants de domaine et cinq familles de validation ; trois originaux byte-identiques. **Passe globale finale : 341/341**, 78 fichiers, 220,25 s ; les migrations historiques et les autres parcours de colonie passent. Aucun changement de simulation après cette passe. Dernier contrôle natif après ajustement de lisibilité : **1/1**, 25,4 s, recouvrant 1× et 6× ; titre Biographie visible pendant le défilement, texte des traits lisible. Compilation finale réussie ; `git diff --check` sans anomalie.
