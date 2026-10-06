# Validation V241 — mobilier résident

6 octobre 2026. ROOT seul, contrôles séquentiels via `validate:logged`, caches sous E:, sorties privées distinctes. [Contrat et décision](../development/furniture-resident-v241.md). Aucun push ; les 62 sauvegardes et leurs 65 fichiers publics sont protégés par empreintes avant/après.

## Prototype et oracles

Sept gels privés sous `tmp/performance-orientation-v241` : root `B583538D`, résident `9C019934`, mapper `BFD2A2E7`, oracles `DFD6EA5E`, coût `0A385F82`, GAME `1EF8B4BD`, contrôleur `5D04D70C`. Cinq IDs canoniques sont substitués dans le même registre ; inverses RAW entiers, sans substitution Nature, journal, transport ou observateur. L'augmentation TypeScript réservée au prototype est supprimée lors de la promotion ; l'import canonique supplémentaire devient relatif. Ces changements de raccord sont déclarés dans `production-staged-next/PROVENANCE.json`.

Typage privé : PASS 4,111 s. Oracles : trois fichiers/seize cas, PASS 13,080 s. Placements globaux, ordre, seuils, décès, cumul, collisions de texte, getters/Proxy/throws et replis passent. Les vrais BoxBatches comparent toutes les capacités Float32 par mots Uint32, couleurs, versions, bornes et groupes. Plusieurs pots partagent une seule publication ; refus d'une seconde plage avant toute écriture, changement de capacité, cache révoqué, compilation des ombres et restauration sont exercés. Ces états préparés ne sont pas une campagne jouée ni une mesure d'upload GPU physique.

Coût préparé : PASS 21,483 s, huit chauffes puis 56 mesures par passage A/B/B/A. Aulnes : moyenne A 9,941 contre B 2,414 ms, −75,72 % sur cette frontière mobilier, avec sorties exactes. Les modifications de fleurs sont préparées hors chronométrage ; ce n'est pas le coût global du jeu. Les froids varient fortement avec l'ordre/JIT. **Le libellé mixed « full/reset counterpart » de ce rapport est erroné : cette carte contient aussi des pots et emprunte la branche florale.** Le rapport exécuté reste intact ; aucune preuve de repli complet n'en est tirée.

Une contrepartie distincte est donc gelée sous `furniture-full-counterpart-next`, manifeste `E241ECE8`. Typage PASS 3,339 s ; contrôle PASS 67,731 s. Chaque carte conserve ses pots et change une orientation non florale avant chaque mesure : signature différente et reçu floral absent. Dix-sept états appariés puis deux cycles ABBA de 24 remontages mesurés par passage vérifient les buffers, versions et sphères exacts. Aulnes : −12,34 puis −1,66 % ; mixed : +0,49 puis +9,43 %, soit +0,02 puis +0,31 ms moyens. Froids et p95 mixtes restent variables/défavorables ; aucun bénéfice froid universel annoncé. Rapport privé SHA256 `7E9FB5E9`.

## Vrai jeu matériel

`aulnes-v241-furniture-game-abba-2026-10-06T18-23-04.163Z-9740` : PASS 146,615 s. Rapport `furniture-game-next/captures/abba-2026-10-06T18-23-04.588Z-Wvwpid/abba-report.json`, SHA256 `AC759BCF`. A/B/B/A isolés, A littéral V233, B cinq corps candidats ; mêmes wrappers grossiers, vraie UI/audio/musique et réglages. Chromium/WebGPU matériel AMD, 1920×1080/DPR1, caméra129/122/zoom1, source Les Aulnes6934, chauffe3 s/fenêtre8 s à6× demandé. Aucun timer fin Nature, worker de rendu ou allègement de qualité.

| Mesure | A | B |
| --- | ---: | ---: |
| RAF/s moyens | 104,9375 | 104,625 |
| Vitesse source réelle | 4,4267× | 4,7458× |
| CPU frame moyen | 5,793 ms | 5,687 ms |
| p95 frame moyen des cohortes | 19,45 ms | 19,15 ms |
| Maximum frame moyen des cohortes | 39,95 ms | 31,35 ms |
| applyWorld p95 moyen | 20,70 ms | 19,00 ms |

Ces fenêtres contiennent des doses différentes : A mesure trois remontages dans chaque cohorte, B deux ; la transition tick7000 précède le début des fenêtres B. Les événements **communs** tick7095 et7190 montrent toutefois la baisse ciblée : reconstruction A 12,7–14,7 ms et frames30–36,3 contre B 2,5–3,4 ms et frames17,7–21,7. Ne pas attribuer tout le changement des maxima globaux au seul candidat. Aucun gain FPS moyen stable ni vrai6× n'est établi ; ne pas comparer ce protocole à l'ABBA nocturne d'une autre caméra.

Chaque cohorte passe la sauvegarde/reprise réelle et les anciennes vues hors mesure. Erreurs vides, sources et fichiers publics exacts ; navigateurs/contexte et serveurs possédés5235/5236 fermés entre cohortes. Le graphe GPU final est établi par les oracles CPU ; cet ABBA ne certifie pas une perte physique du périphérique ou un écran240Hz.

## Promotion

Typage produit : PASS 9,884 s. Frontières produit : dix-sept fichiers, 79 réussites/un ignoré, PASS 62,314 s. Build : PASS 3,674 s. Référence de signature V233 indépendante dans les tests, corps complet mobilier historique conservé.

Natif produit `aulnes-v241-product-native-recovery-2026-10-06T18-43-14.235Z-24908` : PASS 87,559 s. Sortie privée fraîche `production-captures/native-2026-10-06T18-43-14.978Z-cWq4I9`. Charger le catalogue public, inspecter sièges/moniteurs, jouer1×/6×, sauvegarder/recharger exactement, changer de caméra et taille, détruire le vrai périphérique de ce canvas, reconstruire une seule vue, puis reprendre passe sur WebGPU matériel. Le serveur possédé5237 est fermé ; sources/publics exacts, erreurs inattendues vides. Les captures V230 restent intactes.

Présentation produit `aulnes-v241-product-presentation-2026-10-06T18-45-33.355Z-25352` : PASS 127,612 s. Mine et coupe avec changements de vitesse1×/6×/3× et collisions contrôlées ; sorties `tmp/test-runs` distinctes fournies par le logger, sessions utilisateur intactes. Ce parcours utilise une autre colonie : il vérifie la présentation, sans prouver les FPS des Aulnes.
