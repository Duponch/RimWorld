# Validation V235 — trajet graphique direct écarté

6 octobre 2026, ROOT. Produit `42be79ad` V233/schéma 198 conservé ; V234
`37c14603` est un diagnostic. [Contrat](../development/direct-render-distribution-v235.md),
[sources primaires](../research/direct-render-distribution-v235.md).

## Sources et périmètre

Prototype privé `tmp/performance-orientation-v235/direct-render-native-next` :
19 fichiers, manifest SHA-256
`B999024810F97522C66F7F9B996B679F31EC026A4E78FE11ABD1B8CA09332E1B`, worker Core
`651E65EA9796269BFC7B06D5237E62CA5CBF62B657E0CCAC22C452FDC867EAF7`.
Copies Core/Designation/ports relocalisées par imports seulement ; lecteur,
Nature et journaux V233 canoniques, une seule identité de module par environnement.
Client principal canonique réel et source worker à URL fixe ; aucun forwarding
du paquet depuis main, clone propriétaire V234 ou préparation agricole reprise.

Avant gel, la revue corrige deux erreurs du prototype : purge des anciennes
publications au changement d'epoch avant ACK et compteur alimenté dans un
`finally` après erreur de rendu. Les publications antérieures sont désormais
conservées, et seuls les retours réussis comptent. Aucune mesure ancienne utilisée.
Revue privée indépendante et revue des résultats conservées dans le dossier parent.

A = Core local ; B = même Core avec second destinataire graphique natif. Les
deux lecteurs stricts restent actifs ; ACK principal après callback/audio/réponse,
FIFO source et tuple epoch/révision explicites. Horloges Core originales ;
`confirmedAt` est uniquement une observation. Bornes d'attente et nettoyage
des contextes/Workers/serveur possédés explicites. HMR désactivé, port privé 5218.
L'hôte GAME, inputs, étiquettes et activité sonore sont exclus des deux côtés.

Typage `aulnes-v235-direct-render-types-2026-10-06T08-21-23.515Z-24780`,
**PASS, 3,367 s**. Runtime
`aulnes-v235-direct-render-abba-2026-10-06T08-21-39.061Z-15596`,
**PASS, 114,823 s**, un cycle A/B/B/A, nettoyage complet et aucune erreur navigateur.
Rapport `captures/run-2026-10-06T08-21-39.566Z-iMrX9G/report.json` sous le prototype,
SHA-256 `6BB2E8D2035F0CE97CC775F84FF8AC0996DD79913C6E5929B8F1E19765E5DA58`.
Sources gelées et 65 fichiers publics/62 références inchangés.

## Résultat matériel

Chromium WebGPU matériel AMD rdna-1, Three 186, 1920×1080, DPR 1, orthographique
129/122, zoom 1. Aulnes corrigées tick 6934, 250², 14 colons/un détenu,
16 animaux, 18 224 ressources/2 226 structures. Chauffe 3 s puis 8 s réelles à 6×,
contextes neufs séquentiels, aucun GC forcé ou horloge normalisée.

| Passe | Images soumises/s | Vitesse source réelle | Application moyenne | Décodeur main moyen | Décodeur graphique moyen | p95 intervalle image |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 | 177,750 | 6,097968× | 9,529612 ms | 3,840698 ms | — | 12,5 ms |
| B1 | 165,125 | 6,125837× | 9,270732 ms | 3,444186 ms | 3,640698 ms | 16,6 ms |
| B2 | 161,125 | 6,128141× | 9,689756 ms | 3,486957 ms | 3,701186 ms | 16,7 ms |
| A2 | 174,875 | 5,995053× | 9,873267 ms | 3,944397 ms | — | 12,5 ms |

Moyennes **176,3125 → 163,125/s, −7,479617 %** : les deux B sont sous les deux A.
**Rejet, aucun second cycle lourd ni port GAME.** CPU frame A 3,557/3,717 ms,
B 3,472/3,647 ms : ce wrapper exclut des décodages et ne remplace pas les images.
Maximum d'intervalle A 29,2/29,3 ms, B 33,3/45,9 ms ; médiane 4,2 ms dans les
quatre passes. Application p95 A 15,7/16,0 ms, B 14,3/15,2 ms ; maximum
A 25,3/24,5 ms, B 24,4/32,4 ms. Startup A 7 929/7 863 ms, B 8 094/8 137 ms.

