# Preuve V209 — consolidation après audit

Travail demandé le 4 octobre 2026, finalisé le 5 octobre en heure locale, sur source V208 au schéma 190, HEAD initial `c0d13d17` (audit documentaire, code V208 issu de `820a1401`). Aucun payload public ou archive d’instructions historique régénérés. Le dossier utilisateur `references_UI/` reste hors du changement. [Contrat](../development/consolidation-v209.md), [audit initial](audit-code-core-2026-10-04.md), [rapport externe et méthode](analysis-external-agent-2026-10-04.md).

## Corrections et portée

| Frontière | Changement et preuve exigée |
| --- | --- |
| Raider stratégique/tactique | Détachement avant acquisition, restauration si échec ; budgets zéro/un/deux et arête engagée, sauvegarde et reprise. |
| Réservations | Capture commune incluant cuisine en file et corps, puis prise/annulation/reprise sans double allocation. |
| Loisirs | Standabilité commune, toutes familles/empreintes/orientations, lampe sur seule place et plans/frames/chunks. |
| Identité | `nextId` extrême refuse avant matière/qualité ; MAX−1 termine. Transfert d’un objet étranger/répété refusé. Aucun indice−1 naturel établi sur les 29 splices revus. |
| Mobilisation | Menace humaine/manhunter maintient le contrat, paisible après récupération ne retarde plus le délai. Pilote via commandes/refuge/poste/attaque. |
| Remplacement | Attente après quinze secondes, acceptation/refus tardifs, checkpoint/acquittement corrélés, récupération conservée ; arrêt explicite sans faux rollback. |
| Worker | Exception de tick/capture/publication arrête et interdit nouvelles mutations/publications/sauvegarde ; remplacement strict, même refusé après un arrêt. |
| Stockage | Dépôt IndexedDB, transaction migration/marker, refus quota/erreur sans perte d’autre slot ; fallback seulement API absente. Test doubles distincts de parcours natif. |
| Graphique | Frustum/projection selon backend, garde texture sang3500, cleanup et signal fatal idempotent ; perte réelle exercée nativement séparément. |
| Audio | Visibilité directe sans RAF, readiness au premier MP3, limite de concurrence, échéance incluant corps/décodage, abandon à fermeture, essai indépendant des autres téléchargements. |
| Recherche | Bases0,75/1, analyseur+0,1 partageable8centres/LOS, propreté et extérieur0,75² ; intention durable puis contrôle au travail. |
| Fixtures/archives | Anciennes versions authentiques et TV neutre seulement actifs ; archive pod inchangée, projection bornée aux deux clés absentes, futurs/partiels refusés. |

## Exécutions de contrôle

Les mesures lourdes, campagnes et navigateur sont successifs. Windows, Node24.11.1, Ryzen53600, environ16GiB. TEMP/TMP et cache npm sous `tmp/host-cache` sur E:. Les relances hors sandbox autorisées concernent les processus locaux Vitest/Vite/Playwright, pas une publication ou un push.

Première cohorte fixtures : 47 fichiers, 220 tests, 204 réussis/16 échecs, 77,49s. Deuxième cohorte concernée : 20 fichiers, 98 tests, 97 réussis/1 échec, 38,68s ; dernière attente de promotion190 corrigée ensuite. Rapports `tmp/consolidation-fixtures-{first,second}.json`. Cette remise en état a révélé le défaut produit d’archive pod ; il est traité séparément des erreurs d’oracle.

Premiers bridge ciblés : 7 fichiers,28/28,8,08s, avant les dernières gardes d’ouverture/arrêt. Cohorte centrale explicite après intégration :99/99 dans `tmp/consolidation-v209-all-targeted.json`. Un premier appel avec des globstrings littéraux n’avait sélectionné que trois fichiers ; son51/51 n’est pas annoncé comme couverture complète.

