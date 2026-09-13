# Espace, échelles et navigation : décisions de conception

État : 13 septembre 2026. RimWorld de base reste la référence fonctionnelle ; les dimensions métriques ci-dessous sont notre interprétation pour Lisière. Les preuves visuelles, détails procéduraux et mesures sont séparés dans [l'observation vidéo](visual-reference.md), [la génération](../development/world-generation.md) et [l'expérience GPU](gpu-navigation.md).

## Ce que la référence établit

RimWorld organise la colonie sur une grille de cellules : bâtiments, cultures, stockage et désignations doivent pouvoir se lire ensemble. Les images observées montrent des murs reliés aux massifs rocheux, des ouvertures reliant les pièces et des lits rectangulaires. Elles ne donnent pas une conversion officielle en mètres. Le journal vidéo distingue les images réellement examinées des comportements encore inconnus.

Le wiki communautaire liste **200²/225²** comme petites cartes, **250²/275²** comme moyennes et **300²/325²** comme grandes. Les 250 × 250 cellules représentent 62 500 cellules ; ce repère devient notre taille jouable par défaut. La liste a été reconsultée le 13 septembre 2026 ; elle n'est pas une capture d'un exemplaire de RimWorld exécuté localement. Ni conversion officielle en mètres, ni taille la plus jouée n'en sont déduites. La carte locale se distingue de la couverture du globe. [RimWorld Wiki, World generation](https://rimworldwiki.com/wiki/World_generation#Advanced_settings).

La mise à jour gratuite 1.6 annonce une réécriture du pathfinding en traitement multithread et par lots utilisant Unity Burst, une meilleure précision à longue distance, des rivières et formations rocheuses améliorées, ainsi qu'un départ constructible dans la plus grande zone ouverte connexe. Ces changements font partie du socle de référence, même sans adopter les extensions. [Changelog public officiel 1.6](https://docs.google.com/document/d/e/2PACX-1vRCjqVtPQDFGu4POiKTUd_8o3U2Asdhx99SOvcgU66ABdYtk3Cgndd53yJ6BC4tZX530pp_m6lf4Z9P/pub).

Burst compile du code en instructions natives pour le **CPU**. Ces annonces ne prouvent donc pas une navigation GPU dans RimWorld, ni un algorithme exact, ni ses coûts de diagonale. Nous ne reconstruisons pas ces paramètres depuis d'anciens témoignages. [Documentation officielle Unity Burst](https://docs.unity3d.com/Packages/com.unity.burst@1.8/manual/index.html).

## Contrat métrique et volumes

`src/world/scale.ts` centralise la convention **une case = une unité 3D = un mètre**. La grille reste l'unité d'occupation et d'interaction ; le mètre facilite la cohérence des modèles.

| Élément | Dimension | Décision |
|---|---:|---|
| Humain debout | 1,75 m | Appliqué au rig GPU entier. |
| Mur | 2,80 m | Plus haut que l'humain ; épaisseur d'une case encore stylisée. |
| Mur en coupe | 0,72 m | Présentation seulement, occupation inchangée. |
| Ouverture de porte | 2,15 m | Dégagement prévu ; portes non livrées. |
| Arbre | 5–7 m | Silhouette différenciée, feuillage masquable. |
| Lit | 1 × 2 cases orientées | Livré avec un modèle procédural de 1,90 m ; lits V1 conservés explicitement sur une case à la migration. |

Une forme visible doit correspondre à son empreinte logique. Orientation, cellules réservées au placement, accès et sauvegarde évoluent ensemble ; le lit applique désormais ce contrat sur deux cases. L'empreinte d'un bâtiment et sa traversabilité sont deux propriétés distinctes : les lits restent traversables, les murs bloquent. La même distinction s'applique aux futurs établis et grands animaux. Un mur coupé ou un feuillage masqué conserve ses effets de gameplay. Voir [le contrat matériel](../development/material-logistics.md).

Le sol navigable reste plan. La hauteur des massifs, le niveau visuel de l'eau et l'animation ne créent ni étage, ni escalier, ni pente praticable. Introduire une verticalité jouable exigera un graphe de déplacement, des règles d'accès et un schéma persistant explicites.

