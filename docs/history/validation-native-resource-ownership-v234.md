# Validation V234 — candidat propriétaire natif écarté

6 octobre 2026, ROOT. Référence produit `42be79ad` V233, schéma 198. Sources produit
et 62 entrées publiques conservées ; aucun changement moteur/rendu/client livré.
[Contrat](../development/native-resource-ownership-v234.md),
[recherche primaire](../research/native-resource-ownership-v234.md).

## Revue et sources gelées

Prototype privé sous `tmp/performance-orientation-v234/owned-native-next` puis
reprise distincte `owned-native-reprise-next`. Snapshot RAW
`549F51F26DD993326A3A11CD3C5B8D2C6E4A9155DF0D3F589E651A34D9191974` ; module feuille final
`AFC00109659E110EEC40663043B92235F8D40279F41613F733E4FEEDBA8D69FE`. Le module
feuille initial `3F8F1C9B…` reste conservé : revue bloquée par deux boucles utilisant `next`
avant son propre contrôle, sans runtime. Reprise numérique seule, relue avant
exécution ; fichier `snapshots.ts` identique. Les contrôles planétaires utilisaient déjà des boucles numériques au
GEL 549 ; une lecture ROOT d'un extrait pré-GEL n'a produit aucun nouveau correctif.

Client privé initial `A4E01F78…` conservé. La revue relève `stopped=false` avant
création du canal, ce qui diverge lors d'un redémarrage échoué. Reprise distincte
`SimulationClient-restart-reprise.ts` RAW
`1CEC06865150BD67F430184EB452202BA0C0C59679E171203D8E03A34A3B0E96` déplace seulement
cette affectation après succès. Aucun client instancié par les bancs ci-dessous ;
le broker et le cas où la factory lève une exception restent une obligation prospective, pas un résultat.

Imports des trois corps relocalisés sur les IDs canoniques, une seule instance locale du journal
dans chaque environnement JavaScript. Snapshot/module feuille réellement chargés ; client mappé disponible mais
absent du scénario. Standalone sans association propriétaire, aucun drapeau raw.
Initialisation du module et fonctions/définitions ESM stables supposées ; les
interpositions concrètes utilisées par la reconstruction déclinent le mode.

Typage initial du prototype/banc de coût :
`aulnes-v234-private-types-2026-10-06T07-34-00.375Z-28452`, PASS, 2,329 s.

## Coût complet du parcours concerné

Initial `aulnes-v234-native-cost-2026-10-06T07-46-58.553Z-24692`, FAIL, 102,900 s :
A seul finit, puis import virtuel du module feuille non résolu dans B. Aucun résultat A/B
déduit. Sources/rapport conservés dans `owned-native-controls-next` ; les deux
serveurs et le navigateur se ferment. Reprise distincte
`owned-native-controls-reprise-next` : `resolveId` du module feuille, URL de sa propre page et
borne d'attente ready de 30 s seulement, worker/measure/candidat RAW inchangés.

`aulnes-v234-native-cost-reprise-2026-10-06T07-50-11.826Z-27640`, **PASS, 42,480 s**.
Rapport `captures/run-2026-10-06T07-50-12.458Z-5OlHz8/report.json` sous ce dossier.
Huit passes, deux cycles A/B/B/A séquentiels, pages/workers natifs neufs. Source
publique Aulnes 6934, 250², 18 224 ressources/2 226 structures ; 64 ticks ordinaires préparés
avec moteur/encodeur réels, 65 paquets dont le checkpoint, chauffe 8 + mesure 56, fin 6998.
JSON World final complet/RNG identiques dans les huit passes. Empreintes des sources,
du harness et de l'entrée stables. Fermeture locale réelle B et absence de fermeture A exigées.

| Cycle | Demande→fin callback A/B | Écart | Froid A/B | Callback Nature/index A/B | Soumission→début callback A/B |
| --- | --- | --- | --- | --- | --- |
| 1 | 10,060714 / 10,250000 ms | +1,8814 % | 216,10 / 259,85 ms | 1,825893 / 1,635714 ms | 8,221473 / 8,561630 ms |
| 2 | 9,296429 / 10,158929 ms | +9,2778 % | 199,20 / 265,55 ms | 1,703571 / 1,654464 ms | 7,479479 / 8,399187 ms |

Les délais demande→fin incluent demande native, ordonnancement, soumission/clone,
distribution sur le thread principal, vraie validation/prévalidation/fermeture et consommateurs synchrones.
Soumission→callback est une latence, pas le temps CPU propre d'`adopt`. Le callback mesure
seulement Nature/index, avec les mêmes applications sautées modulo 6. Construction
synchrone et durée écoulée de chargement/préparation sont rapportées séparément. Le total de 65 paquets garde
checkpoint/chauffe ; moteur/encodeur de préparation sont hors fenêtre. Aucun
timer retiré, GC forcé, cadence/horloge normalisée, autre jeu concurrent ou gain
FPS de ce banc partiel. GAME/UI/audio/acteurs/structures/piles/GPU exclus.

