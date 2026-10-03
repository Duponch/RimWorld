# Lisière

Lisière est un jeu de colonie 3D low poly pour navigateur, inspiré de RimWorld Core 1.6.4871. Le dépôt utilise le **schéma de sauvegarde 180**. [V193](docs/development/caravan-trade-v193.md) ouvre une première expédition commerciale : charger rations et argent, rejoindre un comptoir civil, acheter médicaments ou composants puis les ramener et les déposer physiquement. La colonie préparée « Expédition commerciale » est accessible dans Charger → Colonies de test. La [preuve ciblée](docs/history/validation-commercial-v193.md) borne les contrôles ; planète, groupes, rencontres, ventes générales et diplomatie restent ouverts.

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
