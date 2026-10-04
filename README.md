# Lisière

**V201 — animal sauvage en rage temporaire, schéma 183.** Un animal déjà présent devient une menace pour les humains : fuir, rejoindre un abri fermé ou combattre exige des déplacements et contacts réels. La 47e scène **« Animal en rage · abri et défense »** prépare une introduction Cassandra à reprendre, sans pirate ni blessure initiale. [Contrat](docs/development/manhunter-v201.md), [référence Core et adaptations](docs/research/manhunter-core-v201.md), [preuve et limites](docs/history/validation-manhunter-v201.md). Scaria, meutes et narrateur exhaustif restent absents ; G3/G4 restent ouverts.

**V200 — repères et corrections visuelles, schéma 182 inchangé.** Les cinq besoins ont leurs seuils visibles ; les brins suivent la peinture du sol et seuls ceux enracinés dans les taches de sang sont rouges. Le trou central des nuages est légèrement élargi. [Contrat](docs/development/needs-grass-clouds-v200.md), [référence](docs/research/needs-grass-clouds-v200.md), [preuve et coût borné](docs/history/validation-needs-grass-clouds-v200.md). Pas de nouvelle mécanique.

**V199 — refonte des dossiers et infobulles, schéma 182 inchangé.** Les fiches humaines, Animaux et Recherche reprennent la hiérarchie Core en conservant la palette pastel. [Contrat](docs/development/colonist-ui-v199.md), [référence et écarts](docs/research/colonist-ui-core-v199.md), [validation ciblée](docs/history/validation-colonist-ui-v199.md). Présentation des données existantes, sans nouvelle mécanique.

**V198 — continuité des déplacements, schéma 182 inchangé.** La fuite civile repart dès sa réobservation de danger sous budget ; les prédateurs conservent leur préfixe sûr et les produits rejoignent un dépôt libre au-delà des voisins occupés. [Contrat](docs/development/movement-continuity-v198.md), [recherche Core/CPU/GPU](docs/research/navigation-cpu-gpu-v198.md), [preuve ciblée](docs/history/validation-movement-v198.md). Correction de l’existant, sans nouveau contenu ni navigation GPU activée.

**V197 — poursuite de mêlée continue, schéma 182 inchangé.** Le renouvellement d’un chemin et la révision périodique d’une même cible ne créent plus de pauses artificielles. Les recherches restent bornées ; obstacles, contacts et récupérations restent physiques. [Contrat](docs/development/melee-pursuit-v197.md), [recherche Core](docs/research/melee-pursuit-core-v197.md), [preuve ciblée](docs/history/validation-melee-pursuit-v197.md). Correctif du combat existant, sans nouvelle mécanique.

**V196 — sang, dépouilles et douleur, schéma 182 inchangé.** Le sang colore l’herbe des cellules tachées et les régions corporelles blessées. Les animaux morts gardent leur modèle et pelage de vivant, couchés avec yeux en croix ; la marche traverse le mobilier franchissable au sol. Trois râles masculins et trois féminins suivent le sexe visuel du colon ; le renard reçoit deux prises de douleur. [Contrat](docs/development/visual-blood-v196.md), [recherche](docs/research/visual-blood-core-web-v196.md), [preuve et limites](docs/history/validation-visual-blood-v196.md). La 46e colonie de test prépare les comparaisons. Le suivi du pigment terrain, différé dans V196, rejoint V200 après mesure de coût. La [culture médicinale V195](docs/development/healroot-domestic-v195.md) reste jouable dans son périmètre ciblé.

Lisière est un jeu de colonie 3D low poly pour navigateur, inspiré de RimWorld Core 1.6.4871. [V193](docs/development/caravan-trade-v193.md) livre une première expédition commerciale : charger rations et argent, rejoindre un comptoir civil, acheter médicaments ou composants puis les ramener et les déposer physiquement. La colonie préparée « Expédition commerciale » est accessible dans Charger → Colonies de test. La [preuve ciblée](docs/history/validation-commercial-v193.md) borne les contrôles ; planète, groupes, rencontres, ventes générales et diplomatie restent ouverts.

[V191](docs/development/prey-navigation-v191.md) optimise la navigation vers les proies, sans nouvelle mécanique ni migration. Une recherche progressive unique doit conserver exactement décision, contact, coût et trajet V190. Les contrôles ciblés et la mesure CPU isolée sont acquis ; leur [preuve dédiée](docs/history/validation-prey-navigation-v191.md) conserve leur périmètre et leurs limites, sans annoncer de gain général.

## Démarrer

Node.js 22.12 ou plus récent et un navigateur avec accélération graphique sont requis. Les dépendances sont épinglées.

```powershell
npm ci
npm run dev
```

Ouvrir [le jeu local](http://127.0.0.1:5173). Three.js utilise WebGPU si disponible, puis WebGL 2. Le backend apparaît dans Menu → Diagnostics. L’accueil propose Nouvelle partie et Charger ; la carte normale fait 250 × 250 cases. Le [guide joueur](docs/gameplay/player-guide.md) décrit les commandes et les règles.

## Développer

```powershell
npm run test:quick
npm run test:regression
npm run build
npm run test:integration
python scripts/check-docs.py
```

Choisir les contrôles adaptés au changement selon la [stratégie de tests](docs/development/testing.md). `npm test` conserve la suite Vitest complète ; `npm run test:campaign` isole les campagnes longues avec leurs journaux. La [validation courante](docs/development/validation.md) distingue les contrôles exécutés, les reprises et les limites ; les preuves [V161](docs/history/validation-fine-meal-bulk-v161.md), [V160](docs/history/validation-simple-meal-bulk-v160.md), [V159](docs/history/validation-carnivore-lavish-v159.md), [V157](docs/history/validation-vegetarian-lavish-v157.md), [V156](docs/history/validation-carnivore-fine-v156.md), [V155](docs/history/validation-vegetarian-fine-v155.md), [V154](docs/history/validation-lavish-meal-v154.md) et [V152](docs/history/validation-fine-meal-v152.md) bornent les repas récents. Aucune preuve ciblée ne certifie à elle seule la suite exhaustive. Les contrats, recherches, preuves et archives sont orientés depuis l’[index documentaire](docs/README.md). Le [laboratoire de navigation GPU](http://127.0.0.1:5173/navigation.html) est une expérience séparée.

Le [README antérieur](README-pre-v145.md) conserve les annonces et mesures datées de la période V101–V108. Son indication de version du site public ne vaut pas vérification du déploiement actuel.