| Contrôle | Résultat et portée |
| --- | --- |
| Régression hors treize campagnes | 494 fichiers, 2 220 réussis, aucun échec et un ignoré, 801,99 s ; `tmp/consolidation-regression.json`. Terminée avant les deux dernières gardes de recherche et les dernières reprises UI/audio/TSL. |
| Recherche après revue | 34/34 uniques sur sept fichiers ; premier appel 33/34 puis fixture corrigée et fichier 6/6. `tmp/consolidation-research-followup{,-repair}.json`. Pas présenté comme une seconde régression globale. |
| Frontières centrales après intégration | 18 fichiers, 103/103, 17,75 s : `consolidation-*`, audio, session et codec ; `tmp/consolidation-v209-all-targeted-final.json`. |
| Typecheck et build | Passent ; build 9,11 s après les derniers changements de main/audio/recherche et callbacks TSL. Le warning Vite de taille de chunk demeure. |
| Parcours natif | 1/1, 30,47 s : IndexedDB et originaux localStorage, sauvegarde/reprise exacte, destruction du vrai GPUDevice et reconstruction, gestes clavier/double clic, arrêt du transport puis chargement strict. Un seul canvas, aucun THREE.TSL ni erreur page/console inattendue. Capture `tmp/consolidation-v209/native-r3/.../recovered-native.png` relue visuellement. |
| Présentation | Passe, 126,28 s ; minage et coupe, aucun saut, excès de déplacement continu ni occupation solide dans ces parcours. Journal `tmp/validation-runs/presentation-2026-10-04T20-36-04.803Z-27000/output.log`. |
| Lanceur journalisé | Succès, code 7, interruption 130 et terminaison des seuls descendants Windows vérifiés ; arguments littéraux sans shell, queue d’erreur bornée. Résolution npm depuis le dossier de Node vérifiée sans `npm_execpath`, 0,26 s. |

Le premier essai natif échouait sur le libellé de bouton attendu après les étapes GPU réussies. Le deuxième utilisait une instrumentation de stack shader coûteuse qui empêchait la préparation de tenir le délai de contrôle ; elle a été retirée. Le troisième rejoue sans ce diagnostic et passe. Les 40 callbacks TSL concernés retournent maintenant `void`, sans modifier les affectations ; `tmp/consolidation-v209/tsl-conditional-void.json` conserve la correspondance. La perte API provoquée prouve une reprise native, pas la fréquence des plantages de pilote ni l’absence générale de fuite.

La revue finale a également corrigé l’erreur de boot IndexedDB restée dans un menu caché, ainsi que l’effacement possible d’un arrêt worker après acceptation mais pendant préparation graphique. Le point de réarmement reste l’acceptation autoritative ; la fin du rendu ne réarme pas le transport. Ces deux cas sont exercés dans le navigateur.

La cohorte navigateur finale initiale fait4/5 en168,39s : besoins physiques et les trois V209 passent ; Frontières révèle la vraie interception des vitesses par la matrice Travail. Le CSS garde colonnes/largeur/palette mais réserve l’espace réel de l’horloge. La reprise de Frontières expose ensuite deux sélecteurs historiques (Foresterie/Construction), le rôle status devenu ambigu avec l’essai sonore, puis un clic sur un panneau déjà fermé après l’aide. Les notifications ciblent leur élément réel. Aucune commande ni assertion de sauvegarde invalide n’est supprimée.

Frontières complet passe sur GPU natif en25,42s, puis en25,53s après ajout d’un timeout par geste de15s indépendant du budget global120s. Les quatre vitesses sont atteignables par hit-test réel à1440×1000,1280×720 et768×900 ; contrôles répétés, refus atomique, aide, placement/cancel, vraie migration schema1 et sauvegarde190 passent. La première tentative matérielle avait attendu près de101s un panneau caché ; le diagnostic utilise sa trace, sans attribuer ce temps au moteur. Journaux `tmp/validation-runs/native-frontiers-{hardware-r2,bounded}-2026-10-04T.../output.log`. Les cinq parcours navigateur uniques sont verts par reprises ; cela ne signifie pas190spécifications exécutées.

Le build avec typecheck final passe en8,02s sur les derniers main/CSS/pilotes. Les mesures de performance précédentes précèdent ces dernières gardes de reprise UI ; aucun changement de tick/encode/decode n’a suivi ces mesures.

