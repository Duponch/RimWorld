# V295 — réemploi des faits de ressources et bilan nocturne

V295 est retenue : **111,35→119,40 images RAF/s (+7,24 %)** sur Les Aulnes intégrées, avec un débit réel **6,009→6,027×**. Le coût CPU moyen d'adoption baisse de **21,57 %**. Base exacte `442eddbd` (produit V293, diagnostic V294) ; moteur, rendu, schéma 218 et les 63 sauvegardes/66 fichiers publics sont conservés. **240 FPS et une fluidité constante ne sont pas atteints** ; aucun gain GPU mesuré.

## Changement et limites du contrat

La [capture identifiée par V294](aulnes-performance-v294.md) était reconstruite à chaque adoption. Le client MAIN privé conserve désormais son index de faits lorsqu'une reconstruction sparse atteste le même ordre et les mêmes identités, et que chaque ressource modifiée conserve exactement son tuple utile : coordonnées, identité, type et appartenance aux candidats végétaux. Une croissance seule peut donc réutiliser présence spatiale, occurrences hydroponiques, identités et candidats ordonnés. Les règles végétales relisent toujours les nouvelles feuilles, les horloges et le schéma à leurs frontières historiques ; les collisions avec un propriétaire étranger gardent le parcours complet ordonné.

Le raccord n'ajoute pas de compteurs modifiables ou d'overlay : **l'index confirmé n'est jamais modifié**. Toute différence de tuple, ajout/retrait, remappage, ordre, checkpoint, base incohérente ou forme atypique impose une capture complète neuve. Les dimensions et ordinals sont vérifiés. Les lecteurs retenus restent liés à leur ancien World et à leurs anciens faits. Aucun nouveau parcours N de copie ou de gel n'est introduit dans la voie de réemploi ; le travail de comparaison porte sur K entrées du témoin, dont le coût est inclus dans les mesures. Aucun nombre de réemplois/K en jeu n'est inféré des FPS.

L'autorité vient de la fermeture MAIN et de l'audit de ses consommateurs fixes **entre** adoptions, pas d'un booléen readonly, d'une référence identique ou d'un helper exporté. UI, rendu et audio inspectés ne modifient pas ces faits ; l'accès DEV retourne une copie. Le témoin vient des seuls locals de reconstruction déjà contrôlés pour epoch/révision/base et exhaustivité des patches, sans nouvelle lecture spéculative du paquet. Le journal public post-commit n'est pas utilisé pour anticiper les gardes.

La préparation reste provisoire. L'owner privé engage ses faits seulement après le retour `applied` complet de `super.adopt`, donc après gardes, planète et journaux ; refus, stale et exceptions abandonnent le provisoire. Une adoption sans faits capturés purge la base, sans forcer une capture pour l'engager. Un restart recrée le Decoder et son owner. Les APIs RAW publiques, callbacks mutables, getters et Proxy gardent leurs lecteurs historiques ; les intrinsics interposés ne sont pas admis au domaine privé. Quantités, capacités, possessions, réservations, horloges, règles et cadence restent contrôlées. Quatre feuilles runtime changent, aucun nouveau protocole ou Worker.

## Coût complet et jeu

Preuves sous `tmp/performance-v295/`. Gel **963ED25E**, `cost-native/freeze-mOYQ05/manifest.json` : quatre modules A/B sous les mêmes identités canoniques, sources/publics/configuration et huit feuilles du banc vérifiés avant/après. Chrome matériel AMD RDNA1/WebGPU,2560×1440/DPR1/dev, source8434, caméra129/122/zoom1, chauffe3s puis fenêtre14s. Quatre cohortes fraîches A/B/B/A par comparaison ; préparation, engagement et abandon de l'owner sont inclus dans le span d'adoption. Aucun timer CPU dans les cohortes GAME.

Le premier lancement `abba-JRv5fV`/`1-a-Zj5yaH` a été interrompu à04h27 Paris sans rapport de cohorte ni agrégation exploitable ; sorties incomplètes conservées, aucune mesure réutilisée. Reprise à09h22 après constat d'absence des processus privés et du port5330. La relance automatique a été mise en pause dès cette reprise ; seul le lot engagé a été terminé.

