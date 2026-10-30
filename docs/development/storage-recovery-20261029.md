# Stockage préventif — nettoyage du 29 octobre 2026

Suivi rédigé le 30 octobre. Le manque d’espace avait atteint **0 octet libre sur E:**. Ce nettoyage ciblé a porté sur des copies anciennes dont la conservation était prouvée. Il ne modifie pas le jeu, les sauvegardes ou le déploiement.

## Résultat observé

Les reçus enregistrent séparément les tailles logiques retirées et l’espace réellement disponible :

| Lot, le 29 octobre (UTC) | Fichiers retirés | Octets logiques retirés | Libre sur E après le lot |
| --- | ---: | ---: | ---: |
| 21:11:55 — anciens duplicats de ressources | 1 313 | 5 001 755 170 | 930 848 768 |
| 21:21:44 — archives Git reproductibles | 26 | 1 226 784 379 | 1 385 095 168 |
| 21:25:39 — archives Git reproductibles supplémentaires | 9 | 1 447 611 065 | 2 832 723 968 |

Ainsi, **2 832 723 968 octets libres ont été observés après un départ à zéro**, soit environ **2,83 Go** décimaux. Les 35 archives totalisent 2 674 395 444 octets logiques (2,674 Go) ; les tailles logiques des trois lots ne sont pas un calcul de place physique récupérée. La cause de leur écart avec le libre observé n’est pas établie : ni liens physiques ni compression ne sont présentés comme explication acquise.

Une vérification ultérieure de Root indique environ **2,26 Go sur C et 2,82 Go sur E**. Ces valeurs sont ponctuelles, peuvent évoluer avec les applications et ne remplacent pas le prochain contrôle. Un relevé intermédiaire insuffisant de C a été conservé dans le checkpoint ; il ne faut pas reprendre un ancien PASS comme garantie permanente.

## Conservation et restauration

Les 1 313 copies de ressources retirées datent du 21 septembre au 17 octobre. Les 20 originaux distincts restent dans `public/assets`, avec leurs blobs Git au commit 97a9f34c91da9482f1d687f057ebfa2d024c27ed. Les SHA256 ont été comparés avant retrait puis revérifiés sur les originaux après retrait.

Les 35 archives sources ont plus de sept jours au moment de la sélection. Pour chacune, un flux de régénération intégral par `git archive` a donné exactement la taille et le SHA256 de l’archive ancienne ; les commits sont des ancêtres conservés de main. Une archive non reproductible a été préservée. Les refus restent des refus, jamais des autorisations de suppression.

Les **anciens clichés de contrôle sont désormais allégés** de ces copies. Avant de rejouer l’un d’eux :

- Rétablir seulement ses ressources manquantes depuis l’original si son SHA correspond, sinon depuis le blob Git consigné. Ne pas écraser un fichier existant.
- Pour une archive, employer le format, commit et chemins exacts du reçu avec `git archive --format=zip` ou `--format=tar` et `--output`. Ne pas envoyer un flux binaire dans une redirection de texte PowerShell.
- Vérifier taille et SHA256 avant utilisation. Conserver le refus si la reconstruction n’est pas exacte.

Aucun fichier récent, rapport/capture unique, RAW/export réel, sauvegarde, référence personnelle, campagne ou serveur humain n’était une cible. La campagne humaine 94de/T3328 et la mission QA d474 restent inchangées. L’inventaire des fixtures n’avait trouvé aucun doublon admissible d’au moins 1 Mo dans sa portée et n’a rien supprimé.

## Garde avant les travaux volumineux

Le script [check-storage.mjs](../../scripts/check-storage.mjs) est enregistré dans le projet avec ce suivi. Il lit seulement les statistiques des volumes, sans importer le jeu ni supprimer de fichier.

Depuis la racine du projet :

```text
node scripts/check-storage.mjs
```

L’appeler **à chaque reprise** et **avant puis après chaque lot volumineux** : compilation, assemblage, paquet, profil ou autre sortie importante. Le seuil est **2 Gio = 2 147 483 648 octets disponibles pour chacun des deux rôles** :

- projet : volume du répertoire courant, ici E ;
- scratch : volume du profil utilisateur, ici C où se trouvent les sorties privées.

