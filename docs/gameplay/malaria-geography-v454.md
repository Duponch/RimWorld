# V454 — Paludisme des biomes géographiques

**V454 publiée — schéma 277 inchangé.** Admission du paludisme déjà tiré rétablie dans les marécages tempérés, forêts tropicales et marécages tropicaux. Aucun nouvel équilibrage ou catalogue de maladies annoncé.

Ce lot suit l’[audit transversal des bases](../development/audit-core-20261022.md), qui couvre tous les aspects du Core et leurs interactions. Les domaines cités par l’utilisateur étaient des exemples, pas une liste fermée. La priorité suivante reste la réserve de vêtements utilisables, puis la valeur et la vente des vêtements existants ; l’ordre sera réévalué selon les lacunes ordinaires.

## Défaut et référence

Le sélecteur géographique `advanceFluIncidents` choisit Disease_Malaria dans la table du vrai biome puis appelle le résolveur. Celui-ci conservait une borne historique : refuser tout biome différent de `temperate-forest`. Un ticket pouvait donc être consommé dans trois biomes admissibles sans produire de patient.

Lecture primaire du22octobre2026 : Core **1.6.4871 rev590**, assembly SHA256 `5cf1b5be399d5b1c9c56ca72c9d35b4ecf307feacf5859d04ac5a1aa5926356a` recalculé. XML `Storyteller/Incidents_Map_Disease.xml`, `BiomeDefs/Biomes_Temperate.xml`, `Biomes_Warm.xml` et les douze biomes représentés ; IL ciblée du composant de maladies, admission des incidents, worker humain et immunité. Faits reformulés dans `tmp/ship-casket-v453/malaria-primary.md` ; aucun code ou asset propriétaire dans le produit.

| Biome géographique | Poids humain statique du paludisme | MTB de catégorie, jours Core |
| --- | --- | --- |
| Forêt tempérée |100 |50 |
| Marécage tempéré |100 |40 |
| Forêt tropicale |160 |35 |
| Marécage tropical |160 |30 |
| Huit autres biomes représentés |0 |Selon leur table |

Ces nombres ne sont pas une fréquence propre au paludisme. L’incident humain natif n’ajoute aucune restriction universelle à la seule forêt tempérée. Son admission et les poids réels du biome déterminent son opportunité.

