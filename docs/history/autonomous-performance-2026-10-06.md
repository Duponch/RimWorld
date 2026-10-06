# Travail nocturne et gain global — 6 octobre 2026

Point demandé par l'utilisateur sur le travail depuis le 5 octobre au soir.
Commits locaux, aucun push. Le produit courant reste V233 `42be79ad` ; les
commits V234/V235 suivants documentent des expériences écartées. Schéma 198,
62 sauvegardes et métadonnées conservés. Les prototypes V236 ne sont pas livrés.

## Modifications effectivement intégrées

Heures locales Europe/Paris, d'après Git ; les liens donnent contrats et limites.

| Livraison | Heure / commit | Modification |
| --- | --- | --- |
| V224 | 5 octobre 23:12, `8f3ef07f` | [Sièges et écrans orientés correctement](../development/aulnes-performance-v224.md), consolidation des premières lectures de la référence et dérivé réellement remonté. |
| V225 | 6 octobre 00:04, `2a024f5b` | [Journal des changements confirmés](../development/snapshot-presentation-v225.md) : composer les snapshots sautés et réexaminer les ressources utiles ; deux coûts capturés déjà produits reconnus par le lecteur de sauvegarde. |
| V227 | 01:59, `bd0df0ec` | [Agenda végétal](../development/plant-presentation-events-v227.md) : éviter les mêmes dérivations naturelles répétées, échéances exactes et partition des cultures. |
| V228 | 03:12, `59f6dc39` | [Registre du décodeur et index de scène](../development/scene-decoding-performance-v228.md) : contrôle collectif des identifiants et réconciliation des ressources/chunks, herbe et roches. |
| V229 | 04:05, `d1790533` | [Réconciliation végétale et signatures](../development/scene-reconciliation-v229.md) : conserver les captures encore exactes et les textes de comparaison bâtiments/stockage/foyer. |
| V230 | 05:52, `628ad25c` | [Core de scène séparé de l'hôte DOM](../development/scene-render-core-v230.md) : prépare les refontes sans changer règles ou présentation ; aucun gain FPS stable propre à cette extraction annoncé. |
| V233 | 09:19, `42be79ad` | [Journal structurel et consommateurs par ID](../development/resource-structural-presentation-v233.md) : réconcilier retraits/ajouts/changements confirmés sans reconstruire les captures naturelles entières. |

Plusieurs pistes ont été qualifiées puis retirées : partage lumineux V226,
copies/lecteur dédié V230, rendu Offscreen et préparation agricole V231,
recensements/tri/audio V232, propriété native V234 et distribution directe au
rendu V235. Les essais exacts mais plus lents ne sont pas intégrés. Les rapports
rouges et leurs reprises restent distincts ; les mesures de helpers ne sont pas
présentées comme des FPS du jeu. Les oracles de buffers/graphes, gardes,
sauvegardes/reprises, rendu matériel et contrôles de frontières accompagnent les
modifications adoptées, dans le périmètre de chaque preuve.

## Comparaison directe de la nuit

Les pourcentages des différents lots ne sont pas additionnés. À la demande de
l'utilisateur, ROOT rejoue une comparaison globale neuve : A = archive Git
exacte V225 `2a024f5b`, référence du début du chantier nocturne ; B = produit V233
courant. V224/V225 sont déjà dans A et ne sont donc pas crédités par ce total.

`aulnes-v236-cumulative-night-abba-2026-10-06T08-58-55.633Z-16840`,
**PASS, 98,981 s**. Nouveau dossier privé
`tmp/performance-orientation-v236/cumulative-v225-v233-next`, deux serveurs
possédés 5220/5221 fermés à la fin, contextes neufs A/B/B/A successifs. Harness
V224/V225 inchangé SHA-256 `65a88980b87abf80dde6440bc920e06ca24332fd463698e744a2af72cbfe0f62` ;
imports, chemins et labels du parent inversibles, manifest
`4E8C1F1DFD19B5DB090C8CA6DBA610699406FE0D688C1A9EEE7BBBE8900CF4D2`.
Rapport `native-abba-report.json` SHA-256
`A37D515F3238C2DDAAD26AEA9EBEA8A29DD3588D5F5213C536A860360095CF5A`.
Sources/entrée/harness stables avant/après, zéro erreur.

Même Aulnes corrigées tick6934, 250², Chromium153 headless matériel AMD RDNA-1,
1920×1080/DPR1, iso-near, cible caméra104/89, zoom2, span16,96. Herbe, textures,
ombres, nuages/précipitations, étiquettes et vent gardent leurs réglages communs ;
météo non forcée, aucun profil/timestamp GPU/GC forcé. Chauffe3s puis8s réelles,
vitesse6× demandée. Horloge, cadence, règles et qualité ne sont pas abaissées.

| Passe | Version | Images RAF/s | Vitesse réellement obtenue | CPU moyen d'image | p95 CPU d'image |
| --- | --- | ---: | ---: | ---: | ---: |
| A1 | V225 | 107,969 | 5,92587× | 5,455 ms | 19,4 ms |
| B1 | V233 | 144,798 | 5,88517× | 3,717 ms | 13,1 ms |
| B2 | V233 | 142,482 | 5,90044× | 3,844 ms | 13,8 ms |
| A2 | V225 | 107,675 | 5,91893× | 5,541 ms | 19,8 ms |

Moyenne **107,822 → 143,640 images/s : +35,817 images/s, +33,219 %** sur ce banc.
CPU moyen 5,498→3,780 ms, −31,24 % ; moyenne des p95 CPU19,60→13,45 ms.
Maxima CPU anciens37,3/33,0 ms, actuels23,3/26,4 ms. Vitesse réelle
5,9224→5,8928×, variation −0,50 %, pas de certification du vrai6× durable.
Décodage moyen4,465→4,159 ms, mais p95 moyen6,65→7,55 ms défavorable :
les pointes ne sont pas éliminées partout.

Un seul cycle à fenêtres courtes sur une caméra. Deux B dépassent les deux A,
mais cela ne garantit ni toutes les vues/parties, ni chaque image physique au
moniteur. Ces RAF headless ne remplacent pas le compteur du navigateur visible
de l'utilisateur. Le gain +4,031 images/s de V233 seul (112,094→116,125) venait
d'un autre banc et d'une autre caméra : il reste un résultat local, pas le total
de la nuit. Les 240 FPS restent ouverts.

## Portée et travail suivant

Les optimisations produit sont dans les lecteurs et couches partagés par toutes
les parties, sans sélection spéciale de la sauvegarde Aulnes. Elles bénéficient
surtout aux cartes peuplées de ressources/végétation et bâtiments. Le gain dépend
de la colonie, caméra, vitesse, résolution et matériel ; une petite carte peut
en bénéficier moins, et certains chargements froids ont régressé. Les contreparties
mixed100 et les 62 sauvegardes protègent l'exactitude, sans promettre un même
pourcentage de FPS partout.

Une nouvelle attribution actuelle V233, distincte et fortement instrumentée,
`aulnes-v236-current-stage-game-2026-10-06T08-54-00.395Z-22236`, **PASS30,304s**,
205 applications : applyWorld10,217ms moyens, Nature2,647ms, cultures1,069ms,
éclairage0,805ms dont Room.read0,560ms et LocalLight0,144ms. Timers inclusifs
imbriqués, ne pas les additionner ni les convertir en budgets exclusifs. Le
vrai GAME/HUD/audio et sauvegarde/reprise passent, anciennes vues exactes, aucune
erreur ; rapport privé SHA-256 `62DA5CC50505870C29D489C7A0E6DAC5BFD84A4B8052BC21A17AEBFB82C5B769`.

V236 prépare une capture terrain renderer-only pour éviter la relecture62500
cases au suffixe confirmé. Le premier gel privé a un défaut de copie BFS nord
détecté statiquement, jamais exécuté ; reprise distincte corrigée et relue,
manifest5743D54D. Les oracles/coûts natifs et raccord Core de reprise restent à
qualifier, aucune promotion ou gain acquis. L'autonomie demandée continue.

Contrôle documentaire `aulnes-night-status-documentation-2026-10-06T09-03-49.460Z-6352`,
PASS0,777s ; aucun test moteur/build répété pour ce point documentaire.