Le résultat JSON expose les deux volumes, leur libre et leur verdict. Code de sortie 0 : seuil atteint ; code 2 : seuil insuffisant. Une erreur de lecture ou un échec ne vaut pas PASS. Dans ce cas, suspendre les nouveaux contrôles lourds et traiter seulement les données anciennes recréables ou redondantes dont la conservation est prouvée, avec les récents et uniques protégés. Le script ne déclenche aucun nettoyage automatique.

Le seuil prévient une reprise sans marge ; il ne réserve pas cet espace et ne garantit pas qu’un lot d’une taille quelconque tiendra. Les grosses sorties restent sur C ; ne pas créer de nouvelle copie générale du graphe ou de nettoyage global de tmp par défaut.

## 30 octobre — garde appliqué et anciens caches SSR

Le garde a effectivement **bloqué le contrôle CPU avant son lancement** : environ 1,375 Go libres sur C, sous le minimum de 2 Gio. Root a ensuite retiré seulement des sorties de compilation SSR anciennes et recréables, dans `Cvisualizations/v492-compiler-cache` : **40 répertoires du 27 octobre**, code généré et empreintes vérifiés, soit **54 883 fichiers / 1 302 495 672 octets logiques** au total.

Le premier plan PowerShell, trop lent, a été arrêté avant tout retrait. Le plan rapide suivant a été conservé ; son premier retrait a été interrompu, puis repris sur le même inventaire : **13 400 fichiers déjà absents après l’interruption +41 483 fichiers retirés à la reprise**, soit les 54 883 prévus. Le reçu final donne `complete:true`. Aucun RAW, source, rapport, métadonnée, serveur, cache récent ou build public n’a été ciblé.

Le plan relevait **1 071 890 432 octets libres sur C** ; le reçu après reprise en observait **3 010 838 528**. Ces bornes ne permettent pas d’attribuer leur différence exacte au cache : allocation et variations extérieures restent inexpliquées. Un contrôle ultérieur du garde a réellement passé avec **C : 3 010 678 784 / E : 2 829 398 016 octets libres**, autorisant alors le contrôle CPU. Ce sont des relevés ponctuels, pas une réserve garantie. Les 2,83 Go observés sur E lors du nettoyage du 29 octobre restent un résultat distinct, sans nouveau gain E attribué à cette reprise.

Preuves privées : `action-fluency-20261030/ssr-recovery-fast-v2/`, sous la même racine Cvisualizations que le dossier des preuves ci-dessous. `plan.json`, `plan.jsonl`, `removed.jsonl`, `resumed-removed.jsonl` et `resumed-result.json` conservent sélection, empreintes et retraits/reprise. Aucun `result.json` de la première tentative interrompue n’était présent à la lecture ; il n’est pas compté comme reçu de réussite. Les anciens caches pourront être régénérés lors d’un rejeu ; leurs sources et résultats de contrôle sont conservés. Le garde de 2 Gio demeure requis à chaque reprise et avant/après les lots volumineux.

## Preuves conservées et portée

Dossier des preuves :

```text
C:/Users/ebsaf/.codex/visualizations/2026/10/25/01a17357-d7a6-7ee3-9e93-2d2419b318db/storage-recovery-20261029/
```

`RECOVERY.md` décrit la restauration. `duplicate-assets-plan.json` et `removal.jsonl` donnent les chemins réellement retirés, originaux et blobs. Les deux plans `reproducible-archives*`, les journaux `archive-removal*` et les trois `*result.json` conservent recettes, tailles, empreintes et libre observé. Les inventaires seuls ne sont jamais comptés comme des suppressions. Le premier refus de lecture des dates PowerShell, avant toute suppression, reste conservé.

Ce lot est distinct de [l’entretien du 26 octobre](storage-maintenance-20261026.md) : aucun de ses volumes n’est recompté ici. Le produit reste au schéma 297 et la dernière publication Cloudflare attestée reste V491. Le bilan 24 h demandé a été livré ; les questions de fluidité à ×1 et la dette de débit ×6 restent ouvertes. Ce suivi de stockage n’établit aucun gain de performances, aucun achèvement du chantier privé 298 ni des six ensembles.
