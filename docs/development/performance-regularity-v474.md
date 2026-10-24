# V474 — régularité du rendu et débit de simulation

Lot A–G publié après V473, demandé le 24 octobre 2026.
Schéma 293 conservé ; aucune migration, modification des règles ou réduction
de qualité graphique. Les contrôles acquis ci-dessous montrent une forte
réduction des microcoupures sur Éclaircies, sans clôturer le chantier : une
pointe90ms en×6 et un débit5,8947× restent observés. Les ajouts de gameplay
attendent la suite de cette priorité. Produit `508fdfd6`,
[déploiement befebf5d](https://befebf5d.elsewhere-cq7.pages.dev/) /
[jouer](https://elsewhere-cq7.pages.dev/).

## Problème et méthode

L'utilisateur constate des microcoupures en rotation sur Éclaircies en ×1,
aggravées en ×3 et ×6, malgré un compteur FPS parfois élevé. On mesure donc les
intervalles d'image, leur p99, les maxima et le nombre d'intervalles dépassant
50 et 100 ms, en même temps que les ticks réellement reçus. Réduire la vitesse
physique ou afficher une image ancienne plus longtemps ne constitue pas un gain.

Référence : HEAD V473 `f0e60adefe3ef90116637b9044d19a667f73a72c`, produit
`8cbd25256e850269088a1dc857ca9277e6ca7ba7`. Le fichier original
`public/test-saves/v419/les-eclaircies.json` est rechargé avant chaque vitesse,
SHA256 `49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f`.
Chrome 155, WebGPU matériel, Ryzen 5 3600/RX 5700 XT, 2560×1440, DPR1,
textures/herbe/pièce/diorama actifs, ombres 60 Hz/2048. Effets et musique coupés
avant chaque document, Chrome lancé muet. Les réglages publics ne changent pas.
ROOT exécute successivement les contrôles lourds, avec empreintes des sources.

Le premier pilote reproduit de vrais glissements droits mais sa trajectoire
dépend de la cadence des échanges avec le navigateur : il sert au diagnostic,
pas à un A/B de caméra exact. Le pilote comparatif utilise ensuite une orbite
analytique selon le temps réel : cible (135,0,142), rayon 91,9238815543,
hauteur85, zoom2, un tour/10s, fenêtre20s. Il vérifie que les contraintes réelles
de caméra ne changent ni rayon, ni cible, ni hauteur. Ce parcours est préparé,
sans prétendre être un geste UI. Il conserve les réglages et recharge la partie.
Les images sont capturées après la mesure. RAF mesure une cadence de callbacks,
pas les présentations physiques sur le moniteur ni le temps GPU.

## Référence actuelle acquise

Rapport contrôlé :
`tmp/performance-v474/controlled-baseline-r1-2026-10-23T22-20-43-290Z/report.json`,
PASS301,193s, sources inchangées et aucune erreur applicative.

| Vitesse | RAF/s | p99 / maximum, ms | Intervalles >50 ms | Vitesse physique reçue | Adoption / application moyennes, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| ×1 |126,30|66,7 /191,7|97|1,005×|47,049 /15,069|
| ×3 |7,05|191,7 /191,9|141|2,454×|53,690 /20,224|
| ×6 |52,90|137,5 /200|151|4,917×|61,733 /25,938|

Le nombre de publications et leur regroupement diffèrent selon la vitesse :
le ×3 peut donc saturer MAIN plus fortement que le ×6. La vitesse reçue ne
distingue pas à elle seule un retard de transport d'un retard du moteur.

Le profil CPU séparé `main-profile-2026-10-23T22-09-06-202Z` attribue21,042s
sur31,322s profilées à l'adoption Resident. Les contrôles Firefoam dominent.
La fenêtre de jeu instrumentée est16,839s ; le profil plus long comprend les
attentes d'installation/arrêt. Une seconde passe instrumente15modules distincts,
sans erreur : quatre parcours Firefoam et quatre parcours de ses acteurs par
adoption sur cette carte. Ces temps sont inclusifs et ne doivent pas être
additionnés aux parents. La pause du premier pilote n'a aucun intervalle>50ms
en20s, contre95 à ×1 : le coût des publications est une cause mesurée.

## Première tranche

- Ne vérifier qu'une fois les mêmes gardes historiques Firefoam et seuils de
  reprise des factures sur le même paquet Resident. Le candidat reconstruit
  conserve toutes ses gardes, et le commit reste tardif et atomique.
- La garde Firefoam globale vérifie déjà la forme et les acteurs de ses cartes.
  Sa phase sémantique locale privée réutilise cette vérification synchrone.
  L'entrée locale publique garde son contrôle complet. Aucune confiance n'est
  accordée par un champ reçu ; pas de cache fondé sur le tick.
- Activer les deltas de structures du Worker fixe même sous1000 bâtiments.
  Le protocole existant conserve exactement les valeurs, changements au même
  tick, suppressions et ordres. Les objets inchangés et leurs journaux peuvent
  alors servir aux lecteurs de topologie, supports et lumières. Les encodeurs
  publics gardent leur comportement et les checkpoints restent complets.
- Partager la classification exacte des barrières entre le lecteur exhaustif
  et le lecteur de rendu. Les volumes géothermiques et spatiaux sont ainsi
  correctement invalidés lors des mises à jour partielles.

Le seuil1000 venait d'un compromis mesuré en V224 : la comparaison des
structures coûtait plus au Worker sur de petites scènes. Les nouveaux contrôles
MAIN et replis de rendu rendent nécessaire une nouvelle mesure du coût total.
La mesure de cette tranche est détaillée ci-dessous ; elle reste insuffisante.

Un préfiltre des propriétés absentes a été rejeté : il changeait l'admission
d'objets Proxy malformés. L'ordre des descripteurs des gardes reste inchangé.
La fusion des deux visites Firefoam/acteurs et un déplacement d'admission vers
un Worker restent des pistes, pas des modifications livrées.

## Contrôles et reprises en cours

Première sélection :93cas acquis sur103 ;10rouges conservés dans
`tmp/validation-runs/v474-targeted-a-2026-10-23T22-26-16.000Z-25620/output.log`.
Les28nouveaux cas sont acquis (15validation,5structures Worker,8topologie).
Cinq comparaisons du journal terrain attendaient encore le seuil1000 de l'ancien
encodeur : l'oracle complet a été aligné au nouveau mode de structures, sans
retirer les assertions de terrain. Reprise8cas acquise. Deux contrôles Firefoam
fermaient encore291 et trois fixtures graphiques omettaient l'état de leurs
étagères : les cinq échecs ont été reproduits exactement contre V473 isolée
(1998sources vérifiées). Attentes futures294 et fixtures réparées ; reprise29cas
acquise. Les103cas distincts sont acquis par reprises, pas en une suite unique.

Le premier typage a relevé uniquement une annotation de version trop étroite
dans les nouveaux tests ; annotation corrigée, reprise acquise43,483s. Le premier
essai de caméra contrôlée a échoué avant mesure (mauvais emplacement du plafond
dans le layout) ; échec conservé, reprise correcte ci-dessus.

## Première correction mesurée, insuffisante

`controlled-a-2026-10-23T22-35-21-824Z` : même pilote, orbite et réglages,
PASS328,325s, fichiers gelés et aucune erreur applicative.

| Vitesse | RAF/s | p99 / maximum, ms | Intervalles >50 ms | Vitesse physique reçue | Adoption / application moyennes, ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| ×1 |114,25|50 /204,1|21|1,008×|27,569 /10,926|
| ×3 |63,60|79,1 /237,4|87|2,824×|32,958 /17,201|
| ×6 |84,72|70,9 /220,9|77|4,161×|36,539 /18,502|

La préparation commune passe d'environ6,2ms à0,17ms ; les contrôles coûtent
moins. Les coupures diminuent, mais le FPS moyen×1 et le débit×6 ne progressent
pas. Ce candidat ne suffit donc pas à répondre au problème humain.

Une passe séparée `publication-a-2026-10-23T22-42-10-651Z` mesure29publications :
lecture event.data2,88ms, handler51,90ms, encode19,90ms, encode-fin→post53,70ms,
post3,20ms en moyenne. Prépost→entréeMAIN38,80ms/max437,80 comprend copie,
distribution et ordonnancement : ce n'est pas une mesure de file seule.
Profilage actif et instrumentation rendent ce passage impropre au gain FPS.

Les trois plus grands écarts entre entrées effectives frame durent196,3/180,1/
161,9ms ;139,2/125,2/127,5ms restent hors de l'union des enveloppes mesurées,
sans longtask chevauchant. Les timestamps RAF et wallAt ne sont pas
interchangeables. Aucun diagnostic GPU ou GC n'est déduit de cette absence.

Le profil Worker séparé `worker-cpu-b-2026-10-23T22-52-53-096Z` est acquis
(105,183s), source fixe et vraie cible presentation.worker.ts vérifiée. Les
premiers deltas des profils incluent l'acquisition du premier échantillon :
1851,835ms pour le premier MAIN,2292,786ms pour publication-a et1186,449ms pour
le Worker. Ils sont conservés séparément, sans les imputer au premier nom de
fonction. En particulier, le premier échantillon caisson ne prouve aucun coût
de1,2s de capture des animaux ; hors ce délai sa durée échantillonnée est10,827ms.
Les durées échantillonnées restantes sont des attributions de temps écoulé,
pas une preuve d'occupation CPU système.

## Deuxième correction graphique en qualification

ResourceLayer conserve les indices lorsque l'ensemble exact des parties
visibles reste le même. La croissance met toujours à jour positions et bornes ;
perte de feuilles, récolte, retrait et reconstruction conservent leurs vrais
changements d'indices. Cela évite de remapper et transférer les mêmes triangles.

18cas distincts acquis par reprises (2nouveaux et16voisins). Le premier nouveau
scénario échouait parce que0,2→0,25 reste au même palier visuel ; reprise avec
les vrais paliers0,4/0,7/0,1 acquise. Comparaisons des coins rendus, des bornes,
des indices, des recharges de géométrie et des compteurs du compilateur. Revue
indépendante sans blocage nouveau ; aucun gain global encore attribué à ce lot.

## Reprise après l'activité concurrente

Le relevé `controlled-b-2026-10-23T22-55-01-826Z` est intégralement exclu des
comparaisons : League of Legends était en cours pendant cette mesure. Après
confirmation humaine de sa fermeture, nouvelle référence V473 acquise dans
`paired-witness-a-2026-10-24T01-23-17-832Z/report.json` : mêmes Éclaircies,
orbite analytique, WebGPU 2560×1440/DPR1, audio coupé. Sources réellement
servies et ressources communes clôturées par SHA256, sans erreur applicative.

| Vitesse | RAF p99 / maximum, ms | Intervalles >50 ms | Débit réel |
| --- | ---: | ---: | ---: |
| ×1 |62,6 /212,5|86|0,9997×|
| ×3 |195,6 /225|129|2,3026×|
| ×6 |170,8 /220,8|148|4,8671×|

Ces valeurs décrivent le témoin ; le candidat doit encore être mesuré avec
le même pilote. Ce sont des intervalles de callbacks RAF, pas la preuve du
temps GPU ou de la présentation physique de chaque image.

## Réception native et population végétale en qualification

La voie native Firefoam identifie les objets ordinaires dans le premier
callback du Worker fixe. Un reçu d'événement natif à usage unique borne
l'optimisation à l'adoption synchrone du même paquet. Chaque lecture vérifie
encore l'identité connue et le prototype courant ; les objets inconnus et les
lecteurs publics conservent les descripteurs stricts. Le Resident existant
reste seul responsable de la chronologie et de la reconstruction. Aucun
second clone, gel de World, nouveau Worker ou changement de cadence.

Deux défauts de la proposition privée ont été corrigés avant qualification
native : prototype d'ancêtre modifié par un enfant et getter de paquet invoqué
avant la validation. La seconde correction retire les lectures et la lignée
redondantes de provenance ; les vérifications publiques ne sont pas réduites.

La capture des plantes construit directement la Map et les compteurs repris
par le même noyau de choix. Ordre, cellules uniques, RNG, propriétaires et
invalidations après chaque nouveau plant restent contrôlés. La population ne
survit pas à cette avance de simulation. La suite spatiale comprend les choix
comparés, les refus et la continuation exacte après modifications du terrain
et reconstruction froide.

35cas/4fichiers acquis dans `v474-native-flora-a`, puis 28cas/4fichiers voisins
du client acquis dans `v474-client-neighbors`. Le typage R2 précède les deux
corrections de revue ; les reprises R3 et la première comparaison sont
précisées ci-dessous. La présentation et les recharges finales restent ouvertes.

## Première paire complète après reprise

Le candidat A+B+C+D final R3 est mesuré dans
`paired-candidate-c-2026-10-24T01-36-04-021Z` (PASS,242,627s). Le comparateur
confirme les entrées communes exactes avec le nouveau témoin ci-dessus.

| Vitesse | RAF/s témoin → candidat | p99, ms | >50 ms | Débit réel |
| --- | ---: | ---: | ---: | ---: |
| ×1 |129,07 →187,02|62,6 →33,3|86 →2|0,9997 →0,9997×|
| ×3 |6,46 →52,33|195,6 →70,9|129 →115|2,3026 →2,9967×|
| ×6 |46,04 →113,42|170,8 →49,9|148 →16|4,8671 →5,5442×|

Le temps total des intervalles dépassant50ms passe de5,421à0,204s en×1,
19,983à6,975s en×3 et14,701à0,980s en×6. La plus longue suite passe de
3à1,129à5 et13à1 intervalles. Les maximums candidats restent145,8/150/158,4ms.
Ce relevé montre une amélioration dans ce contexte, sans rétablir le confort
général : ×3 et les pointes isolées restent prioritaires, ×6 réel reste incomplet.
Une seule paire n'établit pas un gain général ; répétition et diagnostic des
pointes restent requis. Le nettoyage du disque demandé intervient après cette
paire achevée et ne lui est pas mélangé.

R3 : les19cas ciblés de provenance/Firefoam ont été rejoués après correction,
typage acquis (`v474-type-r3`). Sept scénarios/57assertions dans le vrai Worker
Chromium acquis (`v474-native-browser-r3`,19,329s), copies strictes et Worlds
entiers comparés, mutations et faux événements refusés. Ces contrôles n'utilisent
pas de renderer ; la paire graphique emploie Chrome155/WebGPU. Présentation
métier, parcours UI et recharge complète finale restent distincts et ouverts.

## Diagnostic complémentaire après entretien du disque

L'entretien demandé a supprimé 107 anciens caches SSR recréables, tous antérieurs
aux processus actifs et âgés de plus de 48 heures. Gain observé : 3,153 Go ;
sauvegardes, rapports et copies figées conservés. Les mesures suivantes sont
postérieures à cet entretien, sans lui attribuer un gain de calcul.

Le profil MAIN ×3 du candidat C (`main-profile-candidate-x3-2026-10-24T01-50-00-561Z`)
confirme le coût des deux visites Firefoam : environ 2,209 s et 1,124 s de temps
propre échantillonné. L'acquisition initiale du profiler (1,234 s) est exclue de
l'attribution des fonctions. Les coûts inclusifs se recouvrent et ne s'ajoutent
pas. Ce profil est diagnostique, pas une nouvelle comparaison de FPS.

L'observation LoAF du même candidat (`loaf-candidate-c-2026-10-24T01-54-35-064Z`)
conserve une image longue de 153,3 ms en ×1, dont les scripts rapportés occupent
25,5 ms de réception Worker et 10,9 ms de RAF. Le reste n'est pas attribué :
LoAF ne décrit pas tous les scripts courts, les Workers ou le temps GPU. La
première préparation de trace a échoué avant enregistrement car la liste de
catégories était vide ; cet échec est conservé, sans diagnostic produit déduit.

La tranche E vérifie les arêtes de propriétaires absentes en une visite des
clés d'un objet natif reconnu, avec vérification vivante du prototype. Elle
mémorise aussi uniquement le corps sémantique positif des traces au sol
réellement copiées et gelées par leur propriétaire résident, pour une version
exacte. Budget, cycles, identifiants, champs hérités et contexte physique restent
contrôlés à chaque lecture. Aucun World ou paquet n'est réputé valide par cache.

45 cas ciblés dans quatre fichiers, 23 cas voisins des traces au sol, typage et
les sept scénarios du vrai Worker passent sur E. Le nom inexistant
`resident-filth-v436.test.ts` d'une première sélection ne compte pour aucune
preuve ; les trois fichiers voisins v433 ont été exécutés ensuite. Les
contrôles fonctionnels finaux et la présentation restent ouverts.

Le relevé E complet (`paired-candidate-e-2026-10-24T02-17-45-700Z`, PASS239,444s)
est acquis sur les sources inchangées. Le nouveau témoin post-entretien
`paired-witness-b` est acquis ensuite (PASS234,267s), inversant l'ordre de
la première paire. `paired-b-e-comparison.json` confirme les entrées communes.

| Vitesse | RAF/s E | p99, ms | Maximum, ms | Intervalles >50 ms | Débit réel |
| --- | ---: | ---: | ---: | ---: | ---: |
| ×1 |147,89|23,9|144,0|1|0,9996×|
| ×3 |111,24|30,0|156,0|2|2,9971×|
| ×6 |112,55|36,0|150,1|2|5,6894×|

Les coûts moyens d'admission sont15,069/15,751/18,334ms. La cadence moyenne
×1 est inférieure à celle du relevé C, tandis que ses percentiles et le nombre
de longues coupures sont meilleurs ; aucune sélection du seul indicateur
favorable. Les pointes isolées et le déficit de débit ×6 restent à traiter.

| Vitesse | RAF/s témoin → E | p99, ms | Intervalles >50 ms | Débit réel témoin → E |
| --- | ---: | ---: | ---: | ---: |
| ×1 |114,69 →147,89|54,0 →23,9|33 →1|0,9998 →0,9996×|
| ×3 |8,37 →111,24|186,0 →30,0|165 →2|2,9334 →2,9971×|
| ×6 |29,57 →112,55|186,0 →36,0|158 →2|5,8121 →5,6894×|

Les plus longues suites d'intervalles >50ms passent de1/99/42à1/1/1. Leur
temps total passe de2,022/19,932/15,917sà0,144/0,210/0,216s. La réduction des
microcoupures ordinaires est acquise dans ces relevés, sans résolution des
pointes isolées. Le débit ×6 est inférieur au témoin de cette seconde paire
alors qu'il était supérieur dans la première : aucun gain général de simulation
n'est établi, et aucune baisse volontaire de cadence ne fait partie du correctif.

La trace avec cc/gpu a saturé son buffer32MiB et produit `dataLossOccurred:true`.
La reprise CPU sans ces deux catégories n'a pas perdu d'événements, mais son
export JSON a dépassé64MiB : les deux fichiers partiels restent exclus de
l'attribution. La reprise128MiB avec toplevel a aussi dépassé sa borne.
L'échantillon borné des4premiersMiB attribue91,3%de ses octets aux groupes
toplevel, sans en déduire du temps de calcul. Retirer ce groupe et demander
RunTask par `disabled-by-default-devtools.timeline` réduit la collecte ; un
premier export64MiB reste partiel. Un lancement avec l'ancien helper a été
interrompu pendant le chargement après constat d'un patch non appliqué : ce
rapport est conservé comme incident de pilote, sans fenêtre de jeu acquise.

La collecte finale `trace-candidate-e-minimal-r3-x1-2026-10-24T02-35-43-638Z`
est acquise sans perte (PASS96,699s, fichier96 944 759octets, buffer32MiB,
export plafonné256MiB). Les marques du thread `CrRendererMain` s'alignent sur
la fenêtre locale à0,001ms près. La lecture offline a été corrigée pour le
format final réellement émis : dernier événement et clé metadata sur la même
ligne ; aucun nouvel enregistrement n'était nécessaire.

Dans cette trace instrumentée, le plus grand intervalle entre entrées réelles
du renderer dure140,8ms (dt RAF144,1ms). L'union des tâches MAIN observées ne
couvre que26,858ms, sans GC MAIN. Le callback Worker se produit à l'intérieur
de l'intervalle ; les113,942ms restantes ne sont pas attribuées par ce canal.
Une autre pause de67,2ms est presque entièrement couverte par des tâches MAIN,
dont21,6ms de collecte mémoire. Cette observation ne prouve ni une attente GPU
ni une préemption système, et ne mesure pas la présentation physique.

Le diagnostic distinct `worker-throughput-e-x6-2026-10-24T02-39-13-457Z`
(PASS81,825s, sans profiler) relève673ticks reçus en20,0068s, soit5,6064×.
Les publications encadrent un débit produit de33,489à33,938ticks/s, inférieur
aux36visés. La croissance du retard de livraison est bornée à−3..+6ticks,
insuffisante pour expliquer le déficit de47,245ticks. Dix intervalles entre
appels réels de FixedClock dépassent250ms, maximum549,7ms ; leur écrêtage
écarte1095,7ms entièrement comprises dans la fenêtre, soit39,445ticks de
crédit temporel. Aucun reset, changement de vitesse ou cap15atteint : maximum
9ticks retournés par appel. Le prochain diagnostic doit localiser les coûts
Worker et publication, sans augmenter ce seuil pour masquer leur coût. Ces
enveloppes instrumentées ne remplacent pas les mesures comparatives natives.

### Vérifications fonctionnelles E et diagnostics supplémentaires

Le parcours `functional-e-2026-10-24T02-43-00-123Z` est acquis
(PASS99,942s) : vrais choix UI des vitesses1/3/6,48 déplacements bouton droit
par vitesse et inspections Bio/Besoins/Santé. Le monde final tick1840,
RNG2872372762 et1663piles est rechargé intégralement, identique après60RAF en
pause ; les14 556 341octets exportés ont le même SHA256
`95f05062e9c8f70860e9305f7638f926a8263ce79175bfa62fc52ab0591feb82`.
Zéro erreur applicative, fault ou resync ; image finale inspectée. Ce contrôle
fonctionnel ne remplace ni un benchmark ni une campagne complète.

La présentation E est acquise par reprise : premier lancement sans query e2e,
FAIL de préparation avant scénario ; reprise `v474-presentation-e-r2`
PASS156,021s. Les44 contrôles exigés passent,22 pour la mine et22 pour
l'abattage. Maximums d'intervalle observés30/42ms, aucun saut invalide, acteur
affamé de présentation ou occupation solide. Un excès brut d'abattage est
classé comme segment continu ; il n'est pas déclaré inexistant. Les anciens
échecs et les observations gapCount117/132 restent dans leurs rapports.

Dans la même trace complète, le RAF5152 est demandé à65909,358ms et exécuté
à66050,147ms, avec la même identité de frame et sans annulation observée.
Deux tâches du thread CrGpuMain du processus GPU durent50,811/110,617ms en
temps écoulé et49,573/109,748ms en temps de thread CPU. La seconde se termine
2,486ms avant ce callback RAF. Cela montre un travail CPU important dans ce
processus ; ce ne sont pas des temps d'exécution sur le GPU physique et la
cause précise reste ouverte. Une collecte Dawn courte distincte doit vérifier
les opérations concernées et les créations de pipelines du vrai device.

Le profil Worker E actuel `worker-cpu-e-late-x6-2026-10-24T02-53-52-496Z`
est acquis (PASS83,088s). Le premier échantillon de976,950ms d'acquisition
est exclu de l'attribution ; il reste10 296,484ms échantillonnées. Les coûts
inclusifs principaux sont stepWorld6330,331ms, publication3315,942ms,
température de surface1837,619ms, faune1568,845ms, flore1347,086ms et capture
d'apparence naturelle1163,588ms. Le comparateur de base des ressources occupe
410,902ms propres. Ces valeurs se recouvrent et ne s'additionnent pas ; elles
orientent des corrections bornées sans modifier le débit demandé, les règles
ou la précision des valeurs.

La collecte Dawn `gpu5s-candidate-e-x1-2026-10-24T03-00-49-049Z` est acquise
(PASS79,885s,25 149 370octets, zéro perte). Après13s d'orbite continue, la
fenêtre5,008s reproduit un intervalle RAF144ms et un trou réel142,9ms, dont
27,074ms seulement de tâches MAIN observées. Les deux créations sur le vrai
GPUDevice sont `ShadowMaterial_384` et `MeshStandardNodeMaterial_373`, en
fenêtre et non pendant l'échauffement. La trace du processus GPU associe le
second label à `DeviceBase::APICreateRenderPipeline`105,728ms, dont
`ShaderModuleD3D12::Compile`73,185ms et `CompileShaderDXC`68,059ms inclusifs.
La tâche englobante dure112,102ms, dont110,800ms de thread CPU. La compilation
hôte D3D12/DXC est donc observée ; l'objet graphique responsable et la bonne
préparation restent à identifier. Aucun temps GPU physique n'est déduit.

Le diagnostic sans trace `pipeline-origin-e-x1-2026-10-24T03-08-26-699Z`
(PASS76,529s) identifie les deux créations : même mesh «Carried materials —
shared GPU pawn poses», tick1834, matériau373 et variante d'ombre384. La
géométrie résidente utilise un tableau de matériaux et des groupes de sommets
sélectionnés selon les cargaisons présentes. Vides au chargement, ces groupes
font ignorer le lot par la compilation et la passe d'ombres existantes. Le
premier transport sélectionne ensuite un groupe et provoque la compilation.
Le lot de dépôts partiels utilise la même organisation. Ce relevé conserve
son maximum RAF192ms ; il sert à l'identification, pas à annoncer une cadence.

### F — lectures de croissance et session de flore physique

Le lecteur de croissance réutilise sa dernière entrée de sol après avoir relu
sa clé réelle terrain/pierre/sol couvert. L'entrée reste locale à la passe
synchrone existante ; aucun résultat de croissance ou état du World n'est
conservé. Les résultats booléens de substrat demandent un seul accès Map, avec
un second contrôle pour distinguer un résultat `undefined` mémorisé d'une
absence. Formule publique, ordre flottant, lecture du toit et ancres restent
inchangés.

Les régions déjà résolues reprennent leur objet dans la Map de la même session
avant de recalculer les coordonnées de chunk. Les six bits d'occupation des
cases sont stockés dans un Uint8Array temporaire, borné par la carte validée
(62 500octets pour250²). Parcours physiques, refus et ordre des tirages restent
les mêmes. La garde de type numérique évite de convertir une clé de geyser
brute en chaîne en un indice qui n'était pas visible dans l'ancienne Map.
Ni cache entre ticks ni nouvelle invalidation persistante n'est ajouté.

La sélection `v474-sim-f` passe38cas dans quatre fichiers (PASS29,345s),
dont neuf cas ajoutés. Elle conserve les comparaisons exactes au lecteur de
croissance public, aux classifications physiques et au spawner froid, les
tirages, reprises et18étapes de renouvellement. Aucun gain de cadence ou de
débit n'est encore attribué à F.

### G — préparer les lots de cargaisons avant leur premier usage

La préparation existante expose une seule plage réelle de mobilier emballé
dans chacun des deux lots de cargaisons vides. Les matériaux, attributs et
capacités restent les mêmes ; le World n'est pas modifié. Le premier groupe
actuel contient72sommets, au lieu d'exposer tout le catalogue graphique.

Une sélection réelle de cargaison retire l'override avant la comparaison des
types déjà sélectionnés. Elle garde le compte que le producteur vient d'écrire,
y compris pour vider un dépôt partiel sans modifier ses attributs. La
restauration conserve les nouvelles géométries et les comptes adoptés ; elle
rétablit la visibilité temporaire du même mesh. La préparation est réarmée
juste avant chaque compilation de projection et chaque passe réelle d'ombres,
afin qu'une adoption entre deux attentes ne supprime pas la préparation
suivante. Les groupes sont capturés synchroniquement par Three0.186 avant
ses attentes de compilation, après l'initialisation du renderer.

Les dix cas nouveaux passent, avec17voisins acquis dans `v474-cargo-g`.
Un ancien cas d'inspection du corps échoue dans son NodeBuilder sans
géométrie ; le même échec est reproduit sur V473 isolée
(`v474-witness-body-g`, FAIL17,369s). Sa correction de pilote est distincte
du produit : le builder reçoit le vrai mesh, toutes les assertions sont
conservées. Le cas repris passe (`v474-body-oracle-g-r1`, PASS15,760s),
soit28cas distincts acquis par reprises. Le typage final A–G passe
(`v474-type-g`, PASS15,891s).

Le contrôle natif `cargo-native-g-x1-2026-10-24T03-30-58-038Z`
(PASS75,888s) observe le même lot760, géométrie3758 et matériau373.
Au chargement1730, ses groupes sont de nouveau vides et son compte vaut3 :
la préparation temporaire a bien été retirée. Au tick1834, le transport
réel expose deux groupes et le type236 dans son vrai slot ; aucune nouvelle
création de pipeline cargo ou autre n'est observée pendant les13+5secondes.
Le maximum RAF de cette fenêtre est24ms, contre144ms dans le diagnostic E
correspondant. Ce contrôle établit la suppression de la compilation au
premier transport observé, pas une mesure comparative générale de FPS ni
un premier dépôt partiel joué. Ce dernier lot est couvert par les cas ciblés.

### Troisième paire — témoin C puis candidat G

La nouvelle référence `paired-witness-c-2026-10-24T03-17-11-448Z`
(PASS232,144s) et le candidat `paired-candidate-g-2026-10-24T03-26-50-082Z`
(PASS234,597s) satisfont `COMPARABLE_INPUTS` dans
`tmp/performance-v474/paired-c-g-comparison.json`. Même sauvegarde originale,
pilote, orbite, qualité, audio coupé et entrées communes vérifiées. La paire
précédente en ordre inverse reste conservée ; aucune mesure défavorable n'est
retirée.

| Vitesse | RAF/s témoin → G | p99, ms | Intervalles >50 ms | Débit réel témoin → G |
| --- | ---: | ---: | ---: | ---: |
| ×1 |112,25 →147,29|59,9 →24,0|38 →0|1,0055 →0,9998×|
| ×3 |10,40 →112,90|174,0 →30,0|180 →1|2,9937 →2,9976×|
| ×6 |29,11 →111,36|174,0 →30,1|153 →1|5,6495 →5,8947×|

Les maximums du candidat sont41,9/54,0/90,0ms. Les pointes proches de150ms
ne se reproduisent pas dans cette paire, mais une pointe90ms
reste en×6 et le débit demandé n'est pas entièrement tenu. F et G ne sont
pas isolés par cette comparaison : elle évalue le lot complet A–G face à
V473, sans attribuer à chacun un gain arbitraire. Ces callbacks RAF ne
prouvent pas l'affichage physique sur un moniteur ni une fluidité universelle.

## Qualification finale et suite

Le parcours `functional-g-2026-10-24T03-37-09-270Z` passe en99,938s :
choix UI des trois vitesses,48mouvements réels de souris par vitesse,
inspections Bio/Besoins/Santé et pauses stables. La partie jouée au tick1843,
RNG3112216542 et1663piles, est rechargée entièrement avec les mêmes octets
après60RAF en pause, SHA256
`88575165fc2654e715b542a47d9c3d4ab46c19d33d39cfab736fa5533240f2a8`.
Sources inchangées, zéro erreur applicative, fault ou resync ; image finale
inspectée. Effets et musique coupés avant chaque document. Ce contrôle
n'est ni une campagne de survie ni un benchmark supplémentaire.

La présentation mine/abattage acquise sur E reste utilisée : F conserve les
valeurs physiques et G change seulement la préparation des lots avant usage.
Leurs garanties propres sont couvertes par les38cas F,28cas G par reprises,
la preuve du premier cargo et ce parcours final. Les contrats de clone du
bridge, contrôles historiques et7contrats Worker natifs restent documentés
dans les sections précédentes ; leurs répétitions ne sont pas additionnées.

Suite prioritaire : localiser la pointe résiduelle en×6 et vérifier le coût
Worker courant après F. Ne pas augmenter l'écrêtage temporel, réduire la
qualité ou la cadence de simulation pour améliorer les seuls chiffres RAF.
Le chantier performances, les campagnes et les six ensembles restent ouverts.

## Publication

Produit `508fdfd6b2ee3539c1d48c3e8a33069c79737890`, push `origin/main`
acquis. Build Pages PASS4,419s ; avertissement de taille des chunks conservé.
Documentation PASS2,026s après un refus de lancement Python dans le bac à
sable, avant contrôle, conservé comme incident d'environnement.

Les2006entrées de compilation sont identiques avant/après build et les
sources `src` identiques au parcours final G. Le contrôle Git brut a relevé
253fichiers à fins de ligne CRLF ; son échec est conservé. Le compagnon
`release-crlf-companion-2026-10-24T03-43-39-070Z.json` vérifie1753fichiers
bruts exacts et253écarts exclusivement CRLF→LF, octet par octet contre les
blobs du commit et selon ses attributs explicites. Aucun fichier produit
n'a été réécrit pour cette vérification, aucun autre filtre admis.

Paquet `tmp/elsewhere-pages/v474-package-gmz4Ao/report.json`, PASS2,146s :
552fichiers,68entrées du catalogue et71chemins publics de sauvegardes
préservés ; ressources statiques identiques au paquet V473. Les sources,
laboratoire et marqueurs QA privés sont absents. Déploiement `befebf5d`
PASS16,444s puis contrôle de20réponses HTTPS PASS6,440s, octets et MIME
exacts sur origine stable et immuable. L'avertissement Wrangler sur l'arbre
sale vient de `references_UI/`, resté non suivi et hors paquet.

Ces vérifications établissent le paquet servi, pas un nouveau benchmark en
production. Les tests natifs restent ceux des sources identiques qualifiées.

## Références techniques

Consultées le24octobre2026 : [Chrome, Long Animation Frames](https://developer.chrome.com/docs/web-platform/long-animation-frames),
[Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers),
[structured clone](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm),
[postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Worker/postMessage).
Les longues tâches n'épuisent pas les causes d'images longues ; les travaux
groupés et la préparation graphique doivent aussi être mesurés. Le passage
entre Workers clone les objets et ne transfère pas les capacités WeakMap.
Ces références concernent l'architecture navigateur, sans nouvelle règle Core.
