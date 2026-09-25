# Validation V104 — sculpture et démonstrations intégrées

26 septembre 2026 (date locale), Core seul, base `fdb7871`, branche `main`. [Contrat](../development/art.md), [références datées](../research/art-reference-v104.md). Trois missions Sol bornées : références/règles, rendu/statistiques/démonstration, bibliothèque/persistance ; intégration et validation centrales.

## Livraison et limites

Atelier d'art manuel, priorité Art, compétence Artistique, petites et grandes sculptures dans sept matières obtenables. Approvisionnement homogène, travail lié à l'auteur, qualité, ouvrage interrompu, annulation conservative, transport du meuble minifié et installation relient artisanat, décoration et qualité des pièces. La filière fournit quatorze combinaisons de taille/matière, pas quatorze modèles visuels distincts. Les œuvres installées enrichissent beauté, richesse et impression des salles déjà jouables en V103.

Le catalogue partagé propose **neuf colonies de test directement depuis Charger → Colonies de test**, notamment l'atelier V101, les salles V103 et la sculpture V104. Les anciennes sauvegardes publiques restent inchangées. La migration valide strictement V103 puis ajoute seulement Art à priorité 0 ; aucune matière, recherche, œuvre ou compétence n'est offerte. Absence d'Artistique signifie niveau 0.

Titres/descriptions narratives, grande sculpture monumentale, matières supplémentaires et commerce des meubles minifiés restent absents. Richesse globale/narrateur, élevage, médecine étendue et monde restent des chantiers distincts. G0 en consolidation ; G1–G4 partiels ; G5 absent, aucun jalon global clos. Estimations fonctionnelles incertaines uniquement dans ROADMAP.

## Contrôles regroupés

- **81 contrôles unitaires distincts réussis** : passe de 76 dans 17 fichiers (21,21 s), puis 21 contrôles art/bibliothèque reprenant 20 cas déjà comptés et ajoutant la frontière « jusqu'à X », et quatre migrations V101. Typage et build réussis. Les régressions couvrent usinage, cuisine/ordres, priorités, construction/matières, transport/minification, déconstruction, progression visuelle, beauté/valeur/pièces, compétences et filtres.
- [Production](../../tests/art-production.test.ts) : ateliers bois/acier, refus de construction directe, œuvres réelles de deux tailles, matières 75+25, XP Artistique, auteur/reprise exacte, qualité, stockage/pose, annulation et saturation atomique, comptage installé/porté/au sol et récupération physique à la déconstruction. [Sauvegarde](../../tests/art-save.test.ts) : migration neutre, états illégaux et continuité d'ouvrage ; [statistiques](../../tests/art-stats.test.ts) : matériaux, qualité, PV, valeur et beauté installée/minifiée ; [bibliothèque](../../tests/test-colony-library.test.ts) : neuf entrées, formats, bornes, empreintes et fixtures historiques.
- **Deux parcours UI/worker**, Chromium affiché WebGPU 1440×1000 : [art](../../tests/integration/art.spec.ts) et reprise `room-experience.spec.ts`, tous deux réussis, 1,6 min au total. Le premier charge V103 puis V104 depuis le catalogue, crée réellement une facture, choisit le bois, fabrique la petite sculpture, l'installe puis inspecte provenance, statistiques et Besoins. Aucun clic forcé ni erreur JS/GPU. [Rapport art](../../artifacts/art-native-v104.json), [grande œuvre](../../artifacts/art-large-prepared-v104.png), [œuvre installée et besoins](../../artifacts/art-installed-needs-v104.png), [reprise des salles](../../artifacts/room-experience-native-v104.json).

Le pilote termine au tick 10683 : petite sculpture bonne, beauté moyenne de la pièce 4,506 → 5,121, richesse 3076,192 → 3207,892, impression finale 128,483. Les oracles comparent aussi les contributions exactes avec/sans l'œuvre, plutôt que ces seuls arrondis. Pas de campagne annuelle : les frontières touchées sont fabrication, interruption, migration et installation ; ces contrôles ne prouvent pas l'équilibre à long terme.

