# Livraison des états confirmés : diagnostic du 31 octobre

La fluidité générale reste ouverte. Une seule continuation instrumentée est terminée ; aucune correction de jeu n’est installée par ce diagnostic. Les mesures suivantes attendent le signal humain de fin de partie League. Les lectures hors ligne et la préparation privée peuvent continuer.

## Tranche acquise

Le pilote prêt a démarré dès retour des marges, juste avant la réponse humaine choisissant d’attendre. Il a été terminé proprement : pause300ms, conservation entière et recharge exacte. Fenêtre4,053s à×6,620soumissions et664lignes d’horloge ; Noé en mouvement, Sacha au travail et Ada endormie sont présents dans toute cette fenêtre. Les53livraisons sont jointes de façon unique entre Worker et MAIN : aucun manque ou ambiguïté. Le module NativeLane d’observation est distingué du produit ; cette exécution instrumentée ne mesure pas le coût de production ni les FPS globaux.

Nouvelle autorité exclusive : RAW`c3263b27c871df9823cffdf5c8a63eee52c95686a2567a6b8099e14b8987257f`, gzip`1f14fd31e948c3fb30419491fe3d81969db5ea1669df23974aecc36baa34713a`, Core113418/RNG1875334416/nextId29626. Ne plus repartir de164588/Core113150 et ne pas rejouer le latch consommé. Les campagnes humaine94de et QA d474 sont distinctes et protégées.

## Ce que les données isolent

La première frontière progressante est postée à+49,6ms de l’intention de vitesse, arrive MAIN à+88,1ms et est adoptée à+95,8ms. Le vrai reply vitesse est joint par requestId9. Le libellé historique ackWaitResolved désigne seulement la fin du polling currentSpeed issu d’une Full, pas la résolution horodatée de la promesse client.

| Intervalle Worker | Fin de publication | Trou avant post | Attente FIFO ensuite |
|---|---|---:|---:|
|Core113230→113240|Full|314,1ms|0,2ms|
|Core113260→113270|Full|257,6ms|0,3ms|
|Core113187→113190|frontier|250,1ms|0,2ms|
|Core113159→113160|frontier|208,0ms|0,3ms|

Ces quatre trous finissent sur une frontière macro. Deux finissent sur une frontier légère : le coalescing des Full seul ne suffit donc pas. Le retard précède l’entrée dans postMessage ; calcul Engine, observateurs, encodage et désordonnancement ne sont pas encore séparés. Les stepMs cumulés sont des durées écoulées normalisées par10Core, pas des temps CPU purs.

Les11snapshots prennent533ms de run MAIN synchrone :408,2ms avant Timeline.adopt,0,9ms dans cette adoption et123,9ms après. Les39frontiers totalisent38,2ms, maximum3ms. La plus longue attente FIFO,59ms, concerne le reply vitesse derrière une Full de45,6ms et la frontière de frame suivante. Deux arrivées de frontiers,63,1/52,9ms après la fin du post, coïncident avec des runs Full MAIN de73,2/54,3ms.

La classification des données dessinées conserve165paires immobiles avec drapeau de locomotion actif, dont145après200ms. Les attentes initiales ne sont pas retirées. Ada conserve Y=0,5 sur620soumissions et aucun drapeau de marche. Ce cas défavorable n’est pas comparé causalement au précédent essai sous une autre charge League ; aucun PASS de fluidité globale n’est déclaré.

## Prochain périmètre

Après signal humain, isoler le temps Engine/observateurs/encodage autour des macros Worker, et décomposer la voie Full avant Timeline : adoption Native, préparation CoreFull imbriquée, puis admission des intentions. Ne pas relancer une matrice générale ni les24clock/54rigFX déjà acquis.

Une proposition privée, non installée et non exécutée, évite de rescanner stockpiles/home/roof lorsque leurs vrais tokens auxiliaires sont conservés. Elle utilise trois plages bornées et les buffers existants, avec fallback strict. La QA actuelle contient15pawns,128jobs,310cases de stockpile et4800cases home : ce n’est pas la sauvegarde humaine Les Éclaircies. Les gains et la fidélité de cette proposition restent à qualifier ; ils ne sont pas déduits des traces.

ProduitSRC2080/070e et schéma297 inchangés ; dernier code a8e02fd4, HEAD documentaire f14994b3 avant enregistrement de cette note. CloudflareV491 inchangée. Les anciennes archives privées ont été préservées sur E/tmp/relocated-private-chat-01a17357 avec jonctionsC et SHA ; elles ne sont jamais un cache supprimable. Les anciens rejeux Node/Vite demandent restauration ou qualification des chemins réels.

Preuves privées : delivery-frontier-observation-native-author-v1/native-delivery-frontier-v1/report.json ; delivery-frontier-correlation-offline-author-v1/result ; delivery-frontier-main-top20-offline-v1 ; delivery-frontier-current-visual-offline-root-v1 ; intent-aux-reuse-private-20261031/freeze.json.
