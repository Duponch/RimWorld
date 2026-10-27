# Publication de la réactivité visuelle V491

Le 27 octobre 2026, Cloudflare Pages publie le commit produit 435f04a262e6f19d22f75a6b8e4fc917bee2d0d5, branche main, schéma 296. Production : 7c8f5074-6b8f-40e2-9db4-047be7cc4240, projet elsewhere. [Site public](https://elsewhere-cq7.pages.dev/) et [déploiement immuable](https://7c8f5074.elsewhere-cq7.pages.dev/). Le lot corrige la présentation des chemins confirmés et de la pause ; sa [qualification et ses limites](action-latency-v486.md#réactivité-visuelle-des-ordres-et-de-la-pause--v491) restent distinctes de cette publication.

## Construction du commit exact

Le [reçu de préparation](../../tmp/publication-v491/scripts-preparation.json) atteste l'insertion du seul commit final dans trois scripts privés relus. L'archive Git contient 5102 fichiers, dont 2051 sources et 5101 blobs distincts, vérifiés par identifiant Git et SHA256. La seule jonction est node_modules. Les [manifestes avant](../../tmp/publication-v491/inputs-before.json) et [après](../../tmp/publication-v491/inputs-after.json) sont exactement égaux. Les trois feuilles statiques 297 privées non référencées, les références humaines et les fichiers tmp ne sont pas intégrés.

Les validations finales du ledger passent : extraction 3,967 s ; contrôle avant 4,694 s ; typage 23,606 s ; build Pages 9,316 s ; contrôle après 4,961 s ; paquet 2,456 s. Ces temps sont ceux des outils de validation, pas un débit du jeu. Les 116 cas ciblés distincts et les trois anciens rouges reproduits restent décrits dans la note de qualification ; aucune suite globale entièrement verte n'est inventée.

Le [paquet vérifié](../../tmp/publication-v491/package-2026-10-27T10-51-16.153Z-11888/report.json) contient 570 fichiers et 154418716 octets. Les 565 fichiers publics, dont 71 chemins de sauvegardes/catalogue et 68 entrées, sont intégralement identiques à la V490 : aucun ajout, retrait ou changement. Les deux Workers compilés DbCZKzUb/Cu6Slz1E et la feuille CSS 27jBaN5b sont byte-exacts. Seuls l'AppJS CedMh3A4 et son lien HTML changent. Aucun code de diagnostic privé n'est livré.

## Production et réponses HTTPS

Le déploiement réussit en 20,458 s : deux fichiers envoyés, 566 réutilisés, puis les fichiers de règles. L'avertissement de dépôt non propre reste conservé ; les octets de l'archive Git isolée et les manifestes exacts établissent le contenu livré. Le [reçu Cloudflare](../../tmp/publication-v491/deployments-after.json) confirme Production/main/source435f04a et l'identifiant complet ci-dessus.

Le [contrôle HTTPS](../../tmp/publication-v491/http-2026-10-27T10-52-12.768Z-6988/report.json) passe en 5,596 s : vingt réponses 200 aux octets et types attendus sur les deux origines, couvrant HTML, CSS, AppJS, deux Workers, catalogue, sauvegarde et curseur PNG. Ce contrôle ne remplace pas un parcours navigateur ni une mesure FPS/GPU/TPS supplémentaire.

La campagne réelle 94de/T3328 reste intacte et distincte des QA. Les six ensembles, SYS069, la victoire, la latence résiduelle sous charge et le confort global restent ouverts. La priorité humaine suivante est le bilan de la nuit et la comparaison du changement de destination avec RimWorld, avant la reprise autonome de l'avancement.
