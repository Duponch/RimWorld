# Publication des correctifs UI et de réactivité — V488

**Publication acquise le27octobre2026 à02:53UTC : `1fa8b7c5`, schéma296, source `1b6a44a0`.** [Adresse stable](https://elsewhere-cq7.pages.dev/) et [déploiement immuable](https://1fa8b7c5.elsewhere-cq7.pages.dev/). Cloudflare confirme Production, branchemain et source1b6a44a. Cette publication poursuit la demande humaine de publier les commits qualifiés puis de reprendre les six ensembles en autonomie.

Elle remplace V482/b969b256 et inclut les lots enregistrés depuis : [porte sur mur fini V483](../gameplay/door-over-wall-v483.md), corrections de l'interface native, curseurs carton V485, fermeture des options, sélection du colon conservée et [réactivité V486–V488](action-latency-v486.md#commandes-au-point-sûr--v488). Les prototypes de performance rejetés, outils privés, références humaines et sauvegardes de campagne temporaires ne sont pas publiés. La campagne autoritative T2010/d234 n'est ni chargée ni jouée pendant cette opération.

Une copie séparée est extraite du commit exact `1b6a44a0c3b3cd95cc03576be9ca77387fc5f539` :5097fichiers, dont2051sources produit. Chaque fichier est vérifié contre les octets de son blob Git, par SHA1 Git et SHA256 ; les5097contenus sont identiques avant et après build. La seule jonction est celle des dépendances ; aucune jonction temporaire récursive n'est créée. Typage de la copie14,676s, contrôle des entrées3,990s, build Pages7,843s, puis contrôle des entrées4,327s passent.

Le [paquet vérifié](../../tmp/publication-v488/package-2026-10-27T02-52-28.110Z-22112/report.json) passe2,338s :570fichiers,154 417 569octets,565ressources publiques,68entrées au catalogue et71chemins publics de sauvegardes/catalogue. Tous les anciens contenus statiques b969 restent exacts ; les seuls ajouts statiques sont18PNG de curseurs, neuf formes en deux résolutions. Tous les contenus publics correspondent à ceux du commit et les seuls autres fichiers sont l'HTML et quatre sorties compilées :

| Sortie | Nom publié |
|---|---|
| Application | `index-nXSgKq2P.js` |
| Styles | `index-27jBaN5b.css` |
| Simulation | `simulation.worker-DbCZKzUb.js` |
| Présentation | `presentation.worker-Cu6Slz1E.js` |

La publication Wrangler4.149.0 passe14,089s :23fichiers envoyés,545réemployés, puis règles headers/redirects. Le commit exact est fourni à Cloudflare ; l'avertissement de répertoire Git sale concerne le parent avec les références humaines non suivies, alors que les entrées de la copie sont contrôlées indépendamment. Aucun serveur humain n'est arrêté.

Les [20réponses HTTPS ciblées](../../tmp/publication-v488/http-2026-10-27T02-53-42.490Z-21260/report.json) passent4,782s sur l'origine stable et le déploiement immuable : statuts200, MIME, tailles et SHA256 exacts pour HTML, favicon, styles, application, deux Workers, manifeste, sauvegarde Les Aulnes et curseur PNG. Le paquet local reste exact. Ce contrôle prouve la disponibilité des fichiers ; il n'ajoute ni parcours navigateur public ni gain de performance aux qualifications fonctionnelles et comparatives déjà acquises.

Les procédures [Direct Upload de Cloudflare](https://developers.cloudflare.com/pages/get-started/direct-upload/) et l'aide du Wrangler installé sont relues avant la commande. Les journaux et preuves sont conservés sous `tmp/publication-v488/` et `tmp/validation-runs/`, avec les listes de déploiements avant/après. Reprendre maintenant la [campagne V484](../gameplay/campaign-continuation-v484.md) depuis son entierT2010, sans rejouer sa préparation ni charger le QA1730 de performance. Six ensembles, SYS069, campagne/victoire et confort global restent ouverts.
