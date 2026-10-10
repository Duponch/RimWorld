# V294 — attribution du thread principal après V293

V294 est un diagnostic : **le produit V293, le schéma 218 et les 63 sauvegardes/66 fichiers publics sont conservés**. Aucun FPS supplémentaire livré. La comparaison non instrumentée V293 reste **104,00→113,65 RAF/s à vrai ×6** ; ce profil ne la remplace pas et ne certifie aucun gain GPU ou écran240Hz.

## Résultat et prochaine décision

Le nouveau profil du produit courant confirme trois postes importants. Le tableau est une partition exclusive de ses **15,006610 secondes échantillonnées**, bords compris : chaque échantillon appartient à une seule ligne. Ce sont des poids de profilage, pas des durées exactes de fonctions ni une mesure GPU.

| Cause et descendants | Poids | Part |
| --- | ---: | ---: |
| Adoption du Decoder, reconstruction et validations comprises |3 571,213 ms|23,80 %|
| Application du World à la scène |2 441,497 ms|16,27 %|
| Préparation/soumission Three sous les vrais appels render |2 722,941 ms|18,14 %|
| UI/audio identifiés par leurs modules |807,015 ms|5,38 %|
| Autre jeu et résidu du handler |1 690,522 ms|11,27 %|
| Autre JavaScript non attribué |10,282 ms|0,07 %|
| Natif, GC, idle/program sans frontière opérationnelle identifiée |3 763,140 ms|25,08 %|

**99,04 % du poids d'application de scène vient de RAF** (2 417,996 ms), contre23,501ms depuis le handler des snapshots. Mesurer ce handler seul manquerait donc presque toute cette application. La fonction Three `update` qui héberge RAF englobe du code du jeu ; elle n'est pas classée comme coût du rendu.

Le parcours `capture` des ressources pour les validations pèse **614,419ms propres (4,09 %)**. Il est déjà inclus dans les1 272,169ms de `validateCooking`, eux-mêmes partiellement inclus dans le contrôle de biocarburant : ces postes ne s'additionnent pas. Le partage V291/V293 évite des parcours dans une adoption, mais sa capture est reconstruite à l'adoption suivante. La piste suivante est une **réconciliation privée des faits de ressources à partir des modifications confirmées**, avec engagement après tous les gardes, replis complets et conservation des premières erreurs. C'est une étude, aucun cache persistant ni candidat adopté dans V294.

Dans la scène, `updateResources` pèse759,968ms, dont618,057ms de Nature et107,162ms de ResourceLayer ; Crop257,347ms et éclairage232,592ms sont d'autres branches d'applyWorld. Un partage de projections entre couches ne dispose donc pas automatiquement du budget Nature entier. Les pistes de façade compacte et de certificats déjà rejetées ne sont pas relancées. L'audio pèse610,769ms dans son adoption, mais son ancien candidat rejeté n'est pas promu sur cette seule observation.

Le propre du handler vaut1 025,562ms ; il n'établit pas à lui seul un coût de clonage. `writeBuffer`, GC, idle et `(program)` ne prouvent ni saturation GPU ni copies. Aucun noyau numérique dominant justifiant WASM n'est établi par cette capture. Les trois budgets opérationnels restent substantiels : retirer la seule capture Resource ne suffirait pas à atteindre240FPS.

## Preuves et validation

Sous `tmp/performance-v294/`, sources courantes `e6e01eaa`, gel **6CA28F6C** dans `native/freeze-suqKe3` :1 167entrées, produit/publics/configuration et cinq feuilles du banc. Chrome matériel AMD RDNA1/WebGPU,2560×1440/DPR1/dev, source8434, caméra129/122/zoom1, chauffe3s puis profil MAIN Page14s ; aucun remplacement de méthode ni timer d'adoption, Source et rendu originaux. La sonde retourne seulement des scalaires/copies ; les184scripts compilés du profil sont capturés via CDP après son arrêt, avec hashes et positions vérifiés. Aucun profil Worker ou GPU.

- Typage du banc **PASS1,255s**, gel **PASS0,335s**.
- Première collecte `native/main-MacU9J/report.json`, SHA **D6FE3C83**, **PASS61,646s** côté parcours et reprise9098 exacte. Un delta−44µs à l'index626 parmi9 451échantillons interdit l'attribution : `analysis/report-vlmqiu`, **FAIL0,281s**, aucune partition décisionnelle. Profil et rouge restent intacts ; aucun lissage ou poids positif seul.
- Une nouvelle collecte indépendante, même banc/gel et nouvelle sortie `native/main-BP5026/report.json`, SHA **9513D6FC**, **PASS60,964s** :9 563échantillons/1 151nœuds, aucun delta négatif ou hors bornes. Continuation réellement observée8574→9084 sous profilage puis recharge **9094 exacte** ; pas oracle indépendant d'un premier tick après recharge.
- Analyse `analysis/report-n8XlNB/report.json`, SHA **F96238F1**, **PASS0,634s**. Script **17E720B7** : arbre, poids, sources/positions et ancres contrôlés. Deux vues exhaustives distinctes (feuille JS et cause avec descendants natifs), jamais additionnées ; branches de chaque parent disjointes, parents différents potentiellement imbriqués. Le premier delta460,514ms et le bord final405µs sont conservés explicitement, sans découpage opportuniste.

Les deux parcours ferment CDP, navigateur et Vite5329 ; erreurs vides, empreintes sources/publics exactes avant/après. Les autres sauvegardes sont conservées par empreinte, pas rejouées dans ce diagnostic ; leurs contrôles V293 restent acquis. Aucun nouveau test produit, build, campagne ou ABBA inchangé nécessaire. Les RAF de la fenêtre profilée sont perturbés et ne deviennent pas un nouveau résultat FPS. La définition des échantillons et deltas provient du [protocole primaire CDP Profiler](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json).

Documentation **PASS0,849s** :901documents/8 549liens,25domaines et5familles conservés, six en-têtes courants au schéma218 et trois sources originales exactes.

Revues privées : `static-render-review.md`, `projection-owner-review.md`, `analysis/result-review.md` et `next-resource-facts.md`. Les raccords de propriété/projection restent des designs ; un booléen readonly ou le journal public seul ne constitue pas une autorité pour éviter des lectures. Coût complet, froid, refus/anciennes vues/reprises puis jeu réel requis avant une future promotion.
