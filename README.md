# Lisière

Lisière est un jeu de colonie 3D low poly pour navigateur, inspiré des systèmes de RimWorld Core 1.6.4871. Le dépôt contient actuellement le **schéma de sauvegarde 144** ; V145–V147 entretiennent les outils et réduisent des coûts CPU ciblés, sans nouveau contenu ni migration. Les règles livrées, les limites et leurs preuves sont regroupées dans l’[état fonctionnel](docs/gameplay/implementation-status.md). La [feuille de route](docs/ROADMAP.md) distingue les prochains travaux de ce qui est déjà jouable.

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

Choisir les contrôles adaptés au changement selon la [stratégie de tests](docs/development/testing.md). `npm test` conserve la suite Vitest complète ; `npm run test:campaign` isole les campagnes longues avec leurs journaux. La [validation courante](docs/development/validation.md) distingue les contrôles exécutés, les reprises et les limites ; la [preuve CPU V147](docs/history/validation-firefighting-performance-v147.md) borne le gain mesuré sur l'extinction. Aucune de ces preuves ne prétend que la suite exhaustive passe. Les contrats, recherches, preuves et archives sont orientés depuis l’[index documentaire](docs/README.md). Le [laboratoire de navigation GPU](http://127.0.0.1:5173/navigation.html) est une expérience séparée.

Le [README antérieur](README-pre-v145.md) conserve les annonces et mesures datées de la période V101–V108. Son indication de version du site public ne vaut pas vérification du déploiement actuel.
