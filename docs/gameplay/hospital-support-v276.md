# V276 — soutien hospitalier

Schéma 211. Sol stérile et moniteur vital réemploient construction, recherche, électricité, pièces et clinique existantes ; aucun bonus médical indépendant de ces systèmes.

## Sol stérile

La recherche **Matériaux stériles** coûte 600 points. Chaque case exige 3 aciers, 12 argents et Construction6 ; travail1600Core, soit160ticks locaux avant facteurs du bâtisseur. Les deux ingrédients sont réellement collectés et livrés au chantier ; reprise de livraison ou de frame commune aux autres ouvrages.

Le revêtement conserve le terrain sous-jacent, empêche le semis, apporte propreté+.6, beauté−1 et temps de nettoyage×.6. Il peut toujours recevoir des salissures : le nettoyage physique reste nécessaire et les calculs de pièce existants portent l’effet clinique, sans second bonus de « pièce stérile ».

Au retrait, chaque ingrédient est remboursé à moitié : argent6, acier1ou2 selon l’arrondi aléatoire historique. Les deux dépôts, réservations, limites d’identités et pertes doivent tenir avant toute modification du sol, du RNG ou des piles. La perte d’argent est comptée séparément dans `deconstructed.lostSilver`. Les anciens sols gardent leur transaction et leur arrondi.

## Moniteur vital

Construction1×1 : acier50, composants3, travail6000Core, Construction8,100PV et80W ; minifiable, sans qualité. Recherche2500points, après Lit d’hôpital et Multi-analyseur, au bureau avancé avec analyseur disponible.

Un moniteur adjacent, diagonales comprises, peut servir plusieurs lits hospitaliers ; un lit reçoit au plus un lien. La sélection géométrique et la ligne de vue précèdent la vérification électrique. Le moniteur le plus proche éteint n’est pas remplacé automatiquement par un autre plus loin. Lit ordinaire, patient porté/en route et simple réservation n’accordent aucun bonus.

Le lit hospitalier soutenu gagne soins+.07, immunité+.02 et succès chirurgical+.05 : facteurs de base1.13pour l’immunité et1.15pour la chirurgie, offset de soins total+.17. La guérison naturelle reste inchangée. Alimentation, interrupteur, destruction, déplacement et disponibilité physique sont relus par les consommateurs cliniques existants.

## Sources et adaptations

Primaires locales Core1.6.4871rev590 : `Data/Core/Defs/TerrainDefs/Terrain_Floors.xml` (SterileTile), `ThingDefs_Buildings/Buildings_Misc.xml` (VitalsMonitor), recherches `ResearchProjects_2_Electricity.xml` et `ResearchProjects_4_MultiAnalyzer.xml`. Liens : `CompFacility`, `CompAffectedByFacilities`, `CompProperties_Facility`, décompilés en privé sous `tmp/audit-20261004/core-fidelity/`. DLL épinglée SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a` ; étude locale `tmp/hospital-support-v276-reference/scope.md`.

Horloge locale10Core par tick. Electricity est une capacité initiale, sans nouvelle recherche distincte. Le prérequis Core caché Matériaux stériles du Lit d’hôpital n’est pas ajouté rétroactivement : les recherches hospitalières historiques restent valides, sans auto-complétion de la nouvelle recherche. Les nouveaux états sont refusés avant211 ; migration prospective neutre.

## Validation

Typage et build finaux passent (`v276-final-build`,6,863s). Les vérifications restent proportionnées au lot et regroupées ; aucun banc de performance n’est relancé.

152 cas uniques dans24fichiers, dont32nouveaux dans cinq fichiers, passent par contrôles groupés puis reprises ciblées. Coûts/recherches, vraie désignation et rotations, collecte/frame/reprise, remboursements saturés à deux ingrédients, débordements, RNG, salissure/nettoyage, géométrie/LOS, extinction/noncumul, quatre immunités et deux chirurgies sont couverts. Les anciens soins, sols, réseaux, recherches et62sauvegardes publiques restent contrôlés ; les65fichiers publics sont inchangés.

Le premier typage a repéré deux libellés de travaux, une assertion de type trop large et trois fixtures de commandes incomplètes ; les reprises passent. Le groupe initial130cas a révélé une attente historique assimilant toute dalle à de la pierre et une vraie lecture EMP de `packed` absent avant le schéma25 ; le lecteur conserve maintenant cette absence historique, et les contrôles EMP sont ajoutés à la reprise. Le premier parcours natif a révélé la désignation moniteur oubliée dans le moteur : whitelist, recherche, rotation et matériau par défaut sont raccordés, avec un test physique supplémentaire. Un second refus provenait seulement du générateur préparé sans état électrique réconcilié. Les journaux rouges restent conservés sous `tmp/validation-runs/v276-*`.

Chromium WebGPU matériel,1440×1000, joue la construction du moniteur et d’une dalle avec consommation intégrale des53aciers,3composants et12argents préparés, puis une pose de jambe en bois sous moniteur actif. Sauvegardes/reprises exactement égales aux ticks3038(frame),3937(soutien construit),4076(chirurgie anesthésiée) et4169(prothèse posée) ; erreurs vides. Captures relues sous `tmp/hospital-support-v276-native-uZfJhc/`, navigateur et serveur privé5309 fermés. Recherche, lit et générateur sont préparés ; ce parcours ne certifie pas une campagne hospitalière naturelle, une perte GPU ou un gain de FPS. Le modèle rigide du moniteur réemploie les batches de mobilier existants, sans nouvelle animation par image.
