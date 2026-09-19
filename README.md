# Lisière

V68 : **un raid peut attaquer le camp ordinaire**. Alerte, approche physique, brèche dans les murs/portes, défense, retraite et bilan prolongent l’accueil, les besoins, la production et les soins. Blessés et morts restent sur place ; calendrier/composition provisoires, capture et gestion complète des corps encore absentes. [Guide](docs/gameplay/player-guide.md), [état courant](docs/gameplay/implementation-status.md), [validation](docs/history/validation-raids-v68.md).

Jeu de colonie en 3D low poly pour navigateur, avec RimWorld de base comme référence fonctionnelle. G0 est en consolidation, G1/G2 sont partiels et G3 possède ses premières fondations humaines : récolte, transport, stockage, construction, minage avec fragments transportables, déconstruction et déplacement du mobilier d’un camp, repas et sommeil physiques, culture de riz, feu ravitaillé et cuisine sur factures. Le [bilan fonctionnel](docs/gameplay/implementation-status.md) distingue les systèmes présents, partiels et absents.

## Démarrer

Node.js 22.12 ou plus récent et navigateur avec accélération graphique. Dépendances épinglées ; Node 24.11.1 utilisé pour les validations récentes.

```powershell
npm ci
npm run dev
```

Ouvrir [le jeu local](http://127.0.0.1:5173). Three.js utilise WebGPU si disponible, sinon WebGL 2 ; le backend apparaît dans Menu → Diagnostics. Le compteur FPS reste visible. La carte par défaut est 250×250, graine 42 ; Menu permet de créer une colonie ou de reprendre une sauvegarde. Paramètres de diagnostic : `/?seed=123&size=250`.

Le [guide joueur](docs/gameplay/player-guide.md) décrit les contrôles et règles. Sauvegardes au schéma **68** : les anciennes versions sont validées puis migrées sans agrandir la carte ni inventer d’objets ou d’historique. Les anciens camps restent sans calendrier d’accueil ni de raids jusqu’à leur activation explicite. Les contrats spécialisés et l’[inventaire courant](docs/gameplay/implementation-status.md) distinguent les boucles livrées des catalogues et systèmes encore absents.

## Développer et vérifier

```powershell
npm run test
npm run build
npm run test:integration
python scripts/check-docs.py
```

Choisir les contrôles selon [la stratégie de tests](docs/development/testing.md) ; ces commandes ne forment pas une obligation de tout relancer à chaque retouche. Les scénarios UI longs utilisent le vrai worker et les commandes du joueur. Les [preuves courantes](docs/development/validation.md) indiquent essais réussis, échecs diagnostiqués et limites des mesures.

L’[index documentaire](docs/README.md) est le point d’entrée : [plan G0–G5](docs/ROADMAP.md), [architecture](docs/development/architecture.md), contrats de domaine, recherches, corpus original, décisions et historique. Les algorithmes internes restent libres ; toute adaptation fonctionnelle doit être expliquée.

Le [laboratoire de navigation GPU](http://127.0.0.1:5173/navigation.html) est une expérience séparée. Il ne pilote pas les colons du jeu.
