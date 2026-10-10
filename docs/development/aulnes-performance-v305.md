# V305 — préparation des scènes après la refonte visuelle

Ce lot répond au ralentissement signalé après [V304](../gameplay/visual-identity-v304.md). Les nouveaux modèles, portraits, textures, interface, teintes et retours immédiats des ordres sont conservés. Aucune règle, population, cadence, horloge ou qualité réduite ; schéma 219 et 63 références/66 fichiers publics préservés. La relance planifiée reste en pause.

## Changements retenus

Le renderer privé MAIN réutilise la projection des bâtiments confirmés. Le journal structural V299 fournit les emplacements effectivement modifiés entre deux mondes : chaque tuple concerné est relu dans le monde cible, puis sa valeur comparée. Dommage ou consommation de combustible encore positif ne reconstruisent pas la grande signature quand les champs observés restent identiques. Un véritable changement de porte, courant, statut médical, EMP ou tourelle conserve sa décision d'affichage historique. Checkpoint, changement d'ordre ou de membres, dimension, époque, suffixe absent, même objet ou copie inconnue imposent la projection complète.

Les intentions de carte comparent des buffers primitifs réutilisés : jobs, cultures, stockage, foyer, travaux de toit et fragments désignés. Le JSON historique est reconstruit lors d'un changement réel ou d'un repli. La file conserve son ordre, ses horloges confirmées, la coalescence au même tick, ses applications immédiates et le seuil continu de 200 ms. Les projections publiques RAW et l'observateur Source gardent leur lecture complète ; seule l'extraction littérale du map des structures ajoute un hook. L'inverse du corps entier est vérifié au gel, après normalisation des fins de lignes seulement. La classe qui injecte les lecteurs est non exportée dans MAIN ; un journal ou une assertion readonly ne donne pas ce mandat aux API générales.

Les horloges graphiques des colons et animaux passent dans les groupes natifs Three mis à jour par rendu. Les nodes et propriétaires restent distincts ; aucune animation, équation, instance, géométrie, ombre ou matière n'est remplacée. Les écrivains restent avant le rendu, les ombres imbriquées utilisent leur renderId ordinaire. Les layouts réellement différents ne sont pas artificiellement fusionnés.

## Attribution et décisions

Le nouveau profil MAIN sur V304 est conservé sous `tmp/performance-v305/profile-types-reprise/main-ugrwoV`, attribution `report-JWSMSp`. Collecte PASS71,386s, analyse PASS0,693s ; 9 605 samples et 187 sources compilées vérifiées, recharge 9088 exacte. Poids exclusifs sur 15,383 s, bords inclus : validation des snapshots 19,78 %, application scène 16,76 %, rendu Three 23,30 %, UI/audio 5,25 %, autre jeu/handler 14,27 %, reste natif/GC/idle sans contexte 20,50 %. Ce sont des poids échantillonnés, pas des temps GPU. `take` 478,349ms inclut `capture` 413,759ms : leurs valeurs ne s'additionnent pas.

Le premier lancement `main-0QKLOR` échoue avant mesure sur manque de mémoire graphique. Le navigateur privé est fermé ; aucune session utilisateur n'est arrêtée. Après fermeture par l'utilisateur de ses applications 3D, la collecte `main-Xm9gXM` termine et recharge 9082, mais son attribution reste rouge pour des deltas d'horloge négatifs. Ces résultats restent intacts et ne fondent aucun gain.

Deux pistes sont écartées. L'atlas à plage adaptative passe 21 cas et quatre comparaisons de pixels WebGPU/WebGL exactes, mais son GAME présente un gain trop variable : 113,24→117,14 RAF/s, vrais débits 5,632→5,664×, avec chevauchement A/B. Dans les états joués comparables il économise seulement 24 triangles sur environ 1,22 million. Ses sources et tests sont archivés sous `atlas-rejected`, puis restaurés. Rapport `game-next/abba-pv16LD`, PASS205,637s, quatre recharges exactes 8784/8764/8824/8822. Il n'est pas promu.

