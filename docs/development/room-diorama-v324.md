# V324 — Chambre, luminaires suspendus et réglages de lumière

Schéma **229 conservé**. Présentation uniquement : simulation, bridge, calendrier
autoritaire et archives publiques restent inchangés. La référence artistique est
le fichier humain `Lisiere_Table_Chambre_Orbites_WebGPU.html`. Sa scène et ses
commandes de démonstration ne sont pas exécutées dans le jeu ; le décor est
reconstruit autour de notre carte et de la table existante.

## Chambre et théâtre suspendu

Parquet, tapis, murs ouverts du côté caméra, fenêtre à rideaux, bibliothèque,
fauteuil, lit et petits accessoires composent la chambre. Les livres conservent
des variations déterministes. Le décor utilise16lots opaques indexés et19919
triangles, indépendamment du nombre de cellules. Aucun mobilier de simulation
ni table supplémentaire n'est créé. Les pieds de la table et le plancher se
rejoignent à `−0,389 × min(largeur, hauteur)`.

Deux rails parallèles portent des globes de papier irrégulier, avec coutures,
attaches et fils. Les trois petits nuages de coton ont des suspentes raccordées
au troisième arc et des brides fixées aux volumes réels. Le mouvement des
globes utilise la direction solaire déjà calculée depuis le temps civil confirmé.
Pause, changements de vitesse et recharge ne créent aucune horloge indépendante.

La lune plate de la boîte est un croissant fermé aux contours irréguliers et aux
pointes asymétriques ; les supports de carton sont épaissis. Ces découpes et les
nuages météorologiques du jeu restent présents, conformément à la demande.

## Éclairage et options

Lorsque la chambre est active, les globes remplacent le ciel et sa lumière
directionnelle. Deux lumières ponctuelles partagent les positions des globes.
La puissance solaire continue de varier avec la hauteur du soleil après le
plateau de l'ancien signal de jour ; sa couleur se réchauffe au crépuscule.
La distance au centre du plateau compense le changement d'échelle de la scène.

La demande humaine suivante ajoute une ambiance générale pour éviter les faces
noires et les nuits illisibles. Une lumière hémisphérique sans ombre fournit cette
ambiance, avec des couleurs plus froides la nuit. Elle remplace donc explicitement
la contrainte initiale des deux seules sources lumineuses. Les lampes de gameplay
et leurs effets restent inchangés.

Les Options de l'accueil et de la partie proposent **Soleil**, **Lune** et
**Ambiance**, de0à300%, par pas de5%, ainsi qu'une réinitialisation à100%.
Les facteurs s'appliquent immédiatement, même en pause, sans changer l'heure ni
les règles de visibilité/croissance de la simulation. Ils multiplient les courbes
horaires ; ils ne les remplacent pas par une lumière constante. Les valeurs sont
conservées dans ce navigateur sous `lisiere.presentation.lighting.v1`, en dehors
des sauvegardes. Elles s'appliquent aussi à l'éclairage antérieur, chambre coupée.

L'option **Chambre autour de la carte** est indépendante de **Diorama en carton**.
Boîte coupée et chambre active, la table reste présente. Chambre coupée, son
propriétaire graphique est détruit : géométries, matériaux, lumières et cibles de
rendu sont libérés ; aucun rendu ou mise à jour de chambre ne subsiste. Le ciel
habituel revient. OFF avant chargement ne crée aucune de ces ressources.

## Rendu et coût

La chambre seule est rendue à demi-résolution sur chaque axe, puis floutée dans
une cible de même taille. La profondeur détermine le flou, avec conversions
distinctes pour les caméras orthographique et perspective. L'image et son flou
sont réutilisés tant que caméra, lumière et décor ne changent pas. La composition
plein écran ne lit qu'une couleur et une profondeur. Le jeu est ensuite dessiné
à sa résolution normale : sa géométrie ne traverse jamais le flou de chambre.
Les pipelines hors champ sont préparés dans le vrai format de cible.

