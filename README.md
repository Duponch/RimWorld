# Lisière

Jeu de colonie en 3D low poly pour navigateur, avec RimWorld de base comme référence fonctionnelle. **V86 validée : capture, captivité et recrutement, avec optimisation CPU.** La continuation du camp V85 atteint J76,28 avec quatre colons : un assaillant a été réellement capturé, nourri, soigné puis recruté, et dispose d’un lit, de repas et de travail. [Preuves et limites V86](docs/history/validation-prisoners-v86.md). Les gains CPU contrôlés de 6–8 % et la réduction des lectures répétées de pièces ne garantissent pas 6× à cent colons ; [mesures](docs/research/performance-v86.md).

**V85 déjà livrée : réseau électrique construit, batteries, panneaux solaires et commutation physique.** La colonie V84 a été poursuivie par une reprise documentée jusqu'à J42,21 : recherche et construction réelles, cuisine électrique, aliments gelés, nuit sur batterie et coupures physiques. Contrats, parcours natif, charge, typage et build validés ; [preuves et limites V85](docs/history/validation-energy-v85.md). À cent colons, la charge mixte atteint environ 3,76× pour 6× demandé : cette livraison ne garantit pas ce débit.

**Filière alimentaire V84 déjà livrée**, filière alimentaire durable : pommes de terre et maïs, cuisinières à bois/électrique, table de boucherie et malnutrition avec récupération par alimentation physique. Un vrai départ a été joué pendant 24 jours, avec deux récoltes sur les mêmes 80 cases de riz, diversification, soins après combat et sept jours sans consommer les rations initiales. [Preuves et limites V84](docs/history/validation-food-v84.md).

L’accueil, la création guidée et le chargement sont jouables. Atterrissage forcé / Cassandra / Récit d’aventure restent une adaptation partielle : forêt tempérée locale, trois reliefs, dotation et technologies explicites, journée de 16 min 40 s nominales et arrivée à 06 h. Les anciennes cartes et leurs calendriers sont préservés.

Le camp dispose déjà de récolte, minage, transport, construction, agriculture/cuisine, besoins physiques, premiers soins/combats/raids, accueil et premières interactions sociales. La filière coton → vêtement et la recherche collective sont jouables ; canicule et garde-manger réfrigéré créent des contraintes environnementales. Éolien, météo et saisons complètes, incendies et pannes générales restent absents. Les catalogues et systèmes restent partiels : consulter l'[inventaire consolidé](docs/gameplay/implementation-status.md) et le [guide joueur](docs/gameplay/player-guide.md).

Mode jour. G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent ; aucun jalon global terminé. La [ROADMAP](docs/ROADMAP.md) est le calendrier unique et les [preuves](docs/development/validation.md) distinguent contrôles réussis, échecs et limites.

## Démarrer

Node.js 22.12 ou plus récent et navigateur avec accélération graphique. Dépendances épinglées ; Node 24.11.1 utilisé pour les validations récentes.

```powershell
npm ci
npm run dev
```

Ouvrir [le jeu local](http://127.0.0.1:5173). Three.js utilise WebGPU si disponible, sinon WebGL 2 ; le backend apparaît dans Menu → Diagnostics. Le compteur FPS reste visible. L’accueil propose Nouvelle partie et Charger. La configuration locale active est 250×250, avec graine aléatoire éditable ; les autres choix sont grisés. Paramètres de diagnostic historique explicites : `/?scenario=camp&seed=123&size=250`.

Le [guide joueur](docs/gameplay/player-guide.md) décrit les contrôles et règles. Les sauvegardes utilisent le schéma **86** : les anciennes versions sont validées puis migrées sans agrandir la carte ni inventer d’objets ou d’historique. Les anciens camps restent sans nouveaux calendriers ni faune jusqu’à leur activation explicite. Les contrats spécialisés et l’[inventaire courant](docs/gameplay/implementation-status.md) distinguent les boucles livrées des catalogues et systèmes encore absents.

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