Les cinquante anciens fichiers d’intégration concernés lisent/écrivent désormais le dépôt ; les graines localStorage exécutées avant le boot conservent leur rôle de migration. Leur adaptation, syntaxe et compilation ne sont pas annoncées comme l’exécution de toute la suite navigateur. Les résultats ci-dessous précisent la portée réellement exécutée ; une préparation ou une compilation ne valent pas parcours joué.

### Campagnes et correction de leurs pilotes

La cohorte des cinq fichiers restants termine en549,40s : quinze réussis et deux échecs, rapport `tmp/consolidation-v209-other-campaign-contracts.json`. Colonie joueur passe sur trois graines (451,35s), Habitat contrôlé passe (70,24s), Textile passe (4,69s). Les échecs Froid et Infection sont analysés séparément avant leur reprise ; ce résultat initial reste rouge.

La reprise finale Froid/Infection passe8/8 en18,03s sur deux fichiers, rapport `tmp/consolidation-v209-infection-coldstore-repair-r3.json`. La première tentative avait6/8 (pièce encore ouverte et pile préparée sur une future paroi), la seconde7/8 (exigence de gel continu malgré ouvertures réelles de porte) ; leurs journaux restent rouges. Les contrôles de validité de la fixture ne sont pas assouplis.

Le pilote Froid ferme physiquement la pièce, recherche sur son bureau intérieur, déconstruit la paroi temporaire puis pose le climatiseur et réserve le stockage aux repas périssables. Recherche500points achevée20587, premier gel21529 ; deux sorties par porte réchauffent brièvement les repas. Le diagnostic exact garde combustible et transitions et n’établit aucun défaut de pourriture. Le test observe ensuite mille ticks consécutifs réellement gelés et alimentés21673–22673 avec âge strictement égal à chaque tick, coupe le ravitaillement à22673, observe panne29981, dégel30042 et vingt repas périmés à32633. Même horizon65000, mêmes provisions/matières, aucune température ou ancienneté forcée ; dix aciers, zéro composant et colons vivants/mobile restent exigés.

Le parcours Infection prépare soixante rations finies au lieu de trente : la frénésie réelle du patient avait épuisé le budget clinique initial, affamant Mina. Aucune crise désactivée ni ration ajoutée pendant le parcours ; le premier placement invalide a été refusé puis déplacé sur sol admissible. Immunité13399, récupération17582, consommation51+reste9=60rations et11+reste19=30médicaments ; quarante-trois repas du patient,10804ticks au lit et3186ticks de sommeil du médecin. Bilans et continuation gardent leurs assertions. Ces préparations contrôlées ne sont pas une nouvelle campagne naturelle.

La file initiale des treize campagnes a été arrêtée volontairement pendant Prison, après 2 111,13 s. Son statut journalisé reste un échec (`4294967295`, terminaison Windows du runner) ; ce n’est pas une validation globale verte. Seuls ses descendants vérifiés ont été arrêtés, le serveur utilisateur est conservé. Les preuves partielles sont reprises explicitement, sans remplacer leur statut par celui d’un test court.

| Parcours | Résultat obtenu |
| --- | --- |
| Survie naturelle | 6/6, trois graines sur trois jours, 188,75 s. |
| Atterrissage naturel | 3/3, dont 24 jours avec deux récoltes et cuisine, 730,59 s. |
| Simulation | 8/8, 75,73 s ; le ledger indépendant ne suppose plus une récolte maximale. |
| Raid | 1/1, cinq jours, 82,34 s. |
| Énergie, première exécution | 1/2, 294,85 s : la transition tactique invalide de l’audit ne revient pas, mais Noé est à terre au tick197760 dans un abri percé. Le monde reste sauvegardable. |
| Prison, parcours interrompu | Checkpoint tick324000/J54, depuis J42, capture réelle, soins, quinze nourrissages, dix conversations et résistance réduite ; recrutement final non établi. `tmp/consolidation-v209/prison-interrupted-checkpoint.json`. |
| Énergie, reprise corrigée | Diagnostic séparé depuis le checkpoint authentique J32/tick192000 jusqu’à204000/J34 : 1 réussi, deux autres tests ignorés par sélection, 79,48 s. Les trois colons restent vivants et mobiles, raid5 défendu avec deux ennemis à terre ; bilans et continuation120 ticks exacts. Ce n’est pas la fin du parcours électrique complet. |
| Environnement borné | 2/2, 106,33 s, départ457698 jusqu’à469698 : deux jours, préflight, conservation et reprises. Ni hiver complet ni retour du printemps validés. |
| Habitat naturel | Non exécuté jusqu’à son terme dans cette consolidation ; filtre et cadence corrigés, cas courts et typage distincts de sa campagne12 jours. |

