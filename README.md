# Lisière

Prototype de simulation de colonie en 3D low poly pour navigateur. **RimWorld de base est la référence de conception** ; les extensions sont étudiées pour la suite. Lisière est un nom de travail.

La tranche actuelle permet de collecter, porter, stocker et livrer les matériaux avant de construire. **G0 reste en cours de consolidation** ; le jeu ne reproduit pas encore l'ensemble de RimWorld. Le corpus utilisateur est la référence fonctionnelle par défaut ; les libertés et interprétations 3D sont consignées dans [les choix de gameplay](docs/gameplay/decisions.md). Les modèles, le décor et l'interface sont créés pour ce projet.

## Démarrer

Prérequis : Node.js 22.12 ou plus récent, navigateur récent avec accélération graphique. Node 24.11.1 a été utilisé pour la première validation.

```powershell
npm ci
npm run dev
```

Ouvrir [le jeu local](http://127.0.0.1:5173). Three.js sélectionne WebGPU lorsque disponible, sinon son backend WebGL 2. Un compteur FPS reste visible dans le coin supérieur droit. Le backend réellement actif apparaît dans Menu → Diagnostics. WebGPU nécessite HTTPS ou localhost.

La carte par défaut mesure **250×250 cases**, soit 62 500 cellules, et utilise la graine 42. Menu → Nouvelle colonie propose 200 ou 250 cases par côté, les cartes compactes 64/128 et le terrain d'essai 32. L'état précédent est conservé avant remplacement et peut être restauré depuis le menu. Les paramètres d'URL restent disponibles : `/?seed=123&size=250`. Charger une ancienne partie conserve ses dimensions.

## Jouer

Trois colons commencent avec du bois et de la nourriture en piles au sol. Architecte regroupe collecte, réserves et constructions. Les transporteurs prélèvent, portent et déposent les matériaux ; les constructeurs attendent leur livraison. Travail règle collecte, construction et transport : **1 haute, 4 basse, 0 désactivée**. L'interface conserve l'organisation de RimWorld : ressources à gauche, colons en haut et onglets en bas.

Abattage, récolte, annulation et création/retrait de réserves acceptent un rectangle au bouton gauche, avec aperçu des cases compatibles. Relâcher sur la carte applique ; Échap ou clic droit annule le tracé. Les réserves existantes conservent leurs réglages lors d'un chevauchement. Les zones nommées à politique commune restent à développer.

- Espace : pause ; 1 / 2 / 3 : vitesse 1× / 3× / 6×.
- C : abattre ; R : récolter ; B : mur ; L : lit ; X : annuler ; Échap : inspecter.
- S : réserve ; Q / E avec l'outil Lit : tourner son empreinte 1×2.
- Tab : Architecte ; F1 : Travail. Les contrôles près de l'horloge permettent de couper visuellement les murs et de masquer les couronnes des arbres.
- Molette : zoom ; glisser bouton droit : tourner ; bouton central : déplacer la caméra.
- Menu → Sauvegarder ou Ctrl+S : sauvegarde locale ; Menu → Recharger : dernière sauvegarde de ce navigateur.

Voir [le guide joueur](docs/gameplay/player-guide.md) et l’[inventaire par domaine](docs/gameplay/implementation-status.md) pour les règles actuellement implémentées et tout ce qui reste absent. Le [catalogue de contenu](docs/gameplay/content-catalogue.md) et le [contrat équipement/portraits](docs/development/character-presentation.md) précisent leur couverture et les travaux restants.

Dans Architecte → Zones, une réserve se règle par cellule : filtres bois/nourriture, capacité et priorité. Pour le **stockage**, 4 est la priorité la plus forte. Inspecter la réserve permet de modifier ses règles sans supprimer les objets. Les zones nommées à plusieurs cases et les ordres contextuels restent à développer.

La génération produit une rivière continue, des massifs et une végétation corrélée au terrain. Les proportions 3D sont centralisées : case de 1 m, humain de 1,75 m, mur de 2,80 m. Ce sont des conventions du projet. Les nouveaux lits occupent deux cases orientées ; les lits des anciennes sauvegardes gardent une emprise explicite 1×1 pour préserver leurs voisins.

Les sauvegardes courantes utilisent le **schéma 5** : piles, propriétaires, cargaisons, stockages, orientations et progression sont conservés. Phases de repas/sommeil, places à table, propriétaires de lits, confort et souvenirs sont également persistés. Les sauvegardes V1, V2, V3 et V4 sont validées puis migrées ; leur terrain et leurs identités existantes sont préservés, les anciens stocks globaux deviennent physiques et les profils nutritionnels V1–V4 sont conservés explicitement. Les clés locales du navigateur restent identiques pour retrouver ces parties. Voir [le contrat matériel et sa migration](docs/development/material-logistics.md).

Les colons rejoignent et prennent leur nourriture avant de manger ; ils rejoignent leur lit attribué et dorment sur son matelas. La consommation à distance et le bonus de lit voisin sont supprimés. Tables et tabourets sont constructibles : portion transportée à une place réservée, pose assise GPU, confort progressif et souvenir de repas sans table. Baies et rations ont des piles et une nutrition distinctes, avec quantité ingérée selon la faim. Cuisine, horaires et préférences alimentaires restent à développer : [contrat et portée](docs/development/needs.md).

## Laboratoire de navigation GPU

Ouvrir [le laboratoire local](http://127.0.0.1:5173/navigation.html) pour calculer et vérifier un chemin sur le paysage, ajouter des obstacles ou du terrain lent. Recherche, convergence et extraction sont exécutées sur GPU ; un oracle CPU indépendant vérifie le résultat. Cette expérience **ne pilote pas encore les colons**. La carte 250² sert aussi de fixture de comparaison ; elle est désormais la taille de colonie par défaut.

`node scripts/gpu-navigation-bench.mjs` exécute le protocole matériel avec le serveur local lancé. Les contrats, résultats et limites sont dans [la recherche GPU](docs/research/gpu-navigation.md).

## Vérifier

```powershell
npm test
npm run build
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.playwright"
npx playwright install chromium
npm run test:integration
npm run bench
```

`npm run check` regroupe simulation, compilation et intégration. Chromium doit avoir été installé une fois. Le parcours des frontières et de migration utilise SwiftShader pour contrôler le repli ; les parcours de transport et des grandes cartes lancent Chromium normal. Aucun de ces tests n'est un benchmark de votre GPU. Les résultats détaillés et les limites sont consignés dans [la validation](docs/development/validation.md).

`node scripts/render-smoke.mjs`, avec le serveur local lancé, vérifie aussi le backend disponible sans imposer de GPU logiciel. Il conserve diagnostic et captures dans `artifacts/`. Lors de la première validation, ce passage a utilisé WebGPU sur l'adaptateur AMD / RDNA-1 communiqué par le navigateur, sans erreur console.

## Reprendre le projet

1. Lire [le plan et l'état réel](docs/ROADMAP.md).
2. Lire [l'adoption du référentiel utilisateur](docs/research/reference-adoption.md), puis les chapitres et entrées du chantier dans les documents [HTML](docs/new_docs/Documentation_developpement.html), [PDF](docs/new_docs/Documentation_developpement.pdf) et [Excel](docs/new_docs/Referentiel_developpement.xlsx). Ils orientent le gameplay et les contrats ; les propositions, valeurs non vérifiées et écarts restent qualifiés.
3. Lire [l'architecture et les décisions](docs/development/architecture.md), [le contrat de simulation](docs/development/simulation.md), puis [la logistique matérielle](docs/development/material-logistics.md) et [les écarts de gameplay](docs/gameplay/decisions.md).
4. Consulter [la matrice des 25 systèmes](docs/gameplay/systems-matrix.md), [la recherche initiale RimWorld](docs/research/rimworld-reference.md) et [l'audit Antsystem / GPU](docs/research/rendering-and-performance.md).
5. Appliquer [la stratégie de tests](docs/development/testing.md) au domaine modifié.

Le code de simulation ne dépend ni de Three.js ni du DOM. Le rendu consomme ses snapshots et ne décide jamais des conséquences de gameplay. Les futures intégrations Rust/WASM et glTF passent par ces frontières.

Compléments : [observation de la vidéo et organisation visuelle](docs/research/visual-reference.md), [échelles, grille et navigation](docs/research/spatial-design.md), [génération du monde](docs/development/world-generation.md).

La [recherche repas et confort](docs/research/dining-reference.md) documente les contradictions trouvées et les adaptations 3D. Le [contrat des repas à table](docs/development/dining.md) décrit les modules et migrations. Les audits reproductibles sont associés à leurs matériels et scénarios dans [validation](docs/development/validation.md).

Le [pilote de colonie](docs/research/colony-progression.md) fait évoluer un camp sur cinq jours dans le noyau et trois jours via la vraie interface. Le parcours navigateur long dure environ sept à huit minutes : le lancer aux changements de boucles de jeu, de commandes ou de persistance. Un [audit ciblé des mises à jour graphiques](docs/development/render-lifecycle.md) mesure notamment la disparition des arbres.