La recherche Internet officielle ciblée n’a pas trouvé une publication détaillant cette table. L’[annonce Ludeon du12octobre](https://ludeon.com/blog/2026/10/announcing-the-waylith-engine-and-update-1-7/) conserve principale1.6/instable1.7 ; les règles précises ci-dessus viennent des XML/IL identifiés. Le [corpus humain](../research/reference-adoption.md) conserve chapitres7/15/24, domaines santé et SYS/TEST-131/132/134, sans clôture globale de ces identifiants.

## Réparation bornée

Pour un site géographique de révision3, le résolveur doit admettre le paludisme si la table existante du biome lui donne un poids positif. Les anciens profils gardent leur admission historique. Grippe, peste, échantillonnage des patients, immunité, soins, hasard et calendriers ne sont pas réécrits. Aucun ancien ticket n’est rejoué et aucun malade n’est ajouté au chargement.

Le test de table est borné à neuf entrées, uniquement lors d’une résolution rare de paludisme. Le chemin ordinaire des99pas sur100 sans contrôle de catégorie reste identique. Aucun parcours supplémentaire du terrain, de la flore ou des cartes ; aucun gain FPS revendiqué.

## Adaptations conservées et critères

Le Core filtre les incidents utilisables avant son choix pondéré ; le calendrier local conserve une table statique et laisse les tickets non réalisés consommer leur occasion. Le seuil natif Cassandra est strictement après neuf jours ; le seuil local actuel et l’occasion exponentielle sont des adaptations préexistantes distinctes. Le correctif géographique ne les transforme pas en parité globale des maladies ou du narrateur.

Les contrôles distinguent occasion rare/date préparées et évolution réellement jouée : monde sain valide avant le contrôle, vrai ticket, même patient malade puis soins physiques, refus des biomes sans poids, anciens profils inchangés, compteurs/PRNG et reprise entière RAW/public. Le parcours UI est muet avant sa première page. Aucune nouvelle campagne annuelle ou mesure FPS inchangée n’est imposée par ce correctif.

## Préparation et contrôles

Le scénario de contrôle réutilise uniquement la géographie immuable de la vraie sauvegarde publique V419 des Éclaircies, SHA256 `49e5d50abfac5a2ac0e609378877bb645da3e4559286cff706a33dc00f0df19f`, conservée sans modification. Les douze biomes sont présents sur cette planète. Chaque carte200² est créée par les vrais producteurs, puis la vraie opération d’implantation transforme le camp en colonie. La date53999, le sol dégagé, deux lits médicaux normaux, trois médicaments, six repas, les besoins pleins et la compétence médicale8 sont des préparations déclarées ; neuf jours de jeu, leur acquisition naturelle ou un voyage ne sont pas crédités. Les personnes originales gardent les éventuelles affections non infectieuses produites. Le cas vide prépare explicitement une colonie sans habitant après implantation.

Les calendriers sont adoptés à53999, sans occasion passée. Les flux indépendants de catégorie et de clinique sont ensuite préparés explicitement pour rendre observable le prochain ticket rare ; aucune maladie n’est injectée. L’étape réelle54000 doit sélectionner le paludisme, puis seuls les vrais pas de simulation produisent le soin. Cette préparation ne mesure pas sa fréquence naturelle.

Typage acquis : `v454-types-2026-10-22T00-27-13.759Z-23208`,12,913s. Voisins acquis19/20 : grippe historique, incidents immunitaires et sauvegardes, rapport `v454-legacy-incidents-2026-10-22T00-18-37.766Z-948`. Le rouge conservé concerne une ancienne préparation de migration206 collée sur un monde moderne sans retirer son registre, refusée par `Invalid historical map registry` avant le résolveur de maladie. Le témoin indépendant de V453, commit `93fb261ff511ce0462d1f7c22d147348162cba50`, refuse exactement les mêmes octets SHA256 `0a42a1a261624af7ddf3a60a04a77bc41fb78eb88d533630950661e9cf557174` avec la même erreur. Rapport `tmp/malaria-geography-v454/legacy-witness.json`, contrôle acquis11,046s ; aucune garde n’est relâchée et cet échec n’est pas déclaré corrigé.

Première passe nouvelle :20/24 acquis, rapport `v454-malaria-2026-10-22T00-27-34.080Z-10852`,122,128s. Les quatre rouges conservent une attente incorrecte : le PRNG global était supposé immobile pendant un pas entier. Les vrais producteurs de geysers et de renouvellement végétal utilisent ce flux ; les deux mondes rejoués restent déjà strictement égaux avant cette assertion. L’attente est corrigée pour comparer les flux des deux replays, sans couper ces producteurs. Les contrôles directs du résolveur acquièrent séparément l’absence de consommation globale par la seule maladie. Aucun changement produit supplémentaire n’est attribué à ce diagnostic.

Reprise limitée aux quatre rouges acquise : `v454-malaria-reprise-2026-10-22T00-32-05.961Z-20992`,88,205s. Les20cas verts ne sont pas rejoués. Total **24nouveaux +19voisins =43cas distincts acquis**, un ancien rouge identique au témoin conservé sur44cas distincts ; les passages répétés ne s’additionnent pas. Typage final acquis12,722s après correction de l’oracle.

Les douze admissions géographiques, quatre profils historiques, trois vrais tickets à54000, immunité complète/partielle, maladie déjà présente et colonie sans candidat sont couverts. Les trois tickets conservent les compteurs, les deux flux propres de maladie et les mondes entiers rejoués ; les autres systèmes gardent leur vrai PRNG global. Refus et appels doublés au même tick ne créent pas d’occasion supplémentaire. RAW strict et projection publique différentielle sont comparés au lecteur complet avant/après.

Dans le marécage tropical, l’original1079 tombe malade au54000 et le médecin1078 travaille au vrai lit1081 jusqu’au54122 : une dose industrielle consommée, expérience gagnée et événement de soin réel. Chaque pas est rejoué depuis la recharge entière du monde sain ; le patient garde son identité. Le manifeste et les trois états sont conservés dans `tmp/test-runs/v454-malaria-reprise-2026-10-22T00-32-05.961Z-20992/artifacts/malaria-geography-v454/`. L’état sain avant occasion a pour SHA256 `6b432f94ea1e0463a2ef0f18fba38e395ab7130919a41dec2895072b5ab9cd13` ; seul cet état peut servir à l’import initial du parcours natif, jamais le malade ou le patient déjà soigné.

**Interface native acquise :** Chrome155/WebGPU,1440×1000,126s. Import du seul monde sain53999 entièrement exact par les menus ; occasion54000 observée au54002, annonce réelle et dossier Santé du même1079. Recharge entière malade exacte, vrai médecin au chevet pendant son travail, dose consommée et soin achevé au54122, observé au54123 : qualité84,7%, expérience médicale122500. L’infobulle annonce le soin actif avant/après recharge entière soignée exacte. Soixante images en pause conservent le monde final entier. Aucun setter de monde ni commande d’incident ; seuls les réglages de temps du jeu sont utilisés.

Rapport `tmp/malaria-geography-v454/native-ui/2026-10-22T00-34-11-796Z/report.json` ; captures malade et soin relues visuellement. Aucune notification de mise en page ou autre erreur relevée dans cette fenêtre, aucun arrêt de simulation ou défaut graphique. Cela ne déclare pas corrigées les notifications historiques des autres lots. Les2171chemins produit figés restent strictement identiques. Chrome est lancé muet ; effets/musique false et volumes0 avant la première page, choix conservé à chaque recharge. Aucun réglage audio joueur publié n’est changé.

## Livraison et suite

**Produit sélectionné : `33abcc2cfc693312fea1f70447857b5f786700fa`.** Build Pages acquis4,616s ; paquet `tmp/elsewhere-pages/v454-package-fNsHnH/`,552fichiers et152675377octets. Les68fiches/71chemins publics de sauvegarde sont strictement identiques public↔dist ; les actifs statiques et CSS restent ceux de V453, laboratoire et branchements QA absents du paquet inspecté.

Déploiement **`c514a33d`** acquis sur [l’adresse publique](https://elsewhere-cq7.pages.dev/) et [l’adresse immuable](https://c514a33d.elsewhere-cq7.pages.dev/). Les20réponses HTTPS ciblées sont exactes en octets/MIME sur les deux adresses, rapport `tmp/elsewhere-pages/v454-http-5jKCzR/report.json`. Ce contrôle distant ne retélécharge pas toutes les sauvegardes et ne remplace pas le parcours natif acquis. L’avertissement de répertoire Git non entièrement suivi provient du dossier humain `references_UI/`, conservé et exclu du paquet ; aucune source produit suivie n’est restée modifiée pendant le build ou le contrôle.

Les trois originaux du corpus sont byte-identiques. Cette réparation ne change ni le schéma277 ni les historiques, et ne revendique aucun gain FPS, fréquence naturelle des maladies ou clôture des six ensembles.

La suite décidée par l’[audit transversal](../development/audit-core-20261022.md) est la réserve d’habits utilisables, puis la valeur/vente des vêtements existants. La recherche primaire préparatoire confirme la distinction entre état/qualité du produit compté, vêtement porté et ingrédients ; ce lot suivant n’est pas livré par le présent correctif. Réévaluer ensuite tous les autres domaines selon leurs lacunes ordinaires.
