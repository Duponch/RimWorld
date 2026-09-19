# Validation de la conservation froide — V75, 19 septembre 2026

Résultat visé et obtenu par le pilote : recherche depuis zéro, appareil construit avec matières livrées, réserve alimentaire chargée, gel puis vraie panne de combustible et perte des provisions. [Contrat](../development/cold-store.md), [recherche datée et adaptations](../research/cold-store-reference.md). Le froid humain a un effet réel ; gelures localisées, hiver et réseau électrique complet ne sont pas livrés.

## Parcours et régressions

- Passe globale initiale **353/376**, 85 fichiers, **321,61 s** : 23 échecs de migration dans 19 fichiers avaient la même cause, `validateCoolers` lisait `packed` avant son introduction historique. Le validateur consulte maintenant une collection absente comme vide à ce stade, sans nettoyer les données de la sauvegarde. Les longs parcours déjà verts ne sont pas rejoués inutilement. Passe finale ciblée **80/80**, 21 fichiers, **56,29 s**, incluant toutes les familles rouges, les huit scénarios V75 et les nouvelles coordonnées invalides. TypeScript/build réussis. Pas de seconde passe globale annoncée.
- Six scénarios climatiseur regroupés : géométrie/obstruction/efficacité/rejet/veille/panne, progrès indépendants, accès Construction 5 avec vraies livraisons, déconstruction/non-minification, destruction/restitution saturée sans RNG consommé, refus/migration et continuation. Deux scénarios froid croisent seuils stricts, bande neutre, capacités/insulation/décès, mobilisation puis déplacement physique au refuge et reprise exacte.
- [Pilote alimentaire](../../artifacts/cold-store-player-v75.json) : 20 repas conservés à partir du tick **22 729**, âge total strictement inchangé pendant les 1 000 ticks suivants ; générateur vide au tick **28 972**, vingt repas périmés au tick **30 367** (5,06 jours). Les deux personnes sont vivantes, 10 acier et zéro composant restent ; matière de départ déclarée, rien injecté ensuite. [Checkpoint au gel](../../artifacts/cold-store-checkpoint-v75.json), [recherche encore inachevée](../../artifacts/cold-store-preparation-v75.json).
- [UI native](../../artifacts/cooler-ui-v75.json) : reprise du checkpoint réellement gagné, sélection/suspension de deux projets, recherche à 1×/6×, construction, sept clics rapprochés au thermostat, neuf cellules de réserve alimentaire, transport/congélation, sauvegarde/rechargement exacts, retour à 21 °C et reprise du vieillissement. Aucun tick forcé dans le navigateur ; ce n’est pas cinq jours entièrement rejoués en UI. Passe native finale **1/1**, **43,3 s** de scénario, **50,5 s** au total. Capture locale `cooler-v75.png` examinée : boutons compacts accessibles, bleu/rouge et FPS conservés, aucune erreur navigateur.
- Défaut réel détecté par le navigateur : les incréments du thermostat calculés sur l’ancien snapshot perdaient des clics. La commande relative `cooler-adjust` résout chaque incrément sur le worker. Le test garde la rafale. Autres échecs intermédiaires : réserve initiale pleine de bois, filtres/branche stockpile manquants dans le pilote UI, attente de récupération médicale trop courte, case de porte extérieure correctement tempérée, import de helper erroné et cellule de restitution de fixture occupée par un mur. Assertions métier conservées ; aucune injection de fraîcheur ni règle de froid assouplie.

## Charge et présentation

Matériel : **AMD Ryzen 5 3600**, Windows **10.0.26200**, Node **24.11.1**, Chromium natif WebGPU **AMD RDNA-1**, viewport **1440×1000**. Carte naturelle **250²**, recherche/confection/minage/abattage ; 1/6/20 petites pièces froides, riz, générateurs et un cinquième des personnes initialement exposées au froid. Cette charge comporte davantage d’ouvrages/pièces que V74 : ne pas attribuer toute différence à une régression du moteur.

[CPU et snapshots](../../artifacts/cold-store-cpu-v75.json), 650 ticks, 100 ticks d’échauffement séparés :

| Personnes | Tick p50 / p95 / p99 / max, ms | Snapshot p95 / max, ms |
|---|---|---|
| 3 | 1,40 / 3,52 / 6,93 / 32,93 | 5,09 / 8,71 |
| 30 | 3,18 / 10,40 / 21,56 / 36,91 | 4,72 / 16,46 |
| 100 | 12,06 / 30,31 / 43,33 / 56,40 | 5,28 / 11,63 |

[Worker/rendu natifs](../../artifacts/cold-store-render-v75.json), demande 6×, échauffement 90 images, environ 664 ticks par fenêtre. Le worker publie des moyennes par lot : leurs percentiles ne sont pas ceux de chaque tick isolé.

| Personnes | Image p50 / p95 / p99 / max, ms | CPU frame p95, ms | Worker lot p95 / max, ms | Adoption snapshot p95, ms |
|---|---|---|---|---|
| 3 | 12,50 / 29,10 / 45,80 / 75,00 | 7,10 | 3,30 / 43,20 | 0,80 |
| 30 | 12,50 / 29,10 / 45,80 / 66,80 | 13,40 | 12,40 / 63,30 | 0,10 |
| 100 | 12,50 / 33,20 / 45,80 / 58,40 | 20,70 | 35,77 / 82,30 | 11,30 |

Zéro erreur navigateur/état invalide/nouveau pipeline GPU sur ces fenêtres ; géométrie des personnages stable. Les vêtements aboutissent réellement (1/9/28 dans le navigateur), la recherche progresse, les personnes rejoignent le chaud et récupèrent. À 100 acteurs, simulation ralentie : 664 ticks prennent **16,54 s**, contre environ **11,2 s** à trois acteurs. Points à poursuivre lors des prochains audits : coût des nombreuses pièces/services et adoption des snapshots ; aucune garantie de 6× ou de fluidité parfaite. Le climatiseur réutilise les lots résidents ; ses oscillations de thermostat ne provoquent pas une reconstruction graphique.


Les sources restent gelées pendant les mesures natives ; pilotes et mesures exécutés successivement. Les chambres froides et expositions du banc sont déclarées au départ, distinctes de la progression réelle du camp. Une seule passe par effectif ne garantit ni toutes les pointes ni une vitesse 6× constante. Aucun compteur FPS de capture isolée ne sert de preuve de performance.

La garde de mouvement minage/abattage V74 reste distincte des scénarios thermiques. [Garde V75](../../artifacts/harvest-sync-cold-store-v75.json) : deux fenêtres natives de 45 secondes, trois colons, 1×/6×/1×/3×. Zéro saut, occupation solide incohérente, famine du tampon ou erreur navigateur. Les 90/75 observations sans segment sont toutes au tick initial 2 000, avant le premier segment au tick 2 001 ; aucune interruption en route déduite de ces observations. Réponse complètement stabilisée des vitesses au plus **68/54 ms**. Image p95 **25 ms** pour les deux activités ; pics **58,4/66,6 ms**. Cette passe ne prouve pas l’absence de toute pointe ; elle est plus lente que la capture V74 et ne sert pas à annoncer un gain.

Documentation : **263 documents, 2 711 liens locaux** contrôlés après ajout du dernier rapport ; 25 domaines, cinq familles de validation, trois originaux préservés octet pour octet. Guide, contrats, catalogue, inventaire et calendrier canonique mis à jour ; G0 en consolidation, G1/G2/G3 partiels, G4 engagé, G5 absent.
