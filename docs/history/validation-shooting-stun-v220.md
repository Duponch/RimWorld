# Validation V220 — tir humain sous étourdissement

Lot de consolidation validé après `82b79777`, schéma198. [Contrat](../development/shooting-stun-v220.md), [référence primaire et adaptations](../research/shooting-stun-core-v220.md). **Régression par reprise572fichiers/2609réussites/un ignoré**, typage/build, catalogue59 et parcours natif ciblé passent dans les périmètres ci-dessous. Commit local puis arrêt demandé pour les tests de l'utilisateur ; relance automatique vérifiée PAUSED, aucun push.

## Reproduction avant modification

Le helper construit un camp de trois humains, un revolver réellement équipé et un attaquant adjacent avec ses vrais poings. La graine initiale est choisie avant toute commande ; aucun RNG réassigné après combat, stun fabriqué, blessure corrigée ou coup réessayé. Root a recherché des Worlds neufs dans une plage bornée1..128 par phase, puis les tests emploient deux graines fixes.

Commande `v220-real-producer-seeds-before` : réussie en1,661s sur le produit V219. Validation stricte avant et après chaque candidat. Graine12 : préparation30000→30018, vrai poing gauche touché à30011, stun30011→30056, préparation supprimée à30020. Graine26 : récupération30018→30114, vrai poing gauche touché à30081, stun30081→30126, échéance30114 inchangée à30090. Les victimes restent mobiles, manipulation1, arme conservée, cible distante mobile. Arrêt réel de l'attaquant après le premier coup, récupération de mêlée conservée.

L'ordre ID donne ici44 passages futurs suspendus, et non45 remboursés à l'impact. Les preuves privées et sorties originales sont conservées sous `tmp/stun-next` et dans le ledger du lanceur. Une première tentative d'initialisation du lanceur a échoué EPERM avant exécution ; la reprise locale autorisée réussit.

`v220-shooting-stun-before`, 6,518s : **deux échecs attendus avant mutation produit**. Aim : phase undefined au lieu d'aim. Cooldown : fin30114 au lieu30123 après les neuf premiers passages suspendus. Les assertions reposent sur les frontières du coup et du stun, indépendamment du futur helper d'horloge. Sources produit modifiées seulement après ce résultat rouge.

## Contrôles finaux

Les modifications produit sont gelées avant les contrôles. Le manifeste privé `tmp/stun-next/final-code-before.json` capture les14fichiers TypeScript modifiés ou ajoutés ; le contrôle de leurs hashes après la régression vérifie la stabilité des sources.

