# Lisière

V75 : **premier garde-manger réfrigéré obtenable**. Recherche Climatisation, appareil orientable, thermostat, rejet de chaleur et coupure réelle ; le froid conserve les provisions mais peut provoquer une hypothermie. [Règles et limites](docs/development/cold-store.md). Mode jour ; le jeu reste un prototype partiel.

V74 : **première canicule dans le camp**. Préparer un refuge couvert, ravitailler le refroidisseur et choisir les vêtements protège des coups de chaleur ; exposition, incapacité et récupération utilisent la santé réelle. [Jouer et connaître les limites](docs/development/heatwave.md). L’étape 5 est engagée ; saisons et hiver restent absents.

V73 : rechercher **Vêtements complexes** au bureau, construire l’établi manuel de tailleur, confectionner une chemise avec **45 tissus** puis la porter. La tenue tribale reste initiale. L’étape proche 4 a sa boucle complète ; arbre technologique et catalogue restent partiels. [Contrat et limites](docs/development/research.md).


V70 : **les colons font connaissance pendant leurs activités**. Bavardage et discussions approfondies créent des opinions dirigées avec souvenirs, apprentissage Social et inspection. [Contrat](docs/development/social.md). Six traits, accueil et premier raid sont déjà jouables ; psychologie, équipements, production et environnement restent partiels. La filière textile/recherche est livrée dans un premier périmètre V71–V73 ; priorité actuelle dans ROADMAP de recherche. [Guide](docs/gameplay/player-guide.md), [état courant](docs/gameplay/implementation-status.md), [validation](docs/history/validation-social-v70.md).

Jeu de colonie en 3D low poly pour navigateur, avec RimWorld de base comme référence fonctionnelle. G0 est en consolidation, G1/G2 sont partiels et G3 possède ses premières fondations humaines : récolte, transport, stockage, construction, minage avec fragments transportables, déconstruction et déplacement du mobilier d’un camp, repas et sommeil physiques, culture de riz, feu ravitaillé et cuisine sur factures. Le [bilan fonctionnel](docs/gameplay/implementation-status.md) distingue les systèmes présents, partiels et absents.

## Démarrer

Node.js 22.12 ou plus récent et navigateur avec accélération graphique. Dépendances épinglées ; Node 24.11.1 utilisé pour les validations récentes.

```powershell
npm ci
npm run dev
```

Ouvrir [le jeu local](http://127.0.0.1:5173). Three.js utilise WebGPU si disponible, sinon WebGL 2 ; le backend apparaît dans Menu → Diagnostics. Le compteur FPS reste visible. La carte par défaut est 250×250, graine 42 ; Menu permet de créer une colonie ou de reprendre une sauvegarde. Paramètres de diagnostic : `/?seed=123&size=250`.

Le [guide joueur](docs/gameplay/player-guide.md) décrit les contrôles et règles. Sauvegardes au schéma **69** : les anciennes versions sont validées puis migrées sans agrandir la carte ni inventer d’objets ou d’historique. Les anciens camps restent sans calendrier d’accueil ni de raids jusqu’à leur activation explicite. Les contrats spécialisés et l’[inventaire courant](docs/gameplay/implementation-status.md) distinguent les boucles livrées des catalogues et systèmes encore absents.

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
