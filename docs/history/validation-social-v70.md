# Preuves V70 — échanges passifs et opinions

19 septembre 2026. [Contrat](../development/social.md), [recherche et limites de version](../research/social-reference.md). Première tranche de l’étape 3 complétée avec V69 ; G0 en consolidation, G1/G2/G3 partiels, G4 accueil/raid partiels, G5 absent. Aucun jalon global clôturé.

## Fonctionnalité réellement exercée

Bavardage et discussion approfondie pendant les activités ordinaires ; présence, distance et vue, capacités, opinions dans chaque sens, cumul/décroissance, Social avec impact/XP, dernier échange et inspection. Sauvegarde V69 validée avant migration V70 sans passé social inventé. Référence après décès conservée, deuil absent.

Tests de domaine : cinq scénarios profonds dans `tests/social.test.ts`, associés aux contrats humeur/traits/compétences et aux anciennes migrations. Opinions asymétriques selon impact, XP de l’initiateur, humeur inchangée ; frontières de portée et obstacles/portes ; sommeil/incapacité/silence/hostilité/absence ; cap cumulatif et vieillissement, dix discussions, atténuation après quatorze jours ; PRNG indépendant, intention sans partenaire puis rencontre, reprise exacte ; rejets de données corrompues et lésion létale laissant l’identité référencée.

Première passe globale : **339/346**, 79 fichiers, 252,07 s. Les sept échecs viennent des constructeurs de fixtures historiques : ils rétrogradaient des mondes ayant désormais un état social, sans retirer cet état V70. Le helper de fixtures historiques retire maintenant ce champ et la compétence optionnelle ; le validateur de production continue de les refuser dans V69 et avant. **42/42 ciblés finaux**, onze fichiers, 6,35 s. Le pilote final a également passé dans la passe précédente, 42/43 ; son unique échec était une nouvelle fixture de décès injectant la perte de sang au même tick sans franchir son intégration. Remplacée par une vraie lésion létale du cœur, puis test final vert. Pas de seconde passe globale annoncée.

Autres corrections avant livraison : une fixture de capacité confondait PV et milli-PV ; elle représente maintenant une langue réellement absente. La frontière de six cellules supposée exclusive a été corrigée après lecture de `IntVec3.InHorDistOf` : elle est inclusive. Les anciennes assertions métier demeurent.

## Partie et présentation

`tests/raid-colony.test.ts`, seed42, carte250² : cinq jours pilotés par commandes de joueur, arrivée acceptée, quatre lits, production/consommation, raid naturel tick22600 →23080, puis repas/travail repris. Aucun souvenir ni échange injecté ; les quatre colons ont appris Social et formé des opinions. Aucun colon blessé dans cette graine : ce parcours ne prouve pas à lui seul les soins après attaque. [Preuve du camp](../../artifacts/raid-colony-v70.json). Les autres pilotes de plusieurs jours ont passé dans la régression globale.

UI native dans `tests/integration/social.spec.ts` à 1× et 6× : deux chantiers proches réellement engagés, échange en cours de travail, mémoire/opinions/XP inspectées, sauvegarde/rechargement en pause puis progression reprise. **Intention initiale en attente contrôlée**, distincte du pilote naturel. Première passe verte 21,7 s ; optimisation du panneau fermé ensuite testée, révélant l’absence de rafraîchissement à son ouverture pendant la pause. Correction : événement d’ouverture déclenchant la lecture actuelle, aucun calcul social par frame. Rejeu final **réussi en16,3 s**, puis captures dans [preuve UI](../../artifacts/social-ui-v70.json). Capture 1440×1000 inspectée : dernier échange, deux sens d’opinion, causes et compétence lisibles, FPS visible.

Garde spécialisée minage/abattage V68 réutilisée : aucune modification des interruptions, poses, horloge ou suppression des ressources. Le nouvel audit mixte exerce néanmoins le minage. Pas de nouvelle UI monolithique trois jours ; le parcours social réel et le pilote cœur de cinq jours sont distincts, sans les présenter comme une même preuve.

## Coût mesuré

Mesures successives, sources gelées pendant l’audit natif. Ryzen5 3600, Windows11 10.0.26200, Node24.11.1 ; WebGPU natif AMD RDNA1, viewport1440×1000, vitesse6×. Une passe inclut JIT/GC/ordonnanceur ; aucune amélioration attribuée au lot à partir d’une simple comparaison V69/V70.

`scripts/social-bench.ts` isole le passage social sur 6000 ticks, après60 de chauffe, 3/30/100 civils éveillés regroupés sur10×10, sans mémoire injectée. Besoins/déplacements non simulés dans ce microbanc ; il ne mesure pas le jeu complet. À100 : p50 **0,030**, p95 **0,073**, p99 **0,104**, max **1,251 ms** ; 1498 souvenirs après un jour,100 initiateurs. À3/30, p95 **0,0033/0,0162 ms**. Validation finale des mondes. [Données](../../artifacts/social-cpu-v70.json).

Audit mixte commun avec `RAIDS=1 BARRIERS=1 APPAREL=1 TRAITS=1 VALIDATION_VERSION=v70` :3/30/100 acteurs initiaux plus un assaillant réel,250²,240ticks. Destruction de barrières, réparation de cibles indépendantes, minage et approche de l’assaillant ; cette fenêtre ne représente **pas cent raiders ni une fusillade prolongée**. Aucun projectile émis dans ce profil court. Le premier intervalle est conservé séparément dans le JSON.

| Acteurs réels | Tick CPU mixte p95 / p99 / max (ms), hors20 premiers | Encodage p95 (ms) | Image native p95 / p99 / max (ms) |
|---|---|---|---|
|4|2,10 /3,71 /10,69|2,77|8,40 /12,50 /29,10|
|31|3,00 /13,86 /18,03|3,20|8,50 /16,70 /25,10|
|101|12,04 /20,39 /31,03|3,81|20,80 /33,40 /58,30|

À101, CPU incluant début : p95 20,19 /p99 38,02 /max43,03 ms ; scène native p95 9,50 /max14,60 ms ; callback snapshot p99 14,70 /max15,20 ms. Aucun nouveau pipeline ni erreur navigateur. Ces pointes empêchent de promettre6× constant ou fluidité parfaite. [CPU complet](../../artifacts/shooting-cpu-v70.json), [worker/scène/images](../../artifacts/shooting-native-v70.json).

## Limites maintenues

Deux interactions positives seulement, compatibilité sans âge biologique, Social débutant par défaut, inspection sans bulles3D. Pas de romance, insultes/bagarres, deuil, récréation sociale, effet d’opinion sur négociation/recrutement, narrateur complet ou nouvelles recettes. L’étape4 est maintenant prioritaire. Les scénarios démontrent les contrats exercés, pas l’absence de tout bug ni la parité exhaustive avec RimWorld.

Compilation finale TypeScript/Vite réussie,329modules ; avertissement connu de bundle dépassant500kB conservé. Contrôle documentaire :248documents,2552liens locaux,25IDs de domaine et5familles ; trois originaux byte-identiques. `git diff --check` propre.
