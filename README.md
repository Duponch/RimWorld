# Lisière

Lisière est un jeu de colonie 3D low poly pour navigateur, inspiré des systèmes de RimWorld Core 1.6.4871. Le dépôt utilise le **schéma de sauvegarde 162** ; la [facture de plats raffinés végétariens par quatre V162](docs/development/fine-vegetarian-bulk-v162.md) est livrée dans le périmètre de sa [preuve](docs/history/validation-fine-vegetarian-bulk-v162.md) : contrôles ciblés, régression hors campagnes longues, build, présentation et Chromium préparé passent. Deux microbancs suggèrent un surcoût CPU isolé d'environ 5,6 %, sans coût général établi. Le [plat raffiné mixte par quatre V161](docs/development/fine-meal-bulk-v161.md) est livré dans le périmètre de sa [preuve](docs/history/validation-fine-meal-bulk-v161.md). Les règles, limites et preuves sont regroupées dans l’[état fonctionnel](docs/gameplay/implementation-status.md) ; la [feuille de route](docs/ROADMAP.md) distingue les prochains travaux de ce qui est déjà jouable.

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
