# V296 — préparation graphique des Aulnes

V296 est retenue : **123,18→133,00 images RAF/s (+7,97 %)** sur Les Aulnes intégrées, avec un débit effectif **6,074→6,080×**. La moyenne des p95 d'intervalles passe de **21,0 à 18,5ms**. Base exacte `e666e457` : produit [V295](aulnes-performance-v295.md), renommé Elsewhere et déployé, avant les trois feuilles graphiques de ce lot. Simulation, cadence, règles, qualité, population et schéma 218 restent inchangés ; les 63 sauvegardes/66 fichiers publics sont préservés. **240 FPS et une fluidité constante ne sont pas atteints** ; aucun gain GPU mesuré.

## Cause actuelle et changement

La première capture V296, `tmp/performance-v296/profile/main-8Psn1o`, termine son parcours mais contient un delta négatif de −143µs à l'index350. Elle est écartée de toute attribution CPU ; brut et sorties restent intacts, sans correction ou exclusion de cet échantillon.

Une capture neuve post-déploiement est qualifiée dans `tmp/performance-v296/analysis/report-nDaDpa/report.json` : 9 390 échantillons, 1 308 nœuds, 198 sources compilées capturées et vérifiées, aucun delta négatif ou invalide. La partition causale exclusive attribue **24,09 % à la préparation/soumission Three**, **20,23 % à l'adoption**, **17,32 % à l'application de scène**, **6,07 % à UI/audio**, **13,80 % aux autres chemins du jeu/handler**, puis **18,49 % au résidu**. L'application de scène intervient principalement depuis RAF. Ce sont des poids échantillonnés sur 14,942s, bords conservés ; les tableaux inclusifs ne s'additionnent pas et aucun temps GPU n'en est déduit.

La priorité retenue est la préparation graphique commune. Certaines valeurs étaient contrôlées par objet alors qu'elles sont communes à toute la scène pendant un rendu. Le changement utilise l'API native **`renderGroup`** de Three pour les seules dimensions/bornes de l'éclairage spatial et les trois uniformes du vent des ressources. Cinq attributs de transfert de cargo passent de `DynamicDrawUsage` à `StaticDrawUsage` : leurs écrivains publient déjà chaque changement par `needsUpdate`, ce qui évite les uploads forcés entre deux changements.

Aucune équation graphique ni animation n'est modifiée. Matrices, caméras, matériaux, textures et autres uniformes conservent leurs chemins historiques. Aucun groupe personnalisé, framework de résidence, clone, Worker ou cache métier n'est ajouté. Le prototype Crop comparant 19 valeurs par plante reste privé, gelé et non exécuté : son coût mesuré n'en faisait pas la meilleure priorité.

## Contrat graphique

Dans Three 0.186.0, `renderGroup` est partagé et actualisé une fois par **renderId**, avec suivi distinct par binding. Les passes ombre/main et rendus imbriqués restent sous la gestion native de Three ; les layouts ou sous-ensembles d'uniformes ne sont pas confondus. Les valeurs ciblées sont écrites avant le rendu par les writers existants. La texture d'éclairage n'est pas déplacée dans ce groupe ; changement de dimensions, invalidation, compilation et réemploi de matériaux gardent leurs opérations ordinaires. Sources primaires : implémentations installées `UniformGroupNode`, `UniformNode`, `NodeFrame`, `NodeManager`, `NodeBuilderState`, `Bindings` et `Attributes`, ainsi que les documentations officielles [UniformGroupNode](https://threejs.org/docs/pages/UniformGroupNode.html) et [UniformNode](https://threejs.org/docs/pages/UniformNode.html), consultées le 10 octobre 2026.

Les tableaux cargo, leur ordre, les domaines actifs, horloges et points de publication sont inchangés. La croissance de capacité crée des attributs neufs en copiant données et usage ; le backend effectue alors son upload initial. Les transferts partiels sont republiés lorsqu'ils deviennent actifs, changent d'origine temporelle ou expirent. Le domaine reste celui des writers ordinaires recensés du jeu : aucune équivalence n'est prétendue pour une mutation extérieure sans `needsUpdate` des tableaux cargo exposés ou une écriture par réflexion des uniformes privés entre deux objets d'un même rendu. Les trois copies et leurs inverses sont exacts ; les revues indépendantes ne trouvent aucun blocage statique.

## GAME original

Comparaison neuve A/B/B/A sous `tmp/performance-v296/game-native/abba-8k89La`, gel **78B95752** (`freeze-2udZzP`). Chaque cohorte utilise Chrome matériel AMD RDNA1/WebGPU, 2560×1440/DPR1/dev, source Aulnes8434, caméra129/122/zoom1, chauffe3s puis fenêtre14s. Les trois modules gardent leurs IDs canoniques. Mode **fps-only** : client original, aucun timer d'adoption ou profil dans les fenêtres ; vitesse calculée depuis les ticks confirmés et le temps écoulé.

Le rapport `game-native/abba-8k89La/report.json`, SHA **1AE6AF2C**, est **PASS227,174s** : agrégation pondérée **123,1809→133,0021 RAF/s (+7,97 %)**, débit effectif **6,0740→6,0802×**, moyenne des p95 **21,0→18,5ms**.

