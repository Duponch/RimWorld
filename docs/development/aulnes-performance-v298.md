# V298 — attribution CPU et GPU des Aulnes

**Les pointes de travail du thread principal restent prioritaires. Les ombres ne constituent pas le gros coût GPU.** À ×6, le callback graphique complet atteint un p95 de13,7/16,2 ms dans les témoins, alors que préparer et soumettre le dessin prend1,97/2,07 ms en moyenne. Les passes GPU observées prennent3,78 ms, dont0,267 ms pour les ombres. Diagnostic seulement : produit [V296](aulnes-performance-v296.md), schéma218 et63sauvegardes/66fichiers conservés, **aucun FPS supplémentaire livré**.

## Mesure actuelle

Base exacte `4f8ce762`, produit `b6ac00bf` inchangé. Quatre cohortes fraîches **A/T/T/A** : Chrome matériel AMD RDNA1/WebGPU,2560×1440/DPR1/dev, caméra129/122/zoom1. Chaque phase pause/×1/×6 recharge la référence publique au tick8434, chauffe3s puis mesure8s. A garde seulement les timers CPU légers ; T ajoute timestamps natifs et recensement des passes. Ce n'est pas un comparatif de deux versions du produit.

| Cohorte | Pause RAF/s | ×1 RAF/s | ×6 RAF/s | Débit réel ×6 | p95 intervalle ×6 | Recharge exacte |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 |240,00|221,38|125,00|6,034×|21,3 ms|8843|
| T1 |240,00|214,75|126,63|6,101×|20,7 ms|8987|
| T2 |240,00|215,75|120,00|5,935×|23,5 ms|8995|
| A2 |239,88|220,00|126,00|5,916×|23,1 ms|8862|

Le débit utilise les ticks confirmés et le temps réel jusqu'au relevé final, distinct de la fenêtre nominale des RAF. Les écarts autour de×6 restent visibles : aucun ×6 constant certifié. Ticks et scènes évoluent différemment entre vitesses. Ces chiffres ne remplacent pas les comparaisons GAME sans instrumentation de V296 et ne prouvent ni une régression produit, ni un écran240Hz physique.

## CPU et GPU séparés

Moyennes agrégées des deux cohortes correspondantes. Le temps CPU render est **inclus** dans le callback Core ; CPU et GPU se chevauchent et ne s'additionnent pas.

| Phase | CPU Core, A | CPU render externe, A | GPU passes observées, T | GPU ombres, T |
| --- | ---: | ---: | ---: | ---: |
| Pause |1,26 ms|1,09 ms|2,45 ms|aucune passe|
| ×1 |2,26 ms|1,74 ms|2,80 ms|0,201 ms|
| ×6 |4,15 ms|2,02 ms|3,78 ms|0,267 ms|

À×6, le résidu du callback hors render vaut2,124 ms en moyenne et12,5 ms au p95. Il comprend notamment l'application différée de scène, mais n'est pas un timer isolé de `applyWorld`. Il exclut validations, livraisons et autres tâches entre les RAF. Le [profil V297](aulnes-performance-v297.md) reste complémentaire pour les attribuer.

Le cache natif réutilise les ombres en pause stabilisée ; la lecture les recalcule. Les premiers compteurs passent de52 à100 draws. Cependant, la passe principale prend environ3,34 ms GPU à×6, contre0,267 ms pour les ombres. Le nombre de draws seul ne mesure pas le coût GPU ; aucune réduction de fréquence ou de qualité n'est justifiée.

La somme des passes à×6 a un p95 de5,308 ms ;921 des1974 frames T dépassent4,167 ms, budget nominal de240 images/s. La marge GPU reste donc à surveiller. Ces durées dépendent de la scène, de la charge et d'une fréquence matérielle non mesurée : ce n'est pas un plafond rigide extrapolable à une autre cadence CPU. Quantification native conservée, aucune précision nanoseconde revendiquée.

## Couverture et perturbation

Le vrai `ReentrantRenderer` reste en place. Deux sources seulement reçoivent des hooks privés avec inverse intégral exact : Core et création du renderer. Ombres, culling, ordre, shaders, qualité et cadence restent natifs. Les UID/paires de queries correspondent aux vrais begin/end/finish/submit ; le scalaire de la dernière frame n'est pas utilisé comme corpus. Le réemploi d'indices après résolution est distingué des collisions. Readbacks périodiques par tâche hors RAF pendant les fenêtres, puis drain final.

Les six fenêtres T couvrent toutes les **passes physiques observées** : callbacks Core, passes uniques terminées/soumises/résolues, aucune issue ni erreur. Main/shadow/other sont comptés une seule fois ; aucune passe compute. Uploads, copies, attente de file et compositor restent hors durées : ce n'est pas le GPU busy total. La catégorie other n'est pas arbitrairement renommée en passe principale.

L'observation coûte : à×6, CPU Core T environ+9,27 %, CPU render+9,86 %, RAF A125,50→T123,31 (−1,74 %). Les timings GPU sont utiles mais ne sont pas des FPS non perturbés. Le device réel rapporte AMD RDNA1 et timestamp-query effectif ; le `requestAdapter` de contrôle est un témoin distinct. Aucun gain produit n'est déduit de A/T.

## Validation

Rapport `tmp/performance-v298/gpu-current/run-sxwKIy/report.json`, SHA **43BC6BF5**, **PASS334,067s**. Gel **CF9AF034**, `freeze-Ln5oc4`,1169entrées ; typage **PASS1,302s**, gel **PASS0,393s**. Recette Core/Colony et JS servis conservés ; empreintes sources/publics/harness identiques avant/après. Quatre sauvegardes/recharges exactes, erreurs vides, Chrome et Vite5338 possédés fermés. Revues statique et de résultats privées sous `tmp/performance-v298`.

Aucun fichier produit, test ou sauvegarde modifié : les campagnes inchangées ne sont pas rejouées. Documentation **PASS0,904s** avant commit. Ce parcours est une attribution actuelle, pas une campagne de gameplay ni un gain de performance.

## Décision

Prioriser un retrait groupé de recaptures et préparation de scène. Le profil courant place `updateResources` à1116 ms, cultures324 ms, éclairage239 ms et portes221 ms dans3302 ms d'application depuis RAF ; poids échantillonnés de branches, pas nouvelles durées instrumentées. Supprimer une traversée de matrices dans l'ombre ne vise qu'une petite part du budget. Toute préparation déplacée vers un Worker doit payer ses transferts et préserver le débit Source ; aucune marge gratuite présumée.

Commit et push documentaires. Pas de publication Cloudflare pour ce diagnostic ; site sur V296, publications regroupées et relance planifiée en pause. L'autorisation humaine de poursuivre les optimisations reste applicable.