p95 à chaud A 16,2…18,4 ms/B 14,1…14,4 ms parfois meilleur, mais coût moyen complet
et froid défavorables ; maxima à chaud A 16,6…22,7 ms/B 19,5…21,1 ms ne justifient aucune
certification générale. **Piste rejetée, aucun GAME lourd supplémentaire.**

## Oracles natifs distincts

Banc `native-ownership-oracles-next`, GEL 8D48A45D…, typage rouge en 2,164 s : la fixture
stale affectait NaN à `schemaVersion` typé littéralement 198. Candidat inchangé,
aucun runtime initial. Reprise `native-ownership-oracles-reprise-next`,
GEL 03634BDF… : cast explicite du paquet corrompu et nouveaux chemins seulement.
Typage `aulnes-v234-native-oracle-types-reprise-2026-10-06T07-55-59.212Z-12460`,
PASS, 2,258 s.

Runtime `aulnes-v234-native-oracles-reprise-2026-10-06T07-56-04.649Z-17244`,
FAIL, 62,051 s ; A 84 publications, 137 713 602 comparaisons/164 271 contrôles de fermeture.
B échoue sur `C-growth.literal-life` : la fixture demandait qu'une life retenue
soit mutable parce que le nouveau record de croissance l'est. La reconstruction
historique partage cette life déjà fermée ; elle doit rester identique et fermée.
Ce rouge ne justifie pas d'assouplir les gardes/alias et ne correspond pas à un bug produit corrigé.
Reprise distincte `native-ownership-oracles-life-reprise-next`, GEL
`0DF14E23F6DDA61DE0D68F806013205E5A1567DC36CC088B8F4CFCC70254309D` :
seule cette attente est corrigée. La life fermée doit être exactement une référence
déjà fermée du World précédent ; valeurs et graphes retenus restent comparés.
Candidat, lecteur historique et fixtures RAW inchangés.

Typage `aulnes-v234-native-oracle-types-life-reprise-2026-10-06T08-03-45.149Z-17884`,
**PASS, 2,085 s**. Runtime
`aulnes-v234-native-oracles-life-reprise-2026-10-06T08-03-56.808Z-19640`,
**PASS, 61,951 s**, rapport
`captures/run-2026-10-06T08-03-57.426Z-Y89FX1/report.json` sous ce dossier.
A et B reçoivent chacun 84 publications, avec verdicts, ordre et remplacements
identiques ; chacun effectue 137 713 602 comparaisons de graphes. Fermetures :
A 164 271 contrôles, B 820 781, selon leurs contrats distincts. Les six formes
standalone ont les mêmes effets. Sept familles natives passent, vraies URL fixes
exigées, aucune erreur navigateur, sources privées/produit et 65 fichiers publics
stables. Contextes, Workers et deux serveurs possédés sont fermés. Le refus initial
et sa reprise restent des résultats séparés ; la réussite finale ne retire pas
le surcoût mesuré ni la décision de rejet.

Les graphes attendus viennent d'un lecteur historique RAW indépendant via une réponse
native séparée. Les assertions contrôlent les véritables messages/URL fixe, les getters/Proxy
standalone, valeurs/clés/undefined/trous/alias/cycles, les Map/Set/Date explicitement,
H/G/F sous le contexte actuel, stale avant le schéma, refus tardif avec alias entrants
reçus dans les métadonnées, reprise à la même révision, anciens Worlds, repli après
interposition, restauration sans réarmement avant checkpoint, epoch et
objets Date non pris en charge par le mode propriétaire. Ces métadonnées de fixture ne sont pas des PawnTracks de gameplay.

Les 137 millions de comparaisons de l'oracle et ses copies ne décrivent ni le coût ni
la mémoire du jeu. V234 ne certifie ni budget général GPU, ni objectif de 240 FPS, ni campagne annuelle,
ni compatibilité du GAME complet, ni récupération GPU. Les empreintes des fichiers publics/sources
protègent les octets du catalogue ; aucun nouvel oracle gameplay complet sur les 62 sauvegardes
n'est revendiqué. Les preuves V233 demeurent les contrôles produit courants.

## Suite autorisée

Contrôle documentaire
`aulnes-v234-documentation-2026-10-06T08-10-42.855Z-26232`, **PASS, 0,846 s** :
liens locaux, six en-têtes au schéma 198 et trois sources originales inchangées.
Aucun build ou test moteur répété pour cette livraison uniquement documentaire.

Autonomie continue, refontes et commits locaux sans push selon l'autorisation
du 6 octobre. Le montage Core complet V231 était déjà hors du thread principal et régressait
de 13,36 % ; ce résultat n'est pas réécrit comme simple Nature. Prochaine expérience
V235 privée : distribution directe source→main/render sans retransmission du paquet depuis le thread principal,
lecteurs/journaux stricts locaux, acquittement principal `APPLIED` avant `setWorld`, vrais dessins
et vitesse source. Qualification de ce trajet avant portage GAME/inputs/étiquettes/audio.
