# Lisière

**V94 publiée :** [jouer sur Netlify](https://lisiere-duponch.netlify.app). Les herbes physiques sont de nouveau des touffes 3D verticales multi-tiges, regroupées dans un seul lot instancié. Le registre Ressources, les portraits et les écrans Travail/Horaires/Affectations/Faune ont été stabilisés ; neuf curseurs illustrés remplacent la flèche avec point séparé. [Preuves et limites V94](docs/history/validation-interface-v94.md).

Jeu de colonie en 3D low poly pour navigateur, avec RimWorld de base comme référence fonctionnelle. **Nouveautés V87, validées dans leur périmètre :** climat annuel et survie végétale, huit météos de surface, éolienne, radiateur, incendies et extinction physique. La vraie colonie V86 continue de J76,283 à J136,073 par des reprises documentées, avec quatre habitants, hiver, réparation d’une brèche, réserves et première récolte du printemps suivant. Aucune extinction par colon n’a été observée dans cette partie ; elle est validée séparément par les scénarios contrôlés et les vrais clics. [Preuves et limites V87](docs/history/validation-environment-v87.md).

**V85 déjà livrée : réseau électrique construit, batteries, panneaux solaires et commutation physique.** La colonie V84 a été poursuivie par une reprise documentée jusqu'à J42,21 : recherche et construction réelles, cuisine électrique, aliments gelés, nuit sur batterie et coupures physiques. Contrats, parcours natif, charge, typage et build validés ; [preuves et limites V85](docs/history/validation-energy-v85.md). À cent colons, la charge mixte atteint environ 3,76× pour 6× demandé : cette livraison ne garantit pas ce débit.

**Filière alimentaire V84 déjà livrée**, filière alimentaire durable : pommes de terre et maïs, cuisinières à bois/électrique, table de boucherie et malnutrition avec récupération par alimentation physique. Un vrai départ a été joué pendant 24 jours, avec deux récoltes sur les mêmes 80 cases de riz, diversification, soins après combat et sept jours sans consommer les rations initiales. [Preuves et limites V84](docs/history/validation-food-v84.md).

L’accueil, la création guidée et le chargement sont jouables. Atterrissage forcé / Cassandra / Récit d’aventure restent une adaptation partielle : forêt tempérée locale, trois reliefs, dotation et technologies explicites, journée de 16 min 40 s nominales et arrivée à 06 h. Les anciennes cartes et leurs calendriers sont préservés.

**Déjà jouable :** récolte, minage, transport, construction, agriculture/cuisine, besoins physiques, soins, combats/raids, captivité/recrutement et premières interactions sociales. La filière coton → vêtement, la recherche collective, le réseau avec batteries et le garde-manger réfrigéré donnent des usages aux ressources ; [preuves V86](docs/history/validation-prisoners-v86.md).

**Partiel ou absent :** un seul climat et biome local, dotation et narrateur incomplets, commerce, monde, autres espèces, médecine et catalogues complets. Neige accumulée, précipitations graphiques complètes et pannes électriques généralisées restent absentes. Consulter l'[inventaire consolidé](docs/gameplay/implementation-status.md) et le [guide joueur](docs/gameplay/player-guide.md).

La charge mixte V87 à cent colons atteint environ **2,05× pour 6× demandé** : CPU p95 114,79 ms, image p95 45,8 ms et pic 137,5 ms. Les mesures ne garantissent pas la fluidité et ne se comparent pas causalement à V86, dont l’activité diffère. [Conditions et diagnostics](docs/research/performance-v87.md).

Mode jour. G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent ; aucun jalon global terminé. La [ROADMAP](docs/ROADMAP.md) est le calendrier unique et les [preuves](docs/development/validation.md) distinguent contrôles réussis, échecs et limites.

## Démarrer

Node.js 22.12 ou plus récent et navigateur avec accélération graphique. Dépendances épinglées ; Node 24.11.1 utilisé pour les validations récentes.

```powershell
npm ci
npm run dev
```

Ouvrir [le jeu local](http://127.0.0.1:5173). Three.js utilise WebGPU si disponible, sinon WebGL 2 ; le backend apparaît dans Menu → Diagnostics. Le compteur FPS reste visible. L’accueil propose Nouvelle partie et Charger. La configuration locale active est 250×250, avec graine aléatoire éditable ; les autres choix sont grisés. Paramètres de diagnostic historique explicites : `/?scenario=camp&seed=123&size=250`.

Le [guide joueur](docs/gameplay/player-guide.md) décrit les contrôles et règles. Le schéma courant est **91**, inchangé par V94. Les anciennes versions sont validées puis migrées sans agrandir la carte ni inventer d'objets ou d'historique. V87 ajoute la priorité Extinction à 1 ; les anciens camps adoptent explicitement le climat, la météo et leurs observations prospectives. Les activations historiques de faune et de calendriers gardent leurs conditions propres. Les contrats spécialisés et l'[inventaire courant](docs/gameplay/implementation-status.md) distinguent les boucles livrées des catalogues et systèmes encore absents.

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