## Taille de carte et résolution

L'application démarre désormais sur **250²**, avec 200² comme petite carte, 64²/128² comme cartes compactes et 32² comme terrain d'essai. L'API `createWorld` conserve 32² par défaut pour les fixtures existantes ; les dimensions autorisées du schéma 2 vont de 8 à 250 par axe. La taille est centralisée dans `src/sim/map-config.ts`.

| Carte | Cellules | Surface par rapport à l'ancien défaut 64² |
|---|---:|---:|
| Ancien défaut 64² | 4 096 | 1× |
| Compacte 128² | 16 384 | 4× |
| Petite 200² | 40 000 | 9,77× |
| Moyenne 250² | 62 500 | 15,26× |

Passer de 64 à 250 augmente chaque côté de 3,90625 fois, et la surface de 15,258789 fois. La supposition visuelle d'une carte « six fois plus grande » ne distingue pas côté, surface et cadrage. Le chapitre 5 du corpus présente explicitement 32²/64² comme fixtures de test ; leur ancien emploi comme défaut jouable était une simplification du prototype, désormais corrigée.

La caméra conserve un cadrage local indépendant de l'étendue du territoire : agrandir la carte allonge les déplacements et augmente les possibilités d'implantation, sans rapetisser les personnages. La résolution de grille, les modèles et la densité de génération ne sont pas réduits pour compenser. Mesures et conditions de comparaison : [passage aux grandes cartes](../development/map-scale.md). Combat et réaction aux menaces restent à valider lorsqu'ils existeront.

Une grille de 0,5 m multiplie par quatre le nombre de cellules à surface égale, et double les distances exprimées en pas. Elle pourrait faciliter certains passages mais alourdit navigation, occupation et réservations. **Nous conservons un mètre par cellule** ; interpolation et silhouettes peuvent être fines sans changer cette résolution métier. Les chunks de rendu 16 × 16 servent la visibilité, sans devenir des frontières de gameplay.

## Terrain crédible et départ jouable

La génération doit former des ensembles : cours d'eau continu, berges lisibles, massifs contigus, sol praticable distinct de la roche pleine, végétation liée au milieu. Une texture de bruit seule ne garantit ni drainage crédible ni accès aux ressources. Le système actuel privilégie une vallée de départ praticable et des ressources initiales accessibles ; ce choix dirigé est documenté comme une simplification.

La [documentation du générateur](../development/world-generation.md) fait autorité sur ses passes et garanties. Chaque graine doit être reproductible, avec diagnostics de connectivité, bordures, ressources bloquées et régions isolées. Les futures propriétés de sol doivent influencer construction, déplacement et agriculture selon des règles communes, sans déduire silencieusement le gameplay d'une couleur.

## Navigation et comportements : frontière actuelle

Le jeu conserve son BFS CPU déterministe et ses réservations. Le [laboratoire WebGPU](gpu-navigation.md) calcule réellement des chemins pondérés sur GPU, avec contrôle de convergence et révisions, mais reste isolé. Son résultat n'intègre ni acteur mobile, ni priorité de passage, ni porte dynamique.

L'activation exige encore invalidation à une frontière de tick, validation des réservations, traitement déterministe des réponses tardives, tests de cibles mobiles et comparaison avec un A* CPU optimisé pendant le rendu. Une accélération d'un lot ne suffit pas à choisir l'architecture autoritaire.

Avant le combat, observer des séquences continues : croisements dans une porte, contournement d'angle, poursuite, fuite et tir avec couverture. Les extraits disponibles ne les établissent pas. Lisser un trajet visuellement ne doit jamais autoriser une traversée d'obstacle ou masquer une attente logique.

## Mise à jour spatiale V6

Le [contrat sol, mouvement et rendu distant](../development/spatial-motion-storage.md) remplace les descriptions antérieures de piles multiples au sol et du BFS cardinal. La migration V5→V6 est explicite ; le comportement des buissons reste un chantier ouvert.
