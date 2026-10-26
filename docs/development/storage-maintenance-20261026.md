# Entretien des données temporaires — 26 octobre 2026

La demande humaine porte sur plusieurs Go de données anciennes obsolètes, sans casser le projet ni supprimer de données récentes. **2 821 099 734 octets d’anciens fichiers ont été retirés**, soit environ **2,82 Go**. Le dernier relevé observe **2 857 836 544 octets disponibles sur E:** ; l’espace global peut aussi évoluer avec les applications ouvertes.

## Suppressions vérifiées

| Famille | Contenu retiré | Preuve de préservation |
| --- | ---: | --- |
| Caches anciens fermés | 285 fichiers, 19 racines, 48 602 787 octets | Chemins exacts, tous antérieurs au 24 octobre à 00:00 UTC, inventaire SHA et contrôle frais des processus ; stockage des profils et fichiers récents exclus. |
| Archives Git redondantes | Trois ZIP, 176 720 361 octets | Chacun régénéré **à l’octet** par `git archive` depuis un commit encore ancêtre de HEAD ; SHA256 du conteneur identique avant retrait. |
| Archives supplémentaires de journaux | Deux ZST, 2 595 776 586 octets | Décompression intégrale : longueurs et SHA256 identiques aux JSONL originaux restés sur leurs chemins. Empreintes des originaux revérifiées après suppression des seules archives. |

Reçus : [caches](../../tmp/ui-native-v485/disk-cleanup-plan/old-exact-cache-removal.json), [ZIP et commits](../../tmp/ui-native-v485/disk-cleanup-plan/old-git-archives-removed.json), [archives supplémentaires et originaux conservés](../../tmp/ui-native-v485/disk-cleanup-plan/verified-additional-zstd-backups-removed.json).

Les ZIP supprimés sont `perf-809792c.zip`, `perf-v115.zip` et `perf-v114.zip` ; leurs commits complets et empreintes figurent dans le reçu. Aucune référence courante de documentation, test ou script à ces trois chemins n’a été trouvée. L’archive de trace unique V79 a été conservée.

Les deux ZST sont des copies anciennes datant de septembre, créées dans le répertoire d’archives le 17 octobre. Les originaux contiennent respectivement **2 508 462 845** et **1 620 872 308 octets**, tous contrôlés ; aucun contenu de conversation n’a été interprété ou affiché. L’index de chemins de l’application a été consulté en lecture seule et ne référence aucune des deux archives retirées. Une archive unique de 4,268 Go, sans original équivalent trouvé, est conservée.

## Limites et opérations distinctes

L’inventaire a évité les jonctions, notamment `tmp/publication-v482/source/tmp`. Les gros volumes logiques des copies V331 comprennent des liens physiques partagés : ils n’ont pas été annoncés comme espace récupérable. Les copies sources, variantes uniques, manifestes, échecs, RAW de jeu et sauvegardes restent en place. L’audit des copies Git de `milestone-validation` a été préparé mais n’a pas justifié une suppression supplémentaire.

Le disque plein a d’abord empêché la compression de mon cache de compilation. Le contrôle automatique a refusé sa suppression après l’annonce d’une compression sans suppression ; rien n’a été effacé par cette tentative. L’utilisateur a ensuite autorisé explicitement le **seul** nonce `ephemeral-tests-20261026-1400` : 3 761 fichiers compilés recréables, 87 070 746 octets, retirés après vérification de fermeture, chemins, absence de réanalyse et inventaire SHA. [Reçu distinct](../../tmp/ui-native-v485/closed-owned-1400-removal.json.gz). Ce volume récent ne figure pas dans les 2,82 Go de données anciennes.

Deux autres caches de tests récents avaient reçu une compression NTFS transparente, avec fichiers, dates et empreintes intégralement conservés. Cette opération n’est pas comptée comme une suppression. Les premières erreurs du pilote d’audit ZST sont conservées : les jonctions exclues de l’index C ont été distinguées des chemins E contrôlés ; le décodeur natif rejette les frames supplémentaires non consommées. Les deux archives qualifiées ont ensuite passé les contrôles de flux complet, longueur, checksum et empreinte, sans fichier décompressé intermédiaire.

Cet entretien ne modifie ni le code du jeu, ni sa sauvegarde, ni son déploiement, et ne constitue pas une mesure de performances du jeu.
