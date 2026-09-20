# Lisière

Jeu de colonie en 3D low poly pour navigateur, avec RimWorld de base comme référence fonctionnelle. **Version courante : V82**, accueil, création guidée et chargement réel. Atterrissage forcé / Cassandra / Récit d’aventure sont proposés dans une adaptation explicitement partielle ; journée de 16 min 40 s et arrivée à 06 h. Infections, immunité et soins physiques V81 restent jouables. Le départ **Trois survivants V80** propose une vraie dotation sur terrain naturel ; chasse, dépouilles et boucherie V79 restent jouables. [Règles médicales et limites](docs/development/infections.md).

Le camp dispose déjà de récolte, minage, transport, construction, agriculture/cuisine, besoins physiques, premiers soins/combats/raids, accueil et premières interactions sociales. La filière coton → vêtement et deux recherches utiles sont jouables ; canicule et garde-manger réfrigéré créent des contraintes environnementales. Les catalogues et systèmes restent partiels : consulter l'[inventaire consolidé](docs/gameplay/implementation-status.md) et le [guide joueur](docs/gameplay/player-guide.md).

Mode jour. G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent ; aucun jalon global terminé. La [ROADMAP](docs/ROADMAP.md) est le calendrier unique et les [preuves](docs/development/validation.md) distinguent contrôles réussis, échecs et limites.

## Démarrer

Node.js 22.12 ou plus récent et navigateur avec accélération graphique. Dépendances épinglées ; Node 24.11.1 utilisé pour les validations récentes.

```powershell
npm ci
npm run dev
```

Ouvrir [le jeu local](http://127.0.0.1:5173). Three.js utilise WebGPU si disponible, sinon WebGL 2 ; le backend apparaît dans Menu → Diagnostics. Le compteur FPS reste visible. L’accueil propose Nouvelle partie et Charger. La configuration locale active est 250×250, avec graine aléatoire éditable ; les autres choix sont grisés. Paramètres de diagnostic historique explicites : `/?scenario=camp&seed=123&size=250`.

Le [guide joueur](docs/gameplay/player-guide.md) décrit les contrôles et règles. Sauvegardes au schéma **82** : les anciennes versions sont validées puis migrées sans agrandir la carte ni inventer d’objets ou d’historique. Les anciens camps restent sans nouveaux calendriers ni faune jusqu’à leur activation explicite. Les contrats spécialisés et l’[inventaire courant](docs/gameplay/implementation-status.md) distinguent les boucles livrées des catalogues et systèmes encore absents.

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
