# V323 — Paysages de papier par biome et astres sur tiges

Schéma **229 conservé**. La demande humaine porte sur la présentation du
diorama : varier ses découpes, respecter les trois biomes jouables et faire
monter puis descendre soleil et lune sur des supports en carton. Simulation,
bridge, calendrier autoritaire et sauvegardes publiques restent inchangés.

## Direction et génération

Chaque côté est composé au chargement à partir de la graine du monde, du biome
et de sels distincts pour relief, flore, nuages et pigments. Aucun tirage ne
consomme le générateur de la simulation. Les contours, sommets, proportions,
positions et nuances varient ; un même site retrouve exactement ses découpes.
Le cache inclut graine et biome, même lorsque les dimensions restent identiques.

- Forêt tempérée : chênes, peupliers, reliefs verts et quelques calottes claires.
- Forêt boréale : pins, bouleaux, pigments plus froids et davantage de neige.
- Broussailles arides : saguaros, dragos, agaves, touffes et plateaux ocre, sans neige.

Les limites sont indépendantes du nombre de cellules : au plus64découpes par
côté,32points par contour et7000triangles estimés par côté, y compris séparation
bas/haut et ombres de contact. La boîte conserve quatre murs hauts, ses rebords
permanents, les solides de papier épaissis deV322 et les plis relevés. Les deux
textures deV321, la table et son assemblage restent en place.

## Petit théâtre céleste

Le soleil doré et la lune en véritable croissant ont chacun une tige plate,
placée derrière leur découpe. Ils coulissent verticalement sur le mur nord,
derrière les décors du bas ; leur partie rentrée est cachée à l'intérieur du
fond de carton. Ils partagent le lot de papier supérieur existant, sans nouveau
mesh, lumière, passe d'ombre ou mélangeur d'animation.

Un attribut statique identifie les deux glissières. Un uniforme de quatre
composantes fournit leurs déplacements, le plan inférieur et la visibilité de
leur face intérieure. Seuls les sommets de ces glissières sont déplacés dans le
shader ; les buffers de géométrie ne sont ni reconstruits ni téléversés à chaque
image. Les bornes incluent toutes les positions possibles. L'éclairage standard
et le grain du papier s'appliquent aux découpes mobiles comme aux autres.

Le déplacement utilise `daylight.sample.y`, immédiatement après l'éclairage
existant, donc son temps civil et son horloge de présentation confirmée. La
pause et la recharge ne lancent aucune horloge indépendante. Une éclipse réduit
la lumière sans déplacer artificiellement le soleil. L'interprétation solaire
saisonnière existante utilise encore la latitude tempérée pour les trois biomes ;
ce lot ne prétend pas ajouter une astronomie propre à chacun.

La visibilité caméra est indépendante des mises à jour d'heure. Les glissières
ne sont montrées que depuis la face intérieure du mur nord : œil devant leur
front réel en perspective, rayons dirigés vers le mur en orthographique. Cela
couvre aussi une caméra dans l'épaisseur du carton. Tout segment vers le sol
jouable reste alors devant les astres ; ils sont exclus de l'index statique
d'occlusion, sans recalcul de cet index à chaque changement d'heure.

## Coûts et techniques

Le décor reste limité à18lots opaques indexés, avec couleurs par sommet,
matériaux partagés, mipmaps, filtrage anisotrope et ombres de contact intégrées
à la géométrie. Le rejet hors champ et le résultat caméra sont conservés en
cache. La génération procédurale est un coût de préparation du site, pas une
boucle par image ou cellule. L'option OFF évite la création initiale ; après
usage, elle détache les ressources résidentes et sort avant leurs mises à jour.

