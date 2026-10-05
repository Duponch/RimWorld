# V214 — Proches, couples et logement : validation

**Livré dans le périmètre contrôlé sur V213 `5d235ce6`, schéma 195 après validation stricte 194 puis migration du numéro seul.** [Contrat](../development/family-v214.md), [référence primaire](../research/family-core-v214.md). Sources et tests gelés avant les contrôles parent ; aucune exécution lourde concurrente.

## Résultat final

| Contrôle | Résultat vérifié | Durée parent enregistrée |
| --- | --- | --- |
| Sonde réelle | Offre future au tick 10, entrée de Basile ID127, lien annoncé avec ID70, deux lits attribués aux partenaires ID68/72, disparition de la pensée de logement, checkpoint/delta et reprise exacte. | 1,191 s à la reprise |
| Régression hors campagnes longues | **537 fichiers, 2 442 réussis, un ignoré**, sur sources/tests finaux. Les cinq fichiers V214 ajoutent **31 cas composés**. | 391,662 s |
| Build/typage | `npm run build` réussit après la régression. | 7,845 s |
| Navigateur composé | **1/1 au premier lancement** : lettre au clavier, vraie admission, relations/opinions dirigées, attribution des deux lits, Bio/Besoins/Social, deux caméras, commandes cliquables à1280×768, sauvegarde et chargement exacts. WebGPU AMD/rdna-1, fallback=false, aucun incident/erreur. | 39,140 s (cas18,4 s) |
| Catalogue | **57/57** hashes décodés, validations et sauvegardes/reprises ; **56** fiches et payloads historiques identiques à V213. | 23,350 s |

Le contrôle natif est conservé dans `tmp/validation-artifacts/v214-native/` (proof JSON et deux captures inspectées). La 57e scène est préparée au tick0, avec couple issu de la vraie création et occasion d’accueil future ; aucune offre, admission, attribution de lit, romance, rupture, blessure ou mort jouée initialement. SHA256 du nouveau payload : `332c2455eae00247585688e7bb6a261e0d0a8e1bd53cc771b89299f010ef2b60`. Préparation et contrôles restent distingués.

## Défauts corrigés et reprises

La première sonde et le premier typage ont révélé un helper écrit par deux propriétaires : exports manquants. Le helper a été fusionné et son propriétaire unique fixé, puis la sonde a passé. Le ciblé initial a70 réussites/73 : deux fixtures avançaient l’horloge sans la pluie, et une donnée adverse d’âge17 demandait une sauvegarde malgré l’exclusion des enfants. Les producteurs avancent désormais le vrai tick ; les données adverses sont comparées par JSON sans affaiblir les validateurs. La reprise a23 réussites/24 ; la dernière donnée adverse retirait une personne sans son namespace de souvenirs. Corrigée de la même manière avant la suite générale finale, entièrement verte.

La relecture a trouvé **un vrai défaut de couture** : un validateur d’annonce recapturait un voyageur déjà exposé par `scoutRegistryView` et voyait un faux doublon. Les formes sont vérifiées dans la projection et les références une seule fois sur le World original complet. Le test passe avec offre apparentée, partenaire et mémoires chez un original scout hors carte, checkpoint/delta et reprise. Les vrais doublons restent refusés.

La validation refuse âge absent dans une annonce liée, propriétaire non humain/inconnu, nom d’archive invalide, horloge future, ascendance cyclique, trop de parents, ordre canonique invalide, partenaires vivants contradictoires et deuil fondé sur un lien enregistré après la mort. Une prévalidation linéaire refuse les grandes fratries à trop de parents avant expansion de l’index. Le dernier World confirmé et sa révision survivent aux corruptions de snapshot/delta. Aucun propriétaire, souvenir ou tirage rétroactif sous194.

## Limites et coût

Les tests exercent les vrais producteurs de romance/refus/rupture et décès cliniques, les opinions, leurs durées distinctes, les incapacités Social et l’absence d’XP romantique, le cumul famille+ami/rival, les lits/pièces et la perte d’un corps. Le navigateur exerce accueil et logement ; il ne démontre pas une romance ou un décès naturels. Les adaptations de génération, âge/sexe/orientation, fratrie et monogamie sont dans la référence ; aucune fréquence Core exhaustive annoncée.

Pas de campagne longue, mesure générale CPU/GPU ou nouveau benchmark dans ce lot. Aucun nouveau maillage/shader du renderer ; le parcours matériel vérifie les deux vues, sans nouveau contrôle de présentation complet. Mariage joué, lit double, relations sexuelles, enfants/naissances, famille étendue et sentiments hors carte restent ouverts.

La suite générale suit58% de temps dans les cas,39% dans les imports et3% dans les transformations :1 384 modules évalués3 647fois,273,96s cumulées d’imports. Ces temps cumulés de workers diffèrent de la durée murale ; aucune vitesse du modèle en tokens/seconde mesurée. Le ciblé reste groupé, et les reprises portent sur des échecs concrets. L’intervalle entre commits et la somme des commandes seront ajoutés au suivi autonome ; ils ne sont pas une attribution exclusive du temps de développement.

Contrôle documentaire : 730 documents et 7 230 liens vérifiés. 71 fichiers UTF-8 contrôlés sans remplacement ni mojibake, diff propre, archive des instructions V1–V144 identique. Avant commit : 11 commandes parent et 498,422 s enregistrées, hors dernier relevé documentaire ; logs complets sous `tmp/validation-runs/`.