| Cohorte | RAF/s | Débit effectif | p95 intervalle | Pire intervalle | Recharge exacte |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 |117,87|6,041×|22,2ms|52,9ms|9055|
| B1 |130,35|6,071×|19,7ms|45,9ms|9051|
| B2 |135,65|6,089×|17,3ms|45,6ms|9051|
| A2 |128,50|6,107×|19,8ms|47,7ms|9049|

Les deux B dépassent les deux A, mais la dispersion de la base **117,87→128,50 RAF/s** invite à conserver le caractère local de ce résultat. Quatre reprises exactes, erreurs vides, sources/publics inchangés et navigateurs/Vite possédés fermés. Ce résultat ne s'additionne pas aux gains des lots précédents. Le vrai ×6 est conservé ; des intervalles B dépassant 45ms persistent. Ni un écran240Hz physique, ni toutes les vues ou parties ne sont certifiés.

Le changement retire du travail CPU de préparation et d'upload, mais le GAME n'isole pas la durée CPU gagnée et ne mesure pas une baisse du temps GPU. Les poids globaux de `UniformsGroup.update` ou `writeBuffer` ne sont pas le gain récupérable par ces seuls éléments. Aucun benchmark d'adoption ancien n'est présenté comme mesure de ce lot graphique.

## Qualification physique

Contrôle distinct `tmp/performance-v296/graphics-controls/physical-xEeSLi/report.json`, SHA **85454AE2**, gel **A24BF349** : **PASS57,288s**. Deux côtés frais utilisent le vrai ReentrantRenderer/WebGPU et les trois couches courantes. Huit états sont exacts A/B : froid après compilation, frame inchangée, changement vent/éclairage/dimensions/caméra, début et milieu de dépôt entier avec compilation intercalée, dépôt partiel, fin, puis état final après destruction du device possédé et recréation.

Les pixels RGBA, les mots CPU et les readbacks GPU des cinq attributs cargo sont comparés exactement après draw, ainsi que les valeurs d'uniformes et les champs CPU des UBO observés aux draws, l'éclairage et l'ordre des dessins. Les différences intentionnelles de groupe/usage ne deviennent pas des oracles d'égalité ; les compteurs d'uploads ne prouvent pas la fidélité. Erreurs vides, sources exactes, dispositifs/layers privés disposés, Chrome et Vite5334 fermés.

Cette fixture à cible384×384 et cadence manuelle ne mesure pas les FPS. Les UBO sont observés **côté CPU**, sans readback GPU de leurs buffers. Il n'y a ni cas dédié de pickup, ni croissance de population dédiée, ni assertion séparée de la passe d'ombre ; ne pas les annoncer comme acquis. Les captures de sources servies ont des collisions de noms de fichiers : leur conservation individuelle n'est donc pas certifiée. Les contrôles de hashes/mappings en mémoire, les sources gelées et les empreintes avant/après passent et constituent la preuve de provenance retenue.

## Validation

Contrôles complémentaires acquis :

- **27 cas / 3 fichiers : PASS8,301s** ; build avec typage **PASS8,087s**.
- Typage du banc GAME **PASS2,360s**, du banc physique **PASS3,774s**.
- Profil neuf : typage **PASS1,351s**, collecte **PASS71,396s**, analyse **PASS0,637s**, gel **8E38271E**, recharge9074 exacte et nettoyage acquis. Le profil initial invalide reste séparé.
- Revue statique du GAME : sept feuilles adaptées exactement depuis V295 selon les substitutions déclarées ; mesure FPS, caméra, qualité, reprise, empreintes et nettoyage conservés. Aucun résultat V295 réutilisé comme preuve.
- Documentation : PASS8,587s ; premier lancement Python bloqué par EACCES avant exécution, journal conservé, reprise autorisée dans une sortie distincte.

La promotion retient conjointement le gain du vrai GAME et la qualification physique ciblée, dans ces limites. Moteur, lecteurs de sauvegardes, schéma et corpus public ne changent pas ; aucune nouvelle campagne générale de simulation n'est déduite de ces contrôles graphiques.

## Publication

Elsewhere V296 est publié à la même [adresse Cloudflare Pages](https://elsewhere-cq7.pages.dev/), déploiement `ce930a0c`. Build Pages avec typage PASS11,359s, publication PASS15,484s, contrôle HTTPS PASS0,718s : sept fichiers identiques au build local et 66 fichiers publics de sauvegarde/catalogue identiques dans `public/` et `dist/`. [Procédure et compatibilité](cloudflare-pages.md). Cette publication ne constitue pas un benchmark du build compilé ; les gains ci-dessus sont mesurés dans les conditions dev de l'utilisateur. La tâche planifiée reste en pause.

Rapport HTTPS : `tmp/elsewhere-pages/http-gGEP4D/report.json`. La publication a utilisé le build des trois sources candidates gelées sur la base `e666e457`, avant le commit de clôture ; ses métadonnées Git ne remplacent pas les empreintes des fichiers effectivement servis.