Les corrections d'intégration ont conservé les assertions : admission interne de l'installation sans autoriser la construction directe, qualité/provenance des meubles minifiés, matières homogènes et comptage des œuvres déjà installées. La démonstration finale conserve le sommeil/rétablissement naturels de l'artiste pendant son travail. Les preuves historiques V103 sont préservées ; sa reprise native est archivée séparément sous V104.

## Coûts et limites

Ryzen 5 3600, Node 24.11.1, WebGPU AMD RDNA1, 1440×1000. [CPU](../../artifacts/energy-cpu-v104.json) puis [worker/rendu](../../artifacts/energy-render-v104.json), successifs, sources gelées pendant le natif. Charge préparée ENERGY : 3/30/100 colons et autant de lièvres, recherche, cuisine, cultures, extraction et énergie. 650 ticks mesurés par taille ; cette charge générale ne comprend pas un atelier d'art. Le parcours UI distinct couvre cet atelier.

| Colons + animaux | CPU tick p95 | Instantané CPU p95 | Image native p95 / max | Débit natif demandé 6× |
| --- | ---: | ---: | ---: | ---: |
| 3 + 3 | 4,33 ms | 9,61 ms | 12,4 / 20,9 ms | 5,90× |
| 30 + 30 | 22,36 ms | 13,42 ms | 25,0 / 58,4 ms | 5,84× |
| 100 + 100 | 66,08 ms | 15,58 ms | 20,7 / 45,8 ms | 3,36× |

À cent, 660 ticks en 32,690 s ; worker p95 de moyenne par lot 62,5 ms, maximum 106,4 ms. Les caméras englobent des surfaces différentes selon la charge ; les FPS ne sont pas une fonction monotone du nombre de colons dans ce protocole. Mondes valides, activités vérifiées, allocations stables, aucune erreur JS/GPU. Le rendu des œuvres réutilise les lots instanciés existants ; aucun balayage de toutes les œuvres par image ajouté. Ce relevé n'est pas une comparaison causale avant/après ni une garantie de 240 FPS/6× ; les coûts généraux de simulation restent ouverts.

## Découverte

Ouvrir **Charger → Colonies de test → Atelier de sculpture · 1 colon**. La [fixture](../../public/test-saves/v104/sculpture.json), générée par [ce script](../../scripts/generate-art-demo.ts), fournit atelier, matières, pièce et artiste préparés ; la grande sculpture en marbre a ensuite été réellement fabriquée et installée par le moteur. Tick 8516, 42183 octets, SHA-256 `0c55c4d8172f33de1885d31a096ac680ab6ce45efd1ac81a67b29c597bb0b7f3`. Ajouter une facture de petite sculpture en bois, puis installer son produit pour observer l'effet sur la salle. Cela ne constitue pas une colonie autonome ni une progression naturelle.

Les salles V103 restent accessibles dans le même menu, sans télécharger/importer de fichier. Leur hash `e698c0fd4e1fa7e01da81dab6f3eb2c7fdd0bb6f873fde804879e783ec7cb9cf` et celui de l'atelier V101 `8eab5a144a9bcd0affa91c7dd91a94309b727251afb405733ab3ff20b3c2aa2d` sont conservés.


## Publication vérifiée

Netlify production **`6ab6f10d39e44ca841f1266f`**, 34 fichiers, état `ready` : [réponse](../../artifacts/netlify-v104.json). Le [parcours général public](../../artifacts/netlify-smoke-v104.json) passe : nouveau départ à trois, schéma 104, sauvegarde/restauration à froid, 62 pictogrammes Architecte, huit formes de curseur et panneaux de gestion sans défilement horizontal à 1440×1000, aucune erreur JS/GPU.

Le [parcours bibliothèque public](../../artifacts/art-public-v104.json) compare le bundle, le manifeste et les octets V103/V104 au build local ; les deux scènes se chargent réellement par leurs boutons puis se sauvegardent à l'identique après migration neutre prévue. Neuf choix visibles, priorité Art consultable, aucun export de diagnostic exposé. [Bibliothèque publiée](../../artifacts/art-public-art-v104-catalogue-v104.png), [travail artistique](../../artifacts/art-public-work-v104.png). Aucun téléchargement manuel n'est requis.