Le prototype de cargo indexé n'évite un dessin que sur l'état initial en pause parmi six sauvegardes réelles. Les cinq états joués ont six à sept types dans un ordre incompatible avec cette fusion, et paieraient l'index supplémentaire. Le recensement `cargo-census-next/run-2FjGmM` passe en18,287s, mondes et flux géométriques exacts ; aucun GPU ou GAME supplémentaire engagé. Les modèles V304 restent en place.

## Coût CPU contrôlé

`tmp/performance-v305/queue-cost-next/run-yfQnoQ/report.json`, gel `AE47BC0B`, PASS27,757s. Deux suites réelles 8434→8498, encodeur unique et Decoder réel, huit ticks de chauffe puis 56 mesures ; deux groupes A/B/B/A par cycle, ordre des groupes inversé au second. Mondes en flux, sans conserver 64 graphes complets. La mesure comprend push, six take, lecteurs et allocations. Préparation, gardes du Decoder et oracles sont hors de cette fenêtre : ce n'est donc pas le coût de tout MAIN.

| Variante | Référence | Candidat | Écart |
|---|---:|---:|---:|
| Phases des bâtiments seules | 1,449 ms | 0,708 ms | −51,1 % |
| Phases et intentions | 1,432 ms | 0,598 ms | −58,2 % |

Chaque cohorte candidate mesurée est inférieure aux références de son groupe. Le combiné conserve un p95 de0,986ms contre2,134ms. Le froid coûte davantage : environ3,91–5,46ms pour le combiné contre1,96–2,77ms pour ses références. Aucun gain de chargement annoncé. Environ26 emplacements de structures sont relus par lien confirmé. Identités retournées, décisions de cadence, anciennes vues, cible C après D, même tick, checkpoint et reprise avec vrai tick8499 sont exacts. Node CPU reste un triage local, sans débit naturel Chrome ni FPS déduit.

## Validation

Les 14 oracles privés des lecteurs passent en7,720s. Un premier typage rouge concerne seulement une fixture StorageFilters sans food ; copie distincte corrigée, typage PASS3,332s, runtime privé inchangé. Cinq contrôles privés des horloges passent en7,212s. Le groupe produit acquiert 76 cas dans11fichiers en11,063s, dont18nouveaux. Il couvre intentions, phases, journaux, anciennes vues, reprise, mouvement, portage et visuels V304. Les répétitions de cas privés ne s'ajoutent pas à ces76cas. La revue finale trouve que le test RAW de la file importait deux fois le même module : l’oracle est remplacé par la file V304 extraite de Git, avec son observateur historique indépendant. Les huit cas concernés passent de nouveau en7,126s ; aucune source produit modifiée après le GAME.

Le contrôle matériel `tmp/performance-v305/actor-uniforms-controls-next/physical-YvdI4t` passe en66,921s, gel `D6AA6880`. Huit états A/B : compilation froide, frame stable, changement de caméra/éclairage/dimensions, dépôt entier puis partiel, fin et recréation après destruction du GPUDevice possédé. Les pixels RGBA384², matrices, ordre/dessins, valeurs F32 liées aux passes couleur/ombre et attributs cargo lus sur GPU sont exactement égaux. Les horloges des colons et des deux espèces observées sont volontairement indépendantes. Les UBO sont observés côté CPU au dessin ; leurs buffers GPU ne sont pas relus. Les pixels incluent les ombres visibles, pas un readback séparé de toute shadowmap. WebGL et toutes les scènes ne sont pas recertifiés par ce contrôle borné.

Typage produit PASS6,470s, build Pages PASS2,129s ; typage du pilote final PASS0,880s. Les rapports, gels et rouges restent sous `tmp/performance-v305` et `tmp/validation-runs/performance-v305-*`. Aucune sauvegarde de référence régénérée ; `references_UI` et sessions utilisateur préservés. Les campagnes générales de simulation inchangée ne sont pas répétées pour ce lot de présentation.