**CPU**, `cost-native/abba-Gs0Zq8/report.json`, SHA **8B9BF9D2**, **PASS222,853s** : adoption **9,0553→7,1017ms**, p9512,0→9,4ms, pic23,4→18,7ms. Moyennes A1/B1/B2/A2 :9,479/7,035/7,167/8,696ms ; les deux B sont inférieurs aux deux A. 721/814adoptions sur deux fenêtres par côté : le coût cumulé232,97→206,10ms/s dépend aussi de cette fréquence et ne représente pas le CPU total. Débits instrumentés A5,813/5,974× et B6,035/6,039× : pas cadence identique ni preuve FPS. Getter séparé2,5424→2,4475ms, mais son coût cumulé65,41→71,03ms/s augmente avec le nombre de messages ; aucune accélération du clonage complet attribuée. Recharges exactes9019/9043/9040/9044. Livraison, reste du handler, rendu et GPU sont exclus de ces spans.

**GAME original**, `cost-native/abba-x2tBcW/report.json`, SHA **81E80C90**, **PASS218,637s** :

| Cohorte | RAF/s | Débit réel | p95 intervalles | Pire intervalle | Recharge exacte |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 |110,72|6,008×|25,1ms|45,2ms|9047|
| B1 |118,49|6,020×|20,7ms|45,2ms|9042|
| B2 |120,32|6,034×|20,9ms|43,8ms|9042|
| A2 |111,97|6,010×|25,1ms|45,6ms|9045|

Les deux B dépassent les deux A. Agrégation pondérée111,3455→119,4025RAF/s, vrai6,0094→6,0266× ; moyenne des p9525,10→20,80ms. Les images de plus de40ms persistent. Huit cohortes avec erreurs vides, empreintes sources/publics exactes, navigateurs et Vite5330 fermés. Résultat headless local, pas certification d'un écran240Hz ni de toutes les vues ou parties. Aucun gain de chargement à froid chronométré ; le froid est contrôlé fonctionnellement.

## Validation

- Typage produit **PASS6,405s** ; **55cas/9fichiers PASS9,944s**, dont10nouveaux groupes : tuples/candidats, duplications et alias hydro, anciennes vues, refus/throws, séquences, checkpoints et paresse de l'engagement. Gardes RAW, namespace et journaux structuraux inclus.
- Typage du banc **PASS1,162s**, gel **PASS1,041s**. Aucun code ou texte du harness changé après gel ; reprise du lancement interrompu dans des sorties distinctes.
- `public-controls/public-context-check-scGFEG/report.json`, SHA **780CF496**, **PASS77,713s** :63références/66fichiers exacts, classe MAIN extraite littéralement, checkpoints/deltas et anciennes vues comparés au RAW, un vrai tick puis save/reload exact par référence. Corpus normal, pas preuve d'autorité native ni campagne longue.
- Build avec typage **PASS11,441s** ; documentation **PASS9,604s**,902documents/8552liens,25domaines/5familles, six en-têtes au schéma218 et trois sources originales exactes. Aucun nouveau contrôle de présentation inchangé, car rendu, mouvements et horloges ne changent pas.

Revues privées indépendantes : `ownership-review.md`, `integration-review.md` et `result-review.md`. Aucun échec produit rencontré dans ce lot ; le lancement nocturne interrompu demeure explicitement incomplet.

## Bilan de la nuit et arrêt

Le diagnostic initial [V286](aulnes-performance-v286.md) observait7,10RAF/s à×6 demandé, débit5,366×. Les dernières mesures V295 atteignent119,40RAF/s à6,027× sur la même sauvegarde, caméra et configuration. **Ce sont des observations à des moments différents, pas un A/B global unique** : aucun pourcentage cumulé annoncé. Les comparaisons locales [V287](aulnes-performance-v287.md), [V288](aulnes-performance-v288.md), [V290](aulnes-performance-v290.md), [V291](aulnes-performance-v291.md), [V293](aulnes-performance-v293.md) et V295 établissent leurs gains séparément ; V289, V292 et V294 n'ajoutaient aucun FPS.

Les gains viennent de parcours CPU redondants dans les validations, la géométrie et les identités, puis du réemploi des faits stables. Ils s'appliquent au chemin commun du jeu, sans reconnaître spécialement Les Aulnes ; leur ampleur dépend des ressources, bâtiments et tâches de chaque partie. Le rendu GPU n'a pas été optimisé cette nuit et aucun noyau numérique dominant justifiant WASM n'a été établi. Le [profil V294](aulnes-performance-v294.md) conserve des coûts importants de validation et de préparation/application de scène ; il ne constitue pas une attribution neuve après V295.

L'autorisation était limitée à cette nuit. **Relance planifiée en pause, arrêt après commit/push du lot engagé, aucune suite autonome ni nouveau candidat lancé.** Une nouvelle instruction humaine est nécessaire pour poursuivre.