Une projection perspective d'ombre2048² est générée depuis le globe dominant.
Le projecteur technique reste hors scène et n'émet aucune lumière. Les deux
lumières ponctuelles échantillonnent cette projection, ce qui évite deux cartes
cubiques de six faces. Le cadrage suit les surfaces visibles et son cache conserve
les ombres en pause. Les éléments de chambre ne génèrent pas d'ombres dynamiques.

Limites visuelles explicites : la projection partagée n'est physiquement exacte
que pour le globe dominant quand les deux éclairent au crépuscule ; le secondaire
utilise le même masque. Une source placée à l'intérieur du volume des casters ne
peut être représentée par cette projection unique et désactive son ombre. Les
compteurs Three n'inventorient pas toute la mémoire CPU/GPU. Aucun coût matériel
nul, rendu physiquement exact,240FPS ou vrai×6constant n'est présumé.

## Contrôles et publication

Les rapports sont conservés sous `tmp/diorama-v324/` et les durées dans
`tmp/validation-runs/ledger.jsonl`. Les contrôles natifs emploient Chrome matériel,
2560×1440, DPR1 et des sources/pilotes figés. ROOT seul les exécute.

Les groupes unitaires se recouvrent : 73 cas dans 14 fichiers passent en
28,780 s, puis 45 cas dans 7 fichiers après les réglages en 18,995 s, puis
9 cas dans 2 fichiers après la correction du cache en 10,679 s. Ces nombres
ne sont pas additionnés comme des cas uniques. Les deux cas d'interface
permanents passent en 34,594 s : clavier, accueil/partie, persistance, reset
et refus explicite du stockage local. Les builds intermédiaires passent en
11,482 s et 14,612 s, typage inclus.

### Acquisitions et reprises natives

- Le premier aperçu `native-preview-tfyjkg` est rouge en 73,444 s : quatre vues
  sont acquises avant un échec de vérification du gel, dont le pilote a été
  modifié pendant le contrôle. Il précède l'ajout d'ambiance et n'est pas un
  PASS final.
- Le parcours `native-full-iloAVn` est rouge en 84,517 s. Il acquiert huit
  captures du jour sur Les Aulnes, les curseurs 0/150/défauts, l'accueil et sa
  recharge, les puissances et les pixels, la table avec boîte coupée, ainsi
  qu'une seule passe d'ombre invalidée pour deux frames en pause. Il rencontre
  ensuite une faute graphique en coupant la chambre.
- `native-lifecycle-HirzI8`, rouge en 60,101 s, capture la pile exacte : le
  bundle WebGPU conservé appelle un ancien `ShadowNode` après destruction de
  sa cible. Le produit invalide désormais `landscape` aux deux transitions,
  avant le prochain rendu. La destruction réelle des ressources est conservée.
- La reprise `native-lifecycle-9iu3RJ` passe en **134,423 s**, gel
  `freeze-WxlE0j`, 2783 entrées exactes. Deux cycles OFF/ON conservent le monde
  au tick8434 ; les compteurs de géométries, textures et cibles reviennent aux
  mêmes valeurs à chaque activation. Une continuation ordinaire atteint8499,
  puis la sauvegarde et la recharge canoniques sont exactes. Six vues de nuit
  couvrent les deux projections ; OFF froid n'alloue pas de chambre. Erreurs
  et piles vides, Chrome et Vite propres au contrôle fermés.

La nuit utilise la référence publique historique32×32 au tick civil0 ; le
jour utilise Les Aulnes250×250 au tick8434. Aucun temps, climat, objet ou état
de simulation n'est substitué. Les images finales sont inspectées. Le test
de curseur Lune natif est acquis le jour, où sa puissance est nulle ; ses
multiplications avec une lune active sont couvertes par les tests unitaires.
Ces contrôles ne certifient pas une nuit atteinte naturellement sur Les Aulnes
ni une campagne complète. Le défaut historique de retour iso→perspective→iso
à pose immobile, reproduit en V322, reste hors lot ; les vues utilisent des
contextes frais.