L’échec Énergie est une insuffisance de stratégie : le tir d’Ada fonctionnait, mais le pilote ne la plaçait plus au poste de défense et gardait les civils dans la chambre malgré une brèche. La réaction lit les seize éléments réels, rejoint le poste existant et sélectionne chambre froide ou laboratoire réellement fermés si le dortoir n’est plus sûr. Aucun stock/bâtiment injecté, aucune invulnérabilité, aucun assouplissement de l’oracle « vivants et mobiles » ni du délai du parcours complet. `tmp/consolidation-v209/energy-initial-failure.json`, `tmp/energy-day32-v85.json` et `tmp/energy-defence-diagnostic-v209.json` conservent avant et reprise.

Un probe scalaire de la scène publique V201 a également établi une contradiction draft/undraft dans Prison. Le contrôle de menace et la priorité défense/soins sont transmis aux pilotes hérités et à leur cadence20 ticks. Habitat naturel conserve les ordres physiques sous menace au lieu de ne garder que la mobilisation. Quatre cas courts passent en 6,64 s après réparation d’une fixture sans profil/grippe/porte complets ; typage final6,11 s et préflight Énergie1/1 sélectionné16,31 s passent. Les tests refusés sur une fixture invalide et le premier filtre CLI invalide sont conservés dans les journaux, pas comptés comme défauts produit. Le filtre de la campagne complète n’a pas été modifié pour masquer son échec.

Les reprises diagnostiques effectuées ici utilisent un checkpoint authentique et une borne de deux jours. Le nouveau mode Énergie refuse explicitement une borne au-delà de cette limite ; le mode Environnement existant est invoqué avec ce même intervalle. Leur conservation/continuation reste contrôlée ; les objectifs de fin de campagne ne sont pas annoncés atteints par un diagnostic. Le test Énergie complet garde sa limite originale de24 jours et ses assertions. Les campagnes complètes Prison, Habitat naturel, Énergie et saisonnière restent des contrôles périodiques ouverts ; la consolidation ne clôt pas G0.

## Référence de recherche relue

