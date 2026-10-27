# Publication du calcul de peinture — V490

Le 27 octobre 2026, la production Cloudflare Pages `9ea67eb8-81c3-4826-8680-acdddb01f9ac` publie le commit produit `44937af7c86a84a9fd2a3b1fd505f080144ba564`, branche `main`, schéma 296. Projet Pages réel : `elsewhere` ; domaine public [elsewhere-cq7.pages.dev](https://elsewhere-cq7.pages.dev/) et [déploiement immuable](https://9ea67eb8.elsewhere-cq7.pages.dev/). Cette publication livre le [lot qualifié](terrain-paint-cost-v490.md) ; elle n'ajoute aucune preuve de performance.

## Construction isolée et contenu

Les deux scripts V489 sont réutilisés avec un seul remplacement du commit chacun, inverse exact : [reçu de préparation](../../tmp/publication-v490/scripts-preparation.json), SHA `f3255b665ce5412dac8c7eae2155753becdfc88d2a0da2e1d44f190dbd2819e2`. Extraction Git dans une nouvelle copie, seule jonction `node_modules`, aucune jonction `tmp`. Les 5100 fichiers, dont 2051 sources et 5099 blobs Git distincts, sont vérifiés par SHA Git et SHA256. Manifestes avant/après exactement identiques : SHA `13afde3a8dcd746ccaa98f5a3b29fc530f457d27cd6e54bb3c04356f5427139b`.

Le ledger exact `tmp/validation-runs/ledger.jsonl`, limité aux labels V490 de publication, atteste : archive 2,865 s ; entrées avant 5,161 s ; typage 20,230 s ; build Pages 9,536 s ; entrées après 5,256 s ; paquet 2,425 s. Ces durées décrivent la validation, pas le débit du jeu.

Le [paquet](../../tmp/publication-v490/package-2026-10-27T07-30-41.060Z-22564/report.json), SHA `ae9d85b7ea35f7c48e31705ae856b2ce9d42ff4688f0e3facecd2caa31fc55cd`, contient 570 fichiers /154417994 octets, dont 565 publics. Les 71 chemins de sauvegardes/catalogue et 68 entrées restent byte-exacts à b969 ; le seul delta statique historique autorisé reste les 18 curseurs V485, sans modification ni retrait. Seulement HTML et quatre sorties compilées en supplément ; aucune instrumentation privée distribuée. Nouveau JS `index-D_8FAGEk.js` (SHA `141130ba64b081ebf1977ea298fda413236f5a9b2185bc237f3d93fa9573a8d1`), CSS `index-27jBaN5b.css` et Workers `DbCZKzUb`/`Cu6Slz1E` conservés.

## Échec conservé et publication effective

Le premier essai `v490-cloudflare-production`, 3,868 s, échoue avant envoi : le projet demandé `elsewhere-cq7` n'existe pas. Ce refus n'est pas masqué ni assimilé au déploiement réussi. Les reçus précédents identifient le vrai projet `elsewhere`. La reprise `v490-cloudflare-production-retry` réussit en 12,949 s : deux fichiers envoyés, 566 réutilisés, puis `_headers`/`_redirects`. L'avertissement de dépôt non propre reste dans le journal ; la copie Git isolée et ses deux manifestes exacts constituent l'autorité des octets publiés.

Le [reçu des déploiements](../../tmp/publication-v490/deployments-after.json), SHA `2f7e86b34fe17e7df3c6b52c527aecd108991cd6d79526feb3901a6035e61f87`, confirme Production/main/source44937af et l'ID entier ci-dessus. Le [contrôle HTTPS](../../tmp/publication-v490/http-2026-10-27T07-32-14.882Z-15292/report.json), SHA `3322997926041ba8380b7954b0f56cb918466fded36fc495574a54bede7bf109`, réussit en 5,145 s : vingt réponses200 aux octets et MIME attendus sur les deux origines, dont HTML, CSS, JS, deux Workers, catalogue, sauvegarde et curseur PNG.

## Limites

Ces contrôles établissent les octets livrés et leur disponibilité. Ils ne constituent ni nouveau parcours navigateur, ni gain TPS/FPS/GPU, ni absence de régression globale. Les résultats et incertitudes de la qualification V490, notamment la variance des fenêtres ×6, restent distincts de la publication. La campagne réelle T3328 n'est pas rejouée par ce lot. Les six ensembles, SYS069 et le confort global ne sont pas déclarés clos.
