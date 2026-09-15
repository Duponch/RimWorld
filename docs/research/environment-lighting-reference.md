# Éclairage visible et coupe — relecture du 15 septembre 2026

Corpus relu : chapitres 5, 22 et 29 ; SYS/TEST-023..025, UI-005. La proposition 3D exige de conserver empreintes, règles de couverture et ciblage lorsque le rendu cache une toiture. Ses choix d’angle, de moteur et de lumière ne constituent pas des valeurs Core. [Décision d’adoption](reference-adoption.md), [contrat livré](../development/environment-lighting.md).

## Sources confrontées

- [GlowGrid, miroir du code Core](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/GlowGrid.cs) : `VisualGlowAt` expose la couleur accumulée, alors que `GroundGlowAt` applique les règles du pourcentage de gameplay et du ciel. La luminosité affichée ne doit pas servir d’oracle au taux de travail.
- [SectionLayer_LightingOverlay](https://github.com/Chillu1/RimWorldDecompiled/blob/2d508035082e7cb0c8e29e230d26bda6e546928f/Verse/SectionLayer_LightingOverlay.cs) : couche graphique reconstruite pour toits/lumière ; couleurs aux sommets issues du voisinage, traitement des objets opaques et minimum de couverture céleste sous toit. Cela confirme une représentation interpolée distincte de la cellule logique. Le miroir n’est pas une distribution officielle du binaire ; version courante exacte toujours à confirmer par export local.
- [Campfire, wiki communautaire](https://rimworldwiki.com/wiki/Campfire) : feu combustible, lumière chaude, maximum ordinaire 50 %, insuffisant pour la majorité des cultures sous toit. Le rayon « éclairé » de ce tableau conserve la divergence moyenne/max RGB relevée dans la [recherche V36](work-environment-reference.md) ; il n’est pas recopié comme une nouvelle règle.
- [NodeMaterial, documentation officielle Three](https://threejs.org/docs/pages/NodeMaterial.html) : `outputNode` remplace la sortie tout en conservant l’évaluation du matériau standard. Vérifié contre `node_modules/three/src/materials/nodes/NodeMaterial.js` installé en 0.186.0 : la propriété TSL `output` est assignée avant ce nœud.
- [DataTexture, documentation officielle](https://threejs.org/docs/pages/DataTexture.html) et [Position TSL r186](https://github.com/mrdoob/three.js/blob/r186/src/nodes/accessors/Position.js) : données typées et échantillonnage en coordonnées mondiales ; `positionWorld` part de la position transformée, donc suit aussi nos poses instanciées GPU. Versions conservées, aucune dépendance ajoutée.

## Décisions, certitude et relecture rétroactive

**Adopter :** séparation de l’image et des règles, obstacles/couverture logiques persistants pendant la coupe, état allumé du feu comme source. Les règles V36 restent inchangées ; les tests de taux ne déduisent jamais un pourcentage depuis un pixel.

**Adapter :** une texture commune échantillonnée sur les volumes 3D, teinte chaude et faible ambiance de lisibilité ; seuil vertical pour ne pas assombrir les dessus de toiture et arbres hauts. Pas de reproduction numérique des couleurs du shader Unity, pas de nouvelle physique lumineuse. La forme du halo vient du champ logique plafonné, plutôt que du RGB visuel de Core ; ce compromis évite une seconde diffusion et reste explicite.

**Corriger dans les documents courants :** le masquage V35 retirait aussi l’ombre de toiture et laissait apparaître un intérieur éclairé comme l’extérieur. Le champ conserve maintenant l’assombrissement sous la couverture logique. Les facteurs des ateliers n’étaient plus provisoires depuis V36 : le contrat toiture est remis en cohérence, sans modifier ces règles.

**Différer :** ombres locales, autres couleurs/sources, éclairage horticole, fenêtres, brouillard de guerre et coupe automatique par pièce. Le feu ne chauffe toujours pas ; la météo et le social restent absents. Confiance élevée dans les frontières de règles observées, moyenne dans l’équivalence avec un exécutable Core récent, et aucune prétention de parité visuelle pixel à pixel pour cette adaptation 3D.

## Diagnostic technique pendant la validation

Le profil CDP a localisé le coût dominant dans GPUQueue.writeBuffer via les mises à jour d’attributs. Le fichier officiel installé `three/src/renderers/common/Attributes.js`, fonction update, force effectivement ces envois pour DynamicDrawUsage, même sans changement de version. Le [code public r186 des instances](https://github.com/mrdoob/three.js/blob/r186/src/nodes/accessors/Instance.js) confirme la synchronisation par version pour les attributs instanciés. La lecture web directe de Attributes.js était indisponible ; cette conclusion repose sur le code installé et l’instrumentation native, pas sur une page supposée consultée.

Adoption du mode statique avec invalidation explicite pour végétation distante et roches : un retrait modifie toujours les buffers, tandis que les images sans modification ne les renvoient plus. Le test natif contrôle ces deux chemins. Aucun changement silencieux du rendu, de la géométrie ou du minage.