Core installé : 1.6.4871 rev590, assembly SHA‑256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a`. `Buildings_Production.xml` 1333/1394 donne les bases 0,75/1 ; `Buildings_Misc.xml` 631/633 donne l’offset 0,1 et le plafond d’un analyseur par bureau. `CompProperties_Facility` et `CompAffectedByFacilities` vérifient distance entre centres, empreintes, liaison la plus proche et offset avant facteurs ; `CompFacility` permet plusieurs bureaux consommateurs. `RoomStats.xml` 257–269 et `Stats_Building_Special.xml` 80–102 établissent propreté/extérieur et rôle/température. Les seuils stricts 9/35 °C sont conservés.

Les tests confrontent même capture et même tick après ajout/retrait de salissure, analyseur partagé, appareil le plus proche éteint et intention sauvegardée périmée. Les points déjà acquis restent inchangés. Le helper de visibilité local est réutilisé ; la parité de tous les coins avec GenSight Core n’est pas démontrée. Les références V123 restent datées avec un renvoi V209, sans réécriture de leur preuve historique.

## Performances et limites

Le profiler V209 réutilise celui des étapes worker puis échantillonne uniquement `stepWorld` sur la fixture réelle `public/test-saves/v98/mixed-100.json`, 250²,104personnes/100animaux,20ticks de chauffe/60mesurés. Hash fixture `4d5b34a4a37e0f478a813e472212d923cffaa4f3ed0391764d615972a5f7c26b`. Les copies Node de messages ne mesurent pas le transfert natif, les files de livraison, adoption/rendu ou GPU. Une continuation exacte et des hashes de source avant/après bornent la preuve.

Le profil actuel passe en 20,93 s ; roundtrips après chauffe et fin, puis continuation d’un tick exacts. Sources stables, fingerprint `6653c5b6d699c27ec0a36cc20bd6b9804dad898d91f32aff5617adee3a280c67`. `tmp/consolidation-v209/{profile.json,worker-stages.json,stepWorld.cpuprofile,profile-sources.json}` conservent mesures et protocole.

| Étape locale sans inspector | Moyenne | p95 |
| --- | ---: | ---: |
| Tick `stepWorld` | 41,97 ms | 62,75 ms |
| Encodage snapshot | 7,95 ms | 11,05 ms |
| Clone structuré Node | 8,49 ms | 11,35 ms |
| Total des étapes | 59,78 ms | 82,78 ms |

L’inspector séparé attribue 18,80 % inclusifs à planification, 18,69 % à faune, 6,64 % à `navigationCosts`, 6,47 % à `canStandAt` et 1,64 % à `blockedCells`. Ces catégories parent/enfant se chevauchent. Les captures de coûts et scans d’empreintes/standabilité sont des cibles avant un cache global de blocage ; encode/clone occupent aussi environ 27,5 % de ce total local, à confirmer avec la cadence native. Inspector, GC, scénario et copie forcée limitent la généralisation. La différence avec l’ancien profil n’est pas un A/B contrôlé et ne prouve pas une régression.

L’audit initial avait mesuré ×2,87–3,50 pour une vitesse demandée×6 dans quatre vues chargées, et un décodeur au p95 autour de2,8–3,4ms. Ces limites ne sont pas corrigées par déclaration. Les validations de snapshots restent présentes ; aucune réduction de cadence supprimant un contact/phase ni cache de blocage persistant improvisé.

La passe native V209 utilise la même fixture et les mêmes quatre poses, paramètres actifs, 1920×1080/DPR1, cinq secondes de préparation en pause et huit secondes mesurées par phase, GPU timestamps désactivés. Chromium153/WebGPU AMD rdna-1 ; les huit phases passent en 146,13 s, sans erreur relevée. Rapport `tmp/consolidation-v209/native-performance.json`.

| Vue à ×6 demandé | Vitesse atteinte | RAF p95 | CPU d’image p95 | Tick déclaré p95 |
| --- | ---: | ---: | ---: | ---: |
| Iso proche | ×2,86 | 45,9 ms | 29,2 ms | 77,43 ms |
| Iso large | ×3,15 | 37,6 ms | 23,7 ms | 65,38 ms |
| Perspective basse | ×3,33 | 45,9 ms | 28,8 ms | 57,70 ms |
| Iso avec labels | ×3,38 | 41,7 ms | 28,6 ms | 59,63 ms |

Le callback de snapshot a un p95 de8,8–9,6ms et le décodeur de2,8–3,8ms. En pause, RAFp95=4,3ms et CPUd’imagep95=2–2,7ms. Un percentile d’intervalle n’est pas une moyenne FPS ; les percentiles des callbacks et images ne s’additionnent pas. Ce relevé actuel, sans A/B/A/B contre une source isolée ancienne, confirme la limite de débit sans établir gain ou régression générale. Une colonie préparée à cet effectif ne démontre pas sa viabilité naturelle sur plusieurs saisons.

La grande composante cyclique et les orchestrateurs volumineux ne sont pas refondus globalement. Les options TypeScript additionnelles, le lint ciblé et le contrôle de pression de la file worker restent des dettes suivies ; les extractions communes et la CI livrées ne les déclarent pas résolues.

Les garde-fous de texture, nettoyage et stockage renforcent la robustesse ; ils ne prouvent pas un coût nul. La CI ajoutée contrôle code/docs à son prochain déclenchement ; elle n’a pas été exécutée dans GitHub lors de ce travail local. Biographies/famille, diversité des crises/menaces et monde complet restent des objectifs fonctionnels ouverts.

Contrôle documentaire final :2,15s,714documents/7063liens,25domaines/cinq familles, six en-têtes au schéma190 et trois originaux byte-identiques. `git diff --check` passe. Le 5 octobre, l’utilisateur autorise explicitement la poursuite autonome après commit ; cette nouvelle consigne remplace l’attente du mode jour, sans modifier la portée de cette preuve.
