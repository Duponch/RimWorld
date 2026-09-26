# Validation V106 — lièvre domestique, entretien et soins

## Périmètre et preuves

26 septembre 2026. Suite du commit V105 `6c9acf6`, selon la demande de terminer puis produire le prochain commit. Trois fronts coordonnés : interaction/compétence/nourriture ; anatomie et soins vétérinaires ; propriété, comportement et interface. Intégration centrale du moteur, commandes, réservations, persistance et démonstration. [Contrat](../development/domestic-animals.md), [recherche Core datée](../research/domestic-animals-reference-v106.md).

Nouveau contenu jouable : le lièvre sauvage peut devenir le même animal possédé et être entretenu/soigné. Il n'y a ni nouvelle espèce, ni objet de catalogue inédit. Les quatre autres herbivores attendent des enclos ; aucune reproduction, production de laine/lait, aire assignable ou animal offert au départ. La richesse animale reste explicitement non chiffrée. G0 en consolidation ; G1–G4 partiels, G5 absent. Aucun jalon global clos, aucune parité Core générale ou autonomie de colonie revendiquée.

## Contrôles regroupés

[Campagne courte](../../artifacts/domestic-tests-v106.json) : 22 fichiers, 107 contrôles, dont 106 réussis au premier passage. Le seul échec final de cette campagne était l'empreinte de la démonstration encore en cours de préparation. La [reprise bibliothèque](../../artifacts/domestic-library-final-v106.json) passe 4/4 après gel du fichier et actualisation du manifeste. Un contrôle supplémentaire de phase d'entretien porte le total distinct à **108 contrôles**, avec reprise ciblée des deux fichiers manipulation/sauvegarde : 10/10. Aucun oracle métier retiré.

Les frontières couvrent nourriture transportée/ingérée, refus sans aléa, échec et succès, durées exactes, délai depuis l'entrée de la tentative finale, familiarité périodique, santé quadrupède, doses réservées/consommées, interruptions, priorité désactivée et poursuite identique après rechargement. Péremption/destruction d'une source ou cargaison, disparition du patient et dernier niveau de familiarité libèrent les tâches avant sauvegarde. Les onze fichiers de bibliothèque sont validés avec empreintes exactes ; V105 est strictement vérifiée avant la seule priorité Animaux 0, sans compétence ni animal ajouté. Les fixtures historiques sont immuables.

Relecture et corrections produit : références de piles initialement oubliées par expiration/destruction ; tâches périmées pendant déplacement ; durée de soin importée hors phase de traitement ; séquence Core précise et origine du délai ; arrondi IEEE qui transformait 45 en 46 ticks de repas. La validation refuse maintenant ces archives et conserve les cargaisons récupérables. Les premières attentes de migrations factices ont été corrigées pour comparer les champs historiques réellement présents, sans inventer la compétence Animaux.

## Parcours natif

[Parcours](../../tests/integration/domestic.spec.ts), [rapport](../../artifacts/domestic-native-v106.json), Chromium WebGPU réel, sources servies gelées. Vérifie Travail aux largeurs 1366/1440/1920 sans dépassement, chargement depuis la bibliothèque, sélection du lièvre possédé, politique None→Herbal, séparation Faune/Animaux, désignation du sauvage puis nourriture et action physique. Checkpoint au tick **2114**, rechargement exact au milieu de l'interaction ; première tentative réellement échouée au tick **2219**, soin du lièvre blessé au tick **2322**, pause et restauration à froid au tick **2329**. Une plante médicinale consommée, blessure traitée, identités conservées, aucune erreur JS/GPU. Le parcours complet prend environ 22 secondes ; le succès est prouvé séparément au moteur, pas attribué à ce parcours UI.

[Politique et santé](../../artifacts/domestic-health-v106.png), [après soin](../../artifacts/domestic-cared-v106.png). Deux erreurs du pilote sont conservées : [sélecteur ambigu](../../artifacts/domestic-native-initial-failure-v106.json) entre tableau et dossier ; [fermeture superflue](../../artifacts/domestic-native-second-failure-v106.json) après un chargement ayant déjà fermé le menu. Corrections du geste du pilote seulement, puis parcours complet réussi. Aucun clic forcé derrière un panneau.

## Démonstration et coûts

« Lièvres et soins · 1 colon », accessible dans Charger → Colonies de test, est une situation **préparée** : Animaux/Médecine 8, un lièvre déjà possédé et blessé, un sauvage, lit, 75 baies, 20 repas et quatre plantes médicinales. Le régime Repas uniquement réserve les baies aux animaux. Ni chance de succès ni tirage modifié. Elle ne démontre pas la survie autonome depuis Atterrissage forcé. Le premier essai avec 12 baies les épuisait ; le stock de démonstration a été corrigé, sans changement du coût des règles.

Mesures CPU puis worker/rendu natives exécutées successivement sur la charge ENERGY+ECONOMY, sources gelées. Les résultats mesurés figurent ci-dessous. Ce banc d'activités mixtes garde ses animaux sauvages : il mesure le coût général de la version ; les interactions domestiques ont leurs tests et parcours dédiés, pas une garantie de capacité à cent dresseurs simultanés.

### Mesures finales

[CPU](../../artifacts/energy-cpu-v106.json) puis [natif](../../artifacts/energy-render-v106.json), Ryzen 5 3600, WebGPU AMD, 1440×1000. Carte naturelle 250², cuisine/cultures/recherche/électricité et autant de lièvres sauvages que de colons ; économie activée. CPU : 100 ticks d'échauffement séparés puis 650 mesurés. Natif : 90 images d'échauffement puis au moins 650 ticks à ×6 demandé.

| Colons + animaux | CPU p95 | Image p95 / max | Débit demandé ×6 | Worker p95 des moyennes de lots |
| --- | ---: | ---: | ---: | ---: |
| 3 + 3 | 2.42 ms | 6.10 / 18.00 ms | 5.90× | 3.50 ms |
| 30 + 30 | 12.44 ms | 12.10 / 30.10 ms | 5.85× | 12.80 ms |
| 100 + 100 | 38.19 ms | 12.00 / 42.00 ms | 5.06× | 40.45 ms |

Activités, conservation, mondes et allocations contrôlés, aucune erreur JS/GPU. Ces passages successifs ne constituent pas un A/B causal : aucune accélération attribuée au lot, aucune garantie de 240 FPS ou de ×6 constant. Navigation et charge des grandes colonies restent ouvertes. Les scans domestiques ne cherchent pas de chemin par image et les barres lisent les compteurs persistés.

[Reprise ciblée finale](../../artifacts/domestic-handling-final-v106.json) : 10/10 ; build et typage réussis. Documentation : 389 documents, 4 252 liens locaux, sources originales identiques. La campagne regroupée a pris environ 19 secondes, les reprises ciblées environ 3 secondes chacune et le parcours natif réussi 22 secondes. Recherche et intégration sont réparties entre agents et centre sans chronomètre commun exhaustif ; aucun temps total de développement n'est déduit de ces seules commandes.

## Publication

Production Netlify `6ab719c6cae56ea3797e9ca3`, 36 fichiers, état ready. [Déploiement](../../artifacts/netlify-v106.json), [contrôle général public](../../artifacts/netlify-smoke-v106.json), [bibliothèque publique et octets du build](../../artifacts/domestic-public-v106.json). Nouveau départ avec trois personnes, schéma 106, 62 pictogrammes, sauvegarde et restauration à froid, panneaux sans défilement horizontal. Les onze choix sont présents ; les démonstrations V105 et V106 chargent et sauvegardent exactement après migration attendue. Aucun export de diagnostic public ni erreur JS/GPU.