Le mouvement ajoute un attribut uniquement au papier nord et un petit shader
de position ; deux variantes de matériau, uni/texturé, partagent cet uniforme.
Il n'est donc pas exact d'annoncer un coût matériel strictement nul. Les
[géométries indexées](https://threejs.org/docs/pages/BufferGeometry.html) et les
[attributs/uniformes TSL](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language)
sont les mécanismes documentés utilisés, sans nouvelle dépendance ni changement
de moteur. Les mesures intégrées et leurs limites figurent ci-dessous.

## Contrôles

Groupe ciblé :39cas uniques dans7fichiers acquis par reprises.
`v323-targeted-2026-10-11T19-53-01.672Z-1592` conserve36réussites et trois erreurs
de test en31,477s : la vérification d'épaisseur lisait l'attribut céleste sur les
lots statiques qui n'en ont pas. La lecture optionnelle corrige seulement cet
oracle. `v323-thickness-reprise-2026-10-11T19-53-51.286Z-12644` passe les8cas du
fichier en2,804s. Typage `v323-typecheck-2026-10-11T19-53-54.179Z-4472` PASS9,455s.

Le premier lanceur de présentation `v323-presentation-2026-10-11T19-54-47.959Z-25536`
échoue en3,232s avant navigateur, accès au serveur local interdit par le bac à
sable. Sa reprise emploie les permissions locales appropriées, sans changer
les assertions du pilote. `v323-presentation-reprise-2026-10-11T19-55-31.549Z-10320`
passe en122,129s : parcours commun minage/abattage, vitesses1/6/3,
sans saut ni occupation solide. Ce contrôle précède uniquement le relèvement
artistique de la position maximale des astres ; la reprise ciblée finale
`v323-sky-height-2026-10-11T19-59-47.081Z-25280` passe24cas/4fichiers en17,049s.

Le premier natif `v323-native-2026-10-11T20-01-32.204Z-25424` conserve un rouge
en110,953s, rapport `tmp/diorama-v323/native-cHCiSP/report.json`. Quatre sites
créés par l'UI ordinaire passent : les trois biomes à graine42 et la forêt
tempérée à graine43, avec quatre géométries différentes, huit poses contrôlées
contre l'oracle d'occlusion indépendant et quatre recharges exactes. Sept
captures sont conservées et les trois profils ont été inspectés. OFF avant
allocation, Aulnes8434exact et gel2770exact sont aussi acquis ; erreurs natives
vides, Chrome/Vite5400fermés.

L'arrêt vient exclusivement du préparateur privé des heures : il tentait de
modifier `climate.calendarOrigin`, alors que la validation exige son égalité
avec l'origine dérivée de l'adoption. Aucun état invalide n'a été chargé. La
reprise conserve ces résultats acquis et distingue des probes horaires de
rendu à monde inchangé d'une continuation réelle des Aulnes. Aucun changement
de validation ou du calendrier du produit ne contourne cet invariant.

Reprise `v323-native-reprise-2026-10-11T20-13-56.704Z-10204`
PASS184,148s (`tmp/diorama-v323/native-reprise-ZicIvl/report.json`). Le gel
2776entrées conserve exactement les sources/tests/publics et les six feuilles
produit du premier natif. Probes horaires uniquement renderer : aube/crépuscule,
midi/minuit et deux montées visibles en huit étapes, sans changer World.
Le callback Three original est suspendu puis restauré par identité, avec état
canonique exact avant/après. Ces heures fournies ne prouvent pas une journée
naturelle ; le HUD garde l'heure du monde. Les captures inspectées montrent
soleil/lune et supports, mais certains couples iso/perspective sont identiques :
leur cause n'est pas encore attribuée. L'hypothèse initiale de synchronisation
de capture n'est pas démontrée et n'est pas présentée comme un défaut corrigé.

Séparément, Aulnes8434originales poursuivies réellement de71ticks jusqu'à8505,
sans dotation ni modification de l'heure. Les offsets suivent chaque échantillon
d'éclairage observé, caméra/buffers stables, pause et recharge exactes. OFF
durant une continuation conserve les offsets sans travail céleste ; trois
cycles OFF/ON gardent les identités et compteurs mémoire Three. Front/back,
seuil Float32 ±0,0001 et matériau alternatif passent. Chrome WebGPU matériel
AMD RDNA1,2560×1440/DPR1, erreurs vides, Chrome/Vite5400fermés.

## Comparaison intégrée V322 → V323

`v323-cost-2026-10-11T20-17-27.182Z-23704` PASS363,377s,
`tmp/diorama-v323/native-confirm-LPQnnt/report.json`. Chrome WebGPU matériel,
2560×1440/DPR1, serveur de développement, ordre A/B/B/A. A est le produit
V322 `df3062dc` et B les six feuilles V323 gelées ; qualités identiques,
Aulnes8434originales rechargées avant chaque vue. Chaque fenêtre dure6s après
4s de chauffe ; deux fenêtres par variante/vue/vitesse.

| Vue / vitesse | RAF/s A → B | Écart | Débit réel A → B | p95 moyen A → B |
| --- | --- | --- | --- | --- |
| Proche iso / pause | 240,09 → 236,58 | −1,46 % | pause | 4,75 → 4,95 ms |
| Proche iso / ×6 demandé | 93,84 → 102,81 | +9,56 % | 5,343 → 5,504× | 32,05 → 29,80 ms |
| Ensemble perspective / pause | 238,23 → 239,90 | +0,70 % | pause | 4,95 → 4,85 ms |
| Ensemble perspective / ×6 demandé | 98,98 → 97,96 | −1,02 % | 5,171 → 5,896× | 29,50 → 27,10 ms |

Le résultat est mixte et les débits diffèrent : aucune absence universelle de
baisse, aucun gain CPU/GPU ni vrai6×constant/240FPS ne sont certifiés. Les deux
B proches dépassent les deuxA, mais les B larges sont dispersés ; il serait
abusif d'attribuer le gain proche à la génération procédurale. Aucune règle,
qualité ou cadence n'a été réduite pour ces fenêtres.

La géométrie résidente mesurée reste à18lots :53990→55710sommets,
23380→24316triangles (+4,00 %), buffers attributs/index combinés
2656120→2752680octets (+96560octets, environ94Kio). Le compteur de dessins
de la scène en pause reste56en vue proche et113en vue large. Les triangles
soumis en vue large diffèrent du stock résident en raison du masquage des murs.
Ce recensement n'inclut pas toute la mémoire JS/GPU ni les coûts de compilation
ou de construction à froid.

Quatre sauvegardes/reprises exactes aux ticks8740/8784/8776/8767, erreurs vides,
les2776entrées du gel exactes avant/après ; les quatre Chrome et Vite5400 sont
fermés. Livraison consignée ci-dessous.

Compilation finale `v323-build-pages-2026-10-11T20-11-38.737Z-9160`
PASS12,973s, incluant le typage complet. Package
`v323-package-2026-10-11T20-12-09.712Z-12100` PASS2,049s :515fichiers,
119148950octets,63références/66fichiers publics exacts, laboratoire et sources
privés absents (`tmp/elsewhere-pages/v323-package-rD3mho/report.json`).
Documentation `v323-docs-2026-10-11T20-12-37.812Z-864` PASS2,715s.
Les fichiers du produit et du package n'ont pas changé pendant ces contrôles ;
la préparation parallèle du pilote natif inactif n'est pas une entrée du build.

## Qualification complémentaire des pixels

Deux pilotes privés complémentaires ont une sortie automatisée PASS, mais
leur oracle ne suffit pas à certifier le retour perspective → iso :
`v323-pixels-2026-10-11T20-24-25.318Z-24204` (60,149s,
`native-pixels-7m7Rlv`) et
`v323-pixels-full-frame-2026-10-11T20-28-03.223Z-6960` (62,230s,
`native-pixels-full-Xc3NN6`). Le premier attend la file GPU et deux RAF ;
le second conserve en plus toute la boucle native et substitue seulement
l'argument civil de l'éclairage, restauré ensuite par identité. World reste exact.

L'inspection a détecté que les deux captures nocturnes avaient encore la même
projection, malgré leurs états caméra distincts. Le contrôle indépendant dans
une région du monde hors HUD confirme ce rouge : 57,73 % de pixels changés
entre les deux vues de midi, contre seulement 0,20 % la nuit, seuil 10 %.
Son résultat reste dans `native-pixels-full-Xc3NN6/pixel-roi.json`. Un hash
d'image différent ne prouve donc pas à lui seul un changement de caméra.
La vérification de nuit est reprise depuis une caméra iso fraîche, sans
modifier le produit ; l'anomalie des bascules répétées demeure à qualifier.

La reprise `v323-pixels-night-first-2026-10-11T20-33-47.658Z-8812`
PASS55,026s (`tmp/diorama-v323/native-pixels-night-first-yQRDWT`) capture
la nuit iso dans un navigateur neuf avant de passer en perspective. Lune,
tige et les deux projections ont été inspectées. Le contrôle de la région
centrale hors HUD trouve1390pixels différents sur2560échantillons (54,30 %,
seuil10 %). Monde canonique inchangé, méthode d'éclairage restaurée, entrées
gelées exactes, erreurs vides et Chrome/Vite5400fermés. Cette reprise acquiert
la couverture nocturne des deux projections ; elle ne prétend pas réparer
l'anomalie du retour de projection dans les parcours précédents.

Qualification sur le produit précédent V322 strict (`A`) :
`v323-camera-baseline-2026-10-11T20-36-20.216Z-11688` conserve un rouge en39,003s,
rapport `tmp/diorama-v323/native-camera-1cjnlR/report.json`. Aulnes8434 en pause,
bouton caméra officiel, boucle native intacte, sans substitution horaire :
iso → perspective → iso. Matrices de projection, direction et coins projetés
reviennent exactement, mais les pixels restent en perspective au retour.
Le premier changement est visible, le second ne l'est pas. Ce défaut est donc
reproduit avantV323 ; sa cause interne n'est pas attribuée et ce lot ne le
prétend pas corrigé. Monde, sources, tests et publics exacts, erreurs natives
vides, Chrome/Vite5400fermés. Pas de répétition des campagnes déjà acquises.

Nettoyage final : retrait du seul saut de ligne vide final de
`diorama-geometry.ts`, après fermeture de tous les contrôles. Les2775autres
entrées gelées restent exactes ; le fichier modifié est exactement l'ancienne
version privée moins cet octet. Build Pages/typage final
`v323-build-final-2026-10-11T20-37-52.744Z-24772` PASS11,756s.
Les515fichiers compilés restent identiques octet pour octet au package déjà
inspecté (`tmp/diorama-v323/final-artifact-equivalence.json`). Aucun test
fonctionnel n'est rejoué pour ce seul nettoyage sans effet compilé.

## Livraison

Documentation finale `v323-docs-final-2026-10-11T20-38-37.768Z-10900`
PASS1,963s. Produit `79f92205` commité et poussé sur main, puis publié une
seule fois sur Cloudflare Pages en `3e8769bd` :
[adresse stable](https://elsewhere-cq7.pages.dev/) et
[publication](https://3e8769bd.elsewhere-cq7.pages.dev/).
`v323-deploy-2026-10-11T20-39-52.502Z-17560` PASS13,649s ; deux fichiers
envoyés,511déjà présents, en-têtes/redirections conservés. L'avertissement
Git dirty concerne uniquement `references_UI`, dossier utilisateur absent du
commit et du package.

`v323-https-2026-10-11T20-40-32.524Z-8880` PASS4,776s :102réponses
200/MIME/octets exacts,51chemins sur chaque origine. Rapport
`tmp/elsewhere-pages/v323-http-0641ja/report.json`. Package/publics inchangés ;
les66fichiers publics sont comparés localement et seuls les chemins indiqués
sont téléchargés. Aucun nouveau benchmark ou parcours de jeu en ligne n'est
revendiqué. Le commit documentaire de livraison ne déclenche aucun deuxième
déploiement. Aucun lot suivant engagé, relance planifiée **PAUSED**.
