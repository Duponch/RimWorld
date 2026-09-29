# Lisière

Lisière est un jeu de colonie 3D low poly pour navigateur, inspiré des systèmes de RimWorld Core 1.6.4871. Le dépôt utilise le **schéma de sauvegarde 154** ; V154 livre le plat gastronomique mixte sur cuisinière avec dix protéines, dix végétaux et Cuisine 8, après le plat raffiné V152. Sa [preuve d'intégration](docs/history/validation-lavish-meal-v154.md) réunit tests ciblés, régression finale et parcours Chromium préparé, avec leurs limites. Les règles livrées, les limites et leurs preuves sont regroupées dans l’[état fonctionnel](docs/gameplay/implementation-status.md). La [feuille de route](docs/ROADMAP.md) distingue les prochains travaux de ce qui est déjà jouable.

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

Choisir les contrôles adaptés au changement selon la [stratégie de tests](docs/development/testing.md). `npm test` conserve la suite Vitest complète ; `npm run test:campaign` isole les campagnes longues avec leurs journaux. La [validation courante](docs/development/validation.md) distingue les contrôles exécutés, les reprises et les limites ; les preuves [V152](docs/history/validation-fine-meal-v152.md), [V151](docs/history/validation-cooking-performance-v151.md) et [V150](docs/history/validation-food-binge-v150.md) bornent respectivement le plat raffiné, l'optimisation de cuisine et la crise alimentaire. Aucune preuve ciblée ne certifie à elle seule la suite exhaustive. Les contrats, recherches, preuves et archives sont orientés depuis l’[index documentaire](docs/README.md). Le [laboratoire de navigation GPU](http://127.0.0.1:5173/navigation.html) est une expérience séparée.

Le [README antérieur](README-pre-v145.md) conserve les annonces et mesures datées de la période V101–V108. Son indication de version du site public ne vaut pas vérification du déploiement actuel.