### Coût observé sur Les Aulnes

Comparaison **OFF / ON / ON / OFF**, quatre Chrome neufs, deux vues, pause et
×6 demandé ; 4 s de chauffe puis 6 s mesurées par fenêtre. Même produit final,
préférences graphiques, pose et référence8434 rétablie avant chaque vue.
La chambre et son éclairage remplacent le décor désactivé ; il ne s'agit donc
pas d'une mesure isolée du seul nouvel éclairage ambiant.

| Vue et vitesse | OFF, RAF/s | ON, RAF/s | Variation | Débit réel OFF → ON |
| --- | ---: | ---: | ---: | ---: |
| Proche iso, pause | 240,05 | 240,09 | +0,02 % | 0 → 0 |
| Large perspective, pause | 239,11 | 239,44 | +0,14 % | 0 → 0 |
| Proche iso, ×6 demandé | 100,85 | 88,19 | −12,56 % | 5,931 → 5,901× |
| Large perspective, ×6 demandé | 94,58 | 74,99 | −20,71 % | 6,031 → 5,992× |

Le p95 moyen passe de27,55 à31,10 ms en proche et de27,30 à33,60 ms en large.
Les deux répétitions ON restent sous les deux OFF en RAF/s à×6, mais les débits
et les dispersions diffèrent : la deuxième ON proche n'atteint que5,619×.
Ces observations établissent un **surcoût visible**, pas un gain, un coût nul,
une attribution CPU/GPU ou240FPS à vrai×6constant. La chambre reste facultative.
Les techniques de regroupement, de cache et de flou réduit ne suppriment pas
ce coût. Aucun modèle, règle ou cadence de simulation n'est réduit pour le test.

Rapport `native-cost-vDnEBR`, **PASS333,849 s**, gel `freeze-fc09NC`,2783entrées
exactes. Huit recharges canoniques exactes :8799/8802/8801/8806/8756/8777/8767/8786.
Erreurs vides et quatre paires Chrome/Vite fermées. Les captures de la première
ON complètent les vues diurnes du produit final, notamment en perspective.

Le premier coût `native-cost-Z9OjeE` reste rouge,61,747s : le pilote exigeait
124,5 bit-exact alors qu'OrbitControls retournait124,50000000000003. La reprise
admet uniquement une tolérance de1e−9 sur les nombres de caméra et conserve
les valeurs brutes. Les mondes/recharges restent comparés exactement. Le
produit n'a pas changé pour cette correction du pilote.

Le premier contrôle commun de présentation est rouge en64,987s : le mauvais
nom de variable de sélection a laissé démarrer Chromium au lieu de Chrome.
Le minage progresse2000→2885,186→162ordres, mais le navigateur signale
`An error occurred while generating Tint IR: swizzle view instruction still
has usages after lowering`. Ce message a déjà été rencontré dans les lots
antérieurs ; aucun correctif ni compatibilité de ce backend ne sont prétendus.
Rapport conservé sous `tmp/test-runs/v324-presentation-2026-10-11T21-48-03.061Z-18892/`.

La reprise avec `HARVEST_BROWSER=chrome` passe en **128,697 s** : minage et
abattage réels, changements de vitesse et suppressions confirmées, aucun saut
ni occupation solide détectés. Rapport sous
`tmp/test-runs/v324-presentation-chrome-2026-10-11T21-50-34.361Z-10712/`.
Le build Pages final avec typage passe en **11,273 s**. Le gel final reste
exact après ces contrôles. Simulation, bridge et les63références/66fichiers
publics restent inchangés ; aucune campagne de simulation générale n'est
rejouée pour ce lot graphique.

Publication regroupée prévue après commit/push, à la même adresse Cloudflare.
La relance planifiée reste **PAUSED** et aucun nouveau chantier de gameplay
n'est engagé pendant cette livraison.
