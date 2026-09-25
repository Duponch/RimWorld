# Lisière

**V101 publiée :** [jouer sur Netlify](https://lisiere-duponch.netlify.app). Nouvelle filière **Forge → Usinage → Armurerie**, atelier électrique construit, fabrication de revolvers et fusils avec ouvrages conservés, qualité puis équipement ; rangement par objet précis. [Contrats et limites](docs/development/machining.md), [preuves](docs/history/validation-machining-v101.md). La [démonstration d’atelier](public/test-saves/v101/atelier.json) s’importe depuis Charger une partie ; elle fournit un site préparé pour essayer les factures.

Jeu de colonie en 3D low poly pour navigateur, avec RimWorld de base comme référence fonctionnelle, sans extensions ni mods. Les données locales Core 1.6.4871, sources publiques et observations de parties sont recoupées ; une sauvegarde particulière ne constitue pas le calendrier d’une colonie.

**Déjà jouable :** départ guidé, trois biomes locaux, ressources physiques, construction/mobilier, agriculture/cuisine/conservation, besoins, vêtements, recherche, soins, combats, captivité/recrutement, visiteurs/commerce, saisons, énergie, incendies, salissures et sépultures. L’interface crème V100, les sélections V99 et les six colonies de test V98 restent disponibles.

**Partiel ou absent :** catalogue complet, art et impression des lieux, relations sociales approfondies, narrateur lié à la richesse, médecine/chirurgie complètes, élevage/soins animaux, monde/caravanes et quêtes. L’[inventaire](docs/gameplay/implementation-status.md) distingue les systèmes livrés des préparations ; les estimations incertaines restent dans la [ROADMAP](docs/ROADMAP.md).

**Performance V101 :** sur le banc recherche/confection/minage à cent colons, CPU p95 16,74 ms ; natif image p95 12 ms et débit 5,88× pour 6× demandé. Ce banc ne couvre pas la charge mixte avec cent animaux ni une industrie massive. Aucune garantie de 240 FPS ou de débit 6× général ; [conditions de mesure](docs/history/validation-machining-v101.md).

Mode jour. G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent ; aucun jalon global terminé. La [ROADMAP](docs/ROADMAP.md) est le calendrier unique et les [preuves](docs/development/validation.md) distinguent contrôles réussis, échecs et limites.

## Démarrer

Node.js 22.12 ou plus récent et navigateur avec accélération graphique. Dépendances épinglées ; Node 24.11.1 utilisé pour les validations récentes.

```powershell
npm ci
npm run dev
```

Ouvrir [le jeu local](http://127.0.0.1:5173). Three.js utilise WebGPU si disponible, sinon WebGL 2 ; le backend apparaît dans Menu → Diagnostics. Le compteur FPS reste visible. L’accueil propose Nouvelle partie et Charger. La configuration locale active est 250×250, avec graine aléatoire éditable ; les autres choix sont grisés. Paramètres de diagnostic historique explicites : `/?scenario=camp&seed=123&size=250`.

Le [guide joueur](docs/gameplay/player-guide.md) décrit les contrôles et règles. Le schéma courant est **101** ; les versions V92–V100 utilisaient toujours 91. Les anciennes versions sont validées puis migrées sans agrandir la carte ni inventer d'objets ou d'historique. V87 ajoute la priorité Extinction à 1 ; les anciens camps adoptent explicitement le climat, la météo et leurs observations prospectives. Les activations historiques de faune et de calendriers gardent leurs conditions propres. Les contrats spécialisés et l'[inventaire courant](docs/gameplay/implementation-status.md) distinguent les boucles livrées des catalogues et systèmes encore absents.

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