Second post source B 1,005/1,017 ms par publication ; second lecteur inclus ci-dessus.
ACK post main 0,033/0,023 ms. Confirmation principale→join 4,778/5,663 ms,
p95 12,7/14,6 ms ; source→réception graphique 6,380/6,812 ms, p95 14,6/16,1 ms.
Le champ `ACKWaitingMs` inclut lecture graphique et ordonnancement après réception :
4,750/5,255 ms, p95 8,5/12,4 ms ; ce n'est pas une durée propre d'ACK.
Ces mesures imbriquées ne s'additionnent pas comme des coûts CPU indépendants.

Images comptées 1 422/1 321/1 289/1 399 : chacune possède une passe principale,
une ombre et une autre passe finies, UID/frame distincts et cohérents. Total
4 266/3 963/3 867/4 197 passes ; 93 appels de dessin médians, maximum 94,
1 121 746 triangles médians, maximum 1 127 966, dans les quatre passes.
La catégorie « autre » est celle du classificateur par caméra ; son contenu GPU
n'est pas attribué. `gpuTimestampMeasured=false`, aucun nouveau temps GPU mesuré.
Quatre captures 1920×1080 opaques et colorées ; B1 inspectée visuellement par ROOT,
colonie/verdure/meubles présents. Pas d'oracle de pixels A=B entre ticks divergents.

Les débits Core isolés ne se comparent pas causalement aux RAF GAME V233 : hôte,
instrumentation, moment et cadence native diffèrent. Images soumises ne signifient
pas présentation physique de chacune ; aucun écran 240 Hz ou budget GPU exhaustif certifié.

## Oracles et limites

Après pause/drain, ticks 7339/7337/7338/7335 selon passe ; divergence temporelle
ordinaire admise, chaque propre World complet/RNG/sauvegarde strictement comparé.
Anciennes vues et paquets conservés stables. B compare graphes/alias main et rendu
au même tuple arrêté ; files et ACK vides. Séquences natives contiguës, aucun
paquet abandonné ; B 350/346 admissions et ACK au total. Retard latest→présenté
moyen A 10,191/8,952 ticks, B 9,631/8,901 ; il n'est pas annulé artificiellement.

Audits hors chronométrage : stale, **refus précoce de schéma NaN**, checkpoint
valide à la même révision, puis véritable chargement source/sauvegarde et nouveau
checkpoint d'epoch. Le lecteur graphique vivant refuse sans avancer et reprend.
Ce cas ne couvre pas un refus tardif métier/namespace/planète. Aucun débordement
adversarial ou ensemble exhaustif de permutations des deux ports exécuté ; perte
GPU non exercée. Compteurs de graphes 7 804 819 pour chaque A,
15 611 659/15 611 583 pour B : assertions hors fenêtre, pas des cas de test ni
la mémoire du jeu. Graphes retenus et audits apportent leur surcoût de harness.

Le gel et les octets publics sont vérifiés ; aucune nouvelle campagne complète
des 62 saves n'est revendiquée. Preuves produit V233 inchangées, aucun changement
de règles, cadence, qualité, phases, commandes, RNG ou recovery livré par V235.

## Suite

V236 privé réserve une capture topologique terrain renderer-only : 62 500 cases
encore relues par application, parent éclairage V231 moyen 0,727 ms historique,
sans attribution exclusive/current budget. Le suffixe doit porter les indices
bruts A→C réellement examinés, même si D est déjà reçu ; masque/barrières/labels/
light/roof exacts. Précondition readonly native réelle, pas bool+stamp comme
preuve d'entrée arbitraire. Mesurer coût complet et froid avant vrai GAME ; aucun
gain futur acquis. Autonomie et commits locaux sans push continuent.

Contrôle documentaire `aulnes-v235-documentation-2026-10-06T08-44-12.989Z-18332`,
**PASS, 5,018 s** : liens et en-têtes contrôlés. Aucun build ou test moteur répété
pour cette livraison uniquement documentaire.
