# Stockage local des parties

V98 ajoute le [chargement de copies externes](test-colonies.md) depuis les colonies de test ou un fichier importé. Lecture/décompression et empreinte éventuelle précèdent le remplacement ; validation worker, exclusion et récupération sont communes aux sauvegardes locales. Aucun chargement externe n'écrit la sauvegarde manuelle. Les fichiers publics sont des références immuables : leur import dans une session ne les modifie pas.

V93 conserve les deux clés `lisiere.save.v1` et `lisiere.previous.v1`, le schéma de monde 91 et la validation complète du worker avant remplacement. Le stockage reste local au navigateur et à l’origine ; aucun serveur de sauvegarde n’est ajouté.

`save-storage-codec.ts` laisse les petites chaînes inchangées et compresse les JSON de plus de 1 Mio avec `CompressionStream('gzip')`, puis Base64. L’enveloppe JSON identifiée `lisiere-save`, version 1, contient le codec, les tailles, la charge et les métadonnées nécessaires à la liste des parties. Cette version d’enveloppe est distincte de celle du monde. Les anciens JSON se chargent directement ; les données décompressées sont exactement celles produites par la simulation, sans arrondi, réécriture ni migration implicite.

La décompression vérifie champs, version, codec, Base64, tailles et métadonnées avant de transmettre le JSON au worker. La sortie est bornée à 32 Mio et la charge compressée à 16 Mio ; dépasser une borne ou rencontrer une corruption produit un refus. Les métadonnées de liste ne constituent jamais une validation de partie.

`GameSession` garde une seule opération en cours. Compression et écriture du créneau de récupération précèdent le remplacement d’un monde actif. Si la simulation refuse, l’ancien créneau de récupération est restauré ; si la préparation graphique échoue après acceptation, le nouveau monde accepté et sa récupération sont conservés. Charger le créneau de récupération lit d’abord ses données, avant de le remplacer par la colonie active. Une erreur de quota ne supprime jamais l’autre créneau pour faire de la place.

Cette correction vient d’un parcours réel : l’instantané 250×250 au tick 291 occupait 5 518 819 octets et dépassait le quota local. Il devient une enveloppe de 506 817 caractères (379 936 octets gzip) ; deux créneaux identiques occupent 1 013 634 caractères. L’identité des données est vérifiée après décompression. Ces chiffres concernent ce checkpoint, pas une garantie de taille pour toute colonie future. Un navigateur ou un ancien build sans prise en charge du codec ne peut pas lire les nouvelles enveloppes ; les anciens JSON restent lisibles par V93.

Références techniques : [Compression Streams API](https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API), [quotas de stockage](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria). Voir les [preuves V93](../history/validation-interface-v93.md).