| Contrôle | Résultat et périmètre |
| --- | --- |
| `v220-runtime-cadences-final` | 14,515s,69réussis/deux échecs dans6fichiers. Les deux reproductions passent conservation, timing, sauvegarde et transport, puis l'oracle lit `launcherKey` sur le record au lieu de `flight.launcherKey`. Deux lectures de test corrigées, aucun produit changé. Les cinq fichiers historiques passent. |
| `v220-type-final` | Réussi,6,430s. |
| `v220-shooting-transport-final` | Réussi,12,345s,39cas/5fichiers :16nouveaux et frontières mécaniques/planète. Formes197/198, refus atomiques/retry, alias map/post, mandat et prisonnier, présentation discrète. |
| `v220-shooting-target-reprise` | Réussi,7,920s,9cas : deux vrais coups certifiés, revalidation répétée sans mutation, stop/démobilisation, interruptions cliniques préparées, cible décédée sous vrai stun puis annulation avant tir. Dernier cas ajouté après la cohorte précédente. |
| `v220-type-terminal` | Réussi,6,116s, après le dernier test clinique et l'oracle UI adapté. |
| `v220-native-shooting-final` | Échec54,412s après tirs1×/6×, vol/pose, soins et XPmédecine réels. L'ancienne assertion demandait le mot qualité dans le dossier, déplacé en infobulle par V199. Échec/trace archivés exactement sous `tmp/validation-artifacts/v220-native-historical-tooltip`. |
| `v220-native-shooting-reprise` | Réussi33,579s : action réelle focus du bouton i puis infobulle unique visible avec « Soignée · qualité ». Sources produit inchangées. Tirs, soins et reprises stricts, aucun nouveau pipeline pendant les tirs ; erreurs navigateur vides. |
| `v220-regression-final` | 591,426s,572fichiers :571réussis/un en échec ;2608réussites/un échec/un ignoré. Seul échec : comparaison historique des mondes190/193 contre198, normalisant le numéro mais pas le nouveau champ clock. |
| `v220-regression-historical-reprise` | Réussi5,359s,4cas/1fichier. Le test exige maintenant la clock courante exacte/watermark courant/pause0 et l'absence propre sous190/193, puis retire ce seul champ d'un clone pour comparer intégralement les autres champs. Cadences, captures, projectiles, impacts et PRNG restent vérifiés. Aucun produit modifié après le gel ou le contrôle global. |
| `v220-catalogue-final` | Réussi30,375s :59payloads,59hashes décodés conformes,59migrations strictes vers198,59roundtrips exacts et59continuations jumelles d'un tick. Aucun payload ou manifest historique réécrit ; ce n'est pas59parcours natifs. |
| `v220-build-final` | Réussi2,059s. Avertissement de taille de chunk>500ko déjà connu ; aucune correction de cette dette ou mesure de performance générale annoncée. |
| `v220-type-publication-final` | Réussi5,230s, après la seule correction de comparaison historique. |
| `v220-docs-final` | Réussi1,047s : liens locaux, six pages courantes au schéma198 et trois artefacts originaux inchangés. |

Par reprises ciblées : **103réussites uniques dans10fichiers**, dont **17nouveaux cas dans deux fichiers**. Les boucles internes des matrices ne sont pas comptées comme de nouveaux tests Vitest. Les deux RED initiaux ne sont pas effacés ni présentés comme des échecs produit restants.

Natif matériel préparé :1×771frames dont138avec vol visible/233en aim ;6×150frames dont17avec vol visible/38en aim. Maximum15draw calls dans cette petite scène, sans mesure générale CPU/GPU ni gain FPS. La capture Santé relue par root affiche les soins réels à41,9%. JSON et deux captures conservés avec manifestSHA sous `tmp/validation-artifacts/v220-native-final`. Ce parcours vérifie le tir ordinaire et son transport/rendu ; le vrai stun est joué par les producteurs de simulation, pas par un nouveau parcours natif de duel.

La régression complète n'est pas répétée après la seule correction de l'oracle historique : agrégat unique572fichiers/2609réussites/un ignoré par reprise. Les14hashes du gel sont restés exacts ; le quinzième fichier TypeScript modifié ensuite est ce seul oracle historique, sans modification produit. Les sorties originales restent dans le ledger, y compris les échecs attendus et les défauts d'oracle.

Avant le contrôle documentaire :14commandes achevées,777,945s cumulées, dont591,426s de régression globale et87,991s de parcours natifs. Ces durées d'enveloppe ne sont ni du CPU exclusif, ni une mesure tokens/seconde, ni la durée totale du lot ; les lectures, éditions et échanges peuvent se chevaucher. Le correctif reste un lot ciblé de consolidation, pas une nouvelle boucle de contenu.

Pas de nouveau payload public ou objet de contenu. Deux stuns chevauchants ne sont pas joués dans ces producteurs : le calcul compte un passage une seule fois, mais aucune preuve de fréquence/duel à deux attaquants n'est revendiquée. La durée45locale, le triID/Core, le type historique de cible numérique et les interruptions sans stun restent des adaptations distinctes. Campagnes longues, présentation générale et performance générale non rejouées/non établies ; le parcours natif est limité au tir/soins ordinaires de cette scène.
