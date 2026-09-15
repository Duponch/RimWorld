# Cycle visuel et projections de caméra

Mise à jour V8 : le preset de croissance binaire décrit historiquement ci-dessous est remplacé par la [lumière naturelle et la première culture de riz](farming.md), avec migration des checkpoints. Météo et saisons restent absentes.
Livraison du 13 septembre 2026, schéma de sauvegarde **7 inchangé**. [Recherche et audit rétroactif](../research/environment-review.md). Corpus chap. 3/7/29, SYS-012/131/172..177 et UI-005 : adapter la présentation 3D, différer la simulation climatique complète. Cette tranche transversale ne clôture ni G0 ni G2.

## Contrat livré

`CameraRig` possède les projections orthographique et perspective et les contrôles orbitaux. Le bouton de vue reste près de l'heure, dans l'organisation d'interface existante. Une bascule conserve la cible, l'orientation et l'échelle au plan de la cible ; une perspective modifie naturellement la taille apparente des objets selon leur profondeur. Les déplacements caméra utilisent cette échelle dans les deux modes. La caméra reste au-dessus du sol ; ce n'est ni une vue à la première personne ni une collision physique avec les bâtiments.

Le pointage intersecte le même plan de grille, quelle que soit la projection. Un changement de vue annule un tracé non validé, sans soumettre une commande tardive. Redimensionner et recentrer restent disponibles. Le mode est conservé pendant les chargements et nouvelles colonies dans cette session ; il revient en iso après rechargement de la page. Il n'affecte jamais le `World`.

Le dézoom conserve l'hystérésis et les buffers résidents. En perspective, le seuil se fonde sur une borne prudente de la profondeur de la canopée la plus proche, pas sur la seule distance à la cible : regarder l'horizon ne doit pas transformer les arbres du premier plan en silhouettes distantes.

`daylight.ts` échantillonne un ciel clair d'équinoxe à 45°N, avec est = +X, sud = +Z, lever/coucher géométriques à 6/18 h et crépuscule progressif. **C'est une interprétation artistique documentée**, pas une adoption numérique du calcul céleste de RimWorld. Le soleil se déplace dans les directions du monde ; tourner la caméra ne change pas son azimut. Une lune opposée assure une faible lumière nocturne, sans calendrier lunaire simulé.

`DayNightLayer` modifie les uniformes du ciel TSL, les couleurs/intensités ambiantes et une seule lumière directionnelle. Le soleil s'éteint avant son passage sous le sol ; la source lunaire reprend la même lumière et la même carte d'ombres 2048². Les ressources graphiques restent stables. Pas de textures de ciel recalculées, nuages volumétriques, cube camera ni deuxième passe d'ombres. Le ciel ajoute une passe de fond, et l'orientation solaire peut changer les lots visibles par la caméra d'ombres.

L'heure vient de `MotionTimeline`, horloge de présentation confirmée du worker (tampon de 250 ms), et non du temps mural ni de la phase d'animation modulo 2π. Pause termine seulement le rattrapage confirmé ; chargement/réinitialisation restaure le ciel à l'heure du checkpoint. Toutes les sauvegardes existantes gardent leurs dates ; un nouveau départ reste à minuit, désormais visible de nuit.

Au démarrage, `preparePresentation` précompile les matériaux des deux projections et niveaux de détail sous l'écran de chargement. La boucle de dessin est suspendue pendant cette préparation, les drapeaux de visibilité/culling sont restaurés ensuite. Cela déplace la compilation du premier panorama hors des interactions du joueur, sans modifier la simulation. Le coût de préparation fait partie du chargement initial et reste mesuré séparément. Référence : [Renderer.compileAsync](https://threejs.org/docs/pages/Renderer.html#compileAsync).

## Limites conservées explicitement

Latitude/longitude du site, saison, météo et calendrier solaire variable ne sont pas encore sérialisés. Les teintes du ciel ne pilotent pas les plantes. Depuis V8, les plantes utilisent l’intégrale de lumière de la latitude fixe ; V35 interrompt cette progression sous couverture construite, avec checkpoint préalable. Le climat reste fixé à 21 °C. Aucun effet nouveau d'obscurité sur marche, travail ou humeur n'est implicitement ajouté ; éclairage artificiel, toits naturels, ombres de gameplay, éclipses et température variable restent absents. Masquer les toits construits retire leur ombre graphique ; l’éclairage intérieur de coupe reste à développer.

Les ombres utilisent une fenêtre locale autour de la cible, pas une couverture précise de la carte entière. En vue rasante, la végétation peut masquer les colons : masquage du feuillage disponible, transparence contextuelle future. Le panoramique reste limité à la carte et les extérieurs du plateau ne sont pas un terrain infini.

## Validation

Deux scénarios de contrat regroupent tailles/aspects/zooms, répétitions de bascule, projection/rayon du sol, continuité de minuit/crépuscule et stabilité des ressources sur deux journées. Un parcours navigateur matériel vérifie les boutons, sélection, rectangle de réserve, ordre d'abattage, redimensionnement, pause/reprise et sauvegarde/restauration du ciel. Le benchmark compare les anciens réglages constants, le soleil à midi sans ciel, le ciel complet, la nuit et les deux projections sur 250². [Mesures, erreurs intermédiaires et limites](validation.md).

Références techniques : [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [PerspectiveCamera](https://threejs.org/docs/pages/PerspectiveCamera.html), [Scene.backgroundNode](https://threejs.org/docs/pages/Scene.html), et sources locales Three 0.186.0 `renderers/common/Background.js` / `nodes/lighting/ShadowNode.js`. Les API ont été confrontées au code installé ; aucune dépendance mise à jour.