## Comparaison en jeu

Le lot est retenu : GAME A/B/B/A sur les sources finales gelées `79387652`, rapport `game-final-next/abba-wsblMY/report.json`, PASS255,011s. Même V304 exacte contre candidat, nouveaux visuels conservés, Chrome matériel AMD/WebGPU,2560×1440/DPR1/dev, source8434/caméra129,122/zoom1, quatre cohortes fraîches, chauffe3s et fenêtre14s. Aucun timer de coût ni profiler dans le GAME.

| Passage | RAF/s à ×6 demandé | Débit réel | p95 intervalle | Maximum |
|---|---:|---:|---:|---:|
| 1 — A | 111.31 | 5.9259× | 24.5 ms | 44.4 ms |
| 2 — B | 115.34 | 5.9955× | 22.2 ms | 38.9 ms |
| 3 — B | 115.00 | 5.9760× | 22.7 ms | 39.9 ms |
| 4 — A | 108.64 | 5.7461× | 23.9 ms | 59.5 ms |

Cumul pondéré : **109,974→115,169 RAF/s, +4,72 %** ; débit réel **5,8360→5,9857×**. Les deux candidats dépassent les deux références et progressent davantage dans la simulation. Ce n’est pas une comparaison à débit strictement identique. Moyenne des p95 :24,20→22,45ms ; maxima candidats38,9/39,9ms. En pause :239,90→240,02RAF/s, comportement inchangé. Aucun taux d’affichage physique du moniteur n’est certifié.

Les quatre sauvegardes/recharges9036/9039/9037/9002 sont exactes ; erreurs vides, sources et63références/66fichiers publics inchangés. Chrome privé et Vite5367 sont fermés. Les géométries, dessins et triangles demeurent identiques à monde égal ; les comptes moyens des fenêtres jouées varient avec leurs ticks confirmés. L’égalité matérielle ciblée est celle des huit états ci-dessus, pas une égalité d’images entre des ticks différents.

Ce gain réduit le surcoût récent sans démontrer que toute la régression V304 est annulée. Le résultat historique131,98→125,85 de V304 appartient à une autre séance : les pourcentages ne se soustraient pas et les FPS absolus ne se comparent pas directement. Le retrait CPU de58,2% porte seulement sur la file contrôlée ; aucun temps GPU gagné n’est mesuré pour V305. **240FPS et fluidité constante ne sont pas atteints**. La prochaine cible doit retirer un coût substantiel du MAIN ou de la soumission graphique ; les uniformes secondaires et variantes d’atlas écartées ne justifient pas un autre banc inchangé.

SHA-256 du rapport GAME : `53287DC1261CFE6591DC116FE49DCBB8ECF83111DF0C7A25EB2BABB2D0A41D75`.

## Livraison

Produit commité et poussé en `ecbe76a79f9b886904be0192788647abd9000906`. Documentation PASS1,890s. Publication regroupée des corrections de ce lot sur [Cloudflare Pages](https://elsewhere-cq7.pages.dev/), déploiement `b0243966` PASS15,528s. Package PASS2,198s :469fichiers/106920817octets,63références/66fichiers publics et230SVG V304 exacts ; sources privées et laboratoire absents.

La vérification HTTPS passe en3,347s :40réponses200/MIME/octets exacts sur les origines stable et fraîche, rapport `tmp/elsewhere-pages/v305-http-ShKc3R/report.json`. Elle contrôle la publication, pas de nouveaux FPS en ligne. Le commit documentaire qui enregistre ces preuves ne provoque pas de seconde publication. Relance planifiée en pause ; `references_UI` préservé.

SHA-256 du rapport HTTPS : `F29EA1DF46E4B4BD6A9D4C940BE877A007D4F973A1BE6DBF89E83B2BB852FB97`.
